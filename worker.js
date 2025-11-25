/**
 * Pokemon Go Telegram Bot Worker (v3.0 家族連坐修正版)
 * 修正重點：
 * /trashall 改用 Family ID 進行判斷。
 * 只要家族中「任何一個進化型」或「任何形態」在任一聯盟強勢 (<=100名)，
 * 該家族的所有成員都會被視為有用，不會出現在垃圾清單中。
 */

// --- GitHub 相關設定 ---
const GITHUB_USERNAME = "AlbertCamulation";
const REPO_NAME = "pokemon_tg_bot";
const BRANCH_NAME = "main";

// --- 常數設定 ---
const WEBHOOK = '/endpoint'; 
const TRASH_LIST_PREFIX = 'trash_pokemon_'; 
const ALLOWED_UID_KEY = 'allowed_user_ids'; 
const LIMIT_LEAGUES_SHOW = 50;

// 定義聯盟列表
const leagues = [
  { command: "little_league_top", name: "小小盃", cp: "500", path: "data/rankings_500.json" },
  { command: "great_league_top", name: "超級聯盟", cp: "1500", path: "data/rankings_1500.json" },
  { command: "halloween_cup_league_top_1500", name: "萬聖節盃1500", cp: "1500", path: "data/rankings_1500_halloween.json" },
  { command: "retro_cup_top", name: "復古盃1500", cp: "1500", path: "data/rankings_1500_retro.json" },
  { command: "summer_cup_top_1500", name: "夏日盃1500", cp: "1500", path: "data/rankings_1500_summer.json" },
  { command: "willpower_cup_top_1500", name: "意志盃1500", cp: "1500", path: "data/rankings_willpower_1500.json" },
  { command: "jungle_cup_top_1500", name: "叢林盃1500", cp: "1500", path: "data/rankings_1500_jungle.json" },
  { command: "great_league_top_remix", name: "超級聯盟remix", cp: "1500", path: "data/rankings_1500_remix.json" },
  { command: "great_league_championship2025", name: "Championship2025", cp: "1500", path: "data/rankings_1500_LAIC_2025_Championship_Series_Cup.json" },
  { command: "ultra_league_top", name: "高級聯盟", cp: "2500", path: "data/rankings_2500.json" },
  { command: "summer_cup_top_2500", name: "夏日盃2500", cp: "2500", path: "data/rankings_2500_summer.json" },
  { command: "master_league_top", name: "大師聯盟", cp: "10000", path: "data/rankings_10000.json" },
  { command: "master_league_top_permier", name: "大師紀念賽", cp: "10000", path: "data/rankings_10000_premier.json" },
  { command: "master_league_top_meta", name: "大師聯盟Meta", cp: "10000", path: "data/rankings_meta_master_10000.json" },
  { command: "attackers_top", name: "最佳攻擊", cp: "Any", path: "data/rankings_attackers_tier.json" },
  { command: "defenders_top", name: "最佳防禦", cp: "Any", path: "data/rankings_defenders_tier.json" },
];

// 名稱清理正則
const NAME_CLEANER_REGEX = /\s*(一擊流|靈獸|冰凍|水流|閃電|完全體|闇黑|拂曉之翼|黃昏之鬃|特大尺寸|普通尺寸|大尺寸|小尺寸|別種|裝甲|滿腹花紋|洗翠|Mega|X|Y|原始|起源|劍之王|盾之王|焰白|暗影|伽勒爾|極巨化|阿羅拉|的樣子)/g;

addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname === WEBHOOK) {
    event.respondWith(handleWebhook(event));
  } else if (url.pathname === '/registerWebhook') {
    event.respondWith(registerWebhook(event, url, WEBHOOK, ENV_BOT_SECRET));
  } else if (url.pathname === '/unRegisterWebhook') {
    event.respondWith(unRegisterWebhook(event));
  } else {
    event.respondWith(new Response('Pokemon Bot is running.'));
  }
});

