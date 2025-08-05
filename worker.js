/**
 * 整合了 Telegram Bot、從 GitHub 讀取資料、User ID 白名單、
 * 以及中英文寶可夢模糊搜尋並按聯盟分組顯示結果的 Worker 腳本
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
 * 處理來自 Telegram 的 Webhook 請求
 */
async function handleWebhook(event) {
  if (event.request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== SECRET) {
    return new Response('Unauthorized', { status: 403 });
  }
  const update = await event.request.json();
  event.waitUntil(onUpdate(update));
  return new Response('Ok');
}

/**
 * 處理收到的訊息更新，並進行 User ID 驗證
 */
async function onUpdate(update) {
  let allowedUserIds = [];
  try {
    if (typeof ALLOWED_USER_IDS_JSON !== 'undefined' && ALLOWED_USER_IDS_JSON) {
      allowedUserIds = JSON.parse(ALLOWED_USER_IDS_JSON);
    }
  } catch (e) {
    console.error("解析 ALLOWED_USER_IDS_JSON 時出錯:", e);
  }
  
  if ('message' in update && update.message.from) {
    const user = update.message.from;
    const userId = user.id;

    if (!allowedUserIds.includes(userId)) {
      let userInfo = user.first_name || '';
      if (user.last_name) userInfo += ` ${user.last_name}`;
      if (user.username) userInfo += ` (@${user.username})`;
      console.log(`Blocked access for unauthorized user: ID=${userId}, Name=${userInfo}`);
      return;
    }
    
    if ('text' in update.message) {
      await onMessage(update.message);
    }
  }
}

/**
 * 根據訊息內容進行路由
 */
async function onMessage(message) {
  const text = message.text.trim();
  
  if (text.startsWith('/ranking')) {
    return await handleRankingCommand(message.chat.id);
  } else if (text.startsWith('/')) {
    return sendMessage(message.chat.id, '這是一個未知的指令。請直接輸入寶可夢的中英文名稱來查詢排名。');
  } else if (text) {
    return await handlePokemonSearch(message.chat.id, text);
  }
}

/**
 * 處理寶可夢模糊搜尋，並按聯盟分組排序顯示
 */
async function handlePokemonSearch(chatId, query) {
  await sendMessage(chatId, `🔍 正在查詢與 "${query}" 相關的寶可夢排名，請稍候...`);

  try {
    // 1. 獲取中英文對照表
    const translationUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/data/chinese_translation.json`;
    // 【新增的除錯步驟】: 讓機器人直接回傳它要存取的網址
    await sendMessage(chatId, `[除錯] 正在嘗試讀取此 URL:\n${translationUrl}`);
    const transResponse = await fetch(translationUrl, { cf: { cacheTtl: 86400 } });
    if (!transResponse.ok) throw new Error(`無法載入寶可夢資料庫 (HTTP ${transResponse.status})`);
    const allPokemonData = await transResponse.json();
    
    // 2. 進行模糊搜尋，找出所有符合條件的寶可夢
    const isChinese = /[\u4e00-\u9fa5]/.test(query);
    const lowerCaseQuery = query.toLowerCase();
    const matches = allPokemonData.filter(p => 
      isChinese 
        ? p.speciesName.includes(query)
        : p.speciesId.toLowerCase().includes(lowerCaseQuery)
    );

    if (matches.length === 0) {
      return await sendMessage(chatId, `很抱歉，找不到任何與 "${query}" 相關的寶可夢。`);
    }

    // 建立一個從英文 id 快速查找中文名的 map，和一個包含所有匹配 id 的 Set
    const matchingIds = new Set(matches.map(p => p.speciesId.toLowerCase()));
    const idToNameMap = new Map(matches.map(p => [p.speciesId.toLowerCase(), p.speciesName]));

    // 3. 一次性獲取所有聯盟的排名資料
    const leagues = [
      { name: "超級聯盟", cp: "1500", path: "data/rankings_1500.json" },
      { name: "高級聯盟", cp: "2500", path: "data/rankings_2500.json" },
      { name: "大師聯盟", cp: "10000", path: "data/rankings_10000.json" },
    ];
    const fetchPromises = leagues.map(league => 
      fetch(`https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${league.path}`, { cf: { cacheTtl: 86400 } })
        .then(res => res.ok ? res.json() : null)
    );
    const allLeagueRanks = await Promise.all(fetchPromises);

    // 4. 逐一聯盟處理，並彙總結果
    let replyMessage = `🏆 與 *"${query}"* 相關的寶可夢排名結果 🏆\n`;
    let foundAnyResults = false;

    allLeagueRanks.forEach((rankings, index) => {
      const league = leagues[index];
      if (!rankings) return;

      const resultsInThisLeague = [];
      rankings.forEach((pokemon, rankIndex) => {
        if (matchingIds.has(pokemon.speciesId.toLowerCase())) {
          resultsInThisLeague.push({
            rank: rankIndex + 1,
            speciesName: idToNameMap.get(pokemon.speciesId.toLowerCase()) || pokemon.speciesName,
            score: pokemon.score,
          });
        }
      });
      
      if (resultsInThisLeague.length > 0) {
        foundAnyResults = true;
        replyMessage += `\n====================\n`;
        replyMessage += `*${league.name} (${league.cp}):*\n`;
        resultsInThisLeague.forEach(p => {
          replyMessage += `${p.speciesName} #${p.rank} (${p.score.toFixed(2)})\n`;
        });
      }
    });

    if (!foundAnyResults) {
      replyMessage = `很抱歉，在所有聯盟中都找不到與 "${query}" 相關的排名資料。`;
    }

    return await sendMessage(chatId, replyMessage.trim(), 'Markdown');

  } catch (e) {
    console.error("搜尋時出錯:", e);
    return await sendMessage(chatId, `處理搜尋時發生錯誤: ${e.message}`);
  }
}

