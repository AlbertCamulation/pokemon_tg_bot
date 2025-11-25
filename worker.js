/**
 * Pokemon Go Telegram Bot Worker
 * 功能：
 * 1. 多聯盟排行查詢 (從 GitHub 讀取)
 * 2. 模糊搜尋寶可夢並顯示跨聯盟評價
 * 3. 個人化垃圾清單 (/trash, /untrash)
 * 4. 全域垃圾搜尋 (/trashall) - 輸出全聯盟皆為垃圾的 CSV 字串
 * 5. 白名單管理 (/allow_uid, /del_uid)
 */

// --- GitHub 相關設定 ---
const GITHUB_USERNAME = "AlbertCamulation";
const REPO_NAME = "pokemon_tg_bot";
const BRANCH_NAME = "main";

// --- 常數設定 ---
// TOKEN 與 SECRET 從環境變數 (Settings -> Variables) 讀取: ENV_BOT_TOKEN, ENV_BOT_SECRET
const WEBHOOK = '/endpoint'; 
const TRASH_LIST_PREFIX = 'trash_pokemon_'; // KV 儲存 user trash list 的前綴
const ALLOWED_UID_KEY = 'allowed_user_ids'; // KV 儲存白名單的 key
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

// --- 輔助正則：用於清理名稱以方便搜尋 ---
const NAME_CLEANER_REGEX = /\s*(一擊流|靈獸|冰凍|水流|閃電|完全體|闇黑|拂曉之翼|黃昏之鬃|特大尺寸|普通尺寸|大尺寸|小尺寸|別種|裝甲|滿腹花紋|洗翠|Mega|X|Y|原始|起源|劍之王|盾之王|焰白|暗影|伽勒爾|極巨化)/g;

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
  
  // 驗證 Secret Header
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
 * 處理所有聯盟排名的命令
 */
async function handleLeagueCommand(chatId, command, limit = 50) {
  const leagueInfo = leagues.find(l => l.command === command);
  if (!leagueInfo) {
    return sendMessage(chatId, '未知的命令，請檢查指令。');
  }

  await sendMessage(chatId, `正在查詢 *${leagueInfo.name}* 的前 ${limit} 名寶可夢，請稍候...`, 'Markdown');

  try {
    const cacheBuster = `v=${Math.random().toString(36).substring(7)}`;
    const dataUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${leagueInfo.path}?${cacheBuster}`;
    const transUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/data/chinese_translation.json?${cacheBuster}`;
    
    const [response, transResponse] = await Promise.all([
      fetch(dataUrl),
      fetch(transUrl)
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

      // 特殊名稱對應修正 (可依需求增減)
      if (speciesName === 'Giratina (Altered)') speciesName = '騎拉帝納 別種';
      else if (speciesName === 'Giratina (Altered) (Shadow)') speciesName = '騎拉帝納 別種 暗影';
      else if (speciesName === 'Claydol (Shadow)') speciesName = '念力土偶 暗影';
      // ... (其他特殊名稱可在此補充)

      // 清理名稱並存入複製清單
      const cleanedName = speciesName.replace(NAME_CLEANER_REGEX, '').trim();
      if (cleanedName) copyableNames.push(cleanedName);

      // 顯示格式處理
      let rankDisplay = '';
      if (pokemon.score !== undefined) {
        rankDisplay = pokemon.rank ? `#${pokemon.rank}` : `#${rankIndex + 1}`;
      } else {
        rankDisplay = pokemon.tier ? `(${pokemon.tier})` : '';
      }
      
      const typesDisplay = (pokemon.types && pokemon.types.length > 0) ? `(${pokemon.types.join(', ')})` : '';
      const cpDisplay = pokemon.cp ? ` CP: ${pokemon.cp}` : '';
      const score = (pokemon.score && typeof pokemon.score === 'number') ? `(${pokemon.score.toFixed(2)})` : '';
      
      replyMessage += `${rankDisplay} ${speciesName} ${typesDisplay}${cpDisplay} ${score}\n`;
    });

    // 附加可複製清單
    if (copyableNames.length > 0) {
      const uniqueNames = [...new Set(copyableNames)];
      replyMessage += `\n\n*可複製清單:*\n\`\`\`\n${uniqueNames.join(',')}\n\`\`\``;
    }

    return sendMessage(chatId, replyMessage.trim(), 'Markdown');
  } catch (e) {
    console.error(`查詢 ${leagueInfo.name} 時出錯:`, e);
    return sendMessage(chatId, `處理查詢 *${leagueInfo.name}* 時發生錯誤: ${e.message}`, 'Markdown');
  }
}

