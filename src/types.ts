export interface Stats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  chaos: number;
}

export interface Move {
  name: string;
  power: number;
  desc: string;
}

export interface RoastMon {
  username: string;
  provider: 'github' | 'gitlab';
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
  /** Whether the API profile fetch fell back to defaults; set server-side */
  _fallback?: boolean;
  /** Human-readable reason for fallback */
  _fallbackMessage?: string;
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

export interface RoomPlayer {
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

export type PvpAction = 'MOVE' | 'HEAL' | 'SPIT_ROAST';

export interface PvpTurnAction {
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

export interface LobbyUpdatePayload {
  type: 'lobby_update';
  onlineCount: number;
  idlePlayers: string[];
}

export interface MatchFoundPayload {
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

export type ScreenID = 'SPLASH' | 'SUMMONING' | 'HUB' | 'DETAILS' | 'BATTLE' | 'HISTORY' | 'LEADERBOARD' | 'PVP_LOBBY' | 'PVP_BATTLE' | 'AI_BOSS_BATTLE' | 'EXPORT_EMBED';

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

export interface Env {
  LEADERBOARD: KVNamespace;
  SUMMON_CACHE: KVNamespace;
  GAME_SERVER: DurableObjectNamespace;
  GROQ_API_KEY?: string;
  GITLAB_API_KEY?: string;
}