/**
 * 處理 /ranking 指令 (舊功能)
 */
async function handleRankingCommand(chatId) {
  const filePath = "data/rankings_1500.json";
  const fileUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${filePath}`;
  await sendMessage(chatId, '正在從 GitHub 獲取超級聯盟排名資料，請稍候...');
  try {
    const response = await fetch(fileUrl, { cf: { cacheTtl: 86400, cacheEverything: true } });
    if (!response.ok) throw new Error(`無法獲取檔案，狀態碼: ${response.status}`);
    const rankings = await response.json();
    const top3 = rankings.slice(0, 3).map((p, index) => `${index + 1}. ${p.speciesName} (分數: ${p.score.toFixed(2)})`).join('\n');
    const replyMessage = `🏆 超級聯盟排名前三名 🏆\n====================\n${top3}`;
    return await sendMessage(chatId, replyMessage);
  } catch (error) {
    console.error("獲取排名資料時出錯:", error);
    return await sendMessage(chatId, '抱歉，獲取排名資料時發生錯誤。');
  }
}

/**
 * 傳送訊息的輔助函式，支援 Markdown
 */
async function sendMessage(chatId, text, parseMode = null) {
  const params = { chat_id: chatId, text };
  if (parseMode) {
    params.parse_mode = parseMode;
  }
  return (await fetch(apiUrl('sendMessage', params))).json();
}

/**
 * 註冊 Webhook
 */
async function registerWebhook(event, requestUrl, suffix, secret) {
  const webhookUrl = `${requestUrl.protocol}//${requestUrl.hostname}${suffix}`;
  const r = await (await fetch(apiUrl('setWebhook', { url: webhookUrl, secret_token: secret }))).json();
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2));
}

/**
 * 移除 Webhook
 */
async function unRegisterWebhook(event) {
  const r = await (await fetch(apiUrl('setWebhook', { url: '' }))).json();
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2));
}

/**
 * 組合 Telegram API 的網址
 */
function apiUrl(methodName, params = null) {
  let query = '';
  if (params) {
    query = '?' + new URLSearchParams(params).toString();
  }
  return `https://api.telegram.org/bot${TOKEN}/${methodName}${query}`;
}
