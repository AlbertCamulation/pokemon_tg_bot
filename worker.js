/**
 * 整合了 Telegram Bot 功能、從 GitHub 讀取資料、並從環境變數讀取 User ID 白名單的 Worker 腳本
 */

// --- GitHub 相關設定 ---
const GITHUB_USERNAME = "AlbertCamulation";
const REPO_NAME = "pokemon_tg_bot";
const BRANCH_NAME = "main";
// --------------------

// --- Telegram Bot 相關設定 (從環境變數讀取) ---
const TOKEN = ENV_BOT_TOKEN;
const WEBHOOK = '/endpoint';
const SECRET = ENV_BOT_SECRET;

/**
 * 主監聽事件
 */
addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname === WEBHOOK) {
    // 【修改點 1】: 將 env 物件傳遞給下一個函式
    event.respondWith(handleWebhook(event, env));
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
async function handleWebhook(event, env) { // 【修改點 2】: 接收 env 物件
  if (event.request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== SECRET) {
    return new Response('Unauthorized', { status: 403 });
  }
  const update = await event.request.json();
  // 【修改點 3】: 將 env 物件繼續傳遞
  event.waitUntil(onUpdate(update, env));
  return new Response('Ok');
}

/**
 * 處理收到的訊息更新，並進行 User ID 驗證
 */
async function onUpdate(update, env) { // 【修改點 4】: 接收 env 物件
  // --- 【核心修改】: 從環境變數讀取並解析 User ID 白名單 ---
  let allowedUserIds = []; // 預設為空陣列，即不允許任何人
  try {
    // env.ALLOWED_USER_IDS_JSON 就是我們在儀表板上設定的變數
    if (env.ALLOWED_USER_IDS_JSON) {
      // 將 JSON 字串解析成真正的 JavaScript 陣列
      allowedUserIds = JSON.parse(env.ALLOWED_USER_IDS_JSON);
    }
  } catch (e) {
    console.error("解析 ALLOWED_USER_IDS_JSON 時出錯:", e);
    // 如果解析失敗，allowedUserIds 依然是空陣列，確保安全
  }
  
  if ('message' in update && update.message.from) {
    const userId = update.message.from.id;

    // 使用從環境變數讀取來的列表進行檢查
    if (!allowedUserIds.includes(userId)) {
      console.log(`Blocked access for unauthorized user ID: ${userId}`);
      return; // 終止執行
    }
    
    // ID 驗證通過，才繼續處理訊息內容
    if ('text' in update.message) {
      await onMessage(update.message, env); // 將 env 傳遞下去，以備未來之需
    }
  }
}

/**
 * 根據訊息內容進行路由
 */
async function onMessage(message, env) { // 接收 env
  const text = message.text;
  
  if (text.startsWith('/ranking')) {
    return await handleRankingCommand(message.chat.id, env); // 將 env 傳遞下去
  } else {
    return sendPlainText(message.chat.id, '你說了：\n' + text);
  }
}

/**
 * 處理 /ranking 指令
 */
async function handleRankingCommand(chatId, env) { // 接收 env
  const filePath = "data/rankings_1500.json";
  const fileUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${filePath}`;
  
  await sendPlainText(chatId, '正在從 GitHub 獲取超級聯盟排名資料，請稍候...');
  // ... (後續程式碼不變) ...
  // ...
}

// --- 以下是 Telegram API 的輔助函式 (無需變動) ---
// ... (所有 API 輔助函式保持原樣) ...
async function sendPlainText(chatId, text) { /* ... */ }
async function registerWebhook(event, requestUrl, suffix, secret) { /* ... */ }
async function unRegisterWebhook(event) { /* ... */ }
function apiUrl(methodName, params = null) { /* ... */ }

// --- 為了讓程式碼完整，將輔助函式貼在下方 ---
async function handleRankingCommand(chatId, env) {
  const filePath = "data/rankings_1500.json";
  const fileUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${filePath}`;
  
  await sendPlainText(chatId, '正在從 GitHub 獲取超級聯盟排名資料，請稍候...');

  try {
    const response = await fetch(fileUrl, {
      cf: {
        cacheTtl: 86400,
        cacheEverything: true,
      },
    });

    if (!response.ok) {
      throw new Error(`無法獲取檔案，狀態碼: ${response.status}`);
    }
    const rankings = await response.json();
    
    const top3 = rankings.slice(0, 3).map((p, index) => 
      `${index + 1}. ${p.speciesName} (分數: ${p.score.toFixed(2)})`
    ).join('\n');
    
    const replyMessage = `🏆 超級聯盟排名前三名 🏆\n====================\n${top3}`;
    
    return await sendPlainText(chatId, replyMessage);

  } catch (error) {
    console.error("獲取排名資料時出錯:", error);
    return await sendPlainText(chatId, '抱歉，獲取排名資料時發生錯誤。');
  }
}

async function sendPlainText(chatId, text) {
  return (await fetch(apiUrl('sendMessage', { chat_id: chatId, text }))).json();
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
