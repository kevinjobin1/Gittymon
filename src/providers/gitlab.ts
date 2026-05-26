import type { IProfileProvider, ProviderProfileData, GitProvider } from './types';

export class GitLabProvider implements IProfileProvider {
  readonly provider: GitProvider = 'gitlab';

  async fetchProfile(username: string, apiKey?: string): Promise<ProviderProfileData> {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['PRIVATE-TOKEN'] = apiKey;
    }

    // GitLab makes two sequential API calls (user lookup + projects), so use a longer timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      // Step 1: Look up user by username
      const userResp = await fetch(
        `https://gitlab.com/api/v4/users?username=${encodeURIComponent(username)}`,
        { headers, signal: controller.signal },
      );

      if (userResp.ok) {
        const users = await userResp.json() as Array<Record<string, unknown>>;
        if (users && users.length > 0) {
          const user = users[0];
          const userId = user.id as number;

          // Step 2: Fetch public projects count (separate API call)
          let publicRepos = 0;
          const projectsController = new AbortController();
          const projectsTimeout = setTimeout(() => projectsController.abort(), 2500);
          try {
            const projectsResp = await fetch(
              `https://gitlab.com/api/v4/users/${userId}/projects?visibility=public&per_page=100`,
              { headers, signal: projectsController.signal },
            );
            if (projectsResp.ok) {
              const projects = await projectsResp.json() as Array<unknown>;
              publicRepos = projects.length;
            }
          } catch (projectsErr) {
            console.warn('GitLab projects API error, using fallback count:', projectsErr);
          } finally {
            clearTimeout(projectsTimeout);
          }

          return {
            name: (user.name as string) || username,
            publicRepos,
            followers: (user.followers as number) ?? 0,
            location: (user.location as string) || 'Unknown Coordinates',
            joinedYear: user.created_at
              ? new Date(user.created_at as string).getFullYear().toString()
              : '2024',
            bio: (user.bio as string) || 'No bio set.',
            avatarUrl: (user.avatar_url as string) || `https://gitlab.com/uploads/-/system/user/avatar/${userId}/avatar.png`,
            provider: 'gitlab',
            fromFallback: false,
          };
        }
      } else if (userResp.status === 404) {
        clearTimeout(timeoutId);
        return {
          name: username,
          publicRepos: 0,
          followers: 0,
          location: 'Unknown',
          joinedYear: '2024',
          bio: 'User not found on GitLab.',
          avatarUrl: `https://gitlab.com/${username}`,
          provider: 'gitlab',
          fromFallback: true,
          warning: `GitLab user "${username}" not found (404). Using estimated stats.`,
        };
      }
    } catch (err) {
      console.warn('GitLab API error, using fallback:', err);
    } finally {
      clearTimeout(timeoutId);
    }

    // Fallback data — API timed out or returned an error
    return {
      name: username,
      publicRepos: Math.max(1, username.length),
      followers: 2,
      location: 'Internet Wilderness',
      joinedYear: '2024',
      bio: 'A mysterious code crafter.',
      avatarUrl: `https://gitlab.com/${username}`,
      provider: 'gitlab',
      fromFallback: true,
      warning: 'GitLab API unavailable. Using estimated stats from backup data.',
    };
  }

  getAvatarUrl(username: string, profileData?: ProviderProfileData): string {
    if (profileData?.avatarUrl) return profileData.avatarUrl;
    return `https://gitlab.com/${username}`;
  }

  sanitizeUsername(username: string): string {
    // GitLab allows alphanumeric, dots, underscores, and hyphens
    return username.replace(/[^a-zA-Z0-9._-]/g, '');
  }

  parseUsername(input: string): { username: string; provider: GitProvider } | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    let raw = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;

    // Extract from GitLab URL
    const gitlabMatch = raw.match(
      /(?:https?:\/\/)?(?:www\.)?gitlab\.com\/([a-zA-Z0-9._-]+)/,
    );
    if (gitlabMatch) {
      return { username: gitlabMatch[1], provider: 'gitlab' };
    }

    // Validate — GitLab allows alphanumeric, dots, underscores, hyphens
    if (!/^[a-zA-Z0-9._-]+$/.test(raw)) return null;

    return { username: raw, provider: 'gitlab' };
  }
}
