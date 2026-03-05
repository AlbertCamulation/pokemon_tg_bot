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

// 引入 Web 介面
import { generateHTML, myBoxHtml } from './web/html';

// 全域後綴映射 (自動標記型態)
const SUFFIX_MAP: Record<string, string> = {
  "_shadow": " (暗影)",
  "_alolan": " (阿羅拉)",
  "_galarian": " (伽勒爾)",
  "_hisuian": " (洗翠)",
  "_paldean": " (帕底亞)",
  "_mega": " (Mega)"
};

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

  // 處理解除封禁
  if (data.startsWith("unban_btn_")) {
    if (!isSuperAdmin) {
      await answerCallbackQuery(callbackQueryId, "⛔ 您無權執行此操作", env);
      return;
    }
    const targetUid = data.replace("unban_btn_", "");
    await handleUnbanUser(chatId, messageId, targetUid, callbackQueryId, env);
    return;
  }

  // 關閉選單
  if (data === "close_menu") {
    await deleteMessage(chatId, messageId, env);
    return;
  }

  // 管理員審核與封鎖
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

  // 權限檢查
  const allowedIds = await getAllowedUserIds(env);
  if (!isSuperAdmin && !isInAdminGroup && !allowedIds.includes(userId)) {
    await answerCallbackQuery(callbackQueryId, `⛔ 權限不足`, env);
    return;
  }

  // 處理垃圾名單
  if (data.startsWith("untrash_btn_")) {
    const name = data.replace("untrash_btn_", "");
    await answerCallbackQuery(callbackQueryId, "正在移除...", env);
    await handleUntrashCommand(chatId, userId, [name], env);
    return;
  }

  // 屬性選單處理
  if (data === "menu_atk_types") { await sendTypeSelectionMenu(chatId, "atk", env); return; }
  if (data === "menu_def_types") { await sendTypeSelectionMenu(chatId, "def", env); return; }
  if (data.startsWith("type_atk_")) { await handleTypeDetail(chatId, data.replace("type_atk_", ""), "atk", env); return; }
  if (data.startsWith("type_def_")) { await handleTypeDetail(chatId, data.replace("type_def_", ""), "def", env); return; }

  await answerCallbackQuery(callbackQueryId, "", env);

  // 聯盟指令處理
  const leagueInfo = leagues.find((l) => l.command === data);
  if (leagueInfo) {
    await handleLeagueCommand(chatId, data, LIMIT_LEAGUES_SHOW, env, ctx);
    return;
  }

  // 其他主選單按鈕
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

  // 優先攔截 Web App 儲存事件
  if (message.web_app_data) {
    try {
      const payload = JSON.parse(message.web_app_data.data);
      if (payload.action === "save_box") {
        const { league, team } = payload;
        await env.POKEMON_KV.put(`box_${league}_${message.chat.id}`, JSON.stringify(team));
        
        // 即時執行分析演算法
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

  // 權限控管
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

  // 指令解析
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
    // 檢查是否為聯盟指令
    if (leagues.find(l => l.command === command)) {
      await handleLeagueCommand(chatId, command, LIMIT_LEAGUES_SHOW, env, ctx);
      return;
    }
  }

  // 一般搜尋
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
//  API 端點處理
// =========================================================
// 🔥 請將這段貼到 src/worker.ts 的 handleApiNames 函數中
async function handleApiNames(
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    // 1. 同時抓取「翻譯檔」與「1500 排名檔」
    // 加上時間戳記確保抓到的是伺服器最新版
    const [transRes, rankRes] = await Promise.all([
      fetchWithCache(getDataUrl(`data/chinese_translation.json?t=${Date.now()}`), env, ctx),
      fetchWithCache(getDataUrl(`data/rankings_1500_overall.json?t=${Date.now()}`), env, ctx)
    ]);

    const transData = await transRes.json() as PokemonData[];
    const rankings = await rankRes.json() as any[];

    // 建立 ID -> 中文名稱的對照表
    const idToNameMap = new Map<string, string>();
    transData.forEach(p => idToNameMap.set(p.speciesId.toLowerCase(), p.speciesName));

    // 2. 從「排名檔」出發，這才是搜尋功能能找到地區型態的原因
    const cleanNames = Array.from(new Set(
      rankings.map(r => {
        const id = r.speciesId.toLowerCase();
        const baseId = id.split('_')[0]; // 取得基礎 ID，如 raticate
        
        // 優先找完美匹配，找不到就找基礎名稱 (如阿羅拉型態通常共用基礎名稱)
        let name = idToNameMap.get(id) || idToNameMap.get(baseId) || id;

        // 🔥 自動動態標註 (只要搜尋到的 ID 包含後綴，就加上括號)
        // 這就是為什麼搜尋能顯示「拉達 阿羅拉」而選單之前不行的解藥
        if (name && !name.includes("(")) {
          Object.entries(SUFFIX_MAP).forEach(([key, zh]) => {
            if (id.includes(key)) name += zh;
          });
        }
        
        // 針對特定寶可夢名稱修正
        if (id.startsWith("cradily")) name = "搖籃百合" + (id.includes("_shadow") ? " (暗影)" : "");
        if (id.startsWith("golisopod")) name = "具甲武者" + (id.includes("_shadow") ? " (暗影)" : "");

        return name;
      }).filter(name => {
        // 確保是中文且不符合垃圾字元過濾
        if (!name || !/[\u4E00-\u9FA5]/.test(name)) return false;
        return !new RegExp(NAME_CLEANER_REGEX.source).test(name);
      })
    )).sort();

    return new Response(JSON.stringify(cleanNames), {
      headers: { 
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate", // 絕對不准快取
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  } catch (e) {
    return new Response(JSON.stringify([]), { status: 500 });
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
        const results = await Promise.all([
          env.POKEMON_KV.get(`box_500_${uid}`),
          env.POKEMON_KV.get(`box_1500_${uid}`),
          env.POKEMON_KV.get(`box_2500_${uid}`),
          env.POKEMON_KV.get(`box_10000_${uid}`)
        ]);
        return new Response(JSON.stringify({
          "500": JSON.parse(results[0] || "[]"),
          "1500": JSON.parse(results[1] || "[]"),
          "2500": JSON.parse(results[2] || "[]"),
          "10000": JSON.parse(results[3] || "[]")
        }), { headers: { "Content-Type": "application/json; charset=utf-8" } });
      }

      // 儲存盒子與分析 API
      if (path === "/api/box" && request.method === "POST") {
        const payload = await request.json() as any;
        const { userId, league, team } = payload;
        await env.POKEMON_KV.put(`box_${league}_${userId}`, JSON.stringify(team));
        const analysisResult = await analyzeUserBoxTeam(league, team, env, ctx);
        await sendMessage(userId, `✅ <b>盒子已更新</b>\n${analysisResult}`, { parse_mode: "HTML" }, env);
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json; charset=utf-8" } });
      }

      return new Response("Not Found", { status: 404 });
    } catch (e) {
      return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
    }
  }
};
