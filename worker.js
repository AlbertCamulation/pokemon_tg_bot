/**
 * 結合了 Telegram Bot 功能與從 GitHub 讀取資料功能的 Worker 腳本
 */

// --- 請修改以下 GitHub 相關設定 ---
const GITHUB_USERNAME = "AlbertCamulation";      // 您的 GitHub 使用者名稱
const REPO_NAME = "pokemon_tg_bot";           // 您存放 /data 資料夾的專案名稱
const BRANCH_NAME = "main";                   // 您的分支名稱
// ------------------------------------

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
    event.respondWith(handleWebhook(event));
  } else if (url.pathname === '/registerWebhook') {
    event.respondWith(registerWebhook(event, url, WEBHOOK, SECRET));
  } else if (url.pathname === '/unRegisterWebhook') {
    event.respondWith(unRegisterWebhook(event));
  } else {
    event.respondWith(new Response('Ok')); // 對於其他請求，回覆 Ok 即可
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
  
  // 指令路由器
  if (text.startsWith('/ranking')) {
    // 如果是 /ranking 指令，就去 GitHub 抓資料
    return await handleRankingCommand(message.chat.id);
  } else {
    // 否則，執行原本的鸚鵡功能
    return sendPlainText(message.chat.id, '你說了：\n' + text);
  }
}

/**
 * 處理 /ranking 指令的函式
 */
async function handleRankingCommand(chatId) {
  const filePath = "data/rankings_1500.json"; // 指定要讀取的檔案
  const fileUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${filePath}`;
  
  await sendPlainText(chatId, '正在從 GitHub 獲取超級聯盟排名資料，請稍候...');

  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`無法獲取檔案，狀態碼: ${response.status}`);
    }
    const rankings = await response.json();
    
    // 從 JSON 資料中提取前三名並格式化
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


// --- 以下是 Telegram API 的輔助函式 (與之前相同) ---

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
