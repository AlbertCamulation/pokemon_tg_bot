// =========================================================
//  型別定義 (Type Definitions)
// =========================================================

// --- Cloudflare Workers 環境變數 ---
export interface Env {
  POKEMON_KV: KVNamespace;
  // Google OAuth
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  // 逗號分隔的允許登入 email 白名單；留空 = 任何人皆可登入
  ALLOWED_EMAILS?: string;
}

// --- 寶可夢資料型別 ---
export interface PokemonFamily {
  id: string;
  evolutions?: string[];
}

export interface PokemonData {
  speciesId: string;
  speciesName: string;
  types: string[];
  family?: PokemonFamily;
  eliteMoves?: string[];
}

export interface RankingPokemon {
  speciesId: string;
  speciesName?: string;
  rank?: number;
  tier?: string;
  rating?: number;
  score?: number;
  moveset?: string[];
  moveFast?: string;
  moveCharged?: string | string[];
  cp?: number;
}

export interface League {
  command: string;
  name: string;
  cp: string;
  path: string;
}

export interface ActiveLeague {
  name: string;
  path: string;
  command: string;
  cp: string;
}

// --- 搜尋結果型別 ---
export interface EvolutionChainItem {
  name: string;
  id: string;
  types: string[];
}

export interface LeaguePokemonResult {
  rank: number | string;
  name: string;
  types: string[];
  score: string;
  rating: string;
  moves: string;
  elite: boolean;
}

export interface LeagueResult {
  leagueId: string;
  leagueName: string;
  cp: string;
  pokemons: LeaguePokemonResult[];
}

export interface EventInfo {
  eventName: string;
  date: string;
  link: string;
  pokemonId?: string[];
}

export interface SearchResult {
  query: string;
  evolutionChain: EvolutionChainItem[];
  results: LeagueResult[];
  events: EventInfo[];
  conclusion: number[];
  hasEliteWarning: boolean;
}

// --- 排行榜 / Meta 型別 ---
export interface RankingEntry {
  rank: number;
  name: string;
  copyName: string;
  types: string[];
  score: string;
  rating: string;
  cp?: number;
  moves: string;
}

export interface TeamMember {
  rank: number;
  name: string;
  copyName: string;
  types: string[];
  score: string;
}

export interface MetaAnalysis {
  leagueId: string;
  leagueName: string;
  core: TeamMember;
  teamViolence: TeamMember[];
  teamBalanced: TeamMember[];
  teamAlternative: TeamMember[];
  copyString: string;
}

// --- 盒子隊伍分析型別 ---
export interface AnalyzedPokemon {
  speciesId: string;
  name: string;
  types: string[];
  rank: number;
  score: number;
  scoreIcon: string;
  moves: string;
  isFav: boolean;
  lowRank: boolean;
}

export interface TrioResult {
  members: AnalyzedPokemon[];
  sharedWeaks: string[];
  copyString: string;
}

export interface BoxAnalysis {
  leagueName: string;
  bestTrio: TrioResult;
  favTrio: TrioResult | null;
  favSameAsBest: boolean;
  favCount: number;
  garbage: string[];
  error?: string;
}

// --- 屬性相剋表型別 ---
export type TypeMultiplier = Record<string, number>;
export type TypeChart = Record<string, TypeMultiplier>;

export interface TypeMatchEntry {
  type: string;
  name: string;
  multiplier: number;
}

export interface TypeQueryResult {
  type: string;
  name: string;
  mode: 'atk' | 'def';
  superEffective: TypeMatchEntry[];  // atk: 效果絕佳 / def: 弱點
  resist: TypeMatchEntry[];          // 抗性
  immune: TypeMatchEntry[];          // 雙抗/無效
}

// --- 登入 / Session 型別 ---
export interface SessionData {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

// --- 招式資料型別 ---
export type MovesMap = Record<string, string>; // { [moveId]: moveName }
