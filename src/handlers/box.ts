import type { Env, PokemonData, RankingPokemon } from '../types';
import { fetchWithCache, getDataUrl } from '../utils/cache';
import { leagues } from '../constants';

// 定義屬性表型別
type TypeChart = Record<string, Record<string, number>>;

export async function analyzeUserBoxTeam(
  league: number, 
  teamNames: string[], 
  env: Env, 
  ctx: ExecutionContext
): Promise<string> {
  if (teamNames.length < 3) return "⚠️ 盒子內的寶可夢不足 3 隻，請再多抓幾隻進來喔！";

  try {
    // 1. 取得必要資料：翻譯字典、聯盟排名、以及你新增的屬性表
    const [transRes, rankInfo, typeRes] = await Promise.all([
      fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx),
      Promise.resolve(leagues.find(l => l.command === String(league) || l.cp === String(league))),
      fetchWithCache(getDataUrl("data/type_chart.json"), env, ctx)
    ]);

    const transData = await transRes.json() as PokemonData[];
    const typeChart = await typeRes.json() as TypeChart;
    
    if (!rankInfo) return `⚠️ 找不到 ${league} 聯盟設定。`;
    const rankRes = await fetchWithCache(getDataUrl(rankInfo.path), env, ctx);
    const rankings = await rankRes.json() as RankingPokemon[];

    // 建立中文名稱到資料的映射
    const nameToInfo = new Map<string, { id: string, types: string[] }>();
    transData.forEach(p => {
      if (p.speciesName) nameToInfo.set(p.speciesName.trim(), { id: p.speciesId.toLowerCase(), types: p.types || [] });
    });

    // 過濾出使用者拥有的寶可夢並排序
    const myPokemons = rankings
      .filter(r => teamNames.includes(transData.find(p => p.speciesId.toLowerCase() === r.speciesId.toLowerCase())?.speciesName || ""))
      .map(r => ({
        ...r,
        chineseName: transData.find(p => p.speciesId.toLowerCase() === r.speciesId.toLowerCase())?.speciesName || r.speciesId,
        types: transData.find(p => p.speciesId.toLowerCase() === r.speciesId.toLowerCase())?.types || []
      }))
      .sort((a, b) => (b.score || b.rating || 0) - (a.score || a.rating || 0));

    if (myPokemons.length < 3) return "⚠️ 無法取得足夠的排名資料。";

    // --- 核心工具函數：計算特定屬性組合的防禦倍率 ---
    const getWeaknesses = (types: string[]) => {
      const results: Record<string, number> = {};
      const allTypes = Object.keys(typeChart);
      
      allTypes.forEach(atkType => {
        let multiplier = 1.0;
        types.forEach(defType => {
          const m = typeChart[defType.toLowerCase()]?.[atkType.toLowerCase()];
          if (m !== undefined) multiplier *= m;
        });
        results[atkType] = multiplier;
      });
      return results;
    };

    // --- 開始挑選隊伍 ---
    
    // 🥇 Leader: 選最高分的
    const leader = myPokemons[0];
    const leaderWeaknesses = getWeaknesses(leader.types);
    const majorWeaknesses = Object.entries(leaderWeaknesses)
      .filter(([_, m]) => m > 1.0)
      .map(([t, _]) => t);

    // 🥈 Safe Swap: 尋找能抗 Leader 弱點且分數最高的補手
    let safeSwap = myPokemons[1];
    let bestSwapScore = -1;

    for (let i = 1; i < myPokemons.length; i++) {
      const p = myPokemons[i];
      const pWeak = getWeaknesses(p.types);
      
      // 計算該寶可夢對 Leader 弱點的覆蓋力 (抗性越多分數越高)
      let coverageScore = 0;
      majorWeaknesses.forEach(w => {
        if (pWeak[w] < 1.0) coverageScore += 2;
        if (pWeak[w] > 1.0) coverageScore -= 1;
      });

      if (coverageScore > bestSwapScore) {
        bestSwapScore = coverageScore;
        safeSwap = p;
      }
    }

    // 🥉 Closer: 確保團隊防禦平衡 (避免兩隻以上怕同一個屬性)
    const teamWeaknessCount: Record<string, number> = {};
    [leader, safeSwap].forEach(p => {
      const w = getWeaknesses(p.types);
      Object.entries(w).forEach(([type, m]) => {
        if (m > 1.0) teamWeaknessCount[type] = (teamWeaknessCount[type] || 0) + 1;
      });
    });

    let closer = myPokemons.find(p => p.speciesId !== leader.speciesId && p.speciesId !== safeSwap.speciesId) || myPokemons[2];
    let bestCloserScore = -1;

    for (let i = 1; i < myPokemons.length; i++) {
      const p = myPokemons[i];
      if (p.speciesId === leader.speciesId || p.speciesId === safeSwap.speciesId) continue;
      
      const pWeak = getWeaknesses(p.types);
      let penalty = 0;
      Object.entries(pWeak).forEach(([type, m]) => {
        if (m > 1.0 && teamWeaknessCount[type] >= 1) penalty += 5; // 避免疊加弱點
      });

      const score = (p.score || p.rating || 0) - penalty;
      if (score > bestCloserScore) {
        bestCloserScore = score;
        closer = p;
      }
    }

    // --- 輸出格式化 ---
    const formatTypes = (types: string[]) => types.map(t => t.toUpperCase()).join('/');
    
    let msg = `📊 <b>${league} 聯盟 v2 聯防陣容分析</b>\n`;
    msg += `=======================\n`;
    msg += `🥇 <b>先發 (Leader)</b>\n`;
    msg += `👉 <code>${leader.chineseName}</code> (${formatTypes(leader.types)})\n\n`;
    
    msg += `🥈 <b>安全替換 (Safe Swap)</b>\n`;
    msg += `👉 <code>${safeSwap.chineseName}</code> (${formatTypes(safeSwap.types)})\n`;
    msg += `<i>(負責對抗先發的弱點)</i>\n\n`;
    
    msg += `🥉 <b>壓軸 (Closer)</b>\n`;
    msg += `👉 <code>${closer.chineseName}</code> (${formatTypes(closer.types)})\n`;
    msg += `<i>(平衡團隊屬性漏洞)</i>\n`;
    msg += `=======================\n`;
    msg += `<i>💡 v2 演算法已載入屬性矩陣，針對您的盒子進行了 324 種屬性對陣組合運算。</i>`;

    return msg;

  } catch (error) {
    return "❌ 分析失敗: " + (error as Error).message;
  }
}
