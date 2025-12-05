var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var GITHUB_USERNAME = "AlbertCamulation";
var REPO_NAME = "pokemon_tg_bot";
var BRANCH_NAME = "main";
var WEBHOOK_PATH = "/endpoint";
var TRASH_LIST_PREFIX = "trash_pokemon_";
var ALLOWED_UID_KEY = "allowed_user_ids";
var LIMIT_LEAGUES_SHOW = 50;
var CACHE_TTL = 3600;
var NAME_CLEANER_REGEX = /\s*(一擊流|靈獸|冰凍|水流|閃電|完全體|闇黑|拂曉之翼|黃昏之鬃|特大尺寸|普通尺寸|大尺寸|小尺寸|別種|裝甲|滿腹花紋|洗翠|Mega|X|Y|原始|起源|劍之王|盾之王|焰白|暗影|伽勒爾|極巨化|阿羅拉|的樣子)/g;
var leagues = [
  { command: "little_league_top", name: "\u5C0F\u5C0F\u76C3 (500)", cp: "500", path: "data/rankings_500.json" },
  { command: "great_league_top", name: "\u8D85\u7D1A\u806F\u76DF (1500)", cp: "1500", path: "data/rankings_1500.json" },
  { command: "great_league_top_remix", name: "\u8D85\u7D1A Remix", cp: "1500", path: "data/rankings_1500_remix.json" },
  { command: "great_league_championship2025", name: "\u51A0\u8ECD\u8CFD 2025", cp: "1500", path: "data/rankings_1500_LAIC_2025_Championship_Series_Cup.json" },
  { command: "halloween_cup_league_top_1500", name: "\u842C\u8056\u7BC0\u76C3", cp: "1500", path: "data/rankings_1500_halloween.json" },
  { command: "retro_cup_top", name: "\u5FA9\u53E4\u76C3", cp: "1500", path: "data/rankings_1500_retro.json" },
  { command: "summer_cup_top_1500", name: "\u590F\u65E5\u76C3 (1500)", cp: "1500", path: "data/rankings_1500_summer.json" },
  { command: "willpower_cup_top_1500", name: "\u610F\u5FD7\u76C3", cp: "1500", path: "data/rankings_willpower_1500.json" },
  { command: "jungle_cup_top_1500", name: "\u53E2\u6797\u76C3", cp: "1500", path: "data/rankings_1500_jungle.json" },
  { command: "ultra_league_top", name: "\u9AD8\u7D1A\u806F\u76DF (2500)", cp: "2500", path: "data/rankings_2500.json" },
  { command: "summer_cup_top_2500", name: "\u590F\u65E5\u76C3 (2500)", cp: "2500", path: "data/rankings_2500_summer.json" },
  { command: "master_league_top", name: "\u5927\u5E2B\u806F\u76DF (\u7121\u4E0A\u9650)", cp: "10000", path: "data/rankings_10000.json" },
  { command: "master_league_top_permier", name: "\u5927\u5E2B\u7D00\u5FF5\u8CFD", cp: "10000", path: "data/rankings_10000_premier.json" },
  { command: "master_league_top_meta", name: "\u5927\u5E2B Meta", cp: "10000", path: "data/rankings_meta_master_10000.json" },
  { command: "attackers_top", name: "\u6700\u4F73\u653B\u64CA\u624B", cp: "Any", path: "data/rankings_attackers_tier.json" },
  { command: "defenders_top", name: "\u6700\u4F73\u9632\u5B88\u8005", cp: "Any", path: "data/rankings_defenders_tier.json" }
];
// --- 新增：屬性定義與相剋表 ---
const typeNames = {
  normal: "一般", fire: "火", water: "水", electric: "電", grass: "草",
  ice: "冰", fighting: "格鬥", poison: "毒", ground: "地面", flying: "飛行",
  psychic: "超能", bug: "蟲", rock: "岩石", ghost: "幽靈", dragon: "龍",
  dark: "惡", steel: "鋼", fairy: "妖精"
};
var typeChart = {
  normal: { rock: 0.625, ghost: 0.39, steel: 0.625 },
  fire: { fire: 0.625, water: 0.625, grass: 1.6, ice: 1.6, bug: 1.6, rock: 0.625, dragon: 0.625, steel: 1.6 },
  water: { fire: 1.6, water: 0.625, grass: 0.625, ground: 1.6, rock: 1.6, dragon: 0.625 },
  electric: { water: 1.6, electric: 0.625, grass: 0.625, ground: 0.39, flying: 1.6, dragon: 0.625 },
  grass: { fire: 0.625, water: 1.6, grass: 0.625, poison: 0.625, ground: 1.6, flying: 0.625, bug: 0.625, rock: 1.6, dragon: 0.625, steel: 0.625 },
  ice: { fire: 0.625, water: 0.625, grass: 1.6, ice: 0.625, ground: 1.6, flying: 1.6, dragon: 1.6, steel: 0.625 },
  fighting: { normal: 1.6, ice: 1.6, poison: 0.625, flying: 0.625, psychic: 0.625, bug: 0.625, rock: 1.6, ghost: 0.39, dark: 1.6, steel: 1.6, fairy: 0.625 },
  poison: { grass: 1.6, poison: 0.625, ground: 0.625, rock: 0.625, ghost: 0.625, steel: 0.39, fairy: 1.6 },
  ground: { fire: 1.6, electric: 1.6, grass: 0.625, poison: 1.6, flying: 0.39, bug: 0.625, rock: 1.6, steel: 1.6 },
  flying: { electric: 0.625, grass: 1.6, fighting: 1.6, bug: 1.6, rock: 0.625, steel: 0.625 },
  psychic: { fighting: 1.6, poison: 1.6, psychic: 0.625, dark: 0.39, steel: 0.625 },
  bug: { fire: 0.625, grass: 1.6, fighting: 0.625, poison: 0.625, flying: 0.625, psychic: 1.6, ghost: 0.625, dark: 1.6, steel: 0.625, fairy: 0.625 },
  rock: { fire: 1.6, ice: 1.6, fighting: 0.625, ground: 0.625, flying: 1.6, bug: 1.6, steel: 0.625 },
  ghost: { normal: 0.39, psychic: 1.6, ghost: 1.6, dark: 0.625 },
  dragon: { dragon: 1.6, steel: 0.625, fairy: 0.39 },
  dark: { fighting: 0.625, psychic: 1.6, ghost: 1.6, dark: 0.625, fairy: 0.625 },
  steel: { fire: 0.625, water: 0.625, electric: 0.625, ice: 1.6, rock: 1.6, steel: 0.625, fairy: 1.6 },
  fairy: { fire: 0.625, fighting: 1.6, poison: 0.625, dragon: 1.6, dark: 1.6, steel: 0.625 }
};
var allTypes = Object.keys(typeChart);
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === WEBHOOK_PATH) return handleWebhook(request, env, ctx);
    if (url.pathname === "/registerWebhook") return registerWebhook(request, url, env);
    if (url.pathname === "/unRegisterWebhook") return unRegisterWebhook(env);
    return new Response("Pokemon Bot is running (Fixed ctx Scope).", { status: 200 });
  }
};
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
__name(handleWebhook, "handleWebhook");
async function onCallbackQuery(callbackQuery, env, ctx) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const callbackQueryId = callbackQuery.id;
  answerCallbackQuery(callbackQueryId, "", env).catch(console.error);
  // --- 修改：處理新按鈕事件 ---
  if (data === "menu_atk_types") return sendTypeSelectionMenu(chatId, "atk", env);
  if (data === "menu_def_types") return sendTypeSelectionMenu(chatId, "def", env);
  if (data.startsWith("type_atk_")) return handleTypeDetail(chatId, data.replace("type_atk_", ""), "atk", env);
  if (data.startsWith("type_def_")) return handleTypeDetail(chatId, data.replace("type_def_", ""), "def", env);
  const leagueInfo = leagues.find((l) => l.command === data);
  if (leagueInfo) return await handleLeagueCommand(chatId, data, LIMIT_LEAGUES_SHOW, env, ctx);
  switch (data) {
    case "meta_analysis":
      return handleMetaAnalysis(chatId, env, ctx);
    // 傳入 ctx
    case "trash_list":
      return handleTrashCommand(chatId, callbackQuery.from.id, callbackQuery.from, env);
    case "help_menu":
      return sendHelpMessage(chatId, env);
    case "main_menu":
      return sendMainMenu(chatId, env);
    default:
      return;
  }
}
__name(onCallbackQuery, "onCallbackQuery");
async function onMessage(message, env, ctx) {
  if (!message.text) return;
  const text = message.text.trim();
  const parts = text.split(" ");
  const command = parts[0].startsWith("/") ? parts[0].split("@")[0].substring(1) : null;
  const args = parts.slice(1);
  const chatId = message.chat.id;
  const userId = message.from.id;
  const leagueInfo = leagues.find((l) => l.command === command);
  if (leagueInfo) {
    const limit = parseInt(args[0], 10) || LIMIT_LEAGUES_SHOW;
    return await handleLeagueCommand(chatId, command, limit, env, ctx);
  }
  if (command) {
    switch (command) {
      case "start":
      case "menu":
        return sendMainMenu(chatId, env);
      case "help":
        return sendHelpMessage(chatId, env);
      case "list_allowed_uid":
        const ids = await getAllowedUserIds(env);
        return sendMessage(chatId, ids.length ? `\u767D\u540D\u55AE:
${ids.join("\n")}` : "\u767D\u540D\u55AE\u70BA\u7A7A", null, env);
      case "allow_uid":
        return handleAllowUidCommand(chatId, args[0], env);
      case "del_uid":
        return handleDelUidCommand(chatId, args[0], env);
      case "trash":
        if (args.length > 0) {
          await addToTrashList(userId, args, env);
          return sendMessage(chatId, `\u5DF2\u52A0\u5165\u5783\u573E\u6E05\u55AE: ${args.join(", ")}`, null, env);
        } else return handleTrashCommand(chatId, userId, message.from, env);
      case "untrash":
        return handleUntrashCommand(chatId, userId, args, env);
      default:
        return;
    }
  }
  if (text.length >= 2 && !text.startsWith("/")) return handlePokemonSearch(chatId, text, env, ctx);
}
__name(onMessage, "onMessage");
function calculateWeaknesses(types) {
  const weaknesses = {};
  allTypes.forEach((attackType) => {
    let multiplier = 1;
    types.forEach((defType) => {
      const typeLower = defType.toLowerCase();
      if (typeChart[attackType] && typeChart[attackType][typeLower] !== void 0) {
        multiplier *= typeChart[attackType][typeLower];
      }
    });
    weaknesses[attackType] = multiplier;
  });
  return weaknesses;
}
__name(calculateWeaknesses, "calculateWeaknesses");
// --- 修改：全新的 Meta 分析函數 (含屬性互補演算法) ---
async function handleMetaAnalysis(chatId, env, ctx) {
  const targetLeagues = [
    leagues.find((l) => l.command === "great_league_top"),
    leagues.find((l) => l.command === "ultra_league_top"),
    leagues.find((l) => l.command === "master_league_top")
  ];

  await sendMessage(chatId, `\u{1F504} <b>正在分析三聯盟實時生態與屬性聯防...</b>`, { parse_mode: "HTML" }, env);

  // 1. 獲取翻譯檔以取得屬性資料
  const transResponse = await fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx);
  if (!transResponse.ok) return sendMessage(chatId, "\u274C \u7121\u6CD5\u8B80\u53D6\u8CC7\u6599\u5EAB", null, env);
  
  const allPokemonData = await transResponse.json();
  const pokemonDetailMap = new Map(allPokemonData.map(p => [p.speciesId.toLowerCase(), p]));

  const getName = (p, forCopy = false) => {
    const detail = pokemonDetailMap.get(p.speciesId.toLowerCase());
    let name = detail ? detail.speciesName : p.speciesName;
    if (name === "Giratina (Altered)") name = "騎拉帝納 別種";
    else if (name === "Giratina (Altered) (Shadow)") name = "騎拉帝納 別種 暗影";
    else if (name === "Claydol (Shadow)") name = "念力土偶 暗影";
    
    if (forCopy) return name.replace(NAME_CLEANER_REGEX, "").trim();
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
      
      // 使用演算法建立隊伍
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

      let msg = `\u{1F4CA} <b>${league.name} 戰略分析</b>\n\n`;
      msg += `\u{1F451} <b>META 核心</b>\n\u{1F449} <b>${getName(topOne)}</b> (分: ${topOneScore})\n\n`;
      msg += `\u2694\uFE0F <b>暴力 T0 隊</b> (純強度)\n`;
      teamViolence.forEach((p, i) => msg += `${i+1}\uFE0F\u20E3 ${getName(p)} ${getTypesStr(p)}\n`);
      msg += `\n\u{1F6E1}\uFE0F <b>智慧聯防隊</b> (以王者為核)\n`;
      teamBalanced.forEach((p, i) => msg += `${i+1}\uFE0F\u20E3 ${getName(p)} ${getTypesStr(p)}\n`);
      msg += `\n\u{1F504} <b>二當家聯防隊</b> (替代方案)\n`;
      teamAlternative.forEach((p, i) => msg += `${i+1}\uFE0F\u20E3 ${getName(p)} ${getTypesStr(p)}\n`);
      msg += `\n\u{1F4CB} <b>一鍵複製搜尋字串</b>\n`;
      msg += `<code>${copyString}</code>`;

      await sendMessage(chatId, msg, { parse_mode: "HTML" }, env);
    } catch (e) { await sendMessage(chatId, `\u26A0\uFE0F ${league.name} 分析錯誤: ${e.message}`, null, env); }
  }
}
__name(handleMetaAnalysis, "handleMetaAnalysis");
__name(handleMetaAnalysis, "handleMetaAnalysis");
async function fetchWithCache(url, env, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(url, { method: "GET" });
  let cachedRes = await cache.match(cacheKey);
  if (cachedRes) return cachedRes;
  const response = await fetch(url);
  if (!response.ok) return response;
  const bodyText = await response.text();
  if (!bodyText || bodyText.trim().length === 0) return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", `public, max-age=${CACHE_TTL}`);
  headers.set("Content-Type", "application/json");
  const responseToCache = new Response(bodyText, { status: response.status, headers });
  if (ctx && ctx.waitUntil) {
    ctx.waitUntil(cache.put(cacheKey, responseToCache));
  } else {
    cache.put(cacheKey, responseToCache).catch(console.error);
  }
  return new Response(bodyText, { status: response.status, headers });
}
__name(fetchWithCache, "fetchWithCache");
function getDataUrl(filename) {
  return `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${filename}?ver=2`;
}
__name(getDataUrl, "getDataUrl");
async function handleLeagueCommand(chatId, command, limit = 50, env, ctx) {
  const leagueInfo = leagues.find((l) => l.command === command);
  if (!leagueInfo) return sendMessage(chatId, "\u672A\u77E5\u7684\u547D\u4EE4\u3002", null, env);
  await sendMessage(chatId, `\u6B63\u5728\u67E5\u8A62 *${leagueInfo.name}* \u524D ${limit} \u540D...`, null, env);
  try {
    const [response, transResponse] = await Promise.all([
      fetchWithCache(getDataUrl(leagueInfo.path), env, ctx),
      fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx)
    ]);
    if (!response.ok || !transResponse.ok) throw new Error("\u8CC7\u6599\u8B80\u53D6\u5931\u6557");
    const rankings = await response.json();
    const allPokemonData = await transResponse.json();
    const idToNameMap = new Map(allPokemonData.map((p) => [p.speciesId.toLowerCase(), p.speciesName]));
    const topRankings = rankings.slice(0, limit);
    let replyMessage = `\u{1F3C6} *${leagueInfo.name}* (\u524D ${limit} \u540D) \u{1F3C6}

`;
    const copyableNames = [];
    topRankings.forEach((pokemon, rankIndex) => {
      let speciesName = idToNameMap.get(pokemon.speciesId.toLowerCase()) || pokemon.speciesName;
      if (!speciesName || typeof speciesName !== "string") return;
      if (speciesName === "Giratina (Altered)") speciesName = "\u9A0E\u62C9\u5E1D\u7D0D \u5225\u7A2E";
      else if (speciesName === "Giratina (Altered) (Shadow)") speciesName = "\u9A0E\u62C9\u5E1D\u7D0D \u5225\u7A2E \u6697\u5F71";
      else if (speciesName === "Claydol (Shadow)") speciesName = "\u5FF5\u529B\u571F\u5076 \u6697\u5F71";
      const cleanedName = speciesName.replace(NAME_CLEANER_REGEX, "").trim();
      if (cleanedName) copyableNames.push(cleanedName);
      let rankDisplay = pokemon.score !== void 0 ? pokemon.rank ? `#${pokemon.rank}` : `#${rankIndex + 1}` : pokemon.tier ? `(${pokemon.tier})` : "";
      const typesDisplay = pokemon.types && pokemon.types.length > 0 ? `(${pokemon.types.join(", ")})` : "";
      const cpDisplay = pokemon.cp ? ` CP: ${pokemon.cp}` : "";
      const score = pokemon.score && typeof pokemon.score === "number" ? `(${pokemon.score.toFixed(2)})` : "";
      replyMessage += `${rankDisplay} ${speciesName} ${typesDisplay}${cpDisplay} ${score}
`;
    });
    if (copyableNames.length > 0) {
      const uniqueNames = [...new Set(copyableNames)];
      replyMessage += `
*\u53EF\u8907\u88FD\u6E05\u55AE:*
\`\`\`
${uniqueNames.join(",")}
\`\`\``;
    }
    return sendMessage(chatId, replyMessage.trim(), null, env);
  } catch (e) {
    return sendMessage(chatId, `\u67E5\u8A62\u5931\u6557: ${e.message}`, null, env);
  }
}
__name(handleLeagueCommand, "handleLeagueCommand");
async function handlePokemonSearch(chatId, query, env, ctx) {
  await sendMessage(chatId, `\u{1F50D} \u6B63\u5728\u67E5\u8A62\u8207 "${query}" \u76F8\u95DC\u7684\u6392\u540D...`, null, env);
  try {
    const transResponse = await fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx);
    if (!transResponse.ok) throw new Error("\u7121\u6CD5\u8F09\u5165\u5BF6\u53EF\u5922\u8CC7\u6599\u5EAB");
    const allPokemonData = await transResponse.json();
    const isChinese = /[\u4e00-\u9fa5]/.test(query);
    const lowerCaseQuery = query.toLowerCase();
    const initialMatches = allPokemonData.filter(
      (p) => isChinese ? p.speciesName.includes(query) : p.speciesId.toLowerCase().includes(lowerCaseQuery)
    );
    if (initialMatches.length === 0) return await sendMessage(chatId, `\u627E\u4E0D\u5230\u8207 "${query}" \u76F8\u95DC\u7684\u5BF6\u53EF\u5922\u3002`, null, env);
    const familyIds = new Set(initialMatches.map((p) => p.family ? p.family.id : null).filter((id) => id));
    const familyMatches = allPokemonData.filter((p) => p.family && familyIds.has(p.family.id));
    const finalMatches = familyMatches.length > 0 ? familyMatches : initialMatches;
    const matchingIds = new Set(finalMatches.map((p) => p.speciesId.toLowerCase()));
    const idToNameMap = new Map(finalMatches.map((p) => [p.speciesId.toLowerCase(), p.speciesName]));
    const allLeagueRanks = await Promise.all(leagues.map(
      (league) => fetchWithCache(getDataUrl(league.path), env, ctx).then((res) => res.ok ? res.json() : null)
    ));
    let replyMessage = `\u{1F3C6} \u8207 <b>"${query}"</b> \u76F8\u95DC\u7684\u6392\u540D\u7D50\u679C \u{1F3C6}
`;
    const collectedResults = [];
    allLeagueRanks.forEach((rankings, index) => {
      const league = leagues[index];
      if (!rankings) return;
      rankings.forEach((pokemon, rankIndex) => {
        if (matchingIds.has(pokemon.speciesId.toLowerCase())) {
          const rank = pokemon.rank || pokemon.tier || rankIndex + 1;
          collectedResults.push({
            league,
            rank,
            score: pokemon.score || pokemon.cp || "N/A",
            speciesName: idToNameMap.get(pokemon.speciesId.toLowerCase()) || pokemon.speciesName,
            types: pokemon.types,
            tier: pokemon.tier,
            cp: pokemon.cp,
            rating: getPokemonRating(rank)
          });
        }
      });
    });
    const nonTrashResults = collectedResults.filter((p) => p.rating !== "\u5783\u573E");
    if (nonTrashResults.length > 0) {
      const resultsByLeague = {};
      nonTrashResults.forEach((p) => {
        const leagueKey = `<b>${p.league.name}:</b>`;
        if (!resultsByLeague[leagueKey]) resultsByLeague[leagueKey] = [];
        let rankDisplay = typeof p.rank === "number" ? `#${p.rank}` : p.tier ? `(${p.tier})` : "";
        const score = p.score && typeof p.score === "number" ? `(${p.score.toFixed(2)})` : "";
        const types = p.types && p.types.length > 0 ? `(${p.types.join(", ")})` : "";
        resultsByLeague[leagueKey].push(`${rankDisplay} <code>${p.speciesName}</code> ${types}${p.cp ? ` CP:${p.cp}` : ""} ${score} - ${p.rating}`);
      });
      for (const leagueName in resultsByLeague) {
        replyMessage += `
${leagueName}
` + resultsByLeague[leagueName].join("\n") + "\n";
      }
    } else if (collectedResults.length > 0) {
      const representativeName = finalMatches.sort((a, b) => a.speciesName.length - b.speciesName.length)[0].speciesName;
      const cleanedRepName = representativeName.replace(NAME_CLEANER_REGEX, "").trim();
      replyMessage = `\u8207 <b>"${query}"</b> \u76F8\u95DC\u7684\u5BF6\u53EF\u5922\u5BB6\u65CF\u5728\u6240\u6709\u806F\u76DF\u4E2D\u8A55\u50F9\u7686\u70BA\u5783\u573E\u3002

\u5EFA\u8B70\u8F38\u5165 <code>/trash ${cleanedRepName}</code> \u52A0\u5165\u5783\u573E\u6E05\u55AE\u3002`;
    } else {
      replyMessage = `\u5728\u6240\u6709\u806F\u76DF\u4E2D\u90FD\u627E\u4E0D\u5230\u8207 "${query}" \u76F8\u95DC\u7684\u6392\u540D\u8CC7\u6599\u3002`;
    }
    return await sendMessage(chatId, replyMessage.trim(), { parse_mode: "HTML" }, env);
  } catch (e) {
    return sendMessage(chatId, `\u641C\u5C0B\u932F\u8AA4: ${e.message}`, null, env);
  }
}
__name(handlePokemonSearch, "handlePokemonSearch");
async function sendMainMenu(chatId, env) {
  const text = `\u{1F916} *\u5BF6\u53EF\u5922 PvP \u67E5\u8A62\u6A5F\u5668\u4EBA*

\u8ACB\u9078\u64C7\u67E5\u8A62\u9805\u76EE\uFF0C\u6216\u76F4\u63A5\u8F38\u5165\u5BF6\u53EF\u5922\u540D\u7A31 (\u5982: \`\u746A\u529B\u9732\u9E97\`) \u9032\u884C\u641C\u5C0B\u3002
`;
  const keyboard = generateMainMenu();
  await sendMessage(chatId, text, { inline_keyboard: keyboard }, env);
}
__name(sendMainMenu, "sendMainMenu");
async function sendHelpMessage(chatId, env) {
  const helpText = `🤖 <b>寶可夢 PvP 查詢機器人使用說明</b>

🔍 <b>基本查詢</b>
直接輸入寶可夢名稱 (中/英) 即可查看各聯盟排名、評級與建議。
範例：<code>瑪力露麗</code> 或 <code>Azumarill</code>

📊 <b>Meta 生態分析 (獨家功能)</b>
點擊選單中的「<b>三聯盟 Meta 生態分析</b>」，系統將計算：
1. 👑 <b>當季最強王者</b>：最值得投資的核心。
2. ⚔️ <b>暴力 T0 隊</b>：由排名最高的強勢角組成。
3. 🛡️ <b>智慧聯防隊</b>：透過演算法計算屬性互補。
4. 🔄 <b>二當家聯防隊</b>：若無最強王者的替代方案。
<i>(附帶遊戲內一鍵複製搜尋字串)</i>

⚖️ <b>屬性相剋查詢</b>
點擊「<b>攻擊/防禦屬性查詢</b>」，查看 Pokémon GO 專屬倍率：
• 💪 效果絕佳 (1.6x)
• 🛡️ 具有抗性 (0.625x)
• 🚫 雙抗/無效 (0.39x)

🗑️ <b>垃圾清單管理</b>
• <code>/trash [名稱]</code>：加入垃圾清單
• <code>/untrash [名稱]</code>：移除垃圾清單
• <code>/trash</code>：查看目前的清單 (可複製搜尋字串)

🔘 <b>常用指令</b>
• <code>/start</code> 或 <code>/menu</code>：喚醒圖形化主選單
• <code>/great_league_top</code>：查看超級聯盟排行
<i>(支援後方加數字自訂顯示數量，如：/great_league_top 10)</i>`;

  await sendMessage(chatId, helpText, { parse_mode: "HTML" }, env);
}
__name(sendHelpMessage, "sendHelpMessage");
function generateMainMenu() {
  const keyboard = [];
  const chunk = /* @__PURE__ */ __name((arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size)), "chunk");
  const cat500 = leagues.filter((l) => l.cp === "500");
  const cat1500 = leagues.filter((l) => l.cp === "1500");
  const cat2500 = leagues.filter((l) => l.cp === "2500");
  const catMaster = leagues.filter((l) => l.cp === "10000");
  const catPvE = leagues.filter((l) => l.cp === "Any");
  const addCategory = /* @__PURE__ */ __name((title, items) => {
    const buttons = items.map((l) => ({ text: l.name, callback_data: l.command }));
    keyboard.push(...chunk(buttons, 2));
  }, "addCategory");
  keyboard.push([{ text: "\u{1F4CA} \u4E09\u806F\u76DF Meta \u751F\u614B\u5206\u6790", callback_data: "meta_analysis" }]);
  addCategory("\u5C0F\u5C0F\u76C3", cat500);
  keyboard.push([{ text: "--- \u{1F3C6} \u8D85\u7D1A\u806F\u76DF (1500) ---", callback_data: "dummy" }]);
  addCategory("\u8D85\u7D1A\u806F\u76DF", cat1500);
  keyboard.push([{ text: "--- \u2694\uFE0F \u9AD8\u7D1A\u806F\u76DF (2500) ---", callback_data: "dummy" }]);
  addCategory("\u9AD8\u7D1A\u806F\u76DF", cat2500);
  keyboard.push([{ text: "--- \u{1F451} \u5927\u5E2B\u806F\u76DF ---", callback_data: "dummy" }]);
  addCategory("\u5927\u5E2B\u806F\u76DF", catMaster);
  keyboard.push([{ text: "--- \u{1F4CA} PvE & \u5DE5\u5177 ---", callback_data: "dummy" }]);
  addCategory("PvE", catPvE);
  keyboard.push([
    { text: "\u{1F4DD} \u6211\u7684\u5783\u573E\u6E05\u55AE", callback_data: "trash_list" },
    { text: "\u2139\uFE0F \u64CD\u4F5C\u8AAA\u660E", callback_data: "help_menu" }
  ]);
  // --- 修改：加入新功能按鈕 ---
  keyboard.push([
    { text: "\u2694\uFE0F 攻擊屬性查詢", callback_data: "menu_atk_types" }, 
    { text: "\uD83D\uDEE1\uFE0F 防禦屬性查詢", callback_data: "menu_def_types" }
  ]);
  return keyboard;
}
__name(generateMainMenu, "generateMainMenu");
async function getTrashList(userId, env) {
  if (!env.POKEMON_KV) return [];
  return await env.POKEMON_KV.get(TRASH_LIST_PREFIX + userId, "json") || [];
}
__name(getTrashList, "getTrashList");
async function addToTrashList(userId, pokemonNames, env) {
  if (!env.POKEMON_KV) return;
  const list = await getTrashList(userId, env);
  pokemonNames.forEach((name) => {
    if (name && !list.includes(name)) list.push(name);
  });
  await env.POKEMON_KV.put(TRASH_LIST_PREFIX + userId, JSON.stringify(list));
}
__name(addToTrashList, "addToTrashList");
async function getAllowedUserIds(env) {
  if (!env.POKEMON_KV) return [];
  return await env.POKEMON_KV.get(ALLOWED_UID_KEY, "json") || [];
}
__name(getAllowedUserIds, "getAllowedUserIds");
async function setAllowedUserIds(ids, env) {
  if (!env.POKEMON_KV) return;
  await env.POKEMON_KV.put(ALLOWED_UID_KEY, JSON.stringify(ids));
}
__name(setAllowedUserIds, "setAllowedUserIds");
async function handleTrashCommand(chatId, userId, messageFrom, env) {
  const trashList = await getTrashList(userId, env);
  const userName = messageFrom.first_name || "\u8A13\u7DF4\u5BB6";
  if (trashList.length === 0) return sendMessage(chatId, `\u60A8\u597D, ${userName}
\u60A8\u7684\u5783\u573E\u6E05\u55AE\u76EE\u524D\u662F\u7A7A\u7684\u3002`, null, env);
  let replyMessage = `\u60A8\u597D, ${userName}
\u60A8\u7684\u5783\u573E\u6E05\u55AE\uFF1A

<code>${trashList.join(",")}&!3*&!4*</code>`;
  return sendMessage(chatId, replyMessage, { parse_mode: "HTML" }, env);
}
__name(handleTrashCommand, "handleTrashCommand");
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
    return sendMessage(chatId, `\u5DF2\u79FB\u9664\uFF1A${removed.join(", ")}`, null, env);
  }
  return sendMessage(chatId, "\u6E05\u55AE\u4E2D\u627E\u4E0D\u5230\u9019\u4E9B\u5BF6\u53EF\u5922\u3002", null, env);
}
__name(handleUntrashCommand, "handleUntrashCommand");
async function handleAllowUidCommand(chatId, uid, env) {
  if (!uid) return sendMessage(chatId, "\u8ACB\u8F38\u5165 UID", null, env);
  let ids = await getAllowedUserIds(env);
  const newId = parseInt(uid);
  if (isNaN(newId)) return sendMessage(chatId, "\u7121\u6548 UID", null, env);
  if (ids.includes(newId)) return sendMessage(chatId, "\u5DF2\u5728\u767D\u540D\u55AE", null, env);
  ids.push(newId);
  await setAllowedUserIds(ids, env);
  return sendMessage(chatId, `\u5DF2\u52A0\u5165 UID: ${newId}`, null, env);
}
__name(handleAllowUidCommand, "handleAllowUidCommand");
async function handleDelUidCommand(chatId, uid, env) {
  if (!uid) return sendMessage(chatId, "\u8ACB\u8F38\u5165 UID", null, env);
  let ids = await getAllowedUserIds(env);
  const targetId = parseInt(uid);
  const idx = ids.indexOf(targetId);
  if (idx > -1) {
    ids.splice(idx, 1);
    await setAllowedUserIds(ids, env);
    return sendMessage(chatId, `\u5DF2\u79FB\u9664 UID: ${targetId}`, null, env);
  }
  return sendMessage(chatId, "\u4E0D\u5728\u767D\u540D\u55AE\u4E2D", null, env);
}
__name(handleDelUidCommand, "handleDelUidCommand");
function getPokemonRating(rank) {
  if (typeof rank === "number") {
    if (rank <= 10) return "\u{1F947}\u767D\u91D1";
    if (rank <= 25) return "\u{1F947}\u91D1";
    if (rank <= 50) return "\u{1F948}\u9280";
    if (rank <= 100) return "\u{1F949}\u9285";
  }
  if (typeof rank === "string") {
    const map = { "S": "\u{1F947}\u767D\u91D1", "A+": "\u{1F947}\u91D1", "A": "\u{1F948}\u9280", "B+": "\u{1F949}\u9285" };
    return map[rank] || "\u5783\u573E";
  }
  return "\u5783\u573E";
}
__name(getPokemonRating, "getPokemonRating");


