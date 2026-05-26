import { LeaderboardEntry } from './types';
import { DEFAULT_LEADERBOARD, sortAndTruncateLeaderboard } from '../shared/leaderboard';

const LEADERBOARD_KEY = 'leaderboard_data';

export async function loadLeaderboard(kv: KVNamespace): Promise<LeaderboardEntry[]> {
  try {
    const content = await kv.get(LEADERBOARD_KEY);
    if (content) return JSON.parse(content);
  } catch (e) {
    console.error('Failed to read leaderboard from KV:', e);
  }
  await saveLeaderboard(kv, DEFAULT_LEADERBOARD);
  return DEFAULT_LEADERBOARD;
}

export async function saveLeaderboard(kv: KVNamespace, entries: LeaderboardEntry[]): Promise<void> {
  try {
    await kv.put(LEADERBOARD_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to write leaderboard to KV:', e);
  }
}

export async function recordMatchResult(
  kv: KVNamespace,
  winner: { username: string; monName: string; level: number; avatarUrl: string },
  loser: { username: string; monName: string; level: number; avatarUrl: string }
): Promise<LeaderboardEntry[]> {
  const leaderboard = await loadLeaderboard(kv);

  const now = new Date().toISOString();

  const getOrCreateEntry = (username: string, monName: string, level: number, avatarUrl: string) => {
    let entry = leaderboard.find(e => e.username.toLowerCase() === username.toLowerCase());
    if (!entry) {
      entry = { username, monName, level, wins: 0, losses: 0, avatarUrl: avatarUrl || `https://github.com/${username}.png`, lastBattledAt: now };
      leaderboard.push(entry);
    } else {
      entry.monName = monName;
      entry.level = Math.max(entry.level, level);
      if (avatarUrl) entry.avatarUrl = avatarUrl;
      entry.lastBattledAt = now;
    }
    return entry;
  };

  const winEntry = getOrCreateEntry(winner.username, winner.monName, winner.level, winner.avatarUrl);
  winEntry.wins += 1;

  const loseEntry = getOrCreateEntry(loser.username, loser.monName, loser.level, loser.avatarUrl);
  loseEntry.losses += 1;

  const top = sortAndTruncateLeaderboard(leaderboard);
  await saveLeaderboard(kv, top);
  return top;
}
