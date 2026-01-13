// =========================================================
//  1. 設定與資料定義 (Constants & Data)
// =========================================================
const GITHUB_USERNAME = "AlbertCamulation";
const REPO_NAME = "pokemon_tg_bot";
const BRANCH_NAME = "main";
const WEBHOOK_PATH = "/endpoint";
const TRASH_LIST_PREFIX = "trash_pokemon_";
const ALLOWED_UID_KEY = "allowed_user_ids";
const BANNED_UID_KEY = "banned_user_ids";
const LIMIT_LEAGUES_SHOW = 50;
// 原本是 3600 (1小時)，改成 86400 (24小時)
const CACHE_TTL = 86400;
const ADMIN_UID = 123456789;
const NAME_CLEANER_REGEX = /\s*(一擊流|靈獸|冰凍|水流|普通|完全體|闇黑|拂曉之翼|黃昏之鬃|特大尺寸|普通尺寸|大尺寸|小尺寸|別種|裝甲|滿腹花紋|洗翠|Mega|X|Y|原始|起源|劍之王|盾之王|焰白|暗影|伽勒爾|極巨化|超極巨化|盾牌形態|阿羅拉|歌聲|・|覺悟|的樣子)/g;
const QUERY_CLEANER_REGEX = /[\s\d\.\u2070-\u209F\u00B0-\u00BE\u2460-\u24FF\u3251-\u32BF]+/g;

const leagues = [
  { command: "little_league_top", name: "小小盃 (500)", cp: "500", path: "data/rankings_500.json" },
  { command: "great_league_top", name: "超級聯盟 (1500)", cp: "1500", path: "data/rankings_1500.json" },
  { command: "great_league_top_scroll", name: "假日盃 (1500)", cp: "1500", path: "data/rankings_1500_holiday.json" },
  { command: "great_league_top_sunshine", name: "陽光盃 (1500)", cp: "1500", path: "data/rankings_1500_sunshine.json" },
  { command: "great_league_top_holiday", name: "掛軸盃 (1500)", cp: "1500", path: "data/rankings_1500_scroll.json" },
  { command: "great_league_top_remix", name: "超級 Remix (1500)", cp: "1500", path: "data/rankings_1500_remix.json" },
  { command: "great_league_top_championship2025", name: "冠軍賽 2025 (1500)", cp: "1500", path: "data/rankings_1500_LAIC_2025_Championship_Series_Cup.json" },
  { command: "great_league_top_halloween", name: "萬聖節盃 (1500)", cp: "1500", path: "data/rankings_1500_halloween.json" },
  { command: "great_league_top_retro", name: "復古盃 (1500)", cp: "1500", path: "data/rankings_1500_retro.json" },
  { command: "great_league_top_summer", name: "夏日盃 (1500)", cp: "1500", path: "data/rankings_1500_summer.json" },
  { command: "great_league_top_willpower", name: "意志盃 (1500)", cp: "1500", path: "data/rankings_willpower_1500.json" },
  { command: "great_league_top_jungle", name: "叢林盃 (1500)", cp: "1500", path: "data/rankings_1500_jungle.json" },
  { command: "ultra_league_top", name: "高級聯盟 (2500)", cp: "2500", path: "data/rankings_2500.json" },
  { command: "ultra_league_top_holiday", name: "假日盃 (2500)", cp: "2500", path: "data/rankings_2500_holiday.json" },
  { command: "ultra_league_top_summer", name: "夏日盃 (2500)", cp: "2500", path: "data/rankings_2500_summer.json" },
  { command: "master_league_top", name: "大師聯盟 (無上限)", cp: "10000", path: "data/rankings_10000.json" },
  { command: "master_league_top_permier", name: "大師紀念賽 (無上限)", cp: "10000", path: "data/rankings_10000_premier.json" },
  { command: "master_league_top_meta", name: "大師 Meta (無上限)", cp: "10000", path: "data/rankings_meta_master_10000.json" },
  { command: "attackers_top", name: "最佳攻擊手", cp: "Any", path: "data/rankings_attackers_tier.json" },
  { command: "defenders_top", name: "最佳防守者", cp: "Any", path: "data/rankings_defenders_tier.json" }
];

const typeChart = {
  normal: { rock: 0.625, ghost: 0.390625, steel: 0.625 },
  fire: { fire: 0.625, water: 0.625, grass: 1.6, ice: 1.6, bug: 1.6, rock: 0.625, dragon: 0.625, steel: 1.6 },
  water: { fire: 1.6, water: 0.625, grass: 0.625, ground: 1.6, rock: 1.6, dragon: 0.625 },
  electric: { water: 1.6, electric: 0.625, grass: 0.625, ground: 0.390625, flying: 1.6, dragon: 0.625 },
  grass: { fire: 0.625, water: 1.6, grass: 0.625, poison: 0.625, ground: 1.6, flying: 0.625, bug: 0.625, rock: 1.6, dragon: 0.625, steel: 0.625 },
  ice: { fire: 0.625, water: 0.625, grass: 1.6, ice: 0.625, ground: 1.6, flying: 1.6, dragon: 1.6, steel: 0.625 },
  fighting: { normal: 1.6, ice: 1.6, poison: 0.625, flying: 0.625, psychic: 0.625, bug: 0.625, rock: 1.6, ghost: 0.390625, dark: 1.6, steel: 1.6, fairy: 0.625 },
  poison: { grass: 1.6, poison: 0.625, ground: 0.625, rock: 0.625, ghost: 0.625, steel: 0.390625, fairy: 1.6 },
  ground: { fire: 1.6, electric: 1.6, grass: 0.625, poison: 1.6, flying: 0.390625, bug: 0.625, rock: 1.6, steel: 1.6 },
  flying: { electric: 0.625, grass: 1.6, fighting: 1.6, bug: 1.6, rock: 0.625, steel: 0.625 },
  psychic: { fighting: 1.6, poison: 1.6, psychic: 0.625, dark: 0.390625, steel: 0.625 },
  bug: { fire: 0.625, grass: 1.6, fighting: 0.625, poison: 0.625, flying: 0.625, psychic: 1.6, ghost: 0.625, dark: 1.6, steel: 0.625, fairy: 0.625 },
  rock: { fire: 1.6, ice: 1.6, fighting: 0.625, ground: 0.625, flying: 1.6, bug: 1.6, steel: 0.625 },
  ghost: { normal: 0.390625, psychic: 1.6, ghost: 1.6, dark: 0.625 },
  dragon: { dragon: 1.6, steel: 0.625, fairy: 0.390625 },
  dark: { fighting: 0.625, psychic: 1.6, ghost: 1.6, dark: 0.625, fairy: 0.625 },
  steel: { fire: 0.625, water: 0.625, electric: 0.625, ice: 1.6, rock: 1.6, steel: 0.625, fairy: 1.6 },
  fairy: { fire: 0.625, fighting: 1.6, poison: 0.625, dragon: 1.6, dark: 1.6, steel: 0.625 }
};

const allTypes = Object.keys(typeChart);
const typeNames = {
  normal: "一般", fire: "火", water: "水", electric: "電", grass: "草",
  ice: "冰", fighting: "格鬥", poison: "毒", ground: "地面", flying: "飛行",
  psychic: "超能", bug: "蟲", rock: "岩石", ghost: "幽靈", dragon: "龍",
  dark: "惡", steel: "鋼", fairy: "妖精"
};

// =========================================================
//  ★ 關鍵優化：全域記憶體快取
// =========================================================
let GLOBAL_TRANS_CACHE = null;
let GLOBAL_MOVES_CACHE = null;
let GLOBAL_EVENTS_CACHE = null;
// ★ 新增：用來存所有聯盟排名的快取，避免重複 Fetch
const GLOBAL_RANKINGS_CACHE = new Map();

// =========================================================
//  2. 基礎工具函數 (Utils & API Wrappers)
// =========================================================
// 1. 通用資料快取 (翻譯、招式、活動)
async function getJsonData(key, filename, env, ctx) {
  // A. 檢查全域變數 (最快，不耗 CPU)
  if (key === 'trans' && GLOBAL_TRANS_CACHE) return GLOBAL_TRANS_CACHE;
  if (key === 'moves' && GLOBAL_MOVES_CACHE) return GLOBAL_MOVES_CACHE;
  if (key === 'events' && GLOBAL_EVENTS_CACHE) return GLOBAL_EVENTS_CACHE;

  // B. 沒有快取，才去 Fetch
  const res = await fetchWithCache(getDataUrl(filename), env, ctx);
  let data = [];
  try {
    data = await res.json();
  } catch (e) {
    console.error(`JSON Parse Error: ${filename}`);
  }

  // C. 寫入全域變數
  if (data) {
    if (key === 'trans') GLOBAL_TRANS_CACHE = data;
    if (key === 'moves') GLOBAL_MOVES_CACHE = data;
    if (key === 'events') GLOBAL_EVENTS_CACHE = data;
  }
  return data;
}

