// =========================================================
//  常數與設定 (Constants & Configuration)
// =========================================================

import type { League, TypeChart } from './types';

// --- GitHub 資料來源 ---
export const GITHUB_USERNAME = "AlbertCamulation";
export const REPO_NAME = "pokemon_tg_bot";
export const BRANCH_NAME = "main";

// --- Telegram Webhook ---
export const WEBHOOK_PATH = "/endpoint";

// --- KV 存儲 Key ---
export const TRASH_LIST_PREFIX = "trash_pokemon_";
export const ALLOWED_UID_KEY = "allowed_user_ids";
export const BANNED_UID_KEY = "banned_user_ids";

// --- 快取設定 ---
export const CACHE_TTL = 86400; // 24 小時
export const LIMIT_LEAGUES_SHOW = 50;

// --- 清理名稱用正則表達式 ---
export const NAME_CLEANER_REGEX = /\s*(一擊流|靈獸|冰凍|水流|普通|完全體|闇黑|拂曉之翼|黃昏之鬃|特大尺寸|普通尺寸|大尺寸|小尺寸|別種|裝甲|滿腹花紋|洗翠|Mega|X|Y|原始|起源|劍之王|盾之王|焰白|暗影|伽勒爾|極巨化|超極巨化|盾牌形態|阿羅拉|歌聲|・|覺悟|的樣子)/g;
export const QUERY_CLEANER_REGEX = /[\s\d\.\u2070-\u209F\u00B0-\u00BE\u2460-\u24FF\u3251-\u32BF]+/g;

// 改成指向 pokemon_tg_bot 自己的 main 分支
export const MANIFEST_URL = "https://raw.githubusercontent.com/AlbertCamulation/pokemon_tg_bot/main/data/manifest.json";

// --- 聯盟設定 ---
export const leagues: League[] = [
  { command: "little_league_top", name: "小小盃 (500)", cp: "500", path: "data/rankings_500.json" },
  { command: "great_league_top", name: "超級聯盟 (1500)", cp: "1500", path: "data/rankings_1500.json" },
  { command: "great_league_top_scroll", name: "假日盃 (1500)", cp: "1500", path: "data/rankings_1500_holiday.json" },
  { command: "great_league_top_sunshine", name: "陽光盃 (1500)", cp: "1500", path: "data/rankings_1500_sunshine.json" },
  { command: "great_league_top_holiday", name: "掛軸盃 (1500)", cp: "1500", path: "data/rankings_1500_scroll.json" },
  { command: "great_league_top_remix", name: "超級 Remix (1500)", cp: "1500", path: "data/rankings_1500_remix.json" },
  { command: "great_league_top_championship2025", name: "冠軍賽 2025 (1500)", cp: "1500", path: "data/rankings_1500_LAIC_2025_Championship_Series_Cup.json" },
  { command: "great_league_top_halloween", name: "萬聖節盃 (1500)", cp: "1500", path: "data/rankings_1500_halloween.json" },
  { command: "great_league_top_retro", name: "復古盃 (1500)", cp: "1500", path: "data/rankings_1500_retro.json" },
  { command: "great_league_top_summer", name: "夏日盃 (1500)", cp: "1500", path: "data/rankings_1500_summer.json" },
  { command: "great_league_top_willpower", name: "意志盃 (1500)", cp: "1500", path: "data/rankingsr_1500_willpowe.json" },
  { command: "great_league_top_jungle", name: "叢林盃 (1500)", cp: "1500", path: "data/rankings_1500_jungle.json" },
  { command: "ultra_league_top", name: "高級聯盟 (2500)", cp: "2500", path: "data/rankings_2500.json" },
  { command: "ultra_league_top_permier", name: "究極紀念賽 (2500)", cp: "2500", path: "data/rankings_2500_premierultra.json" },
  { command: "ultra_league_top_holiday", name: "假日盃 (2500)", cp: "2500", path: "data/rankings_2500_holiday.json" },
  { command: "ultra_league_top_summer", name: "夏日盃 (2500)", cp: "2500", path: "data/rankings_2500_summer.json" },
  { command: "master_league_top", name: "大師聯盟 (無上限)", cp: "10000", path: "data/rankings_10000.json" },
  { command: "master_league_top_permier", name: "大師紀念賽 (無上限)", cp: "10000", path: "data/rankings_10000_premier.json" },
  { command: "master_league_top_meta", name: "大師 Meta (無上限)", cp: "10000", path: "data/rankings_10000_meta_master.json" },
  { command: "attackers_top", name: "最佳攻擊手", cp: "Any", path: "data/rankings_attackers_tier.json" },
  { command: "defenders_top", name: "最佳防守者", cp: "Any", path: "data/rankings_defenders_tier.json" }
];

