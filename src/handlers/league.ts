// =========================================================
//  聯盟排名處理 (League Ranking Handlers)
// =========================================================

import type { Env, PokemonData, RankingPokemon } from '../types';
import { leagues, MANIFEST_URL, NAME_CLEANER_REGEX, typeNames } from '../constants';
import { fetchWithCache, getDataUrl } from '../utils/cache';
import { sendMessage, editMessage, deleteMessage } from '../utils/telegram';
import { getPokemonRating, getTranslatedName, getDefenseProfile, getWeaknesses } from '../utils/helpers';

/**
 * 處理聯盟排名查詢
 */
export async function handleLeagueCommand(
  chatId: number,
  command: string,
  limit: number,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  const leagueInfo = leagues.find((l) => l.command === command);
  if (!leagueInfo) {
    await sendMessage(chatId, "未知的命令。", null, env);
    return;
  }

  await sendMessage(chatId, `查詢 <b>${leagueInfo.name}</b>...`, { parse_mode: "HTML" }, env);

  try {
    const [resRank, resTrans] = await Promise.all([
      fetchWithCache(getDataUrl(leagueInfo.path), env, ctx),
      fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx)
    ]);

    const rankings = await resRank.json() as RankingPokemon[];
    const trans = await resTrans.json() as PokemonData[];
    const map = new Map(trans.map(p => [p.speciesId.toLowerCase(), p.speciesName]));

    const list = rankings.slice(0, limit);
    let msg = `🏆 <b>${leagueInfo.name}</b> (Top ${limit})\n\n`;
    const copyList: string[] = [];

    list.forEach((p, i) => {
      const rank = p.rank || p.tier || i + 1;
      const rating = getPokemonRating(rank);
      if (rating === "垃圾") return;

      const rawName = map.get(p.speciesId.toLowerCase()) || p.speciesName || p.speciesId;
      const name = getTranslatedName(p.speciesId, rawName);
      const clean = name.replace(NAME_CLEANER_REGEX, "").trim();
      if (clean) copyList.push(clean);

      const rankDisplay = `#${rank}`;
      msg += `${rankDisplay} ${name} ${p.cp ? `CP:${p.cp}` : ""} ${p.score ? `(${p.score.toFixed(1)})` : ""} - ${rating}\n`;
    });

    if (copyList.length) {
      msg += `\n<code>${[...new Set(copyList)].join(",")}</code>`;
    }

    await sendMessage(chatId, msg, { parse_mode: "HTML" }, env);
  } catch (e) {
    await sendMessage(chatId, `Error: ${(e as Error).message}`, null, env);
  }
}

/**
 * 處理當下聯盟整合查詢
 */
