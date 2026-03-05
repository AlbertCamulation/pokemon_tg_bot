import type { Env, PokemonData, RankingPokemon } from '../types';
import { fetchWithCache, getDataUrl } from '../utils/cache';
import { leagues } from '../constants';

// 屬性中文化對照表
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
    // 1. 同步抓取所有必要資料
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
    
    // 建立招式 ID -> 屬性的對照 Map
    const moveAttrMap = new Map<string, string>();
    [...fastMovesRaw, ...chargedMovesRaw].forEach(m => {
      const moveId = m.name.toUpperCase().replace(/\s+/g, '_');
      moveAttrMap.set(moveId, m.type.toLowerCase());
    });

    const leagueInfo = leagues.find(l => l.command === String(league) || l.cp === String(league));
    if (!leagueInfo) return `⚠️ 找不到 ${league} 聯盟的排名設定。`;

    const rankRes = await fetchWithCache(getDataUrl(leagueInfo.path), env, ctx);
    const rankings = await rankRes.json() as RankingPokemon[];

    // 2. 格式化使用者盒子內的寶可夢
    const myPokemons = rankings
      // 第一步：先標註每一隻在全聯盟原始檔案中的排名 (index + 1)
      .map((r, idx) => ({ ...r, realRank: idx + 1 }))
      // 第二步：過濾出使用者盒子裡有的寶可夢
      .filter(r => {
        const pInfo = transData.find(p => p.speciesId.toLowerCase() === r.speciesId.toLowerCase());
        return pInfo && teamNames.includes(pInfo.speciesName);
      })
      // 第三步：抓取詳細資料與招式
      .map(r => {
        const pInfo = transData.find(p => p.speciesId.toLowerCase() === r.speciesId.toLowerCase());
        
        // 🔥 修正點：PvPoke 的推薦招式結構在 r.moves.fastMoves 陣列中
        const fastMove = r.moves?.fastMoves?.[0]?.moveId || "";
        const chargedMoves = r.moves?.chargedMoves 
          ? r.moves.chargedMoves.slice(0, 2).map((m: any) => m.moveId) 
          : [];
        
        // 抓取該寶可夢擁有的攻擊打擊面屬性
        const attackTypes = new Set<string>();
        [fastMove, ...chargedMoves].forEach(mId => {
          if (mId) {
            const attr = moveAttrMap.get(mId.replace('*', '').toUpperCase());
            if (attr) attackTypes.add(attr);
          }
        });

        return {
          ...r,
          chineseName: pInfo?.speciesName || r.speciesId,
          types: pInfo?.types || [],
          attackTypes: Array.from(attackTypes),
          fastMove,
          chargedMoves,
          rank: r.realRank // 正確的排名數字
        };
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    if (myPokemons.length < 3) return "⚠️ 盒子內符合排名的寶可夢不足 3 隻。";

    // --- 工具函數：計算屬性抗性/弱點倍率 ---
    const getWeaknesses = (types: string[]) => {
      const mults: Record<string, number> = {};
      Object.keys(typeChart).forEach(atk => {
        let m = 1.0;
        types.forEach(def => { 
          if (def.toLowerCase() !== 'none') {
            m *= (typeChart[def.toLowerCase()]?.[atk.toLowerCase()] ?? 1.0); 
          }
        });
        mults[atk] = m;
      });
      return mults;
    };

    // 屬性轉中文並過濾 none
    const toZh = (ts: string[]) => {
      return ts.filter(t => t.toLowerCase() !== 'none')
               .map(t => TYPE_MAP[t.toLowerCase()] || t)
               .join('/');
    };

    // --- v3 核心分析邏輯 ---

    // 🥇 Leader: 盒子裡分數最高的
    const leader = myPokemons[0];
    const leaderWeakDetail = getWeaknesses(leader.types);
    const leaderMajorWeaknesses = Object.entries(leaderWeakDetail)
      .filter(([_, m]) => m > 1.0)
      .map(([t, _]) => t);

    // 🥈 Safe Swap: 綜合考慮「防禦抗性」+「招式反制能力」
    let safeSwap = myPokemons[1];
    let bestSwapScore = -100;

    for (let i = 1; i < myPokemons.length; i++) {
      const p = myPokemons[i];
      const pWeak = getWeaknesses(p.types);
      let score = (p.score || 0) / 10;

      leaderMajorWeaknesses.forEach(w => {
        // 1. 防禦：能扛住 Leader 的弱點 (加分)
        if (pWeak[w] < 1.0) score += 20;
        // 2. 攻擊：招式屬性能反殺 Leader 的弱點 (加分)
        p.attackTypes.forEach(atkType => {
          if (typeChart[w]?.[atkType] > 1.0) score += 15; 
        });
      });

      if (score > bestSwapScore) {
        bestSwapScore = score;
        safeSwap = p;
      }
    }

    // 🥉 Closer: 挑選能平衡團隊弱點的第三人
    let closer = myPokemons.find(p => p.speciesId !== leader.speciesId && p.speciesId !== safeSwap.speciesId) || myPokemons[2];

    // --- 訊息格式化 ---
    const translateMove = (m: string) => {
      if (!m) return "未知招式";
      const cleanId = m.replace('*', '').toUpperCase();
      const name = moveTrans[cleanId] || cleanId;
      return m.includes('*') ? `${name}*` : name;
    };

    const formatPoke = (p: any, icon: string) => {
      const fast = translateMove(p.fastMove);
      const charged = p.chargedMoves.map(translateMove).join(', ');
      const movesStr = (fast === "未知招式" && charged === "") ? "└ <i>暫無招式資料</i>" : `└ ${fast} / ${charged}`;
      return `${icon} #<b>${p.rank}</b> <b>${p.chineseName}</b> (${toZh(p.types)})\n${movesStr}`;
    };

    let msg = `📊 <b>${league} 聯盟 v3 攻防聯防分析</b>\n`;
    msg += `=======================\n`;
    msg += `🥇 <b>先發 (Leader)</b>\n${formatPoke(leader, "👑")}\n\n`;
    msg += `🥈 <b>安全替換 (Safe Swap)</b>\n${formatPoke(safeSwap, "🛡️")}\n`;
    msg += `<i>(針對反制 ${leaderMajorWeaknesses.map(w => TYPE_MAP[w]).join('、')} 系強化)</i>\n\n`;
    msg += `🥉 <b>壓軸 (Closer)</b>\n${formatPoke(closer, "⚔️")}\n`;
    msg += `=======================\n`;
    msg += `<i>💡 帶有 * 代表精英/絕版招式。來源: PoGoAPI & PvPoke。</i>`;

    return msg;

  } catch (error) {
    console.error("分析失敗:", error);
    return "❌ 演算法運算錯誤: " + (error as Error).message;
  }
}
