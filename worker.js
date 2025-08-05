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
  
  if (text.startsWith('/')) {
    return sendMessage(message.chat.id, '這是一個未知的指令。請直接輸入寶可夢的中英文名稱來查詢排名。');
  } else if (text) {
    return await handlePokemonSearch(message.chat.id, text);
  }
}
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

    let replyMessage = `🏆 與 *"${query}"* 相關的寶可夢家族排名結果 🏆\n`;
    let foundAnyResults = false;
    const displayLimit = 5; 

    finalMatches.slice(0, displayLimit).forEach(pokemon => {
      replyMessage += `\n====================\n`;
      replyMessage += `*${pokemon.speciesName}*\n`;

      allLeagueRanks.forEach((rankings, index) => {
        const league = leagues[index];
        replyMessage += `\n*${league.name} (${league.cp})*:\n`;
        if (!rankings) {
          replyMessage += `  - 讀取資料失敗\n`;
          return;
        }
        
        const pokemonIndex = rankings.findIndex(p => p.speciesId.toLowerCase() === pokemon.speciesId.toLowerCase());
        if (pokemonIndex !== -1) {
          foundAnyResults = true;
          const pokemonData = rankings[pokemonIndex];
          const rank = pokemonIndex + 1;
          const rating = getPokemonRating(rank); // 【新功能】 獲取評價
          replyMessage += `  - 排名: #${rank}\n`;
          replyMessage += `  - 評價: ${rating}\n`;   // 【新功能】 顯示評價
          replyMessage += `  - 分數: ${pokemonData.score.toFixed(2)}\n`;
        } else {
          replyMessage += `  - 未在此聯盟找到排名資料\n`;
        }
      });
    });

    if (finalMatches.length > displayLimit) {
        replyMessage += `\n====================\n...還有 ${finalMatches.length - displayLimit} 筆相關寶可夢未顯示。`;
    }

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
 * 【新功能】: 根據排名給予評價的函式
 */
function getPokemonRating(rank) {
  if (rank <= 20) return "🥇 S+ | Meta 核心";
  if (rank <= 75) return "🥈 A | Meta 相關";
  if (rank <= 200) return "🥉 B | 環境可用";
  if (rank <= 400) return "👍 C | 非主流選擇";
  return "🤔 D | 待開發";
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