export async function handleCurrentLeagues(
  chatId: number,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  const loadingMsg = await sendMessage(
    chatId,
    "🔄 正在同步賽季資訊並整合搜尋字串...",
    { parse_mode: "HTML" },
    env
  );

  try {
    // 抓取 Manifest
    const manifestRes = await fetch(MANIFEST_URL, {
      headers: { "User-Agent": "PokeMaster-Pro/1.0" },
      cf: { cacheTtl: 300 }
    });

    if (!manifestRes.ok) throw new Error(`Manifest 讀取失敗 (${manifestRes.status})`);
    const manifest = await manifestRes.json() as {
      active_leagues: Array<{ cp: string; pvpoke_id: string; name_zh: string }>;
      last_updated_human?: string;
    };

    if (!manifest.active_leagues || manifest.active_leagues.length === 0) {
      await sendMessage(chatId, "⚠️ 目前沒有偵測到當下聯盟數據。", null, env);
      return;
    }

    // 準備翻譯資料
    const transRes = await fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx);
    const transData = await transRes.json() as PokemonData[];
    const transMap = new Map(transData.map(p => [p.speciesId.toLowerCase(), p.speciesName]));

    const allTopPokemons = new Set<string>();
    const matchedLeaguesInfo: string[] = [];

    // 遍歷與匹配
    const promises = manifest.active_leagues.map(async (activeLeague) => {
      const localLeague = leagues.find(l => {
        if (String(l.cp) !== String(activeLeague.cp)) return false;
        const targetId = activeLeague.pvpoke_id;
        const localName = l.name;
        const localCmd = l.command;

        if (targetId === "all") {
          return localCmd === "great_league_top" ||
            localCmd === "ultra_league_top" ||
            localCmd === "master_league_top";
        }
        if (targetId === "premier") {
          return localName.includes("紀念") ||
            localCmd.includes("premier") ||
            localCmd.includes("permier");
        }
        if (targetId === "remix") {
          return localName.includes("Remix") || localCmd.includes("remix");
        }
        return localCmd.includes(targetId);
      });

      if (!localLeague) {
        console.log(`⚠️ 找不到本地對應設定: ${activeLeague.name_zh}`);
        return null;
      }

      try {
        const res = await fetchWithCache(getDataUrl(localLeague.path), env, ctx);
        if (!res.ok) return null;
        const data = await res.json() as RankingPokemon[];
        return { name: localLeague.name, path: localLeague.path, data };
      } catch {
        return null;
      }
    });

    const results = await Promise.all(promises);

    // 整合資料
    results.forEach(result => {
      if (!result || !result.data) return;

      matchedLeaguesInfo.push(`${result.name}\n   └ 📂 <code>${result.path}</code>`);

      result.data.slice(0, 50).forEach(p => {
        const rawName = transMap.get(p.speciesId.toLowerCase()) || p.speciesName || p.speciesId;
        const name = getTranslatedName(p.speciesId, rawName);
        const clean = name.replace(NAME_CLEANER_REGEX, "").trim();
        if (clean && !clean.toUpperCase().includes("SHADOW")) {
          allTopPokemons.add(clean);
        }
      });
    });

    if (allTopPokemons.size === 0) throw new Error("無有效資料");

    // 產生結果
    const sortedList = Array.from(allTopPokemons).join(",");
    const searchString1 = `${sortedList}&!我的最愛&距離10`;
    const searchString2 = `${sortedList}&!我的最愛&距離10-`;

    // 刪除 Loading
    if (loadingMsg.result?.message_id) {
      await deleteMessage(chatId, loadingMsg.result.message_id, env);
    }

    let msg = `🔥 <b>當下聯盟整合 (資料來源: 本地資料庫)</b>\n`;
    msg += `更新時間: ${manifest.last_updated_human || "未知"}\n\n`;
    msg += `<b>已載入來源檔：</b>\n${matchedLeaguesInfo.join("\n")}\n\n`;
    msg += `📋 <b>Top 50 整合搜尋 (距離10)</b>\n`;
    msg += `<code>${searchString1}</code>\n\n`;
    msg += `📋 <b>Top 50 整合搜尋 (距離10-)</b>\n`;
    msg += `<code>${searchString2}</code>`;

    await sendMessage(chatId, msg, { parse_mode: "HTML" }, env);

  } catch (e) {
    await sendMessage(chatId, `❌ 處理失敗: ${(e as Error).message}`, null, env);
  }
}

/**
 * 尋找最佳隊友 (用於 Meta 分析)
 */
function findBestPartner(
  rankings: RankingPokemon[],
  currentTeam: RankingPokemon[],
  pokemonTypeMap: Map<string, PokemonData>
): RankingPokemon | undefined {
  const teamWeaknessCounts: Record<string, number> = {};

  currentTeam.forEach(p => {
    const pInfo = pokemonTypeMap.get(p.speciesId.toLowerCase());
    if (pInfo?.types) {
      const weaknesses = getWeaknesses(pInfo.types);
      weaknesses.forEach(w => {
        teamWeaknessCounts[w] = (teamWeaknessCounts[w] || 0) + 1;
      });
    }
  });

  const urgentWeaknesses = Object.keys(teamWeaknessCounts)
    .sort((a, b) => teamWeaknessCounts[b] - teamWeaknessCounts[a]);

  let bestPartner: RankingPokemon | undefined;
  let bestScore = -9999;
  const searchPool = rankings.slice(0, 40);

  for (const candidate of searchPool) {
    if (currentTeam.some(m => m.speciesId === candidate.speciesId)) continue;

    const candInfo = pokemonTypeMap.get(candidate.speciesId.toLowerCase());
    if (!candInfo?.types) continue;

    let score = 0;
    const candProfile = getDefenseProfile(candInfo.types);
    const candWeaknesses = getWeaknesses(candInfo.types);

    urgentWeaknesses.forEach(weakType => {
      if (candProfile[weakType] < 1.0) score += (20 * (teamWeaknessCounts[weakType] || 1));
    });

    urgentWeaknesses.forEach(weakType => {
      if (candProfile[weakType] > 1.0) score -= (30 * (teamWeaknessCounts[weakType] || 1));
    });

    candWeaknesses.forEach(w => {
      let covered = false;
      currentTeam.forEach(teammate => {
        const tInfo = pokemonTypeMap.get(teammate.speciesId.toLowerCase());
        if (tInfo) {
          const tProfile = getDefenseProfile(tInfo.types);
          if (tProfile[w] < 1.0) covered = true;
        }
      });
      if (covered) score += 5;
      else score -= 5;
    });

    const rankIndex = rankings.indexOf(candidate);
    score -= (rankIndex * 0.5);

    if (score > bestScore) {
      bestScore = score;
      bestPartner = candidate;
    }
  }

  if (!bestPartner || bestScore < -50) {
    bestPartner = searchPool.find(p => !currentTeam.some(m => m.speciesId === p.speciesId));
  }

  return bestPartner;
}

