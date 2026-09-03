// =========================================================
//  實用工具函數 (Helper Utilities)
// =========================================================

import { typeChart, allTypes, typeNames } from '../constants';
import type { TypeMultiplier } from '../types';

/**
 * HTML 跳脫處理 (防止 XSS)
 */
export function escapeHtml(unsafe: string | undefined | null): string {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * 取得寶可夢評級
 */
export function getPokemonRating(rank: number | string): string {
  if (typeof rank === "number") {
    if (rank <= 10) return "🥇白金";
    if (rank <= 25) return "🥇金";
    if (rank <= 50) return "🥈銀";
    if (rank <= 100) return "🥉銅";
  }

  if (typeof rank === "string") {
    const map: Record<string, string> = {
      "S": "🥇白金",
      "A+": "🥇金",
      "A": "🥈銀",
      "B+": "🥉銅"
    };
    return map[rank] || "垃圾";
  }

  return "垃圾";
}

/**
 * 翻譯寶可夢名稱 (硬編碼修正)
 */
export function getTranslatedName(
  id: string,
  nameStr: string | undefined
): string {
  let name = String(nameStr || id || "");

  // 硬編碼修正
  if (name === "Giratina (Altered)") return "騎拉帝納 別種";
  if (name === "Giratina (Altered) (Shadow)") return "騎拉帝納 別種 暗影";
  if (name === "Claydol (Shadow)") return "念力土偶 暗影";
  if (name === "Cradily") return "搖籃百合";

  // 安全的 includes 檢查
  if (name.includes("Hydreigon") && name.includes("Shadow")) return "三首惡龍 暗影";
  if (name.includes("Toucannon") && name.includes("Shadow")) return "銃嘴大鳥 暗影";
  if (name.includes("Snorlax") && name.includes("Gigantamax")) return "卡比獸 超極巨化";
  if (name.includes("Lapras") && name.includes("Gigantamax")) return "拉普拉斯 超極巨化";
  if (name.includes("Aegislash") && name.includes("Shield")) return "堅盾劍怪 盾牌";

  return name;
}

/**
 * 計算防禦屬性加成 (給定防守方屬性，回傳各攻擊屬性的倍率)
 */
export function getDefenseProfile(defTypes: string[]): TypeMultiplier {
  const profile: TypeMultiplier = {};

  allTypes.forEach(attackType => {
    let multiplier = 1.0;

    defTypes.forEach(t => {
      const typeLower = t.toLowerCase();
      let factor = 1.0;
      if (typeChart[attackType]?.[typeLower] !== undefined) {
        factor = typeChart[attackType][typeLower];
      }
      multiplier *= factor;
    });

    profile[attackType] = multiplier;
  });

  return profile;
}

/**
 * 取得弱點屬性列表
 */
export function getWeaknesses(defTypes: string[]): string[] {
  const profile = getDefenseProfile(defTypes);
  return Object.entries(profile)
    .filter(([_, val]) => val > 1.0)
    .map(([type]) => type);
}

/**
 * 取得抗性屬性列表
 */
export function getResistances(defTypes: string[]): string[] {
  const profile = getDefenseProfile(defTypes);
  return Object.entries(profile)
    .filter(([_, val]) => val < 1.0)
    .map(([type]) => type);
}

/**
 * 屬性名稱轉中文
 */
export function getTypeNameChinese(type: string): string {
  return typeNames[type.toLowerCase()] || type;
}

/**
 * 取得屬性中文列表字串
 */
export function getTypesString(types: string[]): string {
  const chiTypes = types
    .filter(t => t.toLowerCase() !== "none")
    .map(t => typeNames[t.toLowerCase()] || t);
  return `(${chiTypes.join("/")})`;
}

/**
 * 取得今天的日期字串 (台北時區, YYYY-MM-DD 格式)
 */
export function getTodayDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
}

/**
 * 檢查活動是否已結束
 */
export function isEventEnded(dateStr: string | undefined): boolean {
  if (!dateStr) return false;

  const today = getTodayDateString();
  const parts = dateStr.split(/[~～]/);
  const endDate = (parts.length > 1 ? parts[1] : parts[0]).trim();

  return endDate < today;
}

/**
 * 陣列分塊 (chunk)
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from(
    { length: Math.ceil(arr.length / size) },
    (_, i) => arr.slice(i * size, i * size + size)
  );
}
