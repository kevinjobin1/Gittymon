import fs from 'fs';
import path from 'path';
import { DEFAULT_LEADERBOARD, sortAndTruncateLeaderboard } from '../shared/leaderboard.js';
import type { LeaderboardEntry } from '../shared/types.js';

const LEADERBOARD_FILE = path.join(process.cwd(), 'leaderboard.json');

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

  const topLeaderboard = sortAndTruncateLeaderboard(leaderboard);

  saveLeaderboard(topLeaderboard);
  return topLeaderboard;
}
