import type { Env, PokemonData, RankingPokemon } from '../types';
import { fetchWithCache, getDataUrl } from '../utils/cache';
import { leagues } from '../constants';

const TYPE_MAP: Record<string, string> = {
  "normal": "一般", "fire": "火", "water": "水", "grass": "草", "electric": "電",
  "ice": "冰", "fighting": "格鬥", "poison": "毒", "ground": "地面", "flying": "飛行",
  "psychic": "超能力", "bug": "蟲", "rock": "岩石", "ghost": "幽靈", "dragon": "龍",
  "dark": "惡", "steel": "鋼", "fairy": "妖精", "none": ""
};

export async function analyzeUserBoxTeam(
  league: number, 
  teamNames: string[], 
  env: Env, 
  ctx: ExecutionContext
): Promise<string> {
  try {
    // 1. 同步抓取所有必要資料 (包含 PoGoAPI 招式表)
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
    
    // 建立招式 ID -> 屬性的 Map
    const moveAttrMap = new Map<string, string>();
    [...fastMovesRaw, ...chargedMovesRaw].forEach(m => {
      const moveId = m.name.toUpperCase().replace(/\s+/g, '_');
      moveAttrMap.set(moveId, m.type.toLowerCase());
    });

    const leagueInfo = leagues.find(l => l.command === String(league) || l.cp === String(league));
    const rankRes = await fetchWithCache(getDataUrl(leagueInfo!.path), env, ctx);
    const rankings = await rankRes.json() as RankingPokemon[];

    // 2. 格式化使用者盒子內的寶可夢 (加入真正的排名序號與修正招式路徑)
    const myPokemons = rankings
      // 先標註每一隻在原始檔案中的排名 (index + 1)
      .map((r, idx) => ({ ...r, realRank: idx + 1 }))
      .filter(r => {
        const pInfo = transData.find(p => p.speciesId.toLowerCase() === r.speciesId.toLowerCase());
        return pInfo && teamNames.includes(pInfo.speciesName);
      })
      .map(r => {
        const pInfo = transData.find(p => p.speciesId.toLowerCase() === r.speciesId.toLowerCase());
        
        // 🔥 修正點：PvPoke 的招式通常在 r.moves 之下
        const fastMove = r.moves?.fast || "";
        const chargedMoves = Array.isArray(r.moves?.charged) ? r.moves.charged : [];
        
        const attackTypes = new Set<string>();
        [fastMove, ...chargedMoves].forEach(mId => {
          const attr = moveAttrMap.get(mId.replace('*', '').toUpperCase());
          if (attr) attackTypes.add(attr);
        });

        return {
          ...r,
          chineseName: pInfo?.speciesName || r.speciesId,
          types: pInfo?.types || [],
          attackTypes: Array.from(attackTypes),
          fastMove,
          chargedMoves,
          rank: r.realRank // 🔥 這裡現在有正確的排名數字了
        };
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    // --- 輸出格式化優化 (處理 none 屬性) ---
    const toZh = (ts: string[]) => {
      const filtered = ts.filter(t => t.toLowerCase() !== 'none');
      return filtered.map(t => TYPE_MAP[t.toLowerCase()] || t).join('/');
    };

    if (myPokemons.length < 3) return "⚠️ 排名資料配對不足 3 隻。";

    // --- 工具：計算防禦倍率 ---
    const getWeaknesses = (types: string[]) => {
      const mults: Record<string, number> = {};
      Object.keys(typeChart).forEach(atk => {
        let m = 1.0;
        types.forEach(def => { m *= (typeChart[def.toLowerCase()]?.[atk.toLowerCase()] ?? 1.0); });
        mults[atk] = m;
      });
      return mults;
    };

    // --- v3 核心邏輯：挑選最佳陣容 ---

    // 🥇 Leader
    const leader = myPokemons[0];
    const leaderWeakDetail = getWeaknesses(leader.types);
    const leaderMajorWeaknesses = Object.entries(leaderWeakDetail)
      .filter(([_, m]) => m > 1.0)
      .map(([t, _]) => t);

    // 🥈 Safe Swap (強化攻擊面：必須能剋制 Leader 的天敵)
    let safeSwap = myPokemons[1];
    let bestSwapScore = -100;

    for (let i = 1; i < myPokemons.length; i++) {
      const p = myPokemons[i];
      const pWeak = getWeaknesses(p.types);
      let score = (p.score || 0) / 10; // 基礎分數

      leaderMajorWeaknesses.forEach(w => {
        // 防禦加分：抗 Leader 的弱點
        if (pWeak[w] < 1.0) score += 20;
        // ⚔️ 攻擊加分 (v3)：招式能剋 Leader 的弱點
        p.attackTypes.forEach(atkType => {
          if (typeChart[w]?.[atkType] > 1.0) score += 15; 
        });
      });

      if (score > bestSwapScore) {
        bestSwapScore = score;
        safeSwap = p;
      }
    }

    // 🥉 Closer (平衡團隊屬性)
    let closer = myPokemons.find(p => p.speciesId !== leader.speciesId && p.speciesId !== safeSwap.speciesId) || myPokemons[2];

    // --- 格式化回覆 ---
    const translateMove = (m: string) => moveTrans[m.replace('*','').toUpperCase()] || m;
    const toZh = (ts: string[]) => ts.map(t => TYPE_MAP[t.toLowerCase()] || t).join('/');

    const formatPoke = (p: any, icon: string) => {
      const moves = `└ ${translateMove(p.fastMove)} / ${p.chargedMoves.map(translateMove).join(', ')}`;
      return `${icon} #<b>${p.rank || '?'}</b> <b>${p.chineseName}</b> (${toZh(p.types)})\n${moves}`;
    };

    let msg = `📊 <b>${league} 聯盟 v3 攻防聯防分析</b>\n`;
    msg += `=======================\n`;
    msg += `🥇 <b>先發 (Leader)</b>\n${formatPoke(leader, "👑")}\n\n`;
    msg += `🥈 <b>安全替換 (Safe Swap)</b>\n${formatPoke(safeSwap, "🛡️")}\n`;
    msg += `<i>(配備能反制 ${leaderMajorWeaknesses.map(w => TYPE_MAP[w]).join('、')} 系的招式)</i>\n\n`;
    msg += `🥉 <b>壓軸 (Closer)</b>\n${formatPoke(closer, "⚔️")}\n`;
    msg += `=======================\n`;
    msg += `<i>💡 v3 演算法已整合 PoGoAPI 實時招式屬性資料。</i>`;

    return msg;

  } catch (error) {
    return "❌ 分析失敗: " + (error as Error).message;
  }
}
