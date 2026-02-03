// =========================================================
//  搜尋功能處理 (Search Handlers)
// =========================================================

import type {
  Env,
  PokemonData,
  MovesMap,
  EventInfo,
  SearchResult,
  EvolutionChainItem,
  LeagueResult,
  LeaguePokemonResult
} from '../types';
import { leagues, typeChart, QUERY_CLEANER_REGEX, NAME_CLEANER_REGEX } from '../constants';
import {
  fetchWithCache,
  getDataUrl,
  getJsonData,
  getLeagueRanking
} from '../utils/cache';
import {
  sendMessage,
  editMessage
} from '../utils/telegram';
import { getTrashList } from '../utils/kv';
import {
  getPokemonRating,
  getTranslatedName,
  getTodayDateString
} from '../utils/helpers';

/**
 * 格式化招式名稱
 */
function formatMove(
  moveId: string | undefined,
  movesData: MovesMap,
  eliteList: string[],
  speciesId: string
): { name: string; isElite: boolean } {
  if (!moveId) return { name: "", isElite: false };

  let name = movesData[moveId] || moveId;
  let isElite = eliteList.includes(moveId) ||
    (speciesId === "florges" && moveId === "CHILLING_WATER");

  if (isElite) {
    name += "*";
  }

  return { name, isElite };
}

/**
 * 處理寶可夢搜尋指令 (Telegram)
 */
