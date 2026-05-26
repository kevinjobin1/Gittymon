import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitHubProvider } from './github';
import { GitLabProvider } from './gitlab';
import { getProvider, detectProvider, parseProviderInput } from './index';

// =====================================================================
//  Mock helpers
// =====================================================================

let mockFetchResponses: Map<string, { ok: boolean; status: number; json: unknown; statusText?: string }>;

function mockFetch(url: string | URL | Request, ..._args: unknown[]) {
  const urlStr = typeof url === 'string' ? url : url.toString();
  const match = mockFetchResponses.get(urlStr);
  if (match) {
    return Promise.resolve({
      ok: match.ok,
      status: match.status,
      statusText: match.statusText ?? '',
      json: () => Promise.resolve(match.json),
    } as Response);
  }
  // Pattern match: check for partial URL match
  for (const [pattern, resp] of mockFetchResponses) {
    if (urlStr.includes(pattern)) {
      return Promise.resolve({
        ok: resp.ok,
        status: resp.status,
        statusText: resp.statusText ?? '',
        json: () => Promise.resolve(resp.json),
      } as Response);
    }
  }
  return Promise.reject(new Error(`Unexpected fetch: ${urlStr}`));
}

function setupFetch() {
  mockFetchResponses = new Map();
  vi.stubGlobal('fetch', vi.fn(mockFetch));
}

// =====================================================================
//  GitHubProvider
// =====================================================================