// 2. 聯盟排名快取 (這是救命關鍵)
async function getLeagueRanking(league, env, ctx) {
  // A. 檢查 Map 快取
  if (GLOBAL_RANKINGS_CACHE.has(league.command)) {
    return GLOBAL_RANKINGS_CACHE.get(league.command);
  }

  // B. Fetch 下載
  try {
    const res = await fetchWithCache(getDataUrl(league.path), env, ctx);
    if (!res.ok) return [];
    const data = await res.json();
    
    // C. 存入 Map
    if (data && Array.isArray(data)) {
      GLOBAL_RANKINGS_CACHE.set(league.command, data);
    }
    return data;
  } catch (e) {
    return [];
  }
}


// 修改後的 fetchWithCache (加入重試機制與錯誤處理)
async function fetchWithCache(url, env, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(url, { method: "GET" });

  // 1. 先嘗試從 Cloudflare 快取讀取
  let cachedRes = await cache.match(cacheKey);
  if (cachedRes) return cachedRes;

  // 2. 定義重試邏輯 (最多重試 2 次，共 3 次機會)
  const maxRetries = 2;
  let response = null;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      response = await fetch(url);
      // 如果成功 (200 OK) 就跳出迴圈
      if (response.ok) break; 
    } catch (e) {
      console.error(`Fetch attempt ${i + 1} failed: ${e.message}`);
    }
    // 如果不是最後一次嘗試，稍微等待一下 (50ms) 再重試
    if (i < maxRetries) await new Promise(r => setTimeout(r, 50));
  }

  // 3. 如果重試後還是失敗，回傳空陣列避免程式崩潰
  if (!response || !response.ok) {
    console.error(`Failed to fetch ${url} after retries.`);
    return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" }});
  }

  // 4. 讀取並複製資料
  // 這裡使用 try-catch 防止讀取 body 時發生錯誤
  let bodyText;
  try {
    bodyText = await response.text();
  } catch (e) {
    return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" }});
  }

  if (!bodyText || bodyText.trim().length === 0) {
    return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" }});
  }

  // 5. 設定快取 Header 並存入快取
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", `public, max-age=${CACHE_TTL}`);
  headers.set("Content-Type", "application/json");

  const responseToCache = new Response(bodyText, { status: response.status, headers: headers });
  
  // 使用 waitUntil 確保快取寫入不會被中斷
  if (ctx && ctx.waitUntil) {
    ctx.waitUntil(cache.put(cacheKey, responseToCache.clone()));
  } else {
    // 如果沒有 ctx (極少見)，就非同步寫入
    cache.put(cacheKey, responseToCache.clone()).catch(console.error);
  }

  return new Response(bodyText, { status: response.status, headers: headers });
}

function getDataUrl(filename) {
  return `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${filename}?ver=1003`;
}

function getPokemonRating(rank) {
  if (typeof rank === "number") { 
    if (rank <= 10) return "🥇白金"; 
    if (rank <= 25) return "🥇金"; 
    if (rank <= 50) return "🥈銀"; 
    if (rank <= 100) return "🥉銅"; 
  }
  if (typeof rank === "string") { 
    const map = { "S": "🥇白金", "A+": "🥇金", "A": "🥈銀", "B+": "🥉銅" }; 
    return map[rank] || "垃圾"; 
  }
  return "垃圾";
}

// 修改後的 sendMessage (會回傳結果，讓我們拿到 message_id)
async function sendMessage(chatId, text, options = null, env) {
  if (!text) return;
  const payload = { chat_id: chatId, text: text ,link_preview_options: { is_disabled: true }};
  if (options) {
    if (options.inline_keyboard) payload.reply_markup = { inline_keyboard: options.inline_keyboard };
    payload.parse_mode = options.parse_mode || "HTML";
  } else { payload.parse_mode = "HTML"; }
  
  const response = await fetch(`https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) 
  });
  return await response.json(); // 回傳 JSON 以便取得 message_id
}

// 新增：編輯訊息函數
async function editMessage(chatId, messageId, text, options = null, env) {
  if (!text) return;
  const payload = { chat_id: chatId, message_id: messageId, text: text,link_preview_options: { is_disabled: true }};
  if (options) {
    if (options.inline_keyboard) payload.reply_markup = { inline_keyboard: options.inline_keyboard };
    payload.parse_mode = options.parse_mode || "HTML";
  } else { payload.parse_mode = "HTML"; }

  await fetch(`https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/editMessageText`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
  });
}

async function answerCallbackQuery(id, text, env) {
  fetch(`https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callback_query_id: id, text }) 
  });
}

// KV 操作函數 (必須在 handleTrashCommand 之前定義)
async function getTrashList(userId, env) {
  if (!env.POKEMON_KV) return [];
  return await env.POKEMON_KV.get(TRASH_LIST_PREFIX + userId, "json") || [];
}

async function addToTrashList(userId, pokemonNames, env) {
  if (!env.POKEMON_KV) return;
  const list = await getTrashList(userId, env);
  pokemonNames.forEach((name) => {
    if (name && !list.includes(name)) list.push(name);
  });
  await env.POKEMON_KV.put(TRASH_LIST_PREFIX + userId, JSON.stringify(list));
}

async function getAllowedUserIds(env) {
  if (!env.POKEMON_KV) return [];
  return await env.POKEMON_KV.get(ALLOWED_UID_KEY, "json") || [];
}

async function setAllowedUserIds(ids, env) {
  if (!env.POKEMON_KV) return;
  await env.POKEMON_KV.put(ALLOWED_UID_KEY, JSON.stringify(ids));
}
async function getBannedUserIds(env) {
  if (!env.POKEMON_KV) return [];
  return await env.POKEMON_KV.get(BANNED_UID_KEY, "json") || [];
}

async function setBannedUserIds(ids, env) {
  if (!env.POKEMON_KV) return;
  await env.POKEMON_KV.put(BANNED_UID_KEY, JSON.stringify(ids));
}
// =========================================================
//  3. 核心功能邏輯 (Features Logic)
// =========================================================

// --- 垃圾清單功能 ---
async function handleTrashCommand(chatId, userId, messageFrom, env) {
  const trashList = await getTrashList(userId, env);
  const userName = messageFrom.first_name || "訓練家";
  
  // HTML Escape 以防名字含有特殊符號導致報錯
  const safeName = userName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  if (trashList.length === 0) {
    return sendMessage(chatId, `您好, ${safeName}\n您的垃圾清單目前是空的。`, null, env);
  }
  
  let replyMessage = `您好, ${safeName}\n您的垃圾清單：\n\n<code>${trashList.join(",")}</code>`;
  return sendMessage(chatId, replyMessage, { parse_mode: "HTML" }, env);
}

