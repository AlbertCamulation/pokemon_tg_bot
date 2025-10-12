/**
 * 整合了 Telegram Bot、從 GitHub 讀取資料、User ID 白名單、
 * 以及中英文寶可夢模糊搜尋並按聯盟分組顯示結果的 Worker 腳本
 * (增加了針對翻譯檔的快取清除機制來解決部署問題)
 */

// --- GitHub 相關設定 ---
const GITHUB_USERNAME = "AlbertCamulation";
const REPO_NAME = "pokemon_tg_bot";
const BRANCH_NAME = "main";
// --------------------

// --- Telegram Bot 相關設定 (直接從全域變數讀取) ---
const TOKEN = ENV_BOT_TOKEN;
const WEBHOOK = '/endpoint';
const SECRET = ENV_BOT_SECRET;
const TRASH_LIST_PREFIX = 'trash_pokemon_'; // KV 儲存的 key 前綴
const ALLOWED_UID_KEY = 'allowed_user_ids'; // KV 儲存的白名單 key
const LIMIT_LEAGUES_SHOW = 50
const leagues = [
  { command: "little_league_top", name: "小小盃", cp: "500", path: "data/rankings_500.json" },
  { command: "great_league_top", name: "超級聯盟", cp: "1500", path: "data/rankings_1500.json" },
  { command: "retro_cup_top", name: "復古盃1500", cp: "1500", path: "data/rankings_1500_retro.json" },
  { command: "summer_cup_top_1500", name: "夏日盃1500", cp: "1500", path: "data/rankings_1500_summer.json" },
  { command: "willpower_cup_top_1500", name: "意志盃1500", cp: "1500", path: "data/rankings_willpower_1500.json" },
  { command: "jungle_cup_top_1500", name: "意志盃1500", cp: "1500", path: "data/rankings_1500_jungle.json" },
  { command: "ultra_league_top", name: "高級聯盟", cp: "2500", path: "data/rankings_2500.json" },
  { command: "summer_cup_top_2500", name: "夏日盃2500", cp: "2500", path: "data/rankings_2500_summer.json" },
  { command: "master_league_top", name: "大師聯盟", cp: "10000", path: "data/rankings_10000.json" },
  { command: "master_league_top_meta", name: "大師聯盟", cp: "10000", path: "data/rankings_meta_master_10000.json" },
  { command: "attackers_top", name: "最佳攻擊", cp: "10000", path: "data/rankings_attackers_tier.json" },
  { command: "defenders_top", name: "最佳防禦", cp: "10000", path: "data/rankings_defenders_tier.json" },
];

/**
 * 主監聽事件
 */
addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname === WEBHOOK) {
    event.respondWith(handleWebhook(event));
  } else if (url.pathname === '/registerWebhook') {
    event.respondWith(registerWebhook(event, url, WEBHOOK, SECRET));
  } else if (url.pathname === '/unRegisterWebhook') {
    event.respondWith(unRegisterWebhook(event));
  } else {
    event.respondWith(new Response('Ok'));
  }
});

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

    if (!response.ok) {
      throw new Error(`無法載入 ${leagueInfo.name} 排名資料 (HTTP ${response.status})`);
    }
    if (!transResponse.ok) {
      throw new Error(`無法載入寶可夢中英文對照表 (HTTP ${transResponse.status})`);
    }

    const rankings = await response.json();
    const allPokemonData = await transResponse.json();
    const idToNameMap = new Map(allPokemonData.map(p => [p.speciesId.toLowerCase(), p.speciesName]));

    const topRankings = rankings.slice(0, limit);

    let replyMessage = `🏆 *${leagueInfo.name}* (前 ${limit} 名) 🏆\n\n`;
    
    // --- ⭐️ 新增：用於存放可複製名稱的陣列 ⭐️ ---
    const copyableNames = [];

    topRankings.forEach((pokemon, rankIndex) => {
      let rankDisplay = '';
      let typesDisplay = '';
      let cpDisplay = '';
      
      let speciesName = idToNameMap.get(pokemon.speciesId.toLowerCase()) || pokemon.speciesName;
      
      if (speciesName === 'Giratina (Altered)') {
        speciesName = '騎拉帝納 別種';
      } else if (speciesName === 'Giratina (Altered) (Shadow)') {
        speciesName = '騎拉帝納 別種 暗影';
      } else if (speciesName === 'Claydol (Shadow)') {
        speciesName = '念力土偶 暗影';
      } else if (speciesName === 'Zweilous (Shadow)') {
        speciesName = '雙首暴龍 暗影';
      } else if (speciesName === 'Golisopod') {
        speciesName = '具甲武者';
      } else if (speciesName === 'Cradily') {
        speciesName = '搖籃百合';
      } else if (speciesName === 'Gigantamax Snorlax') {
        speciesName = '卡比獸 極巨化';
      } else if (speciesName === 'Hisuian Avalugg') {
        speciesName = '冰岩怪 洗翠';
      } else if (speciesName === 'Gigantamax Lapras') {
        speciesName = '拉普拉斯 極巨化';
      } else if (speciesName === 'Hydreigon (Shadow)') {
        speciesName = '三首惡龍 暗影';
      } else if (speciesName === 'Toucannon (Shadow)') {
        speciesName = '銃嘴大鳥 暗影';
      } else if (speciesName === 'Trumbeak (Shadow) ') {
        speciesName = '喇叭啄鳥 暗影';
      }

      // --- ⭐️ 新增：清理名稱並存入陣列 ⭐️ ---
      const cleanedName = speciesName
          .replace(/\s*一擊流/g, '')
          .replace(/\s*靈獸/g, '')
          .replace(/\s*冰凍/g, '')
          .replace(/\s*水流/g, '')
          .replace(/\s*閃電/g, '')
          .replace(/\s*完全體/g, '')
          .replace(/\s*闇黑/g, '')
          .replace(/\s*拂曉之翼/g, '')
          .replace(/\s*黃昏之鬃/g, '')
          .replace(/\s*特大尺寸/g, '')
          .replace(/\s*普通尺寸/g, '')
          .replace(/\s*大尺寸/g, '')
          .replace(/\s*小尺寸/g, '')
          .replace(/\s*別種/g, '')
          .replace(/\s*裝甲/g, '')
          .replace(/\s*滿腹花紋/g, '')
          .replace(/\s*洗翠/g, '')
          .replace(/\s*Mega/g, '')
          .replace(/\s*X/g, '')
          .replace(/\s*Y/g, '')
          .replace(/\s*原始/g, '')
          .replace(/\s*起源/g, '')
          .replace(/\s*劍之王/g, '')
          .replace(/\s*盾之王/g, '')
          .replace(/\s*焰白/g, '')
          .replace(/\s*暗影/g, '')
          .replace(/\s*伽勒爾/g, '')
          .replace(/\s*極巨化/g, '') 
          
      copyableNames.push(cleanedName.trim());
      // ------------------------------------
      
      const isPvpokeRank = pokemon.score !== undefined;
      if (isPvpokeRank) { // PvPoke 結構
        rankDisplay = pokemon.rank ? `#${pokemon.rank}` : `#${rankIndex + 1}`;
      } else { // PogoHub 結構
        rankDisplay = pokemon.tier ? `(${pokemon.tier})` : '';
      }
      
      if (pokemon.types && pokemon.types.length > 0) {
        typesDisplay = `(${pokemon.types.join(', ')})`;
      }

      if (pokemon.cp) {
        cpDisplay = ` CP: ${pokemon.cp}`;
      }
      
      const score = pokemon.score && typeof pokemon.score === 'number' ? `(${pokemon.score.toFixed(2)})` : '';
      
      replyMessage += `${rankDisplay} ${speciesName} ${typesDisplay}${cpDisplay} ${score}\n`;
    });

    // --- ⭐️ 新增：將可複製的清單附加到訊息末尾 ⭐️ ---
    if (copyableNames.length > 0) {
        const uniqueNames = [...new Set(copyableNames)];
        replyMessage += `\n\n*可複製清單:*\n`;
        replyMessage += "```\n";
        replyMessage += uniqueNames.join(',');
        replyMessage += "\n```";
    }
    // ------------------------------------

    return sendMessage(chatId, replyMessage.trim(), 'Markdown');
  } catch (e) {
    console.error(`查詢 ${leagueInfo.name} 時出錯:`, e);
    return sendMessage(chatId, `處理查詢 *${leagueInfo.name}* 時發生錯誤: ${e.message}`, 'Markdown');
  }
}

/**
 * 處理寶可夢模糊搜尋，並按聯盟分組排序顯示結果
 */
