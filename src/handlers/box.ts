import type { Env, PokemonData, RankingPokemon } from '../types';
import { fetchWithCache, getDataUrl, getAllRankingsBundle } from '../utils/cache';
import { leagues } from '../constants';

const TYPE_MAP: Record<string, string> = {
  "normal": "一般", "fire": "火", "water": "水", "grass": "草", "electric": "電",
  "ice": "冰", "fighting": "格鬥", "poison": "毒", "ground": "地面", "flying": "飛行",
  "psychic": "超能力", "bug": "蟲", "rock": "岩石", "ghost": "幽靈", "dragon": "龍",
  "dark": "惡", "steel": "鋼", "fairy": "妖精", "none": ""
};

const SUFFIX_MAP: Record<string, string> = {
  "_shadow": " (暗影)", "_alolan": " (阿羅拉)", "_galarian": " (伽勒爾)",
  "_hisuian": " (洗翠)", "_paldean": " (帕底亞)", "_apex": " (頂點)", "_mega": " (Mega)"
};

function getRankIcon(score: number): string {
  if (score >= 90) return "🥇白金";
  if (score >= 80) return "🥇金";
  if (score >= 70) return "🥈銀";
  return "🥉銅";
}

function getWeaknesses(types: string[], typeChart: any): Record<string, number> {
  const mults: Record<string, number> = {};
  Object.keys(typeChart).forEach(atk => {
    let m = 1.0;
    types.forEach(def => {
      if (def.toLowerCase() !== 'none')
        m *= (typeChart[def.toLowerCase()]?.[atk.toLowerCase()] ?? 1.0);
    });
    mults[atk] = m;
  });
  return mults;
}

function scoreTeam(trio: any[], typeChart: any, favNames: Set<string>): number {
  let score = 0;
  trio.forEach(p => { score += p.score; });

  // 排名加權
  trio.forEach(p => {
    if (p.rank <= 50) score += 30;
    else if (p.rank <= 100) score += 10;
    else score -= 20;
  });

  // 弱點互補
  for (let i = 0; i < trio.length; i++) {
    const myWeaks = Object.entries(getWeaknesses(trio[i].types, typeChart))
      .filter(([_, m]) => m > 1.0).map(([t]) => t);
    for (const w of myWeaks) {
      const covered = trio.some((other, j) => {
        if (j === i) return false;
        return (getWeaknesses(other.types, typeChart)[w] ?? 1.0) < 1.0;
      });
      if (covered) score += 8;
    }
  }

  // 招式屬性多樣化
  const allMoveTypes: string[] = [];
  trio.forEach(p => allMoveTypes.push(...p.moveTypes));
  score += new Set(allMoveTypes).size * 5;

  // 主屬性重疊扣分
  const typeCounts: Record<string, number> = {};
  trio.forEach(p => {
    p.types.forEach((t: string) => {
      if (t !== 'none') typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
  });
  Object.values(typeCounts).forEach(count => {
    if (count >= 3) score -= 25;
    else if (count === 2) score -= 10;
  });

  // 共同弱點重扣
  const allWeakSets = trio.map(p => {
    const w = getWeaknesses(p.types, typeChart);
    return new Set(Object.entries(w).filter(([_, m]) => m > 1.0).map(([t]) => t));
  });
  const sharedWeaks = [...allWeakSets[0]].filter(w => allWeakSets[1].has(w) && allWeakSets[2].has(w));
  score -= sharedWeaks.length * 20;

  return score;
}

function findBestTrio(pool: any[], typeChart: any, favNames: Set<string>): any[] | null {
  if (pool.length < 3) return null;
  let bestScore = -Infinity;
  let best = pool.slice(0, 3);
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      for (let k = j + 1; k < pool.length; k++) {
        const trio = [pool[i], pool[j], pool[k]];
        const s = scoreTeam(trio, typeChart, favNames);
        if (s > bestScore) { bestScore = s; best = trio; }
      }
    }
  }
  return best;
}

