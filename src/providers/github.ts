import type { IProfileProvider, ProviderProfileData, GitProvider } from './types';

export class GitHubProvider implements IProfileProvider {
  readonly provider: GitProvider = 'github';

  async fetchProfile(username: string, _apiKey?: string): Promise<ProviderProfileData> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);

    try {
      const response = await fetch(`https://api.github.com/users/${username}`, {
        headers: { 'User-Agent': 'RoastMonGameboyApplet' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json() as Record<string, unknown>;
        return {
          name: (data.name as string) || username,
          publicRepos: (data.public_repos as number) ?? 10,
          followers: (data.followers as number) ?? 2,
          location: (data.location as string) || 'Unknown Coordinates',
          joinedYear: data.created_at
            ? new Date(data.created_at as string).getFullYear().toString()
            : '2021',
          bio: (data.bio as string) || 'Code without comments, coffee without milk.',
          avatarUrl: (data.avatar_url as string) || `https://github.com/${username}.png`,
          provider: 'github',
          fromFallback: false,
        };
      } else if (response.status === 404) {
        clearTimeout(timeoutId);
        return {
          name: username,
          publicRepos: 0,
          followers: 0,
          location: 'Unknown',
          joinedYear: '2022',
          bio: 'User not found on GitHub.',
          avatarUrl: `https://github.com/${username}.png`,
          provider: 'github',
          fromFallback: true,
          warning: `GitHub user "${username}" not found (404). Using estimated stats.`,
        };
      }
    } catch (err) {
      console.warn('GitHub API error, using fallback:', err);
    } finally {
      clearTimeout(timeoutId);
    }

    // Fallback data — API timed out or returned an error
    return {
      name: username,
      publicRepos: 12,
      followers: 4,
      location: 'Internet Wilderness',
      joinedYear: '2022',
      bio: 'A mysterious code crafter.',
      avatarUrl: `https://github.com/${username}.png`,
      provider: 'github',
      fromFallback: true,
      warning: 'GitHub API unavailable. Using estimated stats from backup data.',
    };
  }

  getAvatarUrl(username: string, profileData?: ProviderProfileData): string {
    if (profileData?.avatarUrl) return profileData.avatarUrl;
    return `https://github.com/${username}.png`;
  }

  sanitizeUsername(username: string): string {
    return username.replace(/[^a-zA-Z0-9-]/g, '');
  }

  parseUsername(input: string): { username: string; provider: GitProvider } | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    let raw = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;

    // Extract from GitHub URL
    const githubMatch = raw.match(
      /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9-]+)/,
    );
    if (githubMatch) {
      return { username: githubMatch[1], provider: 'github' };
    }

    // Validate — GitHub only allows alphanumeric + hyphens
    if (!/^[a-zA-Z0-9-]+$/.test(raw)) return null;

    return { username: raw, provider: 'github' };
  }
}
