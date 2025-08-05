/**
 * 整合了 Telegram Bot、從 GitHub 讀取資料、User ID 白名單、
 * 以及寶可夢名稱查詢功能的 Worker 腳本
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
 * 【核心修改】: 根據訊息內容進行路由
 */
async function onMessage(message) {
  const text = message.text.trim();
  
  if (text.startsWith('/ranking')) {
    // 保留舊的 /ranking 指令功能
    return await handleRankingCommand(message.chat.id);
  } else if (text.startsWith('/')) {
    // 對於其他未知的指令
    return sendMessage(message.chat.id, '這是一個未知的指令。請直接輸入寶可夢名稱來查詢排名。');
  } else if (text) {
    // 如果不是指令，就當作寶可夢名稱進行搜尋
    return await handlePokemonSearch(message.chat.id, text);
  }
}

/**
 * 【新功能】: 處理寶可夢名稱搜尋的函式
 */
async function handlePokemonSearch(chatId, pokemonName) {
  const leagues = [
    { name: "超級聯盟", cp: "1500", path: "data/rankings_1500.json" },
    { name: "高級聯盟", cp: "2500", path: "data/rankings_2500.json" },
    { name: "大師聯盟", cp: "10000", path: "data/rankings_10000.json" },
  ];

  await sendMessage(chatId, `🔍 正在查詢 ${pokemonName} 的排名資料，請稍候...`);

  // 並行發起所有 fetch 請求
  const fetchPromises = leagues.map(league => {
    const fileUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${league.path}`;
    return fetch(fileUrl, { cf: { cacheTtl: 86400, cacheEverything: true } })
      .then(response => response.ok ? response.json() : Promise.reject(response.status))
      .catch(error => ({ error: true, status: error }));
  });

  try {
    const results = await Promise.all(fetchPromises);
    
    // 將使用者輸入的名稱首字母大寫，用於顯示
    const displayName = pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1).toLowerCase();
    let replyMessage = `🏆 *${displayName}* 的各聯盟排名 🏆\n====================\n`;
    let foundAny = false;

    results.forEach((rankings, index) => {
      const league = leagues[index];
      replyMessage += `\n*${league.name} (${league.cp})*:\n`;

      if (rankings.error) {
        replyMessage += `  - 讀取資料失敗 (錯誤碼: ${rankings.status})\n`;
        return;
      }
      
      const searchTerm = pokemonName.toLowerCase();
      const pokemonIndex = rankings.findIndex(p => p.speciesName.toLowerCase() === searchTerm);

      if (pokemonIndex !== -1) {
        foundAny = true;
        const pokemonData = rankings[pokemonIndex];
        replyMessage += `  - 排名: #${pokemonIndex + 1}\n  - 分數: ${pokemonData.score.toFixed(2)}\n`;
      } else {
        replyMessage += `  - 未在此聯盟找到排名資料\n`;
      }
    });

    if (!foundAny) {
      replyMessage = `很抱歉，在所有聯盟中都找不到 "${displayName}" 的排名資料。\n請檢查寶可夢名稱拼寫是否正確。`;
    }

    return await sendMessage(chatId, replyMessage, 'Markdown');

  } catch (error) {
    console.error("搜尋排名資料時出錯:", error);
    return await sendMessage(chatId, '抱歉，搜尋時發生了未預期的錯誤。');
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
    const top3 = rankings.slice(0, 3).map((p, index) => 
      `${index + 1}. ${p.speciesName} (分數: ${p.score.toFixed(2)})`
    ).join('\n');
    
    const replyMessage = `🏆 超級聯盟排名前三名 🏆\n====================\n${top3}`;
    return await sendMessage(chatId, replyMessage);

  } catch (error) {
    console.error("獲取排名資料時出錯:", error);
    return await sendMessage(chatId, '抱歉，獲取排名資料時發生錯誤。');
  }
}

// --- 以下是 Telegram API 的輔助函式 ---

/**
 * 【核心修改】: 傳送訊息的輔助函式，支援 Markdown
 */
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
