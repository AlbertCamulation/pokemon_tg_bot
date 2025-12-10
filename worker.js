// =========================================================
//  1. 設定與資料定義 (Constants & Data)
// =========================================================
const GITHUB_USERNAME = "AlbertCamulation";
const REPO_NAME = "pokemon_tg_bot";
const BRANCH_NAME = "main";
const WEBHOOK_PATH = "/endpoint";
const TRASH_LIST_PREFIX = "trash_pokemon_";
const ALLOWED_UID_KEY = "allowed_user_ids";
const LIMIT_LEAGUES_SHOW = 50;
const CACHE_TTL = 3600;

const NAME_CLEANER_REGEX = /\s*(一擊流|靈獸|冰凍|水流|普通|完全體|闇黑|拂曉之翼|黃昏之鬃|特大尺寸|普通尺寸|大尺寸|小尺寸|別種|裝甲|滿腹花紋|洗翠|Mega|X|Y|原始|起源|劍之王|盾之王|焰白|暗影|伽勒爾|極巨化|超極巨化|盾牌形態|阿羅拉|歌聲|・|覺悟|的樣子)/g;
const QUERY_CLEANER_REGEX = /[\s\d\.\u2070-\u209F\u00B0-\u00BE\u2460-\u24FF\u3251-\u32BF]+/g;

const leagues = [
  { command: "little_league_top", name: "小小盃 (500)", cp: "500", path: "data/rankings_500.json" },
  { command: "great_league_top", name: "超級聯盟 (1500)", cp: "1500", path: "data/rankings_1500.json" },
  { command: "great_league_top_remix", name: "超級 Remix (1500)", cp: "1500", path: "data/rankings_1500_remix.json" },
  { command: "great_league_championship2025", name: "冠軍賽 2025 (1500)", cp: "1500", path: "data/rankings_1500_LAIC_2025_Championship_Series_Cup.json" },
  { command: "halloween_cup_league_top_1500", name: "萬聖節盃 (1500)", cp: "1500", path: "data/rankings_1500_halloween.json" },
  { command: "retro_cup_top", name: "復古盃 (1500)", cp: "1500", path: "data/rankings_1500_retro.json" },
  { command: "summer_cup_top_1500", name: "夏日盃 (1500)", cp: "1500", path: "data/rankings_1500_summer.json" },
  { command: "willpower_cup_top_1500", name: "意志盃 (1500)", cp: "1500", path: "data/rankings_willpower_1500.json" },
  { command: "jungle_cup_top_1500", name: "叢林盃 (1500)", cp: "1500", path: "data/rankings_1500_jungle.json" },
  { command: "ultra_league_top", name: "高級聯盟 (2500)", cp: "2500", path: "data/rankings_2500.json" },
  { command: "summer_cup_top_2500", name: "夏日盃 (2500)", cp: "2500", path: "data/rankings_2500_summer.json" },
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
//  2. 基礎工具函數 (Utils & API Wrappers)
// =========================================================

async function fetchWithCache(url, env, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(url, { method: "GET" });
  let cachedRes = await cache.match(cacheKey);
  if (cachedRes) return cachedRes;

  const response = await fetch(url);
  if (!response.ok) return response;

  const bodyText = await response.text();
  if (!bodyText || bodyText.trim().length === 0) return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" }});

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", `public, max-age=${CACHE_TTL}`);
  headers.set("Content-Type", "application/json");

  const responseToCache = new Response(bodyText, { status: response.status, headers: headers });
  if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(cacheKey, responseToCache));
  else cache.put(cacheKey, responseToCache).catch(console.error);

  return new Response(bodyText, { status: response.status, headers: headers });
}

function getDataUrl(filename) {
  return `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${filename}?ver=1001`;
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

        // --- 活動檢查 ---
        // 檢查搜尋結果中的任何一隻寶可夢 (initialMatches)，是否出現在 eventsData 的 pokemonId 列表中
        const upcoming = eventsData.filter(e => {
            return initialMatches.some(p => {
                // e.pokemonId 是一個陣列 (例如 ["spheal"])
                // p.speciesId 是搜尋到的寶可夢 (例如 "spheal")
                return e.pokemonId.includes(p.speciesId.toLowerCase());
            });
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

  if (data.startsWith("untrash_btn_")) {
    const name = data.replace("untrash_btn_", "");
    await answerCallbackQuery(callbackQueryId, "正在移除...", env);
    return handleUntrashCommand(chatId, callbackQuery.from.id, [name], env);
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
    case "trash_list": return handleTrashCommand(chatId, callbackQuery.from.id, callbackQuery.from, env);
    case "help_menu": return sendHelpMessage(chatId, env);
    case "main_menu": return sendMainMenu(chatId, env);
    default: return;
  }
}

async function onMessage(message, env, ctx) {
  if (!message.text) return;
  const text = message.text.trim();
  const parts = text.split(" ");
  const command = parts[0].startsWith("/") ? parts[0].split("@")[0].substring(1) : null;
  const args = parts.slice(1);
  const chatId = message.chat.id;
  const userId = message.from.id;

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
      case "list_allowed_uid":
        const ids = await getAllowedUserIds(env);
        return sendMessage(chatId, ids.length ? `白名單:\n${ids.join("\n")}` : "白名單為空", null, env);
      case "allow_uid": return handleAllowUidCommand(chatId, args[0], env);
      case "del_uid": return handleDelUidCommand(chatId, args[0], env);
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

// =========================================================
//  5. Worker Entry Point (必須放在最後)
// =========================================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === WEBHOOK_PATH) return handleWebhook(request, env, ctx);
    if (url.pathname === "/registerWebhook") return registerWebhook(request, url, env);
    if (url.pathname === "/unRegisterWebhook") return unRegisterWebhook(env);
    return new Response("Pokemon Bot Running (Sorted & Fixed).", { status: 200 });
  }
};