/**
 * 處理 /trashall 命令 (核心需求)
 * 邏輯：搜尋全聯盟，找出 "有在排名表中出現" 但 "在所有聯盟都評價很差(>100名 或 垃圾等級)" 的寶可夢
 */
async function handleTrashAllCommand(chatId) {
    await sendMessage(chatId, '🗑️ 正在掃描全聯盟資料，彙整「完全垃圾」的寶可夢清單，請稍候...');

    try {
        const cacheBuster = `v=${Math.random().toString(36).substring(7)}`;
        
        // 1. 下載翻譯檔
        const transUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/data/chinese_translation.json?${cacheBuster}`;
        const transResponse = await fetch(transUrl);
        if (!transResponse.ok) throw new Error("無法讀取翻譯檔");
        const allPokemonData = await transResponse.json();
        const idToNameMap = new Map(allPokemonData.map(p => [p.speciesId.toLowerCase(), p.speciesName]));

        // 2. 下載所有聯盟資料
        const fetchPromises = leagues.map(league =>
            fetch(`https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${league.path}?${cacheBuster}`, { cf: { cacheTtl: 86400 } })
                .then(res => res.ok ? res.json() : null)
        );
        const allLeagueRanks = await Promise.all(fetchPromises);

        // 3. 分析數據
        const goodIds = new Set(); // 只要在任一聯盟表現好，就放入這裡
        const seenIds = new Set(); // 所有有出現過的 ID

        allLeagueRanks.forEach(rankings => {
            if (!rankings) return;
            rankings.forEach(p => {
                const pid = p.speciesId.toLowerCase();
                seenIds.add(pid);

                const rank = p.rank || p.tier || 999;
                const rating = getPokemonRating(rank);
                
                // 定義 "非垃圾": 評價不是垃圾
                if (rating !== "垃圾") {
                    goodIds.add(pid);
                }
            });
        });

        // 4. 篩選出真正的垃圾 (出現過，但從來沒好過)
        const trashNames = [];
        seenIds.forEach(pid => {
            if (!goodIds.has(pid)) {
                let name = idToNameMap.get(pid);
                if (name) {
                    // 這裡可以做簡單的中文名稱修正
                    if (name === 'Giratina (Altered)') name = '騎拉帝納 別種';
                    else if (name === 'Giratina (Altered) (Shadow)') name = '騎拉帝納 別種 暗影';

                    // 使用 Regex 清理名稱 (去掉 暗影, Mega, 洗翠...)
                    const cleanedName = name.replace(NAME_CLEANER_REGEX, '').trim();
                    if (cleanedName) {
                        trashNames.push(cleanedName);
                    }
                }
            }
        });

        // 5. 去重並排序
        const uniqueTrashNames = [...new Set(trashNames)].sort();

        if (uniqueTrashNames.length === 0) {
            return await sendMessage(chatId, '🎉 驚人的發現！目前資料庫中沒有完全被評為垃圾的寶可夢。');
        }

        // 6. 產生 CSV 格式的回覆
        const csvContent = uniqueTrashNames.join(',');
        
        let replyMessage = `🗑️ <b>全聯盟垃圾寶可夢清單</b>\n`;
        replyMessage += `(已排除在任一聯盟排名前段的寶可夢)\n\n`;
        replyMessage += `<code>${csvContent}</code>`;

        return await sendMessage(chatId, replyMessage, 'HTML');

    } catch (e) {
        console.error("執行 trashall 時出錯:", e);
        return await sendMessage(chatId, `查詢失敗: ${e.message}`);
    }
}

/**
 * 處理寶可夢模糊搜尋
 */
async function handlePokemonSearch(chatId, query) {
    await sendMessage(chatId, `🔍 正在查詢與 "${query}" 相關的寶可夢家族排名...`);

    try {
        const cacheBuster = `v=${Math.random().toString(36).substring(7)}`;
        const translationUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/data/chinese_translation.json?${cacheBuster}`;
        const transResponse = await fetch(translationUrl);
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

        const fetchPromises = leagues.map(league =>
            fetch(`https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${league.path}?${cacheBuster}`, { cf: { cacheTtl: 86400 } })
                .then(res => res.ok ? res.json() : null)
        );
        const allLeagueRanks = await Promise.all(fetchPromises);

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

        // 過濾掉 "垃圾" 評價
        const nonTrashResults = collectedResults.filter(p => p.rating !== "垃圾");

        if (nonTrashResults.length > 0) {
            const resultsByLeague = {};
            nonTrashResults.forEach(p => {
                const leagueKey = `<b>${p.league.name} (${p.league.cp}):</b>`;
                if (!resultsByLeague[leagueKey]) resultsByLeague[leagueKey] = [];

                let rankDisplay = (typeof p.rank === 'number') ? `#${p.rank}` : (p.tier ? `(${p.tier})` : '');
                const score = (p.score && typeof p.score === 'number') ? `(${p.score.toFixed(2)})` : '';
                const cp = p.cp ? ` CP: ${p.cp}` : '';
                const types = (p.types && p.types.length > 0) ? `(${p.types.join(', ')})` : '';

                resultsByLeague[leagueKey].push(
                    `${rankDisplay} <code>${p.speciesName}</code> ${types}${cp} ${score} - ${p.rating}`
                );
            });

            for (const leagueName in resultsByLeague) {
                replyMessage += `\n${leagueName}\n` + resultsByLeague[leagueName].join('\n') + '\n';
            }
        } else if (collectedResults.length > 0) {
            const representativeName = initialMatches[0].speciesName;
            replyMessage = `與 <b>"${query}"</b> 相關的寶可夢在所有聯盟中評價皆為垃圾。\n\n` +
                         `建議輸入 <code>/trash ${representativeName}</code> 加入垃圾清單。`;
        } else {
            replyMessage = `很抱歉，在所有聯盟中都找不到與 "${query}" 相關的排名資料。`;
        }

        return await sendMessage(chatId, replyMessage.trim(), 'HTML');

    } catch (e) {
        console.error("搜尋時出錯:", e);
        return await sendMessage(chatId, `搜尋錯誤: ${e.message}`);
    }
}

