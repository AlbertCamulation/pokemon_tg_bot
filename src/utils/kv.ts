// =========================================================
//  KV 存儲工具函數 (KV Storage Utilities)
// =========================================================

import type { Env, BannedUsersMap } from '../types';
import { TRASH_LIST_PREFIX, ALLOWED_UID_KEY, BANNED_UID_KEY } from '../constants';

// --- 垃圾清單操作 ---

/**
 * 取得使用者的垃圾清單
 */
export async function getTrashList(
  userId: number,
  env: Env
): Promise<string[]> {
  if (!env.POKEMON_KV) return [];
  return await env.POKEMON_KV.get(TRASH_LIST_PREFIX + userId, "json") || [];
}

/**
 * 加入寶可夢到垃圾清單
 */
export async function addToTrashList(
  userId: number,
  pokemonNames: string[],
  env: Env
): Promise<void> {
  if (!env.POKEMON_KV) return;

  const list = await getTrashList(userId, env);
  pokemonNames.forEach((name) => {
    if (name && !list.includes(name)) list.push(name);
  });

  await env.POKEMON_KV.put(TRASH_LIST_PREFIX + userId, JSON.stringify(list));
}

/**
 * 從垃圾清單移除寶可夢
 */
export async function removeFromTrashList(
  userId: number,
  pokemonNames: string[],
  env: Env
): Promise<string[]> {
  if (!env.POKEMON_KV) return [];

  const currentList = await getTrashList(userId, env);
  const removed: string[] = [];

  pokemonNames.forEach((name) => {
    const idx = currentList.indexOf(name);
    if (idx > -1) {
      currentList.splice(idx, 1);
      removed.push(name);
    }
  });

  if (removed.length > 0) {
    await env.POKEMON_KV.put(TRASH_LIST_PREFIX + userId, JSON.stringify(currentList));
  }

  return removed;
}

// --- 白名單操作 ---

/**
 * 取得允許的使用者 ID 列表
 */
export async function getAllowedUserIds(env: Env): Promise<number[]> {
  if (!env.POKEMON_KV) return [];
  return await env.POKEMON_KV.get(ALLOWED_UID_KEY, "json") || [];
}

/**
 * 設定允許的使用者 ID 列表
 */
export async function setAllowedUserIds(
  ids: number[],
  env: Env
): Promise<void> {
  if (!env.POKEMON_KV) return;
  await env.POKEMON_KV.put(ALLOWED_UID_KEY, JSON.stringify(ids));
}

/**
 * 加入使用者到白名單
 */
export async function addToAllowedList(
  userId: number,
  env: Env
): Promise<void> {
  const ids = await getAllowedUserIds(env);
  if (!ids.includes(userId)) {
    ids.push(userId);
    await setAllowedUserIds(ids, env);
  }
}

/**
 * 從白名單移除使用者
 */
export async function removeFromAllowedList(
  userId: number,
  env: Env
): Promise<void> {
  const ids = await getAllowedUserIds(env);
  const filtered = ids.filter(id => id !== userId);
  await setAllowedUserIds(filtered, env);
}

// --- 黑名單操作 ---

/**
 * 取得黑名單 (物件格式: { [uid]: userName })
 */
export async function getBannedUsers(env: Env): Promise<BannedUsersMap> {
  if (!env.POKEMON_KV) return {};

  const data = await env.POKEMON_KV.get(BANNED_UID_KEY, "json");

  // 相容性處理：如果是舊的陣列格式，轉成物件
  if (Array.isArray(data)) {
    const newMap: BannedUsersMap = {};
    data.forEach((id: number) => {
      newMap[id] = "Unknown";
    });
    return newMap;
  }

  return (data as BannedUsersMap) || {};
}

/**
 * 設定黑名單
 */
export async function setBannedUsers(
  data: BannedUsersMap,
  env: Env
): Promise<void> {
  if (!env.POKEMON_KV) return;
  await env.POKEMON_KV.put(BANNED_UID_KEY, JSON.stringify(data));
}

/**
 * 取得黑名單 ID 列表 (相容舊代碼)
 */
export async function getBannedUserIds(env: Env): Promise<number[]> {
  const map = await getBannedUsers(env);
  return Object.keys(map).map(Number);
}

/**
 * 加入使用者到黑名單
 */
export async function addToBannedList(
  userId: number,
  userName: string,
  env: Env
): Promise<void> {
  const bannedMap = await getBannedUsers(env);
  bannedMap[userId] = userName;
  await setBannedUsers(bannedMap, env);
}

/**
 * 從黑名單移除使用者
 */
export async function removeFromBannedList(
  userId: number | string,
  env: Env
): Promise<boolean> {
  const bannedMap = await getBannedUsers(env);

  if (bannedMap[userId]) {
    delete bannedMap[userId];
    await setBannedUsers(bannedMap, env);
    return true;
  }

  return false;
}

/**
 * 檢查使用者是否在黑名單中
 */
export async function isUserBanned(
  userId: number,
  env: Env
): Promise<boolean> {
  const bannedMap = await getBannedUsers(env);
  return !!bannedMap[userId];
}

/**
 * 檢查使用者是否在白名單中
 */
export async function isUserAllowed(
  userId: number,
  env: Env
): Promise<boolean> {
  const allowedIds = await getAllowedUserIds(env);
  return allowedIds.includes(userId);
}