async function handleUntrashCommand(chatId, userId, pokemonNames, env) {
  if (!env.POKEMON_KV) return;
  const currentList = await getTrashList(userId, env);
  const removed = [];
  pokemonNames.forEach((name) => {
    const idx = currentList.indexOf(name);
    if (idx > -1) {
      currentList.splice(idx, 1);
      removed.push(name);
    }
  });
  
  if (removed.length > 0) {
    await env.POKEMON_KV.put(TRASH_LIST_PREFIX + userId, JSON.stringify(currentList));
    return sendMessage(chatId, `已移除：${removed.join(", ")}`, null, env);
  }
  return sendMessage(chatId, "清單中找不到這些寶可夢。", null, env);
}
async function handlePokemonSearch(chatId, userId, query, env, ctx) {
  const cleanQuery = query.replace(QUERY_CLEANER_REGEX, "");
  const finalQuery = cleanQuery.length > 0 ? cleanQuery : query;

  const loadingMsg = await sendMessage(chatId, `\u{1F50D} \u67E5\u8A62 "<b>${finalQuery}</b>" (\u542B\u62db\u5f0f)...`, { parse_mode: "HTML" }, env);
  // 取得該訊息的 ID，以便稍後編輯
  const loadingMsgId = loadingMsg.result ? loadingMsg.result.message_id : null;
  try {
    const [resTrans, resMoves, resEvents] = await Promise.all([
      fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx),
      fetchWithCache(getDataUrl("data/move.json"), env, ctx),
      fetchWithCache(getDataUrl("data/events.json"), env, ctx)
    ]);

    const data = await resTrans.json();
    const movesData = resMoves.ok ? await resMoves.json() : {};
    const eventsData = resEvents.ok ? await resEvents.json() : [];
    const isChi = /[\u4e00-\u9fa5]/.test(finalQuery);
    const lower = finalQuery.toLowerCase();

    const initialMatches = data.filter(p => isChi ? p.speciesName.includes(finalQuery) : p.speciesId.toLowerCase().includes(lower));
    
    if(!initialMatches.length) return sendMessage(chatId, "找不到寶可夢", null, env);
    
    const familyIds = new Set();
    initialMatches.forEach(p => { if (p.family && p.family.id) familyIds.add(p.family.id); });
    const finalMatches = data.filter(p => (p.family && familyIds.has(p.family.id)) || initialMatches.includes(p));
    
    const pokemonMap = new Map(finalMatches.map(p => [p.speciesId.toLowerCase(), p]));
    const ids = new Set(finalMatches.map(p => p.speciesId.toLowerCase()));
    
    const rankResults = await Promise.all(leagues.map(l => fetchWithCache(getDataUrl(l.path), env, ctx).then(r => r.ok ? r.json() : null)));
    
    let msg = `🏆 <b>"${finalQuery}" 家族相關排名</b>\n`;
    const resultsByLeague = {}; 
    let hasEliteRequirement = false;
    // 招式格式化函數
    const formatMove = (moveId, eliteList) => {
      if (!moveId) return "";
      let name = movesData[moveId] || moveId;
      if (eliteList && eliteList.includes(moveId)) name += "*";
      return name;
    };

    rankResults.forEach((list, i) => {
      if(!list) return;
      list.forEach((p, rankIndex) => {
        if(ids.has(p.speciesId.toLowerCase())) {
           const rank = p.rank || p.tier || rankIndex + 1;
           const rating = getPokemonRating(rank);
           
           if (rating === "垃圾") return;
           if (typeof rank === "number" && rank > 100) return;

           const rankDisplay = typeof rank === 'number' ? `#${rank}` : `#${rank}`; 
           
           const pDetail = pokemonMap.get(p.speciesId.toLowerCase());
           const rawName = pDetail ? pDetail.speciesName : p.speciesName; 
           let name = getTranslatedName(p.speciesId, rawName);

           const eliteList = pDetail ? pDetail.eliteMoves : []; 

           // ★★★ 修正重點：兼容 moveset 陣列格式 ★★★
           let fastMoveId = p.moveFast;
           let chargedMoveIds = p.moveCharged;

           // 如果沒有 moveFast，但有 moveset 陣列 (PvPoke 格式)
           // moveset[0] = 小招, moveset[1...] = 大招
           if (!fastMoveId && p.moveset && Array.isArray(p.moveset) && p.moveset.length > 0) {
               fastMoveId = p.moveset[0];
               chargedMoveIds = p.moveset.slice(1);
           }

           // 組合招式字串
           let moveStr = "";
           if (fastMoveId) {
             const fast = formatMove(fastMoveId, eliteList);
             // 確保 chargedMoveIds 是陣列
             const chargedArray = Array.isArray(chargedMoveIds) ? chargedMoveIds : [chargedMoveIds];
             const charged = chargedArray.filter(m => m).map(m => formatMove(m, eliteList)).join(", ");
             
             if (charged) {
                moveStr = `\n└ ${fast} / ${charged}`;
             } else {
                moveStr = `\n└ ${fast}`;
             }
           }
           
           const line = `${rankDisplay} <code>${name}</code> ${p.score ? `(${p.score.toFixed(2)})` : ""} - ${rating}${moveStr}`;
           
           const leagueName = leagues[i].name;
           if (!resultsByLeague[leagueName]) resultsByLeague[leagueName] = [];
           resultsByLeague[leagueName].push(line);
        }
      });
    });

    let hasContent = false;
    for (const [league, lines] of Object.entries(resultsByLeague)) {
      if (lines.length > 0) {
        msg += `\n<b>${league}:</b>\n${lines.join("\n")}\n`;
        hasContent = true;
      }
    }
    // ★★★ 結論與活動判斷邏輯 ★★★
    if (hasContent) {
        const keepCategories = new Set();
        Object.keys(resultsByLeague).forEach(leagueName => {
            if (leagueName.includes("500") && !leagueName.includes("1500") && !leagueName.includes("2500")) keepCategories.add(500);
            else if (leagueName.includes("1500")) keepCategories.add(1500);
            else if (leagueName.includes("2500")) keepCategories.add(2500);
            else if (leagueName.includes("10000") || leagueName.includes("無上限") || leagueName.includes("最佳")) keepCategories.add(10000);
        });

        if (keepCategories.size > 0) {
            const sortedCats = Array.from(keepCategories).sort((a, b) => a - b);
            msg += `\n📌 <b>結論：建議保留 ${sortedCats.join(" / ")}</b>`;
        }

        if (hasEliteRequirement) {
            msg += `\n⚠️ <b>注意：部分推薦招式 (*) 需使用厲害招式學習器。</b>`;
        }
        // --- 活動檢查 (增加日期過濾) ---
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }); // 取得台灣時間 YYYY-MM-DD
        // --- 活動檢查 ---
        // 檢查搜尋結果中的任何一隻寶可夢 (initialMatches)，是否出現在 eventsData 的 pokemonId 列表中
        const upcoming = eventsData.filter(e => {
            // 1. 檢查寶可夢是否匹配
            const isMatch = initialMatches.some(p => {
                if (!e.pokemonId || !Array.isArray(e.pokemonId)) return false;
                return e.pokemonId.includes(p.speciesId.toLowerCase());
            });
            if (!isMatch) return false;

            // 2. 檢查活動是否結束
            if (!e.date) return true; // 沒日期的就顯示
            const parts = e.date.split(/[~～]/);
            const endDate = (parts.length > 1 ? parts[1] : parts[0]).trim(); // 取得結束日期 (如果是範圍)
            return endDate >= today; // 結束日期必須大於等於今天
        });

        if (upcoming.length > 0) {
            upcoming.forEach(e => {
                msg += `\n🎉 <b>即將到來：<a href="${e.link}">${e.eventName}</a> (${e.date})</b>`;
                
                // ★★★ 改動在這裡 ★★★
                // 邏輯：如果是 "社群日" 且 "這隻寶可夢推薦招式裡有星號(*)"
                if (e.eventName.includes("社群日") && hasEliteRequirement) {
                    msg += `\n💡 建議保留體質好的，等待社群再進化學習特殊招式！`;
                } else {
                    // 其他情況 (聚焦時刻、團體戰，或不需要特殊招式的社群日)
                    msg += `\n📢 相關寶可夢活動即將到來！`;
                }
            });
        }
    }
    // --------------------------------
    if (!hasContent) {
       const representative = initialMatches[0] || finalMatches[0];
       const cleanName = representative ? representative.speciesName.replace(NAME_CLEANER_REGEX, "").trim() : finalQuery;
       msg = `與 <b>"${finalQuery}"</b> 相關的寶可夢在所有聯盟中評價皆為垃圾。\n\n建議輸入 <code>/trash ${cleanName}</code> 加入清單。`;
    }

    let options = { parse_mode: "HTML" };
    const trashList = await getTrashList(userId, env);
    const foundInTrash = finalMatches.find(p => trashList.includes(p.speciesName));

    if (foundInTrash) {
      msg += `\n\n⚠️ <b>注意：${foundInTrash.speciesName} 目前在您的垃圾清單中</b>`;
      options.inline_keyboard = [[
        { text: `♻️ 將 "${foundInTrash.speciesName}" 移出垃圾清單`, callback_data: `untrash_btn_${foundInTrash.speciesName}` }
      ]];
    }
    // ★★★ 關鍵修改：如果有 loadingMsgId，就編輯它；否則發送新訊息 ★★★
    if (loadingMsgId) {
        await editMessage(chatId, loadingMsgId, msg, options, env);
    } else {
        await sendMessage(chatId, msg, options, env);
    }

  } catch(e) { 
    // 發生錯誤時也嘗試編輯原本的訊息
    const errorMsg = `⚠️ 發生錯誤: ${e.message}`;
    if (loadingMsgId) await editMessage(chatId, loadingMsgId, errorMsg, null, env);
    else await sendMessage(chatId, errorMsg, null, env);
  }
}
// ★★★ 共用翻譯函數 (純文字處理版) ★★★
function getTranslatedName(id, nameStr) {
  // 1. 確保傳進來的一定是字串 (防止 [object Object] 或 undefined)
  let name = String(nameStr || id || "");

  // 硬編碼修正 (無括號版)
  if (name === "Giratina (Altered)") return "騎拉帝納 別種";
  if (name === "Giratina (Altered) (Shadow)") return "騎拉帝納 別種 暗影";
  if (name === "Claydol (Shadow)") return "念力土偶 暗影";
  
  // 安全的 includes 檢查
  if (name.includes("Hydreigon") && name.includes("Shadow")) return "三首惡龍 暗影";
  if (name.includes("Toucannon") && name.includes("Shadow")) return "銃嘴大鳥 暗影";
  if (name.includes("Snorlax") && name.includes("Gigantamax")) return "卡比獸 超極巨化";
  if (name.includes("Lapras") && name.includes("Gigantamax")) return "拉普拉斯 超極巨化";
  if (name.includes("Aegislash") && name.includes("Shield")) return "堅盾劍怪 盾牌";

  return name;
}
async function handleLeagueCommand(chatId, command, limit = 50, env, ctx) {
  const leagueInfo = leagues.find((l) => l.command === command);
  if (!leagueInfo) return sendMessage(chatId, "未知的命令。", null, env);
  await sendMessage(chatId, `查詢 <b>${leagueInfo.name}</b>...`, { parse_mode: "HTML" }, env);
  try {
    const [resRank, resTrans] = await Promise.all([
      fetchWithCache(getDataUrl(leagueInfo.path), env, ctx),
      fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx)
    ]);
    const rankings = await resRank.json();
    const trans = await resTrans.json();
    // 這裡 Map 存的是字串 (speciesName)
    const map = new Map(trans.map(p => [p.speciesId.toLowerCase(), p.speciesName]));
    
    const list = rankings.slice(0, limit);
    let msg = `🏆 <b>${leagueInfo.name}</b> (Top ${limit})\n\n`;
    const copyList = [];
    
    list.forEach((p, i) => {
      const rank = p.rank || p.tier || i + 1;
      const rating = getPokemonRating(rank);
      if (rating === "垃圾") return;

      // ★★★ 修正重點：先取出字串，再傳給翻譯函數 ★★★
      const rawName = map.get(p.speciesId.toLowerCase()) || p.speciesName;
      let name = getTranslatedName(p.speciesId, rawName);
      
      const clean = name.replace(NAME_CLEANER_REGEX, "").trim();
      if (clean) copyList.push(clean);
      
      const rankDisplay = `#${rank}`;
      msg += `${rankDisplay} ${name} ${p.cp ? `CP:${p.cp}` : ""} ${p.score ? `(${p.score.toFixed(1)})` : ""} - ${rating}\n`;
    });
    
    if(copyList.length) msg += `\n<code>${[...new Set(copyList)].join(",")}</code>`;
    return sendMessage(chatId, msg, { parse_mode: "HTML" }, env);
  } catch(e) { return sendMessage(chatId, `Error: ${e.message}`, null, env); }
}
// --- Meta 分析 ---
function getDefenseProfile(defTypes) {
  const profile = {};
  allTypes.forEach(attackType => {
    let multiplier = 1.0;
    defTypes.forEach(t => {
      const typeLower = t.toLowerCase();
      let factor = 1.0;
      if (typeChart[attackType] && typeChart[attackType][typeLower] !== undefined) factor = typeChart[attackType][typeLower];
      multiplier *= factor;
    });
    profile[attackType] = multiplier;
  });
  return profile;
}

