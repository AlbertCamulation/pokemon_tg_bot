// =========================================================
//  搜尋功能 (Search) — 回傳結構化 JSON
// =========================================================

import type {
  Env, PokemonData, MovesMap, EventInfo, SearchResult,
  EvolutionChainItem, LeagueResult, LeaguePokemonResult, RankingPokemon
} from '../types';
import { getJsonData, getAllRankingsBundle } from '../utils/cache';
import { leagues, QUERY_CLEANER_REGEX } from '../constants';
import { getPokemonRating, getTranslatedName, getFullName, getTodayDateString, getEventEndDate } from '../utils/helpers';

/**
 * 取得所有寶可夢中文名稱 (自動完成用)
 */
export async function getAllPokemonNames(env: Env, ctx: ExecutionContext): Promise<string[]> {
  const [transData, bundledData] = await Promise.all([
    getJsonData<PokemonData[]>('trans', "data/chinese_translation.json", env, ctx),
    getAllRankingsBundle(env, ctx)
  ]);

  const nameMap = new Map(transData.map(p => [p.speciesId.toLowerCase(), p.speciesName]));

  // 來源優先用 1500 排名 (涵蓋特殊型態 ID)，再以翻譯檔墊底
  const rank1500 = (bundledData["data/rankings_1500.json"] || []) as RankingPokemon[];
  const sourceIds = rank1500.length
    ? rank1500.map(r => r.speciesId)
    : transData.map(p => p.speciesId);

  const names = new Set<string>();
  sourceIds.forEach(id => {
    const name = getFullName(id, nameMap);
    if (name && /[一-龥]/.test(name)) names.add(name);
  });
  // 確保翻譯檔內所有基礎名稱都有 (搜尋單一寶可夢用)
  transData.forEach(p => { if (/[一-龥]/.test(p.speciesName)) names.add(p.speciesName); });

  return Array.from(names).sort();
}

/** 格式化招式名稱，回傳是否為厲害招式 */
function formatMove(
  moveId: string | undefined,
  movesData: MovesMap,
  eliteList: string[],
  speciesId: string
): { name: string; isElite: boolean } {
  if (!moveId) return { name: "", isElite: false };
  const name = movesData[moveId] || moveId;
  const isElite = eliteList.includes(moveId) ||
    (speciesId === "florges" && moveId === "CHILLING_WATER");
  return { name: isElite ? name + "*" : name, isElite };
}

/**
 * 搜尋寶可夢 (家族 + 各聯盟排名 + 活動)
 */
export async function searchPokemon(
  query: string,
  env: Env,
  ctx: ExecutionContext
): Promise<SearchResult> {
  const cleaned = query.trim().replace(QUERY_CLEANER_REGEX, "");
  const finalQuery = cleaned.length > 0 ? cleaned : query.trim();

  const empty: SearchResult = {
    query: finalQuery, evolutionChain: [], results: [], events: [],
    conclusion: [], hasEliteWarning: false
  };
  if (!finalQuery) return empty;

  const [data, movesData, eventsData] = await Promise.all([
    getJsonData<PokemonData[]>('trans', "data/chinese_translation.json", env, ctx),
    getJsonData<MovesMap>('moves', "data/move.json", env, ctx),
    getJsonData<EventInfo[]>('events', "data/events.json", env, ctx)
  ]);

  // 匹配
  const isChi = /[一-龥]/.test(finalQuery);
  const lower = finalQuery.toLowerCase();
  const initialMatches = data.filter(p =>
    isChi ? p.speciesName.includes(finalQuery) : p.speciesId.toLowerCase().includes(lower)
  );
  if (!initialMatches.length) return empty;

  // 進化家族
  const familyIds = new Set<string>();
  initialMatches.forEach(p => { if (p.family?.id) familyIds.add(p.family.id); });
  const initialSet = new Set(initialMatches);
  const familyMembers = data.filter(p =>
    (p.family && familyIds.has(p.family.id)) || initialSet.has(p)
  );

  const evolutionChain: EvolutionChainItem[] = familyMembers
    .filter(m => !m.speciesId.toLowerCase().includes("_shadow") && !m.speciesName.includes("暗影"))
    .map(m => ({ name: getTranslatedName(m.speciesId, m.speciesName), id: m.speciesId, types: m.types || [] }));

  const ids = new Set(familyMembers.map(p => p.speciesId.toLowerCase()));
  const pokemonMap = new Map(familyMembers.map(p => [p.speciesId.toLowerCase(), p]));

  // 各聯盟排名
  const bundledData = await getAllRankingsBundle(env, ctx);
  const finalResults: LeagueResult[] = [];
  let hasElite = false;

  leagues.forEach((league) => {
    const list = (bundledData[league.path] || []) as RankingPokemon[];
    if (!list.length) return;

    const leaguePokemons: LeaguePokemonResult[] = [];
    list.forEach((p, idx) => {
      const sid = p.speciesId.toLowerCase();
      if (!ids.has(sid)) return;

      const rank = p.rank || p.tier || idx + 1;
      if (typeof rank === "number" && rank > 100) return;
      const rating = getPokemonRating(rank);
      if (rating === "垃圾") return;

      const pDetail = pokemonMap.get(sid);
      const eliteList = pDetail?.eliteMoves || [];

      let fastMoveId = p.moveFast;
      let chargedMoveIds = p.moveCharged;
      if (!fastMoveId && Array.isArray(p.moveset) && p.moveset.length) {
        fastMoveId = p.moveset[0];
        chargedMoveIds = p.moveset.slice(1);
      }

      let moves = "";
      let elite = false;
      if (fastMoveId) {
        const fast = formatMove(fastMoveId, movesData, eliteList, sid);
        const cArr = Array.isArray(chargedMoveIds) ? chargedMoveIds : [chargedMoveIds];
        const charged = cArr.filter((m): m is string => !!m).map(m => {
          const r = formatMove(m, movesData, eliteList, sid);
          if (r.isElite) { elite = true; hasElite = true; }
          return r.name;
        }).join(", ");
        if (fast.isElite) { elite = true; hasElite = true; }
        moves = charged ? `${fast.name} / ${charged}` : fast.name;
      }

      leaguePokemons.push({
        rank,
        name: getTranslatedName(p.speciesId, pDetail?.speciesName || p.speciesName),
        types: pDetail?.types || [],
        score: p.score ? p.score.toFixed(1) : "N/A",
        rating, moves, elite
      });
    });

    if (leaguePokemons.length) {
      finalResults.push({
        leagueId: league.command, leagueName: league.name, cp: String(league.cp),
        pokemons: leaguePokemons
      });
    }
  });

  // 結論 (建議保留哪些 CP)
  const conclusionSet = new Set<number>();
  finalResults.forEach(r => {
    const cp = parseInt(r.cp);
    if (!isNaN(cp)) conclusionSet.add(cp);
  });

  // 活動
  const today = getTodayDateString();
  const events = eventsData.filter(e => {
    const isMatch = initialMatches.some(p =>
      Array.isArray(e.pokemonId) && e.pokemonId.includes(p.speciesId.toLowerCase())
    );
    if (!isMatch) return false;
    const endDate = getEventEndDate(e.date);
    return !endDate || endDate >= today;
  }).map(e => ({ eventName: e.eventName, date: e.date, link: e.link }));

  return {
    query: finalQuery,
    evolutionChain,
    results: finalResults,
    events,
    conclusion: Array.from(conclusionSet).sort((a, b) => a - b),
    hasEliteWarning: hasElite
  };
}
