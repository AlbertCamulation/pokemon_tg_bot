// =========================================================
//  Telegram API 工具函數 (Telegram API Utilities)
// =========================================================

import type {
  Env,
  TelegramSendMessageResponse,
  SendMessageOptions
} from '../types';

/**
 * 發送 Telegram 訊息
 */
export async function sendMessage(
  chatId: number | string,
  text: string,
  options: SendMessageOptions | null = null,
  env: Env
): Promise<TelegramSendMessageResponse> {
  if (!text) {
    return { ok: false, description: 'Empty text' };
  }

  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text: text,
    link_preview_options: { is_disabled: true }
  };

  if (options) {
    if (options.inline_keyboard) {
      payload.reply_markup = { inline_keyboard: options.inline_keyboard };
    }
    payload.parse_mode = options.parse_mode || "HTML";
  } else {
    payload.parse_mode = "HTML";
  }

  const response = await fetch(
    `https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  );

  return await response.json() as TelegramSendMessageResponse;
}

/**
 * 編輯 Telegram 訊息
 */
export async function editMessage(
  chatId: number | string,
  messageId: number,
  text: string,
  options: SendMessageOptions | null = null,
  env: Env
): Promise<TelegramSendMessageResponse> {
  if (!text) return { ok: false, description: 'Empty text' };

  const payload: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text: text,
    link_preview_options: { is_disabled: true }
  };

  if (options) {
    if (options.inline_keyboard) {
      payload.reply_markup = { inline_keyboard: options.inline_keyboard };
    }
    payload.parse_mode = options.parse_mode || "HTML";
  } else {
    payload.parse_mode = "HTML";
  }

  const response = await fetch(
    `https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/editMessageText`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  );

  return await response.json() as TelegramSendMessageResponse;
}

/**
 * 刪除 Telegram 訊息
 */
export async function deleteMessage(
  chatId: number | string,
  messageId: number,
  env: Env
): Promise<void> {
  await fetch(
    `https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/deleteMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId })
    }
  );
}

/**
 * 回應 Callback Query
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text: string,
  env: Env
): Promise<void> {
  await fetch(
    `https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/answerCallbackQuery`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text })
    }
  );
}

/**
 * 註冊 Webhook
 */
export async function registerWebhook(
  url: URL,
  env: Env
): Promise<Response> {
  const webhookUrl = `${url.protocol}//${url.hostname}/endpoint`;
  const commands = [
    { command: "start", description: "啟動 Pokemon PvP 選單" },
    { command: "menu", description: "開啟功能選單" },
    { command: "help", description: "使用說明" },
    { command: "trash", description: "查看或新增垃圾清單" },
    { command: "untrash", description: "移除垃圾清單項目" },
    { command: "super", description: "可超級進化寶可夢清單" },
    { command: "addsuper", description: "新增超級進化寶可夢" },
    { command: "delsuper", description: "按鈕刪除超級進化寶可夢" }
  ];
  const groupId = Number(env.ADMIN_GROUP_UID);
  const commandRequests = [
    fetch(
      `https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/setMyCommands`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commands })
      }
    )
  ];

  // 群組範圍的指令優先於預設指令，必須明確覆蓋舊的 group scope。
  if (Number.isSafeInteger(groupId)) {
    commandRequests.push(
      fetch(
        `https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/setMyCommands`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commands, scope: { type: "chat", chat_id: groupId } })
        }
      )
    );
  }

  const [webhookRes, ...commandResponses] = await Promise.all([
    fetch(
      `https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: env.ENV_BOT_SECRET
        })
      }
    ),
    ...commandRequests
  ]);

  if (!webhookRes.ok || commandResponses.some(response => !response.ok)) {
    console.error("Telegram registration failed", webhookRes.status, commandResponses.map(response => response.status));
    return new Response("Telegram registration failed", { status: 500 });
  }

  return new Response("Webhook and command menu registered");
}

/**
 * 取消註冊 Webhook
 */
export async function unRegisterWebhook(env: Env): Promise<Response> {
  const res = await fetch(
    `https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/deleteWebhook`
  );
  return new Response(await res.text());
}
