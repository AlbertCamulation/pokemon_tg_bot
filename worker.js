// --- 設定與常數 ---
const GITHUB_USERNAME = "AlbertCamulation";
const REPO_NAME = "pokemon_tg_bot";
const BRANCH_NAME = "main";
const WEBHOOK_PATH = "/endpoint";
const TRASH_LIST_PREFIX = "trash_pokemon_";
const ALLOWED_UID_KEY = "allowed_user_ids";
const LIMIT_LEAGUES_SHOW = 50;
const CACHE_TTL = 3600; // 快取 1 小時

// 名稱清理的正則表達式
const NAME_CLEANER_REGEX = /\s*(一擊流|靈獸|冰凍|水流|閃電|完全體|闇黑|拂曉之翼|黃昏之鬃|特大尺寸|普通尺寸|大尺寸|小尺寸|別種|裝甲|滿腹花紋|洗翠|Mega|X|Y|原始|起源|劍之王|盾之王|焰白|暗影|伽勒爾|極巨化|阿羅拉|的樣子)/g;

// 聯盟資料定義
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

// 屬性相剋表 (Type Chart)
const typeChart = {
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

const allTypes = Object.keys(typeChart);

// --- Cloudflare Worker Entry Point ---
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === WEBHOOK_PATH) return handleWebhook(request, env, ctx);
    if (url.pathname === "/registerWebhook") return registerWebhook(request, url, env);
    if (url.pathname === "/unRegisterWebhook") return unRegisterWebhook(env);
    return new Response("Pokemon Bot is running (Fixed ctx Scope).", { status: 200 });
  }
};

// --- 主要邏輯函數 ---

async function handleWebhook(request, env, ctx) {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (secret !== env.ENV_BOT_SECRET) return new Response("Unauthorized", { status: 403 });

  try {
    const update = await request.json();
    // 這裡我們傳入 ctx
    if (update.message) ctx.waitUntil(onMessage(update.message, env, ctx));
    else if (update.callback_query) ctx.waitUntil(onCallbackQuery(update.callback_query, env, ctx));
    return new Response("Ok");
  } catch (e) {
    console.error(e);
    return new Response("Error", { status: 500 });
  }
}

// 增加 ctx 參數
async function onCallbackQuery(callbackQuery, env, ctx) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data; 
  const callbackQueryId = callbackQuery.id;

  answerCallbackQuery(callbackQueryId, "", env).catch(console.error);

  const leagueInfo = leagues.find((l) => l.command === data);
  if (leagueInfo) return await handleLeagueCommand(chatId, data, LIMIT_LEAGUES_SHOW, env, ctx);

  switch (data) {
    case "meta_analysis": return handleMetaAnalysis(chatId, env, ctx); // 傳入 ctx
    case "trash_list": return handleTrashCommand(chatId, callbackQuery.from.id, callbackQuery.from, env);
    case "help_menu": return sendHelpMessage(chatId, env);
    case "main_menu": return sendMainMenu(chatId, env);
    default: return;
  }
}

// 增加 ctx 參數
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
    return await handleLeagueCommand(chatId, command, limit, env, ctx); // 傳入 ctx
  }

  if (command) {
    switch (command) {
      case "start": case "menu": return sendMainMenu(chatId, env);
      case "help": return sendHelpMessage(chatId, env);
      case "list_allowed_uid":
        const ids = await getAllowedUserIds(env);
        return sendMessage(chatId, ids.length ? `白名單:\n${ids.join("\n")}` : "白名單為空", null, env);
      case "allow_uid": return handleAllowUidCommand(chatId, args[0], env);
      case "del_uid": return handleDelUidCommand(chatId, args[0], env);
      case "trash":
        if (args.length > 0) {
          await addToTrashList(userId, args, env);
          return sendMessage(chatId, `已加入垃圾清單: ${args.join(", ")}`, null, env);
        } else return handleTrashCommand(chatId, userId, message.from, env);
      case "untrash": return handleUntrashCommand(chatId, userId, args, env);
      default: return;
    }
  }

  // 傳入 ctx
  if (text.length >= 2 && !text.startsWith("/")) return handlePokemonSearch(chatId, text, env, ctx);
}

// --- 核心功能: 屬性分析與組隊 ---