async function handleWebhook(event) {
  if (event.request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const secret = event.request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (secret !== ENV_BOT_SECRET) return new Response('Unauthorized', { status: 403 });
  try {
    const update = await event.request.json();
    if (update.message) await onMessage(update.message);
    return new Response('Ok');
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
}

// 保持原有的 handleLeagueCommand
async function handleLeagueCommand(chatId, command, limit = 50) {
  const leagueInfo = leagues.find(l => l.command === command);
  if (!leagueInfo) return sendMessage(chatId, '未知的命令。');
  await sendMessage(chatId, `正在查詢 *${leagueInfo.name}* 前 ${limit} 名...`, 'Markdown');
  
  try {
    const cacheBuster = `v=${Math.random().toString(36).substring(7)}`;
    const [response, transResponse] = await Promise.all([
      fetch(`https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${leagueInfo.path}?${cacheBuster}`),
      fetch(`https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/data/chinese_translation.json?${cacheBuster}`)
    ]);

    if (!response.ok || !transResponse.ok) throw new Error("資料讀取失敗");

    const rankings = await response.json();
    const allPokemonData = await transResponse.json();
    const idToNameMap = new Map(allPokemonData.map(p => [p.speciesId.toLowerCase(), p.speciesName]));

    const topRankings = rankings.slice(0, limit);
    let replyMessage = `🏆 *${leagueInfo.name}* (前 ${limit} 名) 🏆\n\n`;
    const copyableNames = [];

    topRankings.forEach((pokemon, rankIndex) => {
      let speciesName = idToNameMap.get(pokemon.speciesId.toLowerCase()) || pokemon.speciesName;
      if (!speciesName || typeof speciesName !== 'string') return;
      if (speciesName === 'Giratina (Altered)') speciesName = '騎拉帝納 別種';
      else if (speciesName === 'Giratina (Altered) (Shadow)') speciesName = '騎拉帝納 別種 暗影';
      else if (speciesName === 'Claydol (Shadow)') speciesName = '念力土偶 暗影';

      const cleanedName = speciesName.replace(NAME_CLEANER_REGEX, '').trim();
      if (cleanedName) copyableNames.push(cleanedName);

      let rankDisplay = pokemon.score !== undefined ? (pokemon.rank ? `#${pokemon.rank}` : `#${rankIndex + 1}`) : (pokemon.tier ? `(${pokemon.tier})` : '');
      const typesDisplay = (pokemon.types && pokemon.types.length > 0) ? `(${pokemon.types.join(', ')})` : '';
      const cpDisplay = pokemon.cp ? ` CP: ${pokemon.cp}` : '';
      const score = (pokemon.score && typeof pokemon.score === 'number') ? `(${pokemon.score.toFixed(2)})` : '';
      replyMessage += `${rankDisplay} ${speciesName} ${typesDisplay}${cpDisplay} ${score}\n`;
    });

    if (copyableNames.length > 0) {
      const uniqueNames = [...new Set(copyableNames)];
      replyMessage += `\n\n*可複製清單:*\n\`\`\`\n${uniqueNames.join(',')}\n\`\`\``;
    }
    return sendMessage(chatId, replyMessage.trim(), 'Markdown');
  } catch (e) {
    return sendMessage(chatId, `查詢失敗: ${e.message}`, 'Markdown');
  }
}

/**
 * ⭐️ 處理 /trashall 命令 (家族連坐版 v3.0) ⭐️
 * 1. 找出所有強勢的 ID (排名 <= 100)。
 * 2. 查出這些強勢 ID 所屬的 Family ID。
 * 3. 建立 "強勢家族名單" (Good Families)。
 * 4. 遍歷所有寶可夢，若其 Family ID 不在強勢名單中，則該家族全員視為垃圾。
 * 5. 輸出時，僅輸出該家族的 "代表名稱" (通常是第一階或名稱最單純的那個)，避免重複。
 */
async function handleTrashAllCommand(chatId) {
    await sendMessage(chatId, '🗑️ 正在進行全家族譜系掃描，請稍候...');

    try {
        const cacheBuster = `v=${Math.random().toString(36).substring(7)}`;
        
        // 1. 取得完整寶可夢資料庫 (含 Family 資訊)
        const transUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/data/chinese_translation.json?${cacheBuster}`;
        const transResponse = await fetch(transUrl);
        if (!transResponse.ok) throw new Error("無法讀取翻譯檔");
        const allPokemonData = await transResponse.json();

        // 建立 ID -> FamilyID 的對照表
        const idToFamilyMap = new Map();
        const idToNameMap = new Map();
        
        allPokemonData.forEach(p => {
            const pid = p.speciesId.toLowerCase();
            idToNameMap.set(pid, p.speciesName);
            if (p.family && p.family.id) {
                idToFamilyMap.set(pid, p.family.id);
            }
        });

        // 2. 取得所有聯盟資料
        const fetchPromises = leagues.map(league =>
            fetch(`https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${league.path}?${cacheBuster}`, { cf: { cacheTtl: 86400 } })
                .then(res => res.ok ? res.json() : null)
        );
        const allLeagueRanks = await Promise.all(fetchPromises);

        // 3. 找出 "強勢家族" (Good Families)
        const goodFamilies = new Set();

        allLeagueRanks.forEach(rankings => {
            if (!rankings) return;
            rankings.forEach(p => {
                const pid = p.speciesId.toLowerCase();
                const rank = p.rank || p.tier || 999;
                const rating = getPokemonRating(rank);
                
                // 只要銅牌以上 (<=100)，這個 ID 就算強
                if (rating !== "垃圾") {
                    // 找出這個強 ID 所屬的家族
                    const famId = idToFamilyMap.get(pid);
                    if (famId) {
                        goodFamilies.add(famId);
                    } else {
                        // 如果資料庫沒這個家族資訊，保守起見，把這個 ID 當作獨立家族列為 Good
                        goodFamilies.add("single_" + pid); 
                    }
                }
            });
        });

        // 4. 篩選出 "全家族都是垃圾" 的寶可夢
        const trashNamesSet = new Set();
        
        allPokemonData.forEach(p => {
            const pid = p.speciesId.toLowerCase();
            const famId = p.family ? p.family.id : "single_" + pid;
            
            // 如果這個家族 不在 強勢家族名單中
            if (!goodFamilies.has(famId)) {
                let name = p.speciesName;
                
                // 修正特殊名稱
                if (name === 'Giratina (Altered)') name = '騎拉帝納 別種';
                else if (name === 'Giratina (Altered) (Shadow)') name = '騎拉帝納 別種 暗影';

                // 清理名稱 (去掉 暗影, 阿羅拉...) 取得基本名
                const cleanedName = name.replace(NAME_CLEANER_REGEX, '').trim();
                
                if (cleanedName) {
                    trashNamesSet.add(cleanedName);
                }
            }
        });

        // 5. 排序並輸出
        // 注意：這裡可能會包含 "未知圖騰" 等多種形態，Set 會自動去重
        const sortedNames = [...trashNamesSet].sort();

        if (sortedNames.length === 0) {
            return await sendMessage(chatId, '🎉 驚人的發現！目前資料庫中沒有完全被評為垃圾的家族。');
        }

        const csvContent = sortedNames.join(',');
        
        let replyMessage = `🗑️ <b>全聯盟垃圾寶可夢清單 (家族連坐版)</b>\n`;
        replyMessage += `(列表中的寶可夢，其本人、進化型、及其所有形態，在所有聯盟中評價皆為垃圾)\n\n`;
        replyMessage += `<code>${csvContent}</code>`;

        return await sendMessage(chatId, replyMessage, 'HTML');

    } catch (e) {
        console.error("執行 trashall 時出錯:", e);
        return await sendMessage(chatId, `查詢失敗: ${e.message}`);
    }
}

async function handlePokemonSearch(chatId, query) {
    await sendMessage(chatId, `🔍 正在查詢與 "${query}" 相關的排名...`);
    try {
        const cacheBuster = `v=${Math.random().toString(36).substring(7)}`;
        const transResponse = await fetch(`https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/data/chinese_translation.json?${cacheBuster}`);
        if (!transResponse.ok) throw new Error("無法載入寶可夢資料庫");
        const allPokemonData = await transResponse.json();
        
        const isChinese = /[\u4e00-\u9fa5]/.test(query);
        const lowerCaseQuery = query.toLowerCase();
        const initialMatches = allPokemonData.filter(p => isChinese ? p.speciesName.includes(query) : p.speciesId.toLowerCase().includes(lowerCaseQuery));
        
        if (initialMatches.length === 0) return await sendMessage(chatId, `找不到與 "${query}" 相關的寶可夢。`);

        // 找出相關家族
        const familyIds = new Set(initialMatches.map(p => p.family ? p.family.id : null).filter(id => id));
        const familyMatches = allPokemonData.filter(p => p.family && familyIds.has(p.family.id));
        const finalMatches = familyMatches.length > 0 ? familyMatches : initialMatches;
        
        const matchingIds = new Set(finalMatches.map(p => p.speciesId.toLowerCase()));
        const idToNameMap = new Map(finalMatches.map(p => [p.speciesId.toLowerCase(), p.speciesName]));

        const allLeagueRanks = await Promise.all(leagues.map(league =>
            fetch(`https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${league.path}?${cacheBuster}`, { cf: { cacheTtl: 86400 } })
                .then(res => res.ok ? res.json() : null)
        ));

        let replyMessage = `🏆 與 <b>"${query}"</b> 相關的排名結果 🏆\n`;
        const collectedResults = [];

        allLeagueRanks.forEach((rankings, index) => {
            const league = leagues[index];
            if (!rankings) return;
            rankings.forEach((pokemon, rankIndex) => {
                if (matchingIds.has(pokemon.speciesId.toLowerCase())) {
                    const rank = pokemon.rank || pokemon.tier || rankIndex + 1;
                    collectedResults.push({
                        league: league,
                        rank: rank,
                        score: pokemon.score || pokemon.cp || 'N/A',
                        speciesName: idToNameMap.get(pokemon.speciesId.toLowerCase()) || pokemon.speciesName,
                        types: pokemon.types,
                        tier: pokemon.tier,
                        cp: pokemon.cp,
                        rating: getPokemonRating(rank)
                    });
                }
            });
        });

        const nonTrashResults = collectedResults.filter(p => p.rating !== "垃圾");

        if (nonTrashResults.length > 0) {
            const resultsByLeague = {};
            nonTrashResults.forEach(p => {
                const leagueKey = `<b>${p.league.name} (${p.league.cp}):</b>`;
                if (!resultsByLeague[leagueKey]) resultsByLeague[leagueKey] = [];
                let rankDisplay = (typeof p.rank === 'number') ? `#${p.rank}` : (p.tier ? `(${p.tier})` : '');
                const score = (p.score && typeof p.score === 'number') ? `(${p.score.toFixed(2)})` : '';
                const types = (p.types && p.types.length > 0) ? `(${p.types.join(', ')})` : '';
                resultsByLeague[leagueKey].push(`${rankDisplay} <code>${p.speciesName}</code> ${types}${p.cp?` CP:${p.cp}`:''} ${score} - ${p.rating}`);
            });
            for (const leagueName in resultsByLeague) {
                replyMessage += `\n${leagueName}\n` + resultsByLeague[leagueName].join('\n') + '\n';
            }
        } else if (collectedResults.length > 0) {
            // 所有結果都是垃圾，顯示建議 trash 的指令
            // 這裡抓出該家族最基礎的名字 (通常是字數最短的) 作為建議
            const representativeName = finalMatches.sort((a, b) => a.speciesName.length - b.speciesName.length)[0].speciesName;
            const cleanedRepName = representativeName.replace(NAME_CLEANER_REGEX, '').trim();
            
            replyMessage = `與 <b>"${query}"</b> 相關的寶可夢家族在所有聯盟中評價皆為垃圾。\n\n建議輸入 <code>/trash ${cleanedRepName}</code> 加入垃圾清單。`;
        } else {
            replyMessage = `在所有聯盟中都找不到與 "${query}" 相關的排名資料。`;
        }
        return await sendMessage(chatId, replyMessage.trim(), 'HTML');
    } catch (e) {
        return sendMessage(chatId, `搜尋錯誤: ${e.message}`);
    }
}

