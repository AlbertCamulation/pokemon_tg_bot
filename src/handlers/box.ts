import type { Env, PokemonData, RankingPokemon } from '../types';
import { fetchWithCache, getDataUrl } from '../utils/cache';
import { leagues } from '../constants'; // 🔥 引入你原本寫好的聯盟常數設定

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
    // 1. 取得中英翻譯字典
    const transRes = await fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx);
    const transData = await transRes.json() as PokemonData[];

    // 🔥 把我們在 worker.ts 寫的補丁也加進來，確保自訂中文能對應回 ID
    const translationPatch: Record<string, string> = {
      "cradily": "搖籃百合",
      "golisopod": "具甲武者",
      "lanturn": "電燈怪",
      "victreebel_mega": "大食花 Mega",
      "malamar_mega": "烏賊王 Mega"
    };

    const nameToInfo = new Map<string, { id: string, types: string[] }>();
    transData.forEach(p => {
      const id = p.speciesId ? p.speciesId.toLowerCase() : "";
      const rawName = p.speciesName || "";
      
      let finalName = rawName;
      if (translationPatch[id]) finalName = translationPatch[id];
      else if (translationPatch[rawName]) finalName = translationPatch[rawName];
      
      if (finalName) {
         nameToInfo.set(finalName.trim(), { id: id, types: p.types || [] });
      }
    });

    // 2. 將使用者的中文名單轉成 ID
    const userBoxIds = teamNames.map(name => {
      const info = nameToInfo.get(name.trim());
      return info ? info.id : null;
    }).filter(Boolean) as string[];

    // 3. 取得真正的聯盟排名檔案路徑 (直接從 constants.ts 抓取，保證路徑正確！)
    const leagueInfo = leagues.find(l => l.command === String(league) || l.cp === String(league));
    if (!leagueInfo) {
      return `⚠️ 系統找不到 ${league} 聯盟的排名設定，請確認 constants.ts 是否有此聯盟。`;
    }

    const rankRes = await fetchWithCache(getDataUrl(leagueInfo.path), env, ctx);
    const rankings = await rankRes.json() as RankingPokemon[];

    if (!Array.isArray(rankings)) {
       return `⚠️ 排名資料格式異常，路徑: ${leagueInfo.path}`;
    }

    // 4. 過濾出使用者擁有的怪，並依照分數 (score 或 rating) 排序
    const myRankedPokemons = rankings
      .filter(r => r.speciesId && userBoxIds.includes(r.speciesId.toLowerCase()))
      .sort((a, b) => (b.score || b.rating || 0) - (a.score || a.rating || 0));

    // 🐞 終極 Debug 輸出 (幫助我們抓蟲)
    if (myRankedPokemons.length < 3) {
      return `⚠️ 找不到足夠的排名資料進行分析。
🔍 <b>系統除錯雷達：</b>
🔹 收到寶可夢: <code>${teamNames.join(", ")}</code>
🔹 成功轉ID數: <code>${userBoxIds.length} 隻</code>
🔹 讀取排名檔: <code>${leagueInfo.path}</code>
🔹 該排名總數: ${rankings.length}
🔹 成功配對數: ${myRankedPokemons.length}`;
    }

    // ==========================================
    // 🧠 智能聯防演算法開始
    // ==========================================
    
    // [先發 Leader]
    const leader = myRankedPokemons[0];
    const leaderInfo = transData.find(p => p.speciesId.toLowerCase() === leader.speciesId.toLowerCase());
    const leaderTypes = leaderInfo?.types || [];

    // [安全替換 Safe Swap]
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

    // [壓軸 Closer]
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

    // 5. 翻譯回中文並組合回覆訊息
    const getChineseName = (id: string) => {
      if (translationPatch[id.toLowerCase()]) return translationPatch[id.toLowerCase()];
      return transData.find(p => p.speciesId.toLowerCase() === id.toLowerCase())?.speciesName || id;
    };

    const scoreStr = (val?: number) => val ? val.toFixed(1) : "無";

    let resultMsg = `📊 <b>${league} 聯盟最佳陣容分析</b>\n`;
    resultMsg += `=======================\n`;
    resultMsg += `🥇 <b>先發 (Leader)</b>\n`;
    resultMsg += `👉 <code>${getChineseName(leader.speciesId)}</code> (綜合評分: ${scoreStr(leader.score || leader.rating)})\n\n`;
    
    resultMsg += `🥈 <b>安全替換 (Safe Swap)</b>\n`;
    resultMsg += `👉 <code>${getChineseName(safeSwap.speciesId)}</code> (綜合評分: ${scoreStr(safeSwap.score || safeSwap.rating)})\n\n`;
    
    resultMsg += `🥉 <b>壓軸 (Closer)</b>\n`;
    resultMsg += `👉 <code>${getChineseName(closer.speciesId)}</code> (綜合評分: ${scoreStr(closer.score || closer.rating)})\n`;
    resultMsg += `=======================\n`;
    resultMsg += `<i>💡 系統已為您避開重複屬性，最大化聯防效益！</i>`;

    return resultMsg;

  } catch (error) {
    console.error("分析失敗:", error);
    return "❌ 演算法運算時發生錯誤: " + (error as Error).message;
  }
}
