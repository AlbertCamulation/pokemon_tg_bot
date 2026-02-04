// =========================================================
//  Pokemon Telegram Bot - Main Entry Point
//  Cloudflare Workers TypeScript 版本
// =========================================================

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
  NAME_CLEANER_REGEX
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
  getBannedUsers,
  isUserBanned,
  isUserAllowed
} from './utils/kv';

import { escapeHtml } from './utils/helpers';

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
  sendAuthorizationRequest,
  handleEventCommand,
  handlePvPEventCommand
} from './handlers';

import { generateHTML } from './web/html';

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

  // 身分變數
  const isSuperAdmin = String(userId) === String(env.ADMIN_UID);
  const adminGroupId = env.ADMIN_GROUP_UID ? String(env.ADMIN_GROUP_UID).trim() : null;
  const isInAdminGroup = adminGroupId ? String(chatId) === adminGroupId : false;

  // --- 特權功能：解封黑名單 ---
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

  // --- 審核通知按鈕 (approve/ban) ---
  if (data.startsWith("approve_uid_") || data.startsWith("ban_uid_")) {
    if (!isSuperAdmin && !isInAdminGroup) {
      await answerCallbackQuery(callbackQueryId, "⛔ 權限不足", env);
      return;
    }

    const targetUid = parseInt(data.split("_")[2]);

    // 從訊息文字中抓取名字
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

  // --- 權限檢查 ---
  const allowedIds = await getAllowedUserIds(env);
  if (!isSuperAdmin && !isInAdminGroup && !allowedIds.includes(userId)) {
    await answerCallbackQuery(callbackQueryId, `⛔ 權限不足`, env);
    return;
  }

  // --- 垃圾清單移除 ---
  if (data.startsWith("untrash_btn_")) {
    const name = data.replace("untrash_btn_", "");
    await answerCallbackQuery(callbackQueryId, "正在移除...", env);
    await handleUntrashCommand(chatId, userId, [name], env);
    return;
  }

  // --- 屬性選單 ---
  if (data === "menu_atk_types") {
    await sendTypeSelectionMenu(chatId, "atk", env);
    return;
  }
  if (data === "menu_def_types") {
    await sendTypeSelectionMenu(chatId, "def", env);
    return;
  }
  if (data.startsWith("type_atk_")) {
    await handleTypeDetail(chatId, data.replace("type_atk_", ""), "atk", env);
    return;
  }
  if (data.startsWith("type_def_")) {
    await handleTypeDetail(chatId, data.replace("type_def_", ""), "def", env);
    return;
  }

  await answerCallbackQuery(callbackQueryId, "", env);

  // --- 聯盟指令 ---
  const leagueInfo = leagues.find((l) => l.command === data);
  if (leagueInfo) {
    await handleLeagueCommand(chatId, data, LIMIT_LEAGUES_SHOW, env, ctx);
    return;
  }

  // --- 其他功能 ---
  switch (data) {
    case "meta_analysis":
      await handleMetaAnalysis(chatId, env, ctx);
      break;
    case "trash_list":
      await handleTrashCommand(chatId, userId, callbackQuery.from, env);
      break;
    case "help_menu":
      await sendHelpMessage(chatId, env);
      break;
    case "main_menu":
      await sendMainMenu(chatId, env);
      break;
    case "current_leagues":
      await handleCurrentLeagues(chatId, env, ctx);
      break;
    default:
      break;
  }
}

// =========================================================
//  Message 處理
// =========================================================