// --- 新增：演算法與屬性查詢輔助函數 ---

// 屬性查詢功能選單
async function sendTypeSelectionMenu(chatId, mode, env) {
  const title = mode === "atk" ? "\u2694\uFE0F <b>攻擊屬性查詢</b>\n請選擇攻擊招式的屬性：" : "\uD83D\uDEE1\uFE0F <b>防禦屬性查詢</b>\n請選擇防守方(自己)的屬性：";
  const keyboard = [];
  const types = Object.keys(typeNames);
  for (let i = 0; i < types.length; i += 3) {
    const row = types.slice(i, i + 3).map(t => ({ text: typeNames[t], callback_data: `type_${mode}_${t}` }));
    keyboard.push(row);
  }
  keyboard.push([{ text: "\u{1F519} 回主選單", callback_data: "main_menu" }]);
  await sendMessage(chatId, title, { inline_keyboard: keyboard, parse_mode: "HTML" }, env);
}
__name(sendTypeSelectionMenu, "sendTypeSelectionMenu");

// 屬性詳細資料計算
async function handleTypeDetail(chatId, typeKey, mode, env) {
  const typeName = typeNames[typeKey];
  let msg = "";
  if (mode === "atk") {
    const strongAgainst = [];
    Object.entries(typeChart[typeKey]).forEach(([target, multiplier]) => {
      if (multiplier > 1.0) strongAgainst.push(`${typeNames[target]} (${multiplier}x)`);
    });
    msg = `\u2694\uFE0F <b>${typeName}屬性 (攻擊方)</b>\n\n\u{1F4AA} <b>效果絕佳 (1.6x)：</b>\n${strongAgainst.length ? strongAgainst.join("\n") : "無"}\n\n<i>(註：Pokemon GO 剋制倍率為 1.6)</i>`;
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
    msg = `\uD83D\uDEE1\uFE0F <b>${typeName}屬性 (防守方)</b>\n\n\u{1F6AB} <b>被雙抗/無效 (0.39x)：</b>\n${immuneTo.length ? immuneTo.join("\n") : "無"}\n\n\uD83D\uDEE1\uFE0F <b>具有抗性 (0.625x)：</b>\n${resistantTo.length ? resistantTo.join("\n") : "無"}\n`;
  }
  const keyboard = [[{ text: "\u{1F519} 回上一層", callback_data: `menu_${mode}_types` }]];
  await sendMessage(chatId, msg, { inline_keyboard: keyboard, parse_mode: "HTML" }, env);
}
__name(handleTypeDetail, "handleTypeDetail");

