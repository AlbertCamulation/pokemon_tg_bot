// =========================================================
//  Pokemon Telegram Bot - Main Entry Point
// =========================================================
import { analyzeUserBoxTeam } from './handlers/box';
import type {
  Env, TelegramUpdate, TelegramMessage, TelegramCallbackQuery, PokemonData
} from './types';
import {
  WEBHOOK_PATH, leagues, LIMIT_LEAGUES_SHOW, NAME_CLEANER_REGEX, MANIFEST_URL
} from './constants';
import { fetchWithCache, getDataUrl } from './utils/cache';
import { sendMessage, answerCallbackQuery, deleteMessage, registerWebhook } from './utils/telegram';
import { getAllowedUserIds, getBannedUsers } from './utils/kv';
import {
  handlePokemonSearch, getPokemonDataOnly, sendMainMenu, sendHelpMessage,
  sendTypeSelectionMenu, handleTypeDetail, handleLeagueCommand, handleCurrentLeagues,
  handleMetaAnalysis, handleTrashCommand, handleAddTrashCommand, handleUntrashCommand,
  handleBanlistCommand, handleApproveUser, handleBanUser, handleUnbanUser,
  sendAuthorizationRequest
} from './handlers';
import { generateHTML, myBoxHtml } from './web/html';

const SUFFIX_MAP: Record<string, string> = {
  "_shadow": " (暗影)", "_alolan": " (阿羅拉)", "_galarian": " (伽勒爾)",
  "_hisuian": " (洗翠)", "_paldean": " (帕底亞)", "_mega": " (Mega)"
};

// KV key 安全化
function sanitizeKey(s: string): string {
  return s.replace(/[\/\.\s]/g, '_');
}

// 取得當下聯盟清單
async function getActiveLeagues(): Promise<Array<{ name: string; path: string; command: string; cp: string }>> {
  try {
    const res = await fetch(`${MANIFEST_URL}?v=${Date.now()}`, { headers: { "Cache-Control": "no-cache" } });
    if (!res.ok) return [];
    const manifest = await res.json() as {
      active_leagues: Array<{ cp: string; pvpoke_id: string; name_zh: string }>;
    };
    const result: Array<{ name: string; path: string; command: string; cp: string }> = [];
    manifest.active_leagues.forEach(a => {
      const local = leagues.find(l => {
        if (String(l.cp) !== String(a.cp)) return false;
        if (a.pvpoke_id === "all") return l.command === "great_league_top" || l.command === "ultra_league_top" || l.command === "master_league_top";
        if (a.pvpoke_id === "premier") return l.name.includes("紀念") || l.command.includes("premier") || l.command.includes("permier");
        if (a.pvpoke_id === "remix") return l.name.includes("Remix") || l.command.includes("remix");
        return l.command.includes(a.pvpoke_id);
      });
      if (local) result.push({ name: local.name, path: local.path, command: local.command, cp: String(local.cp) });
    });
    return result;
  } catch { return []; }
}