function calculateWeaknesses(types) {
  const weaknesses = {};
  allTypes.forEach(attackType => {
    let multiplier = 1.0;
    types.forEach(defType => {
      const typeLower = defType.toLowerCase();
      if (typeChart[attackType] && typeChart[attackType][typeLower] !== undefined) {
        multiplier *= typeChart[attackType][typeLower];
      }
    });
    weaknesses[attackType] = multiplier;
  });
  return weaknesses;
}

// 增加 ctx 參數
async function handleMetaAnalysis(chatId, env, ctx) {
  const targetLeagues = [
    leagues.find(l => l.command === "great_league_top"),
    leagues.find(l => l.command === "ultra_league_top"),
    leagues.find(l => l.command === "master_league_top")
  ];

  await sendMessage(chatId, `🔄 **正在分析三聯盟實時生態與屬性聯防，請稍候...**`, null, env);

  const transResponse = await fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx);
  if (!transResponse.ok) return sendMessage(chatId, "❌ 無法讀取翻譯資料庫", null, env);
  const allPokemonData = await transResponse.json();
  const idToNameMap = new Map(allPokemonData.map((p) => [p.speciesId.toLowerCase(), p.speciesName]));

  const getName = (p) => {
    let name = idToNameMap.get(p.speciesId.toLowerCase()) || p.speciesName;
    if (name === "Giratina (Altered)") name = "騎拉帝納 別種";
    else if (name === "Giratina (Altered) (Shadow)") name = "騎拉帝納 別種 暗影";
    else if (name === "Claydol (Shadow)") name = "念力土偶 暗影";
    return name;
  };

  for (const league of targetLeagues) {
    if (!league) continue;

    try {
      // 這裡傳入 ctx
      const response = await fetchWithCache(getDataUrl(league.path), env, ctx);
      if (!response.ok) {
        await sendMessage(chatId, `❌ 無法讀取 ${league.name} 資料`, null, env);
        continue;
      }
      
      const rankings = await response.json();
      if (rankings.length === 0) continue;

      const topOne = rankings[0];
      const topOneName = getName(topOne);
      const topOneScore = topOne.score ? topOne.score.toFixed(1) : "N/A";
      const topThree = rankings.slice(0, 3).map(p => getName(p));

      const teamBalanced = [topOne];
      const teamWeaknesses = [];

      if (topOne.types) {
        const w = calculateWeaknesses(topOne.types);
        Object.entries(w).forEach(([type, val]) => {
          if (val > 1.0) teamWeaknesses.push(type);
        });
      }

      for (let i = 1; i < Math.min(rankings.length, 40); i++) {
        const candidate = rankings[i];
        if (!candidate.types || teamBalanced.length >= 3) continue;
        if (teamBalanced.some(p => p.speciesId === candidate.speciesId)) continue;

        const candidateWeaknesses = calculateWeaknesses(candidate.types);
        let coversWeakness = false;
        
        if (teamWeaknesses.length > 0) {
          coversWeakness = teamWeaknesses.some(weakType => candidateWeaknesses[weakType] < 1.0);
        } else {
          coversWeakness = true; 
        }

        let addsNewWeakness = false;
        teamWeaknesses.forEach(weakType => {
           if (candidateWeaknesses[weakType] > 1.0) addsNewWeakness = true;
        });

        if (coversWeakness && !addsNewWeakness) {
          teamBalanced.push(candidate);
        }
      }

      let backupIndex = 1;
      while (teamBalanced.length < 3 && backupIndex < rankings.length) {
        const p = rankings[backupIndex++];
        if (!teamBalanced.some(existing => existing.speciesId === p.speciesId)) {
          teamBalanced.push(p);
        }
      }

      const balancedNames = teamBalanced.map(p => {
         const types = p.types ? `(${p.types.join("/")})` : "";
         return `${getName(p)} ${types}`;
      });

      let message = `📊 **${league.name} 本季生態分析報告**\n\n`;
      message += `👑 **${league.name.substring(0,2)}最強王者**\n👉 **${topOneName}** (評分: ${topOneScore})\n\n`;
      message += `⚔️ **暴力 T0 隊**\n`;
      message += `1️⃣ ${topThree[0]}\n2️⃣ ${topThree[1]}\n3️⃣ ${topThree[2]}\n\n`;
      message += `🛡️ **智慧聯防隊** (屬性互補)\n`;
      message += `1️⃣ ${balancedNames[0]} (核心)\n`;
      message += `2️⃣ ${balancedNames[1]} (掩護)\n`;
      message += `3️⃣ ${balancedNames[2]} (補位)\n`;

      await sendMessage(chatId, message, { parse_mode: "Markdown" }, env);

    } catch (e) {
      await sendMessage(chatId, `⚠️ ${league.name} 分析錯誤: ${e.message}`, null, env);
    }
  }
  await sendMessage(chatId, `💡 *資料來源：PvPoketw 實時數據 + 屬性相剋演算法*`, { parse_mode: "Markdown" }, env);
}

