import { LeaderboardEntry } from './types';
import type { GitProvider } from '../shared/types';
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
  winner: { username: string; monName: string; level: number; avatarUrl: string; provider: GitProvider },
  loser: { username: string; monName: string; level: number; avatarUrl: string; provider: GitProvider }
): Promise<LeaderboardEntry[]> {
  const leaderboard = await loadLeaderboard(kv);

  const entryKey = (username: string, provider: GitProvider) => `${provider}:${username}`.toLowerCase();

  const getOrCreateEntry = (username: string, monName: string, level: number, avatarUrl: string, provider: GitProvider) => {
    const key = entryKey(username, provider);
    let entry = leaderboard.find(e => entryKey(e.username, e.provider) === key);
    if (!entry) {
      entry = { username, provider, monName, level, wins: 0, losses: 0, avatarUrl };
      leaderboard.push(entry);
    } else {
      entry.monName = monName;
      entry.level = Math.max(entry.level, level);
      if (avatarUrl) entry.avatarUrl = avatarUrl;
    }
    return entry;
  };

  const winEntry = getOrCreateEntry(winner.username, winner.monName, winner.level, winner.avatarUrl, winner.provider);
  winEntry.wins += 1;

  const loseEntry = getOrCreateEntry(loser.username, loser.monName, loser.level, loser.avatarUrl, loser.provider);
  loseEntry.losses += 1;

  const top = sortAndTruncateLeaderboard(leaderboard);
  await saveLeaderboard(kv, top);
  return top;
}
