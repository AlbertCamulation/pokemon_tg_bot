// =========================================================
//  對戰盒子分析 (Box) — 回傳結構化 JSON
// =========================================================

import type {
  Env, PokemonData, RankingPokemon, BoxAnalysis, AnalyzedPokemon, TrioResult
} from '../types';
import { fetchWithCache, getDataUrl, getAllRankingsBundle } from '../utils/cache';
import { leagues, typeNames } from '../constants';
import { getScoreIcon, getFullName, getDefenseProfile } from '../utils/helpers';

const GARBAGE_RANK_THRESHOLD = 500;
const TRIO_POOL_CAP = 25; // 限制三人組搜尋池上限，避免 O(n³) 爆炸

interface Mon {
  speciesId: string;
  name: string;
  types: string[];
  moveTypes: string[];
  fastMove: string;
  chargedMoves: string[];
  rank: number;
  score: number;
  isFav: boolean;
}

function weakKeys(types: string[]): string[] {
  const p = getDefenseProfile(types);
  return Object.entries(p).filter(([, m]) => m > 1.0).map(([t]) => t);
}

function scoreTeam(trio: Mon[]): number {
  let score = 0;
  trio.forEach(p => { score += p.score; });
  trio.forEach(p => {
    if (p.rank <= 50) score += 30;
    else if (p.rank <= 100) score += 10;
    else score -= 20;
  });

  const weakSets = trio.map(p => new Set(weakKeys(p.types)));
  const profiles = trio.map(p => getDefenseProfile(p.types));

  for (let i = 0; i < trio.length; i++) {
    for (const w of weakSets[i]) {
      const covered = trio.some((_, j) => j !== i && profiles[j][w] < 1.0);
      if (covered) score += 8;
    }
  }

  const moveTypes = new Set<string>();
  trio.forEach(p => p.moveTypes.forEach(t => moveTypes.add(t)));
  score += moveTypes.size * 5;

  const typeCounts: Record<string, number> = {};
  trio.forEach(p => p.types.forEach(t => {
    if (t !== 'none') typeCounts[t] = (typeCounts[t] || 0) + 1;
  }));
  Object.values(typeCounts).forEach(c => {
    if (c >= 3) score -= 25; else if (c === 2) score -= 10;
  });

  const shared = [...weakSets[0]].filter(w => weakSets[1].has(w) && weakSets[2].has(w));
  score -= shared.length * 20;

  return score;
}

function findBestTrio(pool: Mon[]): Mon[] | null {
  if (pool.length < 3) return null;
  // 先依名次取前 N 隻，限制組合爆炸
  const capped = [...pool].sort((a, b) => a.rank - b.rank).slice(0, TRIO_POOL_CAP);
  let bestScore = -Infinity;
  let best = capped.slice(0, 3);
  for (let i = 0; i < capped.length; i++)
    for (let j = i + 1; j < capped.length; j++)
      for (let k = j + 1; k < capped.length; k++) {
        const trio = [capped[i], capped[j], capped[k]];
        const s = scoreTeam(trio);
        if (s > bestScore) { bestScore = s; best = trio; }
      }
  return best;
}

function sharedWeakNames(trio: Mon[]): string[] {
  const sets = trio.map(p => new Set(weakKeys(p.types)));
  return [...sets[0]].filter(w => sets[1].has(w) && sets[2].has(w))
    .map(w => typeNames[w] || w);
}

function buildTrioResult(trio: Mon[], translateMove: (m: string) => string): TrioResult {
  const members: AnalyzedPokemon[] = trio.map(p => {
    const fast = translateMove(p.fastMove);
    const charged = p.chargedMoves.map(translateMove).filter(Boolean).join(', ');
    return {
      speciesId: p.speciesId,
      name: p.name,
      types: p.types.filter(t => t.toLowerCase() !== 'none'),
      rank: p.rank,
      score: p.score,
      scoreIcon: getScoreIcon(p.score),
      moves: [fast, charged].filter(Boolean).join(' / '),
      isFav: p.isFav,
      lowRank: p.rank > 100
    };
  });
  return {
    members,
    sharedWeaks: sharedWeakNames(trio),
    copyString: trio.map(p => p.name).join(',')
  };
}

/**
 * 分析使用者盒子並回傳最佳/即戰力三人組
 */
