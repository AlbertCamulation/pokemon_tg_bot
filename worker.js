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

const leagues = [
  { command: "little_league_top", name: "小小盃", cp: "500", path: "data/rankings_500.json" },
  { command: "great_league_top", name: "超級聯盟", cp: "1500", path: "data/rankings_1500.json" },
  { command: "ultra_league_top", name: "高級聯盟", cp: "2500", path: "data/rankings_2500.json" },
  { command: "master_league_top", name: "大師聯盟", cp: "10000", path: "data/rankings_10000.json" },
  { command: "attackers_top", name: "最佳攻擊", cp: "10000", path: "data/rankings_attackers_tier.json" },
  { command: "defenders_top", name: "最佳防禦", cp: "10000", path: "data/rankings_defenders_tier.json" },
  { command: "summer_cup_top", name: "夏日盃2500", cp: "2500", path: "data/rankings_2500_summer.json" }
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
async function handleLeagueCommand(chatId, command, limit = 25) {
  const leagueInfo = leagues.find(l => l.command === command);
  if (!leagueInfo) {
    return sendMessage(chatId, '未知的命令，請檢查指令。');
  }

  await sendMessage(chatId, `正在查詢 *${leagueInfo.name}* 的前 ${limit} 名寶可夢，請稍候...`, 'Markdown');

  try {
    const cacheBuster = `v=${Math.random().toString(36).substring(7)}`;
    const dataUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${leagueInfo.path}?${cacheBuster}`;
    const response = await fetch(dataUrl);
    if (!response.ok) {
      throw new Error(`無法載入 ${leagueInfo.name} 排名資料 (HTTP ${response.status})`);
    }
    const rankings = await response.json();

    const topRankings = rankings.slice(0, limit);

    let replyMessage = `🏆 *${leagueInfo.name}* (前 ${limit} 名) 🏆\n\n`;

    topRankings.forEach(pokemon => {
      let rankDisplay = '';
      let typesDisplay = '';
      let cpDisplay = '';
      
      if (pokemon.rank) { // PvPoke 結構
        rankDisplay = `#${pokemon.rank}`;
      } else { // PogoHub 結構
        rankDisplay = pokemon.tier ? `(${pokemon.tier})` : '';
      }
      
      if (pokemon.types && pokemon.types.length > 0) {
        typesDisplay = `(${pokemon.types.join(', ')})`;
      }

      if (pokemon.cp) {
        cpDisplay = ` CP: ${pokemon.cp}`;
      }
      
      let rating = getPokemonRating(pokemon.rank || pokemon.tier);
      let score = pokemon.score && typeof pokemon.score === 'number' ? `(${pokemon.score.toFixed(2)})` : '';
      
      replyMessage += `${rankDisplay} ${pokemon.speciesName} ${typesDisplay}${cpDisplay} ${score} - ${rating}\n`;
    });

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

    let replyMessage = `🏆 與 *"${query}"* 相關的寶可夢家族排名結果 🏆\n`;
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
            tier: pokemon.tier, // Go Hub tier
            cp: pokemon.cp, // Go Hub cp
          });
        }
      });
      
      if (resultsInThisLeague.length > 0) {
        foundAnyResults = true;
        replyMessage += `\n*${league.name} (${league.cp}):*\n`;
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

          replyMessage += `${rankDisplay} ${p.speciesName} ${typesDisplay}${cp} ${score} - ${rating}\n`;
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
      "B+": "🥈銀",
      "B": "🥉銅",
      "C": "🥉銅",
      "D": "垃圾",
      "F": "垃圾"
    };
    return ratingMap[rank] || "垃圾";
  }
  return "N/A";
}


// --- 新增的命令處理函式，用於調用 handleLeagueCommand ---
async function handleGreatLeagueTop(message) {
  await handleLeagueCommand(message.chat.id, "great_league_top");
}

async function handleUltraLeagueTop(message) {
  await handleLeagueCommand(message.chat.id, "ultra_league_top");
}

async function handleMasterLeagueTop(message) {
  await handleLeagueCommand(message.chat.id, "master_league_top");
}

async function handleAttackersTop(message) {
  await handleLeagueCommand(message.chat.id, "attackers_top");
}

async function handleDefendersTop(message) {
  await handleLeagueCommand(message.chat.id, "defenders_top");
}

async function handleSummerCupTop(message) {
  await handleLeagueCommand(message.chat.id, "summer_cup_top");
}

async function handleLittleLeagueTop(message) {
  await handleLeagueCommand(message.chat.id, "little_league_top");
}


async function onMessage(message) {
  const text = message.text.trim();
  const commandText = text.split(' ')[0];
  // 移除命令中的 @BotName 後綴
  const command = commandText.split('@')[0];

  switch (command) {
    case '/great_league_top':
      return await handleGreatLeagueTop(message);
    case '/ultra_league_top':
      return await handleUltraLeagueTop(message);
    case '/master_league_top':
      return await handleMasterLeagueTop(message);
    case '/attackers_top':
      return await handleAttackersTop(message);
    case '/defenders_top':
      return await handleDefendersTop(message);
    case '/summer_cup_top':
      return await handleSummerCupTop(message);
    case '/little_league_top':
      return await handleLittleLeagueTop(message);
    default:
      if (text.startsWith('/')) {
        return sendMessage(message.chat.id, '這是一個未知的指令。請直接輸入寶可夢的中英文名稱來查詢排名。');
      } else {
        return await handlePokemonSearch(message.chat.id, text);
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
      // 處理新命令
      const message = update.message;
      const text = message.text.trim();
      const commandText = text.split(' ')[0];
      const command = commandText.split('@')[0];
      
      switch (command) {
        case '/great_league_top':
          await handleGreatLeagueTop(message);
          break;
        case '/ultra_league_top':
          await handleUltraLeagueTop(message);
          break;
        case '/master_league_top':
          await handleMasterLeagueTop(message);
          break;
        case '/attackers_top':
          await handleAttackersTop(message);
          break;
        case '/defenders_top':
          await handleDefendersTop(message);
          break;
        case '/summer_cup_top':
          await handleSummerCupTop(message);
          break;
        case '/little_league_top':
          await handleLittleLeagueTop(message);
          break;
        default:
          await onMessage(message);
      }
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