async function onMessage(
  message: TelegramMessage,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  if (!message.text) return;

  const text = message.text.trim();
  const chatId = message.chat.id;
  const userId = message.from!.id;
  const firstName = message.from!.first_name || "Unknown";
  const username = message.from!.username;

  // =======================================================
  // 權限控管邏輯
  // =======================================================

  const isSuperAdmin = String(userId) === String(env.ADMIN_UID);
  const adminGroupId = env.ADMIN_GROUP_UID ? String(env.ADMIN_GROUP_UID).trim() : null;
  const isInAdminGroup = adminGroupId ? String(chatId) === adminGroupId : false;

  if (!isSuperAdmin && !isInAdminGroup) {
    // 檢查黑名單
    const bannedMap = await getBannedUsers(env);
    if (bannedMap[userId]) return;

    // 檢查白名單
    const allowedIds = await getAllowedUserIds(env);
    if (!allowedIds.includes(userId)) {
      if (adminGroupId) {
        await sendAuthorizationRequest(
          chatId,
          userId,
          firstName,
          username,
          text,
          adminGroupId,
          env
        );
      } else {
        await sendMessage(
          chatId,
          `⛔ <b>權限不足</b>\n您的 UID (<code>${userId}</code>) 未授權。`,
          { parse_mode: "HTML" },
          env
        );
      }
      return;
    }
  }

  // =======================================================
  // 指令解析
  // =======================================================

  const parts = text.split(" ");
  const command = parts[0].startsWith("/")
    ? parts[0].split("@")[0].substring(1)
    : null;
  const args = parts.slice(1);

  // 聯盟指令
  const leagueInfo = leagues.find((l) => l.command === command);
  if (leagueInfo) {
    await handleLeagueCommand(chatId, command!, LIMIT_LEAGUES_SHOW, env, ctx);
    return;
  }

  // 其他指令
  if (command) {
    switch (command) {
      case "start":
      case "menu":
        await sendMainMenu(chatId, env);
        return;

      case "help":
        await sendHelpMessage(chatId, env);
        return;

      case "trash":
        if (args.length > 0) {
          await handleAddTrashCommand(chatId, userId, args, env);
        } else {
          await handleTrashCommand(chatId, userId, message.from!, env);
        }
        return;

      case "untrash":
        await handleUntrashCommand(chatId, userId, args, env);
        return;

      case "banlist":
        if (isSuperAdmin) {
          await handleBanlistCommand(chatId, env);
        }
        return;

      case "event":
      case "events":
        await handleEventCommand(chatId, env, ctx);
        return;

      case "pvp":
        await handlePvPEventCommand(chatId, env, ctx);
        return;

      default:
        return;
    }
  }

  // 寶可夢搜尋
  if (text.length >= 2 && !text.startsWith("/")) {
    await handlePokemonSearch(chatId, userId, text, env, ctx);
  }
}

// =========================================================
//  Webhook 處理
// =========================================================

async function handleWebhook(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (secret !== env.ENV_BOT_SECRET) {
    return new Response("Unauthorized", { status: 403 });
  }

  try {
    const update = await request.json() as TelegramUpdate;

    if (update.message) {
      ctx.waitUntil(onMessage(update.message, env, ctx));
    } else if (update.callback_query) {
      ctx.waitUntil(onCallbackQuery(update.callback_query, env, ctx));
    }

    return new Response("Ok");
  } catch (e) {
    console.error(e);
    return new Response("Error", { status: 500 });
  }
}

// =========================================================
//  API 端點處理
// =========================================================

async function handleApiSearch(
  url: URL,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const query = url.searchParams.get("q");
  if (!query) {
    return new Response(JSON.stringify({ error: "No query" }), { status: 400 });
  }

  const result = await getPokemonDataOnly(query, env, ctx);
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

async function handleApiNames(
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    const res = await fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx);
    const data = await res.json() as PokemonData[];

    const cleanNames = Array.from(new Set(
      data.map(p => p.speciesName)
        .filter(name => {
          if (!name) return false;
          const regex = new RegExp(NAME_CLEANER_REGEX.source);
          return !regex.test(name);
        })
    )).sort();

    return new Response(JSON.stringify(cleanNames), {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch {
    return new Response(JSON.stringify([]), { status: 500 });
  }
}

// =========================================================
//  Worker Entry Point
// =========================================================

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Webhook 端點
      if (path === WEBHOOK_PATH) {
        return handleWebhook(request, env, ctx);
      }

      // API 端點
      if (path === "/api/names") {
        return handleApiNames(env, ctx);
      }

      if (path === "/api/search") {
        return handleApiSearch(url, env, ctx);
      }

      // 註冊 Webhook
      if (path === "/registerWebhook") {
        return registerWebhook(url, env);
      }

      // Web 介面
      if (path === "/") {
        return new Response(generateHTML(), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }

      return new Response("Not Found", { status: 404 });
    } catch (e) {
      return new Response(
        JSON.stringify({ error: (e as Error).message }),
        { status: 500 }
      );
    }
  }
};
