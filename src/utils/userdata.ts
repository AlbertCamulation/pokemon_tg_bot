// =========================================================
//  使用者個人資料 (Box / Trash / 帳號名稱) — 以登入身分 (sub) 為 key
// =========================================================

import type { Env } from '../types';
import { BOX_PREFIX, TRASH_PREFIX, ACCT_NAMES_PREFIX } from '../constants';

export interface CpBox { box: string[]; favs: string[] }

const DEFAULT_ACCT_NAMES = ['帳號 A', '帳號 B', '帳號 C', '帳號 D'];

// ── 帳號名稱 ──
export async function getAccountNames(sub: string, env: Env): Promise<string[]> {
  const val = await env.POKEMON_KV.get(ACCT_NAMES_PREFIX + sub, "json");
  if (Array.isArray(val) && val.length === 4) return val as string[];
  return [...DEFAULT_ACCT_NAMES];
}

export async function setAccountNames(sub: string, names: string[], env: Env): Promise<void> {
  const clean = DEFAULT_ACCT_NAMES.map((d, i) =>
    typeof names[i] === 'string' && names[i].trim() ? names[i].trim().slice(0, 12) : d
  );
  await env.POKEMON_KV.put(ACCT_NAMES_PREFIX + sub, JSON.stringify(clean));
}

// ── 盒子 ── key: box_{sub}_{acct}_{cp}
function boxKey(sub: string, acct: number, cp: string): string {
  return `${BOX_PREFIX}${sub}_${acct}_${cp}`;
}

/** 讀取所有帳號 × 指定 CP 的盒子 */
export async function getAllBoxes(
  sub: string, cps: string[], env: Env
): Promise<Record<number, Record<string, CpBox>>> {
  const tasks: Array<Promise<{ a: number; cp: string; data: CpBox }>> = [];
  for (let a = 0; a < 4; a++) {
    for (const cp of cps) {
      tasks.push((async () => {
        const val = await env.POKEMON_KV.get(boxKey(sub, a, cp), "json");
        return { a, cp, data: (val as CpBox) || { box: [], favs: [] } };
      })());
    }
  }
  const settled = await Promise.all(tasks);
  const result: Record<number, Record<string, CpBox>> = {};
  for (let a = 0; a < 4; a++) result[a] = {};
  settled.forEach(({ a, cp, data }) => { result[a][cp] = data; });
  return result;
}

/** 儲存某帳號的多個 CP 盒子 */
export async function saveBoxes(
  sub: string, acct: number, allData: Record<string, CpBox>, env: Env
): Promise<void> {
  await Promise.all(
    Object.entries(allData).map(([cp, data]) =>
      env.POKEMON_KV.put(boxKey(sub, acct, cp), JSON.stringify({
        box: Array.isArray(data?.box) ? data.box : [],
        favs: Array.isArray(data?.favs) ? data.favs : []
      }))
    )
  );
}

// ── 垃圾清單 ── key: trash_{sub}
export async function getTrashList(sub: string, env: Env): Promise<string[]> {
  const val = await env.POKEMON_KV.get(TRASH_PREFIX + sub, "json");
  return Array.isArray(val) ? val as string[] : [];
}

export async function addToTrash(sub: string, names: string[], env: Env): Promise<string[]> {
  const list = await getTrashList(sub, env);
  names.forEach(n => { if (n && !list.includes(n)) list.push(n); });
  await env.POKEMON_KV.put(TRASH_PREFIX + sub, JSON.stringify(list));
  return list;
}

export async function removeFromTrash(sub: string, names: string[], env: Env): Promise<string[]> {
  const list = await getTrashList(sub, env);
  const filtered = list.filter(n => !names.includes(n));
  await env.POKEMON_KV.put(TRASH_PREFIX + sub, JSON.stringify(filtered));
  return filtered;
}