// =========================================================
//  Callback Query
// =========================================================
async function onCallbackQuery(cq: TelegramCallbackQuery, env: Env, ctx: ExecutionContext): Promise<void> {
  const chatId = cq.message!.chat.id;
  const data = cq.data || '';
  const cqId = cq.id;
  const userId = cq.from.id;
  const userName = cq.from.first_name || "Unknown";
  const messageId = cq.message!.message_id;
  const isSuperAdmin = String(userId) === String(env.ADMIN_UID);
  const adminGroupId = env.ADMIN_GROUP_UID ? String(env.ADMIN_GROUP_UID).trim() : null;
  const isInAdminGroup = adminGroupId ? String(chatId) === adminGroupId : false;

  if (data.startsWith("unban_btn_")) {
    if (!isSuperAdmin) { await answerCallbackQuery(cqId, "⛔ 您無權執行此操作", env); return; }
    await handleUnbanUser(chatId, messageId, data.replace("unban_btn_", ""), cqId, env); return;
  }
  if (data === "close_menu") { await deleteMessage(chatId, messageId, env); return; }

  if (data.startsWith("approve_uid_") || data.startsWith("ban_uid_")) {
    if (!isSuperAdmin && !isInAdminGroup) { await answerCallbackQuery(cqId, "⛔ 權限不足", env); return; }
    const targetUid = parseInt(data.split("_")[2]);
    const nameMatch = (cq.message?.text || "").match(/使用者:\s*(.*?)(\n|\(|$)/);
    const targetName = nameMatch ? nameMatch[1].trim() : "Unknown User";
    if (data.startsWith("approve_uid_")) {
      await handleApproveUser(chatId, messageId, targetUid, targetName, userName, env);
      await answerCallbackQuery(cqId, "已核准", env);
    } else {
      await handleBanUser(chatId, messageId, targetUid, targetName, userName, env);
      await answerCallbackQuery(cqId, "已封禁", env);
    }
    return;
  }

  const allowedIds = await getAllowedUserIds(env);
  if (!isSuperAdmin && !isInAdminGroup && !allowedIds.includes(userId)) {
    await answerCallbackQuery(cqId, `⛔ 權限不足`, env); return;
  }

  if (data.startsWith("untrash_btn_")) {
    await answerCallbackQuery(cqId, "正在移除...", env);
    await handleUntrashCommand(chatId, userId, [data.replace("untrash_btn_", "")], env); return;
  }
  if (data === "menu_atk_types") { await sendTypeSelectionMenu(chatId, "atk", env); return; }
  if (data === "menu_def_types") { await sendTypeSelectionMenu(chatId, "def", env); return; }
  if (data.startsWith("type_atk_")) { await handleTypeDetail(chatId, data.replace("type_atk_", ""), "atk", env); return; }
  if (data.startsWith("type_def_")) { await handleTypeDetail(chatId, data.replace("type_def_", ""), "def", env); return; }

  await answerCallbackQuery(cqId, "", env);

  if (leagues.find(l => l.command === data)) {
    await handleLeagueCommand(chatId, data, LIMIT_LEAGUES_SHOW, env, ctx); return;
  }
  switch (data) {
    case "meta_analysis": await handleMetaAnalysis(chatId, env, ctx); break;
    case "trash_list": await handleTrashCommand(chatId, userId, cq.from, env); break;
    case "help_menu": await sendHelpMessage(chatId, env); break;
    case "main_menu": await sendMainMenu(chatId, env); break;
    case "current_leagues": await handleCurrentLeagues(chatId, env, ctx); break;
  }
}

// =========================================================
//  Message
// =========================================================
async function onMessage(msg: TelegramMessage, env: Env, ctx: ExecutionContext, origin: string): Promise<void> {
  if (msg.web_app_data) {
    try {
      const payload = JSON.parse(msg.web_app_data.data);
      if (payload.action === "save_box") {
        const { league, team } = payload;
        await env.POKEMON_KV.put(`box_${league}_${msg.chat.id}`, JSON.stringify(team));
        const result = await analyzeUserBoxTeam(league, team, [], env, ctx);
        await sendMessage(msg.chat.id, `✅ <b>盒子同步成功</b>\n\n${result}`, { parse_mode: "HTML" }, env);
      }
    } catch { await sendMessage(msg.chat.id, "❌ 盒子處理失敗", null, env); }
    return;
  }

  if (!msg.text) return;
  const text = msg.text.trim();
  const chatId = msg.chat.id;
  const userId = msg.from!.id;
  const firstName = msg.from!.first_name || "Unknown";
  const username = msg.from!.username;
  const isSuperAdmin = String(userId) === String(env.ADMIN_UID);
  const adminGroupId = env.ADMIN_GROUP_UID ? String(env.ADMIN_GROUP_UID).trim() : null;
  const isInAdminGroup = adminGroupId ? String(chatId) === adminGroupId : false;

  if (!isSuperAdmin && !isInAdminGroup) {
    const [bannedMap, allowedIds] = await Promise.all([getBannedUsers(env), getAllowedUserIds(env)]);
    if (bannedMap[userId]) return;
    if (!allowedIds.includes(userId)) {
      if (adminGroupId) await sendAuthorizationRequest(chatId, userId, firstName, username, text, adminGroupId, env);
      else await sendMessage(chatId, `⛔ <b>權限不足</b>\nUID: <code>${userId}</code>`, { parse_mode: "HTML" }, env);
      return;
    }
  }

  const parts = text.split(" ");
  const command = parts[0].startsWith("/") ? parts[0].split("@")[0].substring(1) : null;
  const args = parts.slice(1);

  if (command) {
    switch (command) {
      case "start": case "menu": await sendMainMenu(chatId, env); return;
      case "help": await sendHelpMessage(chatId, env); return;
      case "box":
        await sendMessage(chatId, "準備好編輯你的陣容了嗎？", {
          inline_keyboard: [[{ text: "🎒 開啟我的對戰盒子", web_app: { url: `${origin}/mybox` } }]]
        }, env); return;
      case "trash":
        if (args.length > 0) await handleAddTrashCommand(chatId, userId, args, env);
        else await handleTrashCommand(chatId, userId, msg.from!, env);
        return;
      case "untrash": await handleUntrashCommand(chatId, userId, args, env); return;
      case "banlist": if (isSuperAdmin) await handleBanlistCommand(chatId, env); return;
    }
    if (leagues.find(l => l.command === command)) {
      await handleLeagueCommand(chatId, command, LIMIT_LEAGUES_SHOW, env, ctx); return;
    }
  }

  if (text.length >= 2 && !text.startsWith("/")) {
    await handlePokemonSearch(chatId, userId, text, env, ctx);
  }
}

// =========================================================
//  Webhook
// =========================================================
async function handleWebhook(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.ENV_BOT_SECRET)
    return new Response("Unauthorized", { status: 403 });
  try {
    const update = await request.json() as TelegramUpdate;
    const origin = new URL(request.url).origin;
    if (update.message) ctx.waitUntil(onMessage(update.message, env, ctx, origin));
    else if (update.callback_query) ctx.waitUntil(onCallbackQuery(update.callback_query, env, ctx));
    return new Response("Ok");
  } catch (e) { console.error(e); return new Response("Error", { status: 500 }); }
}

