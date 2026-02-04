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
): Promise<void> {
  if (!text) return;

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

  await fetch(
    `https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/editMessageText`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  );
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
  fetch(
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

  const res = await fetch(
    `https://api.telegram.org/bot${env.ENV_BOT_TOKEN}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: env.ENV_BOT_SECRET
      })
    }
  );

  return new Response(await res.text());
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
