// --- 設定與常數 ---
const GITHUB_USERNAME = "AlbertCamulation";
const REPO_NAME = "pokemon_tg_bot";
const BRANCH_NAME = "main";
const WEBHOOK_PATH = "/endpoint";
const TRASH_LIST_PREFIX = "trash_pokemon_";
const ALLOWED_UID_KEY = "allowed_user_ids";
const LIMIT_LEAGUES_SHOW = 50;
const CACHE_TTL = 3600;

// 名稱清理
const NAME_CLEANER_REGEX = /\s*(一擊流|靈獸|冰凍|水流|閃電|完全體|闇黑|拂曉之翼|黃昏之鬃|特大尺寸|普通尺寸|大尺寸|小尺寸|別種|裝甲|滿腹花紋|洗翠|Mega|X|Y|原始|起源|劍之王|盾之王|焰白|暗影|伽勒爾|極巨化|阿羅拉|的樣子)/g;

// 聯盟定義
const leagues = [
  { command: "little_league_top", name: "小小盃 (500)", cp: "500", path: "data/rankings_500.json" },
  { command: "great_league_top", name: "超級聯盟 (1500)", cp: "1500", path: "data/rankings_1500.json" },
  { command: "great_league_top_remix", name: "超級 Remix", cp: "1500", path: "data/rankings_1500_remix.json" },
  { command: "great_league_championship2025", name: "冠軍賽 2025", cp: "1500", path: "data/rankings_1500_LAIC_2025_Championship_Series_Cup.json" },
  { command: "halloween_cup_league_top_1500", name: "萬聖節盃", cp: "1500", path: "data/rankings_1500_halloween.json" },
  { command: "retro_cup_top", name: "復古盃", cp: "1500", path: "data/rankings_1500_retro.json" },
  { command: "summer_cup_top_1500", name: "夏日盃 (1500)", cp: "1500", path: "data/rankings_1500_summer.json" },
  { command: "willpower_cup_top_1500", name: "意志盃", cp: "1500", path: "data/rankings_willpower_1500.json" },
  { command: "jungle_cup_top_1500", name: "叢林盃", cp: "1500", path: "data/rankings_1500_jungle.json" },
  { command: "ultra_league_top", name: "高級聯盟 (2500)", cp: "2500", path: "data/rankings_2500.json" },
  { command: "summer_cup_top_2500", name: "夏日盃 (2500)", cp: "2500", path: "data/rankings_2500_summer.json" },
  { command: "master_league_top", name: "大師聯盟 (無上限)", cp: "10000", path: "data/rankings_10000.json" },
  { command: "master_league_top_permier", name: "大師紀念賽", cp: "10000", path: "data/rankings_10000_premier.json" },
  { command: "master_league_top_meta", name: "大師 Meta", cp: "10000", path: "data/rankings_meta_master_10000.json" },
  { command: "attackers_top", name: "最佳攻擊手", cp: "Any", path: "data/rankings_attackers_tier.json" },
  { command: "defenders_top", name: "最佳防守者", cp: "Any", path: "data/rankings_defenders_tier.json" }
];

// --- Pokémon GO 專屬屬性相剋表 ---
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

// --- Worker Entry ---
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === WEBHOOK_PATH) return handleWebhook(request, env, ctx);
    if (url.pathname === "/registerWebhook") return registerWebhook(request, url, env);
    if (url.pathname === "/unRegisterWebhook") return unRegisterWebhook(env);
    return new Response("Pokemon Bot Running (Fixed sendMessage).", { status: 200 });
  }
};

// --- Webhook Handlers ---
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

async function onCallbackQuery(callbackQuery, env, ctx) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const callbackQueryId = callbackQuery.id;

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
      default: return;
    }
  }

  if (text.length >= 2 && !text.startsWith("/")) return handlePokemonSearch(chatId, text, env, ctx);
}

// --- 屬性計算核心 ---

