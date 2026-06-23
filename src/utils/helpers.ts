// =========================================================
//  實用工具函數 (Helper Utilities)
// =========================================================

import { typeChart, allTypes, typeNames, SUFFIX_MAP } from '../constants';
import type { TypeMultiplier } from '../types';

/**
 * 取得寶可夢評級 (依名次)
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
      "S": "🥇白金", "A+": "🥇金", "A": "🥈銀", "B+": "🥉銅"
    };
    return map[rank] || "垃圾";
  }

  return "垃圾";
}

/**
 * 依分數取得等級圖示 (盒子分析用)
 */
export function getScoreIcon(score: number): string {
  if (score >= 90) return "🥇白金";
  if (score >= 80) return "🥇金";
  if (score >= 70) return "🥈銀";
  return "🥉銅";
}

/**
 * 翻譯寶可夢名稱 (硬編碼修正 — 用於英文名來源)
 */
export function getTranslatedName(id: string, nameStr: string | undefined): string {
  let name = String(nameStr || id || "");

  if (name === "Giratina (Altered)") return "騎拉帝納 別種";
  if (name === "Giratina (Altered) (Shadow)") return "騎拉帝納 別種 暗影";
  if (name === "Claydol (Shadow)") return "念力土偶 暗影";
  if (name === "Cradily") return "搖籃百合";
  if (name.includes("Hydreigon") && name.includes("Shadow")) return "三首惡龍 暗影";
  if (name.includes("Toucannon") && name.includes("Shadow")) return "銃嘴大鳥 暗影";
  if (name.includes("Snorlax") && name.includes("Gigantamax")) return "卡比獸 超極巨化";
  if (name.includes("Lapras") && name.includes("Gigantamax")) return "拉普拉斯 超極巨化";
  if (name.includes("Aegislash") && name.includes("Shield")) return "堅盾劍怪 盾牌";

  return name;
}

/**
 * 核心中文名稱解析 (整合自 league/box/worker 四處重複版本)
 * 精準拔除型態後綴以還原基礎型態，再補回中文型態標記。
 */
export function getFullName(speciesId: string, nameMap: Map<string, string>): string {
  const id = speciesId.toLowerCase();

  // 1. 直接命中
  if (nameMap.has(id)) return nameMap.get(id)!;

  // 2. 拔除已知後綴還原基礎型態 (僅在字尾)
  let baseId = id;
  for (const s of ["_shadow", "_mega", "_xl", "_apex"]) {
    if (baseId.endsWith(s)) baseId = baseId.slice(0, -s.length);
  }

  let name = nameMap.get(baseId) || speciesId;

  // 3. 補回中文型態標記
  if (name && !name.includes("(")) {
    for (const [key, zh] of Object.entries(SUFFIX_MAP)) {
      const zhClean = zh.replace(/[()]/g, '').trim();
      if (id.includes(key) && !name.includes(zhClean)) name += zh;
    }
  }

  // 4. 已知例外修正
  if (id.startsWith("cradily")) name = "搖籃百合" + (id.includes("_shadow") ? " (暗影)" : "");
  if (id.startsWith("golisopod")) name = "具甲武者" + (id.includes("_shadow") ? " (暗影)" : "");
  if (id === "victreebel_mega") name = "大食花 (Mega)";
  if (id === "malamar_mega") name = "烏賊王 (Mega)";

  return name;
}

/**
 * 取「複製用」基礎名稱 (只取空格或括號前的字)
 */
export function toCopyName(name: string): string {
  return name.split(/[\s(]/)[0].trim();
}

// --- 屬性計算 (記憶化) ---
const defenseCache = new Map<string, TypeMultiplier>();

/**
 * 計算防禦屬性加成 (給定防守方屬性，回傳各攻擊屬性的倍率)
 */
export function getDefenseProfile(defTypes: string[]): TypeMultiplier {
  const key = defTypes.map(t => t.toLowerCase()).sort().join(',');
  const cached = defenseCache.get(key);
  if (cached) return cached;

  const profile: TypeMultiplier = {};
  allTypes.forEach(attackType => {
    let multiplier = 1.0;
    defTypes.forEach(t => {
      const typeLower = t.toLowerCase();
      if (typeLower === 'none') return;
      const factor = typeChart[attackType]?.[typeLower];
      if (factor !== undefined) multiplier *= factor;
    });
    profile[attackType] = multiplier;
  });

  defenseCache.set(key, profile);
  return profile;
}

/**
 * 取得弱點屬性列表 (英文 key)
 */
export function getWeaknesses(defTypes: string[]): string[] {
  const profile = getDefenseProfile(defTypes);
  return Object.entries(profile).filter(([, v]) => v > 1.0).map(([t]) => t);
}

/**
 * 取得抗性屬性列表 (英文 key)
 */
export function getResistances(defTypes: string[]): string[] {
  const profile = getDefenseProfile(defTypes);
  return Object.entries(profile).filter(([, v]) => v < 1.0).map(([t]) => t);
}

/**
 * 屬性名稱轉中文
 */
export function getTypeNameChinese(type: string): string {
  return typeNames[type.toLowerCase()] || type;
}

/**
 * 取得今天的日期字串 (台北時區, YYYY-MM-DD)
 */
export function getTodayDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
}

/**
 * 取得活動結束日 (YYYY-MM-DD)，無日期回傳 null
 */
export function getEventEndDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  const parts = dateStr.split(/[~～]/);
  return (parts.length > 1 ? parts[1] : parts[0]).trim() || null;
}