async function handlePokemonSearch(chatId, query) {
  await sendMessage(chatId, `🔍 正在查詢與 "${query}" 相關的寶可夢家族排名，請稍候...`);

  try {
    const cacheBuster = `v=${Math.random().toString(36).substring(7)}`;
    const translationUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/data/chinese_translation.json?${cacheBuster}`;
    const transResponse = await fetch(translationUrl);
    if (!transResponse.ok) throw new Error(`無法載入寶可夢資料庫 (HTTP ${transResponse.status})`);
    const allPokemonData = await transResponse.json();
    
    const isChinese = /[\u4e00-\u9fa5]/.test(query);
    const lowerCaseQuery = query.toLowerCase();
    const initialMatches = allPokemonData.filter(p => isChinese ? p.speciesName.includes(query) : p.speciesId.toLowerCase().includes(lowerCaseQuery));
    if (initialMatches.length === 0) return await sendMessage(chatId, `很抱歉，找不到任何與 "${query}" 相關的寶可夢。`);

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

    /*let replyMessage = `🏆 與 *"${query}"* 相關的寶可夢家族排名結果 🏆\n`;*/
    let replyMessage = `🏆 與 <b>"${query}"</b> 相關的寶可夢家族排名結果 🏆\n`;
    let foundAnyResults = false;

    allLeagueRanks.forEach((rankings, index) => {
      const league = leagues[index];
      if (!rankings) return;

      const resultsInThisLeague = [];
      rankings.forEach((pokemon, rankIndex) => {
        if (matchingIds.has(pokemon.speciesId.toLowerCase())) {
          resultsInThisLeague.push({
            rank: pokemon.rank || rankIndex + 1,
            score: pokemon.score || pokemon.cp || 'N/A',
            speciesName: idToNameMap.get(pokemon.speciesId.toLowerCase()) || pokemon.speciesName,
            types: pokemon.types,
            tier: pokemon.tier,
            cp: pokemon.cp,
          });
        }
      });
      
      if (resultsInThisLeague.length > 0) {
        foundAnyResults = true;
        /*replyMessage += `\n*${league.name} (${league.cp}):*\n`;*/
        replyMessage += `\n<b>${league.name} (${league.cp}):</b>\n`;
        resultsInThisLeague.forEach(p => {
          let rankDisplay = '';
          if (p.rank && typeof p.rank === 'number') {
            rankDisplay = `#${p.rank}`;
          } else {
            rankDisplay = p.tier ? `(${p.tier})` : '';
          }
          
          const rating = getPokemonRating(p.rank || p.tier);
          const score = p.score && typeof p.score === 'number' ? `(${p.score.toFixed(2)})` : '';
          const cp = p.cp ? ` CP: ${p.cp}` : '';
          const typesDisplay = p.types && p.types.length > 0 ? `(${p.types.join(', ')})` : '';

          /*replyMessage += `${rankDisplay} ${p.speciesName} ${typesDisplay}${cp} ${score} - ${rating}\n`;*/
          replyMessage += `${rankDisplay} <code>${p.speciesName}</code> ${typesDisplay}${cp} ${score} - ${rating}\n`;
        });
      }
    });

    if (!foundAnyResults) {
      replyMessage = `很抱歉，在所有聯盟中都找不到與 "${query}" 相關的排名資料。`;
    }

    /*return await sendMessage(chatId, replyMessage.trim(), 'Markdown');*/
    return await sendMessage(chatId, replyMessage.trim(), 'HTML');

  } catch (e) {
    console.error("搜尋時出錯:", e);
    return await sendMessage(chatId, `處理搜尋時發生錯誤: ${e.message}`);
  }
}

/**
 * 根據排名給予評價的函式
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
    const ratingMap = {
      "S": "🥇白金",
      "A+": "🥇金",
      "A": "🥈銀",
      "B+": "🥉銅",
      "B": "垃圾",
      "C": "垃圾",
      "D": "垃圾",
      "F": "垃圾"
    };
    return ratingMap[rank] || "N/A";
  }
  return "N/A";
}

/**
 * 處理 /trash 命令，現在會顯示使用者專屬的垃圾清單
 */
