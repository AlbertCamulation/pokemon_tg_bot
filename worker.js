/**
 * 整合了 Telegram Bot、從 GitHub 讀取資料、User ID 白名單、
 * 以及中英文寶可夢模糊搜尋功能的 Worker 腳本
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

// ... (addEventListener, handleWebhook, onUpdate 函式與之前版本相同，無需修改) ...
addEventListener('fetch', event => { /* ... */ });
async function handleWebhook(event) { /* ... */ }
async function onUpdate(update) { /* ... */ }

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
    // 將所有非指令的文字都交給搜尋處理器
    return await handlePokemonSearch(message.chat.id, text);
  }
}

/**
 * 【核心修改】: 處理寶可夢模糊搜尋的主函式
 */
async function handlePokemonSearch(chatId, query) {
  await sendMessage(chatId, `正在查詢與 "${query}" 相關的寶可夢...`);

  try {
    const translationUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/data/chinese_translation.json`;
    const transResponse = await fetch(translationUrl, { cf: { cacheTtl: 86400 } });
    if (!transResponse.ok) throw new Error('無法載入寶可夢資料庫');
    
    const allPokemonData = await transResponse.json();
    
    // 根據輸入的 query 進行模糊搜尋
    const isChinese = /[\u4e00-\u9fa5]/.test(query);
    const lowerCaseQuery = query.toLowerCase();

    const matches = allPokemonData.filter(p => 
      isChinese 
        ? p.speciesName.includes(query) // 中文用 "包含"
        : p.speciesId.toLowerCase().includes(lowerCaseQuery) // 英文也用 "包含"
    );

    // 根據找到的匹配數量決定下一步操作
    if (matches.length === 0) {
      // 找不到任何匹配
      return await sendMessage(chatId, `很抱歉，找不到任何與 "${query}" 相關的寶可夢。`);
    } else if (matches.length === 1) {
      // 精準匹配到一個，直接顯示排名
      const pokemon = matches[0];
      return await fetchAndFormatRankings(chatId, pokemon.speciesId, pokemon.speciesName);
    } else {
      // 找到多個匹配，回傳列表讓使用者選擇
      let responseText = `找到了 ${matches.length} 筆相關的寶可夢，請輸入完整的名稱進行精準查詢：\n\n`;
      // 只顯示前 20 筆以避免訊息過長
      responseText += matches.slice(0, 20).map(p => `- ${p.speciesName} (${p.speciesId})`).join('\n');
      if (matches.length > 20) {
        responseText += `\n...還有 ${matches.length - 20} 筆結果未顯示。`;
      }
      return await sendMessage(chatId, responseText);
    }
  } catch (e) {
    console.error("搜尋時出錯:", e);
    return await sendMessage(chatId, `處理搜尋時發生錯誤: ${e.message}`);
  }
}

/**
 * 【新函式】: 專門用來獲取並格式化單一寶可夢排名的函式
 */
async function fetchAndFormatRankings(chatId, speciesId, displayName) {
  const leagues = [
    { name: "超級聯盟", cp: "1500", path: "data/rankings_1500.json" },
    { name: "高級聯盟", cp: "2500", path: "data/rankings_2500.json" },
    { name: "大師聯盟", cp: "10000", path: "data/rankings_10000.json" },
  ];

  const fetchPromises = leagues.map(league => {
    const fileUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${league.path}`;
    return fetch(fileUrl, { cf: { cacheTtl: 86400 } })
      .then(response => response.ok ? response.json() : Promise.reject(response.status))
      .catch(error => ({ error: true, status: error }));
  });

  try {
    const results = await Promise.all(fetchPromises);
    
    let replyMessage = `🏆 *${displayName}* 的各聯盟排名 🏆\n====================\n`;

    results.forEach((rankings, index) => {
      const league = leagues[index];
      replyMessage += `\n*${league.name} (${league.cp})*:\n`;
      if (rankings.error) {
        replyMessage += `  - 讀取資料失敗 (錯誤碼: ${rankings.status})\n`;
        return;
      }
      
      const pokemonIndex = rankings.findIndex(p => p.speciesId.toLowerCase() === speciesId.toLowerCase());
      if (pokemonIndex !== -1) {
        const pokemonData = rankings[pokemonIndex];
        replyMessage += `  - 排名: #${pokemonIndex + 1}\n  - 分數: ${pokemonData.score.toFixed(2)}\n`;
      } else {
        replyMessage += `  - 未在此聯盟找到排名資料\n`;
      }
    });
    return await sendMessage(chatId, replyMessage, 'Markdown');
  } catch (error) {
    console.error("獲取排名資料時出錯:", error);
    return await sendMessage(chatId, '抱歉，獲取詳細排名時發生了錯誤。');
  }
}


// --- 為了讓程式碼完整，將其他無需修改的函式貼在下方 ---

async function handleRankingCommand(chatId) { /* ... */ }
async function sendMessage(chatId, text, parseMode = null) { /* ... */ }
async function registerWebhook(event, requestUrl, suffix, secret) { /* ... */ }
async function unRegisterWebhook(event) { /* ... */ }
function apiUrl(methodName, params = null) { /* ... */ }

// --- 完整的輔助函式 ---
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
