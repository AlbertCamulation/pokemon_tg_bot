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

// 🔥 引入我們剛剛寫好的 myBoxHtml
import { generateHTML, myBoxHtml } from './web/html';

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

  const leagueInfo = leagues.find((l) => l.command === data);
  if (leagueInfo) {
    await handleLeagueCommand(chatId, data, LIMIT_LEAGUES_SHOW, env, ctx);
    return;
  }

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
  ctx: ExecutionContext,
  requestOrigin: string // 🔥 接收動態網址
): Promise<void> {

  // 🔥 優先攔截前端 Web App 傳送回來的 JSON 資料
  if (message.web_app_data) {
    try {
      const payload = JSON.parse(message.web_app_data.data);
      
      if (payload.action === "save_box") {
        const { league, team } = payload;
        const kvKey = `box_${league}_${message.chat.id}`;
        
        // 寫入 Cloudflare KV
        await env.POKEMON_KV.put(kvKey, JSON.stringify(team));
        
        await sendMessage(
          message.chat.id,
          `✅ 成功儲存！你在 <b>${league} 聯盟</b> 共登錄了 ${team.length} 隻寶可夢。\n\n<code>${team.join(", ")}</code>\n\n(配隊分析功能即將解鎖...)`,
          { parse_mode: "HTML" },
          env
        );
      }
    } catch (e) {
      await sendMessage(message.chat.id, "❌ 解析寶可夢盒子資料失敗。", null, env);
    }
    return;
  }

  // 確保是一般文字訊息才往下走
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
    const [bannedMap, allowedIds] = await Promise.all([
      getBannedUsers(env),
      getAllowedUserIds(env)
    ]);
    if (bannedMap[userId]) return;

    if (!allowedIds.includes(userId)) {
      if (adminGroupId) {
        await sendAuthorizationRequest(chatId, userId, firstName, username, text, adminGroupId, env);
      } else {
        await sendMessage(chatId, `⛔ <b>權限不足</b>\n您的 UID (<code>${userId}</code>) 未授權。`, { parse_mode: "HTML" }, env);
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

  const leagueInfo = leagues.find((l) => l.command === command);
  if (leagueInfo) {
    await handleLeagueCommand(chatId, command!, LIMIT_LEAGUES_SHOW, env, ctx);
    return;
  }

  if (command) {
    switch (command) {
      case "start":
      case "menu":
        await sendMainMenu(chatId, env);
        return;

      case "help":
        await sendHelpMessage(chatId, env);
        return;

      // 🔥 新增：叫出寶可夢盒子的按鈕
      case "box":
        const replyMarkup = {
          inline_keyboard: [
            [
              {
                text: "🎒 點我開啟寶可夢盒子",
                web_app: { url: `${requestOrigin}/mybox` } // 動態帶入你的 Worker 網址
              }
            ]
          ]
        };
        await sendMessage(chatId, "準備好編輯你的陣容了嗎？", replyMarkup, env);
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

      default:
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
    const requestOrigin = new URL(request.url).origin; // 🔥 抓取當前網域

    if (update.message) {
      ctx.waitUntil(onMessage(update.message, env, ctx, requestOrigin)); // 傳入網域給 onMessage
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

      // Web 介面 (主頁)
      if (path === "/") {
        return new Response(generateHTML(), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }

      // 🔥 Web App 盒子介面路由
      if (path === "/mybox") {
        return new Response(myBoxHtml, {
          headers: { 
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store, max-age=0" 
          }
        });
      }
      // 🔥 [新增] Web App 讀取盒子資料 API
      if (path === "/api/box" && request.method === "GET") {
        const uid = url.searchParams.get("userId");
        if (!uid) return new Response("{}", { status: 400 });
        
        // 讀取四個聯盟的資料
        const box500 = await env.POKEMON_KV.get(`box_500_${uid}`) || "[]";
        const box1500 = await env.POKEMON_KV.get(`box_1500_${uid}`) || "[]";
        const box2500 = await env.POKEMON_KV.get(`box_2500_${uid}`) || "[]";
        const box10000 = await env.POKEMON_KV.get(`box_10000_${uid}`) || "[]";
        
        const data = {
          "500": JSON.parse(box500),
          "1500": JSON.parse(box1500),
          "2500": JSON.parse(box2500),
          "10000": JSON.parse(box10000)
        };
        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }

      // 🔥 [新增] Web App 儲存盒子資料 API
      if (path === "/api/box" && request.method === "POST") {
        const payload = await request.json() as any;
        const { userId, league, team } = payload;
        
        // 寫入 Cloudflare KV
        await env.POKEMON_KV.put(`box_${league}_${userId}`, JSON.stringify(team));
        
        // 儲存成功後，機器人自動推播訊息到聊天室
        await sendMessage(
          userId,
          `✅ 成功更新對戰盒子！\n你在 <b>${league} 聯盟</b> 共登錄了 ${team.length} 隻寶可夢。\n\n<code>${team.join(", ")}</code>\n\n(配隊分析演算法即將上線...)`,
          { parse_mode: "HTML" },
          env
        );
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json; charset=utf-8" }
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