async function handleTrashCommand(chatId, userId, messageFrom) {
  const trashList = await getTrashList(userId);
  const userName = messageFrom.first_name || messageFrom.username || "訓練家";
  
  if (trashList.length === 0) {
    return await sendMessage(chatId, `您好, ${userName}\n您的垃圾清單目前是空的。`);
  }

  const pokemonNames = trashList.join(',');
  let replyMessage = `您好, ${userName}\n這是您的垃圾清單：\n\n<code>${pokemonNames}&!3*&!4*</code>\n\n可以複製這個清單並貼到遊戲內搜尋。\n\n新增寶可夢：<code>/trash</code>`;

  return await sendMessage(chatId, replyMessage, 'HTML');
}

/**
 * 處理 /untrash 命令，可以移除多個寶可夢
 */
async function handleUntrashCommand(chatId, userId, pokemonNames) {
    if (pokemonNames.length === 0) {
        return await sendMessage(chatId, "請輸入您想移除的寶可夢名稱，以空格分隔。");
    }

    if (typeof POKEMON_KV === 'undefined') {
        console.error("錯誤：POKEMON_KV 命名空間未綁定。");
        return;
    }

    const kvKey = TRASH_LIST_PREFIX + userId;
    let currentList = await getTrashList(userId);
    const removedPokemon = [];

    pokemonNames.forEach(name => {
        const index = currentList.indexOf(name);
        if (index > -1) {
            currentList.splice(index, 1);
            removedPokemon.push(name);
        }
    });

    if (removedPokemon.length > 0) {
        await POKEMON_KV.put(kvKey, JSON.stringify(currentList));
        const removedNames = removedPokemon.join(', ');
        return sendMessage(chatId, `已從您的垃圾清單中移除：${removedNames}。`);
    } else {
        const notFoundNames = pokemonNames.join(', ');
        return sendMessage(chatId, `清單中找不到您指定的寶可夢：${notFoundNames}。`);
    }
}

/**
 * 從 KV 取得已授權的使用者 ID 列表
 */
async function getAllowedUserIds() {
    if (typeof POKEMON_KV === 'undefined') {
        console.error("錯誤：POKEMON_KV 命名空間未綁定。");
        return [];
    }
    const allowedIds = await POKEMON_KV.get(ALLOWED_UID_KEY, 'json');
    return allowedIds || [];
}

/**
 * 設定已授權的使用者 ID 列表到 KV
 */
async function setAllowedUserIds(ids) {
    if (typeof POKEMON_KV === 'undefined') {
        console.error("錯誤：POKEMON_KV 命名空間未綁定。");
        return;
    }
    await POKEMON_KV.put(ALLOWED_UID_KEY, JSON.stringify(ids));
}

/**
 * 處理 /list_allowed_uid 命令
 */
async function handleListAllowedUidCommand(chatId) {
    const allowedUserIds = await getAllowedUserIds();

    if (allowedUserIds.length === 0) {
        return sendMessage(chatId, '目前沒有已授權的使用者 ID。');
    }

    let replyMessage = '已授權的使用者 ID：\n\n';
    
    allowedUserIds.forEach(uid => {
        replyMessage += `- <code>${uid}</code>\n`;
    });

    return sendMessage(chatId, replyMessage, 'HTML');
}

/**
 * 處理 /allow_uid {uid} 命令
 */
async function handleAllowUidCommand(chatId, uid) {
    if (!uid) {
        return sendMessage(chatId, '請提供一個使用者 ID 以加入白名單。例如：`/allow_uid 123456789`');
    }

    let allowedUserIds = await getAllowedUserIds();

    const newUid = parseInt(uid);
    if (isNaN(newUid)) {
        return sendMessage(chatId, '無效的使用者 ID，請輸入數字。');
    }
    
    if (allowedUserIds.includes(newUid)) {
        return sendMessage(chatId, `使用者 ID ${newUid} 已在白名單中。`);
    }

    allowedUserIds.push(newUid);
    await setAllowedUserIds(allowedUserIds);
    return sendMessage(chatId, `使用者 ID ${newUid} 已成功加入白名單。`);
}

/**
 * 處理 /del_uid {uid} 命令
 */
