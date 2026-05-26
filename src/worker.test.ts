import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Env, RoastMon } from './types';
import type { GitProvider, ProviderProfileData, IProfileProvider } from './providers/types';

// =====================================================================
//  Mock module-level dependencies
// =====================================================================

const mockGetProvider = vi.fn();
const mockDetectProvider = vi.fn();
const mockParseProviderInput = vi.fn();
const mockLookupSummonCache = vi.fn();
const mockAddToSummonCache = vi.fn();
const mockLoadLeaderboard = vi.fn();
const mockGenerateSvgCard = vi.fn();
const mockGenerateGifCard = vi.fn();
const mockSHELL_HTML = '<!doctype html><html><body><!-- OG_URL_INJECTED_BY_SERVER --><!-- OG_IMAGE_INJECTED_BY_SERVER --><!-- TWITTER_IMAGE_INJECTED_BY_SERVER --></body></html>';

vi.mock('./providers', () => ({
  getProvider: mockGetProvider,
  detectProvider: mockDetectProvider,
  parseProviderInput: mockParseProviderInput,
  GitHubProvider: class MockGitHub {},
  GitLabProvider: class MockGitLab {},
}));

vi.mock('./summonCache', () => ({
  lookupSummonCache: mockLookupSummonCache,
  addToSummonCache: mockAddToSummonCache,
}));

vi.mock('./leaderboard', () => ({
  loadLeaderboard: mockLoadLeaderboard,
  recordMatchResult: vi.fn(),
}));

vi.mock('./embed', () => ({
  generateSvgCard: mockGenerateSvgCard,
  generateGifCard: mockGenerateGifCard,
}));

vi.mock('./shellHtml', () => ({
  SHELL_HTML: mockSHELL_HTML,
}));

// Import after mocks are set up
const workerModule = (await import('./worker')).default;

// =====================================================================
//  Mock helpers
// =====================================================================

function createMockProvider(providerType: GitProvider): IProfileProvider {
  return {
    provider: providerType,
    sanitizeUsername: vi.fn((u: string) => u.replace(providerType === 'gitlab' ? /[^a-zA-Z0-9._-]/g : /[^a-zA-Z0-9-]/g, '')),
    fetchProfile: vi.fn(),
    getAvatarUrl: vi.fn((u: string) => `https://${providerType}.com/${u}.png`),
    parseUsername: vi.fn((input: string) => {
      const raw = input.replace(/^@/, '').trim();
      if (!raw || /[^a-zA-Z0-9._-]/.test(raw)) return null;
      return { username: raw, provider: providerType };
    }),
  };
}

function createMockEnv(overrides: Partial<Env> = {}): Env {
  return {
    LEADERBOARD: {} as KVNamespace,
    SUMMON_CACHE: {} as KVNamespace,
    GAME_SERVER: {} as DurableObjectNamespace,
    GROQ_API_KEY: undefined,
    GITLAB_API_KEY: undefined,
    ...overrides,
  };
}

function createMockCtx(): ExecutionContext {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  };
}

function createPostRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createSampleProfileData(overrides: Partial<ProviderProfileData> = {}): ProviderProfileData {
  return {
    name: 'Test User',
    publicRepos: 15,
    followers: 10,
    location: 'San Francisco',
    joinedYear: '2020',
    bio: 'A developer',
    avatarUrl: 'https://avatars.example.com/testuser',
    provider: 'github',
    fromFallback: false,
    ...overrides,
  };
}

// =====================================================================
//  Tests
// =====================================================================