function getDefenseProfile(defTypes) {
  const profile = {};
  allTypes.forEach(attackType => {
    let multiplier = 1.0;
    defTypes.forEach(t => {
      const typeLower = t.toLowerCase();
      let factor = 1.0;
      if (typeChart[attackType] && typeChart[attackType][typeLower] !== undefined) {
        factor = typeChart[attackType][typeLower];
      }
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

// 核心演算法：尋找最佳隊友 (互補評分制)
function findBestPartner(rankings, currentTeam, pokemonTypeMap) {
  const teamWeaknessCounts = {}; 
  currentTeam.forEach(p => {
    const pInfo = pokemonTypeMap.get(p.speciesId.toLowerCase());
    if (pInfo && pInfo.types) {
      const weaknesses = getWeaknesses(pInfo.types);
      weaknesses.forEach(w => {
        teamWeaknessCounts[w] = (teamWeaknessCounts[w] || 0) + 1;
      });
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

    urgentWeaknesses.forEach(weakType => {
      if (candProfile[weakType] < 1.0) {
        const weight = teamWeaknessCounts[weakType] || 1;
        score += (20 * weight); 
      }
    });

    urgentWeaknesses.forEach(weakType => {
      if (candProfile[weakType] > 1.0) {
        const weight = teamWeaknessCounts[weakType] || 1;
        score -= (30 * weight); 
      }
    });

    candWeaknesses.forEach(w => {
      let covered = false;
      currentTeam.forEach(teammate => {
        const tInfo = pokemonTypeMap.get(teammate.speciesId.toLowerCase());
        if (tInfo) {
          const tProfile = getDefenseProfile(tInfo.types);
          if (tProfile[w] < 1.0) covered = true;
        }
      });
      if (covered) score += 5; 
      else score -= 5;
    });

    const rankIndex = rankings.indexOf(candidate);
    score -= (rankIndex * 0.5); 

    if (score > bestScore) {
      bestScore = score;
      bestPartner = candidate;
    }
  }

  if (!bestPartner || bestScore < -50) {
    bestPartner = searchPool.find(p => !currentTeam.some(m => m.speciesId === p.speciesId));
  }

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

// ★★★ 三聯盟 Meta 分析 ★★★
async function handleMetaAnalysis(chatId, env, ctx) {
  const targetLeagues = [
    leagues.find(l => l.command === "great_league_top"),
    leagues.find(l => l.command === "ultra_league_top"),
    leagues.find(l => l.command === "master_league_top")
  ];

  await sendMessage(chatId, `🔄 **正在分析三聯盟實時生態與屬性聯防...**`, null, env);

  const transResponse = await fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx);
  if (!transResponse.ok) return sendMessage(chatId, "❌ 無法讀取資料庫", null, env);
  
  const allPokemonData = await transResponse.json();
  const pokemonDetailMap = new Map(allPokemonData.map(p => [p.speciesId.toLowerCase(), p]));

  const getName = (p, forCopy = false) => {
    const detail = pokemonDetailMap.get(p.speciesId.toLowerCase());
    let name = detail ? detail.speciesName : p.speciesName;
    
    if (name === "Giratina (Altered)") name = "騎拉帝納 別種";
    else if (name === "Giratina (Altered) (Shadow)") name = "騎拉帝納 別種 暗影";
    else if (name === "Claydol (Shadow)") name = "念力土偶 暗影";
    
    if (forCopy) {
      return name.replace(NAME_CLEANER_REGEX, "").trim();
    }
    return name;
  };

  const getTypesStr = (p) => {
    const detail = pokemonDetailMap.get(p.speciesId.toLowerCase());
    if (!detail || !detail.types) return "";
    return `(${detail.types.join("/")})`; 
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
      if (teamBalanced.some(p => p.speciesId === altLeader.speciesId)) {
         altLeader = rankings[2];
      }
      const teamAlternative = buildBalancedTeam(altLeader, rankings, pokemonDetailMap);

      const copySet = new Set();
      [...teamViolence, ...teamBalanced, ...teamAlternative].forEach(p => {
        const cleanName = getName(p, true); 
        if (cleanName) copySet.add(cleanName);
      });
      const copyString = [...copySet].join(",");

      let msg = `📊 **${league.name} 戰略分析**\n\n`;
      msg += `👑 **META 核心**\n👉 **${getName(topOne)}** (分: ${topOneScore})\n\n`;
      msg += `⚔️ **暴力 T0 隊** (純強度)\n`;
      teamViolence.forEach((p, i) => msg += `${i+1}️⃣ ${getName(p)} ${getTypesStr(p)}\n`);
      msg += `\n🛡️ **智慧聯防隊** (以王者為核)\n`;
      teamBalanced.forEach((p, i) => msg += `${i+1}️⃣ ${getName(p)} ${getTypesStr(p)}\n`);
      msg += `\n🔄 **二當家聯防隊** (替代方案)\n`;
      teamAlternative.forEach((p, i) => msg += `${i+1}️⃣ ${getName(p)} ${getTypesStr(p)}\n`);
      msg += `\n📋 **一鍵複製搜尋字串**\n`;
      msg += `\`\`\`\n${copyString}\n\`\`\``;

      await sendMessage(chatId, msg, { parse_mode: "Markdown" }, env);

    } catch (e) {
      await sendMessage(chatId, `⚠️ ${league.name} 分析錯誤: ${e.message}`, null, env);
    }
  }
}

// --- 通用工具 ---

async function fetchWithCache(url, env, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(url, { method: "GET" });
  let cachedRes = await cache.match(cacheKey);
  if (cachedRes) return cachedRes;

  const response = await fetch(url);
  if (!response.ok) return response;

  const bodyText = await response.text();
  if (!bodyText) return new Response("[]", { status: 200 });

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", `public, max-age=${CACHE_TTL}`);
  headers.set("Content-Type", "application/json");

  const responseToCache = new Response(bodyText, { status: response.status, headers: headers });
  if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(cacheKey, responseToCache));
  else cache.put(cacheKey, responseToCache).catch(console.error);

  return new Response(bodyText, { status: response.status, headers: headers });
}

function getDataUrl(filename) {
  return `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${filename}?ver=5`;
}

async function handleLeagueCommand(chatId, command, limit = 50, env, ctx) {
  const leagueInfo = leagues.find((l) => l.command === command);
  if (!leagueInfo) return sendMessage(chatId, "未知的命令。", null, env);
  await sendMessage(chatId, `查詢 *${leagueInfo.name}*...`, null, env);
  try {
    const [resRank, resTrans] = await Promise.all([
      fetchWithCache(getDataUrl(leagueInfo.path), env, ctx),
      fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx)
    ]);
    const rankings = await resRank.json();
    const trans = await resTrans.json();
    const map = new Map(trans.map(p => [p.speciesId.toLowerCase(), p.speciesName]));
    const list = rankings.slice(0, limit);
    let msg = `🏆 *${leagueInfo.name}* (Top ${limit})\n\n`;
    const copyList = [];
    list.forEach((p, i) => {
      let name = map.get(p.speciesId.toLowerCase()) || p.speciesName;
      if (name === "Giratina (Altered)") name = "騎拉帝納 別種";
      const clean = name.replace(NAME_CLEANER_REGEX, "").trim();
      if (clean) copyList.push(clean);
      const rank = p.rank ? `#${p.rank}` : `(${p.tier})`;
      msg += `${rank} ${name} ${p.cp ? `CP:${p.cp}` : ""} ${p.score ? `(${p.score.toFixed(1)})` : ""}\n`;
    });
    if(copyList.length) msg += `\n\`\`\`\n${[...new Set(copyList)].join(",")}\n\`\`\``;
    return sendMessage(chatId, msg, null, env);
  } catch(e) { return sendMessage(chatId, `Error: ${e.message}`, null, env); }
}

async function handlePokemonSearch(chatId, query, env, ctx) {
  await sendMessage(chatId, `🔍 查詢 "${query}"...`, null, env);
  try {
    const res = await fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx);
    const data = await res.json();
    const isChi = /[\u4e00-\u9fa5]/.test(query);
    const lower = query.toLowerCase();
    const matches = data.filter(p => isChi ? p.speciesName.includes(query) : p.speciesId.toLowerCase().includes(lower));
    if(!matches.length) return sendMessage(chatId, "找不到寶可夢", null, env);
    
    const ids = new Set(matches.map(p => p.speciesId.toLowerCase()));
    const map = new Map(matches.map(p => [p.speciesId.toLowerCase(), p.speciesName]));
    
    const rankResults = await Promise.all(leagues.map(l => fetchWithCache(getDataUrl(l.path), env, ctx).then(r => r.ok ? r.json() : null)));
    
    let msg = `🏆 *"${query}" 排名*\n`;
    rankResults.forEach((list, i) => {
      if(!list) return;
      list.forEach(p => {
        if(ids.has(p.speciesId.toLowerCase())) {
           const rank = p.rank ? `#${p.rank}` : `(${p.tier})`;
           msg += `\n${leagues[i].name}: ${rank} ${map.get(p.speciesId.toLowerCase())} ${p.score ? `(${p.score.toFixed(1)})` : ""}`;
        }
      });
    });
    return sendMessage(chatId, msg, null, env);
  } catch(e) { return sendMessage(chatId, `Error: ${e.message}`, null, env); }
}

async function sendMainMenu(chatId, env) {
  const text = "🤖 *PvP 查詢機器人*";
  const keyboard = generateMainMenu();
  await sendMessage(chatId, text, { inline_keyboard: keyboard }, env);
}

function generateMainMenu() {
  const keyboard = [];
  const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
  const add = (items) => {
    const btns = items.map(l => ({ text: l.name, callback_data: l.command }));
    keyboard.push(...chunk(btns, 2));
  };
  keyboard.push([{ text: "📊 三聯盟 Meta 生態分析", callback_data: "meta_analysis" }]);
  const groups = {
    "🏆 超級 (1500)": leagues.filter(l => l.cp === "1500"),
    "⚔️ 高級 (2500)": leagues.filter(l => l.cp === "2500"),
    "👑 大師 (Max)": leagues.filter(l => l.cp === "10000"),
    "📊 PvE": leagues.filter(l => l.cp === "Any")
  };
  for (const [title, items] of Object.entries(groups)) {
    keyboard.push([{ text: `--- ${title} ---`, callback_data: "dummy" }]);
    add(items);
  }
  keyboard.push([{ text: "📝 垃圾清單", callback_data: "trash_list" }, { text: "ℹ️ 說明", callback_data: "help_menu" }]);
  return keyboard;
}

// 輔助功能
async function sendHelpMessage(chatId, env) { sendMessage(chatId, "輸入名稱查詢，或使用選單功能。", null, env); }
async function getAllowedUserIds(env) { return (await env.POKEMON_KV?.get(ALLOWED_UID_KEY, "json")) || []; }
async function setAllowedUserIds(ids, env) { await env.POKEMON_KV?.put(ALLOWED_UID_KEY, JSON.stringify(ids)); }
async function getTrashList(uid, env) { return (await env.POKEMON_KV?.get(TRASH_LIST_PREFIX + uid, "json")) || []; }
async function addToTrashList(uid, names, env) {
  const list = await getTrashList(uid, env);
  names.forEach(n => { if(!list.includes(n)) list.push(n); });
  await env.POKEMON_KV?.put(TRASH_LIST_PREFIX + uid, JSON.stringify(list));
}
async function handleTrashCommand(chatId, uid, from, env) {
  const list = await getTrashList(uid, env);
  sendMessage(chatId, list.length ? `垃圾清單:\n<code>${list.join(",")}&!3*&!4*</code>` : "清單為空", {parse_mode: "HTML"}, env);
}
async function handleUntrashCommand(chatId, uid, names, env) {
  const list = await getTrashList(uid, env);
  const newList = list.filter(n => !names.includes(n));
  await env.POKEMON_KV?.put(TRASH_LIST_PREFIX + uid, JSON.stringify(newList));
  sendMessage(chatId, "已移除", null, env);
}
async function handleAllowUidCommand(chatId, uid, env) {
  const ids = await getAllowedUserIds(env);
  if(!ids.includes(+uid)) { ids.push(+uid); await setAllowedUserIds(ids, env); }
  sendMessage(chatId, "Added", null, env);
}
async function handleDelUidCommand(chatId, uid, env) {
  const ids = await getAllowedUserIds(env);
  await setAllowedUserIds(ids.filter(i => i !== +uid), env);
  sendMessage(chatId, "Removed", null, env);
}
function getPokemonRating(rank) {
  if (typeof rank === "number") { if (rank <= 10) return "🥇白金"; if (rank <= 25) return "🥇金"; if (rank <= 50) return "🥈銀"; if (rank <= 100) return "🥉銅"; }
  if (typeof rank === "string") { const map = { "S": "🥇白金", "A+": "🥇金", "A": "🥈銀", "B+": "🥉銅" }; return map[rank] || "垃圾"; }
  return "垃圾";
}

// 修正後的 sendMessage，正確處理 options
async function sendMessage(chatId, text, options = null, env) {
  const payload = { 
    chat_id: chatId, 
    text: text, 
    parse_mode: "Markdown" 
  };

  if (options) {
    if (options.inline_keyboard) {
      payload.reply_markup = { inline_keyboard: options.inline_keyboard };
    }
    if (options.parse_mode) {
      payload.parse_mode = options.parse_mode;
    }
  }
  
  await fetch(`https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/sendMessage`, {
    method: "POST", 
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload) 
  });
}

async function answerCallbackQuery(id, text, env) {
  fetch(`https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: id, text })
  });
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