async function handleDelUidCommand(chatId, uid) {
    if (!uid) {
        return sendMessage(chatId, '請提供一個使用者 ID 以從白名單移除。例如：`/del_uid 123456789`');
    }

    let allowedUserIds = await getAllowedUserIds();

    const uidToRemove = parseInt(uid);
    if (isNaN(uidToRemove)) {
        return sendMessage(chatId, '無效的使用者 ID，請輸入數字。');
    }

    const index = allowedUserIds.indexOf(uidToRemove);
    if (index > -1) {
        allowedUserIds.splice(index, 1);
        await setAllowedUserIds(allowedUserIds);
        return sendMessage(chatId, `使用者 ID ${uidToRemove} 已從白名單中移除。`);
    } else {
        return sendMessage(chatId, `使用者 ID ${uidToRemove} 不在白名單中。`);
    }
}

/**
 * 將寶可夢加入使用者專屬的垃圾清單
 */
async function addToTrashList(userId, pokemonNames) {
  if (typeof POKEMON_KV === 'undefined') {
    console.error("錯誤：POKEMON_KV 命名空間未綁定。");
    return;
  }
  const kvKey = TRASH_LIST_PREFIX + userId; // 使用前綴 + userId 作為 KV key
  const list = await getTrashList(userId);
  
  // 逐一處理多個寶可夢名稱
  pokemonNames.forEach(pokemonName => {
    if (pokemonName && !list.includes(pokemonName)) {
      list.push(pokemonName);
    }
  });

  await POKEMON_KV.put(kvKey, JSON.stringify(list));
}

/**
 * 從 KV 取得使用者專屬的垃圾清單
 */
async function getTrashList(userId) {
  if (typeof POKEMON_KV === 'undefined') {
    console.error("錯誤：POKEMON_KV 命名空間未綁定。");
    return [];
  }
  const kvKey = TRASH_LIST_PREFIX + userId; // 使用前綴 + userId 作為 KV key
  const list = await POKEMON_KV.get(kvKey, 'json');
  return list || [];
}

/**
 * 處理 incoming Message (已修正版本)
 */
async function onMessage(message) {
  if (!message.text) {
    return;
  }

  const text = message.text.trim();
  const messageParts = text.split(' ');
  const commandText = messageParts[0];
  // 修正1：移除指令最前面的 '/'，方便後續比對
  const command = commandText.split('@')[0].substring(1); 
  const pokemonQuery = messageParts.slice(1);
  const chatId = message.chat.id;
  const userId = message.from.id;

  // 修正2：動態檢查指令是否存在於 leagues 陣列中
  const leagueInfo = leagues.find(l => l.command === command);

  if (leagueInfo) {
    // 如果是聯盟指令，就統一呼叫 handleLeagueCommand 函式
    const limit = parseInt(pokemonQuery[0], 10) || LIMIT_LEAGUES_SHOW;
    return await handleLeagueCommand(chatId, command, limit);
  }

  // 修正3：如果不是聯盟指令，才進入 switch 處理其他指令
  // 注意 case 後面都沒有斜線 '/'
  switch (command) {
    case 'start':
    case 'help':
    case 'list':
      return sendHelpMessage(chatId);
    
    case 'list_allowed_uid':
      return handleListAllowedUidCommand(chatId);
    
    case 'allow_uid':
      return handleAllowUidCommand(chatId, pokemonQuery[0]);
    
    case 'del_uid':
      return handleDelUidCommand(chatId, pokemonQuery[0]);
    
    case 'trash':
      if (pokemonQuery.length > 0) {
        await addToTrashList(userId, pokemonQuery);
        const addedPokemon = pokemonQuery.join(', ');
        return sendMessage(chatId, `已將 "${addedPokemon}" 加入您的垃圾清單。`);
      } else {
        return handleTrashCommand(chatId, userId, message.from);
      }
    
    case 'untrash':
      return handleUntrashCommand(chatId, userId, pokemonQuery);
    
    default:
      // 如果指令是以 '/' 開頭但找不到對應處理，視為未知指令
      if (text.startsWith('/')) {
        return sendMessage(chatId, '這是一個未知的指令。請使用 /help 查看所有可用指令。');
      } else {
        // 如果不是以 '/' 開頭，則視為寶可夢名稱搜尋
        return await handlePokemonSearch(chatId, text);
      }
  }
}

