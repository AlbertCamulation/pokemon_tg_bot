/**
 * Pokemon Go Telegram Bot Worker (v2.1 安全修正版)
 * 修正說明：
 * /trashall 改採「家族連坐法」判斷。
 * 若某個寶可夢名稱 (如: 穿山王) 底下的「任何一種形態」(如: 阿羅拉) 是強勢的 (銅牌以上)，
 * 則該名稱「絕對不會」出現在垃圾清單中，防止搜尋字串誤殺。
 */

// --- GitHub 相關設定 ---
const GITHUB_USERNAME = "AlbertCamulation";
const REPO_NAME = "pokemon_tg_bot";
const BRANCH_NAME = "main";

// --- 常數設定 ---
// 這裡預設讀取環境變數。請在 Cloudflare Worker 後台 Settings -> Variables 設定:
// ENV_BOT_TOKEN: 你的 Telegram Bot Token
// ENV_BOT_SECRET: 自定義的 Webhook Secret
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
  // 注意：攻擊與防禦排名通常不影響 PvP Trash 判定，若要嚴格排除 PvE 強角，可保留檢查
  { command: "attackers_top", name: "最佳攻擊", cp: "Any", path: "data/rankings_attackers_tier.json" },
  { command: "defenders_top", name: "最佳防禦", cp: "Any", path: "data/rankings_defenders_tier.json" },
];

// --- 輔助正則：用於清理名稱 (增加「阿羅拉」、「的樣子」以確保搜尋安全性) ---
const NAME_CLEANER_REGEX = /\s*(一擊流|靈獸|冰凍|水流|閃電|完全體|闇黑|拂曉之翼|黃昏之鬃|特大尺寸|普通尺寸|大尺寸|小尺寸|別種|裝甲|滿腹花紋|洗翠|Mega|X|Y|原始|起源|劍之王|盾之王|焰白|暗影|伽勒爾|極巨化|阿羅拉|的樣子)/g;

/**
 * 主要監聽事件
 */
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

/**
 * 處理 Webhook 請求
 */