// --- 通用工具函數 ---

// ★★★ 修正: fetchWithCache 必須接收 ctx 並正確使用 ★★★
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
  
  // ★ 這裡使用 ctx 來確保快取寫入不會因為 Worker 結束而被中斷
  if (ctx && ctx.waitUntil) {
    ctx.waitUntil(cache.put(cacheKey, responseToCache));
  } else {
    // 如果因為某些原因 ctx 沒傳進來 (例如測試環境)，就不等待或直接報錯，但這裡做容錯處理
    cache.put(cacheKey, responseToCache).catch(console.error);
  }

  return new Response(bodyText, { status: response.status, headers: headers });
}

function getDataUrl(filename) {
  return `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${filename}?ver=2`;
}

// 增加 ctx 參數
async function handleLeagueCommand(chatId, command, limit = 50, env, ctx) {
  const leagueInfo = leagues.find((l) => l.command === command);
  if (!leagueInfo) return sendMessage(chatId, "未知的命令。", null, env);

  await sendMessage(chatId, `正在查詢 *${leagueInfo.name}* 前 ${limit} 名...`, null, env);

  try {
    const [response, transResponse] = await Promise.all([
      fetchWithCache(getDataUrl(leagueInfo.path), env, ctx),
      fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx)
    ]);

    if (!response.ok || !transResponse.ok) throw new Error("資料讀取失敗");

    const rankings = await response.json();
    const allPokemonData = await transResponse.json();
    const idToNameMap = new Map(allPokemonData.map((p) => [p.speciesId.toLowerCase(), p.speciesName]));

    const topRankings = rankings.slice(0, limit);
    let replyMessage = `🏆 *${leagueInfo.name}* (前 ${limit} 名) 🏆\n\n`;
    const copyableNames = [];

    topRankings.forEach((pokemon, rankIndex) => {
      let speciesName = idToNameMap.get(pokemon.speciesId.toLowerCase()) || pokemon.speciesName;
      if (!speciesName || typeof speciesName !== "string") return;

      if (speciesName === "Giratina (Altered)") speciesName = "騎拉帝納 別種";
      else if (speciesName === "Giratina (Altered) (Shadow)") speciesName = "騎拉帝納 別種 暗影";
      else if (speciesName === "Claydol (Shadow)") speciesName = "念力土偶 暗影";

      const cleanedName = speciesName.replace(NAME_CLEANER_REGEX, "").trim();
      if (cleanedName) copyableNames.push(cleanedName);

      let rankDisplay = pokemon.score !== undefined 
          ? (pokemon.rank ? `#${pokemon.rank}` : `#${rankIndex + 1}`) 
          : (pokemon.tier ? `(${pokemon.tier})` : "");
      
      const typesDisplay = pokemon.types && pokemon.types.length > 0 ? `(${pokemon.types.join(", ")})` : "";
      const cpDisplay = pokemon.cp ? ` CP: ${pokemon.cp}` : "";
      const score = pokemon.score && typeof pokemon.score === "number" ? `(${pokemon.score.toFixed(2)})` : "";

      replyMessage += `${rankDisplay} ${speciesName} ${typesDisplay}${cpDisplay} ${score}\n`;
    });

    if (copyableNames.length > 0) {
      const uniqueNames = [...new Set(copyableNames)];
      replyMessage += `\n*可複製清單:*\n\`\`\`\n${uniqueNames.join(",")}\n\`\`\``;
    }

    return sendMessage(chatId, replyMessage.trim(), null, env);
  } catch (e) {
    return sendMessage(chatId, `查詢失敗: ${e.message}`, null, env);
  }
}

