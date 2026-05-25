import fs from 'fs';
import path from 'path';

export interface LeaderboardEntry {
  username: string;
  monName: string;
  level: number;
  wins: number;
  losses: number;
  avatarUrl: string;
}

const LEADERBOARD_FILE = path.join(process.cwd(), 'leaderboard.json');

// Initialize leaderboard with hilarious fictional legends
const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  {
    username: 'SteveWoz',
    monName: 'WozniakPascal',
    level: 99,
    wins: 142,
    losses: 4,
    avatarUrl: 'https://github.com/woz.png',
  },
  {
    username: 'LinusTorvalds',
    monName: 'LinuxDromad',
    level: 96,
    wins: 125,
    losses: 8,
    avatarUrl: 'https://github.com/torvalds.png',
  },
  {
    username: 'AdaLovelace',
    monName: 'BernoulliFlyer',
    level: 95,
    wins: 96,
    losses: 2,
    avatarUrl: 'https://github.com/ada.png',
  },
  {
    username: 'MargaretHamilton',
    monName: 'ApolloStack',
    level: 92,
    wins: 89,
    losses: 0,
    avatarUrl: 'https://github.com/margaret.png',
  },
  {
    username: 'JamesGosling',
    monName: 'KoffeeSlime',
    level: 85,
    wins: 72,
    losses: 14,
    avatarUrl: 'https://github.com/gosling.png',
  }
];

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      const content = fs.readFileSync(LEADERBOARD_FILE, 'utf-8');
      return JSON.parse(content);
    } else {
      saveLeaderboard(DEFAULT_LEADERBOARD);
      return DEFAULT_LEADERBOARD;
    }
  } catch (error) {
    console.error('Failed to read leaderboard file, falling back to defaults:', error);
    return DEFAULT_LEADERBOARD;
  }
}

export function saveLeaderboard(entries: LeaderboardEntry[]): void {
  try {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(entries, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write leaderboard file:', error);
  }
}

export function recordMatchResult(
  winner: { username: string; monName: string; level: number; avatarUrl: string },
  loser: { username: string; monName: string; level: number; avatarUrl: string }
): LeaderboardEntry[] {
  const leaderboard = loadLeaderboard();

  // Helper to find or create entry
  const getOrCreateEntry = (username: string, monName: string, level: number, avatarUrl: string) => {
    let entry = leaderboard.find(e => e.username.toLowerCase() === username.toLowerCase());
    if (!entry) {
      entry = {
        username,
        monName,
        level,
        wins: 0,
        losses: 0,
        avatarUrl: avatarUrl || `https://github.com/${username}.png`,
      };
      leaderboard.push(entry);
    } else {
      // Keep name/level and avatar updated
      entry.monName = monName;
      entry.level = Math.max(entry.level, level);
      if (avatarUrl) entry.avatarUrl = avatarUrl;
    }
    return entry;
  };

  const winEntry = getOrCreateEntry(winner.username, winner.monName, winner.level, winner.avatarUrl);
  winEntry.wins += 1;

  const loseEntry = getOrCreateEntry(loser.username, loser.monName, loser.level, loser.avatarUrl);
  loseEntry.losses += 1;

  // Sort leaderboard by wins descending, then level descending
  leaderboard.sort((a, b) => b.wins - a.wins || b.level - a.level);

  // Truncate to top 50
  const topLeaderboard = leaderboard.slice(0, 50);

  saveLeaderboard(topLeaderboard);
  return topLeaderboard;
}