// --- 屬性相剋表 ---
export const typeChart: TypeChart = {
  normal: { rock: 0.625, ghost: 0.390625, steel: 0.625 },
  fire: { fire: 0.625, water: 0.625, grass: 1.6, ice: 1.6, bug: 1.6, rock: 0.625, dragon: 0.625, steel: 1.6 },
  water: { fire: 1.6, water: 0.625, grass: 0.625, ground: 1.6, rock: 1.6, dragon: 0.625 },
  electric: { water: 1.6, electric: 0.625, grass: 0.625, ground: 0.390625, flying: 1.6, dragon: 0.625 },
  grass: { fire: 0.625, water: 1.6, grass: 0.625, poison: 0.625, ground: 1.6, flying: 0.625, bug: 0.625, rock: 1.6, dragon: 0.625, steel: 0.625 },
  ice: { fire: 0.625, water: 0.625, grass: 1.6, ice: 0.625, ground: 1.6, flying: 1.6, dragon: 1.6, steel: 0.625 },
  fighting: { normal: 1.6, ice: 1.6, poison: 0.625, flying: 0.625, psychic: 0.625, bug: 0.625, rock: 1.6, ghost: 0.390625, dark: 1.6, steel: 1.6, fairy: 0.625 },
  poison: { grass: 1.6, poison: 0.625, ground: 0.625, rock: 0.625, ghost: 0.625, steel: 0.390625, fairy: 1.6 },
  ground: { fire: 1.6, electric: 1.6, grass: 0.625, poison: 1.6, flying: 0.390625, bug: 0.625, rock: 1.6, steel: 1.6 },
  flying: { electric: 0.625, grass: 1.6, fighting: 1.6, bug: 1.6, rock: 0.625, steel: 0.625 },
  psychic: { fighting: 1.6, poison: 1.6, psychic: 0.625, dark: 0.390625, steel: 0.625 },
  bug: { fire: 0.625, grass: 1.6, fighting: 0.625, poison: 0.625, flying: 0.625, psychic: 1.6, ghost: 0.625, dark: 1.6, steel: 0.625, fairy: 0.625 },
  rock: { fire: 1.6, ice: 1.6, fighting: 0.625, ground: 0.625, flying: 1.6, bug: 1.6, steel: 0.625 },
  ghost: { normal: 0.390625, psychic: 1.6, ghost: 1.6, dark: 0.625 },
  dragon: { dragon: 1.6, steel: 0.625, fairy: 0.390625 },
  dark: { fighting: 0.625, psychic: 1.6, ghost: 1.6, dark: 0.625, fairy: 0.625 },
  steel: { fire: 0.625, water: 0.625, electric: 0.625, ice: 1.6, rock: 1.6, steel: 0.625, fairy: 1.6 },
  fairy: { fire: 0.625, fighting: 1.6, poison: 0.625, dragon: 1.6, dark: 1.6, steel: 0.625 }
};

// --- 所有屬性列表 ---
export const allTypes = Object.keys(typeChart);

// --- 屬性中文名稱 ---
export const typeNames: Record<string, string> = {
  normal: "一般", fire: "火", water: "水", electric: "電", grass: "草",
  ice: "冰", fighting: "格鬥", poison: "毒", ground: "地面", flying: "飛行",
  psychic: "超能", bug: "蟲", rock: "岩石", ghost: "幽靈", dragon: "龍",
  dark: "惡", steel: "鋼", fairy: "妖精"
};
