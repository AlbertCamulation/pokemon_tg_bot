// =========================================================
//  Pokemon Telegram Bot - Main Entry Point
//  Cloudflare Workers TypeScript 版本
// =========================================================
import { analyzeUserBoxTeam } from './handlers/box'; 
import type {
  Env,
  TelegramUpdate,
  TelegramMessage,
  TelegramCallbackQuery,
  PokemonData
} from './types';

import {
  WEBHOOK_PATH,
  leagues,
  LIMIT_LEAGUES_SHOW,
  NAME_CLEANER_REGEX,
  MANIFEST_URL
} from './constants';

import {
  fetchWithCache,
  getDataUrl
} from './utils/cache';

import {
  sendMessage,
  answerCallbackQuery,
  deleteMessage,
  registerWebhook
} from './utils/telegram';

import {
  getAllowedUserIds,
  getBannedUsers
} from './utils/kv';

import {
  handlePokemonSearch,
  getPokemonDataOnly,
  sendMainMenu,
  sendHelpMessage,
  sendTypeSelectionMenu,
  handleTypeDetail,
  handleLeagueCommand,
  handleCurrentLeagues,
  handleMetaAnalysis,
  handleTrashCommand,
  handleAddTrashCommand,
  handleUntrashCommand,
  handleBanlistCommand,
  handleApproveUser,
  handleBanUser,
  handleUnbanUser,
  sendAuthorizationRequest
} from './handlers';

import { generateHTML, myBoxHtml } from './web/html';

// 全域後綴映射
const SUFFIX_MAP: Record<string, string> = {
  "_shadow": " (暗影)",
  "_alolan": " (阿羅拉)",
  "_galarian": " (伽勒爾)",
  "_hisuian": " (洗翠)",
  "_paldean": " (帕底亞)",
  "_mega": " (Mega)"
};

// KV key 安全化：把斜線、點換成底線
function sanitizePathKey(path: string): string {
  return path.replace(/[\/\.]/g, '_');
}

// 從 manifest 取得當下聯盟清單
async function getActiveLeagues(): Promise<Array<{ name: string; path: string; command: string }>> {
  try {
    const manifestRes = await fetch(`${MANIFEST_URL}?v=${Date.now()}`, {
      headers: { "Cache-Control": "no-cache" }
    });
    if (!manifestRes.ok) return [];
    const manifest = await manifestRes.json() as {
      active_leagues: Array<{ cp: string; pvpoke_id: string; name_zh: string }>;
    };

    const result: Array<{ name: string; path: string; command: string }> = [];
    manifest.active_leagues.forEach(a => {
      const local = leagues.find(l => {
        if (String(l.cp) !== String(a.cp)) return false;
        if (a.pvpoke_id === "all") return l.command === "great_league_top" || l.command === "ultra_league_top" || l.command === "master_league_top";
        if (a.pvpoke_id === "premier") return l.name.includes("紀念") || l.command.includes("premier") || l.command.includes("permier");
        if (a.pvpoke_id === "remix") return l.name.includes("Remix") || l.command.includes("remix");
        return l.command.includes(a.pvpoke_id);
      });
      if (local) result.push({ name: local.name, path: local.path, command: local.command });
    });
    return result;
  } catch {
    return [];
  }
}

// =========================================================
//  Callback Query 處理
// =========================================================