describe('GitHubProvider', () => {
  let provider: GitHubProvider;

  beforeEach(() => {
    provider = new GitHubProvider();
    vi.useFakeTimers();
    setupFetch();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // ---- fetchProfile ----

  describe('fetchProfile', () => {
    it('returns profile data on successful API response', async () => {
      mockFetchResponses.set('https://api.github.com/users/octocat', {
        ok: true,
        status: 200,
        json: {
          name: 'Mona Lisa',
          public_repos: 42,
          followers: 100,
          location: 'San Francisco',
          created_at: '2011-01-25T18:44:36Z',
          bio: 'A developer',
          avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
        },
      });

      const result = await provider.fetchProfile('octocat');

      expect(result.name).toBe('Mona Lisa');
      expect(result.publicRepos).toBe(42);
      expect(result.followers).toBe(100);
      expect(result.location).toBe('San Francisco');
      expect(result.joinedYear).toBe('2011');
      expect(result.bio).toBe('A developer');
      expect(result.avatarUrl).toBe('https://avatars.githubusercontent.com/u/1?v=4');
      expect(result.provider).toBe('github');
      expect(result.fromFallback).toBe(false);
    });

    it('returns fallback on 404 with specific warning', async () => {
      mockFetchResponses.set('https://api.github.com/users/nonexistent', {
        ok: false,
        status: 404,
        json: { message: 'Not Found' },
      });

      const result = await provider.fetchProfile('nonexistent');

      expect(result.fromFallback).toBe(true);
      expect(result.warning).toContain('not found (404)');
      expect(result.publicRepos).toBe(0);
      expect(result.followers).toBe(0);
      expect(result.bio).toBe('User not found on GitHub.');
    });

    it('returns fallback on network error', async () => {
      mockFetchResponses.set('https://api.github.com/users/erroruser', {
        ok: false,
        status: 500,
        json: {},
      });

      const result = await provider.fetchProfile('erroruser');

      expect(result.fromFallback).toBe(true);
      expect(result.warning).toContain('API unavailable');
      expect(result.publicRepos).toBe(12);
      expect(result.followers).toBe(4);
      expect(result.location).toBe('Internet Wilderness');
    });

    it('returns fallback on fetch rejection (timeout / network down)', async () => {
      // Don't add any mock — fetch will reject with "Unexpected fetch"
      // Actually, let's simulate a rejected fetch by not setting a response
      // for a specific URL. The mockFetch function rejects with "Unexpected fetch"
      // when no match is found.
      mockFetchResponses.set('https://api.github.com/users/ghost', {
        ok: true,
        status: 200,
        json: { name: 'Ghost' },
      });
      // Clear it so no response is available
      mockFetchResponses.delete('https://api.github.com/users/ghost');

      const result = await provider.fetchProfile('ghost');

      expect(result.fromFallback).toBe(true);
      expect(result.warning).toContain('API unavailable');
    });

    it('handles missing optional fields in API response', async () => {
      mockFetchResponses.set('https://api.github.com/users/minimal', {
        ok: true,
        status: 200,
        json: { name: null, public_repos: null, followers: null, location: null, bio: null },
      });

      const result = await provider.fetchProfile('minimal');

      expect(result.name).toBe('minimal'); // falls back to username
      expect(result.publicRepos).toBe(10); // default
      expect(result.followers).toBe(2); // default
      expect(result.location).toBe('Unknown Coordinates'); // default
      expect(result.bio).toBe('Code without comments, coffee without milk.'); // default
      expect(result.joinedYear).toBe('2021'); // default when created_at is missing
      expect(result.fromFallback).toBe(false);
    });
  });

  // ---- sanitizeUsername ----

  describe('sanitizeUsername', () => {
    it('preserves alphanumeric characters and hyphens', () => {
      expect(provider.sanitizeUsername('octocat')).toBe('octocat');
      expect(provider.sanitizeUsername('my-user-name')).toBe('my-user-name');
      expect(provider.sanitizeUsername('user123')).toBe('user123');
    });

    it('strips dots and underscores', () => {
      expect(provider.sanitizeUsername('kevin.jobin')).toBe('kevinjobin');
      expect(provider.sanitizeUsername('hello_world')).toBe('helloworld');
      expect(provider.sanitizeUsername('dot.underscore_')).toBe('dotunderscore');
    });

    it('strips special characters', () => {
      expect(provider.sanitizeUsername('user@name!')).toBe('username');
      expect(provider.sanitizeUsername('sp ace')).toBe('space');
      expect(provider.sanitizeUsername('emoji😀')).toBe('emoji');
    });

    it('returns empty string for all-invalid input', () => {
      expect(provider.sanitizeUsername('!!!')).toBe('');
      expect(provider.sanitizeUsername('@#$%')).toBe('');
    });

    it('handles empty string', () => {
      expect(provider.sanitizeUsername('')).toBe('');
    });
  });

  // ---- getAvatarUrl ----

  describe('getAvatarUrl', () => {
    it('returns profile avatar URL when profile data is provided', () => {
      const url = provider.getAvatarUrl('octocat', {
        name: 'Test',
        publicRepos: 10,
        followers: 5,
        location: 'Earth',
        joinedYear: '2020',
        bio: 'Bio',
        avatarUrl: 'https://custom.avatar/me.png',
        provider: 'github',
        fromFallback: false,
      });
      expect(url).toBe('https://custom.avatar/me.png');
    });

    it('falls back to github.com/username.png when no profile data', () => {
      const url = provider.getAvatarUrl('octocat');
      expect(url).toBe('https://github.com/octocat.png');
    });

    it('falls back to github.com/username when avatarUrl is empty in profile data', () => {
      const url = provider.getAvatarUrl('octocat', {
        name: 'Test',
        publicRepos: 10,
        followers: 5,
        location: 'Earth',
        joinedYear: '2020',
        bio: 'Bio',
        avatarUrl: '',
        provider: 'github',
        fromFallback: false,
      });
      // Empty string is falsy — falls back to default
      expect(url).toBe('https://github.com/octocat.png');
    });
  });

  // ---- parseUsername ----

  describe('parseUsername', () => {
    it('parses a plain username', () => {
      const result = provider.parseUsername('octocat');
      expect(result).toEqual({ username: 'octocat', provider: 'github' });
    });

    it('parses an @mention', () => {
      const result = provider.parseUsername('@octocat');
      expect(result).toEqual({ username: 'octocat', provider: 'github' });
    });

    it('parses a GitHub profile URL', () => {
      const result = provider.parseUsername('https://github.com/octocat');
      expect(result).toEqual({ username: 'octocat', provider: 'github' });
    });

    it('parses a GitHub URL without protocol', () => {
      const result = provider.parseUsername('github.com/octocat');
      expect(result).toEqual({ username: 'octocat', provider: 'github' });
    });

    it('parses a GitHub URL with www', () => {
      const result = provider.parseUsername('https://www.github.com/octocat');
      expect(result).toEqual({ username: 'octocat', provider: 'github' });
    });

    it('returns null for input with dots (not a GitHub URL)', () => {
      const result = provider.parseUsername('kevin.jobin');
      expect(result).toBeNull();
    });

    it('returns null for input with underscores', () => {
      const result = provider.parseUsername('hello_world');
      expect(result).toBeNull();
    });

    it('returns null for empty input', () => {
      expect(provider.parseUsername('')).toBeNull();
      expect(provider.parseUsername('   ')).toBeNull();
    });

    it('returns null for input with space', () => {
      expect(provider.parseUsername('user name')).toBeNull();
    });

    it('trims leading/trailing whitespace', () => {
      const result = provider.parseUsername('  octocat  ');
      expect(result).toEqual({ username: 'octocat', provider: 'github' });
    });
  });
});

// =====================================================================
//  GitLabProvider
// =====================================================================

describe('GitLabProvider', () => {
  let provider: GitLabProvider;

  beforeEach(() => {
    provider = new GitLabProvider();
    vi.useFakeTimers();
    setupFetch();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // ---- fetchProfile ----

  describe('fetchProfile', () => {
    it('returns profile data on successful API response', async () => {
      // Step 1: User lookup
      mockFetchResponses.set('https://gitlab.com/api/v4/users?username=thejobin', {
        ok: true,
        status: 200,
        json: [
          {
            id: 12345,
            name: 'Kevin Jobin',
            followers: 42,
            location: 'Montreal',
            created_at: '2019-06-15T10:00:00Z',
            bio: 'GitLab enthusiast',
            avatar_url: 'https://gitlab.com/uploads/-/system/user/avatar/12345/avatar.png',
          },
        ],
      });
      // Step 2: Projects lookup
      mockFetchResponses.set('https://gitlab.com/api/v4/users/12345/projects?visibility=public&per_page=100', {
        ok: true,
        status: 200,
        json: [{ id: 1 }, { id: 2 }, { id: 3 }], // 3 public projects
      });

      const result = await provider.fetchProfile('thejobin');

      expect(result.name).toBe('Kevin Jobin');
      expect(result.publicRepos).toBe(3);
      expect(result.followers).toBe(42);
      expect(result.location).toBe('Montreal');
      expect(result.joinedYear).toBe('2019');
      expect(result.bio).toBe('GitLab enthusiast');
      expect(result.avatarUrl).toBe('https://gitlab.com/uploads/-/system/user/avatar/12345/avatar.png');
      expect(result.provider).toBe('gitlab');
      expect(result.fromFallback).toBe(false);
    });

    it('passes PRIVATE-TOKEN header when apiKey is provided', async () => {
      mockFetchResponses.set('https://gitlab.com/api/v4/users?username=thejobin', {
        ok: true,
        status: 200,
        json: [{ id: 12345, name: 'Kevin', followers: 10, location: 'Earth', created_at: '2020-01-01T00:00:00Z', bio: '', avatar_url: '' }],
      });
      mockFetchResponses.set('https://gitlab.com/api/v4/users/12345/projects?visibility=public&per_page=100', {
        ok: true,
        status: 200,
        json: [],
      });

      await provider.fetchProfile('thejobin', 'my-secret-token');

      // Verify the fetch was called with PRIVATE-TOKEN header
      const fetchCalls = (vi.mocked(fetch).mock.calls as [string, RequestInit][]);
      const userCall = fetchCalls.find(c => c[0].includes('users?username='));
      expect(userCall).toBeDefined();
      expect((userCall![1]?.headers as Record<string, string>)?.['PRIVATE-TOKEN']).toBe('my-secret-token');
    });

    it('handles empty user lookup (no matching user)', async () => {
      mockFetchResponses.set('https://gitlab.com/api/v4/users?username=ghost', {
        ok: true,
        status: 200,
        json: [], // empty array — no user found
      });

      const result = await provider.fetchProfile('ghost');

      expect(result.fromFallback).toBe(true);
      expect(result.warning).toContain('API unavailable');
      expect(result.publicRepos).toBeGreaterThanOrEqual(1);
    });

    it('returns fallback on 404', async () => {
      mockFetchResponses.set('https://gitlab.com/api/v4/users?username=nobody', {
        ok: false,
        status: 404,
        json: { message: 'Not Found' },
      });

      const result = await provider.fetchProfile('nobody');

      expect(result.fromFallback).toBe(true);
      expect(result.warning).toContain('not found (404)');
      expect(result.publicRepos).toBe(0);
      expect(result.followers).toBe(0);
      expect(result.bio).toBe('User not found on GitLab.');
    });

    it('returns fallback on network error', async () => {
      mockFetchResponses.set('https://gitlab.com/api/v4/users?username=erroruser', {
        ok: false,
        status: 500,
        json: {},
      });

      const result = await provider.fetchProfile('erroruser');

      expect(result.fromFallback).toBe(true);
      expect(result.warning).toContain('API unavailable');
    });

    it('returns profile even when projects API fails', async () => {
      mockFetchResponses.set('https://gitlab.com/api/v4/users?username=thejobin', {
        ok: true,
        status: 200,
        json: [{ id: 12345, name: 'Kevin', followers: 5, location: 'Earth', created_at: '2020-01-01T00:00:00Z', bio: 'Hi', avatar_url: '' }],
      });
      // Projects API fails
      mockFetchResponses.set('https://gitlab.com/api/v4/users/12345/projects?visibility=public&per_page=100', {
        ok: false,
        status: 500,
        json: {},
      });

      const result = await provider.fetchProfile('thejobin');

      expect(result.fromFallback).toBe(false); // user lookup succeeded
      expect(result.publicRepos).toBe(0); // default when projects API fails
      expect(result.name).toBe('Kevin');
    });

    it('handles rate-limit style empty response gracefully', async () => {
      mockFetchResponses.set('https://gitlab.com/api/v4/users?username=ratelimited', {
        ok: false,
        status: 429,
        json: { message: 'Too many requests' },
      });

      const result = await provider.fetchProfile('ratelimited');

      expect(result.fromFallback).toBe(true);
      expect(result.warning).toContain('API unavailable');
    });
  });

  // ---- sanitizeUsername ----

  describe('sanitizeUsername', () => {
    it('preserves alphanumeric, dots, underscores, and hyphens', () => {
      expect(provider.sanitizeUsername('kevin.jobin')).toBe('kevin.jobin');
      expect(provider.sanitizeUsername('hello_world')).toBe('hello_world');
      expect(provider.sanitizeUsername('my-user')).toBe('my-user');
      expect(provider.sanitizeUsername('user123')).toBe('user123');
    });

    it('strips special characters not in the allowed set', () => {
      expect(provider.sanitizeUsername('user@name!')).toBe('username');
      expect(provider.sanitizeUsername('sp ace')).toBe('space');
      expect(provider.sanitizeUsername('emoji😀')).toBe('emoji');
      expect(provider.sanitizeUsername('user#name$')).toBe('username');
    });

    it('returns empty string for all-invalid input', () => {
      expect(provider.sanitizeUsername('!!!')).toBe('');
      expect(provider.sanitizeUsername('@#$%')).toBe('');
    });

    it('handles empty string', () => {
      expect(provider.sanitizeUsername('')).toBe('');
    });
  });

  // ---- getAvatarUrl ----

  describe('getAvatarUrl', () => {
    it('returns profile avatar URL when profile data is provided', () => {
      const url = provider.getAvatarUrl('thejobin', {
        name: 'Test',
        publicRepos: 10,
        followers: 5,
        location: 'Earth',
        joinedYear: '2020',
        bio: 'Bio',
        avatarUrl: 'https://custom.avatar/me.png',
        provider: 'gitlab',
        fromFallback: false,
      });
      expect(url).toBe('https://custom.avatar/me.png');
    });

    it('falls back to gitlab.com/username when no profile data', () => {
      const url = provider.getAvatarUrl('thejobin');
      expect(url).toBe('https://gitlab.com/thejobin');
    });
  });

  // ---- parseUsername ----

  describe('parseUsername', () => {
    it('parses a plain username', () => {
      const result = provider.parseUsername('thejobin');
      expect(result).toEqual({ username: 'thejobin', provider: 'gitlab' });
    });

    it('parses an @mention', () => {
      const result = provider.parseUsername('@thejobin');
      expect(result).toEqual({ username: 'thejobin', provider: 'gitlab' });
    });

    it('parses a GitLab profile URL', () => {
      const result = provider.parseUsername('https://gitlab.com/thejobin');
      expect(result).toEqual({ username: 'thejobin', provider: 'gitlab' });
    });

    it('parses a GitLab URL without protocol', () => {
      const result = provider.parseUsername('gitlab.com/thejobin');
      expect(result).toEqual({ username: 'thejobin', provider: 'gitlab' });
    });

    it('parses a GitLab URL with www', () => {
      const result = provider.parseUsername('https://www.gitlab.com/thejobin');
      expect(result).toEqual({ username: 'thejobin', provider: 'gitlab' });
    });

    it('parses username with dots', () => {
      const result = provider.parseUsername('kevin.jobin');
      expect(result).toEqual({ username: 'kevin.jobin', provider: 'gitlab' });
    });

    it('parses username with underscores', () => {
      const result = provider.parseUsername('hello_world');
      expect(result).toEqual({ username: 'hello_world', provider: 'gitlab' });
    });

    it('returns null for empty input', () => {
      expect(provider.parseUsername('')).toBeNull();
      expect(provider.parseUsername('   ')).toBeNull();
    });

    it('returns null for input with special characters', () => {
      expect(provider.parseUsername('user@name')).toBeNull();
      expect(provider.parseUsername('sp ace')).toBeNull();
    });

    it('trims leading/trailing whitespace', () => {
      const result = provider.parseUsername('  thejobin  ');
      expect(result).toEqual({ username: 'thejobin', provider: 'gitlab' });
    });
  });
});

// =====================================================================
//  Provider Registry (getProvider, detectProvider, parseProviderInput)
// =====================================================================

describe('Provider Registry', () => {
  describe('getProvider', () => {
    it('returns a GitHubProvider for github type', () => {
      const p = getProvider('github');
      expect(p.provider).toBe('github');
      expect(p.sanitizeUsername('test.user')).toBe('testuser'); // GitHub strips dots
    });

    it('returns a GitLabProvider for gitlab type', () => {
      const p = getProvider('gitlab');
      expect(p.provider).toBe('gitlab');
      expect(p.sanitizeUsername('test.user')).toBe('test.user'); // GitLab preserves dots
    });
  });

  describe('detectProvider', () => {
    it('detects GitLab from gitlab.com URL', () => {
      const p = detectProvider('https://gitlab.com/thejobin');
      expect(p.provider).toBe('gitlab');
    });

    it('detects GitLab from URL without protocol', () => {
      const p = detectProvider('gitlab.com/thejobin');
      expect(p.provider).toBe('gitlab');
    });

    it('detects GitHub from github.com URL', () => {
      const p = detectProvider('https://github.com/octocat');
      expect(p.provider).toBe('github');
    });

    it('detects GitHub from github.com URL without protocol', () => {
      const p = detectProvider('github.com/octocat');
      expect(p.provider).toBe('github');
    });

    it('detects GitLab from username with dots', () => {
      const p = detectProvider('kevin.jobin');
      expect(p.provider).toBe('gitlab');
    });

    it('detects GitLab from username with underscores', () => {
      const p = detectProvider('hello_world');
      expect(p.provider).toBe('gitlab');
    });

    it('defaults to GitHub for simple alphanumeric usernames', () => {
      const p = detectProvider('octocat');
      expect(p.provider).toBe('github');
    });

    it('defaults to GitHub for @mentions without dots', () => {
      const p = detectProvider('@octocat');
      expect(p.provider).toBe('github');
    });

    it('detects GitLab for @mentions with dots', () => {
      const p = detectProvider('@kevin.jobin');
      expect(p.provider).toBe('gitlab');
    });

    it('strips @ when checking for dots', () => {
      const p = detectProvider('@no_dot');
      expect(p.provider).toBe('gitlab'); // underscore triggers GitLab
    });
  });

  describe('parseProviderInput', () => {
    it('parses a GitHub username', () => {
      const result = parseProviderInput('octocat');
      expect(result).not.toBeNull();
      expect(result!.username).toBe('octocat');
      expect(result!.provider.provider).toBe('github');
    });

    it('parses a GitLab username with dots', () => {
      const result = parseProviderInput('kevin.jobin');
      expect(result).not.toBeNull();
      expect(result!.username).toBe('kevin.jobin');
      expect(result!.provider.provider).toBe('gitlab');
    });

    it('parses a GitHub URL', () => {
      const result = parseProviderInput('https://github.com/octocat');
      expect(result).not.toBeNull();
      expect(result!.username).toBe('octocat');
      expect(result!.provider.provider).toBe('github');
    });

    it('parses a GitLab URL', () => {
      const result = parseProviderInput('https://gitlab.com/thejobin');
      expect(result).not.toBeNull();
      expect(result!.username).toBe('thejobin');
      expect(result!.provider.provider).toBe('gitlab');
    });

    it('parses an @mention', () => {
      const result = parseProviderInput('@octocat');
      expect(result).not.toBeNull();
      expect(result!.username).toBe('octocat');
      expect(result!.provider.provider).toBe('github');
    });

    it('returns null for empty input', () => {
      expect(parseProviderInput('')).toBeNull();
      expect(parseProviderInput('   ')).toBeNull();
    });

    it('returns null for invalid input with special chars (not a URL)', () => {
      // This input doesn't look like any known format
      expect(parseProviderInput('user@name')).toBeNull();
      // But valid GitLab chars should work
      const result = parseProviderInput('user.name');
      expect(result).not.toBeNull();
      expect(result!.username).toBe('user.name');
    });

    it('parses username with underscores as GitLab', () => {
      const result = parseProviderInput('hello_world');
      expect(result).not.toBeNull();
      expect(result!.username).toBe('hello_world');
      expect(result!.provider.provider).toBe('gitlab');
    });

    it('trims whitespace from input', () => {
      const result = parseProviderInput('  octocat  ');
      expect(result).not.toBeNull();
      expect(result!.username).toBe('octocat');
    });
  });
});
