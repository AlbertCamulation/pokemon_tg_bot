// =========================================================
//  垃圾清單處理 (Trash List Handlers)
// =========================================================

import type { Env, TelegramUser } from '../types';
import { sendMessage } from '../utils/telegram';
import { getTrashList, addToTrashList, removeFromTrashList } from '../utils/kv';
import { escapeHtml } from '../utils/helpers';

/**
 * 處理垃圾清單查詢
 */
export async function handleTrashCommand(
  chatId: number,
  userId: number,
  messageFrom: TelegramUser,
  env: Env
): Promise<void> {
  const trashList = await getTrashList(userId, env);
  const userName = messageFrom.first_name || "訓練家";
  const safeName = escapeHtml(userName);

  if (trashList.length === 0) {
    await sendMessage(
      chatId,
      `您好, ${safeName}\n您的垃圾清單目前是空的。`,
      null,
      env
    );
    return;
  }

  const replyMessage = `您好, ${safeName}\n您的垃圾清單：\n\n<code>${trashList.join(",")}</code>`;
  await sendMessage(chatId, replyMessage, { parse_mode: "HTML" }, env);
}

/**
 * 處理加入垃圾清單
 */
export async function handleAddTrashCommand(
  chatId: number,
  userId: number,
  pokemonNames: string[],
  env: Env
): Promise<void> {
  await addToTrashList(userId, pokemonNames, env);
  await sendMessage(chatId, `已加入: ${pokemonNames.join(", ")}`, null, env);
}

/**
 * 處理移除垃圾清單
 */
export async function handleUntrashCommand(
  chatId: number,
  userId: number,
  pokemonNames: string[],
  env: Env
): Promise<void> {
  const removed = await removeFromTrashList(userId, pokemonNames, env);

  if (removed.length > 0) {
    await sendMessage(chatId, `已移除：${removed.join(", ")}`, null, env);
  } else {
    await sendMessage(chatId, "清單中找不到這些寶可夢。", null, env);
  }
}