async function onCallbackQuery(
  callbackQuery: TelegramCallbackQuery,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  const chatId = callbackQuery.message!.chat.id;
  const data = callbackQuery.data || '';
  const callbackQueryId = callbackQuery.id;
  const userId = callbackQuery.from.id;
  const userName = callbackQuery.from.first_name || "Unknown";
  const messageId = callbackQuery.message!.message_id;

  const isSuperAdmin = String(userId) === String(env.ADMIN_UID);
  const adminGroupId = env.ADMIN_GROUP_UID ? String(env.ADMIN_GROUP_UID).trim() : null;
  const isInAdminGroup = adminGroupId ? String(chatId) === adminGroupId : false;

  if (data.startsWith("unban_btn_")) {
    if (!isSuperAdmin) {
      await answerCallbackQuery(callbackQueryId, "⛔ 您無權執行此操作", env);
      return;
    }
    const targetUid = data.replace("unban_btn_", "");
    await handleUnbanUser(chatId, messageId, targetUid, callbackQueryId, env);
    return;
  }

  if (data === "close_menu") {
    await deleteMessage(chatId, messageId, env);
    return;
  }

  if (data.startsWith("approve_uid_") || data.startsWith("ban_uid_")) {
    if (!isSuperAdmin && !isInAdminGroup) {
      await answerCallbackQuery(callbackQueryId, "⛔ 權限不足", env);
      return;
    }
    const targetUid = parseInt(data.split("_")[2]);
    const msgText = callbackQuery.message?.text || "";
    const nameMatch = msgText.match(/使用者:\s*(.*?)(\n|\(|$)/);
    const targetName = nameMatch ? nameMatch[1].trim() : "Unknown User";

    if (data.startsWith("approve_uid_")) {
      await handleApproveUser(chatId, messageId, targetUid, targetName, userName, env);
      await answerCallbackQuery(callbackQueryId, "已核准", env);
    } else if (data.startsWith("ban_uid_")) {
      await handleBanUser(chatId, messageId, targetUid, targetName, userName, env);
      await answerCallbackQuery(callbackQueryId, "已封禁", env);
    }
    return;
  }

  const allowedIds = await getAllowedUserIds(env);
  if (!isSuperAdmin && !isInAdminGroup && !allowedIds.includes(userId)) {
    await answerCallbackQuery(callbackQueryId, `⛔ 權限不足`, env);
    return;
  }

  if (data.startsWith("untrash_btn_")) {
    const name = data.replace("untrash_btn_", "");
    await answerCallbackQuery(callbackQueryId, "正在移除...", env);
    await handleUntrashCommand(chatId, userId, [name], env);
    return;
  }

  if (data === "menu_atk_types") { await sendTypeSelectionMenu(chatId, "atk", env); return; }
  if (data === "menu_def_types") { await sendTypeSelectionMenu(chatId, "def", env); return; }
  if (data.startsWith("type_atk_")) { await handleTypeDetail(chatId, data.replace("type_atk_", ""), "atk", env); return; }
  if (data.startsWith("type_def_")) { await handleTypeDetail(chatId, data.replace("type_def_", ""), "def", env); return; }

  await answerCallbackQuery(callbackQueryId, "", env);

  const leagueInfo = leagues.find((l) => l.command === data);
  if (leagueInfo) {
    await handleLeagueCommand(chatId, data, LIMIT_LEAGUES_SHOW, env, ctx);
    return;
  }

  switch (data) {
    case "meta_analysis": await handleMetaAnalysis(chatId, env, ctx); break;
    case "trash_list": await handleTrashCommand(chatId, userId, callbackQuery.from, env); break;
    case "help_menu": await sendHelpMessage(chatId, env); break;
    case "main_menu": await sendMainMenu(chatId, env); break;
    case "current_leagues": await handleCurrentLeagues(chatId, env, ctx); break;
    default: break;
  }
}

// =========================================================
//  Message 處理
// =========================================================

async function onMessage(
  message: TelegramMessage,
  env: Env,
  ctx: ExecutionContext,
  requestOrigin: string
): Promise<void> {

  if (message.web_app_data) {
    try {
      const payload = JSON.parse(message.web_app_data.data);
      if (payload.action === "save_box") {
        const { league, team } = payload;
        await env.POKEMON_KV.put(`box_${league}_${message.chat.id}`, JSON.stringify(team));
        const analysisResult = await analyzeUserBoxTeam(league, team, env, ctx);
        await sendMessage(
          message.chat.id,
          `✅ <b>對戰盒子同步成功！</b>\n共登錄了 ${team.length} 隻寶可夢。\n\n${analysisResult}`,
          { parse_mode: "HTML" },
          env
        );
      }
    } catch (e) {
      await sendMessage(message.chat.id, "❌ 盒子資料處理或分析失敗。", null, env);
    }
    return;
  }

  if (!message.text) return;
  const text = message.text.trim();
  const chatId = message.chat.id;
  const userId = message.from!.id;
  const firstName = message.from!.first_name || "Unknown";
  const username = message.from!.username;

  const isSuperAdmin = String(userId) === String(env.ADMIN_UID);
  const adminGroupId = env.ADMIN_GROUP_UID ? String(env.ADMIN_GROUP_UID).trim() : null;
  const isInAdminGroup = adminGroupId ? String(chatId) === adminGroupId : false;

  if (!isSuperAdmin && !isInAdminGroup) {
    const [bannedMap, allowedIds] = await Promise.all([getBannedUsers(env), getAllowedUserIds(env)]);
    if (bannedMap[userId]) return;
    if (!allowedIds.includes(userId)) {
      if (adminGroupId) await sendAuthorizationRequest(chatId, userId, firstName, username, text, adminGroupId, env);
      else await sendMessage(chatId, `⛔ <b>權限不足</b>\n您的 UID (<code>${userId}</code>) 未授權。`, { parse_mode: "HTML" }, env);
      return;
    }
  }

  const parts = text.split(" ");
  const command = parts[0].startsWith("/") ? parts[0].split("@")[0].substring(1) : null;
  const args = parts.slice(1);

  if (command) {
    switch (command) {
      case "start":
      case "menu": await sendMainMenu(chatId, env); return;
      case "help": await sendHelpMessage(chatId, env); return;
      case "box":
        const replyMarkup = {
          inline_keyboard: [[{ text: "🎒 開啟我的對戰盒子", web_app: { url: `${requestOrigin}/mybox` } }]]
        };
        await sendMessage(chatId, "準備好編輯你的陣容了嗎？", replyMarkup, env);
        return;
      case "trash":
        if (args.length > 0) await handleAddTrashCommand(chatId, userId, args, env);
        else await handleTrashCommand(chatId, userId, message.from!, env);
        return;
      case "untrash": await handleUntrashCommand(chatId, userId, args, env); return;
      case "banlist": if (isSuperAdmin) await handleBanlistCommand(chatId, env); return;
      default: break;
    }
    if (leagues.find(l => l.command === command)) {
      await handleLeagueCommand(chatId, command, LIMIT_LEAGUES_SHOW, env, ctx);
      return;
    }
  }

  if (text.length >= 2 && !text.startsWith("/")) {
    await handlePokemonSearch(chatId, userId, text, env, ctx);
  }
}

// =========================================================
//  Webhook 處理
// =========================================================

async function handleWebhook(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (secret !== env.ENV_BOT_SECRET) return new Response("Unauthorized", { status: 403 });

  try {
    const update = await request.json() as TelegramUpdate;
    const requestOrigin = new URL(request.url).origin;
    if (update.message) ctx.waitUntil(onMessage(update.message, env, ctx, requestOrigin));
    else if (update.callback_query) ctx.waitUntil(onCallbackQuery(update.callback_query, env, ctx));
    return new Response("Ok");
  } catch (e) {
    console.error(e);
    return new Response("Error", { status: 500 });
  }
}

// =========================================================
//  handleApiNames
// =========================================================
async function handleApiNames(
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  let transData: PokemonData[] = [];

  try {
    const transRes = await fetchWithCache(getDataUrl(`data/chinese_translation.json`), env, ctx);
    transData = await transRes.json() as PokemonData[];

    const baseNameMap = new Map<string, string>();
    transData.forEach(p => baseNameMap.set(p.speciesId.toLowerCase(), p.speciesName));

    const cleanNames = Array.from(new Set(
      transData.map(item => {
        const id = (item.speciesId || "").toLowerCase();
        const baseId = id.split('_')[0];
        let name = baseNameMap.get(id) || baseNameMap.get(baseId) || id;

        Object.entries(SUFFIX_MAP).forEach(([key, zh]) => {
          const zhClean = zh.replace(/[()]/g, '').trim();
          if (id.includes(key) && !name.includes(zhClean)) name += zh;
        });

        if (id.startsWith("cradily")) name = "搖籃百合" + (id.includes("_shadow") ? " (暗影)" : "");
        if (id.startsWith("golisopod")) name = "具甲武者" + (id.includes("_shadow") ? " (暗影)" : "");

        return name;
      }).filter(name => {
        if (!name || !/[\u4E00-\u9FA5]/.test(name)) return false;
        return true;
      })
    )).sort();

    return new Response(JSON.stringify(cleanNames), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=3600"
      }
    });

  } catch (e) {
    const fallback = ["拉達", "小拉達", "胖可丁", "大尾立", "土王"];
    return new Response(JSON.stringify(fallback), { status: 200, headers: { "Content-Type": "application/json" } });
  }
}

