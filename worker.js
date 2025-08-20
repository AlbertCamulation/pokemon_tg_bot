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
const ALLOWED_USER_IDS_JSON = ENV_ALLOWED_USER_IDS_JSON;
const TRASH_LIST_KEY = 'trash_pokemon_list'; // KV 儲存的 key

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

        topRankings.forEach(pokemon => {
            let rankDisplay = '';
            let typesDisplay = '';
            let cpDisplay = '';
            
            const speciesName = idToNameMap.get(pokemon.speciesId.toLowerCase()) || pokemon.speciesName;

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
            
            replyMessage += `${rankDisplay} ${speciesName} ${typesDisplay}${cpDisplay} ${score} - ${rating}\n`;
        });

        return sendMessage(chatId, replyMessage.trim(), 'Markdown');
    } catch (e) {
        console.error(`查詢 ${leagueInfo.name} 時出錯:`, e);
        console.error(`URL: ${dataUrl}`);
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
                        speciesId: pokemon.speciesId,
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
            "S": "🥇白金S",
            "A+": "🥇金A+",
            "A": "🥈銀A",
            "B+": "垃圾B+",
            "B": "垃圾B",
            "C": "垃圾C",
            "D": "垃圾D",
            "F": "垃圾F"
        };
        return ratingMap[rank] || "N/A";
    }
    return "N/A";
}

/**
 * 處理 /trash 命令
 */
async function handleTrashCommand(chatId) {
    const trashList = await getTrashList();
    if (trashList.length === 0) {
        return await sendMessage(chatId, "您的垃圾清單目前是空的。");
    }

    // 格式化為逗號分隔的字串
    const pokemonNames = trashList.map(p => p.speciesName).join(', ');

    let replyMessage = `<code>垃圾清單</code>\n<code>${pokemonNames}</code>`;

    return await sendMessage(chatId, replyMessage, 'HTML');
}

/**
 * 將寶可夢加入垃圾清單
 */
async function addToTrashList(pokemonName) {
    if (typeof POKEMON_KV === 'undefined') {
        console.error("錯誤：POKEMON_KV 命名空間未綁定。");
        return;
    }
    const list = await getTrashList();
    // 確保清單中沒有重複的寶可夢
    if (!list.includes(pokemonName)) {
        list.push(pokemonName);
    }
    await POKEMON_KV.put(TRASH_LIST_KEY, JSON.stringify(list));
}

// --- 新增的命令處理函式，用於調用 handleLeagueCommand ---
async function handleLittleLeagueTop(message) {
    await handleLeagueCommand(message.chat.id, "little_league_top");
}

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

/**
 * 處理 incoming Message
 */
async function onMessage(message) {
    if (!message.text) {
        return;
    }

    const text = message.text.trim();
    const messageParts = text.split(' ');
    const commandText = messageParts[0];
    const command = commandText.split('@')[0];
    const pokemonQuery = messageParts.slice(1).join(' ');
    const chatId = message.chat.id;

    switch (command) {
        case '/start':
        case '/help':
        case '/list':
            return sendHelpMessage(chatId);
        case '/trash':
            if (pokemonQuery) {
                // 新增寶可夢到垃圾清單
                await addToTrashList(pokemonQuery);
                return sendMessage(chatId, `已將 "${pokemonQuery}" 加入垃圾清單。`);
            } else {
                // 顯示垃圾清單
                return handleTrashCommand(chatId);
            }
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
                return sendMessage(chatId, '這是一個未知的指令。請直接輸入寶可夢的中英文名稱來查詢排名。');
            } else {
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
        if (allowedUserIds.length > 0 && !allowedUserIds.includes(userId)) {
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
async function sendInlineButton (chatId, text, button) {
    return sendInlineButtons(chatId, text, [[button]]);
}
async function sendInlineButtons (chatId, text, buttons) {
    return (await fetch(apiUrl('sendMessage', {
        chat_id: chatId,
        reply_markup: JSON.stringify({
            inline_keyboard: buttons
        }),
        text,
        parse_mode: 'Markdown'
    }))).json();
}
async function answerCallbackQuery (callbackQueryId, text = null) {
    const data = {
        callback_query_id: callbackQueryId
    };
    if (text) {
        data.text = text;
    }
    return (await fetch(apiUrl('answerCallbackQuery', data))).json();
}
function apiUrl(methodName, params = null) {
    let query = '';
    if (params) {
        query = '?' + new URLSearchParams(params).toString();
    }
    return `https://api.telegram.org/bot${TOKEN}/${methodName}${query}`;
}
function sendHelpMessage(chatId) {
    const leagueCommands = leagues.map(l => `\`/${l.command}\` - 查詢 ${l.name} 前25名`).join('\n');
    const helpMessage = `*寶可夢排名查詢 Bot*\n\n` +
        `*功能說明:*\n` +
        `\`直接輸入寶可夢名稱\` (中/英文) 來查詢其在各聯盟中的排名。\n` +
        `*例如:* \`索財靈\` 或 \`Gimmighoul\`\n\n` +
        `*垃圾清單指令:*\n` +
        `\` /trash \` - 顯示垃圾清單\n` +
        `\` /trash [寶可夢名稱]\` - 新增寶可夢到垃圾清單\n\n` +
        `*聯盟排名指令:*\n` +
        `${leagueCommands}\n\n` +
        `\` /list \` - 顯示所有聯盟排名查詢指令\n` +
        `\` /help \` - 顯示此說明`;
    return sendMessage(chatId, helpMessage, 'Markdown');
}
async function handleWebhook(event) {
    if (event.request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== SECRET) {
        return new Response('Unauthorized', { status: 403 });
    }
    const update = await event.request.json();
    event.waitUntil(onUpdate(update));
    return new Response('Ok');
}