export async function handlePokemonSearch(
  chatId: number,
  userId: number,
  query: string,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  const cleanQuery = query.replace(QUERY_CLEANER_REGEX, "");
  const finalQuery = cleanQuery.length > 0 ? cleanQuery : query;

  // 發送載入訊息
  const loadingMsg = await sendMessage(
    chatId,
    `🔍 查詢 "<b>${finalQuery}</b>" (含招式)...`,
    { parse_mode: "HTML" },
    env
  );
  const loadingMsgId = loadingMsg.result?.message_id || null;

  try {
    // 並行取得資料
    const [resTrans, resMoves, resEvents] = await Promise.all([
      fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx),
      fetchWithCache(getDataUrl("data/move.json"), env, ctx),
      fetchWithCache(getDataUrl("data/events.json"), env, ctx)
    ]);

    const data = await resTrans.json() as PokemonData[];
    const movesData = resMoves.ok ? await resMoves.json() as MovesMap : {};
    const eventsData = resEvents.ok ? await resEvents.json() as EventInfo[] : [];

    // 搜尋匹配
    const isChi = /[\u4e00-\u9fa5]/.test(finalQuery);
    const lower = finalQuery.toLowerCase();
    const initialMatches = data.filter(p =>
      isChi
        ? p.speciesName.includes(finalQuery)
        : p.speciesId.toLowerCase().includes(lower)
    );

    if (!initialMatches.length) {
      await sendMessage(chatId, "找不到寶可夢", null, env);
      return;
    }

    // 查找進化家族
    const familyIds = new Set<string>();
    initialMatches.forEach(p => {
      if (p.family?.id) familyIds.add(p.family.id);
    });
    const finalMatches = data.filter(p =>
      (p.family && familyIds.has(p.family.id)) || initialMatches.includes(p)
    );

    const pokemonMap = new Map(finalMatches.map(p => [p.speciesId.toLowerCase(), p]));
    const ids = new Set(finalMatches.map(p => p.speciesId.toLowerCase()));

    // 取得所有聯盟排名
    const rankResults = await Promise.all(
      leagues.map(l => fetchWithCache(getDataUrl(l.path), env, ctx).then(r => r.ok ? r.json() : null))
    );

    let msg = `🏆 <b>"${finalQuery}" 家族相關排名</b>\n`;
    const resultsByLeague: Record<string, string[]> = {};
    let hasEliteRequirement = false;

    // 處理排名結果
    rankResults.forEach((list, i) => {
      if (!list || !Array.isArray(list)) return;

      list.forEach((p: any, rankIndex: number) => {
        if (!ids.has(p.speciesId.toLowerCase())) return;

        const rank = p.rank || p.tier || rankIndex + 1;
        const rating = getPokemonRating(rank);

        if (rating === "垃圾") return;
        if (typeof rank === "number" && rank > 100) return;

        const rankDisplay = `#${rank}`;
        const pDetail = pokemonMap.get(p.speciesId.toLowerCase());
        const rawName = pDetail ? pDetail.speciesName : p.speciesName;
        const name = getTranslatedName(p.speciesId, rawName);
        const eliteList = pDetail?.eliteMoves || [];

        // 處理招式
        let fastMoveId = p.moveFast;
        let chargedMoveIds = p.moveCharged;

        if (!fastMoveId && p.moveset && Array.isArray(p.moveset) && p.moveset.length > 0) {
          fastMoveId = p.moveset[0];
          chargedMoveIds = p.moveset.slice(1);
        }

        let moveStr = "";
        if (fastMoveId) {
          const fast = formatMove(fastMoveId, movesData, eliteList, p.speciesId.toLowerCase());
          const chargedArray = Array.isArray(chargedMoveIds) ? chargedMoveIds : [chargedMoveIds];
          const chargedMoves = chargedArray
            .filter((m: string) => m)
            .map((m: string) => {
              const result = formatMove(m, movesData, eliteList, p.speciesId.toLowerCase());
              if (result.isElite) hasEliteRequirement = true;
              return result.name;
            });

          if (fast.isElite) hasEliteRequirement = true;
          const charged = chargedMoves.join(", ");
          moveStr = charged ? `\n└ ${fast.name} / ${charged}` : `\n└ ${fast.name}`;
        }

        const line = `${rankDisplay} <code>${name}</code> ${p.score ? `(${p.score.toFixed(2)})` : ""} - ${rating}${moveStr}`;
        const leagueName = leagues[i].name;

        if (!resultsByLeague[leagueName]) resultsByLeague[leagueName] = [];
        resultsByLeague[leagueName].push(line);
      });
    });

    // 組合結果訊息
    let hasContent = false;
    for (const [league, lines] of Object.entries(resultsByLeague)) {
      if (lines.length > 0) {
        msg += `\n<b>${league}:</b>\n${lines.join("\n")}\n`;
        hasContent = true;
      }
    }

    // 結論與活動判斷
    if (hasContent) {
      const keepCategories = new Set<number>();
      Object.keys(resultsByLeague).forEach(leagueName => {
        if (leagueName.includes("500") && !leagueName.includes("1500") && !leagueName.includes("2500")) {
          keepCategories.add(500);
        } else if (leagueName.includes("1500")) {
          keepCategories.add(1500);
        } else if (leagueName.includes("2500")) {
          keepCategories.add(2500);
        } else if (leagueName.includes("10000") || leagueName.includes("無上限") || leagueName.includes("最佳")) {
          keepCategories.add(10000);
        }
      });

      if (keepCategories.size > 0) {
        const sortedCats = Array.from(keepCategories).sort((a, b) => a - b);
        msg += `\n📌 <b>結論：建議保留 ${sortedCats.join(" / ")}</b>`;
      }

      if (hasEliteRequirement) {
        msg += `\n⚠️ <b>注意：部分推薦招式 (*) 需使用厲害招式學習器。</b>`;
      }

      // 活動檢查
      const today = getTodayDateString();
      const upcoming = eventsData.filter(e => {
        const isMatch = initialMatches.some(p => {
          if (!e.pokemonId || !Array.isArray(e.pokemonId)) return false;
          return e.pokemonId.includes(p.speciesId.toLowerCase());
        });
        if (!isMatch) return false;

        if (!e.date) return true;
        const parts = e.date.split(/[~～]/);
        const endDate = (parts.length > 1 ? parts[1] : parts[0]).trim();
        return endDate >= today;
      });

      if (upcoming.length > 0) {
        upcoming.forEach(e => {
          msg += `\n🎉 <b>即將到來：<a href="${e.link}">${e.eventName}</a> (${e.date})</b>`;

          if (e.eventName.includes("社群日") && hasEliteRequirement) {
            msg += `\n💡 建議保留體質好的，等待社群再進化學習特殊招式！`;
          } else {
            msg += `\n📢 相關寶可夢活動即將到來！`;
          }
        });
      }
    }

    if (!hasContent) {
      const representative = initialMatches[0] || finalMatches[0];
      const cleanName = representative
        ? representative.speciesName.replace(NAME_CLEANER_REGEX, "").trim()
        : finalQuery;
      msg = `與 <b>"${finalQuery}"</b> 相關的寶可夢在所有聯盟中評價皆為垃圾。\n\n建議輸入 <code>/trash ${cleanName}</code> 加入清單。`;
    }

    // 檢查垃圾清單
    let options: any = { parse_mode: "HTML" };
    const trashList = await getTrashList(userId, env);
    const foundInTrash = finalMatches.find(p => trashList.includes(p.speciesName));

    if (foundInTrash) {
      msg += `\n\n⚠️ <b>注意：${foundInTrash.speciesName} 目前在您的垃圾清單中</b>`;
      options.inline_keyboard = [[
        { text: `♻️ 將 "${foundInTrash.speciesName}" 移出垃圾清單`, callback_data: `untrash_btn_${foundInTrash.speciesName}` }
      ]];
    }

    // 編輯或發送訊息
    if (loadingMsgId) {
      await editMessage(chatId, loadingMsgId, msg, options, env);
    } else {
      await sendMessage(chatId, msg, options, env);
    }

  } catch (e) {
    const errorMsg = `⚠️ 發生錯誤: ${(e as Error).message}`;
    if (loadingMsgId) {
      await editMessage(chatId, loadingMsgId, errorMsg, null, env);
    } else {
      await sendMessage(chatId, errorMsg, null, env);
    }
  }
}

/**
 * 取得寶可夢資料 (API 用)
 */