export async function analyzeUserBoxTeam(
  leaguePath: string,
  teamNames: string[],
  favNames: string[],
  env: Env,
  ctx: ExecutionContext
): Promise<BoxAnalysis> {
  const leagueInfo = leagues.find(l => l.path === leaguePath);
  const leagueName = leagueInfo ? leagueInfo.name : leaguePath;

  try {
    const [transRes, moveTransRes, bundledData] = await Promise.all([
      fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx),
      fetchWithCache(getDataUrl("data/move.json"), env, ctx),
      getAllRankingsBundle(env, ctx),
    ]);

    const transData = await transRes.json() as PokemonData[];
    const moveTrans = await moveTransRes.json() as Record<string, string>;
    const favSet = new Set(favNames);

    const nameMap = new Map<string, string>();
    const typeMap = new Map<string, string[]>();
    transData.forEach(p => {
      const id = p.speciesId.toLowerCase();
      nameMap.set(id, p.speciesName);
      typeMap.set(id, p.types);
    });

    const translateMove = (mId: string): string => {
      if (!mId) return "";
      const isElite = mId.includes('*');
      const clean = mId.replace('*', '').toUpperCase();
      const name = moveTrans[clean] || clean;
      return isElite ? `${name}*` : name;
    };

    const rankings = (bundledData[leaguePath] || []) as RankingPokemon[];
    if (!rankings.length) return { leagueName, error: "找不到聯盟排名資料" } as BoxAnalysis;

    // 排名 → 中文名對照 (保留最高排名)
    const rankedMap = new Map<string, RankingPokemon & { realRank: number }>();
    rankings.forEach((r, idx) => {
      const zh = getFullName(r.speciesId, nameMap);
      if (!rankedMap.has(zh)) rankedMap.set(zh, { ...r, realRank: idx + 1 });
    });

    const myPokemons: Mon[] = teamNames
      .filter(name => rankedMap.has(name))
      .map(name => {
        const r = rankedMap.get(name)!;
        const id = r.speciesId.toLowerCase();
        const types = typeMap.get(id) || typeMap.get(id.split('_')[0]) || [];
        let fastMove = r.moveFast || "";
        let chargedMoves = Array.isArray(r.moveCharged) ? r.moveCharged.slice(0, 2)
          : (r.moveCharged ? [r.moveCharged] : []);
        if (!fastMove && Array.isArray(r.moveset)) {
          fastMove = r.moveset[0] || "";
          chargedMoves = r.moveset.slice(1, 3);
        }
        return {
          speciesId: r.speciesId, name, types,
          moveTypes: types.filter(t => t !== 'none'),
          fastMove, chargedMoves,
          rank: r.realRank, score: r.score || 0,
          isFav: favSet.has(name)
        };
      });

    if (myPokemons.length < 3) {
      return { leagueName, error: "在此聯盟中符合排名的寶可夢不足 3 隻" } as BoxAnalysis;
    }

    const bestTrioMons = findBestTrio(myPokemons)!;
    const bestTrio = buildTrioResult(bestTrioMons, translateMove);

    let favTrio: TrioResult | null = null;
    let favSameAsBest = false;
    const favPool = myPokemons.filter(p => p.isFav);
    if (favPool.length >= 3) {
      const favTrioMons = findBestTrio(favPool)!;
      favSameAsBest = favTrioMons.map(p => p.speciesId).sort().join(',') ===
        bestTrioMons.map(p => p.speciesId).sort().join(',');
      if (!favSameAsBest) favTrio = buildTrioResult(favTrioMons, translateMove);
    }

    const garbage = teamNames.filter(name => {
      const r = rankedMap.get(name);
      return !r || r.realRank > GARBAGE_RANK_THRESHOLD;
    });

    return {
      leagueName, bestTrio, favTrio, favSameAsBest,
      favCount: favPool.length, garbage
    };
  } catch (e) {
    return { leagueName, error: "運算錯誤: " + (e as Error).message } as BoxAnalysis;
  }
}

/**
 * 過濾盒子垃圾 (未上榜 / 名次過低)
 */
export async function filterGarbage(
  leaguePath: string,
  teamNames: string[],
  env: Env,
  ctx: ExecutionContext
): Promise<{ keep: string[]; removed: string[] }> {
  try {
    const [transRes, bundledData] = await Promise.all([
      fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx),
      getAllRankingsBundle(env, ctx),
    ]);

    const transData = await transRes.json() as PokemonData[];
    const nameMap = new Map(transData.map(p => [p.speciesId.toLowerCase(), p.speciesName]));

    const rankings = (bundledData[leaguePath] || []) as RankingPokemon[];
    const rankedMap = new Map<string, number>();
    rankings.forEach((r, idx) => {
      const zh = getFullName(r.speciesId, nameMap);
      if (!rankedMap.has(zh)) rankedMap.set(zh, idx + 1);
    });

    const keep: string[] = [];
    const removed: string[] = [];
    teamNames.forEach(name => {
      const rank = rankedMap.get(name);
      if (!rank || rank > GARBAGE_RANK_THRESHOLD) removed.push(name);
      else keep.push(name);
    });
    return { keep, removed };
  } catch {
    return { keep: teamNames, removed: [] };
  }
}