/**
 * 建立平衡隊伍
 */
function buildBalancedTeam(
  leader: RankingPokemon,
  rankings: RankingPokemon[],
  map: Map<string, PokemonData>
): RankingPokemon[] {
  const team = [leader];
  const partner1 = findBestPartner(rankings, team, map);
  if (partner1) team.push(partner1);
  const partner2 = findBestPartner(rankings, team, map);
  if (partner2) team.push(partner2);
  return team;
}

/**
 * 處理 Meta 分析
 */
export async function handleMetaAnalysis(
  chatId: number,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  const targetLeagues = [
    leagues.find(l => l.command === "great_league_top"),
    leagues.find(l => l.command === "ultra_league_top"),
    leagues.find(l => l.command === "master_league_top")
  ];

  await sendMessage(
    chatId,
    `🔄 <b>正在分析三聯盟實時生態與屬性聯防...</b>`,
    { parse_mode: "HTML" },
    env
  );

  const transResponse = await fetchWithCache(getDataUrl("data/chinese_translation.json"), env, ctx);
  if (!transResponse.ok) {
    await sendMessage(chatId, "❌ 無法讀取資料庫", null, env);
    return;
  }

  const allPokemonData = await transResponse.json() as PokemonData[];
  const pokemonDetailMap = new Map(allPokemonData.map(p => [p.speciesId.toLowerCase(), p]));

  const getName = (p: RankingPokemon, forCopy = false): string => {
    const detail = pokemonDetailMap.get(p.speciesId.toLowerCase());
    const originalName = detail ? detail.speciesName : p.speciesName || p.speciesId;
    const name = getTranslatedName(p.speciesId, originalName);
    if (forCopy) return name.replace(NAME_CLEANER_REGEX, "").trim();
    return name;
  };

  const getTypesStr = (p: RankingPokemon): string => {
    const detail = pokemonDetailMap.get(p.speciesId.toLowerCase());
    if (!detail?.types) return "";
    const chiTypes = detail.types
      .filter(t => t.toLowerCase() !== "none")
      .map(t => typeNames[t.toLowerCase()] || t);
    return `(${chiTypes.join("/")})`;
  };

  for (const league of targetLeagues) {
    if (!league) continue;

    try {
      const response = await fetchWithCache(getDataUrl(league.path), env, ctx);
      const rankings = await response.json() as RankingPokemon[];
      if (!rankings || rankings.length === 0) continue;

      const topOne = rankings[0];
      const topOneScore = topOne.score ? topOne.score.toFixed(1) : "N/A";
      const teamViolence = rankings.slice(0, 3);
      const teamBalanced = buildBalancedTeam(topOne, rankings, pokemonDetailMap);

      let altLeader = rankings[1];
      if (teamBalanced.some(p => p.speciesId === altLeader.speciesId)) {
        altLeader = rankings[2];
      }
      const teamAlternative = buildBalancedTeam(altLeader, rankings, pokemonDetailMap);

      const copySet = new Set<string>();
      [...teamViolence, ...teamBalanced, ...teamAlternative].forEach(p => {
        const cleanName = getName(p, true);
        if (cleanName) copySet.add(cleanName);
      });
      const copyString = [...copySet].join(",");

      let msg = `📊 <b>${league.name} 戰略分析</b>\n\n`;
      msg += `👑 <b>META 核心</b>\n👉 <b>${getName(topOne)}</b> (分: ${topOneScore})\n\n`;
      msg += `<b>暴力 T0 隊</b> (純強度)\n`;
      teamViolence.forEach((p, i) => {
        msg += `${i + 1}️⃣ ${getName(p)} ${getTypesStr(p)}\n`;
      });
      msg += `\n🛡️ <b>智慧聯防隊</b> (以王者為核)\n`;
      teamBalanced.forEach((p, i) => {
        msg += `${i + 1}️⃣ ${getName(p)} ${getTypesStr(p)}\n`;
      });
      msg += `\n🔄 <b>二當家聯防隊</b> (替代方案)\n`;
      teamAlternative.forEach((p, i) => {
        msg += `${i + 1}️⃣ ${getName(p)} ${getTypesStr(p)}\n`;
      });
      msg += `\n📋 <b>一鍵複製搜尋字串</b>\n`;
      msg += `<code>${copyString}</code>`;

      await sendMessage(chatId, msg, { parse_mode: "HTML" }, env);
    } catch (e) {
      await sendMessage(chatId, `⚠️ ${league.name} 分析錯誤: ${(e as Error).message}`, null, env);
    }
  }
}