function getPokemonRating(rank) {
  if (typeof rank === 'number' && !isNaN(rank)) {
    if (rank <= 10) return "🥇白金";
    if (rank <= 25) return "🥇金";
    if (rank <= 50) return "🥈銀";
    if (rank <= 100) return "🥉銅";
    return "垃圾";
  }
  if (typeof rank === 'string') {
    const map = { "S": "🥇白金", "A+": "🥇金", "A": "🥈銀", "B+": "🥉銅" };
    return map[rank] || "垃圾";
  }
  return "N/A";
}

// KV Functions
async function getTrashList(userId) {
  if (typeof POKEMON_KV === 'undefined') return [];
  return (await POKEMON_KV.get(TRASH_LIST_PREFIX + userId, 'json')) || [];
}
async function addToTrashList(userId, pokemonNames) {
  if (typeof POKEMON_KV === 'undefined') return;
  const list = await getTrashList(userId);
  pokemonNames.forEach(name => { if (name && !list.includes(name)) list.push(name); });
  await POKEMON_KV.put(TRASH_LIST_PREFIX + userId, JSON.stringify(list));
}
async function getAllowedUserIds() {
  if (typeof POKEMON_KV === 'undefined') return [];
  return (await POKEMON_KV.get(ALLOWED_UID_KEY, 'json')) || [];
}
async function setAllowedUserIds(ids) {
  if (typeof POKEMON_KV === 'undefined') return;
  await POKEMON_KV.put(ALLOWED_UID_KEY, JSON.stringify(ids));
}