async function handleWebhook(event) {
  if (event.request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  
  const secret = event.request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (secret !== ENV_BOT_SECRET) {
    return new Response('Unauthorized', { status: 403 });
  }

  try {
    const update = await event.request.json();
    if (update.message) {
      await onMessage(update.message);
    }
    return new Response('Ok');
  } catch (e) {
    console.error('Error handling webhook:', e);
    return new Response('Error', { status: 500 });
  }
}

/**
 * 處理所有聯盟排名的命令 (保持原樣)
 */
async function handleLeagueCommand(chatId, command, limit = 50) {
  const leagueInfo = leagues.find(l => l.command === command);
  if (!leagueInfo) return sendMessage(chatId, '未知的命令，請檢查指令。');

  await sendMessage(chatId, `正在查詢 *${leagueInfo.name}* 的前 ${limit} 名寶可夢，請稍候...`, 'Markdown');

  try {
    const cacheBuster = `v=${Math.random().toString(36).substring(7)}`;
    const [response, transResponse] = await Promise.all([
      fetch(`https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${leagueInfo.path}?${cacheBuster}`),
      fetch(`https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/data/chinese_translation.json?${cacheBuster}`)
    ]);

    if (!response.ok) throw new Error(`無法載入 ${leagueInfo.name} 排名資料`);
    if (!transResponse.ok) throw new Error(`無法載入寶可夢中英文對照表`);

    const rankings = await response.json();
    const allPokemonData = await transResponse.json();
    const idToNameMap = new Map(allPokemonData.map(p => [p.speciesId.toLowerCase(), p.speciesName]));

    const topRankings = rankings.slice(0, limit);
    let replyMessage = `🏆 *${leagueInfo.name}* (前 ${limit} 名) 🏆\n\n`;
    const copyableNames = [];

    topRankings.forEach((pokemon, rankIndex) => {
      let speciesName = idToNameMap.get(pokemon.speciesId.toLowerCase()) || pokemon.speciesName;
      if (!speciesName || typeof speciesName !== 'string') return;

      // 修正特殊名稱
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
 * ⭐️ 處理 /trashall 命令 (安全增強版) ⭐️
 * 邏輯：
 * 1. 蒐集所有 ID 的評價。
 * 2. 如果某個 ID 排名 <= 100 (銅牌以上)，標記為 GOOD。
 * 3. 將中文名稱正規化 (例如 "阿羅拉 穿山王" -> "穿山王")。
 * 4. 檢查每個「正規化名稱」底下關聯的所有 ID。
 * 5. 只要該名稱下有 *任何一個* ID 是 GOOD，該名稱就不會列入垃圾清單 (避免搜尋字串誤殺)。
 */
async function handleTrashAllCommand(chatId) {
    await sendMessage(chatId, '🗑️ 正在掃描全聯盟資料 (安全模式)，這可能需要幾秒鐘...');

    try {
        const cacheBuster = `v=${Math.random().toString(36).substring(7)}`;
        
        // 1. 下載資料
        const transUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/data/chinese_translation.json?${cacheBuster}`;
        const transResponse = await fetch(transUrl);
        if (!transResponse.ok) throw new Error("無法讀取翻譯檔");
        const allPokemonData = await transResponse.json();
        
        const fetchPromises = leagues.map(league =>
            fetch(`https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${league.path}?${cacheBuster}`, { cf: { cacheTtl: 86400 } })
                .then(res => res.ok ? res.json() : null)
        );
        const allLeagueRanks = await Promise.all(fetchPromises);

        // 2. 建立 ID 狀態表
        const goodIds = new Set(); // 存放在任一聯盟 <= 100 的 ID
        const allSeenIds = new Set(); // 存放所有出現在榜單上的 ID

        allLeagueRanks.forEach(rankings => {
            if (!rankings) return;
            rankings.forEach(p => {
                const pid = p.speciesId.toLowerCase();
                allSeenIds.add(pid);

                const rank = p.rank || p.tier || 999;
                const rating = getPokemonRating(rank);
                
                // 只要不是垃圾 (銅牌以上)，就算 GOOD
                if (rating !== "垃圾") {
                    goodIds.add(pid);
                }
            });
        });

        // 3. 建立「基本名稱」對應「ID 列表」的 Map
        // 目的是把 "sandslash_alolan" 和 "sandslash_normal" 歸類到 "穿山王"
        const idToNameMap = new Map(allPokemonData.map(p => [p.speciesId.toLowerCase(), p.speciesName]));
        const nameToIdsMap = new Map();

        // 遍歷所有榜單上出現過的 ID
        allSeenIds.forEach(pid => {
            let originalName = idToNameMap.get(pid);
            if (originalName) {
                // 特殊修正
                if (originalName === 'Giratina (Altered)') originalName = '騎拉帝納 別種';
                else if (originalName === 'Giratina (Altered) (Shadow)') originalName = '騎拉帝納 別種 暗影';

                // 清理名稱取得「基本名」
                const cleanName = originalName.replace(NAME_CLEANER_REGEX, '').trim();
                
                if (cleanName) {
                    if (!nameToIdsMap.has(cleanName)) {
                        nameToIdsMap.set(cleanName, []);
                    }
                    nameToIdsMap.get(cleanName).push(pid);
                }
            }
        });

        // 4. 篩選真正的垃圾名稱
        // 規則：該名稱底下的 *所有* ID 都必須不在 goodIds 裡面
        const safeTrashNames = [];

        nameToIdsMap.forEach((ids, name) => {
            // 檢查這個名字底下的所有 ID，是否有任何一個是好貨？
            const hasAnyGoodForm = ids.some(id => goodIds.has(id));

            if (!hasAnyGoodForm) {
                // 只有當全家都是垃圾，才加入清單
                safeTrashNames.push(name);
            }
        });

        // 5. 排序與輸出
        const sortedNames = safeTrashNames.sort();

        if (sortedNames.length === 0) {
            return await sendMessage(chatId, '🎉 目前資料庫中沒有「完全垃圾」的寶可夢（或為了安全起見已隱藏）。');
        }

        const csvContent = sortedNames.join(',');
        
        let replyMessage = `🗑️ <b>全聯盟垃圾寶可夢清單 (安全版)</b>\n`;
        replyMessage += `(已自動排除任何有強勢形態的寶可夢，例如：雖然普通穿山王是垃圾，但因阿羅拉穿山王強勢，故穿山王不會顯示在此，以防搜尋誤刪)\n\n`;
        replyMessage += `<code>${csvContent}</code>`;

        return await sendMessage(chatId, replyMessage, 'HTML');

    } catch (e) {
        console.error("執行 trashall 時出錯:", e);
        return await sendMessage(chatId, `查詢失敗: ${e.message}`);
    }
}

/**
 * 處理寶可夢模糊搜尋 (保持原樣)
 */
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
            const representativeName = initialMatches[0].speciesName;
            replyMessage = `與 <b>"${query}"</b> 相關的寶可夢在所有聯盟中評價皆為垃圾。\n\n建議輸入 <code>/trash ${representativeName}</code> 加入垃圾清單。`;
        } else {
            replyMessage = `在所有聯盟中都找不到與 "${query}" 相關的排名資料。`;
        }
        return await sendMessage(chatId, replyMessage.trim(), 'HTML');
    } catch (e) {
        return sendMessage(chatId, `搜尋錯誤: ${e.message}`);
    }
}

/**
 * 評價等級判斷 (銅牌以上都算好)
 */
function getPokemonRating(rank) {
  if (typeof rank === 'number' && !isNaN(rank)) {
    if (rank <= 10) return "🥇白金";
    if (rank <= 25) return "🥇金";
    if (rank <= 50) return "🥈銀";
    if (rank <= 100) return "🥉銅";
    return "垃圾";
  }
  if (typeof rank === 'string') {
    // 支援 Tier S, A+, A, B+ (PvE 或其他格式)
    const map = { "S": "🥇白金", "A+": "🥇金", "A": "🥈銀", "B+": "🥉銅" };
    // 有些 PvE 列表可能用 "Tier 1" 等，這裡暫時將字串 S/A/B+ 視為好
    return map[rank] || "垃圾";
  }
  return "N/A"; // 缺資料時保守處理
}

/**
 * KV 資料操作
 */
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

/**
 * 其他指令處理
 */
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

/**
 * 訊息路由
 */
async function onMessage(message) {
  if (!message.text) return;
  const text = message.text.trim();
  const parts = text.split(' ');
  const command = parts[0].split('@')[0].substring(1); 
  const args = parts.slice(1);
  const chatId = message.chat.id;
  const userId = message.from.id;

  // 權限檢查 (可選)
  // const allowedIds = await getAllowedUserIds();
  // if (allowedIds.length > 0 && !allowedIds.includes(userId)) return;

  const leagueInfo = leagues.find(l => l.command === command);
  if (leagueInfo) {
    const limit = parseInt(args[0], 10) || LIMIT_LEAGUES_SHOW;
    return await handleLeagueCommand(chatId, command, limit);
  }

  switch (command) {
    case 'start':
    case 'help':
    case 'list':
      const helpText = `🤖 *指令列表*\n/trashall - 全聯盟垃圾清單 (安全版)\n/trash - 個人垃圾清單\n/great_league_top - 超級聯盟\n(及其他聯盟指令...)`;
      return sendMessage(chatId, helpText, 'Markdown');
    case 'trashall': return handleTrashAllCommand(chatId);
    case 'list_allowed_uid':
      const ids = await getAllowedUserIds();
      return sendMessage(chatId, ids.length ? `白名單:\n${ids.join('\n')}` : '白名單為空');
    case 'allow_uid': return handleAllowUidCommand(chatId, args[0]);
    case 'del_uid': return handleDelUidCommand(chatId, args[0]);
    case 'trash':
      if (args.length > 0) { await addToTrashList(userId, args); return sendMessage(chatId, `已加入垃圾清單: ${args.join(', ')}`); }
      else return handleTrashCommand(chatId, userId, message.from);
    case 'untrash': return handleUntrashCommand(chatId, userId, args);
    default:
      if (text.length >= 2 && !text.startsWith('/')) return handlePokemonSearch(chatId, text);
      return;
  }
}

async function sendMessage(chatId, text, parseMode = '') {
  const url