/**
 * 評價等級判斷
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
    const map = { "S": "🥇白金", "A+": "🥇金", "A": "🥈銀", "B+": "🥉銅" };
    return map[rank] || "垃圾";
  }
  return "N/A";
}

/**
 * KV 資料操作相關函式
 */
async function getTrashList(userId) {
  if (typeof POKEMON_KV === 'undefined') return [];
  return (await POKEMON_KV.get(TRASH_LIST_PREFIX + userId, 'json')) || [];
}

async function addToTrashList(userId, pokemonNames) {
  if (typeof POKEMON_KV === 'undefined') return;
  const list = await getTrashList(userId);
  pokemonNames.forEach(name => {
    if (name && !list.includes(name)) list.push(name);
  });
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
 * 處理 /trash 命令
 */
async function handleTrashCommand(chatId, userId, messageFrom) {
  const trashList = await getTrashList(userId);
  const userName = messageFrom.first_name || messageFrom.username || "訓練家";
  
  if (trashList.length === 0) return sendMessage(chatId, `您好, ${userName}\n您的垃圾清單目前是空的。`);

  const pokemonNames = trashList.join(',');
  let replyMessage = `您好, ${userName}\n您的垃圾清單：\n\n<code>${pokemonNames}&!3*&!4*</code>\n\n複製上方字串可於遊戲內搜尋。\n新增指令: /trash [名稱]`;
  return sendMessage(chatId, replyMessage, 'HTML');
}

/**
 * 處理 /untrash 命令
 */
async function handleUntrashCommand(chatId, userId, pokemonNames) {
  if (pokemonNames.length === 0) return sendMessage(chatId, "請輸入要移除的名稱。");
  if (typeof POKEMON_KV === 'undefined') return;

  const currentList = await getTrashList(userId);
  const removed = [];
  pokemonNames.forEach(name => {
    const idx = currentList.indexOf(name);
    if (idx > -1) {
      currentList.splice(idx, 1);
      removed.push(name);
    }
  });

  if (removed.length > 0) {
    await POKEMON_KV.put(TRASH_LIST_PREFIX + userId, JSON.stringify(currentList));
    return sendMessage(chatId, `已移除：${removed.join(', ')}`);
  } else {
    return sendMessage(chatId, "清單中找不到這些寶可夢。");
  }
}

/**
 * 處理 /allow_uid 與 /del_uid
 */
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
    if (idx > -1) {
        ids.splice(idx, 1);
        await setAllowedUserIds(ids);
        return sendMessage(chatId, `已移除 UID: ${targetId}`);
    }
    return sendMessage(chatId, '不在白名單中');
}

