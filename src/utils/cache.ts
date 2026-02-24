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

// 🔥 新增：大禮包全域快取
let GLOBAL_BUNDLE_CACHE: Record<string, RankingPokemon[]> | null = null;

/**
 * 取得 GitHub Raw 資料 URL
 */
export function getDataUrl(filename: string): string {
  // 使用時間戳作為版本號，確保每次抓取都是最新的
  const v = Math.floor(Date.now() / 3600000); // 每小時更新一次快取標籤
  return `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH_NAME}/${filename}?v=${v}`;
}

/**
 * 帶快取的 Fetch 請求
 */
export async function fetchWithCache(
  url: string,
  _env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(url, { method: "GET" });

  // 1. 先嘗試從 Cloudflare 快取讀取
  const cachedRes = await cache.match(cacheKey);
  if (cachedRes) return cachedRes;

  // 2. 使用 Promise.race 確保 fetch + body 全程都有 timeout (8s)
  let bodyText: string | null = null;

  const controller = new AbortController();
  const timeoutPromise = new Promise<null>(resolve => {
    setTimeout(() => { controller.abort(); resolve(null); }, 8000);
  });
  const fetchPromise = (async (): Promise<string | null> => {
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) return null;
      return await response.text();
    } catch {
      return null;
    }
  })();
  bodyText = await Promise.race([fetchPromise, timeoutPromise]);

  // 3. 全部嘗試失敗，回傳空陣列
  if (!bodyText) {
    console.error(`Failed to fetch ${url} after retries.`);
    return new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (bodyText.trim().length === 0) {
    return new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 4. 設定快取 Header 並存入快取
  const headers = new Headers();
  headers.set("Cache-Control", `public, max-age=${CACHE_TTL}`);
  headers.set("Content-Type", "application/json");

  const responseToCache = new Response(bodyText, { status: 200, headers });

  if (ctx?.waitUntil) {
    ctx.waitUntil(cache.put(cacheKey, responseToCache.clone()));
  } else {
    cache.put(cacheKey, responseToCache.clone()).catch(console.error);
  }

  return new Response(bodyText, { status: 200, headers });
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
  if (key === 'trans' && GLOBAL_TRANS_CACHE) return GLOBAL_TRANS_CACHE as T;
  if (key === 'moves' && GLOBAL_MOVES_CACHE) return GLOBAL_MOVES_CACHE as T;
  if (key === 'events' && GLOBAL_EVENTS_CACHE) return GLOBAL_EVENTS_CACHE as T;

  const res = await fetchWithCache(getDataUrl(filename), env, ctx);
  let data: T;
  try {
    data = await res.json();
  } catch {
    console.error(`JSON Parse Error: ${filename}`);
    return [] as T;
  }

  if (key === 'trans' && Array.isArray(data) && (data as unknown[]).length > 0)
    GLOBAL_TRANS_CACHE = data as PokemonData[];
  if (key === 'moves' && data && typeof data === 'object' && Object.keys(data as object).length > 0)
    GLOBAL_MOVES_CACHE = data as MovesMap;
  if (key === 'events' && Array.isArray(data) && (data as unknown[]).length > 0)
    GLOBAL_EVENTS_CACHE = data as EventInfo[];

  return data;
}

/**
 * 🔥 新增：取得大禮包排名資料 (解決 50 subrequests 限制)
 */
export async function getAllRankingsBundle(
  env: Env,
  ctx: ExecutionContext
): Promise<Record<string, RankingPokemon[]>> {
  // A. 優先檢查記憶體快取
  if (GLOBAL_BUNDLE_CACHE) return GLOBAL_BUNDLE_CACHE;

  try {
    // B. 下載大禮包
    const res = await fetchWithCache(getDataUrl("data/all_rankings_bundle.json"), env, ctx);
    if (!res.ok) return {};

    const data = await res.json() as Record<string, RankingPokemon[]>;

    // C. 存入記憶體快取
    if (data && typeof data === 'object') {
      GLOBAL_BUNDLE_CACHE = data;
    }
    return GLOBAL_BUNDLE_CACHE || {};
  } catch (e) {
    console.error("讀取大禮包失敗:", e);
    return {};
  }
}

/**
 * 取得單一聯盟排名資料 (若大禮包失敗的保底方案)
 */
export async function getLeagueRanking(
  league: League,
  env: Env,
  ctx: ExecutionContext
): Promise<RankingPokemon[]> {
  if (GLOBAL_RANKINGS_CACHE.has(league.command)) {
    return GLOBAL_RANKINGS_CACHE.get(league.command)!;
  }

  try {
    const res = await fetchWithCache(getDataUrl(league.path), env, ctx);
    if (!res.ok) return [];
    const data = await res.json() as RankingPokemon[];

    if (data && Array.isArray(data) && data.length > 0) {
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
  GLOBAL_BUNDLE_CACHE = null; // 同步清理大禮包快取
}
