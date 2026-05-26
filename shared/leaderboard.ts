import type { LeaderboardEntry } from './types';

export const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { username: 'SteveWoz', provider: 'github', monName: 'WozniakPascal', level: 99, wins: 142, losses: 4, avatarUrl: 'https://github.com/woz.png' },
  { username: 'LinusTorvalds', provider: 'github', monName: 'LinuxDromad', level: 96, wins: 125, losses: 8, avatarUrl: 'https://github.com/torvalds.png' },
  { username: 'AdaLovelace', provider: 'github', monName: 'BernoulliFlyer', level: 95, wins: 96, losses: 2, avatarUrl: 'https://github.com/ada.png' },
  { username: 'MargaretHamilton', provider: 'github', monName: 'ApolloStack', level: 92, wins: 89, losses: 0, avatarUrl: 'https://github.com/margaret.png' },
  { username: 'JamesGosling', provider: 'github', monName: 'KoffeeSlime', level: 85, wins: 72, losses: 14, avatarUrl: 'https://github.com/gosling.png' },
];

export function sortAndTruncateLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return entries
    .sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses) || b.level - a.level)
    .slice(0, 50);
}

export function findOrCreateEntry(
  leaderboard: LeaderboardEntry[],
  username: string,
  monName: string,
  level: number,
  avatarUrl: string,
  provider: 'github' | 'gitlab' = 'github',
): LeaderboardEntry {
  const entryKey = (u: string, p: string) => `${p}:${u}`.toLowerCase();
  const key = entryKey(username, provider);
  let entry = leaderboard.find(e => entryKey(e.username, e.provider) === key);
  if (!entry) {
    entry = { username, provider, monName, level, wins: 0, losses: 0, avatarUrl: avatarUrl || `https://github.com/${username}.png` };
    leaderboard.push(entry);
  } else {
    entry.monName = monName;
    entry.level = Math.max(entry.level, level);
    if (avatarUrl) entry.avatarUrl = avatarUrl;
  }
  return entry;
}
