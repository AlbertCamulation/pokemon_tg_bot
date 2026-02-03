// =========================================================
//  管理員功能處理 (Admin Handlers)
// =========================================================

import type { Env, TelegramInlineKeyboardButton } from '../types';
import { sendMessage, editMessage, answerCallbackQuery } from '../utils/telegram';
import {
  getAllowedUserIds,
  setAllowedUserIds,
  getBannedUsers,
  setBannedUsers,
  addToAllowedList,
  removeFromAllowedList,
  addToBannedList,
  removeFromBannedList
} from '../utils/kv';
import { escapeHtml } from '../utils/helpers';

/**
 * 處理允許 UID 指令
 */
export async function handleAllowUidCommand(
  chatId: number,
  uid: string,
  env: Env
): Promise<void> {
  await addToAllowedList(Number(uid), env);
  await sendMessage(chatId, "Added", null, env);
}

/**
 * 處理刪除 UID 指令
 */
export async function handleDelUidCommand(
  chatId: number,
  uid: string,
  env: Env
): Promise<void> {
  await removeFromAllowedList(Number(uid), env);
  await sendMessage(chatId, "Removed", null, env);
}

/**
 * 處理黑名單管理面板
 */
export async function handleBanlistCommand(
  chatId: number,
  env: Env
): Promise<void> {
  const bannedMap = await getBannedUsers(env);
  const bannedIds = Object.keys(bannedMap);

  if (bannedIds.length === 0) {
    await sendMessage(chatId, "🎉 目前沒有人在黑名單中。", null, env);
    return;
  }

  // 製作按鈕：顯示儲存的名字
  const keyboard: TelegramInlineKeyboardButton[][] = bannedIds.map(uid => {
    const name = bannedMap[uid] || "Unknown";
    return [{ text: `🔓 解封: ${name}`, callback_data: `unban_btn_${uid}` }];
  });
  keyboard.push([{ text: "❌ 關閉", callback_data: "close_menu" }]);

  await sendMessage(
    chatId,
    `💀 <b>黑名單管理</b>\n點擊按鈕解封：`,
    { parse_mode: "HTML", inline_keyboard: keyboard },
    env
  );
}

/**
 * 處理審核通過
 */
export async function handleApproveUser(
  chatId: number,
  messageId: number,
  targetUid: number,
  targetName: string,
  operatorName: string,
  env: Env
): Promise<void> {
  // 加入白名單
  await addToAllowedList(targetUid, env);

  // 確保不在黑名單
  await removeFromBannedList(targetUid, env);

  // 更新訊息
  await editMessage(
    chatId,
    messageId,
    `✅ <b>已核准</b>\n操作者: ${operatorName}\n用戶: ${targetName}`,
    null,
    env
  );

  // 通知用戶
  try {
    await sendMessage(targetUid, "✅ 管理員已開通您的權限！", null, env);
  } catch {
    // 忽略錯誤
  }
}

/**
 * 處理封禁用戶
 */
export async function handleBanUser(
  chatId: number,
  messageId: number,
  targetUid: number,
  targetName: string,
  operatorName: string,
  env: Env
): Promise<void> {
  // 加入黑名單
  await addToBannedList(targetUid, targetName, env);

  // 移出白名單
  await removeFromAllowedList(targetUid, env);

  // 更新訊息
  await editMessage(
    chatId,
    messageId,
    `🚫 <b>已永久封禁</b>\n操作者: ${operatorName}\n用戶: ${targetName}`,
    null,
    env
  );
}

/**
 * 處理解封用戶
 */
export async function handleUnbanUser(
  chatId: number,
  messageId: number,
  targetUid: string,
  callbackQueryId: string,
  env: Env
): Promise<void> {
  const bannedMap = await getBannedUsers(env);

  if (bannedMap[targetUid]) {
    delete bannedMap[targetUid];
    await setBannedUsers(bannedMap, env);

    await answerCallbackQuery(callbackQueryId, `已解封`, env);

    // 刷新面板
    const remainingIds = Object.keys(bannedMap);
    if (remainingIds.length === 0) {
      await editMessage(chatId, messageId, "🎉 黑名單已清空！", null, env);
    } else {
      const newKeyboard: TelegramInlineKeyboardButton[][] = remainingIds.map(uid => {
        const name = bannedMap[uid] || "Unknown";
        return [{ text: `🔓 解封: ${name}`, callback_data: `unban_btn_${uid}` }];
      });
      newKeyboard.push([{ text: "❌ 關閉", callback_data: "close_menu" }]);

      await editMessage(
        chatId,
        messageId,
        `💀 <b>黑名單管理</b>\n(已解封: ${targetUid})`,
        { parse_mode: "HTML", inline_keyboard: newKeyboard },
        env
      );
    }
  } else {
    await answerCallbackQuery(callbackQueryId, "此用戶已不在清單中", env);
  }
}

/**
 * 發送未授權通知給管理群組
 */
export async function sendAuthorizationRequest(
  chatId: number,
  userId: number,
  firstName: string,
  username: string | undefined,
  messageText: string,
  adminGroupId: string,
  env: Env
): Promise<void> {
  // 發送給用戶
  await sendMessage(
    chatId,
    `⛔ <b>權限不足</b>\n您的 UID (<code>${userId}</code>) 未授權。\n已自動提交申請給管理員。`,
    { parse_mode: "HTML" },
    env
  );

  // 發送給管理群組
  const safeName = escapeHtml(firstName);
  const safeText = escapeHtml(messageText);
  const safeUser = escapeHtml(username ? `@${username}` : "無");

  const adminMsg = `🚨 <b>申請存取</b>\n\n👤 <b>使用者:</b> ${safeName} (${safeUser})\n🆔 <b>UID:</b> <code>${userId}</code>\n💬 <b>訊息:</b> ${safeText}`;

  const adminOptions = {
    parse_mode: "HTML" as const,
    inline_keyboard: [[
      { text: "✅ 批准", callback_data: `approve_uid_${userId}` },
      { text: "🚫 封禁", callback_data: `ban_uid_${userId}` }
    ]]
  };

  await sendMessage(adminGroupId, adminMsg, adminOptions, env);
}
