import type { Env, PokemonData, RankingPokemon } from '../types';
import { fetchWithCache, getDataUrl } from '../utils/cache';

export async function analyzeUserBoxTeam(
  league: number, 
  teamNames: string[], 
  env: Env, 
  ctx: ExecutionContext
): Promise<string> {
  if (teamNames.length < 3) {
    return "⚠️ 盒子內的寶可夢不足 3 隻，請再多抓幾隻進來喔！";
  }

  try {
    // 1. 取得中英翻譯字典 (用來抓屬性跟 ID)
    const transRes = await fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx);
    const transData = await transRes.json() as PokemonData[];

    const nameToInfo = new Map<string, { id: string, types: string[] }>();
    transData.forEach(p => {
      if (p.speciesName) {
         nameToInfo.set(p.speciesName, { id: p.speciesId.toLowerCase(), types: p.types || [] });
      }
    });

    // 將使用者的中文名單轉成 ID
    const userBoxIds = teamNames.map(name => nameToInfo.get(name)?.id).filter(Boolean) as string[];

    // 2. 判斷要讀取哪個聯盟的排名檔案
    let rankingPath = `data/rankings_${league}_overall.json`;
    if (league === 500) rankingPath = `data/rankings_500_little.json`; // 假設 500 是小小盃

    const rankRes = await fetchWithCache(getDataUrl(rankingPath), env, ctx);
    const rankings = await rankRes.json() as RankingPokemon[];

    // 3. 過濾出使用者擁有的怪，並依照分數 (score) 排序
    const myRankedPokemons = rankings
      .filter(r => userBoxIds.includes(r.speciesId.toLowerCase()))
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    if (myRankedPokemons.length < 3) {
      return "⚠️ 找不到足夠的排名資料進行分析，請確認寶可夢是否符合該聯盟限制。";
    }

    // ==========================================
    // 🧠 智能聯防演算法開始
    // ==========================================
    
    // [先發 Leader]：直接選盒子裡分數最高的！
    const leader = myRankedPokemons[0];
    const leaderInfo = transData.find(p => p.speciesId.toLowerCase() === leader.speciesId.toLowerCase());
    const leaderTypes = leaderInfo?.types || [];

    // [安全替換 Safe Swap]：尋找分數最高，且「屬性不與先發重疊」的寶可夢
    let safeSwap = myRankedPokemons[1];
    for (let i = 1; i < myRankedPokemons.length; i++) {
      const candidateInfo = transData.find(p => p.speciesId.toLowerCase() === myRankedPokemons[i].speciesId.toLowerCase());
      const candidateTypes = candidateInfo?.types || [];
      const hasOverlap = candidateTypes.some(t => leaderTypes.includes(t));
      
      if (!hasOverlap) {
        safeSwap = myRankedPokemons[i];
        break;
      }
    }

    // [壓軸 Closer]：尋找分數最高，且「屬性不與先發、也不與 Safe Swap 重疊」的寶可夢
    const safeSwapInfo = transData.find(p => p.speciesId.toLowerCase() === safeSwap.speciesId.toLowerCase());
    const usedTypes = new Set([...leaderTypes, ...(safeSwapInfo?.types || [])]);
    
    let closer = myRankedPokemons.find(p => p.speciesId !== leader.speciesId && p.speciesId !== safeSwap.speciesId) || myRankedPokemons[2];
    for (let i = 1; i < myRankedPokemons.length; i++) {
      const candidate = myRankedPokemons[i];
      if (candidate.speciesId === leader.speciesId || candidate.speciesId === safeSwap.speciesId) continue;

      const candidateInfo = transData.find(p => p.speciesId.toLowerCase() === candidate.speciesId.toLowerCase());
      const candidateTypes = candidateInfo?.types || [];
      const hasOverlap = candidateTypes.some(t => usedTypes.has(t));
      
      if (!hasOverlap) {
        closer = candidate;
        break;
      }
    }

    // 4. 翻譯回中文並組合回覆訊息
    const getChineseName = (id: string) => transData.find(p => p.speciesId.toLowerCase() === id.toLowerCase())?.speciesName || id;

    let resultMsg = `📊 <b>${league} 聯盟最佳陣容分析</b>\n`;
    resultMsg += `=======================\n`;
    resultMsg += `🥇 <b>先發 (Leader)</b>\n`;
    resultMsg += `👉 <code>${getChineseName(leader.speciesId)}</code> (評分: ${leader.score})\n\n`;
    
    resultMsg += `🥈 <b>安全替換 (Safe Swap)</b>\n`;
    resultMsg += `👉 <code>${getChineseName(safeSwap.speciesId)}</code> (評分: ${safeSwap.score})\n\n`;
    
    resultMsg += `🥉 <b>壓軸 (Closer)</b>\n`;
    resultMsg += `👉 <code>${getChineseName(closer.speciesId)}</code> (評分: ${closer.score})\n`;
    resultMsg += `=======================\n`;
    resultMsg += `<i>💡 系統已自動為您避開重複屬性，最大化聯防效益！</i>`;

    return resultMsg;

  } catch (error) {
    console.error("分析失敗:", error);
    return "❌ 演算法運算時發生錯誤，請稍後再試。";
  }
}