// =========================================================
//  Worker Entry Point
// =========================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === WEBHOOK_PATH) return handleWebhook(request, env, ctx);
      if (path === "/api/names") return handleApiNames(env, ctx);

      // 當下聯盟清單
      if (path === "/api/active-leagues") {
        const result = await getActiveLeagues();
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }

      if (path === "/api/search") {
        const query = url.searchParams.get("q");
        if (!query) return new Response("{}", { status: 400 });
        const result = await getPokemonDataOnly(query, env, ctx);
        return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json; charset=utf-8" } });
      }

      if (path === "/registerWebhook") return registerWebhook(url, env);
      if (path === "/") return new Response(generateHTML(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
      if (path === "/mybox") return new Response(myBoxHtml, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });

      // 讀取盒子 API
      if (path === "/api/box" && request.method === "GET") {
        const uid = url.searchParams.get("userId");
        if (!uid) return new Response("{}", { status: 400 });

        // 取得當下所有聯盟，逐一讀取該 user 的盒子
        const activeLeagues = await getActiveLeagues();
        const result: Record<string, string[]> = {};

        await Promise.all(activeLeagues.map(async league => {
          const kvKey = `box_${sanitizePathKey(league.path)}_${uid}`;
          const val = await env.POKEMON_KV.get(kvKey);
          result[league.path] = JSON.parse(val || "[]");
        }));

        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }

      // 儲存盒子與分析 API
      if (path === "/api/box" && request.method === "POST") {
        const payload = await request.json() as any;
        const { userId, leaguePath, team } = payload;
        if (!userId || !leaguePath) return new Response(JSON.stringify({ error: "missing fields" }), { status: 400 });

        const kvKey = `box_${sanitizePathKey(leaguePath)}_${userId}`;
        await env.POKEMON_KV.put(kvKey, JSON.stringify(team));

        const analysisResult = await analyzeUserBoxTeam(leaguePath, team, env, ctx);
        await sendMessage(userId, `✅ <b>盒子已更新</b>\n${analysisResult}`, { parse_mode: "HTML" }, env);
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
      }

      return new Response("Not Found", { status: 404 });
    } catch (e) {
      return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
    }
  }
};