// 增加 ctx 參數
async function handlePokemonSearch(chatId, query, env, ctx) {
  await sendMessage(chatId, `🔍 正在查詢與 "${query}" 相關的排名...`, null, env);
  try {
    const transResponse = await fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx);
    if (!transResponse.ok) throw new Error("無法載入寶可夢資料庫");
    
    const allPokemonData = await transResponse.json();
    const isChinese = /[\u4e00-\u9fa5]/.test(query);
    const lowerCaseQuery = query.toLowerCase();

    const initialMatches = allPokemonData.filter((p) => 
      isChinese ? p.speciesName.includes(query) : p.speciesId.toLowerCase().includes(lowerCaseQuery)
    );

    if (initialMatches.length === 0) return await sendMessage(chatId, `找不到與 "${query}" 相關的寶可夢。`, null, env);

    const familyIds = new Set(initialMatches.map((p) => p.family ? p.family.id : null).filter((id) => id));
    const familyMatches = allPokemonData.filter((p) => p.family && familyIds.has(p.family.id));
    const finalMatches = familyMatches.length > 0 ? familyMatches : initialMatches;
    
    const matchingIds = new Set(finalMatches.map((p) => p.speciesId.toLowerCase()));
    const idToNameMap = new Map(finalMatches.map((p) => [p.speciesId.toLowerCase(), p.speciesName]));

    const allLeagueRanks = await Promise.all(leagues.map((league) => 
      fetchWithCache(getDataUrl(league.path), env, ctx).then((res) => res.ok ? res.json() : null)
    ));

    let replyMessage = `🏆 與 <b>"${query}"</b> 相關的排名結果 🏆\n`;
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

    const nonTrashResults = collectedResults.filter((p) => p.rating !== "垃圾");

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
        replyMessage += `\n${leagueName}\n` + resultsByLeague[leagueName].join("\n") + "\n";
      }
    } else if (collectedResults.length > 0) {
      const representativeName = finalMatches.sort((a, b) => a.speciesName.length - b.speciesName.length)[0].speciesName;
      const cleanedRepName = representativeName.replace(NAME_CLEANER_REGEX, "").trim();
      replyMessage = `與 <b>"${query}"</b> 相關的寶可夢家族在所有聯盟中評價皆為垃圾。\n\n建議輸入 <code>/trash ${cleanedRepName}</code> 加入垃圾清單。`;
    } else {
      replyMessage = `在所有聯盟中都找不到與 "${query}" 相關的排名資料。`;
    }

    return await sendMessage(chatId, replyMessage.trim(), { parse_mode: "HTML" }, env);
  } catch (e) {
    return sendMessage(chatId, `搜尋錯誤: ${e.message}`, null, env);
  }
}

// 選單與說明
async function sendMainMenu(chatId, env) {
  const text = `🤖 *寶可夢 PvP 查詢機器人*

請選擇查詢項目，或直接輸入寶可夢名稱 (如: \`瑪力露麗\`) 進行搜尋。
`;
  const keyboard = generateMainMenu();
  await sendMessage(chatId, text, { inline_keyboard: keyboard }, env);
}

async function sendHelpMessage(chatId, env) {
  const helpText = `🤖 *使用說明*
🔍 輸入名稱查詢 (例: 瑪力露麗)
📊 點擊 Meta 分析查看最新生態
🗑️ /trash [名稱] 管理垃圾清單`;
  await sendMessage(chatId, helpText, { parse_mode: "Markdown" }, env);
}

function generateMainMenu() {
  const keyboard = [];
  const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
  const cat500 = leagues.filter(l => l.cp === "500");
  const cat1500 = leagues.filter(l => l.cp === "1500");
  const cat2500 = leagues.filter(l => l.cp === "2500");
  const catMaster = leagues.filter(l => l.cp === "10000");
  const catPvE = leagues.filter(l => l.cp === "Any");
  const addCategory = (title, items) => {
    const buttons = items.map(l => ({ text: l.name, callback_data: l.command }));
    keyboard.push(...chunk(buttons, 2)); 
  };
  keyboard.push([{ text: "📊 三聯盟 Meta 生態分析", callback_data: "meta_analysis" }]);
  addCategory("小小盃", cat500);
  keyboard.push([{ text: "--- 🏆 超級聯盟 (1500) ---", callback_data: "dummy" }]);
  addCategory("超級聯盟", cat1500);
  keyboard.push([{ text: "--- ⚔️ 高級聯盟 (2500) ---", callback_data: "dummy" }]);
  addCategory("高級聯盟", cat2500);
  keyboard.push([{ text: "--- 👑 大師聯盟 ---", callback_data: "dummy" }]);
  addCategory("大師聯盟", catMaster);
  keyboard.push([{ text: "--- 📊 PvE & 工具 ---", callback_data: "dummy" }]);
  addCategory("PvE", catPvE);
  keyboard.push([
    { text: "📝 我的垃圾清單", callback_data: "trash_list" },
    { text: "ℹ️ 操作說明", callback_data: "help_menu" }
  ]);
  return keyboard;
}

