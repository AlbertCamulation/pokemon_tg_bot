// =========================================================
//  活動處理 (Event Handlers)
// =========================================================

import type { Env, EventInfo, PvPValue } from '../types';
import { getJsonData } from '../utils/cache';
import { sendMessage } from '../utils/telegram';

/**
 * 判斷活動是否在進行中或即將開始
 */
function isEventActive(dateStr: string): boolean {
  if (!dateStr) return false;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 解析日期範圍 "2026-02-04 ~ 2026-02-16" 或單日 "2026-02-04"
  const dates = dateStr.match(/(\d{4}-\d{2}-\d{2})/g);
  if (!dates || dates.length === 0) return false;

  const startDate = new Date(dates[0]);
  const endDate = dates.length > 1 ? new Date(dates[1]) : startDate;

  // 活動結束日期 + 1 天（包含當天）
  endDate.setDate(endDate.getDate() + 1);

  return today >= startDate && today <= endDate;
}

/**
 * 判斷活動是否即將開始（7天內）
 */
function isEventUpcoming(dateStr: string): boolean {
  if (!dateStr) return false;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const dates = dateStr.match(/(\d{4}-\d{2}-\d{2})/g);
  if (!dates || dates.length === 0) return false;

  const startDate = new Date(dates[0]);

  return startDate > today && startDate <= nextWeek;
}

/**
 * 格式化 PvP 價值顯示
 */
function formatPvPValue(pvpValue: PvPValue[]): string {
  if (!pvpValue || pvpValue.length === 0) return '';

  // 按聯盟分組，每個聯盟只取最高排名
  const byLeague = new Map<number, PvPValue>();

  for (const v of pvpValue) {
    const existing = byLeague.get(v.leagueCp);
    if (!existing || v.rank < existing.rank) {
      byLeague.set(v.leagueCp, v);
    }
  }

  const lines: string[] = [];

  for (const v of byLeague.values()) {
    const shadowMark = v.isShadow ? '(暗影)' : '';
    const evolutionMark = v.isEvolution ? '(進化型)' : '';
    const rankEmoji = v.rank <= 10 ? '🥇' : v.rank <= 30 ? '🥈' : '🥉';

    lines.push(`   ${rankEmoji} ${v.pokemon}${shadowMark}${evolutionMark} - ${v.league} #${v.rank}`);
  }

  return lines.join('\n');
}

/**
 * 格式化單個活動
 */
function formatEvent(event: EventInfo, isActive: boolean): string {
  const statusEmoji = isActive ? '🔥' : '📅';
  const statusText = isActive ? '[進行中]' : '[即將開始]';

  let text = `${statusEmoji} <b>${event.eventName}</b> ${statusText}\n`;
  text += `   📆 ${event.date}\n`;

  if (event.pvpValue && event.pvpValue.length > 0) {
    text += formatPvPValue(event.pvpValue) + '\n';
  } else {
    text += `   ⚪ 無 PvP 價值資料\n`;
  }

  return text;
}

/**
 * 處理 /event 指令
 */
export async function handleEventCommand(
  chatId: number,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  try {
    const events = await getJsonData<EventInfo[]>('events', 'data/events.json', env, ctx);

    if (!events || events.length === 0) {
      await sendMessage(chatId, '📅 目前沒有活動資料。', null, env);
      return;
    }

    // 分類活動：進行中 vs 即將開始
    const activeEvents: EventInfo[] = [];
    const upcomingEvents: EventInfo[] = [];

    for (const event of events) {
      // 只顯示有 PvP 價值的活動
      if (isEventActive(event.date)) {
        activeEvents.push(event);
      } else if (isEventUpcoming(event.date)) {
        upcomingEvents.push(event);
      }
    }

    // 建立訊息
    let message = '🎯 <b>近期活動 PvP 價值分析</b>\n\n';

    if (activeEvents.length === 0 && upcomingEvents.length === 0) {
      message += '目前沒有進行中或即將開始的活動。';
      await sendMessage(chatId, message, { parse_mode: 'HTML' }, env);
      return;
    }

    // 進行中的活動
    if (activeEvents.length > 0) {
      message += '━━━ 進行中 ━━━\n\n';
      for (const event of activeEvents) {
        message += formatEvent(event, true) + '\n';
      }
    }

    // 即將開始的活動
    if (upcomingEvents.length > 0) {
      if (activeEvents.length > 0) message += '\n';
      message += '━━━ 即將開始 ━━━\n\n';
      for (const event of upcomingEvents.slice(0, 5)) {
        message += formatEvent(event, false) + '\n';
      }
    }

    // 加入說明
    message += '\n💡 <i>排名越高 = PvP 越強，建議多抓！</i>';

    await sendMessage(chatId, message, { parse_mode: 'HTML' }, env);

  } catch (error) {
    console.error('Event command error:', error);
    await sendMessage(chatId, '❌ 取得活動資料時發生錯誤。', null, env);
  }
}

/**
 * 處理 /pvp 指令 - 只顯示有高 PvP 價值的活動
 */
export async function handlePvPEventCommand(
  chatId: number,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  try {
    const events = await getJsonData<EventInfo[]>('events', 'data/events.json', env, ctx);

    if (!events || events.length === 0) {
      await sendMessage(chatId, '📅 目前沒有活動資料。', null, env);
      return;
    }

    // 找出有高 PvP 價值的活動（排名前 30）
    const valuableEvents: { event: EventInfo; topPick: PvPValue }[] = [];

    for (const event of events) {
      if (!isEventActive(event.date) && !isEventUpcoming(event.date)) continue;
      if (!event.pvpValue || event.pvpValue.length === 0) continue;

      // 找出最高價值的寶可夢
      const topPick = event.pvpValue.reduce((best, current) =>
        current.rank < best.rank ? current : best
      );

      if (topPick.rank <= 30) {
        valuableEvents.push({ event, topPick });
      }
    }

    if (valuableEvents.length === 0) {
      await sendMessage(
        chatId,
        '📅 目前沒有高 PvP 價值的活動（排名前 30）。',
        null,
        env
      );
      return;
    }

    // 按排名排序
    valuableEvents.sort((a, b) => a.topPick.rank - b.topPick.rank);

    let message = '⭐ <b>必抓活動！</b>\n\n';

    for (const { event, topPick } of valuableEvents) {
      const isActive = isEventActive(event.date);
      const statusEmoji = isActive ? '🔥' : '📅';
      const shadowMark = topPick.isShadow ? '(暗影)' : '';

      message += `${statusEmoji} <b>${event.eventName}</b>\n`;
      message += `   🏆 ${topPick.pokemon}${shadowMark} - ${topPick.league} <b>#${topPick.rank}</b>\n`;
      message += `   📆 ${event.date}\n\n`;
    }

    message += '💡 <i>這些活動的寶可夢在 PvP 排名很高！</i>';

    await sendMessage(chatId, message, { parse_mode: 'HTML' }, env);

  } catch (error) {
    console.error('PvP event command error:', error);
    await sendMessage(chatId, '❌ 取得活動資料時發生錯誤。', null, env);
  }
}