// =========================================================
//  handleApiNames
// =========================================================
async function handleApiNames(env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    const transRes = await fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx);
    const transData = await transRes.json() as PokemonData[];
    const baseNameMap = new Map(transData.map(p => [p.speciesId.toLowerCase(), p.speciesName]));

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
      }).filter(n => n && /[\u4E00-\u9FA5]/.test(n))
    )).sort();

    return new Response(JSON.stringify(cleanNames), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=3600" }
    });
  } catch {
    return new Response(JSON.stringify(["拉達","胖可丁","大尾立","土王"]), {
      headers: { "Content-Type": "application/json" }
    });
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
        const q = url.searchParams.get("q");
        if (!q) return new Response("{}", { status: 400 });
        const result = await getPokemonDataOnly(q, env, ctx);
        return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json; charset=utf-8" } });
      }
      if (path === "/registerWebhook") return registerWebhook(url, env);
      if (path === "/") return new Response(generateHTML(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
      if (path === "/mybox") return new Response(myBoxHtml, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });

      // 當下聯盟清單
      if (path === "/api/active-leagues") {
        const result = await getActiveLeagues();
        return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json; charset=utf-8" } });
      }

      // 帳號名稱 GET
      if (path === "/api/account-names" && request.method === "GET") {
        const uid = url.searchParams.get("userId");
        if (!uid) return new Response("[]", { status: 400 });
        const val = await env.POKEMON_KV.get(`acct_names_${uid}`);
        const names = val ? JSON.parse(val) : ['帳號 A', '帳號 B', '帳號 C', '帳號 D'];
        return new Response(JSON.stringify(names), { headers: { "Content-Type": "application/json; charset=utf-8" } });
      }

      // 帳號名稱 POST
      if (path === "/api/account-names" && request.method === "POST") {
        const { userId, names } = await request.json() as any;
        if (!userId || !Array.isArray(names)) return new Response("{}", { status: 400 });
        await env.POKEMON_KV.put(`acct_names_${userId}`, JSON.stringify(names));
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      }

      // 讀取盒子 GET
      // 回傳格式: { acct: { leaguePath: { box:[], favs:[] } } }
      if (path === "/api/box" && request.method === "GET") {
        const uid = url.searchParams.get("userId");
        if (!uid) return new Response("{}", { status: 400 });
        const activeLeagues = await getActiveLeagues();
        const result: Record<number, Record<string, { box: string[]; favs: string[] }>> = {};
        for (let a = 0; a < 4; a++) {
          result[a] = {};
          for (const l of activeLeagues) {
            const key = `box3_${uid}_${a}_${sanitizeKey(l.path)}`;
            const val = await env.POKEMON_KV.get(key);
            result[a][l.path] = val ? JSON.parse(val) : { box: [], favs: [] };
          }
        }
        return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json; charset=utf-8" } });
      }

      // 儲存盒子 POST
      if (path === "/api/box" && request.method === "POST") {
        const payload = await request.json() as any;
        const { userId, acct, leaguePath, allData } = payload;
        if (!userId || acct === undefined || !leaguePath || !allData)
          return new Response(JSON.stringify({ error: "missing fields" }), { status: 400 });

        // 儲存當前帳號所有聯盟資料（key by leaguePath）
        await Promise.all(
          Object.entries(allData).map(async ([lp, lpData]: [string, any]) => {
            const key = `box3_${userId}_${acct}_${sanitizeKey(lp)}`;
            await env.POKEMON_KV.put(key, JSON.stringify(lpData));
          })
        );

        // 只分析當前選擇的聯盟
        const cpData = allData[leaguePath] || { box: [], favs: [] };
        const teamNames: string[] = cpData.box || [];
        const favNames: string[] = cpData.favs || [];

        if (teamNames.length === 0) {
          await sendMessage(Number(userId), "⚠️ 盒子是空的，請先加入寶可夢。", null, env);
        } else {
          const result = await analyzeUserBoxTeam(leaguePath, teamNames, favNames, env, ctx);
          await sendMessage(Number(userId), `✅ <b>盒子已更新</b>\n${result}`, { parse_mode: "HTML" }, env);
        }

        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      }

      return new Response("Not Found", { status: 404 });
    } catch (e) {
      return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
    }
  }
};