function getWeaknesses(defTypes) {
  const profile = getDefenseProfile(defTypes);
  return Object.entries(profile).filter(([type, val]) => val > 1.0).map(([type]) => type);
}

function findBestPartner(rankings, currentTeam, pokemonTypeMap) {
  const teamWeaknessCounts = {}; 
  currentTeam.forEach(p => {
    const pInfo = pokemonTypeMap.get(p.speciesId.toLowerCase());
    if (pInfo && pInfo.types) {
      const weaknesses = getWeaknesses(pInfo.types);
      weaknesses.forEach(w => { teamWeaknessCounts[w] = (teamWeaknessCounts[w] || 0) + 1; });
    }
  });
  const urgentWeaknesses = Object.keys(teamWeaknessCounts).sort((a, b) => teamWeaknessCounts[b] - teamWeaknessCounts[a]);
  let bestPartner = null;
  let bestScore = -9999;
  const searchPool = rankings.slice(0, 40); 
  for (const candidate of searchPool) {
    if (currentTeam.some(m => m.speciesId === candidate.speciesId)) continue;
    const candInfo = pokemonTypeMap.get(candidate.speciesId.toLowerCase());
    if (!candInfo || !candInfo.types) continue;
    let score = 0;
    const candProfile = getDefenseProfile(candInfo.types);
    const candWeaknesses = getWeaknesses(candInfo.types);
    urgentWeaknesses.forEach(weakType => { if (candProfile[weakType] < 1.0) score += (20 * (teamWeaknessCounts[weakType] || 1)); });
    urgentWeaknesses.forEach(weakType => { if (candProfile[weakType] > 1.0) score -= (30 * (teamWeaknessCounts[weakType] || 1)); });
    candWeaknesses.forEach(w => {
      let covered = false;
      currentTeam.forEach(teammate => {
        const tInfo = pokemonTypeMap.get(teammate.speciesId.toLowerCase());
        if (tInfo) { const tProfile = getDefenseProfile(tInfo.types); if (tProfile[w] < 1.0) covered = true; }
      });
      if (covered) score += 5; else score -= 5;
    });
    const rankIndex = rankings.indexOf(candidate);
    score -= (rankIndex * 0.5); 
    if (score > bestScore) { bestScore = score; bestPartner = candidate; }
  }
  if (!bestPartner || bestScore < -50) bestPartner = searchPool.find(p => !currentTeam.some(m => m.speciesId === p.speciesId));
  return bestPartner;
}

function buildBalancedTeam(leader, rankings, map) {
  const team = [leader];
  const partner1 = findBestPartner(rankings, team, map);
  if (partner1) team.push(partner1);
  const partner2 = findBestPartner(rankings, team, map);
  if (partner2) team.push(partner2);
  return team;
}

async function handleMetaAnalysis(chatId, env, ctx) {
  const targetLeagues = [
    leagues.find(l => l.command === "great_league_top"),
    leagues.find(l => l.command === "ultra_league_top"),
    leagues.find(l => l.command === "master_league_top")
  ];
  await sendMessage(chatId, `🔄 <b>正在分析三聯盟實時生態與屬性聯防...</b>`, { parse_mode: "HTML" }, env);
  const transResponse = await fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx);
  if (!transResponse.ok) return sendMessage(chatId, "❌ 無法讀取資料庫", null, env);
  const allPokemonData = await transResponse.json();
  const pokemonDetailMap = new Map(allPokemonData.map(p => [p.speciesId.toLowerCase(), p]));
  const getName = (p, forCopy = false) => {
    const detail = pokemonDetailMap.get(p.speciesId.toLowerCase());
    let originalName = detail ? detail.speciesName : p.speciesName;
    let name = getTranslatedName(p.speciesId, originalName, pokemonDetailMap);
    if (forCopy) return name.replace(NAME_CLEANER_REGEX, "").trim();
    return name;
  };
  const getTypesStr = (p) => {
    const detail = pokemonDetailMap.get(p.speciesId.toLowerCase());
    if (!detail || !detail.types) return "";
    const chiTypes = detail.types
      .filter(t => t.toLowerCase() !== "none") // 1. 先過濾掉 'none'
      .map(t => typeNames[t.toLowerCase()] || t); // 2. 再轉成中文
    return `(${chiTypes.join("/")})`;
  };
  for (const league of targetLeagues) {
    if (!league) continue;
    try {
      const response = await fetchWithCache(getDataUrl(league.path), env, ctx);
      const rankings = await response.json();
      if (!rankings || rankings.length === 0) continue;
      const topOne = rankings[0];
      const topOneScore = topOne.score ? topOne.score.toFixed(1) : "N/A";
      const teamViolence = rankings.slice(0, 3);
      const teamBalanced = buildBalancedTeam(topOne, rankings, pokemonDetailMap);
      let altLeader = rankings[1]; 
      if (teamBalanced.some(p => p.speciesId === altLeader.speciesId)) altLeader = rankings[2];
      const teamAlternative = buildBalancedTeam(altLeader, rankings, pokemonDetailMap);
      const copySet = new Set();
      [...teamViolence, ...teamBalanced, ...teamAlternative].forEach(p => {
        const cleanName = getName(p, true);
        if (cleanName) copySet.add(cleanName);
      });
      const copyString = [...copySet].join(",");
      let msg = `📊 <b>${league.name} 戰略分析</b>\n\n`;
      msg += `👑 <b>META 核心</b>\n👉 <b>${getName(topOne)}</b> (分: ${topOneScore})\n\n`;
      msg += `<b>暴力 T0 隊</b> (純強度)\n`;
      teamViolence.forEach((p, i) => msg += `${i+1}️⃣ ${getName(p)} ${getTypesStr(p)}\n`);
      msg += `\n🛡️ <b>智慧聯防隊</b> (以王者為核)\n`;
      teamBalanced.forEach((p, i) => msg += `${i+1}️⃣ ${getName(p)} ${getTypesStr(p)}\n`);
      msg += `\n🔄 <b>二當家聯防隊</b> (替代方案)\n`;
      teamAlternative.forEach((p, i) => msg += `${i+1}️⃣ ${getName(p)} ${getTypesStr(p)}\n`);
      msg += `\n📋 <b>一鍵複製搜尋字串</b>\n`;
      msg += `<code>${copyString}</code>`;
      await sendMessage(chatId, msg, { parse_mode: "HTML" }, env);
    } catch (e) { await sendMessage(chatId, `⚠️ ${league.name} 分析錯誤: ${e.message}`, { parse_mode: "" }, env); }
  }
}

// --- 屬性查詢 ---
async function sendTypeSelectionMenu(chatId, mode, env) {
  const title = mode === "atk" ? "<b>攻擊屬性查詢</b>\n請選擇攻擊招式的屬性：" : "🛡️ <b>防禦屬性查詢</b>\n請選擇防守方(自己)的屬性：";
  const keyboard = [];
  const types = Object.keys(typeNames);
  for (let i = 0; i < types.length; i += 3) {
    const row = types.slice(i, i + 3).map(t => ({ text: typeNames[t], callback_data: `type_${mode}_${t}` }));
    keyboard.push(row);
  }
  keyboard.push([{ text: "🔙 回主選單", callback_data: "main_menu" }]);
  await sendMessage(chatId, title, { inline_keyboard: keyboard, parse_mode: "HTML" }, env);
}