/**
 * 訊息入口與路由
 */
async function onMessage(message) {
  if (!message.text) return;

  const text = message.text.trim();
  const parts = text.split(' ');
  // 移除指令前的斜線與 @botname
  const command = parts[0].split('@')[0].substring(1); 
  const args = parts.slice(1);
  const chatId = message.chat.id;
  const userId = message.from.id;

  // 1. 檢查是否為聯盟指令
  const leagueInfo = leagues.find(l => l.command === command);
  if (leagueInfo) {
    const limit = parseInt(args[0], 10) || LIMIT_LEAGUES_SHOW;
    return await handleLeagueCommand(chatId, command, limit);
  }

  // 2. 檢查其他功能指令
  switch (command) {
    case 'start':
    case 'help':
    case 'list':
      return sendHelpMessage(chatId);

    case 'trashall':
      return handleTrashAllCommand(chatId);

    case 'list_allowed_uid':
      const ids = await getAllowedUserIds();
      return sendMessage(chatId, ids.length ? `白名單:\n${ids.join('\n')}` : '白名單為空');

    case 'allow_uid':
      return handleAllowUidCommand(chatId, args[0]);

    case 'del_uid':
      return handleDelUidCommand(chatId, args[0]);

    case 'trash':
      if (args.length > 0) {
        await addToTrashList(userId, args);
        return sendMessage(chatId, `已將 ${args.join(', ')} 加入垃圾清單。`);
      } else {
        return handleTrashCommand(chatId, userId, message.from);
      }

    case 'untrash':
      return handleUntrashCommand(chatId, userId, args);

    default:
      // 如果不是指令，且長度足夠，則視為模糊搜尋
      if (text.length >= 2 && !text.startsWith('/')) {
        return handlePokemonSearch(chatId, text);
      }
      // 不回覆未知指令，避免洗版
      return;
  }
}

/**
 * 發送訊息至 Telegram
 */
async function sendMessage(chatId, text, parseMode = '') {
  const url = `https://api.telegram.org/bot${ENV_BOT_TOKEN}/sendMessage`;
  const payload = { chat_id: chatId, text: text };
  if (parseMode) payload.parse_mode = parseMode;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

/**
 * 幫助訊息
 */
async function sendHelpMessage(chatId) {
  const helpText = `
🤖 *Pokemon Go 排行機器人*

*排名查詢:*
/great_league_top - 超級聯盟
/ultra_league_top - 高級聯盟
/master_league_top - 大師聯盟
/little_league_top - 小小盃
... (輸入 /list 查看完整列表)

*功能指令:*
🔍 直接輸入寶可夢名稱 (如: 巨沼怪) 可查詢評價
🗑️ /trash [名稱] - 加入個人垃圾清單
📋 /trash - 查看/複製個人垃圾清單
✨ /trashall - 取得全聯盟垃圾寶可夢 CSV
❌ /untrash [名稱] - 移除清單項目
  `;
  await sendMessage(chatId, helpText, 'Markdown');
}

/**
 * 註冊/解除 Webhook
 */
async function registerWebhook(event, url, webhookPath, secret) {
  const webhookUrl = `${url.protocol}//${url.hostname}${webhookPath}`;
  const apiUrl = `https://api.telegram.org/bot${ENV_BOT_TOKEN}/setWebhook`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, secret_token: secret })
  });
  
  return new Response(await response.text());
}

async function unRegisterWebhook(event) {
  const apiUrl = `https://api.telegram.org/bot${ENV_BOT_TOKEN}/deleteWebhook`;
  const response = await fetch(apiUrl);
  return new Response(await response.text());
}