// Other Command Handlers
async function handleTrashCommand(chatId, userId, messageFrom) {
  const trashList = await getTrashList(userId);
  const userName = messageFrom.first_name || "訓練家";
  if (trashList.length === 0) return sendMessage(chatId, `您好, ${userName}\n您的垃圾清單目前是空的。`);
  let replyMessage = `您好, ${userName}\n您的垃圾清單：\n\n<code>${trashList.join(',')}&!3*&!4*</code>\n\n複製上方字串可於遊戲內搜尋。`;
  return sendMessage(chatId, replyMessage, 'HTML');
}
async function handleUntrashCommand(chatId, userId, pokemonNames) {
  if (pokemonNames.length === 0) return sendMessage(chatId, "請輸入要移除的名稱。");
  if (typeof POKEMON_KV === 'undefined') return;
  const currentList = await getTrashList(userId);
  const removed = [];
  pokemonNames.forEach(name => {
    const idx = currentList.indexOf(name);
    if (idx > -1) { currentList.splice(idx, 1); removed.push(name); }
  });
  if (removed.length > 0) {
    await POKEMON_KV.put(TRASH_LIST_PREFIX + userId, JSON.stringify(currentList));
    return sendMessage(chatId, `已移除：${removed.join(', ')}`);
  }
  return sendMessage(chatId, "清單中找不到這些寶可夢。");
}
async function handleAllowUidCommand(chatId, uid) {
    if (!uid) return sendMessage(chatId, '請輸入 UID');
    let ids = await getAllowedUserIds();
    const newId = parseInt(uid);
    if (isNaN(newId)) return sendMessage(chatId, '無效的 UID');
    if (ids.includes(newId)) return sendMessage(chatId, '已在白名單中');
    ids.push(newId);
    await setAllowedUserIds(ids);
    return sendMessage(chatId, `已加入 UID: ${newId}`);
}
async function handleDelUidCommand(chatId, uid) {
    if (!uid) return sendMessage(chatId, '請輸入 UID');
    let ids = await getAllowedUserIds();
    const targetId = parseInt(uid);
    const idx = ids.indexOf(targetId);
    if (idx > -1) { ids.splice(idx, 1); await setAllowedUserIds(ids); return sendMessage(chatId, `已移除 UID: ${targetId}`); }
    return sendMessage(chatId, '不在白名單中');
}

async function onMessage(message) {
  if (!message.text) return;
  const text = message.text.trim();
  const parts = text.split(' ');
  const command = parts[0].split('@')[0].substring(1); 
  const args = parts.slice(1);
  const chatId = message.chat.id;
  const userId = message.from.id;

  const leagueInfo = leagues.find(l => l.command === command);
  if (leagueInfo) {
    const limit = parseInt(args[0], 10)