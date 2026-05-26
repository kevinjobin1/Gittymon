export interface Stats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  chaos: number;
}

interface Move {
  name: string;
  power: number;
  desc: string;
}

export interface RoastMon {
  username: string;
  name: string;
  avatarUrl: string;
  type: string;
  level: number;
  bio: string;
  roast: string;
  stats: Stats;
  moves: Move[];
  joinedYear: string;
  publicRepos: number;
  followers: number;
  location: string;
  spriteSeed: string;
}

export interface GithubData {
  name: string;
  public_repos: number;
  followers: number;
  location: string;
  joinedYear: string;
  bio: string;
  avatar_url: string;
}

export { type LeaderboardEntry } from '../shared/types';

export interface PlayerSession {
  ws: WebSocket;
  username: string;
  mon: RoastMon | null;
  status: 'idle' | 'searching' | 'battling';
  roomId: string | null;
  pNumber: number;
}

interface RoomPlayer {
  username: string;
  mon: RoastMon;
  hp: number;
  maxHp: number;
  ws: WebSocket | null;
  action: { action: string; moveIndex: number } | null;
}

export interface RoomState {
  roomId: string;
  isAiMatch: boolean;
  p1: RoomPlayer;
  p2: RoomPlayer;
  turn: number;
}

export interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
}

type PvpAction = 'MOVE' | 'HEAL' | 'SPIT_ROAST';

interface PvpTurnAction {
  action: PvpAction;
  moveIndex?: number;
}

export interface WebSocketMessage {
  type: 'register' | 'start_matchmaking' | 'cancel_searching' | 'submit_pvp_action' | 'forfeit_match' | 'lobby_update' | 'match_found' | 'pvp_turn_result' | 'error';
  username?: string;
  mon?: RoastMon;
  roomId?: string;
  action?: PvpAction;
  moveIndex?: number;
  message?: string;
  onlineCount?: number;
  idlePlayers?: string[];
  opponent?: RoastMon;
  opponentName?: string;
  isAi?: boolean;
  logs?: string[];
  p1HP?: number;
  p2HP?: number;
  isOver?: boolean;
  winnerNickname?: string;
  pNumber?: number;
}

export interface AiBossCommentRequest {
  username: string;
  monName?: string;
  stats?: Stats;
  action?: string;
  bossHP?: number;
}

export interface BadgeResponse {
  schemaVersion: 1;
  label: string;
  message: string;
  color: string;
  namedLogo: string;
  logoColor: string;
}

interface LobbyUpdatePayload {
  type: 'lobby_update';
  onlineCount: number;
  idlePlayers: string[];
}

interface MatchFoundPayload {
  type: 'match_found';
  roomId: string;
  pNumber: number;
  opponent: RoastMon;
  opponentName: string;
  isAi: boolean;
}

export interface SummonCacheEntry {
  username: string;
  resultMon: RoastMon;
  generatedAt: string;
}

export type ScreenID = 'SPLASH' | 'SUMMONING' | 'HUB' | 'DETAILS' | 'BATTLE' | 'HISTORY' | 'LEADERBOARD' | 'PVP_LOBBY' | 'PVP_BATTLE' | 'AI_BOSS_BATTLE' | 'EXPORT_EMBED' | 'COLLECTION' | 'COMPARE';

export interface BattleState {
  playerHP: number;
  playerMaxHP: number;
  enemyName: string;
  enemyHP: number;
  enemyMaxHP: number;
  enemyLevel: number;
  enemySpriteSeed: string;
  logs: string[];
  isOver: boolean;
  result?: 'WIN' | 'LOSE' | 'RUN';
}

// === v2 Identity Card System Types ===

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'glitched';

export interface Mutation {
  id: string;
  label: string;
  effect: string;
}

export interface CardForm {
  name: string;
  variant: string;
}

export interface GittymonCard {
  id: string;
  base: RoastMon;
  rarity: Rarity;
  form: CardForm;
  mutations: Mutation[];
  rerollCount: number;
  evolutionTier: number;
  isFavorite: boolean;
  createdAt: number;
}

export interface UserIdentity {
  username: string;
  cards: GittymonCard[];
  favoriteCardId: string | null;
  totalRerolls: number;
  createdAt: number;
  lastVisitedAt: number;
}

export interface Env {
  LEADERBOARD: KVNamespace;
  SUMMON_CACHE: KVNamespace;
  GAME_SERVER: DurableObjectNamespace;
  GROQ_API_KEY?: string;
  ASSETS: Fetcher;
  REVALIDATE_KEY?: string;
}
