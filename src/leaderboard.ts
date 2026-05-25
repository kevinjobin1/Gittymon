import { LeaderboardEntry } from './types';

const LEADERBOARD_KEY = 'leaderboard_data';

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { username: 'SteveWoz', monName: 'WozniakPascal', level: 99, wins: 142, losses: 4, avatarUrl: 'https://github.com/woz.png' },
  { username: 'LinusTorvalds', monName: 'LinuxDromad', level: 96, wins: 125, losses: 8, avatarUrl: 'https://github.com/torvalds.png' },
  { username: 'AdaLovelace', monName: 'BernoulliFlyer', level: 95, wins: 96, losses: 2, avatarUrl: 'https://github.com/ada.png' },
  { username: 'MargaretHamilton', monName: 'ApolloStack', level: 92, wins: 89, losses: 0, avatarUrl: 'https://github.com/margaret.png' },
  { username: 'JamesGosling', monName: 'KoffeeSlime', level: 85, wins: 72, losses: 14, avatarUrl: 'https://github.com/gosling.png' },
];

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

  const getOrCreateEntry = (username: string, monName: string, level: number, avatarUrl: string) => {
    let entry = leaderboard.find(e => e.username.toLowerCase() === username.toLowerCase());
    if (!entry) {
      entry = { username, monName, level, wins: 0, losses: 0, avatarUrl: avatarUrl || `https://github.com/${username}.png` };
      leaderboard.push(entry);
    } else {
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

  leaderboard.sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses) || b.level - a.level);
  const top = leaderboard.slice(0, 50);
  await saveLeaderboard(kv, top);
  return top;
}