describe('Worker summon flow', () => {
  let env: Env;
  let ctx: ExecutionContext;
  let mockProvider: IProfileProvider;

  beforeEach(() => {
    vi.clearAllMocks();

    env = createMockEnv();
    ctx = createMockCtx();
    mockProvider = createMockProvider('github');

    // Default mock setup
    mockGetProvider.mockReturnValue(mockProvider);
    mockDetectProvider.mockReturnValue(mockProvider);
    mockParseProviderInput.mockReturnValue({ username: 'testuser', provider: mockProvider });
    mockLookupSummonCache.mockResolvedValue(null); // cache miss
    mockAddToSummonCache.mockResolvedValue(undefined);
    mockLoadLeaderboard.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ===================================================================
  //  Validation
  // ===================================================================

  describe('validation', () => {
    it('returns 400 when username is missing', async () => {
      const req = createPostRequest('http://localhost/api/summon', {});
      const res = await workerModule.fetch(req, env, ctx);
      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toContain('required');
    });

    it('returns 400 when username is empty string', async () => {
      const req = createPostRequest('http://localhost/api/summon', { username: '' });
      const res = await workerModule.fetch(req, env, ctx);
      expect(res.status).toBe(400);
    });

    it('returns 400 when username is only whitespace', async () => {
      const req = createPostRequest('http://localhost/api/summon', { username: '   ' });
      const res = await workerModule.fetch(req, env, ctx);
      expect(res.status).toBe(400);
    });

    it('returns 400 when username is not a string', async () => {
      const req = createPostRequest('http://localhost/api/summon', { username: 123 });
      const res = await workerModule.fetch(req, env, ctx);
      expect(res.status).toBe(400);
    });
  });

  // ===================================================================
  //  Provider selection
  // ===================================================================

  describe('provider selection', () => {
    it('uses GitHub provider when provider: "github" is passed', async () => {
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(createSampleProfileData());

      const req = createPostRequest('http://localhost/api/summon', {
        username: 'octocat',
        provider: 'github',
      });
      const res = await workerModule.fetch(req, env, ctx);
      expect(res.status).toBe(200);

      // Should have used GitHubProvider's sanitize logic
      expect(mockGetProvider).toHaveBeenCalledWith('github');
      expect(mockProvider.fetchProfile).toHaveBeenCalledWith('octocat', undefined);
    });

    it('uses GitLab provider when provider: "gitlab" is passed', async () => {
      const gitlabProvider = createMockProvider('gitlab');
      mockGetProvider.mockImplementation((type: GitProvider) => {
        if (type === 'gitlab') return gitlabProvider;
        return mockProvider;
      });
      gitlabProvider.fetchProfile = vi.fn().mockResolvedValue(
        createSampleProfileData({ provider: 'gitlab' }),
      );

      const req = createPostRequest('http://localhost/api/summon', {
        username: 'thejobin',
        provider: 'gitlab',
      });
      const res = await workerModule.fetch(req, env, ctx);
      expect(res.status).toBe(200);

      expect(mockGetProvider).toHaveBeenCalledWith('gitlab');
      expect(gitlabProvider.fetchProfile).toHaveBeenCalled();
    });

    it('auto-detects provider from input when a non-standard provider value is sent', async () => {
      const gitlabProvider = createMockProvider('gitlab');
      mockDetectProvider.mockReturnValue(gitlabProvider);
      mockParseProviderInput.mockReturnValue({ username: 'kevin.jobin', provider: gitlabProvider });
      mockGetProvider.mockImplementation((type: GitProvider) => {
        if (type === 'gitlab') return gitlabProvider;
        return mockProvider;
      });
      gitlabProvider.fetchProfile = vi.fn().mockResolvedValue(
        createSampleProfileData({ provider: 'gitlab', publicRepos: 10, followers: 5, joinedYear: '2020', location: 'Earth', bio: 'A dev' }),
      );

      // Pass an explicit but invalid provider value to trigger auto-detect fallback
      const req = createPostRequest('http://localhost/api/summon', {
        username: 'kevin.jobin',
        provider: 'auto',
      });
      const res = await workerModule.fetch(req, env, ctx);
      expect(res.status).toBe(200);

      // Should have used parseProviderInput for auto-detection
      expect(mockParseProviderInput).toHaveBeenCalled();
      expect(gitlabProvider.fetchProfile).toHaveBeenCalled();
    });

    it('returns 400 for invalid username after sanitization is empty', async () => {
      // Simulate a provider whose sanitizeUsername returns empty
      mockProvider.sanitizeUsername = vi.fn().mockReturnValue('');

      const req = createPostRequest('http://localhost/api/summon', {
        username: '!!!',
        provider: 'github',
      });
      const res = await workerModule.fetch(req, env, ctx);
      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toContain('Invalid');
    });
  });

  // ===================================================================
  //  Cache
  // ===================================================================

  describe('cache', () => {
    it('returns cached result when available (cache hit)', async () => {
      const cachedMon: RoastMon = {
        username: 'testuser',
        provider: 'github',
        name: 'CachedMon',
        avatarUrl: 'https://example.com/avatar.png',
        type: 'Cached Type',
        level: 50,
        bio: 'Cached bio',
        roast: 'Cached roast',
        stats: { hp: 50, attack: 50, defense: 50, speed: 50, chaos: 50 },
        moves: [
          { name: 'Move 1', power: 30, desc: 'Desc' },
          { name: 'Move 2', power: 40, desc: 'Desc' },
          { name: 'Move 3', power: 50, desc: 'Desc' },
          { name: 'Move 4', power: 60, desc: 'Desc' },
        ],
        joinedYear: '2020',
        publicRepos: 10,
        followers: 5,
        location: 'Earth',
        spriteSeed: 'test-seed',
      };
      mockLookupSummonCache.mockResolvedValue(cachedMon);

      const req = createPostRequest('http://localhost/api/summon', {
        username: 'testuser',
      });
      const res = await workerModule.fetch(req, env, ctx);
      expect(res.status).toBe(200);
      const body = await res.json() as RoastMon;
      expect(body.name).toBe('CachedMon');
      // fetchProfile should NOT have been called
      expect(mockProvider.fetchProfile).not.toHaveBeenCalled();
    });

    it('bypasses cache when refresh: true is sent', async () => {
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(createSampleProfileData());

      const cachedMon: RoastMon = {
        username: 'testuser', provider: 'github', name: 'CachedMon',
        avatarUrl: '', type: '', level: 1, bio: '', roast: '',
        stats: { hp: 1, attack: 1, defense: 1, speed: 1, chaos: 1 },
        moves: [{ name: 'M', power: 1, desc: 'D' }, { name: 'M', power: 1, desc: 'D' }, { name: 'M', power: 1, desc: 'D' }, { name: 'M', power: 1, desc: 'D' }],
        joinedYear: '', publicRepos: 0, followers: 0, location: '', spriteSeed: '',
      };
      mockLookupSummonCache.mockResolvedValue(cachedMon);

      const req = createPostRequest('http://localhost/api/summon', {
        username: 'testuser',
        refresh: true,
      });
      await workerModule.fetch(req, env, ctx);
      // fetchProfile should have been called despite cache existing
      expect(mockProvider.fetchProfile).toHaveBeenCalled();
    });
  });

  // ===================================================================
  //  Fallback / error handling
  // ===================================================================

  describe('fallback and error handling', () => {
    it('attaches _fallback: true when provider returns fromFallback data', async () => {
      const fallbackProfile = createSampleProfileData({
        fromFallback: true,
        warning: 'GitHub API unavailable. Using estimated stats from backup data.',
      });
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(fallbackProfile);

      const req = createPostRequest('http://localhost/api/summon', { username: 'testuser' });
      const res = await workerModule.fetch(req, env, ctx);
      expect(res.status).toBe(200);
      const body = await res.json() as RoastMon;
      expect(body._fallback).toBe(true);
      expect(body._fallbackMessage).toContain('API unavailable');
    });

    it('attaches _fallback with 404-specific warning', async () => {
      const notFoundProfile = createSampleProfileData({
        fromFallback: true,
        warning: 'GitHub user "nobody" not found (404). Using estimated stats.',
      });
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(notFoundProfile);

      const req = createPostRequest('http://localhost/api/summon', { username: 'nobody' });
      const res = await workerModule.fetch(req, env, ctx);
      const body = await res.json() as RoastMon;
      expect(body._fallback).toBe(true);
      expect(body._fallbackMessage).toContain('not found (404)');
    });

    it('does NOT attach _fallback when profile data is fresh (fromFallback: false)', async () => {
      const freshProfile = createSampleProfileData({ fromFallback: false });
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(freshProfile);

      const req = createPostRequest('http://localhost/api/summon', { username: 'testuser' });
      const res = await workerModule.fetch(req, env, ctx);
      const body = await res.json() as RoastMon;
      expect(body._fallback).toBeUndefined();
      expect(body._fallbackMessage).toBeUndefined();
    });

    it('attaches fallback warning even when warning string is empty (should use default)', async () => {
      const fallbackProfile = createSampleProfileData({
        fromFallback: true,
        warning: '',
      });
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(fallbackProfile);

      const req = createPostRequest('http://localhost/api/summon', { username: 'testuser' });
      const res = await workerModule.fetch(req, env, ctx);
      const body = await res.json() as RoastMon;
      expect(body._fallback).toBe(true);
      // When warning is empty string (truthy), it uses the empty string...
      // Wait, '' is falsy in JS. Let me check the worker code:
      // `mon._fallbackMessage = profileData.warning || 'Profile data unavailable, used estimated stats.';`
      // So '' would fall through to the default message
      expect(body._fallbackMessage).toBe('Profile data unavailable, used estimated stats.');
    });

    it('generates mock with valid RoastMon structure on fallback path', async () => {
      const fallbackProfile = createSampleProfileData({
        fromFallback: true,
        warning: 'API error',
        publicRepos: 12,
        followers: 4,
        joinedYear: '2022',
        location: 'Internet Wilderness',
        bio: 'A mysterious code crafter.',
      });
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(fallbackProfile);

      const req = createPostRequest('http://localhost/api/summon', { username: 'testuser' });
      const res = await workerModule.fetch(req, env, ctx);
      const body = await res.json() as RoastMon;

      // Basic structure checks
      expect(body.username).toBe('testuser');
      expect(body.provider).toBe('github');
      expect(body.name).toBeTruthy();
      expect(body.type).toBeTruthy();
      expect(body.stats).toBeDefined();
      expect(body.stats.hp).toBeGreaterThanOrEqual(25);
      expect(body.stats.hp).toBeLessThanOrEqual(99);
      expect(body.moves).toHaveLength(4);
      expect(body.roast).toBeTruthy();
      expect(body.spriteSeed).toContain('testuser');
    });
  });

  // ===================================================================
  //  Groq integration
  // ===================================================================

  describe('Groq integration', () => {
    beforeEach(() => {
      env = createMockEnv({ GROQ_API_KEY: 'mock-groq-key' });
    });

    it('calls Groq API when GROQ_API_KEY is set and returns the result', async () => {
      const freshProfile = createSampleProfileData({ fromFallback: false });
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(freshProfile);

      // Mock the external Groq API call
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'chat-1',
          object: 'chat.completion',
          created: 1700000000,
          model: 'llama-3.3-70b-versatile',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: JSON.stringify({
                name: 'GroqMon',
                type: 'AI-Powered',
                roast: 'You rely on AI to write your commits!',
                stats: { hp: 80, attack: 70, defense: 60, speed: 90, chaos: 50 },
                moves: [
                  { name: 'AI Write', power: 80, desc: 'Generates code' },
                  { name: 'Prompt Hack', power: 70, desc: 'Injects prompt' },
                  { name: 'Token Burn', power: 60, desc: 'Burns tokens' },
                  { name: 'Model Swap', power: 90, desc: 'Switches model' },
                ],
              }),
            },
            finish_reason: 'stop',
          }],
        }),
      }));

      const req = createPostRequest('http://localhost/api/summon', { username: 'testuser' });
      const res = await workerModule.fetch(req, env, ctx);
      expect(res.status).toBe(200);
      const body = await res.json() as RoastMon;
      expect(body.name).toBe('GroqMon');
      expect(body.roast).toContain('AI');
      expect(body._fallback).toBeUndefined(); // fresh data, no fallback
    });

    it('falls back to mock when Groq API returns an error', async () => {
      const freshProfile = createSampleProfileData({ fromFallback: false });
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(freshProfile);

      // Mock Groq API to fail
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: 'Rate limited' }),
      }));

      const req = createPostRequest('http://localhost/api/summon', { username: 'testuser' });
      const res = await workerModule.fetch(req, env, ctx);
      expect(res.status).toBe(200);
      const body = await res.json() as RoastMon;
      // Falls back to mock generator
      expect(body.name).toBeTruthy();
      expect(body.moves).toHaveLength(4);
      expect(body._fallback).toBeUndefined(); // fromFallback was false, so no fallback flag
    });

    it('falls back to mock when Groq API returns invalid JSON', async () => {
      const freshProfile = createSampleProfileData({ fromFallback: false });
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(freshProfile);

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'chat-1',
          object: 'chat.completion',
          created: 1700000000,
          model: 'llama-3.3-70b-versatile',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: 'not valid json at all',
            },
            finish_reason: 'stop',
          }],
        }),
      }));

      const req = createPostRequest('http://localhost/api/summon', { username: 'testuser' });
      const res = await workerModule.fetch(req, env, ctx);
      expect(res.status).toBe(200);
      const body = await res.json() as RoastMon;
      // Should fall back to mock since JSON.parse would fail
      expect(body.name).toBeTruthy();
      expect(body.moves).toHaveLength(4);
    });

    it('falls back to mock when Groq fetch itself rejects (network error)', async () => {
      const freshProfile = createSampleProfileData({ fromFallback: false });
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(freshProfile);

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

      const req = createPostRequest('http://localhost/api/summon', { username: 'testuser' });
      const res = await workerModule.fetch(req, env, ctx);
      expect(res.status).toBe(200);
      const body = await res.json() as RoastMon;
      expect(body.name).toBeTruthy();
      expect(body.moves).toHaveLength(4);
    });

    it('uses mock fallback (no Groq) when GROQ_API_KEY is not set', async () => {
      env = createMockEnv(); // no GROQ_API_KEY
      const freshProfile = createSampleProfileData({ fromFallback: false });
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(freshProfile);

      // Set up a spy fetch so we can verify it's never called
      vi.stubGlobal('fetch', vi.fn());

      const req = createPostRequest('http://localhost/api/summon', { username: 'testuser' });
      const res = await workerModule.fetch(req, env, ctx);
      expect(res.status).toBe(200);
      const body = await res.json() as RoastMon;
      // Should have mock-generated name from the name array
      expect(body.name).toBeTruthy();
      expect(body.moves).toHaveLength(4);
      // No external fetch calls should have been made
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  // ===================================================================
  //  End-to-end: full summon flow
  // ===================================================================

  describe('full summon flow with mock data', () => {
    it('returns a complete RoastMon object with all required fields', async () => {
      const profile = createSampleProfileData({
        name: 'Kevin Jobin',
        publicRepos: 25,
        followers: 50,
        location: 'Montreal',
        joinedYear: '2019',
        bio: 'Full-stack developer',
        avatarUrl: 'https://avatars.example.com/kevin',
      });
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(profile);

      const req = createPostRequest('http://localhost/api/summon', { username: 'kevin' });
      const res = await workerModule.fetch(req, env, ctx);
      const body = await res.json() as RoastMon;

      expect(body.username).toBe('kevin');
      expect(body.provider).toBe('github');
      expect(body.avatarUrl).toBe('https://avatars.example.com/kevin');
      expect(body.bio).toBe('Full-stack developer');
      expect(body.publicRepos).toBe(25);
      expect(body.followers).toBe(50);
      expect(body.location).toBe('Montreal');
      expect(body.joinedYear).toBe('2019');
      expect(body.level).toBeGreaterThanOrEqual(1);
      expect(body.level).toBeLessThanOrEqual(99);
      expect(body.stats).toMatchObject({
        hp: expect.any(Number),
        attack: expect.any(Number),
        defense: expect.any(Number),
        speed: expect.any(Number),
        chaos: expect.any(Number),
      });
      expect(body.moves).toHaveLength(4);
      body.moves.forEach(m => {
        expect(m).toMatchObject({ name: expect.any(String), power: expect.any(Number), desc: expect.any(String) });
      });
    });
  });

  // ===================================================================
  //  GitLab-specific fallback
  // ===================================================================

  describe('GitLab provider fallback', () => {
    it('attaches fallback warning for GitLab API failures', async () => {
      const gitlabProvider = createMockProvider('gitlab');
      mockGetProvider.mockImplementation((type: GitProvider) => {
        if (type === 'gitlab') return gitlabProvider;
        return mockProvider;
      });

      const fallbackProfile = createSampleProfileData({
        provider: 'gitlab',
        fromFallback: true,
        warning: 'GitLab API unavailable. Using estimated stats from backup data.',
      });
      gitlabProvider.fetchProfile = vi.fn().mockResolvedValue(fallbackProfile);

      const req = createPostRequest('http://localhost/api/summon', {
        username: 'thejobin',
        provider: 'gitlab',
      });
      const res = await workerModule.fetch(req, env, ctx);
      expect(res.status).toBe(200);
      const body = await res.json() as RoastMon;
      expect(body._fallback).toBe(true);
      expect(body._fallbackMessage).toContain('API unavailable');
      expect(body.provider).toBe('gitlab');
    });
  });

  // ===================================================================
  //  GitLab API key passing
  // ===================================================================

  describe('GitLab API key', () => {
    it('passes GITLAB_API_KEY env var to GitLab provider fetchProfile', async () => {
      env = createMockEnv({ GITLAB_API_KEY: 'my-gitlab-token' });
      const gitlabProvider = createMockProvider('gitlab');
      mockGetProvider.mockImplementation((type: GitProvider) => {
        if (type === 'gitlab') return gitlabProvider;
        return mockProvider;
      });
      gitlabProvider.fetchProfile = vi.fn().mockResolvedValue(
        createSampleProfileData({ provider: 'gitlab' }),
      );

      const req = createPostRequest('http://localhost/api/summon', {
        username: 'thejobin',
        provider: 'gitlab',
      });
      await workerModule.fetch(req, env, ctx);

      expect(gitlabProvider.fetchProfile).toHaveBeenCalledWith('thejobin', 'my-gitlab-token');
    });

    it('does not pass GITLAB_API_KEY for GitHub provider', async () => {
      env = createMockEnv({ GITLAB_API_KEY: 'my-gitlab-token' });
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(createSampleProfileData());

      const req = createPostRequest('http://localhost/api/summon', {
        username: 'octocat',
        provider: 'github',
      });
      await workerModule.fetch(req, env, ctx);

      // GitHub provider should NOT receive the GitLab API key
      expect(mockProvider.fetchProfile).toHaveBeenCalledWith('octocat', undefined);
    });
  });
});
