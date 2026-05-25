export interface MonStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  chaos: number;
}

export interface MonMove {
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
  stats: MonStats;
  moves: MonMove[];
  joinedYear: string;
  publicRepos: number;
  followers: number;
  location: string;
  spriteSeed: string; // Used to procedurally generate a custom 8-bit visual monster
}

export type ScreenID =
  | 'SPLASH'
  | 'HUB'
  | 'SUMMONING'
  | 'DETAILS'
  | 'BATTLE'
  | 'PVP_LOBBY'
  | 'PVP_BATTLE'
  | 'AI_BOSS_BATTLE'
  | 'LEADERBOARD'
  | 'EXPORT_EMBED'
  | 'HISTORY';

export interface LeaderboardEntry {
  username: string;
  monName: string;
  level: number;
  wins: number;
  losses: number;
  avatarUrl: string;
}

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
