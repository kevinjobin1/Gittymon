/* ------------------------------------------------------------------ */
/*  Shared types — used by both server (Express/Node) and Worker (CF) */
/* ------------------------------------------------------------------ */

export interface LeaderboardEntry {
  username: string;
  monName: string;
  level: number;
  wins: number;
  losses: number;
  avatarUrl: string;
}

export interface ServerSpriteResult {
  grid: number[][];
  palette: [string, string, string, string];
}

export interface CardStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  chaos: number;
}

export interface CardMove {
  name: string;
  power: number;
  desc: string;
}