async function handleTypeDetail(chatId, typeKey, mode, env) {
  const typeName = typeNames[typeKey];
  let msg = "";
  if (mode === "atk") {
    const strongAgainst = [];
    Object.entries(typeChart[typeKey]).forEach(([target, multiplier]) => {
      if (multiplier > 1.0) strongAgainst.push(`${typeNames[target]} (${multiplier}x)`);
    });
    msg = `<b>${typeName}屬性 (攻擊方)</b>\n\n💪 <b>效果絕佳 (1.6x)：</b>\n${strongAgainst.length ? strongAgainst.join("\n") : "無"}\n\n<i>(註：Pokemon GO 剋制倍率為 1.6)</i>`;
  } else {
    const resistantTo = [];
    const immuneTo = [];
    allTypes.forEach(attacker => {
      let multiplier = 1.0;
      if (typeChart[attacker] && typeChart[attacker][typeKey] !== undefined) multiplier = typeChart[attacker][typeKey];
      if (multiplier < 1.0) {
        const text = `${typeNames[attacker]} (${multiplier}x)`;
        if (multiplier < 0.6) immuneTo.push(text); else resistantTo.push(text);
      }
    });
    msg = `🛡️ <b>${typeName}屬性 (防守方)</b>\n\n🚫 <b>被雙抗/無效 (0.39x)：</b>\n${immuneTo.length ? immuneTo.join("\n") : "無"}\n\n🛡️ <b>具有抗性 (0.625x)：</b>\n${resistantTo.length ? resistantTo.join("\n") : "無"}\n`;
  }
  const keyboard = [[{ text: "🔙 回上一層", callback_data: `menu_${mode}_types` }]];
  await sendMessage(chatId, msg, { inline_keyboard: keyboard, parse_mode: "HTML" }, env);
}

// --- 其他選單 ---
function generateMainMenu() {
  const keyboard = [];
  const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
  const add = (items) => { const btns = items.map(l => ({ text: l.name, callback_data: l.command })); keyboard.push(...chunk(btns, 2)); };
  keyboard.push([{ text: "📊 三聯盟 Meta 生態分析", callback_data: "meta_analysis" }]);
  const groups = { "🏆 超級 (1500)": leagues.filter(l => l.cp === "1500"), "高級 (2500)": leagues.filter(l => l.cp === "2500"), "👑 大師 (Max)": leagues.filter(l => l.cp === "10000"), "📊 PvE": leagues.filter(l => l.cp === "Any") };
  for (const [title, items] of Object.entries(groups)) { keyboard.push([{ text: `--- ${title} ---`, callback_data: "dummy" }]); add(items); }
  keyboard.push([{ text: "攻擊屬性查詢", callback_data: "menu_atk_types" }, { text: "🛡️ 防禦屬性查詢", callback_data: "menu_def_types" }]);
  keyboard.push([{ text: "📝 垃圾清單", callback_data: "trash_list" }, { text: "ℹ️ 說明", callback_data: "help_menu" }]);
  return keyboard;
}

async function sendMainMenu(chatId, env) {
  const text = "🤖 <b>PvP 查詢機器人</b>\n請選擇功能或直接輸入名稱查詢。";
  const keyboard = generateMainMenu();
  await sendMessage(chatId, text, { inline_keyboard: keyboard, parse_mode: "HTML" }, env);
}

async function sendHelpMessage(chatId, env) { sendMessage(chatId, `🤖 <b>使用說明</b>\n🔍 輸入名稱查詢 (例: 瑪力露麗)\n📊 點擊 Meta 分析查看最新生態\n🗑️ /trash [名稱] 管理垃圾清單`, { parse_mode: "HTML" }, env); }
async function handleAllowUidCommand(chatId, uid, env) { const ids = await getAllowedUserIds(env); if(!ids.includes(+uid)) { ids.push(+uid); await setAllowedUserIds(ids, env); } sendMessage(chatId, "Added", null, env); }
async function handleDelUidCommand(chatId, uid, env) { const ids = await getAllowedUserIds(env); await setAllowedUserIds(ids.filter(i => i !== +uid), env); sendMessage(chatId, "Removed", null, env); }

// =========================================================
//  4. 訊息與請求處理 (Message & Callback Routing)
// =========================================================

async function onCallbackQuery(callbackQuery, env, ctx) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data; 
  const callbackQueryId = callbackQuery.id;
  const userId = callbackQuery.from.id;
  const userName = callbackQuery.from.first_name || "Unknown";

  console.log(`🔘 [BTN] UID: ${userId} | Data: ${data} | Chat: ${chatId}`);

  // ★ 關鍵修改：判斷是否在「管理員群組」內操作
  // 如果目前的 Chat ID 等於設定的 ADMIN_UID (群組ID)，視為特權環境
  const isInAdminGroup = String(chatId) === String(env.ADMIN_UID);

  // --- 管理員審核功能 (允許/封禁) ---
  if (data.startsWith("approve_uid_") || data.startsWith("ban_uid_")) {
      
      // 只有在「管理群組內」或是「白名單內的用戶」可以按這些按鈕
      const allowedIdsCheck = await getAllowedUserIds(env);
      if (!isInAdminGroup && !allowedIdsCheck.includes(userId)) {
          await answerCallbackQuery(callbackQueryId, "⛔ 權限不足", env);
          return;
      }

      const targetUid = parseInt(data.split("_")[2]);
      
      if (data.startsWith("approve_uid_")) {
          // 1. 加入白名單
          const allowed = await getAllowedUserIds(env);
          if (!allowed.includes(targetUid)) {
              allowed.push(targetUid);
              await setAllowedUserIds(allowed, env);
          }
          // 2. 移出黑名單
          let banned = await getBannedUserIds(env);
          if (banned.includes(targetUid)) {
              banned = banned.filter(id => id !== targetUid);
              await setBannedUserIds(banned, env);
          }

          // 3. 更新群組訊息 & 通知使用者
          await editMessage(chatId, callbackQuery.message.message_id, `✅ <b>已核准</b>\n使用者: ${userName}\nUID: ${targetUid} 已加入白名單。`, null, env);
          // 嘗試通知使用者 (如果對方沒封鎖 Bot)
          try { await sendMessage(targetUid, "✅ 管理員已開通您的權限，現在可以開始查詢了！", null, env); } catch(e){}
          await answerCallbackQuery(callbackQueryId, "已核准", env);
      } 
      else if (data.startsWith("ban_uid_")) {
          // 1. 加入黑名單
          const banned = await getBannedUserIds(env);
          if (!banned.includes(targetUid)) {
              banned.push(targetUid);
              await setBannedUserIds(banned, env);
          }
          // 2. 移出白名單
          let allowed = await getAllowedUserIds(env);
          if (allowed.includes(targetUid)) {
              allowed = allowed.filter(id => id !== targetUid);
              await setAllowedUserIds(allowed, env);
          }

          await editMessage(chatId, callbackQuery.message.message_id, `🚫 <b>已永久封禁</b>\nUID: ${targetUid} 已列入黑名單。`, null, env);
          await answerCallbackQuery(callbackQueryId, "已封禁", env);
      }
      return;
  }

  // --- 一般功能按鈕權限檢查 ---
  const allowedIds = await getAllowedUserIds(env);
  // 如果 不在管理群組 且 不在白名單 -> 拒絕
  if (!isInAdminGroup && !allowedIds.includes(userId)) {
      await answerCallbackQuery(callbackQueryId, `⛔ 權限不足`, env);
      return;
  }

  // ... (以下保留您原本的 untrash_btn, menu_types 等邏輯) ...
  if (data.startsWith("untrash_btn_")) {
    const name = data.replace("untrash_btn_", "");
    await answerCallbackQuery(callbackQueryId, "正在移除...", env);
    return handleUntrashCommand(chatId, userId, [name], env);
  }

  if (data === "menu_atk_types") return sendTypeSelectionMenu(chatId, "atk", env);
  if (data === "menu_def_types") return sendTypeSelectionMenu(chatId, "def", env);
  if (data.startsWith("type_atk_")) return handleTypeDetail(chatId, data.replace("type_atk_", ""), "atk", env);
  if (data.startsWith("type_def_")) return handleTypeDetail(chatId, data.replace("type_def_", ""), "def", env);

  answerCallbackQuery(callbackQueryId, "", env).catch(console.error);

  const leagueInfo = leagues.find((l) => l.command === data);
  if (leagueInfo) return await handleLeagueCommand(chatId, data, LIMIT_LEAGUES_SHOW, env, ctx);

  switch (data) {
    case "meta_analysis": return handleMetaAnalysis(chatId, env, ctx);
    case "trash_list": return handleTrashCommand(chatId, userId, callbackQuery.from, env);
    case "help_menu": return sendHelpMessage(chatId, env);
    case "main_menu": return sendMainMenu(chatId, env);
    default: return;
  }
}
async function onMessage(message, env, ctx) {
  if (!message.text) return;
  
  const text = message.text.trim();
  const chatId = message.chat.id;
  const userId = message.from.id;
  const firstName = message.from.first_name || "Unknown";
  const username = message.from.username ? `@${message.from.username}` : "無";
  
  console.log(`🚨 [MSG] UID: ${userId} | Chat: ${chatId} | Text: ${text}`);

  // =======================================================
  // ★ 權限控管邏輯
  // =======================================================
  
  // 1. 判斷是否在「管理員群組」內 (特權通道)
  // 強制轉字串比對，避免型別問題
  const adminGroupId = env.ADMIN_UID ? String(env.ADMIN_UID).trim() : null;
  const currentChatId = String(chatId);
  const isInAdminGroup = adminGroupId && (currentChatId === adminGroupId);

  if (isInAdminGroup) {
      // Pass: 管理群組內直接放行
  } else {
      // 2. 檢查黑名單
      const bannedIds = await getBannedUserIds(env);
      if (bannedIds.includes(userId)) return; 

      // 3. 檢查白名單
      const allowedIds = await getAllowedUserIds(env);
      if (!allowedIds.includes(userId)) {
          // --- 未授權使用者 ---
          
          // A. 回覆使用者
          await sendMessage(chatId, `⛔ <b>權限不足</b>\n您的 UID (<code>${userId}</code>) 未授權。\n已自動提交申請給管理員。`, { parse_mode: "HTML" }, env);

          // B. 通知管理員群組
          if (!adminGroupId) {
              console.error("❌ [ERROR] env.ADMIN_UID 未設定！");
              return;
          }

          // ★ 安全修正：使用 escapeHtml 避免特殊字元導致發送失敗
          const safeName = escapeHtml(firstName);
          const safeText = escapeHtml(text);
          const safeUser = escapeHtml(username);

          const adminMsg = `🚨 <b>申請存取</b>\n\n👤 <b>使用者:</b> ${safeName} (${safeUser})\n🆔 <b>UID:</b> <code>${userId}</code>\n💬 <b>訊息:</b> ${safeText}`;
          
          const adminOptions = {
              parse_mode: "HTML",
              inline_keyboard: [[
                  { text: "✅ 批准", callback_data: `approve_uid_${userId}` },
                  { text: "🚫 封禁", callback_data: `ban_uid_${userId}` }
              ]]
          };
          
          console.log(`📤 [DEBUG] 正在發送通知給群組: ${adminGroupId}`);
          
          // 發送並記錄結果
          try {
              const res = await sendMessage(adminGroupId, adminMsg, adminOptions, env);
              if (res.ok) {
                  console.log("✅ [SUCCESS] 通知發送成功！Message ID:", res.result.message_id);
              } else {
                  // ★★★ 如果發送失敗，這裡是關鍵線索 ★★★
                  console.error("❌ [FAIL] Telegram API 錯誤:", JSON.stringify(res));
              }
          } catch (e) {
              console.error("❌ [FAIL] 網絡或代碼異常:", e);
          }
          
          return; // 中斷
      }
  }
  // =======================================================

  const parts = text.split(" ");
  const command = parts[0].startsWith("/") ? parts[0].split("@")[0].substring(1) : null;
  const args = parts.slice(1);

  const leagueInfo = leagues.find((l) => l.command === command);
  if (leagueInfo) return await handleLeagueCommand(chatId, command, LIMIT_LEAGUES_SHOW, env, ctx);

  if (command) {
    switch (command) {
      case "start": case "menu": return sendMainMenu(chatId, env);
      case "help": return sendHelpMessage(chatId, env);
      case "trash": 
        if (args.length > 0) {
          await addToTrashList(userId, args, env);
          return sendMessage(chatId, `已加入: ${args.join(", ")}`, null, env);
        }
        return handleTrashCommand(chatId, userId, message.from, env);
      case "untrash": return handleUntrashCommand(chatId, userId, args, env);
      default: return;
    }
  }

  if (text.length >= 2 && !text.startsWith("/")) return handlePokemonSearch(chatId, userId, text, env, ctx);
}

