// =========================================================
//  選單與按鈕處理 (Menu & Button Handlers)
// =========================================================

import type { Env, TelegramInlineKeyboardButton } from '../types';
import { leagues, typeChart, typeNames, allTypes } from '../constants';
import { sendMessage } from '../utils/telegram';
import { chunk } from '../utils/helpers';

/**
 * 生成主選單鍵盤
 */
export function generateMainMenu(): TelegramInlineKeyboardButton[][] {
  const keyboard: TelegramInlineKeyboardButton[][] = [];

  const add = (items: typeof leagues) => {
    const btns = items.map(l => ({
      text: l.name,
      callback_data: l.command
    }));
    keyboard.push(...chunk(btns, 2));
  };

  // Meta 分析按鈕
  keyboard.push([{
    text: "📊 三聯盟 Meta 生態分析",
    callback_data: "meta_analysis"
  }]);

  // 各聯盟分組
  const groups: Record<string, typeof leagues> = {
    "🏆 超級 (1500)": leagues.filter(l => l.cp === "1500"),
    "高級 (2500)": leagues.filter(l => l.cp === "2500"),
    "👑 大師 (Max)": leagues.filter(l => l.cp === "10000"),
    "📊 PvE": leagues.filter(l => l.cp === "Any")
  };

  for (const [title, items] of Object.entries(groups)) {
    keyboard.push([{ text: `--- ${title} ---`, callback_data: "dummy" }]);
    add(items);
  }

  // 屬性查詢按鈕
  keyboard.push([
    { text: "攻擊屬性查詢", callback_data: "menu_atk_types" },
    { text: "🛡️ 防禦屬性查詢", callback_data: "menu_def_types" }
  ]);

  // 其他功能
  keyboard.push([
    { text: "📝 垃圾清單", callback_data: "trash_list" },
    { text: "ℹ️ 說明", callback_data: "help_menu" }
  ]);

  // 當下聯盟按鈕
  keyboard.push([{
    text: "🔥 當下聯盟 (整合搜尋)",
    callback_data: "current_leagues"
  }]);

  return keyboard;
}

/**
 * 發送主選單
 */
export async function sendMainMenu(
  chatId: number,
  env: Env
): Promise<void> {
  const text = "🤖 <b>PvP 查詢機器人</b>\n請選擇功能或直接輸入名稱查詢。";
  const keyboard = generateMainMenu();
  await sendMessage(chatId, text, { inline_keyboard: keyboard, parse_mode: "HTML" }, env);
}

/**
 * 發送說明訊息
 */
export async function sendHelpMessage(
  chatId: number,
  env: Env
): Promise<void> {
  const helpText = `🤖 <b>使用說明</b>
🔍 輸入名稱查詢 (例: 瑪力露麗)
📊 點擊 Meta 分析查看最新生態
🗑️ /trash [名稱] 管理垃圾清單`;

  await sendMessage(chatId, helpText, { parse_mode: "HTML" }, env);
}

/**
 * 發送屬性選擇選單
 */
export async function sendTypeSelectionMenu(
  chatId: number,
  mode: 'atk' | 'def',
  env: Env
): Promise<void> {
  const title = mode === "atk"
    ? "<b>攻擊屬性查詢</b>\n請選擇攻擊招式的屬性："
    : "🛡️ <b>防禦屬性查詢</b>\n請選擇防守方(自己)的屬性：";

  const keyboard: TelegramInlineKeyboardButton[][] = [];
  const types = Object.keys(typeNames);

  for (let i = 0; i < types.length; i += 3) {
    const row = types.slice(i, i + 3).map(t => ({
      text: typeNames[t],
      callback_data: `type_${mode}_${t}`
    }));
    keyboard.push(row);
  }

  keyboard.push([{ text: "🔙 回主選單", callback_data: "main_menu" }]);

  await sendMessage(chatId, title, { inline_keyboard: keyboard, parse_mode: "HTML" }, env);
}

/**
 * 處理屬性詳細資訊
 */
export async function handleTypeDetail(
  chatId: number,
  typeKey: string,
  mode: 'atk' | 'def',
  env: Env
): Promise<void> {
  const typeName = typeNames[typeKey];
  let msg = "";

  if (mode === "atk") {
    const strongAgainst: string[] = [];

    Object.entries(typeChart[typeKey] || {}).forEach(([target, multiplier]) => {
      if (multiplier > 1.0) {
        strongAgainst.push(`${typeNames[target]} (${multiplier}x)`);
      }
    });

    msg = `<b>${typeName}屬性 (攻擊方)</b>

💪 <b>效果絕佳 (1.6x)：</b>
${strongAgainst.length ? strongAgainst.join("\n") : "無"}

<i>(註：Pokemon GO 剋制倍率為 1.6)</i>`;

  } else {
    const resistantTo: string[] = [];
    const immuneTo: string[] = [];

    allTypes.forEach(attacker => {
      let multiplier = 1.0;
      if (typeChart[attacker]?.[typeKey] !== undefined) {
        multiplier = typeChart[attacker][typeKey];
      }

      if (multiplier < 1.0) {
        const text = `${typeNames[attacker]} (${multiplier}x)`;
        if (multiplier < 0.6) {
          immuneTo.push(text);
        } else {
          resistantTo.push(text);
        }
      }
    });

    msg = `🛡️ <b>${typeName}屬性 (防守方)</b>

🚫 <b>被雙抗/無效 (0.39x)：</b>
${immuneTo.length ? immuneTo.join("\n") : "無"}

🛡️ <b>具有抗性 (0.625x)：</b>
${resistantTo.length ? resistantTo.join("\n") : "無"}`;
  }

  const keyboard = [[{ text: "🔙 回上一層", callback_data: `menu_${mode}_types` }]];

  await sendMessage(chatId, msg, { inline_keyboard: keyboard, parse_mode: "HTML" }, env);
}
