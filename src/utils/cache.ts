// =========================================================
//  快取管理 (Cache Management)
// =========================================================

import type { Env, PokemonData, MovesMap, EventInfo, RankingPokemon, League } from '../types';
import { CACHE_TTL, GITHUB_USERNAME, REPO_NAME, BRANCH_NAME } from '../constants';

// --- 全域記憶體快取 ---
let GLOBAL_TRANS_CACHE: PokemonData[] | null = null;
let GLOBAL_MOVES_CACHE: MovesMap | null = null;
let GLOBAL_EVENTS_CACHE: EventInfo[] | null = null;
const GLOBAL_RANKINGS_CACHE = new Map<string, RankingPokemon[]>();

/**
 * 取得 GitHub Raw 資料 URL
 */
export function getDataUrl(filename: string): string {
  return `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${filename}?ver=1007`;
}

/**
 * 帶快取的 Fetch 請求
 */
export async function fetchWithCache(
  url: string,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(url, { method: "GET" });

  // 1. 先嘗試從 Cloudflare 快取讀取
  const cachedRes = await cache.match(cacheKey);
  if (cachedRes) return cachedRes;

  // 2. 定義重試邏輯 (最多重試 2 次，共 3 次機會)
  const maxRetries = 2;
  let response: Response | null = null;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      response = await fetch(url);
      if (response.ok) break;
    } catch (e) {
      console.error(`Fetch attempt ${i + 1} failed: ${(e as Error).message}`);
    }
    if (i < maxRetries) await new Promise(r => setTimeout(r, 50));
  }

  // 3. 如果重試後還是失敗，回傳空陣列
  if (!response || !response.ok) {
    console.error(`Failed to fetch ${url} after retries.`);
    return new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 4. 讀取並複製資料
  let bodyText: string;
  try {
    bodyText = await response.text();
  } catch {
    return new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (!bodyText || bodyText.trim().length === 0) {
    return new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 5. 設定快取 Header 並存入快取
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", `public, max-age=${CACHE_TTL}`);
  headers.set("Content-Type", "application/json");

  const responseToCache = new Response(bodyText, {
    status: response.status,
    headers
  });

  if (ctx?.waitUntil) {
    ctx.waitUntil(cache.put(cacheKey, responseToCache.clone()));
  } else {
    cache.put(cacheKey, responseToCache.clone()).catch(console.error);
  }

  return new Response(bodyText, { status: response.status, headers });
}

/**
 * 取得通用 JSON 資料 (翻譯、招式、活動)
 */
export async function getJsonData<T>(
  key: 'trans' | 'moves' | 'events',
  filename: string,
  env: Env,
  ctx: ExecutionContext
): Promise<T> {
  // A. 檢查全域變數快取
  if (key === 'trans' && GLOBAL_TRANS_CACHE) return GLOBAL_TRANS_CACHE as T;
  if (key === 'moves' && GLOBAL_MOVES_CACHE) return GLOBAL_MOVES_CACHE as T;
  if (key === 'events' && GLOBAL_EVENTS_CACHE) return GLOBAL_EVENTS_CACHE as T;

  // B. 沒有快取，才去 Fetch
  const res = await fetchWithCache(getDataUrl(filename), env, ctx);
  let data: T;
  try {
    data = await res.json();
  } catch {
    console.error(`JSON Parse Error: ${filename}`);
    return [] as T;
  }

  // C. 寫入全域變數
  if (data) {
    if (key === 'trans') GLOBAL_TRANS_CACHE = data as PokemonData[];
    if (key === 'moves') GLOBAL_MOVES_CACHE = data as MovesMap;
    if (key === 'events') GLOBAL_EVENTS_CACHE = data as EventInfo[];
  }

  return data;
}

/**
 * 取得聯盟排名資料 (帶快取)
 */
export async function getLeagueRanking(
  league: League,
  env: Env,
  ctx: ExecutionContext
): Promise<RankingPokemon[]> {
  // A. 檢查 Map 快取
  if (GLOBAL_RANKINGS_CACHE.has(league.command)) {
    return GLOBAL_RANKINGS_CACHE.get(league.command)!;
  }

  // B. Fetch 下載
  try {
    const res = await fetchWithCache(getDataUrl(league.path), env, ctx);
    if (!res.ok) return [];
    const data = await res.json() as RankingPokemon[];

    // C. 存入 Map
    if (data && Array.isArray(data)) {
      GLOBAL_RANKINGS_CACHE.set(league.command, data);
    }
    return data;
  } catch {
    return [];
  }
}

/**
 * 清除所有快取 (測試用)
 */
export function clearAllCaches(): void {
  GLOBAL_TRANS_CACHE = null;
  GLOBAL_MOVES_CACHE = null;
  GLOBAL_EVENTS_CACHE = null;
  GLOBAL_RANKINGS_CACHE.clear();
}
