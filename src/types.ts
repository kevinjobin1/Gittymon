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

export interface LeaderboardEntry {
  username: string;
  monName: string;
  level: number;
  wins: number;
  losses: number;
  avatarUrl: string;
}

export interface PlayerSession {
  ws: WebSocket;
  username: string;
  mon: any;
  status: 'idle' | 'searching' | 'battling';
  roomId: string | null;
  pNumber: number;
}

export interface RoomState {
  roomId: string;
  isAiMatch: boolean;
  p1: {
    username: string;
    mon: any;
    hp: number;
    maxHp: number;
    ws: WebSocket | null;
    action: { action: string; moveIndex: number } | null;
  };
  p2: {
    username: string;
    mon: any;
    hp: number;
    maxHp: number;
    ws: WebSocket | null;
    action: { action: string; moveIndex: number } | null;
  };
  turn: number;
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
}