// --- 為了讓程式碼完整，將其他無需修改的函式貼在下方 ---
async function handleWebhook(event) {
  if (event.request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== SECRET) {
    return new Response('Unauthorized', { status: 403 });
  }
  const update = await event.request.json();
  event.waitUntil(onUpdate(update));
  return new Response('Ok');
}
async function onUpdate(update) {
  let allowedUserIds = await getAllowedUserIds();
  
  if ('message' in update && update.message.from) {
    const user = update.message.from;
    const userId = user.id;
    console.log(allowedUserIds);
    if (allowedUserIds.length > 0 && !allowedUserIds.includes(userId)) {
      let userInfo = user.first_name || '';
      if (user.last_name) userInfo += ` ${user.last_name}`;
      if (user.username) userInfo += ` (@${user.username})`;
      console.log(`Blocked access for unauthorized user: ID=${userId}, Name=${userInfo}`);
      return;
    }

    if ('text' in update.message) {
      console.log(`User ${userId} (${user.username || user.first_name}) sent: ${update.message.text}`);
      await onMessage(update.message);
    }
  }
}
async function sendMessage(chatId, text, parseMode = null) {
  const params = { chat_id: chatId, text };
  if (parseMode) {
    params.parse_mode = parseMode;
  }
  return (await fetch(apiUrl('sendMessage', params))).json();
}
async function registerWebhook(event, requestUrl, suffix, secret) {
  const webhookUrl = `${requestUrl.protocol}//${requestUrl.hostname}${suffix}`;
  const r = await (await fetch(apiUrl('setWebhook', { url: webhookUrl, secret_token: secret }))).json();
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2));
}
async function unRegisterWebhook(event) {
  const r = await (await fetch(apiUrl('setWebhook', { url: '' }))).json();
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2));
}
function apiUrl(methodName, params = null) {
  let query = '';
  if (params) {
    query = '?' + new URLSearchParams(params).toString();
  }
  return `https://api.telegram.org/bot${TOKEN}/${methodName}${query}`;
}
function sendHelpMessage(chatId) {
  const leagueCommands = leagues.map(l => `/${l.command.replace(/_/g, '\\_')} - 查詢 ${l.name} 前${LIMIT_LEAGUES_SHOW}名`).join('\n');
  const helpMessage = `*寶可夢排名查詢 Bot*\n\n` +
      `*功能說明:*\n` +
      `\`直接輸入寶可夢名稱\` (中/英文) 來查詢其在各聯盟中的排名。\n` +
      `*例如:* \`索財靈\` 或 \`Gimmighoul\`\n\n` +
      `*垃圾清單指令:*\n` +
      `/trash - 顯示垃圾清單\n` +
      `\`/trash [寶可夢名稱]\` - 新增寶可夢到垃圾清單\n` +
      `\`/untrash [寶可夢名稱]\` - 從清單中刪除寶可夢\n\n` +
      `*白名單管理指令:*\n` +
      `/list_allowed_uid - 顯示已授權的使用者 ID\n` +
      `\`/allow_uid [使用者ID]\` - 新增使用者 ID 到白名單\n` +
      `\`/del_uid [使用者ID]\` - 從白名單中刪除使用者 ID\n\n` +
      `*聯盟排名指令:*\n` +
      `${leagueCommands}\n\n` +
      `/list - 顯示所有聯盟排名查詢指令\n` +
      `/help - 顯示此說明`;
  /*const helpMessage = `*寶可夢排名查詢 Bot*\n\n` +
      `*功能說明:*\n` +
      `\`直接輸入寶可夢名稱\` (中/英文) 來查詢其在各聯盟中的排名。\n` +
      `*例如:* \`索財靈\` 或 \`Gimmighoul\`\n\n` +
      `*垃圾清單指令:*\n` +
      `\` /trash \` - 顯示垃圾清單\n` +
      `\` /trash [寶可夢名稱]\` - 新增寶可夢到垃圾清單\n` +
      `\` /untrash [寶可夢名稱]\` - 從清單中刪除寶可夢\n\n` +
      `*白名單管理指令:*\n` +
      `\` /list_allowed_uid \` - 顯示已授權的使用者 ID\n` +
      `\` /allow_uid [使用者ID] \` - 新增使用者 ID 到白名單\n` +
      `\` /del_uid [使用者ID] \` - 從白名單中刪除使用者 ID\n\n` +
      `*聯盟排名指令:*\n` +
      `${leagueCommands}\n\n` +
      `\` /list \` - 顯示所有聯盟排名查詢指令\n` +
      `\` /help \` - 顯示此說明`;*/
  return sendMessage(chatId, helpMessage, 'Markdown');
}