export async function analyzeUserBoxTeam(
  leaguePath: string,
  teamNames: string[],
  favNames: string[],
  env: Env,
  ctx: ExecutionContext
): Promise<string> {
  try {
    const [transRes, typeRes, moveTransRes, bundledData] = await Promise.all([
      fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx),
      fetchWithCache(getDataUrl("data/type_chart.json"), env, ctx),
      fetchWithCache(getDataUrl("data/move.json"), env, ctx),
      getAllRankingsBundle(env, ctx),
    ]);

    const transData = await transRes.json() as PokemonData[];
    const typeChart = await typeRes.json() as any;
    const moveTrans = await moveTransRes.json() as Record<string, string>;
    const favSet = new Set(favNames);

    const getFullName = (speciesId: string): string => {
      const id = speciesId.toLowerCase();
      const direct = transData.find(p => p.speciesId.toLowerCase() === id);
      if (direct?.speciesName) return direct.speciesName;
      const baseId = id.split('_')[0];
      const base = transData.find(p => p.speciesId.toLowerCase() === baseId);
      let name = base?.speciesName || speciesId;
      Object.entries(SUFFIX_MAP).forEach(([key, zh]) => {
        if (id.includes(key)) name += zh;
      });
      return name;
    };

    const translateMove = (mId: string): string => {
      if (!mId) return "";
      const isElite = mId.includes('*');
      const cleanId = mId.replace('*', '').toUpperCase();
      const name = moveTrans[cleanId] || cleanId;
      return isElite ? `${name}*` : name;
    };

    const rankings = (bundledData[leaguePath] || []) as RankingPokemon[];
    if (rankings.length === 0) return `⚠️ 找不到聯盟排名資料`;

    const myPokemons = rankings
      .map((r, idx) => ({ ...r, realRank: idx + 1 }))
      .filter(r => teamNames.includes(getFullName(r.speciesId)))
      .map(r => {
        const id = r.speciesId.toLowerCase();
        const pInfo = transData.find(p => p.speciesId.toLowerCase() === id) ||
                      transData.find(p => p.speciesId.toLowerCase() === id.split('_')[0]);
        let fastMove: string = r.moveFast || "";
        let chargedMoves: string[] = Array.isArray(r.moveCharged)
          ? r.moveCharged.slice(0, 2)
          : (r.moveCharged ? [r.moveCharged] : []);
        if (!fastMove && Array.isArray(r.moveset)) {
          fastMove = r.moveset[0] || "";
          chargedMoves = r.moveset.slice(1, 3);
        }
        return {
          speciesId: r.speciesId,
          chineseName: getFullName(r.speciesId),
          types: pInfo?.types || [],
          moveTypes: (pInfo?.types || []).filter((t: string) => t !== 'none'),
          fastMove, chargedMoves,
          rank: r.realRank,
          score: r.score || 0,
          isFav: favSet.has(getFullName(r.speciesId))
        };
      });

    if (myPokemons.length < 3) {
      return "⚠️ 在此聯盟中符合排名的寶可夢不足 3 隻，請加入更多有排名的寶可夢。";
    }

    const toZh = (ts: string[]) =>
      ts.filter(t => t.toLowerCase() !== 'none').map(t => TYPE_MAP[t.toLowerCase()] || t).join('/');

    const formatPoke = (p: any, icon: string, role: string) => {
      const fast = translateMove(p.fastMove);
      const charged = p.chargedMoves.map((m: string) => translateMove(m)).filter(Boolean).join(', ');
      const moveLine = [fast, charged].filter(Boolean).join(' / ');
      const rankWarn = p.rank > 100 ? ' ⚠️' : '';
      const favTag = p.isFav ? ' ⭐' : '';
      return (
        `${icon} ${role}　<b>#${p.rank} ${p.chineseName}</b>${favTag}${rankWarn}\n` +
        `${getRankIcon(p.score)} ${p.score.toFixed(1)} ｜ ${toZh(p.types)}\n` +
        `└ ${moveLine}`
      );
    };

    const getSharedWeaks = (trio: any[]) => {
      const sets = trio.map(p => {
        const w = getWeaknesses(p.types, typeChart);
        return new Set(Object.entries(w).filter(([_, m]) => m > 1.0).map(([t]) => t));
      });
      return [...sets[0]].filter(w => sets[1].has(w) && sets[2].has(w)).map(w => TYPE_MAP[w] || w);
    };

    const leagueInfo = leagues.find(l => l.path === leaguePath);
    const leagueName = leagueInfo ? leagueInfo.name : leaguePath;

    // ── 最佳三人組（全部）──
    const bestTrio = findBestTrio(myPokemons, typeChart, favSet)!;
    const sharedWeaks = getSharedWeaks(bestTrio);

    let msg = `📊 <b>${leagueName} 最佳三人組</b>\n\n`;
    msg += `${formatPoke(bestTrio[0], "👑", "先發")}\n\n`;
    msg += `${formatPoke(bestTrio[1], "🛡", "替換")}\n\n`;
    msg += `${formatPoke(bestTrio[2], "⚔️", "壓軸")}\n\n`;
    msg += sharedWeaks.length > 0
      ? `⚠️ 共同弱點：${sharedWeaks.join('、')} 系\n`
      : `✅ 弱點覆蓋良好，無共同致命弱點\n`;
    msg += `\n📋 <code>${bestTrio.map(p => p.chineseName).join(',')}</code>`;

    // ── 即戰力優先組（⭐ 標記的）──
    const favPool = myPokemons.filter(p => p.isFav);
    if (favPool.length >= 3) {
      const favTrio = findBestTrio(favPool, typeChart, favSet)!;
      const favWeaks = getSharedWeaks(favTrio);
      const sameAsBest = favTrio.map(p => p.speciesId).sort().join(',') ===
                         bestTrio.map(p => p.speciesId).sort().join(',');

      if (!sameAsBest) {
        msg += `\n\n⭐ <b>${leagueName} 即戰力優先組</b>\n\n`;
        msg += `${formatPoke(favTrio[0], "👑", "先發")}\n\n`;
        msg += `${formatPoke(favTrio[1], "🛡", "替換")}\n\n`;
        msg += `${formatPoke(favTrio[2], "⚔️", "壓軸")}\n\n`;
        msg += favWeaks.length > 0
          ? `⚠️ 共同弱點：${favWeaks.join('、')} 系\n`
          : `✅ 弱點覆蓋良好，無共同致命弱點\n`;
        msg += `\n📋 <code>${favTrio.map(p => p.chineseName).join(',')}</code>`;
      } else {
        msg += `\n\n⭐ 即戰力優先組與最佳三人組相同`;
      }
    } else if (favPool.length > 0) {
      msg += `\n\n⭐ 即戰力寶可夢僅 ${favPool.length} 隻，不足 3 隻無法分析優先組`;
    }

    return msg;

  } catch (error) {
    return "❌ 運算錯誤: " + (error as Error).message;
  }
}
