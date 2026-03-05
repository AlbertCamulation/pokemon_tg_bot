import type { Env, PokemonData, RankingPokemon } from '../types';
import { fetchWithCache, getDataUrl } from '../utils/cache';
import { leagues } from '../constants';

const TYPE_MAP: Record<string, string> = {
  "normal": "一般", "fire": "火", "water": "水", "grass": "草", "electric": "電",
  "ice": "冰", "fighting": "格鬥", "poison": "毒", "ground": "地面", "flying": "飛行",
  "psychic": "超能力", "bug": "蟲", "rock": "岩石", "ghost": "幽靈", "dragon": "龍",
  "dark": "惡", "steel": "鋼", "fairy": "妖精", "none": ""
};

const SUFFIX_MAP: Record<string, string> = {
  "_shadow": " (暗影)",
  "_alolan": " (阿羅拉)",
  "_galarian": " (伽勒爾)",
  "_hisuian": " (洗翠)",
  "_paldean": " (帕底亞)",
  "_apex": " (頂點)",
  "_mega": " (Mega)"
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

function scoreTeam(trio: any[], typeChart: any): number {
  let score = 0;

  // 1. 基礎分數
  trio.forEach(p => { score += p.score; });

  // 2. 弱點互補加分：A 的弱點被 B 或 C 抵抗
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

  // 3. 招式屬性多樣化加分
  const allMoveTypes: string[] = [];
  trio.forEach(p => allMoveTypes.push(...p.moveTypes));
  score += new Set(allMoveTypes).size * 5;

  // 4. 主屬性重疊扣分
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

  // 5. 共同弱點重扣
  const allWeakSets = trio.map(p => {
    const w = getWeaknesses(p.types, typeChart);
    return new Set(Object.entries(w).filter(([_, m]) => m > 1.0).map(([t]) => t));
  });
  const sharedWeaks = [...allWeakSets[0]].filter(w => allWeakSets[1].has(w) && allWeakSets[2].has(w));
  score -= sharedWeaks.length * 20;

  return score;
}

export async function analyzeUserBoxTeam(
  league: number,
  teamNames: string[],
  env: Env,
  ctx: ExecutionContext
): Promise<string> {
  try {
    const [transRes, typeRes, moveTransRes] = await Promise.all([
      fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx),
      fetchWithCache(getDataUrl("data/type_chart.json"), env, ctx),
      fetchWithCache(getDataUrl("data/move.json"), env, ctx),
    ]);

    const transData = await transRes.json() as PokemonData[];
    const typeChart = await typeRes.json() as any;
    const moveTrans = await moveTransRes.json() as Record<string, string>;

    const getFullName = (speciesId: string): string => {
      const id = speciesId.toLowerCase();
      const directMatch = transData.find(p => p.speciesId.toLowerCase() === id);
      if (directMatch?.speciesName) return directMatch.speciesName;
      const baseId = id.split('_')[0];
      const baseMatch = transData.find(p => p.speciesId.toLowerCase() === baseId);
      let name = baseMatch?.speciesName || speciesId;
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

    const leagueInfo = leagues.find(l => l.command === String(league) || l.cp === String(league));
    const rankRes = await fetchWithCache(getDataUrl(leagueInfo!.path), env, ctx);
    const rankings = await rankRes.json() as RankingPokemon[];

    const myPokemons = rankings
      .map((r, idx) => ({ ...r, realRank: idx + 1 }))
      .filter(r => teamNames.includes(getFullName(r.speciesId)))
      .map(r => {
        const id = r.speciesId.toLowerCase();
        const baseId = id.split('_')[0];
        const pInfo = transData.find(p => p.speciesId.toLowerCase() === id) ||
                      transData.find(p => p.speciesId.toLowerCase() === baseId);

        let fastMove: string = r.moveFast || "";
        let chargedMoves: string[] = Array.isArray(r.moveCharged)
          ? r.moveCharged.slice(0, 2)
          : (r.moveCharged ? [r.moveCharged] : []);
        if (!fastMove && r.moveset && Array.isArray(r.moveset)) {
          fastMove = r.moveset[0] || "";
          chargedMoves = r.moveset.slice(1, 3);
        }

        // 招式屬性：用自身屬性近似（無法從 move.json 取得屬性時的備案）
        const moveTypes: string[] = (pInfo?.types || []).filter((t: string) => t !== 'none');

        return {
          speciesId: r.speciesId,
          chineseName: getFullName(r.speciesId),
          types: pInfo?.types || [],
          moveTypes,
          fastMove,
          chargedMoves,
          rank: r.realRank,
          score: r.score || 0
        };
      });

    if (myPokemons.length < 3) {
      return "⚠️ 符合排名的寶可夢不足 3 隻，請至少加入 3 隻有排名的寶可夢。";
    }

    // 暴力枚舉所有組合，找最高分
    let bestScore = -Infinity;
    let bestTrio = myPokemons.slice(0, 3);

    for (let i = 0; i < myPokemons.length; i++) {
      for (let j = i + 1; j < myPokemons.length; j++) {
        for (let k = j + 1; k < myPokemons.length; k++) {
          const trio = [myPokemons[i], myPokemons[j], myPokemons[k]];
          const s = scoreTeam(trio, typeChart);
          if (s > bestScore) { bestScore = s; bestTrio = trio; }
        }
      }
    }

    const [leader, safeSwap, closer] = bestTrio;

    // 共同弱點提示
    const allWeakSets = bestTrio.map(p => {
      const w = getWeaknesses(p.types, typeChart);
      return new Set(Object.entries(w).filter(([_, m]) => m > 1.0).map(([t]) => t));
    });
    const sharedWeaks = [...allWeakSets[0]]
      .filter(w => allWeakSets[1].has(w) && allWeakSets[2].has(w))
      .map(w => TYPE_MAP[w] || w);

    const toZh = (ts: string[]) =>
      ts.filter(t => t.toLowerCase() !== 'none').map(t => TYPE_MAP[t.toLowerCase()] || t).join('/');

    const formatPoke = (p: any, icon: string) => {
      const fast = translateMove(p.fastMove);
      const charged = p.chargedMoves.map((m: string) => translateMove(m)).filter(Boolean).join(', ');
      const moveLine = [fast, charged].filter(Boolean).join(' / ');
      return `${icon} #${p.rank} ${p.chineseName} (${p.score.toFixed(1)}) - ${getRankIcon(p.score)}\n(${toZh(p.types)})\n└ ${moveLine}`;
    };

    let msg = `📊 ${league} 聯盟最佳三人組分析\n`;
    msg += `=======================\n`;
    msg += `🥇 先發 (Leader)\n${formatPoke(leader, "👑")}\n\n`;
    msg += `🥈 安全替換 (Safe Swap)\n${formatPoke(safeSwap, "🛡️")}\n\n`;
    msg += `🥉 壓軸 (Closer)\n${formatPoke(closer, "⚔️")}\n`;
    msg += `=======================\n`;
    if (sharedWeaks.length > 0) {
      msg += `⚠️ 共同弱點：${sharedWeaks.join('、')} 系，小心被針對！\n`;
    } else {
      msg += `✅ 弱點覆蓋良好，無共同致命弱點。\n`;
    }
    msg += `💡 系統已自動識別 暗影/地區/Mega 型態。`;

    return msg;

  } catch (error) {
    return "❌ 運算錯誤: " + (error as Error).message;
  }
}