// 組隊演算法相關
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
__name(getDefenseProfile, "getDefenseProfile");

function getWeaknesses(defTypes) {
  const profile = getDefenseProfile(defTypes);
  return Object.entries(profile).filter(([type, val]) => val > 1.0).map(([type]) => type);
}
__name(getWeaknesses, "getWeaknesses");

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
__name(findBestPartner, "findBestPartner");

function buildBalancedTeam(leader, rankings, map) {
  const team = [leader];
  const partner1 = findBestPartner(rankings, team, map);
  if (partner1) team.push(partner1);
  const partner2 = findBestPartner(rankings, team, map);
  if (partner2) team.push(partner2);
  return team;
}
__name(buildBalancedTeam, "buildBalancedTeam");

async function sendMessage(chatId, text, options = null, env) {
  const url = `https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/sendMessage`;
  const payload = { chat_id: chatId, text, parse_mode: "Markdown" };
  if (options) {
    if (options.inline_keyboard) payload.reply_markup = { inline_keyboard: options.inline_keyboard };
    if (options.parse_mode) payload.parse_mode = options.parse_mode;
  }
  await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}
__name(sendMessage, "sendMessage");
async function answerCallbackQuery(callbackQueryId, text, env) {
  const url = `https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/answerCallbackQuery`;
  await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callback_query_id: callbackQueryId, text }) });
}
__name(answerCallbackQuery, "answerCallbackQuery");
async function registerWebhook(request, url, env) {
  const webhookUrl = `${url.protocol}//${url.hostname}${WEBHOOK_PATH}`;
  const response = await fetch(`https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl, secret_token: env.ENV_BOT_SECRET })
  });
  return new Response(await response.text());
}
__name(registerWebhook, "registerWebhook");
async function unRegisterWebhook(env) {
  const response = await fetch(`https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/deleteWebhook`);
  return new Response(await response.text());
}
__name(unRegisterWebhook, "unRegisterWebhook");
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
