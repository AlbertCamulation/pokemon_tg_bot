// =========================================================
//  型別定義 (Type Definitions)
// =========================================================

// --- Cloudflare Workers 環境變數 ---
export interface Env {
  POKEMON_KV: KVNamespace;
  ENV_BOT_TOKEN: string;
  ENV_BOT_SECRET: string;
  ADMIN_UID: string;
  ADMIN_GROUP_UID?: string;
}

// --- Telegram API 型別 ---
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  is_bot?: boolean;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  reply_to_message?: TelegramMessage;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramSendMessageResponse {
  ok: boolean;
  result?: TelegramMessage;
  description?: string;
}

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface SendMessageOptions {
  inline_keyboard?: TelegramInlineKeyboardButton[][];
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
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
}

export interface LeagueResult {
  leagueId: string;
  leagueName: string;
  pokemons: LeaguePokemonResult[];
}

export interface PvPValue {
  pokemon: string;
  pokemonId: string;
  league: string;
  leagueCp: number;
  rank: number;
  score: number;
  isShadow: boolean;
  isEvolution: boolean;
}

export interface EventInfo {
  eventName: string;
  date: string;
  raw_time?: string;
  link: string;
  pokemonId?: string[];
  pvpValue?: PvPValue[];
}

export interface SearchResult {
  evolutionChain: EvolutionChainItem[];
  results: LeagueResult[];
  events: EventInfo[];
  allLeagues: { id: string; name: string }[];
  hasEliteWarning: boolean;
  typeChart: TypeChart;
}

// --- 屬性相剋表型別 ---
export type TypeMultiplier = Record<string, number>;
export type TypeChart = Record<string, TypeMultiplier>;

// --- KV 存儲型別 ---
export type BannedUsersMap = Record<string, string>; // { [uid]: userName }

// --- 招式資料型別 ---
export type MovesMap = Record<string, string>; // { [moveId]: moveName }
