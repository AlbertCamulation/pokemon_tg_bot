// =========================================================
//  聯盟排名 / Meta 分析 — 回傳結構化 JSON
// =========================================================

import type {
  Env, PokemonData, RankingPokemon, RankingEntry, MetaAnalysis, TeamMember
} from '../types';
import { leagues } from '../constants';
import { fetchWithCache, getDataUrl, getAllRankingsBundle } from '../utils/cache';
import {
  getPokemonRating, getFullName, toCopyName, getDefenseProfile, getWeaknesses
} from '../utils/helpers';

/**
 * 取得單一聯盟排行榜
 */
export async function getLeagueRankingData(
  command: string,
  limit: number,
  env: Env,
  ctx: ExecutionContext
): Promise<{ leagueName: string; entries: RankingEntry[]; copyString: string } | null> {
  const leagueInfo = leagues.find(l => l.command === command);
  if (!leagueInfo) return null;

  const [bundledData, transRes] = await Promise.all([
    getAllRankingsBundle(env, ctx),
    fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx)
  ]);

  const rankings = (bundledData[leagueInfo.path] || []) as RankingPokemon[];
  if (!rankings.length) return { leagueName: leagueInfo.name, entries: [], copyString: "" };

  const trans = await transRes.json() as PokemonData[];
  const nameMap = new Map(trans.map(p => [p.speciesId.toLowerCase(), p.speciesName]));
  const typeMap = new Map(trans.map(p => [p.speciesId.toLowerCase(), p.types]));

  const entries: RankingEntry[] = [];
  const copySet = new Set<string>();

  rankings.slice(0, limit).forEach((p, i) => {
    const rank = (typeof p.rank === "number" ? p.rank : 0) || i + 1;
    const rating = getPokemonRating(rank);
    if (rating === "垃圾") return;

    const name = getFullName(p.speciesId, nameMap);
    const copyName = toCopyName(name);
    if (copyName) copySet.add(copyName);

    entries.push({
      rank,
      name,
      copyName,
      types: typeMap.get(p.speciesId.toLowerCase()) || [],
      score: p.score ? p.score.toFixed(1) : "N/A",
      rating,
      cp: p.cp,
      moves: ""
    });
  });

  return { leagueName: leagueInfo.name, entries, copyString: [...copySet].join(",") };
}

// ── Meta 分析 ──

function findBestPartner(
  rankings: RankingPokemon[],
  currentTeam: RankingPokemon[],
  detailMap: Map<string, PokemonData>
): RankingPokemon | undefined {
  const teamWeaknessCounts: Record<string, number> = {};
  currentTeam.forEach(p => {
    const info = detailMap.get(p.speciesId.toLowerCase());
    if (info?.types) getWeaknesses(info.types).forEach(w => {
      teamWeaknessCounts[w] = (teamWeaknessCounts[w] || 0) + 1;
    });
  });

  const urgent = Object.keys(teamWeaknessCounts);
  const searchPool = rankings.slice(0, 40);
  const teamIds = new Set(currentTeam.map(m => m.speciesId));

  // 預先計算隊友防禦面，避免內層重複運算
  const teamProfiles = currentTeam
    .map(m => detailMap.get(m.speciesId.toLowerCase()))
    .filter((i): i is PokemonData => !!i?.types)
    .map(i => getDefenseProfile(i.types));

  let best: RankingPokemon | undefined;
  let bestScore = -9999;

  searchPool.forEach((candidate, idx) => {
    if (teamIds.has(candidate.speciesId)) return;
    const info = detailMap.get(candidate.speciesId.toLowerCase());
    if (!info?.types) return;

    let score = 0;
    const profile = getDefenseProfile(info.types);

    urgent.forEach(w => {
      if (profile[w] < 1.0) score += 20 * (teamWeaknessCounts[w] || 1);
      else if (profile[w] > 1.0) score -= 30 * (teamWeaknessCounts[w] || 1);
    });

    getWeaknesses(info.types).forEach(w => {
      const covered = teamProfiles.some(tp => tp[w] < 1.0);
      score += covered ? 5 : -5;
    });

    score -= idx * 0.5;

    if (score > bestScore) { bestScore = score; best = candidate; }
  });

  if (!best || bestScore < -50) best = searchPool.find(p => !teamIds.has(p.speciesId));
  return best;
}

function buildBalancedTeam(
  leader: RankingPokemon,
  rankings: RankingPokemon[],
  detailMap: Map<string, PokemonData>
): RankingPokemon[] {
  const team = [leader];
  const p1 = findBestPartner(rankings, team, detailMap);
  if (p1) team.push(p1);
  const p2 = findBestPartner(rankings, team, detailMap);
  if (p2) team.push(p2);
  return team;
}

/**
 * 取得三大聯盟 Meta 分析
 */
export async function getMetaAnalysisData(
  env: Env,
  ctx: ExecutionContext
): Promise<MetaAnalysis[]> {
  const targetCommands = ["great_league_top", "ultra_league_top", "master_league_top"];

  const [bundledData, transRes] = await Promise.all([
    getAllRankingsBundle(env, ctx),
    fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx)
  ]);
  const allData = await transRes.json() as PokemonData[];
  const detailMap = new Map(allData.map(p => [p.speciesId.toLowerCase(), p]));
  const nameMap = new Map(allData.map(p => [p.speciesId.toLowerCase(), p.speciesName]));

  const toMember = (p: RankingPokemon): TeamMember => {
    const name = getFullName(p.speciesId, nameMap);
    const detail = detailMap.get(p.speciesId.toLowerCase());
    return {
      rank: typeof p.rank === "number" ? p.rank : 0,
      name,
      copyName: toCopyName(name),
      types: (detail?.types || []).filter(t => t.toLowerCase() !== "none"),
      score: p.score ? p.score.toFixed(1) : "N/A"
    };
  };

  const out: MetaAnalysis[] = [];
  for (const command of targetCommands) {
    const league = leagues.find(l => l.command === command);
    if (!league) continue;
    const rankings = (bundledData[league.path] || []) as RankingPokemon[];
    if (!rankings.length) continue;

    const topOne = rankings[0];
    const teamViolence = rankings.slice(0, 3);
    const teamBalanced = buildBalancedTeam(topOne, rankings, detailMap);

    let altLeader = rankings[1] || rankings[0];
    if (teamBalanced.some(p => p.speciesId === altLeader.speciesId)) altLeader = rankings[2] || altLeader;
    const teamAlternative = buildBalancedTeam(altLeader, rankings, detailMap);

    const copySet = new Set<string>();
    [...teamViolence, ...teamBalanced, ...teamAlternative].forEach(p => {
      const c = toCopyName(getFullName(p.speciesId, nameMap));
      if (c) copySet.add(c);
    });

    out.push({
      leagueId: league.command,
      leagueName: league.name,
      core: toMember(topOne),
      teamViolence: teamViolence.map(toMember),
      teamBalanced: teamBalanced.map(toMember),
      teamAlternative: teamAlternative.map(toMember),
      copyString: [...copySet].join(",")
    });
  }

  return out;
}
