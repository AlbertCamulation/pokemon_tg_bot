// =========================================================
//  屬性相剋查詢 (Type Effectiveness) — 回傳結構化 JSON
// =========================================================

import { typeChart, typeNames, allTypes } from '../constants';
import type { TypeQueryResult, TypeMatchEntry } from '../types';

/**
 * 查詢某屬性的攻擊/防禦相剋關係
 * - atk: 此屬性「攻擊」時，對哪些屬性效果絕佳
 * - def: 此屬性「防守」時，被哪些屬性剋制 / 抗性 / 雙抗
 */
export function getTypeQuery(typeKey: string, mode: 'atk' | 'def'): TypeQueryResult | null {
  const key = typeKey.toLowerCase();
  if (!typeNames[key]) return null;

  const mk = (type: string, multiplier: number): TypeMatchEntry =>
    ({ type, name: typeNames[type] || type, multiplier });

  const result: TypeQueryResult = {
    type: key, name: typeNames[key], mode,
    superEffective: [], resist: [], immune: []
  };

  if (mode === "atk") {
    Object.entries(typeChart[key] || {}).forEach(([target, m]) => {
      if (m > 1.0) result.superEffective.push(mk(target, m));
    });
  } else {
    allTypes.forEach(attacker => {
      const m = typeChart[attacker]?.[key] ?? 1.0;
      if (m > 1.0) result.superEffective.push(mk(attacker, m));
      else if (m < 0.6) result.immune.push(mk(attacker, m));
      else if (m < 1.0) result.resist.push(mk(attacker, m));
    });
  }

  result.superEffective.sort((a, b) => b.multiplier - a.multiplier);
  result.resist.sort((a, b) => a.multiplier - b.multiplier);
  result.immune.sort((a, b) => a.multiplier - b.multiplier);
  return result;
}

/**
 * 取得全部屬性 key + 中文名 (前端選單用)
 */
export function getAllTypeOptions(): Array<{ key: string; name: string }> {
  return Object.keys(typeNames).map(k => ({ key: k, name: typeNames[k] }));
}