export async function getPokemonDataOnly(
  query: string,
  env: Env,
  ctx: ExecutionContext
): Promise<SearchResult> {
  // 字串處理
  let cleanQuery = query.trim();
  const CLEAN_CHARS = [" ", ".", "。", "!", "?", "！", "？", "(", ")", "（", "）", "shadow", "暗影"];
  CLEAN_CHARS.forEach(char => {
    cleanQuery = cleanQuery.split(char).join("");
  });
  const finalQuery = cleanQuery.length > 0 ? cleanQuery : query;

  // 取得基礎資料
  const [data, movesData, eventsData] = await Promise.all([
    getJsonData<PokemonData[]>('trans', "data/chinese_translation.json", env, ctx),
    getJsonData<MovesMap>('moves', "data/move.json", env, ctx),
    getJsonData<EventInfo[]>('events', "data/events.json", env, ctx)
  ]);

  // 搜尋匹配
  const isChi = /[\u4e00-\u9fa5]/.test(finalQuery);
  const lower = finalQuery.toLowerCase();
  const target = data.find(p =>
    isChi
      ? p.speciesName.includes(finalQuery)
      : p.speciesId.toLowerCase().includes(lower)
  );

  if (!target) {
    return {
      evolutionChain: [],
      results: [],
      events: [],
      allLeagues: leagues.map(l => ({ id: l.command, name: l.name })),
      hasEliteWarning: false,
      typeChart
    };
  }

  // 進化鏈處理
  const familyMembers = target.family?.id
    ? data.filter(p => p.family && p.family.id === target.family!.id)
    : [target];

  const evolutionChain: EvolutionChainItem[] = familyMembers
    .filter(m => !m.speciesId.toLowerCase().includes("_shadow") && !m.speciesName.includes("暗影"))
    .map(m => ({
      name: getTranslatedName(m.speciesId, m.speciesName),
      id: m.speciesId,
      types: m.types || []
    }));

  const ids = new Set(familyMembers.map(p => p.speciesId.toLowerCase()));
  const pokemonMap = new Map(familyMembers.map(p => [p.speciesId.toLowerCase(), p]));

  // 取得所有聯盟排名
  const rankResults = await Promise.all(
    leagues.map(l => getLeagueRanking(l, env, ctx))
  );

  const finalResults: LeagueResult[] = [];
  let hasElite = false;

  // 遍歷排名
  rankResults.forEach((list, i) => {
    if (!list || list.length === 0) return;

    const leaguePokemons: LeaguePokemonResult[] = [];

    for (const p of list) {
      const sid = p.speciesId.toLowerCase();
      if (!ids.has(sid)) continue;

      const rank = p.rank || p.tier || 0;
      if (typeof rank === "number" && rank > 300) continue;

      const rating = getPokemonRating(rank);
      if (rating === "垃圾") continue;

      const pDetail = pokemonMap.get(sid);
      const eliteList = pDetail?.eliteMoves || [];

      let movesStr = "";
      let fastMoveId = p.moveFast;
      let chargedMoveIds = p.moveCharged;

      if (!fastMoveId && p.moveset) {
        fastMoveId = p.moveset[0];
        chargedMoveIds = p.moveset.slice(1);
      }

      if (fastMoveId) {
        const fast = formatMove(fastMoveId, movesData, eliteList, sid);
        const cMoves = Array.isArray(chargedMoveIds) ? chargedMoveIds : [chargedMoveIds];
        const charged = cMoves
          .filter((m): m is string => !!m)
          .map(m => {
            const result = formatMove(m, movesData, eliteList, sid);
            if (result.isElite) hasElite = true;
            return result.name;
          })
          .join(", ");

        if (fast.isElite) hasElite = true;
        movesStr = `${fast.name} / ${charged}`;
      }

      leaguePokemons.push({
        rank,
        name: getTranslatedName(p.speciesId, pDetail?.speciesName || p.speciesName),
        types: pDetail?.types || [],
        score: p.score ? p.score.toFixed(1) : "N/A",
        rating,
        moves: movesStr
      });
    }

    if (leaguePokemons.length > 0) {
      finalResults.push({
        leagueId: leagues[i].command,
        leagueName: leagues[i].name,
        pokemons: leaguePokemons
      });
    }
  });

  // 活動過濾
  const today = getTodayDateString();
  const upcomingEvents = eventsData.filter(e => {
    const isMatch = familyMembers.some(p =>
      e.pokemonId && e.pokemonId.includes(p.speciesId.toLowerCase())
    );
    const endDate = e.date ? (e.date.split(/[~～]/).pop() || "").trim() : null;
    return isMatch && (!endDate || endDate >= today);
  }).map(e => ({
    eventName: e.eventName,
    date: e.date,
    link: e.link
  }));

  return {
    evolutionChain,
    results: finalResults,
    events: upcomingEvents,
    allLeagues: leagues.map(l => ({ id: l.command, name: l.name })),
    hasEliteWarning: hasElite,
    typeChart
  };
}