// KV Functions
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
async function handleTrashCommand(chatId, userId, messageFrom, env) {
  const trashList = await getTrashList(userId, env);
  const userName = messageFrom.first_name || "訓練家";
  if (trashList.length === 0) return sendMessage(chatId, `您好, ${userName}\n您的垃圾清單目前是空的。`, null, env);
  let replyMessage = `您好, ${userName}\n您的垃圾清單：\n\n<code>${trashList.join(",")}&!3*&!4*</code>`;
  return sendMessage(chatId, replyMessage, { parse_mode: "HTML" }, env);
}
async function handleUntrashCommand(chatId, userId, pokemonNames, env) {
  if (!env.POKEMON_KV) return;
  const currentList = await getTrashList(userId, env);
  const removed = [];
  pokemonNames.forEach((name) => {
    const idx = currentList.indexOf(name);
    if (idx > -1) { currentList.splice(idx, 1); removed.push(name); }
  });
  if (removed.length > 0) {
    await env.POKEMON_KV.put(TRASH_LIST_PREFIX + userId, JSON.stringify(currentList));
    return sendMessage(chatId, `已移除：${removed.join(", ")}`, null, env);
  }
  return sendMessage(chatId, "清單中找不到這些寶可夢。", null, env);
}
async function handleAllowUidCommand(chatId, uid, env) {
  if (!uid) return sendMessage(chatId, "請輸入 UID", null, env);
  let ids = await getAllowedUserIds(env);
  const newId = parseInt(uid);
  if (isNaN(newId)) return sendMessage(chatId, "無效 UID", null, env);
  if (ids.includes(newId)) return sendMessage(chatId, "已在白名單", null, env);
  ids.push(newId);
  await setAllowedUserIds(ids, env);
  return sendMessage(chatId, `已加入 UID: ${newId}`, null, env);
}
async function handleDelUidCommand(chatId, uid, env) {
  if (!uid) return sendMessage(chatId, "請輸入 UID", null, env);
  let ids = await getAllowedUserIds(env);
  const targetId = parseInt(uid);
  const idx = ids.indexOf(targetId);
  if (idx > -1) { ids.splice(idx, 1); await setAllowedUserIds(ids, env); return sendMessage(chatId, `已移除 UID: ${targetId}`, null, env); }
  return sendMessage(chatId, "不在白名單中", null, env);
}
function getPokemonRating(rank) {
  if (typeof rank === "number") { if (rank <= 10) return "🥇白金"; if (rank <= 25) return "🥇金"; if (rank <= 50) return "🥈銀"; if (rank <= 100) return "🥉銅"; }
  if (typeof rank === "string") { const map = { "S": "🥇白金", "A+": "🥇金", "A": "🥈銀", "B+": "🥉銅" }; return map[rank] || "垃圾"; }
  return "垃圾";
}
async function sendMessage(chatId, text, options = null, env) {
  const url = `https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/sendMessage`;
  const payload = { chat_id: chatId, text: text, parse_mode: "Markdown" };
  if (options) {
    if (options.inline_keyboard) payload.reply_markup = { inline_keyboard: options.inline_keyboard };
    if (options.parse_mode) payload.parse_mode = options.parse_mode;
  }
  await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}
async function answerCallbackQuery(callbackQueryId, text, env) {
  const url = `https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/answerCallbackQuery`;
  await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callback_query_id: callbackQueryId, text: text }) });
}
async function registerWebhook(request, url, env) {
  const webhookUrl = `${url.protocol}//${url.hostname}${WEBHOOK_PATH}`;
  const response = await fetch(`https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl, secret_token: env.ENV_BOT_SECRET })
  });
  return new Response(await response.text());
}
async function unRegisterWebhook(env) {
  const response = await fetch(`https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/deleteWebhook`);
  return new Response(await response.text());
}
