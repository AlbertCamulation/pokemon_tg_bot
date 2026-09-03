// =========================================================
//  Pokemon GO 超級進化清單
// =========================================================

import type { Env, TelegramInlineKeyboardButton } from '../types';
import { SUPER_LIST_KEY } from '../constants';
import { editMessage, sendMessage } from '../utils/telegram';
import { escapeHtml } from '../utils/helpers';

// 截至 2026-09-03 已在 Pokemon GO 實裝的超級進化；原始回歸依遊戲機制一併列入。
const DEFAULT_SUPER_POKEMON = [
  '妙蛙花', '噴火龍', '水箭龜', '大針蜂', '大比鳥', '胡地',
  '呆殼獸', '耿鬼', '袋獸', '凱羅斯', '暴鯉龍', '化石翼龍',
  '電龍', '大鋼蛇', '巨鉗螳螂', '赫拉克羅斯', '黑魯加', '班基拉斯',
  '蜥蜴王', '火焰雞', '巨沼怪', '沙奈朵', '勾魂眼', '大嘴娃',
  '波士可多拉', '恰雷姆', '雷電獸', '巨牙鯊', '噴火駝', '七夕青鳥',
  '詛咒娃娃', '阿勃梭魯', '冰鬼護', '暴雪王', '血翼飛龍', '巨金怪',
  '拉帝亞斯', '拉帝歐斯', '固拉多', '蓋歐卡',
  '烈咬陸鯊', '長耳兔', '路卡利歐', '艾路雷朵', '差不多娃娃', '蒂安希',
  '大食花', '快龍', '烏賊王', '列陣兵', '超夢', '盔甲鳥',
  '雷丘', '寶石海星', '布里卡隆', '妖火紅狐', '甲賀忍蛙'
] as const;

function normalizeName(name: string): string {
  return name
    .replace(/[（(][^（）()]*[）)]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  return names.filter(name => {
    const key = name.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function getSuperList(env: Env): Promise<string[]> {
  const stored = await env.POKEMON_KV.get(SUPER_LIST_KEY, 'json') as unknown;
  if (!Array.isArray(stored)) return [...DEFAULT_SUPER_POKEMON];
  return uniqueNames(stored.filter((name): name is string => typeof name === 'string').map(normalizeName).filter(Boolean));
}

async function saveSuperList(list: string[], env: Env): Promise<void> {
  await env.POKEMON_KV.put(SUPER_LIST_KEY, JSON.stringify(uniqueNames(list)));
}

function renderSuperList(list: string[]): string {
  return `⚡ <b>Pokemon GO 可超級進化清單</b>（${list.length} 隻）\n\n<code>${escapeHtml(list.join(','))}</code>\n\n` +
    '管理員：<code>/addsuper 寶可夢名稱</code> 新增\n<code>/delsuper</code> 以按鈕刪除';
}

function deletionKeyboard(list: string[]): TelegramInlineKeyboardButton[][] {
  const buttons = list.map((name, index) => ({ text: `🗑 ${name}`, callback_data: `super_del_${index}` }));
  const rows: TelegramInlineKeyboardButton[][] = [];
  for (let index = 0; index < buttons.length; index += 2) rows.push(buttons.slice(index, index + 2));
  rows.push([{ text: '❌ 取消刪除', callback_data: 'close_menu' }]);
  return rows;
}

function renderDeletionMenu(list: string[]): string {
  return list.length === 0
    ? '⚡ <b>超級進化清單目前是空的。</b>\n使用 <code>/addsuper 寶可夢名稱</code> 新增。'
    : `🗑 <b>選擇要刪除的寶可夢</b>（${list.length} 隻）\n點擊名稱會立即刪除。`;
}

export async function handleSuperCommand(chatId: number, env: Env): Promise<void> {
  await sendMessage(chatId, renderSuperList(await getSuperList(env)), { parse_mode: 'HTML' }, env);
}

export async function handleAddSuperCommand(chatId: number, rawName: string, env: Env): Promise<void> {
  const name = normalizeName(rawName);
  if (!name) {
    await sendMessage(chatId, '用法：<code>/addsuper 寶可夢名稱</code>', { parse_mode: 'HTML' }, env);
    return;
  }
  if (name.length > 24) {
    await sendMessage(chatId, '寶可夢名稱請限制在 24 個字以內。', null, env);
    return;
  }

  const list = await getSuperList(env);
  if (list.some(item => item.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    await sendMessage(chatId, `清單已有 <b>${escapeHtml(name)}</b>。`, { parse_mode: 'HTML' }, env);
    return;
  }
  list.push(name);
  await saveSuperList(list, env);
  await sendMessage(chatId, `✅ 已新增 <b>${escapeHtml(name)}</b>。`, { parse_mode: 'HTML' }, env);
}

export async function handleDeleteSuperCommand(chatId: number, env: Env): Promise<void> {
  const list = await getSuperList(env);
  await sendMessage(chatId, renderDeletionMenu(list), {
    parse_mode: 'HTML',
    inline_keyboard: list.length ? deletionKeyboard(list) : undefined
  }, env);
}

export async function handleDeleteSuperButton(chatId: number, messageId: number, itemIndex: number, env: Env): Promise<string | null> {
  const list = await getSuperList(env);
  const name = list[itemIndex];
  if (!name) return null;

  list.splice(itemIndex, 1);
  await saveSuperList(list, env);
  await editMessage(chatId, messageId, `✅ 已刪除：<b>${escapeHtml(name)}</b>\n\n${renderDeletionMenu(list)}`, {
    parse_mode: 'HTML',
    inline_keyboard: list.length ? deletionKeyboard(list) : undefined
  }, env);
  return name;
}