async function handleWebhook(request, env, ctx) {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (secret !== env.ENV_BOT_SECRET) return new Response("Unauthorized", { status: 403 });

  try {
    const update = await request.json();
    if (update.message) ctx.waitUntil(onMessage(update.message, env, ctx));
    else if (update.callback_query) ctx.waitUntil(onCallbackQuery(update.callback_query, env, ctx));
    return new Response("Ok");
  } catch (e) {
    console.error(e);
    return new Response("Error", { status: 500 });
  }
}

async function registerWebhook(req, url, env) {
  const res = await fetch(`https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/setWebhook`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: `${url.protocol}//${url.hostname}${WEBHOOK_PATH}`, secret_token: env.ENV_BOT_SECRET })
  });
  return new Response(await res.text());
}
async function unRegisterWebhook(env) {
  const res = await fetch(`https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/deleteWebhook`);
  return new Response(await res.text());
}
function generateHTML() {
  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PokeMaster PRO | 戰術評價系統</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;900&family=Noto+Sans+TC:wght@400;700;900&display=swap');
        body { font-family: 'Noto Sans TC', sans-serif; background: #000; color: #eee; }
        .tech-font { font-family: 'Orbitron', sans-serif; }
        .neon-border { border: 1px solid rgba(255, 0, 0, 0.4); box-shadow: 0 0 20px rgba(255, 0, 0, 0.15); }
        .neon-text-red { color: #ff0000; text-shadow: 0 0 12px rgba(255, 0, 0, 0.6); }
        .btn-red { background: #b90000; box-shadow: 0 0 20px rgba(185, 0, 0, 0.4); transition: 0.3s; }
        .btn-red:hover { background: #ff0000; box-shadow: 0 0 30px rgba(255, 0, 0, 0.7); }
        .card-dark { background: #0a0a0a; border: 1px solid #1a1a1a; border-top: 4px solid #ff0000; }
        .type-badge { padding: 2px 8px; border-radius: 4px; color: white; font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .type-fire { background: #c0392b; } .type-water { background: #2980b9; } .type-grass { background: #27ae60; }
        .type-electric { background: #f1c40f; color: #000; } .type-ice { background: #3498db; } .type-fighting { background: #962d22; }
        .type-poison { background: #8e44ad; } .type-ground { background: #d35400; } .type-flying { background: #5d6d7e; }
        .type-psychic { background: #e91e63; } .type-bug { background: #689f38; } .type-rock { background: #795548; }
        .type-ghost { background: #3f51b5; } .type-dragon { background: #673ab7; } .type-dark { background: #212121; }
        .type-steel { background: #607d8b; } .type-fairy { background: #d81b60; } .type-normal { background: #757575; }
        .league-chip.active { background: #ff0000; color: white; border-color: #ff0000; }
        .trash-text { background: linear-gradient(to bottom, #ff0000, #660000); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 10px rgba(255,0,0,0.5)); }

        /* 建議清單顯示邏輯 */
        #suggestionList {
            position: absolute; width: 100%; top: 100%; left: 0; z-index: 999;
            background: rgba(15, 15, 15, 0.98); border: 1px solid #ff0000;
            border-top: none; border-radius: 0 0 1.5rem 1.5rem;
            max-height: 250px; overflow-y: auto; display: none;
            box-shadow: 0 15px 40px rgba(0,0,0,0.8);
        }
        .suggestion-item { padding: 12px 20px; cursor: pointer; border-bottom: 1px solid #222; font-weight: bold; }
        .suggestion-item:hover { background: #300000; color: #ff0000; }
        .suggestion-item:last-child { border-bottom: none; border-radius: 0 0 1.5rem 1.5rem; }
    </style>
</head>
<body>
    <div class="max-w-6xl mx-auto p-4 md:p-8">
        <div class="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 btn-red rounded-2xl flex items-center justify-center text-3xl"><i class="fa-solid fa-bolt"></i></div>
                <div>
                    <h1 class="text-4xl font-black tracking-tighter tech-font uppercase">PokeMaster <span class="neon-text-red">PRO</span></h1>
                    <p class="text-[10px] tech-font text-zinc-600 tracking-[0.3em]">TACTICAL ANALYSIS TERMINAL</p>
                </div>
            </div>
            <button onclick="toggleSettings()" class="bg-zinc-950 border border-red-900/50 px-6 py-3 rounded-full text-xs font-black tech-font hover:bg-red-950 transition">
                <i class="fa-solid fa-gear mr-2"></i> LEAGUE_CONFIG
            </button>
        </div>

        <div class="relative mb-16 z-[1000]">
            <div class="absolute inset-0 bg-red-600 blur-3xl opacity-5"></div>
            <div class="relative bg-zinc-950 p-2 rounded-3xl flex neon-border">
                <input type="text" id="searchInput" placeholder="輸入搜尋目標名稱 (例: 瑪力露麗)..." autocomplete="off"
                       class="flex-1 bg-transparent p-5 text-2xl focus:outline-none font-bold text-red-500 placeholder:text-zinc-800">
                <button onclick="performSearch()" class="btn-red text-white px-12 rounded-2xl font-black uppercase tech-font">SCAN</button>
                <div id="suggestionList"></div>
            </div>
        </div>

        <div id="infoSection" class="hidden mb-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 bg-zinc-950/50 p-10 rounded-[3rem] border border-zinc-900 shadow-inner">
                <h2 class="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.4em] mb-8">Evolution Sequence</h2>
                <div id="evolutionChain" class="flex flex-wrap justify-center items-center gap-8"></div>
            </div>
            <div class="bg-zinc-900/80 p-8 rounded-[3rem] border border-red-950/50 shadow-2xl">
                <h2 class="text-[10px] font-bold text-red-500 uppercase tracking-[0.4em] mb-6">Tactical HUD</h2>
                <div id="attributeHUD" class="space-y-6"></div>
            </div>
        </div>

        <div id="eventBanner" class="hidden mb-12 border-l-8 border-red-600 bg-red-950/30 p-8 rounded-3xl text-red-200"></div>
        <div id="results" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"></div>
    </div>

    <script>
        let allLeagues = [];
        let typeChart = {};
        let allPokemonNames = [];
        let selectedLeagues = JSON.parse(localStorage.getItem('fav_leagues')) || ['great_league_top', 'ultra_league_top', 'master_league_top'];

        const typeNames = { normal: "一般", fire: "火", water: "水", electric: "電", grass: "草", ice: "冰", fighting: "格鬥", poison: "毒", ground: "地面", flying: "飛行", psychic: "超能", bug: "蟲", rock: "岩石", ghost: "幽靈", dragon: "龍", dark: "惡", steel: "鋼", fairy: "妖精" };

        window.onload = async () => {
            try {
                // 初始化資料
                const initRes = await fetch('/api/search?q=piplup');
                const initData = await initRes.json();
                allLeagues = initData.allLeagues || [];
                typeChart = initData.typeChart || {};
                renderLeaguePicker();

                // 獲取預測用的純淨名單
                const namesRes = await fetch('/api/names');
                allPokemonNames = await namesRes.json();
                
                setupAutocomplete();
            } catch(e) { console.error("Initialization Failed", e); }
        };

        function setupAutocomplete() {
            const input = document.getElementById('searchInput');
            const list = document.getElementById('suggestionList');

            input.addEventListener('input', () => {
                const val = input.value.trim();
                list.innerHTML = '';
                if (!val) { list.style.display = 'none'; return; }

                const matches = allPokemonNames.filter(n => n.includes(val)).slice(0, 10);
                if (matches.length > 0) {
                    list.innerHTML = matches.map(n => \`
                        <div class="suggestion-item" onclick="selectSuggestion('\${n}')">
                            <i class="fa-solid fa-bullseye mr-2 opacity-30 text-xs"></i>\${n}
                        </div>
                    \`).join('');
                    list.style.display = 'block';
                } else { list.style.display = 'none'; }
            });

            document.addEventListener('click', (e) => { if (e.target !== input) list.style.display = 'none'; });
        }

        function selectSuggestion(name) {
            document.getElementById('searchInput').value = name;
            document.getElementById('suggestionList').style.display = 'none';
            performSearch();
        }

        function toggleSettings() { document.getElementById('settingsModal').classList.toggle('hidden'); }
        function renderLeaguePicker() {
            const picker = document.getElementById('leaguePicker');
            if(!picker) return;
            picker.innerHTML = allLeagues.map(l => \`
                <button onclick="toggleLeague('\${l.id}')" class="league-chip px-6 py-3 rounded-2xl border border-zinc-800 text-xs font-black uppercase transition \${selectedLeagues.includes(l.id) ? 'active' : ''}">\${l.name}</button>
            \`).join('');
        }
        function toggleLeague(id) {
            selectedLeagues = selectedLeagues.includes(id) ? selectedLeagues.filter(i => i !== id) : [...selectedLeagues, id];
            localStorage.setItem('fav_leagues', JSON.stringify(selectedLeagues));
            renderLeaguePicker(); performSearch();
        }

        function getTypeBadges(types) {
            return (types || []).filter(t => t && t.toLowerCase() !== 'none')
                .map(t => \`<span class="type-badge type-\${t.toLowerCase()}">\${typeNames[t.toLowerCase()] || t}</span>\`).join('');
        }

        function calculateEffectiveness(types) {
            const results = {};
            Object.keys(typeNames).forEach(t => results[t] = 1);
            (types || []).filter(t => t && t.toLowerCase() !== 'none').forEach(type => {
                const lower = type.toLowerCase();
                Object.keys(typeChart).forEach(attacker => {
                    if (typeChart[attacker] && typeChart[attacker][lower]) results[attacker] *= typeChart[attacker][lower];
                });
            });
            return results;
        }

        function updateHUD(name, types) {
            const eff = calculateEffectiveness(types);
            const weaknesses = Object.entries(eff).filter(([t, v]) => v > 1).sort((a,b) => b[1]-a[1]);
            const resists = Object.entries(eff).filter(([t, v]) => v < 1).sort((a,b) => a[1]-b[1]);
            document.getElementById('attributeHUD').innerHTML = \`
                <div class="text-white font-black text-xl border-b border-red-600 pb-3 mb-4 tech-font uppercase">\${name}</div>
                <div class="space-y-5">
                    <div>
                        <div class="text-[10px] font-black text-red-500 uppercase mb-2 tracking-[0.2em]">Weakness Logic</div>
                        <div class="flex flex-wrap gap-2">\${weaknesses.map(([t, v]) => \`<span class="text-[11px] bg-red-950/40 px-2 py-1 rounded border border-red-600/30 text-white font-bold">\${typeNames[t]} <span class="text-red-500 ml-1">x\${v.toFixed(1)}</span></span>\`).join('')}</div>
                    </div>
                    <div>
                        <div class="text-[10px] font-black text-green-500 uppercase mb-2 tracking-[0.2em]">Resist Data</div>
                        <div class="flex flex-wrap gap-2">\${resists.map(([t, v]) => \`<span class="text-[11px] bg-green-950/20 px-2 py-1 rounded border border-green-600/30 text-white font-bold">\${typeNames[t]} <span class="text-green-500 ml-1">x\${v.toFixed(1)}</span></span>\`).join('')}</div>
                    </div>
                </div>\`;
        }

        async function performSearch() {
            const query = document.getElementById('searchInput').value.trim();
            if (!query) return;
            const resultsDiv = document.getElementById('results');
            const infoSection = document.getElementById('infoSection');
            const eventBanner = document.getElementById('eventBanner');
            infoSection.classList.add('hidden');
            eventBanner.classList.add('hidden');
            resultsDiv.innerHTML = '<div class="col-span-full text-center py-40 text-red-600"><i class="fa-solid fa-dna fa-spin text-7xl"></i><p class="mt-6 tech-font uppercase tracking-[0.5em] animate-pulse">Scanning Bio-Database...</p></div>';

            try {
                const res = await fetch(\`/api/search?q=\${encodeURIComponent(query)}\`);
                const data = await res.json();

                if (!data.results || data.results.length === 0) {
                    resultsDiv.innerHTML = \`
                        <div class="col-span-full text-center py-20 px-10">
                            <i class="fa-solid fa-trash-can text-red-900 text-8xl mb-8 opacity-40"></i>
                            <h2 class="text-4xl font-black trash-text uppercase mb-4">評價等級：垃圾</h2>
                            <div class="inline-block bg-red-950/30 border border-red-900 p-6 rounded-3xl text-zinc-400">查無各大聯盟排名數據。建議直接轉送或作為收藏。</div>
                        </div>\`;
                    return;
                }

                infoSection.classList.remove('hidden');
                document.getElementById('evolutionChain').innerHTML = data.evolutionChain.map((p, idx) => \`
                    <div class="flex items-center">
                        <div onmouseenter="updateHUD('\${p.name}', \${JSON.stringify(p.types)})"
                             class="bg-zinc-950 p-6 rounded-[2.5rem] border border-zinc-900 hover:border-red-600 hover:scale-110 transition-all cursor-pointer min-w-[130px] text-center shadow-2xl relative group">
                            <div class="font-black text-white text-base mb-3 group-hover:neon-text-red transition-colors">\${p.name}</div>
                            <div class="flex gap-1.5 justify-center">\${getTypeBadges(p.types)}</div>
                        </div>
                        \${idx < data.evolutionChain.length - 1 ? '<i class="fa-solid fa-chevron-right mx-6 text-red-600 opacity-20 text-xl"></i>' : ''}
                    </div>\`).join('');
                
                const lastPoke = data.evolutionChain[data.evolutionChain.length - 1];
                updateHUD(lastPoke.name, lastPoke.types);

                if (data.events && data.events.length > 0) {
                    eventBanner.innerHTML = data.events.map(e => \`<div class="flex items-center gap-4 text-red-200 font-black">EVENT: \${e.eventName} [\${e.date}]</div>\`).join('');
                    eventBanner.classList.remove('hidden');
                }

                const filtered = data.results.filter(r => selectedLeagues.includes(r.leagueId));
                const others = data.results.filter(r => !selectedLeagues.includes(r.leagueId));

                const renderCard = (league) => \`
                    <div class="card-dark rounded-[3rem] overflow-hidden shadow-2xl border border-zinc-900">
                        <div class="p-10 bg-zinc-950/80 border-b border-zinc-900">
                            <h3 class="text-2xl font-black text-white tech-font uppercase tracking-tighter mb-2">\${league.leagueName}</h3>
                            <div class="flex items-center gap-3"><span class="w-12 h-1 bg-red-600"></span><span class="text-[9px] text-zinc-500 tech-font tracking-widest uppercase">Target Stream Analysis</span></div>
                        </div>
                        <div class="p-8 space-y-5">
                            \${league.pokemons.map(p => \`
                                <div class="p-6 rounded-[2rem] bg-zinc-900/40 border border-zinc-800/40 group hover:bg-zinc-900/70 transition-colors">
                                    <div class="flex justify-between items-start mb-4">
                                        <div><span class="text-[10px] font-black text-red-500 tech-font opacity-60 block">R-INDEX #\${p.rank}</span>
                                        <div class="text-2xl font-black text-zinc-100 group-hover:text-white">\${p.name}</div></div>
                                        <div class="text-right"><span class="text-[11px] bg-red-600 text-white px-3 py-1.5 rounded-xl font-black">\${p.rating}</span></div>
                                    </div>
                                    <div class="flex gap-2 mb-5">\${getTypeBadges(p.types)}</div>
                                    <div class="text-[13px] font-medium text-zinc-400 bg-black/60 p-5 rounded-[1.5rem] border border-zinc-800/50 font-mono italic">
                                        <i class="fa-solid fa-microchip text-red-900 mr-2"></i>\${p.moves}
                                    </div>
                                </div>\`).join('')}
                        </div>
                    </div>\`;

                resultsDiv.innerHTML = filtered.map(renderCard).join('') + 
                                     (others.length > 0 ? '<div class="col-span-full py-20 opacity-10 text-center tech-font text-sm tracking-[1.5em] text-zinc-800 uppercase italic">--- END OF BUFFERED STREAM ---</div>' : '') +
                                     others.map(renderCard).join('');

            } catch (e) { resultsDiv.innerHTML = '<div class="col-span-full text-center py-20 text-red-600 font-black">FATAL_ERROR: ' + e.message + '</div>'; }
        }
        document.getElementById('searchInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); });
    </script>
</body>
</html>
`;
}
async function getPokemonDataOnly(query, env, ctx) {
  // 1. 字串處理 (使用簡單替換代替複雜 Regex，省 CPU)
  let cleanQuery = query.trim();
  const CLEAN_CHARS = [" ", ".", "。", "!", "?", "！", "？", "(", ")", "（", "）", "shadow", "暗影"];
  CLEAN_CHARS.forEach(char => { cleanQuery = cleanQuery.split(char).join(""); });
  const finalQuery = cleanQuery.length > 0 ? cleanQuery : query;

  // 2. 取得基礎資料 (改用快取函數)
  const [data, movesData, eventsData] = await Promise.all([
    getJsonData('trans', "data/chinese_translation.json", env, ctx),
    getJsonData('moves', "data/move.json", env, ctx),
    getJsonData('events', "data/events.json", env, ctx)
  ]);

  // 3. 搜尋匹配 (邏輯不變)
  const isChi = /[\u4e00-\u9fa5]/.test(finalQuery);
  const lower = finalQuery.toLowerCase();
  const target = data.find(p => isChi ? p.speciesName.includes(finalQuery) : p.speciesId.toLowerCase().includes(lower));
  
  if (!target) return { results: [], allLeagues: leagues };

  // 4. 進化鏈處理
  const familyMembers = target.family && target.family.id 
    ? data.filter(p => p.family && p.family.id === target.family.id)
    : [target];

  const evolutionChain = familyMembers
    .filter(m => !m.speciesId.toLowerCase().includes("_shadow") && !m.speciesName.includes("暗影"))
    .map(m => ({
      name: getTranslatedName(m.speciesId, m.speciesName),
      id: m.speciesId,
      types: m.types || []
    }));

  const ids = new Set(familyMembers.map(p => p.speciesId.toLowerCase()));
  const pokemonMap = new Map(familyMembers.map(p => [p.speciesId.toLowerCase(), p]));

  // 5. ★★★ 關鍵修改：使用快取函數平行讀取所有聯盟 ★★★
  // 這一步原本最耗時，現在有快取後會變成 0ms
  const rankResults = await Promise.all(
    leagues.map(l => getLeagueRanking(l, env, ctx))
  );

  const finalResults = [];
  let hasElite = false;

  const formatMove = (moveId, eliteList, speciesId) => {
    if (!moveId) return "";
    let name = movesData[moveId] || moveId;
    let isElite = (eliteList && eliteList.includes(moveId)) || (speciesId === "florges" && moveId === "CHILLING_WATER");
    if (isElite) { name += "*"; hasElite = true; }
    return name;
  };

  // 6. 遍歷排名 (邏輯優化)
  rankResults.forEach((list, i) => {
    if (!list || list.length === 0) return;

    const leaguePokemons = [];
    // 使用 for...of 迴圈比 forEach 稍微省一點點 CPU
    for (const p of list) {
      const sid = p.speciesId.toLowerCase();
      // 使用 Set.has() 進行 O(1) 快速查找
      if (ids.has(sid)) {
        const rank = p.rank || p.tier || 0;
        // 稍微過濾掉太後面的排名以節省運算 (可選)
        if (typeof rank === "number" && rank > 300) continue;

        const rating = getPokemonRating(rank);
        if (rating === "垃圾") continue;

        const pDetail = pokemonMap.get(sid);
        const eliteList = pDetail ? pDetail.eliteMoves : [];

        let movesStr = "";
        let fastMoveId = p.moveFast;
        let chargedMoveIds = p.moveCharged;
        if (!fastMoveId && p.moveset) {
            fastMoveId = p.moveset[0];
            chargedMoveIds = p.moveset.slice(1);
        }

        if (fastMoveId) {
          const fast = formatMove(fastMoveId, eliteList, sid);
          const cMoves = Array.isArray(chargedMoveIds) ? chargedMoveIds : [chargedMoveIds];
          const charged = cMoves.filter(m => m).map(m => formatMove(m, eliteList, sid)).join(", ");
          movesStr = `${fast} / ${charged}`;
        }

        leaguePokemons.push({
          rank: rank,
          name: getTranslatedName(p.speciesId, pDetail ? pDetail.speciesName : p.speciesName),
          types: pDetail ? pDetail.types : [],
          score: p.score ? p.score.toFixed(1) : "N/A",
          rating: rating,
          moves: movesStr
        });
      }
    }

    if (leaguePokemons.length > 0) {
      finalResults.push({ leagueId: leagues[i].command, leagueName: leagues[i].name, pokemons: leaguePokemons });
    }
  });

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  const upcomingEvents = eventsData.filter(e => {
    const isMatch = familyMembers.some(p => e.pokemonId && e.pokemonId.includes(p.speciesId.toLowerCase()));
    const endDate = e.date ? (e.date.split(/[~～]/).pop()).trim() : null;
    return isMatch && (!endDate || endDate >= today);
  }).map(e => ({ eventName: e.eventName, date: e.date, link: e.link }));

  return {
    evolutionChain,
    results: finalResults,
    events: upcomingEvents,
    allLeagues: leagues.map(l => ({ id: l.command, name: l.name })),
    hasEliteWarning: hasElite,
    typeChart: typeChart
  };
}
// =========================================================
//  5. Worker Entry Point (必須放在最後)
// =========================================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === WEBHOOK_PATH) return handleWebhook(request, env, ctx);
      
      // 在 export default 的 fetch 函數內
      if (path === "/api/names") {
          try {
              const res = await fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx);
              const data = await res.json();
              
              // 過濾邏輯：只保留「不符合」NAME_CLEANER_REGEX 的名稱
              // 也就是排除掉包含 "起源"、"暗影" 等字眼的名稱
              const cleanNames = Array.from(new Set(
                  data.map(p => p.speciesName)
                      .filter(name => {
                          if (!name) return false;
                          // 使用 .test 檢查，且暫時移除全域旗標防止狀態偏移
                          const regex = new RegExp(NAME_CLEANER_REGEX.source);
                          return !regex.test(name);
                      })
              )).sort();
      
              return new Response(JSON.stringify(cleanNames), { 
                  headers: { "Content-Type": "application/json; charset=utf-8" } 
              });
          } catch (e) {
              return new Response(JSON.stringify([]), { status: 500 });
          }
      }

      if (path === "/api/search") {
        const query = url.searchParams.get("q");
        if (!query) return new Response(JSON.stringify({ error: "No query" }), { status: 400 });
        const result = await getPokemonDataOnly(query, env, ctx);
        return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json; charset=utf-8" } });
      }

      if (path === "/") {
        return new Response(generateHTML(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }

      return new Response("Not Found", { status: 404 });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }
};
