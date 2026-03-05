import type { Env, PokemonData, RankingPokemon } from '../types';
import { fetchWithCache, getDataUrl } from '../utils/cache';
import { leagues } from '../constants';

// 屬性與後綴對應表
const TYPE_MAP: Record<string, string> = {
  "normal": "一般", "fire": "火", "water": "水", "grass": "草", "electric": "電",
  "ice": "冰", "fighting": "格鬥", "poison": "毒", "ground": "地面", "flying": "飛行",
  "psychic": "超能力", "bug": "蟲", "rock": "岩石", "ghost": "幽靈", "dragon": "龍",
  "dark": "惡", "steel": "鋼", "fairy": "妖精", "none": ""
};

const SUFFIX_MAP: Record<string, string> = {
  "_shadow": " (暗影)",
  "_alolan": " (阿羅拉)",
  "_galarian": " (伽勒爾)",
  "_hisuian": " (洗翠)",
  "_paldean": " (帕底亞)",
  "_apex": " (頂點)",
  "_mega": " (Mega)"
};

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
    const [transRes, typeRes, moveTransRes, fastRes, chargedRes] = await Promise.all([
      fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx),
      fetchWithCache(getDataUrl("data/type_chart.json"), env, ctx),
      fetchWithCache(getDataUrl("data/moves_translation.json"), env, ctx),
      fetch("https://pogoapi.net/api/v1/fast_moves.json"),
      fetch("https://pogoapi.net/api/v1/charged_moves.json")
    ]);

    const transData = await transRes.json() as PokemonData[];
    const typeChart = await typeRes.json() as any;
    const moveTrans = await moveTransRes.json() as Record<string, string>;
    const fastMovesRaw = await fastRes.json() as any[];
    const chargedMovesRaw = await chargedRes.json() as any[];
    
    // 招式與屬性映射
    const moveAttrMap = new Map<string, string>();
    [...fastMovesRaw, ...chargedMovesRaw].forEach(m => {
      moveAttrMap.set(m.name.toUpperCase().replace(/\s+/g, '_'), m.type.toLowerCase());
    });

    // --- 🧠 核心動態翻譯函數 ---
    const getFullName = (speciesId: string): string => {
      const id = speciesId.toLowerCase();
      
      // 1. 先找有沒有完美匹配 (例如某些特殊型態已經寫在翻譯檔)
      const directMatch = transData.find(p => p.speciesId.toLowerCase() === id);
      if (directMatch?.speciesName) return directMatch.speciesName;

      // 2. 拆解 ID 找出基礎名稱 (例如 rattata_alolan_shadow -> rattata)
      // 我們取底線分割後的第一個單字作為 Base
      const baseId = id.split('_')[0];
      const baseMatch = transData.find(p => p.speciesId.toLowerCase() === baseId);
      let name = baseMatch?.speciesName || speciesId;

      // 3. 遍歷後綴映射表，符合就加上去
      Object.entries(SUFFIX_MAP).forEach(([key, zh]) => {
        if (id.includes(key)) name += zh;
      });

      return name;
    };

    const leagueInfo = leagues.find(l => l.command === String(league) || l.cp === String(league));
    const rankRes = await fetchWithCache(getDataUrl(leagueInfo!.path), env, ctx);
    const rankings = await rankRes.json() as RankingPokemon[];

    // 2. 格式化盒子寶可夢 (全自動識別)
    const myPokemons = rankings
      .map((r, idx) => ({ ...r, realRank: idx + 1 }))
      .filter(r => {
        const fullName = getFullName(r.speciesId);
        return teamNames.includes(fullName);
      })
      .map(r => {
        const id = r.speciesId.toLowerCase();
        // 抓取屬性 (需處理 Shadow/Mega 的屬性與 Base 一致)
        const baseId = id.split('_')[0];
        const pInfo = transData.find(p => p.speciesId.toLowerCase() === id) || 
                      transData.find(p => p.speciesId.toLowerCase() === baseId);
        
        const fastMove = r.moves?.fastMoves?.[0]?.moveId || "";
        const chargedMoves = r.moves?.chargedMoves ? r.moves.chargedMoves.slice(0, 2).map((m: any) => m.moveId) : [];
        
        const attackTypes = new Set<string>();
        [fastMove, ...chargedMoves].forEach(mId => {
          if (mId) {
            const attr = moveAttrMap.get(mId.replace('*', '').toUpperCase());
            if (attr) attackTypes.add(attr);
          }
        });

        return {
          ...r,
          chineseName: getFullName(r.speciesId),
          types: pInfo?.types || [],
          attackTypes: Array.from(attackTypes),
          fastMove,
          chargedMoves,
          rank: r.realRank,
          score: r.score || 0
        };
      })
      .sort((a, b) => b.score - a.score);

    if (myPokemons.length < 3) return "⚠️ 符合排名的寶可夢不足 3 隻。請確認 Web App 中的名稱是否包含括號標註。";

    // --- 運算邏輯 (同 v3) ---
    const getWeaknesses = (types: string[]) => {
      const mults: Record<string, number> = {};
      Object.keys(typeChart).forEach(atk => {
        let m = 1.0;
        types.forEach(def => { if (def.toLowerCase() !== 'none') m *= (typeChart[def.toLowerCase()]?.[atk.toLowerCase()] ?? 1.0); });
        mults[atk] = m;
      });
      return mults;
    };

    const toZh = (ts: string[]) => ts.filter(t => t.toLowerCase() !== 'none').map(t => TYPE_MAP[t.toLowerCase()] || t).join('/');

    const leader = myPokemons[0];
    const leaderWeakDetail = getWeaknesses(leader.types);
    const leaderMajorWeaknesses = Object.entries(leaderWeakDetail).filter(([_, m]) => m > 1.0).map(([t, _]) => t);

    let safeSwap = myPokemons[1];
    let bestSwapScore = -100;
    for (let i = 1; i < myPokemons.length; i++) {
      const p = myPokemons[i];
      const pWeak = getWeaknesses(p.types);
      let score = p.score / 10;
      leaderMajorWeaknesses.forEach(w => {
        if (pWeak[w] < 1.0) score += 20;
        p.attackTypes.forEach(atkType => { if (typeChart[w]?.[atkType] > 1.0) score += 15; });
      });
      if (score > bestSwapScore) { bestSwapScore = score; safeSwap = p; }
    }

    let closer = myPokemons.find(p => p.speciesId !== leader.speciesId && p.speciesId !== safeSwap.speciesId) || myPokemons[2];

    const translateMove = (mId: string) => {
      if (!mId) return "";
      const isElite = mId.includes('*');
      const cleanId = mId.replace('*', '').toUpperCase();
      const name = moveTrans[cleanId] || cleanId;
      return isElite ? `${name}*` : name;
    };

    const formatPoke = (p: any, icon: string) => {
      const fast = translateMove(p.fastMove);
      const charged = p.chargedMoves.map(translateMove).filter(Boolean).join(', ');
      return `${icon} #<b>${p.rank}</b> <b>${p.chineseName}</b> (${p.score.toFixed(1)}) - ${getRankIcon(p.score)}\n(${toZh(p.types)})\n└ ${fast} / ${charged}`;
    };

    let msg = `📊 <b>${league} 聯盟 v3 全能型態分析</b>\n`;
    msg += `=======================\n`;
    msg += `🥇 <b>先發 (Leader)</b>\n${formatPoke(leader, "👑")}\n\n`;
    msg += `🥈 <b>安全替換 (Safe Swap)</b>\n${formatPoke(safeSwap, "🛡️")}\n`;
    msg += `<i>(針對反制 ${leaderMajorWeaknesses.map(w => TYPE_MAP[w]).join('、')} 系強化)</i>\n\n`;
    msg += `🥉 <b>壓軸 (Closer)</b>\n${formatPoke(closer, "⚔️")}\n`;
    msg += `=======================\n`;
    msg += `<i>💡 系統已自動識別 暗影/地區/Mega 型態。</i>`;

    return msg;

  } catch (error) {
    return "❌ 運算錯誤: " + (error as Error).message;
  }
}
