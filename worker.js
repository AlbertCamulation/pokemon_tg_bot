var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var GITHUB_USERNAME = "AlbertCamulation";
var REPO_NAME = "pokemon_tg_bot";
var BRANCH_NAME = "main";
var WEBHOOK_PATH = "/endpoint";
var TRASH_LIST_PREFIX = "trash_pokemon_";
var ALLOWED_UID_KEY = "allowed_user_ids";
var LIMIT_LEAGUES_SHOW = 50;
var CACHE_TTL = 3600;
var NAME_CLEANER_REGEX = /\s*(一擊流|靈獸|冰凍|水流|閃電|完全體|闇黑|拂曉之翼|黃昏之鬃|特大尺寸|普通尺寸|大尺寸|小尺寸|別種|裝甲|滿腹花紋|洗翠|Mega|X|Y|原始|起源|劍之王|盾之王|焰白|暗影|伽勒爾|極巨化|阿羅拉|的樣子)/g;
var QUERY_CLEANER_REGEX = /[\s\d\.\u2070-\u209F\u00B0-\u00BE\u2460-\u24FF\u3251-\u32BF]+/g;

var leagues = [
  { command: "little_league_top", name: "\u5C0F\u5C0F\u76C3 (500)", cp: "500", path: "data/rankings_500.json" },
  { command: "great_league_top", name: "\u8D85\u7D1A\u806F\u76DF (1500)", cp: "1500", path: "data/rankings_1500.json" },
  { command: "great_league_top_remix", name: "\u8D85\u7D1A Remix (1500)", cp: "1500", path: "data/rankings_1500_remix.json" },
  { command: "great_league_championship2025", name: "\u51A0\u8ECD\u8CFD 2025 (1500)", cp: "1500", path: "data/rankings_1500_LAIC_2025_Championship_Series_Cup.json" },
  { command: "halloween_cup_league_top_1500", name: "\u842C\u8056\u7BC0\u76C3 (1500)", cp: "1500", path: "data/rankings_1500_halloween.json" },
  { command: "retro_cup_top", name: "\u5FA9\u53E4\u76C3 (1500)", cp: "1500", path: "data/rankings_1500_retro.json" },
  { command: "summer_cup_top_1500", name: "\u590F\u65E5\u76C3 (1500)", cp: "1500", path: "data/rankings_1500_summer.json" },
  { command: "willpower_cup_top_1500", name: "\u610F\u5FD7\u76C3 (1500)", cp: "1500", path: "data/rankings_willpower_1500.json" },
  { command: "jungle_cup_top_1500", name: "\u53E2\u6797\u76C3 (1500)", cp: "1500", path: "data/rankings_1500_jungle.json" },
  { command: "ultra_league_top", name: "\u9AD8\u7D1A\u806F\u76DF (2500)", cp: "2500", path: "data/rankings_2500.json" },
  { command: "summer_cup_top_2500", name: "\u590F\u65E5\u76C3 (2500)", cp: "2500", path: "data/rankings_2500_summer.json" },
  { command: "master_league_top", name: "\u5927\u5E2B\u806F\u76DF (\u7121\u4E0A\u9650) (10000)", cp: "10000", path: "data/rankings_10000.json" },
  { command: "master_league_top_permier", name: "\u5927\u5E2B\u7D00\u5FF5\u8CFD (10000)", cp: "10000", path: "data/rankings_10000_premier.json" },
  { command: "master_league_top_meta", name: "\u5927\u5E2B Meta (10000)", cp: "10000", path: "data/rankings_meta_master_10000.json" },
  { command: "attackers_top", name: "\u6700\u4F73\u653B\u64CA\u624B (10000)", cp: "Any", path: "data/rankings_attackers_tier.json" },
  { command: "defenders_top", name: "\u6700\u4F73\u9632\u5B88\u8005 (10000)", cp: "Any", path: "data/rankings_defenders_tier.json" }
];
var typeNames = {
  normal: "\u4E00\u822C",
  fire: "\u706B",
  water: "\u6C34",
  electric: "\u96FB",
  grass: "\u8349",
  ice: "\u51B0",
  fighting: "\u683C\u9B25",
  poison: "\u6BD2",
  ground: "\u5730\u9762",
  flying: "\u98DB\u884C",
  psychic: "\u8D85\u80FD",
  bug: "\u87F2",
  rock: "\u5CA9\u77F3",
  ghost: "\u5E7D\u9748",
  dragon: "\u9F8D",
  dark: "\u60E1",
  steel: "\u92FC",
  fairy: "\u5996\u7CBE"
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

// --- 所有函數定義 (先定義) ---

function generateMainMenu() {
  const keyboard = [];
  const chunk = /* @__PURE__ */ __name2((arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size)), "chunk");
  const cat500 = leagues.filter((l) => l.cp === "500");
  const cat1500 = leagues.filter((l) => l.cp === "1500");
  const cat2500 = leagues.filter((l) => l.cp === "2500");
  const catMaster = leagues.filter((l) => l.cp === "10000");
  const catPvE = leagues.filter((l) => l.cp === "Any");
  const addCategory = /* @__PURE__ */ __name2((title, items) => {
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
  keyboard.push([
    { text: "\u2694\uFE0F \u653B\u64CA\u5C6C\u6027\u67E5\u8A62", callback_data: "menu_atk_types" },
    { text: "\u{1F6E1}\uFE0F \u9632\u79A6\u5C6C\u6027\u67E5\u8A62", callback_data: "menu_def_types" }
  ]);
  return keyboard;
}
__name(generateMainMenu, "generateMainMenu");
__name2(generateMainMenu, "generateMainMenu");

async function sendMainMenu(chatId, env) {
  const text = `\u{1F916} *\u5BF6\u53EF\u5922 PvP \u67E5\u8A62\u6A5F\u5668\u4EBA*

\u8ACB\u9078\u64C7\u67E5\u8A62\u9805\u76EE\uFF0C\u6216\u76F4\u63A5\u8F38\u5165\u5BF6\u53EF\u5922\u540D\u7A31 (\u5982: \`\u746A\u529B\u9732\u9E97\`) \u9032\u884C\u641C\u5C0B\u3002
`;
  const keyboard = generateMainMenu();
  await sendMessage(chatId, text, { inline_keyboard: keyboard }, env);
}
__name(sendMainMenu, "sendMainMenu");
__name2(sendMainMenu, "sendMainMenu");

async function sendHelpMessage(chatId, env) {
  const helpText = `\u{1F916} <b>\u5BF6\u53EF\u5922 PvP \u67E5\u8A62\u6A5F\u5668\u4EBA\u4F7F\u7528\u8AAA\u660E</b>

\u{1F50D} <b>\u57FA\u672C\u67E5\u8A62</b>
\u76F4\u63A5\u8F38\u5165\u5BF6\u53EF\u5922\u540D\u7A31 (\u4E2D/\u82F1) \u5373\u53EF\u67E5\u770B\u5404\u806F\u76DF\u6392\u540D\u3001\u8A55\u7D1A\u8207\u5EFA\u8B70\u3002
\u7BC4\u4F8B\uFF1A<code>\u746A\u529B\u9732\u9E97</code> \u6216 <code>Azumarill</code>

\u{1F4CA} <b>Meta \u751F\u614B\u5206\u6790 (\u7368\u5BB6\u529F\u80FD)</b>
\u9EDE\u64CA\u9078\u55AE\u4E2D\u7684\u300C<b>\u4E09\u806F\u76DF Meta \u751F\u614B\u5206\u6790</b>\u300D\uFF0C\u7CFB\u7D71\u5C07\u8A08\u7B97\uFF1A
1. \u{1F451} <b>\u7576\u5B63\u6700\u5F37\u738B\u8005</b>\uFF1A\u6700\u503C\u5F97\u6295\u8CC7\u7684\u6838\u5FC3\u3002
2. \u2694\uFE0F <b>\u66B4\u529B T0 \u968A</b>\uFF1A\u7531\u6392\u540D\u6700\u9AD8\u7684\u5F37\u52E2\u89D2\u7D44\u6210\u3002
3. \u{1F6E1}\uFE0F <b>\u667A\u6167\u806F\u9632\u968A</b>\uFF1A\u900F\u904E\u6F14\u7B97\u6CD5\u8A08\u7B97\u5C6C\u6027\u4E92\u88DC\u3002
4. \u{1F504} <b>\u4E8C\u7576\u5BB6\u806F\u9632\u968A</b>\uFF1A\u82E5\u7121\u6700\u5F37\u738B\u8005\u7684\u66FF\u4EE3\u65B9\u6848\u3002
<i>(\u9644\u5E36\u904A\u6232\u5167\u4E00\u9375\u8907\u88FD\u641C\u5C0B\u5B57\u4E32)</i>

\u2696\uFE0F <b>\u5C6C\u6027\u76F8\u524B\u67E5\u8A62</b>
\u9EDE\u64CA\u300C<b>\u653B\u64CA/\u9632\u79A6\u5C6C\u6027\u67E5\u8A62</b>\u300D\uFF0C\u67E5\u770B Pok\xE9mon GO \u5C08\u5C6C\u500D\u7387\uFF1A
\u2022 \u{1F4AA} \u6548\u679C\u7D55\u4F73 (1.6x)
\u2022 \u{1F6E1}\uFE0F \u5177\u6709\u6297\u6027 (0.625x)
\u2022 \u{1F6AB} \u96D9\u6297/\u7121\u6548 (0.39x)

\u{1F5D1}\uFE0F <b>\u5783\u573E\u6E05\u55AE\u7BA1\u7406</b>
\u2022 <code>/trash [\u540D\u7A31]</code>\uFF1A\u52A0\u5165\u5783\u573E\u6E05\u55AE
\u2022 <code>/untrash [\u540D\u7A31]</code>\uFF1A\u79FB\u9664\u5783\u573E\u6E05\u55AE
\u2022 <code>/trash</code>\uFF1A\u67E5\u770B\u76EE\u524D\u7684\u6E05\u55AE (\u53EF\u8907\u88FD\u641C\u5C0B\u5B57\u4E32)

\u{1F518} <b>\u5E38\u7528\u6307\u4EE4</b>
\u2022 <code>/start</code> \u6216 <code>/menu</code>\uFF1A\u559A\u9192\u5716\u5F62\u5316\u4E3B\u9078\u55AE
\u2022 <code>/great_league_top</code>\uFF1A\u67E5\u770B\u8D85\u7D1A\u806F\u76DF\u6392\u884C
<i>(\u652F\u63F4\u5F8C\u65B9\u52A0\u6578\u5B57\u81EA\u8A02\u986F\u793A\u6578\u91CF\uFF0C\u5982\uFF1A/great_league_top 10)</i>`;
  await sendMessage(chatId, helpText, { parse_mode: "HTML" }, env);
}
__name(sendHelpMessage, "sendHelpMessage");
__name2(sendHelpMessage, "sendHelpMessage");

async function sendTypeSelectionMenu(chatId, mode, env) {
  const title = mode === "atk" ? "\u2694\uFE0F <b>\u653B\u64CA\u5C6C\u6027\u67E5\u8A62</b>\n\u8ACB\u9078\u64C7\u653B\u64CA\u62DB\u5F0F\u7684\u5C6C\u6027\uFF1A" : "\u{1F6E1}\uFE0F <b>\u9632\u79A6\u5C6C\u6027\u67E5\u8A62</b>\n\u8ACB\u9078\u64C7\u9632\u5B88\u65B9(\u81EA\u5DF1)\u7684\u5C6C\u6027\uFF1A";
  const keyboard = [];
  const types = Object.keys(typeNames);
  for (let i = 0; i < types.length; i += 3) {
    const row = types.slice(i, i + 3).map((t) => ({ text: typeNames[t], callback_data: `type_${mode}_${t}` }));
    keyboard.push(row);
  }
  keyboard.push([{ text: "\u{1F519} \u56DE\u4E3B\u9078\u55AE", callback_data: "main_menu" }]);
  await sendMessage(chatId, title, { inline_keyboard: keyboard, parse_mode: "HTML" }, env);
}
__name(sendTypeSelectionMenu, "sendTypeSelectionMenu");
__name2(sendTypeSelectionMenu, "sendTypeSelectionMenu");

async function handleTypeDetail(chatId, typeKey, mode, env) {
  const typeName = typeNames[typeKey];
  let msg = "";
  if (mode === "atk") {
    const strongAgainst = [];
    Object.entries(typeChart[typeKey]).forEach(([target, multiplier]) => {
      if (multiplier > 1) strongAgainst.push(`${typeNames[target]} (${multiplier}x)`);
    });
    msg = `\u2694\uFE0F <b>${typeName}\u5C6C\u6027 (\u653B\u64CA\u65B9)</b>

\u{1F4AA} <b>\u6548\u679C\u7D55\u4F73 (1.6x)\uFF1A</b>
${strongAgainst.length ? strongAgainst.join("\n") : "\u7121"}

<i>(\u8A3B\uFF1APokemon GO \u524B\u5236\u500D\u7387\u70BA 1.6)</i>`;
  } else {
    const resistantTo = [];
    const immuneTo = [];
    allTypes.forEach((attacker) => {
      let multiplier = 1;
      if (typeChart[attacker] && typeChart[attacker][typeKey] !== void 0) multiplier = typeChart[attacker][typeKey];
      if (multiplier < 1) {
        const text = `${typeNames[attacker]} (${multiplier}x)`;
        if (multiplier < 0.6) immuneTo.push(text);
        else resistantTo.push(text);
      }
    });
    msg = `\u{1F6E1}\uFE0F <b>${typeName}\u5C6C\u6027 (\u9632\u5B88\u65B9)</b>

\u{1F6AB} <b>\u88AB\u96D9\u6297/\u7121\u6548 (0.39x)\uFF1A</b>
${immuneTo.length ? immuneTo.join("\n") : "\u7121"}

\u{1F6E1}\uFE0F <b>\u5177\u6709\u6297\u6027 (0.625x)\uFF1A</b>
${resistantTo.length ? resistantTo.join("\n") : "\u7121"}
`;
  }
  const keyboard = [[{ text: "\u{1F519} \u56DE\u4E0A\u4E00\u5C64", callback_data: `menu_${mode}_types` }]];
  await sendMessage(chatId, msg, { inline_keyboard: keyboard, parse_mode: "HTML" }, env);
}
__name(handleTypeDetail, "handleTypeDetail");
__name2(handleTypeDetail, "handleTypeDetail");

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
__name2(handleTrashCommand, "handleTrashCommand");

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
__name2(handleUntrashCommand, "handleUntrashCommand");

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
__name2(handleAllowUidCommand, "handleAllowUidCommand");

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
__name2(handleDelUidCommand, "handleDelUidCommand");

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
__name2(handleLeagueCommand, "handleLeagueCommand");

async function handlePokemonSearch(chatId, query, env, ctx) {
  // ★ 1. 清理查詢字串 (新增邏輯)
  const cleanQuery = query.replace(QUERY_CLEANER_REGEX, "");
  const finalQuery = cleanQuery.length > 0 ? cleanQuery : query;

  await sendMessage(chatId, `\u{1F50D} \u67E5\u8A62 "<b>${finalQuery}</b>"...`, { parse_mode: "HTML" }, env);
  
  try {
    const transResponse = await fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx);
    if (!transResponse.ok) throw new Error("\u7121\u6CD5\u8F09\u5165\u5BF6\u53EF\u5922\u8CC7\u6599\u5EAB");
    const allPokemonData = await transResponse.json();
    
    // ★ 2. 搜尋比對 (用 finalQuery)
    const isChinese = /[\u4e00-\u9fa5]/.test(finalQuery);
    const lowerCaseQuery = finalQuery.toLowerCase();
    const initialMatches = allPokemonData.filter(
      (p) => isChinese ? p.speciesName.includes(finalQuery) : p.speciesId.toLowerCase().includes(lowerCaseQuery)
    );
    
    if (initialMatches.length === 0) return await sendMessage(chatId, `\u627E\u4E0D\u5230\u8207 "${finalQuery}" \u76F8\u95DC\u7684\u5BF6\u53EF\u5922\u3002`, null, env);
    
    const familyIds = new Set(initialMatches.map((p) => p.family ? p.family.id : null).filter((id) => id));
    const familyMatches = allPokemonData.filter((p) => p.family && familyIds.has(p.family.id));
    const finalMatches = familyMatches.length > 0 ? familyMatches : initialMatches;
    const matchingIds = new Set(finalMatches.map((p) => p.speciesId.toLowerCase()));
    const idToNameMap = new Map(finalMatches.map((p) => [p.speciesId.toLowerCase(), p.speciesName]));
    const allLeagueRanks = await Promise.all(leagues.map(
      (league) => fetchWithCache(getDataUrl(league.path), env, ctx).then((res) => res.ok ? res.json() : null)
    ));
    
    let replyMessage = `\u{1F3C6} <b>"${finalQuery}" \u76F8\u95DC\u6392\u540D</b>
`;
    const resultsByLeague = {};

    // ★ 3. 整理排名 (保留過濾邏輯：前100名 + 非垃圾)
    allLeagueRanks.forEach((rankings, index) => {
      const league = leagues[index];
      if (!rankings) return;
      rankings.forEach((pokemon, rankIndex) => {
        if (matchingIds.has(pokemon.speciesId.toLowerCase())) {
          const rank = pokemon.rank || pokemon.tier || rankIndex + 1;
          const rating = getPokemonRating(rank);
          
          // 過濾垃圾
          if (rating === "\u5783\u573E") return;
          // 過濾 100 名外 (僅限 PvP 數字排名)
          if (typeof rank === "number" && rank > 100) return;

          let rankDisplay = typeof rank === "number" ? `#${rank}` : p.tier ? `(${p.tier})` : `#${rank}`;
          const score = pokemon.score && typeof pokemon.score === "number" ? `(${pokemon.score.toFixed(2)})` : "";
          const types = pokemon.types && pokemon.types.length > 0 ? `(${pokemon.types.join(", ")})` : "";
          let speciesName = idToNameMap.get(pokemon.speciesId.toLowerCase()) || pokemon.speciesName;
          if (speciesName === "Giratina (Altered)") speciesName = "\u9A0E\u62C9\u5E1D\u7D0D \u5225\u7A2E";

          const line = `${rankDisplay} <code>${speciesName}</code> ${types}${pokemon.cp ? ` CP:${pokemon.cp}` : ""} ${score} - ${rating}`;
          
          if (!resultsByLeague[league.name]) resultsByLeague[league.name] = [];
          resultsByLeague[league.name].push(line);
        }
      });
    });

    let hasContent = false;
    for (const [leagueName, lines] of Object.entries(resultsByLeague)) {
      if (lines.length > 0) {
        replyMessage += `
<b>${leagueName}:</b>
${lines.join("\n")}
`;
        hasContent = true;
      }
    }

    if (!hasContent) {
      replyMessage += `
(\u6B64\u5BF6\u53EF\u5922\u5728\u6240\u6709\u806F\u76DF\u4E2D\u6392\u540D\u672A\u9032\u5165\u524D 100 \u540D\uFF0C\u6216\u4E0D\u9069\u5408\u5C0D\u6230)`;
    }

    // ★ 4. 檢查垃圾清單 (需要傳入 userId)
    // 這裡我們需要一個 userId，但 handlePokemonSearch 沒傳進來
    // 我們可以從 ctx 或 env 拿不到，必須修改上層調用，或這裡先暫時略過這個功能
    // 為了安全起見，這裡先不加入按鈕，確保搜尋先恢復正常
    
    return await sendMessage(chatId, replyMessage.trim(), { parse_mode: "HTML" }, env);
  } catch (e) {
    return sendMessage(chatId, `\u641C\u5C0B\u932F\u8AA4: ${e.message}`, null, env);
  }
}
__name(handlePokemonSearch, "handlePokemonSearch");
__name2(handlePokemonSearch, "handlePokemonSearch");

async function handleMetaAnalysis(chatId, env, ctx) {
  const targetLeagues = [
    leagues.find((l) => l.command === "great_league_top"),
    leagues.find((l) => l.command === "ultra_league_top"),
    leagues.find((l) => l.command === "master_league_top")
  ];
  await sendMessage(chatId, `\u{1F504} <b>\u6B63\u5728\u5206\u6790\u4E09\u806F\u76DF\u5BE6\u6642\u751F\u614B\u8207\u5C6C\u6027\u806F\u9632...</b>`, { parse_mode: "HTML" }, env);
  const transResponse = await fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx);
  if (!transResponse.ok) return sendMessage(chatId, "\u274C \u7121\u6CD5\u8B80\u53D6\u7FFB\u8B6F\u8CC7\u6599\u5EAB", null, env);
  const allPokemonData = await transResponse.json();
  const pokemonDetailMap = new Map(allPokemonData.map((p) => [p.speciesId.toLowerCase(), p]));
  const getName = /* @__PURE__ */ __name((p, forCopy = false) => {
    const detail = pokemonDetailMap.get(p.speciesId.toLowerCase());
    let name = detail ? detail.speciesName : p.speciesName;
    if (name === "Giratina (Altered)") name = "\u9A0E\u62C9\u5E1D\u7D0D \u5225\u7A2E";
    else if (name === "Giratina (Altered) (Shadow)") name = "\u9A0E\u62C9\u5E1D\u7D0D \u5225\u7A2E \u6697\u5F71";
    else if (name === "Claydol (Shadow)") name = "\u5FF5\u529B\u571F\u5076 \u6697\u5F71";
    if (forCopy) return name.replace(NAME_CLEANER_REGEX, "").trim();
    return name;
  }, "getName");
  const getTypesStr = /* @__PURE__ */ __name((p) => {
    const detail = pokemonDetailMap.get(p.speciesId.toLowerCase());
    if (!detail || !detail.types) return "";
    return `(${detail.types.join("/")})`;
  }, "getTypesStr");
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
      if (teamBalanced.some((p) => p.speciesId === altLeader.speciesId)) altLeader = rankings[2];
      const teamAlternative = buildBalancedTeam(altLeader, rankings, pokemonDetailMap);
      const copySet = /* @__PURE__ */ new Set();
      [...teamViolence, ...teamBalanced, ...teamAlternative].forEach((p) => {
        const cleanName = getName(p, true);
        if (cleanName) copySet.add(cleanName);
      });
      const copyString = [...copySet].join(",");
      let msg = `\u{1F4CA} <b>${league.name} \u6230\u7565\u5206\u6790</b>

`;
      msg += `\u{1F451} <b>META \u6838\u5FC3</b>
\u{1F449} <b>${getName(topOne)}</b> (\u5206: ${topOneScore})

`;
      msg += `\u2694\uFE0F <b>\u66B4\u529B T0 \u968A</b> (\u7D14\u5F37\u5EA6)
`;
      teamViolence.forEach((p, i) => msg += `${i + 1}\uFE0F\u20E3 ${getName(p)} ${getTypesStr(p)}
`);
      msg += `
\u{1F6E1}\uFE0F <b>\u667A\u6167\u806F\u9632\u968A</b> (\u4EE5\u738B\u8005\u70BA\u6838)
`;
      teamBalanced.forEach((p, i) => msg += `${i + 1}\uFE0F\u20E3 ${getName(p)} ${getTypesStr(p)}
`);
      msg += `
\u{1F504} <b>\u4E8C\u7576\u5BB6\u806F\u9632\u968A</b> (\u66FF\u4EE3\u65B9\u6848)
`;
      teamAlternative.forEach((p, i) => msg += `${i + 1}\uFE0F\u20E3 ${getName(p)} ${getTypesStr(p)}
`);
      msg += `
\u{1F4CB} <b>\u4E00\u9375\u8907\u88FD\u641C\u5C0B\u5B57\u4E32</b>
`;
      msg += `<code>${copyString}</code>`;
      await sendMessage(chatId, msg, { parse_mode: "HTML" }, env);
    } catch (e) {
      await sendMessage(chatId, `\u26A0\uFE0F ${league.name} \u5206\u6790\u932F\u8AA4: ${e.message}`, null, env);
    }
  }
}
__name(handleMetaAnalysis, "handleMetaAnalysis");
__name2(handleMetaAnalysis, "handleMetaAnalysis");
__name2(handleMetaAnalysis, "handleMetaAnalysis");

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
__name2(fetchWithCache, "fetchWithCache");

