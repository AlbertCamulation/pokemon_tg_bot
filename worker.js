/**
 * 結合了 Telegram Bot 功能、從 GitHub 讀取資料、並包含 IP 白名單限制的 Worker 腳本
 */

// --- 請修改以下設定 ---
const GITHUB_USERNAME = "AlbertCamulation";      // 您的 GitHub 使用者名稱
const REPO_NAME = "pokemon_tg_bot";           // 您存放 /data 資料夾的專案名稱
const BRANCH_NAME = "main";                   // 您的分支名稱

// 【安全設定】: IP 白名單列表
// 只有列表中的 IP 位址才能觸發這個 Worker 的所有功能
const ALLOWED_IPS = [
  "223.140.33.20",
  "104.30.161.187",
];
// --------------------

// --- Telegram Bot 相關設定 (從環境變數讀取) ---
const TOKEN = ENV_BOT_TOKEN;
const WEBHOOK = '/endpoint';
const SECRET = ENV_BOT_SECRET;

/**
 * 主監聽事件
 */
addEventListener('fetch', event => {
  // --- IP 限制邏輯 ---
  // 取得訪客的真實 IP
  const clientIP = event.request.headers.get('CF-Connecting-IP');
  
  // 如果訪客的 IP 不在白名單中，立即阻擋
  if (!ALLOWED_IPS.includes(clientIP)) {
    // 回傳 403 Forbidden 錯誤
    event.respondWith(
      new Response(`Access from your IP (${clientIP}) is denied.`, {
        status: 403,
        statusText: 'Forbidden'
      })
    );
    return; // 終止後續所有操作
  }
  
  // --- URL 路由邏輯 ---
  // 如果 IP 驗證通過，才繼續執行原本的功能
  const url = new URL(event.request.url);
  if (url.pathname === WEBHOOK) {
    event.respondWith(handleWebhook(event));
  } else if (url.pathname === '/registerWebhook') {
    event.respondWith(registerWebhook(event, url, WEBHOOK, SECRET));
  } else if (url.pathname === '/unRegisterWebhook') {
    event.respondWith(unRegisterWebhook(event));
  } else {
    event.respondWith(new Response('Access Allowed, but no handler for this path.'));
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
 * 處理收到的訊息更新
 */
async function onUpdate(update) {
  if ('message' in update && 'text' in update.message) {
    await onMessage(update.message);
  }
}

/**
 * 根據訊息內容進行路由，決定要執行哪個功能
 */
async function onMessage(message) {
  const text = message.text;
  
  if (text.startsWith('/ranking')) {
    return await handleRankingCommand(message.chat.id);
  } else {
    return sendPlainText(message.chat.id, '你說了：\n' + text);
  }
}

/**
 * 處理 /ranking 指令的函式
 */
async function handleRankingCommand(chatId) {
  const filePath = "data/rankings_1500.json";
  const fileUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${filePath}`;
  
  await sendPlainText(chatId, '正在從 GitHub 獲取超級聯盟排名資料，請稍候...');

  try {
    const response = await fetch(fileUrl, {
      cf: {
        cacheTtl: 86400, // 快取 1 天
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


// --- 以下是 Telegram API 的輔助函式 ---

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
