import type { Env, PokemonData, RankingPokemon } from '../types';
import { fetchWithCache, getDataUrl } from '../utils/cache';
import { leagues } from '../constants';

// 1. 屬性中文化對照表
const TYPE_MAP: Record<string, string> = {
  "normal": "一般", "fire": "火", "water": "水", "grass": "草", "electric": "電",
  "ice": "冰", "fighting": "格鬥", "poison": "毒", "ground": "地面", "flying": "飛行",
  "psychic": "超能力", "bug": "蟲", "rock": "岩石", "ghost": "幽靈", "dragon": "龍",
  "dark": "惡", "steel": "鋼", "fairy": "妖精", "none": ""
};

// 2. 自動標註後綴對照表
const SUFFIX_MAP: Record<string, string> = {
  "_shadow": " (暗影)",
  "_alolan": " (阿羅拉)",
  "_galarian": " (伽勒爾)",
  "_hisuian": " (洗翠)",
  "_paldean": " (帕底亞)",
  "_apex": " (頂點)",
  "_mega": " (Mega)"
};

// 3. 分數勳章邏輯
function getRankIcon(score: number): string {
  if (score >= 90) return "🥇白金";
  if (score >= 80) return "🥇金";
  if (score >= 70) return "🥈銀";
  return "🥉銅";
}

export async function analyzeUserBoxTeam(
  league: number,
  teamNames: string[],
  env: Env,
  ctx: ExecutionContext
): Promise<string> {
  try {
    // A. 資料同步抓取 (修正：改用 move.json，移除外部 API)
    const [transRes, typeRes, moveTransRes] = await Promise.all([
      fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx),
      fetchWithCache(getDataUrl("data/type_chart.json"), env, ctx),
      fetchWithCache(getDataUrl("data/move.json"), env, ctx),
    ]);

    const transData = await transRes.json() as PokemonData[];
    const typeChart = await typeRes.json() as any;
    const moveTrans = await moveTransRes.json() as Record<string, string>;

    // C. 核心動態翻譯函數 (處理暗影與地區型態)
    const getFullName = (speciesId: string): string => {
      const id = speciesId.toLowerCase();
      const directMatch = transData.find(p => p.speciesId.toLowerCase() === id);
      if (directMatch?.speciesName) return directMatch.speciesName;

      const baseId = id.split('_')[0];
      const baseMatch = transData.find(p => p.speciesId.toLowerCase() === baseId);
      let name = baseMatch?.speciesName || speciesId;

      Object.entries(SUFFIX_MAP).forEach(([key, zh]) => {
        if (id.includes(key)) name += zh;
      });
      return name;
    };

    // D. 取得排名與過濾盒子
    const leagueInfo = leagues.find(l => l.command === String(league) || l.cp === String(league));
    const rankRes = await fetchWithCache(getDataUrl(leagueInfo!.path), env, ctx);
    const rankings = await rankRes.json() as RankingPokemon[];

    const myPokemons = rankings
      .map((r, idx) => ({ ...r, realRank: idx + 1 }))
      .filter(r => teamNames.includes(getFullName(r.speciesId)))
      .map(r => {
        const id = r.speciesId.toLowerCase();
        const baseId = id.split('_')[0];
        const pInfo = transData.find(p => p.speciesId.toLowerCase() === id) ||
                      transData.find(p => p.speciesId.toLowerCase() === baseId);

        // 修正：使用 moveFast / moveCharged，與 search.ts 一致
        let fastMove: string = r.moveFast || "";
        let chargedMoves: string[] = Array.isArray(r.moveCharged)
          ? r.moveCharged.slice(0, 2)
          : (r.moveCharged ? [r.moveCharged] : []);

        // moveset fallback
        if (!fastMove && r.moveset && Array.isArray(r.moveset)) {
          fastMove = r.moveset[0] || "";
          chargedMoves = r.moveset.slice(1, 3);
        }

        return {
          ...r,
          chineseName: getFullName(r.speciesId),
          types: pInfo?.types || [],
          attackTypes: [] as string[],
          fastMove,
          chargedMoves,
          rank: r.realRank,
          score: r.score || 0
        };
      })
      .sort((a, b) => b.score - a.score);

    if (myPokemons.length < 3) return "⚠️ 符合排名的寶可夢不足 3 隻。";

    // E. 運算邏輯 (v3 攻防聯防)
    const getWeaknesses = (types: string[]) => {
      const mults: Record<string, number> = {};
      Object.keys(typeChart).forEach(atk => {
        let m = 1.0;
        types.forEach(def => {
          if (def.toLowerCase() !== 'none') m *= (typeChart[def.toLowerCase()]?.[atk.toLowerCase()] ?? 1.0);
        });
        mults[atk] = m;
      });
      return mults;
    };

    const toZh = (ts: string[]) =>
      ts.filter(t => t.toLowerCase() !== 'none').map(t => TYPE_MAP[t.toLowerCase()] || t).join('/');

    const leader = myPokemons[0];
    const leaderWeakDetail = getWeaknesses(leader.types);
    const leaderMajorWeaknesses = Object.entries(leaderWeakDetail)
      .filter(([_, m]) => m > 1.0).map(([t]) => t);

    let safeSwap = myPokemons[1];
    let bestSwapScore = -100;
    for (let i = 1; i < myPokemons.length; i++) {
      const p = myPokemons[i];
      const pWeak = getWeaknesses(p.types);
      let score = p.score / 10;
      leaderMajorWeaknesses.forEach(w => {
        if (pWeak[w] < 1.0) score += 20;
      });
      if (score > bestSwapScore) { bestSwapScore = score; safeSwap = p; }
    }

    const closer = myPokemons.find(
      p => p.speciesId !== leader.speciesId && p.speciesId !== safeSwap.speciesId
    ) || myPokemons[2];

    // F. 招式翻譯 (move.json 格式：{ "MOVE_ID": "中文名" })
    const translateMove = (mId: string): string => {
      if (!mId) return "未知";
      const isElite = mId.includes('*');
      const cleanId = mId.replace('*', '').toUpperCase();
      const name = moveTrans[cleanId] || cleanId;
      return isElite ? `${name}*` : name;
    };

    const formatPoke = (p: any, icon: string) => {
      const fast = translateMove(p.fastMove);
      const charged = p.chargedMoves
        .map((m: string) => translateMove(m))
        .filter(Boolean)
        .join(', ');

      const header = `${icon} #${p.rank} ${p.chineseName} (${p.score.toFixed(1)}) - ${getRankIcon(p.score)}`;
      const typeLine = `(${toZh(p.types)})`;
      const movesLine = `└ ${fast} / ${charged}`;

      return `${header}\n${typeLine}\n${movesLine}`;
    };

    // G. 組合訊息回覆
    let msg = `📊 ${league} 聯盟 v3 全能型態分析\n`;
    msg += `=======================\n`;
    msg += `🥇 先發 (Leader)\n${formatPoke(leader, "👑")}\n\n`;
    msg += `🥈 安全替換 (Safe Swap)\n${formatPoke(safeSwap, "🛡️")}\n`;
    msg += `(針對反制 ${leaderMajorWeaknesses.map(w => TYPE_MAP[w] || w).join('、')} 系強化)\n\n`;
    msg += `🥉 壓軸 (Closer)\n${formatPoke(closer, "⚔️")}\n`;
    msg += `=======================\n`;
    msg += `💡 系統已自動識別 暗影/地區/Mega 型態。`;

    return msg;

  } catch (error) {
    return "❌ 運算錯誤: " + (error as Error).message;
  }
}