function getDataUrl(filename) {
  return `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${filename}?ver=3`;
}
__name(getDataUrl, "getDataUrl");
__name2(getDataUrl, "getDataUrl");

async function getTrashList(userId, env) {
  if (!env.POKEMON_KV) return [];
  return await env.POKEMON_KV.get(TRASH_LIST_PREFIX + userId, "json") || [];
}
__name(getTrashList, "getTrashList");
__name2(getTrashList, "getTrashList");

async function addToTrashList(userId, pokemonNames, env) {
  if (!env.POKEMON_KV) return;
  const list = await getTrashList(userId, env);
  pokemonNames.forEach((name) => {
    if (name && !list.includes(name)) list.push(name);
  });
  await env.POKEMON_KV.put(TRASH_LIST_PREFIX + userId, JSON.stringify(list));
}
__name(addToTrashList, "addToTrashList");
__name2(addToTrashList, "addToTrashList");

async function getAllowedUserIds(env) {
  if (!env.POKEMON_KV) return [];
  return await env.POKEMON_KV.get(ALLOWED_UID_KEY, "json") || [];
}
__name(getAllowedUserIds, "getAllowedUserIds");
__name2(getAllowedUserIds, "getAllowedUserIds");

async function setAllowedUserIds(ids, env) {
  if (!env.POKEMON_KV) return;
  await env.POKEMON_KV.put(ALLOWED_UID_KEY, JSON.stringify(ids));
}
__name(setAllowedUserIds, "setAllowedUserIds");
__name2(setAllowedUserIds, "setAllowedUserIds");

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
__name2(getPokemonRating, "getPokemonRating");

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
__name2(sendMessage, "sendMessage");

async function answerCallbackQuery(callbackQueryId, text, env) {
  const url = `https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/answerCallbackQuery`;
  await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callback_query_id: callbackQueryId, text }) });
}
__name(answerCallbackQuery, "answerCallbackQuery");
__name2(answerCallbackQuery, "answerCallbackQuery");

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
__name2(registerWebhook, "registerWebhook");

async function unRegisterWebhook(env) {
  const response = await fetch(`https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/deleteWebhook`);
  return new Response(await response.text());
}
__name(unRegisterWebhook, "unRegisterWebhook");
__name2(unRegisterWebhook, "unRegisterWebhook");

// --- 主要邏輯函數 ---

async function onCallbackQuery(callbackQuery, env, ctx) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const callbackQueryId = callbackQuery.id;
  answerCallbackQuery(callbackQueryId, "", env).catch(console.error);
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
__name2(onCallbackQuery, "onCallbackQuery");

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
__name2(onMessage, "onMessage");

// 導出 (放到最後)
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
