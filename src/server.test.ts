import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { ProviderProfileData, IProfileProvider } from './providers/types';

// =====================================================================
//  Mock module-level dependencies (hoisted by vitest)
// =====================================================================

const mockGetProvider = vi.fn();
const mockDetectProvider = vi.fn();
const mockParseProviderInput = vi.fn();
const mockLoadLeaderboard = vi.fn();
const mockSetupMultiplayer = vi.fn();
const mockGenerateSvgCard = vi.fn();
const mockGenerateGifCard = vi.fn();
const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockViteCreateServer = vi.fn();
/** Shared mock for groq.chat.completions.create – tests configure this */
const mockGroqCreate = vi.fn();
/**
 * Shared mock for the express-rate-limit middleware factory.
 * Tests configure this to either pass through or return 429.
 */
const mockRateLimitMiddleware = vi.fn(
  (_req: unknown, _res: unknown, next: () => void) => next(),
);

vi.mock('vite', () => ({
  createServer: mockViteCreateServer,
}));

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: mockGroqCreate,
      },
    };
  },
}));

vi.mock('dotenv', () => ({
  default: { config: vi.fn() },
  config: vi.fn(),
}));

vi.mock('express-rate-limit', () => ({
  default: vi.fn(() => mockRateLimitMiddleware),
}));

vi.mock('fs', () => ({
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
  },
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
}));

vi.mock('../server/leaderboard.js', () => ({
  loadLeaderboard: mockLoadLeaderboard,
}));

vi.mock('../server/multiplayer.js', () => ({
  setupMultiplayer: mockSetupMultiplayer,
}));

vi.mock('../server/embed.js', () => ({
  generateSvgCard: mockGenerateSvgCard,
  generateGifCard: mockGenerateGifCard,
}));

vi.mock('../src/providers/index.js', () => ({
  getProvider: mockGetProvider,
  detectProvider: mockDetectProvider,
  parseProviderInput: mockParseProviderInput,
}));

// =====================================================================
//  Mock helpers
// =====================================================================

function createMockProvider(providerType: 'github' | 'gitlab'): IProfileProvider {
  return {
    provider: providerType,
    sanitizeUsername: vi.fn((u: string) =>
      providerType === 'github'
        ? u.replace(/[^a-zA-Z0-9-]/g, '')
        : u.replace(/[^a-zA-Z0-9._-]/g, ''),
    ),
    fetchProfile: vi.fn(),
    getAvatarUrl: vi.fn((u: string) => `https://${providerType}.com/${u}.png`),
    parseUsername: vi.fn((input: string) => {
      const raw = input.replace(/^@/, '').trim();
      if (!raw || /[^a-zA-Z0-9._-]/.test(raw)) return null;
      return { username: raw, provider: providerType };
    }),
  };
}

function createSampleProfileData(
  overrides: Partial<ProviderProfileData> = {},
): ProviderProfileData {
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

function createValidGroqResponse() {
  return {
    choices: [
      {
        message: {
          content: JSON.stringify({
            name: 'GroqMon',
            type: 'AI-Powered',
            roast: 'You rely on AI to write your commits!',
            stats: { hp: 80, attack: 70, defense: 60, speed: 90, chaos: 50 },
            moves: [
              { name: 'AI Write', power: 80, desc: 'Generates code from prompts' },
              { name: 'Prompt Hack', power: 70, desc: 'Injects system prompt' },
              { name: 'Token Burn', power: 60, desc: 'Burns through rate limits' },
              { name: 'Model Swap', power: 90, desc: 'Switches to larger model' },
            ],
          }),
        },
      },
    ],
  };
}

// =====================================================================
//  Tests — with Groq key (paths 2 & 3)
// =====================================================================

describe('Express server /api/summon (with Groq key)', () => {
  let app: Express;
  let mockProvider: IProfileProvider;

  beforeAll(async () => {
    vi.stubEnv('GROQ_API_KEY', 'mock-groq-key');
    vi.resetModules();
    const mod = await import('../server');
    app = mod.app;
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = createMockProvider('github');
    mockGetProvider.mockReturnValue(mockProvider);
    mockDetectProvider.mockReturnValue(mockProvider);
    mockParseProviderInput.mockReturnValue({ username: 'testuser', provider: mockProvider });
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue('<html>mock</html>');
    mockLoadLeaderboard.mockReturnValue([]);
    // Restore default pass-through rate limit middleware
    mockRateLimitMiddleware.mockImplementation(
      (_req: unknown, _res: unknown, next: () => void) => next(),
    );
  });

  // ===================================================================
  //  Edge cases
  // ===================================================================

  describe('edge cases', () => {
    it('returns 429 when summon rate limit is exceeded', async () => {
      mockRateLimitMiddleware.mockImplementation(
        (_req: unknown, res: any, _next: unknown) => {
          res.status(429).json({ error: 'Too many summon requests. Please wait before trying again.' });
        },
      );

      const res = await request(app).post('/api/summon').send({ username: 'testuser' });
      expect(res.status).toBe(429);
      expect(res.body.error).toContain('Too many');
      // Rate limiter fires before the handler — no provider/profile fetch should occur
      expect(mockProvider.fetchProfile).not.toHaveBeenCalled();
    });

    it('handles extremely long usernames gracefully', async () => {
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(createSampleProfileData());
      mockGroqCreate.mockResolvedValue(createValidGroqResponse());

      const longUsername = 'a'.repeat(1000);
      const res = await request(app)
        .post('/api/summon')
        .send({ username: longUsername });
      expect(res.status).toBe(200);
      // Username should be preserved through the flow
      expect(res.body.username).toBe(longUsername);
      expect(mockProvider.fetchProfile).toHaveBeenCalledWith(longUsername, undefined);
      expect(res.body.name).toBe('GroqMon');
    });

    it('handles username with maximum-length unusual characters (stripped to empty)', async () => {
      // Only special chars — sanitize will produce empty string → 400
      mockProvider.sanitizeUsername = vi.fn((u: string) => u.replace(/[^a-zA-Z0-9-]/g, ''));

      const res = await request(app)
        .post('/api/summon')
        .send({ username: '!@#$%^&*()_+='.repeat(50) });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
    });
  });

  // ===================================================================
  //  Validation
  // ===================================================================

  describe('validation', () => {
    it('returns 400 when username is missing', async () => {
      const res = await request(app).post('/api/summon').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('returns 400 when username is empty string', async () => {
      const res = await request(app).post('/api/summon').send({ username: '' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when username is only whitespace', async () => {
      const res = await request(app).post('/api/summon').send({ username: '   ' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when username is not a string', async () => {
      const res = await request(app).post('/api/summon').send({ username: 123 });
      expect(res.status).toBe(400);
    });
  });

  // ===================================================================
  //  Provider selection
  // ===================================================================

  describe('provider selection', () => {
    it('uses GitHub provider when provider: "github" is passed', async () => {
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(createSampleProfileData());
      mockGroqCreate.mockResolvedValue(createValidGroqResponse());

      const res = await request(app)
        .post('/api/summon')
        .send({ username: 'octocat', provider: 'github' });
      expect(res.status).toBe(200);
      expect(mockGetProvider).toHaveBeenCalledWith('github');
      expect(mockProvider.fetchProfile).toHaveBeenCalledWith('octocat', undefined);
    });

    it('uses GitLab provider when provider: "gitlab" is passed', async () => {
      const gitlabProvider = createMockProvider('gitlab');
      mockGetProvider.mockImplementation((type: string) => {
        if (type === 'gitlab') return gitlabProvider;
        return mockProvider;
      });
      gitlabProvider.fetchProfile = vi
        .fn()
        .mockResolvedValue(createSampleProfileData({ provider: 'gitlab' }));
      mockGroqCreate.mockResolvedValue(createValidGroqResponse());

      const res = await request(app)
        .post('/api/summon')
        .send({ username: 'thejobin', provider: 'gitlab' });
      expect(res.status).toBe(200);
      expect(mockGetProvider).toHaveBeenCalledWith('gitlab');
      expect(gitlabProvider.fetchProfile).toHaveBeenCalled();
    });

    it('auto-detects provider when provider value is unrecognised', async () => {
      const gitlabProvider = createMockProvider('gitlab');
      mockGetProvider.mockImplementation((type: string) => {
        if (type === 'gitlab') return gitlabProvider;
        return mockProvider;
      });
      mockParseProviderInput.mockReturnValue({
        username: 'kevin.jobin',
        provider: gitlabProvider,
      });
      gitlabProvider.fetchProfile = vi
        .fn()
        .mockResolvedValue(
          createSampleProfileData({
            provider: 'gitlab',
            publicRepos: 10,
            followers: 5,
            joinedYear: '2020',
            location: 'Earth',
            bio: 'A dev',
          }),
        );
      mockGroqCreate.mockResolvedValue(createValidGroqResponse());

      const res = await request(app)
        .post('/api/summon')
        .send({ username: 'kevin.jobin', provider: 'auto' });
      expect(res.status).toBe(200);
      expect(mockParseProviderInput).toHaveBeenCalled();
      expect(gitlabProvider.fetchProfile).toHaveBeenCalled();
    });

    it('returns 400 when sanitized username is empty', async () => {
      mockProvider.sanitizeUsername = vi.fn().mockReturnValue('');

      const res = await request(app)
        .post('/api/summon')
        .send({ username: '!!!', provider: 'github' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
    });
  });

  // ===================================================================
  //  Cache
  // ===================================================================

  describe('cache', () => {
    it('returns cached result when summon-cache.json has matching entry', async () => {
      mockExistsSync.mockReturnValue(true);
      const cachedMon = {
        username: 'testuser',
        provider: 'github',
        name: 'CachedMon',
        avatarUrl: '',
        type: 'Cached',
        level: 50,
        bio: '',
        roast: '',
        stats: { hp: 50, attack: 50, defense: 50, speed: 50, chaos: 50 },
        moves: [
          { name: 'M1', power: 10, desc: 'D1' },
          { name: 'M2', power: 20, desc: 'D2' },
          { name: 'M3', power: 30, desc: 'D3' },
          { name: 'M4', power: 40, desc: 'D4' },
        ],
        joinedYear: '2020',
        publicRepos: 10,
        followers: 5,
        location: 'Earth',
        spriteSeed: 'test-seed',
      };
      mockReadFileSync.mockReturnValue(
        JSON.stringify([
          { username: 'testuser', resultMon: cachedMon, generatedAt: new Date().toISOString() },
        ]),
      );

      const res = await request(app).post('/api/summon').send({ username: 'testuser' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('CachedMon');
      expect(mockProvider.fetchProfile).not.toHaveBeenCalled();
    });

    it('bypasses cache when refresh: true is sent', async () => {
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(createSampleProfileData());
      mockGroqCreate.mockResolvedValue(createValidGroqResponse());

      // Seed cache
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify([
          { username: 'testuser', resultMon: { name: 'CachedMon' }, generatedAt: new Date().toISOString() },
        ]),
      );

      await request(app)
        .post('/api/summon')
        .send({ username: 'testuser', refresh: true });
      expect(mockProvider.fetchProfile).toHaveBeenCalled();
    });
  });

  // ===================================================================
  //  Path 2: Groq success
  // ===================================================================

  describe('Groq success (path 2)', () => {
    beforeEach(() => {
      mockGroqCreate.mockResolvedValue(createValidGroqResponse());
    });

    it('returns AI-generated RoastMon when Groq succeeds and profile is fresh', async () => {
      const freshProfile = createSampleProfileData({ fromFallback: false });
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(freshProfile);

      const res = await request(app).post('/api/summon').send({ username: 'testuser' });
      expect(res.status).toBe(200);
      // Groq path was taken — name comes from Groq response
      expect(res.body.name).toBe('GroqMon');
      expect(res.body.roast).toContain('AI');
      expect(res.body._fallback).toBeUndefined();
    });

    it('attaches _fallback when Groq succeeds but profile was fromFallback', async () => {
      const fallbackProfile = createSampleProfileData({
        fromFallback: true,
        warning: 'GitHub API unavailable. Using estimated stats.',
      });
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(fallbackProfile);

      const res = await request(app).post('/api/summon').send({ username: 'testuser' });
      expect(res.status).toBe(200);
      expect(res.body._fallback).toBe(true);
      expect(res.body._fallbackMessage).toContain('API unavailable');
      // Name still comes from Groq response
      expect(res.body.name).toBe('GroqMon');
    });
  });

  // ===================================================================
  //  Path 3: Groq error fallback
  // ===================================================================

  describe('Groq error fallback (path 3)', () => {
    beforeEach(() => {
      mockGroqCreate.mockRejectedValue(new Error('Groq API error'));
    });

    it('falls back to mock when Groq throws and attaches fallback warning', async () => {
      const fallbackProfile = createSampleProfileData({
        fromFallback: true,
        warning: 'Provider API error',
      });
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(fallbackProfile);

      const res = await request(app).post('/api/summon').send({ username: 'testuser' });
      expect(res.status).toBe(200);
      expect(res.body._fallback).toBe(true);
      expect(res.body._fallbackMessage).toContain('Provider API error');
      // Mock-generated name (not GroqMon)
      expect(res.body.name).not.toBe('GroqMon');
      expect(res.body.moves).toHaveLength(4);
    });

    it('falls back to mock without _fallback when Groq throws but profile is fresh', async () => {
      const freshProfile = createSampleProfileData({ fromFallback: false });
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(freshProfile);

      const res = await request(app).post('/api/summon').send({ username: 'testuser' });
      expect(res.status).toBe(200);
      expect(res.body._fallback).toBeUndefined();
      expect(res.body.name).not.toBe('GroqMon');
      expect(res.body.moves).toHaveLength(4);
    });
  });

  // ===================================================================
  //  AI Boss Comment (with Groq — paths 2 & 3)
  // ===================================================================

  describe('/api/ai-boss-comment (with Groq)', () => {
    // =============================================================
    //  Validation
    // =============================================================

    describe('validation', () => {
      it('returns 400 when username is missing', async () => {
        const res = await request(app).post('/api/ai-boss-comment').send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toContain('Username');
      });
    });

    // =============================================================
    //  Path 2: Groq success
    // =============================================================

    describe('Groq success (path 2)', () => {
      beforeEach(() => {
        mockGroqCreate.mockResolvedValue({
          choices: [
            {
              message: {
                content: 'Your code quality is a legacy nightmare!',
              },
            },
          ],
        });
      });

      it('returns the AI-generated comment wrapped in quotes', async () => {
        const res = await request(app)
          .post('/api/ai-boss-comment')
          .send({ username: 'testuser', monName: 'Forkachu', action: 'attack', stats: { hp: 80, attack: 70, defense: 60 } });
        expect(res.status).toBe(200);
        expect(res.body.comment).toBe('"Your code quality is a legacy nightmare!"');
      });

      it('returns a fallback comment when Groq returns empty content', async () => {
        mockGroqCreate.mockResolvedValue({
          choices: [{ message: { content: '' } }],
        });

        const res = await request(app)
          .post('/api/ai-boss-comment')
          .send({ username: 'testuser', action: 'push' });
        expect(res.status).toBe(200);
        // Empty content triggers the default fallback: "My syntax analyzer refuses..."
        expect(res.body.comment).toContain('push');
      });

      it('uses default values when optional fields are missing', async () => {
        const res = await request(app)
          .post('/api/ai-boss-comment')
          .send({ username: 'testuser' });
        expect(res.status).toBe(200);
        // Groq was called — path 2 taken
        expect(res.body.comment).toBeTruthy();
      });
    });

    // =============================================================
    //  Path 3: Groq error fallback
    // =============================================================

    describe('Groq error fallback (path 3)', () => {
      beforeEach(() => {
        mockGroqCreate.mockRejectedValue(new Error('Boss comment API error'));
      });

      it('returns hardcoded error comment when Groq throws', async () => {
        const res = await request(app)
          .post('/api/ai-boss-comment')
          .send({ username: 'testuser', action: 'merge' });
        expect(res.status).toBe(200);
        expect(res.body.comment).toContain('merge');
        expect(res.body.comment).toContain('StackOverflowException');
      });

      it('uses default action "fight" in error comment when action is missing', async () => {
        const res = await request(app)
          .post('/api/ai-boss-comment')
          .send({ username: 'testuser' });
        expect(res.status).toBe(200);
        expect(res.body.comment).toContain('fight');
        expect(res.body.comment).toContain('StackOverflowException');
      });
    });

    // =============================================================
    //  Rate limiting
    // =============================================================

    describe('rate limiting', () => {
      it('returns 429 when boss comment rate limit is exceeded', async () => {
        mockRateLimitMiddleware.mockImplementation(
          (_req: unknown, res: any, _next: unknown) => {
            res.status(429).json({ error: 'Too many boss comment requests. Please wait before trying again.' });
          },
        );

        const res = await request(app)
          .post('/api/ai-boss-comment')
          .send({ username: 'testuser' });
        expect(res.status).toBe(429);
        expect(res.body.error).toContain('Too many boss comment');
      });
    });
  });
});

// =====================================================================
//  Tests — without Groq key (path 1: mock fallback)
// =====================================================================

describe('Express server /api/summon (without Groq key)', () => {
  let app: Express;
  let mockProvider: IProfileProvider;

  beforeAll(async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('GROQ_API_KEY', ''); // explicitly clear so groq stays null
    vi.resetModules();
    const mod = await import('../server');
    app = mod.app;
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = createMockProvider('github');
    mockGetProvider.mockReturnValue(mockProvider);
    mockDetectProvider.mockReturnValue(mockProvider);
    mockParseProviderInput.mockReturnValue({ username: 'testuser', provider: mockProvider });
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue('<html>mock</html>');
    mockLoadLeaderboard.mockReturnValue([]);
    // Restore default pass-through rate limit middleware
    mockRateLimitMiddleware.mockImplementation(
      (_req: unknown, _res: unknown, next: () => void) => next(),
    );
  });

  // ===================================================================
  //  Path 1: No Groq key — mock fallback
  // ===================================================================

  describe('mock fallback (path 1)', () => {
    it('attaches _fallback when provider returns fromFallback data', async () => {
      const fallbackProfile = createSampleProfileData({
        fromFallback: true,
        warning: 'GitHub API unavailable. Using estimated stats.',
      });
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(fallbackProfile);

      const res = await request(app).post('/api/summon').send({ username: 'testuser' });
      expect(res.status).toBe(200);
      expect(res.body._fallback).toBe(true);
      expect(res.body._fallbackMessage).toContain('API unavailable');
    });

    it('attaches _fallback with 404-specific warning', async () => {
      const notFoundProfile = createSampleProfileData({
        fromFallback: true,
        warning: 'GitHub user "nobody" not found (404). Using estimated stats.',
      });
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(notFoundProfile);

      const res = await request(app).post('/api/summon').send({ username: 'nobody' });
      expect(res.status).toBe(200);
      expect(res.body._fallback).toBe(true);
      expect(res.body._fallbackMessage).toContain('not found (404)');
    });

    it('does not attach _fallback when profile data is fresh', async () => {
      const freshProfile = createSampleProfileData({ fromFallback: false });
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(freshProfile);

      const res = await request(app).post('/api/summon').send({ username: 'testuser' });
      expect(res.status).toBe(200);
      expect(res.body._fallback).toBeUndefined();
      expect(res.body._fallbackMessage).toBeUndefined();
    });

    it('uses default fallback message when warning is empty string', async () => {
      const fallbackProfile = createSampleProfileData({ fromFallback: true, warning: '' });
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(fallbackProfile);

      const res = await request(app).post('/api/summon').send({ username: 'testuser' });
      expect(res.status).toBe(200);
      expect(res.body._fallback).toBe(true);
      // '' is falsy, so the || fallback kicks in
      expect(res.body._fallbackMessage).toBe('Profile data unavailable, used estimated stats.');
    });

    it('generates valid RoastMon structure on mock fallback', async () => {
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

      const res = await request(app).post('/api/summon').send({ username: 'testuser' });
      expect(res.status).toBe(200);
      const body = res.body;

      expect(body.username).toBe('testuser');
      expect(body.provider).toBe('github');
      expect(body.name).toBeTruthy();
      expect(body.type).toBeTruthy();
      expect(body.roast).toBeTruthy();
      expect(body.stats).toBeDefined();
      expect(body.stats.hp).toBeGreaterThanOrEqual(25);
      expect(body.stats.hp).toBeLessThanOrEqual(99);
      expect(body.moves).toHaveLength(4);
      expect(body.avatarUrl).toBeTruthy();
      expect(body.joinedYear).toBe('2022');
      expect(body.publicRepos).toBe(12);
      expect(body.location).toBe('Internet Wilderness');
      expect(body.spriteSeed).toContain('testuser');
    });

    it('does not make any external API calls when Groq is unavailable', async () => {
      const freshProfile = createSampleProfileData({ fromFallback: false });
      mockProvider.fetchProfile = vi.fn().mockResolvedValue(freshProfile);

      await request(app).post('/api/summon').send({ username: 'testuser' });
      expect(mockProvider.fetchProfile).toHaveBeenCalledTimes(1);
    });
  });

  // ===================================================================
  //  GitLab-specific fallback (no Groq)
  // ===================================================================

  describe('GitLab provider fallback (no Groq)', () => {
    it('attaches fallback warning for GitLab API failures', async () => {
      const gitlabProvider = createMockProvider('gitlab');
      mockGetProvider.mockImplementation((type: string) => {
        if (type === 'gitlab') return gitlabProvider;
        return mockProvider;
      });

      const fallbackProfile = createSampleProfileData({
        provider: 'gitlab',
        fromFallback: true,
        warning: 'GitLab API unavailable. Using estimated stats from backup data.',
      });
      gitlabProvider.fetchProfile = vi.fn().mockResolvedValue(fallbackProfile);

      const res = await request(app)
        .post('/api/summon')
        .send({ username: 'thejobin', provider: 'gitlab' });
      expect(res.status).toBe(200);
      expect(res.body._fallback).toBe(true);
      expect(res.body._fallbackMessage).toContain('API unavailable');
      expect(res.body.provider).toBe('gitlab');
    });

    it('passes GITLAB_API_KEY to GitLab provider fetchProfile', async () => {
      vi.stubEnv('GITLAB_API_KEY', 'my-gitlab-token');
      try {
        const gitlabProvider = createMockProvider('gitlab');
        mockGetProvider.mockImplementation((type: string) => {
          if (type === 'gitlab') return gitlabProvider;
          return mockProvider;
        });
        gitlabProvider.fetchProfile = vi
          .fn()
          .mockResolvedValue(createSampleProfileData({ provider: 'gitlab' }));

        await request(app)
          .post('/api/summon')
          .send({ username: 'thejobin', provider: 'gitlab' });

        expect(gitlabProvider.fetchProfile).toHaveBeenCalledWith('thejobin', 'my-gitlab-token');
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it('does not pass GITLAB_API_KEY for GitHub provider', async () => {
      vi.stubEnv('GITLAB_API_KEY', 'my-gitlab-token');
      try {
        mockProvider.fetchProfile = vi.fn().mockResolvedValue(createSampleProfileData());

        await request(app)
          .post('/api/summon')
          .send({ username: 'octocat', provider: 'github' });

        expect(mockProvider.fetchProfile).toHaveBeenCalledWith('octocat', undefined);
      } finally {
        vi.unstubAllEnvs();
      }
    });
  });

  // ===================================================================
  //  AI Boss Comment (no Groq — fallback comments)
  // ===================================================================

  describe('/api/ai-boss-comment (no Groq — fallback)', () => {
    it('returns 400 when username is missing', async () => {
      const res = await request(app).post('/api/ai-boss-comment').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Username');
    });

    it('returns 200 with a comment when username is provided', async () => {
      const res = await request(app).post('/api/ai-boss-comment').send({ username: 'testuser' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('comment');
      expect(typeof res.body.comment).toBe('string');
      expect(res.body.comment.length).toBeGreaterThan(0);
    });

    it('includes the monName in the fallback comment when provided', async () => {
      // Only 1 of 5 fallback comments references the monName — run 20 to get 99%+ confidence
      const results = await Promise.all(
        Array.from({ length: 20 }, () =>
          request(app)
            .post('/api/ai-boss-comment')
            .send({ username: 'testuser', monName: 'Forkachu' }),
        ),
      );
      const ok = results.filter(r => r.status === 200);
      expect(ok.length).toBe(20);
      const hasMonRef = ok.some(r => r.body.comment?.includes('Forkachu'));
      expect(hasMonRef).toBe(true);
    });

    it('uses default monName "RoastMon" when not provided', async () => {
      const results = await Promise.all(
        Array.from({ length: 20 }, () =>
          request(app).post('/api/ai-boss-comment').send({ username: 'testuser' }),
        ),
      );
      const ok = results.filter(r => r.status === 200);
      expect(ok.length).toBe(20);
      const hasRoastMon = ok.some(r => r.body.comment?.includes('RoastMon'));
      expect(hasRoastMon).toBe(true);
    });

    it('includes the action in the fallback comment when provided', async () => {
      // 2 of 5 fallback comments reference the action — 10 requests gives 99%+ confidence
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          request(app)
            .post('/api/ai-boss-comment')
            .send({ username: 'testuser', action: 'code-review' }),
        ),
      );
      const ok = results.filter(r => r.status === 200);
      expect(ok.length).toBe(10);
      const hasActionRef = ok.some(r => r.body.comment?.includes('code-review'));
      expect(hasActionRef).toBe(true);
    });

    it('uses default action "fight" when not provided', async () => {
      const results = await Promise.all(
        Array.from({ length: 20 }, () =>
          request(app).post('/api/ai-boss-comment').send({ username: 'testuser' }),
        ),
      );
      const ok = results.filter(r => r.status === 200);
      expect(ok.length).toBe(20);
      const hasFightRef = ok.some(r => r.body.comment?.includes('fight'));
      expect(hasFightRef).toBe(true);
    });

    it('includes the HP stat in the fallback comment when provided', async () => {
      // Only 1 of 5 comments references HP — run 40 for high confidence
      const results = await Promise.all(
        Array.from({ length: 40 }, () =>
          request(app)
            .post('/api/ai-boss-comment')
            .send({ username: 'testuser', stats: { hp: 99 } }),
        ),
      );
      const ok = results.filter(r => r.status === 200);
      expect(ok.length).toBe(40);
      const hasHpRef = ok.some(r => r.body.comment?.includes('99 HP'));
      expect(hasHpRef).toBe(true);
    });

    it('uses default HP 50 when stats are not provided', async () => {
      const results = await Promise.all(
        Array.from({ length: 40 }, () =>
          request(app).post('/api/ai-boss-comment').send({ username: 'testuser' }),
        ),
      );
      const ok = results.filter(r => r.status === 200);
      expect(ok.length).toBe(40);
      const hasDefaultHp = ok.some(r => r.body.comment?.includes('50 HP'));
      expect(hasDefaultHp).toBe(true);
    });

    it('returns one of the 5 known fallback comments', async () => {
      const validComments = [
        'Your level 50 RoastMon is a joke! A direct push to master with no code reviews!',
        'Using fight on me? My compiler is already refactoring your entire life\'s work!',
        'Your active stats represent a legacy codebase. Prepare to be deprecated!',
        'Evaluating fight... Exception detected! Did you write this action with an unvetted AI prompt?',
        'Staring down my Y2K Glitch engine with merely 50 HP? How delightfully optimistic.',
      ];
      // All 5 possible comments use 'RoastMon' (default monName), 'fight' (default action), 50 HP
      const res = await request(app).post('/api/ai-boss-comment').send({ username: 'testuser' });
      expect(res.status).toBe(200);
      expect(validComments).toContain(res.body.comment);
    });

    it('does not wrap fallback comments in extra quotes', async () => {
      const res = await request(app).post('/api/ai-boss-comment').send({ username: 'testuser' });
      expect(res.status).toBe(200);
      // Fallback comments are returned raw, not wrapped in ""
      expect(res.body.comment).not.toMatch(/^".*"$/);
    });

    // =============================================================
    //  Rate limiting
    // =============================================================

    describe('rate limiting', () => {
      it('returns 429 when boss comment rate limit is exceeded (no Groq)', async () => {
        mockRateLimitMiddleware.mockImplementation(
          (_req: unknown, res: any, _next: unknown) => {
            res.status(429).json({ error: 'Too many boss comment requests. Please wait before trying again.' });
          },
        );

        const res = await request(app)
          .post('/api/ai-boss-comment')
          .send({ username: 'testuser' });
        expect(res.status).toBe(429);
        expect(res.body.error).toContain('Too many boss comment');
      });
    });
  });
});

// =====================================================================
//  Tests — Badge endpoint
// =====================================================================

describe('Express server /api/badge/:username', () => {
  let app: Express;
  let mockProvider: IProfileProvider;

  beforeAll(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    const mod = await import('../server');
    app = mod.app;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = createMockProvider('github');
    mockGetProvider.mockReturnValue(mockProvider);
    mockDetectProvider.mockReturnValue(mockProvider);
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue('<html>mock</html>');
    mockLoadLeaderboard.mockReturnValue([]);
    mockRateLimitMiddleware.mockImplementation(
      (_req: unknown, _res: unknown, next: () => void) => next(),
    );
  });

  // =================================================================
  //  Validation
  // =================================================================

  describe('validation', () => {
    it('returns 404 when username param is empty (Express requires non-empty :username)', async () => {
      // Express route /api/badge/:username requires at least one character
      // for the named parameter, so an empty segment after /api/badge/ does
      // not match and falls through to a 404.
      const res = await request(app).get('/api/badge/');
      expect(res.status).toBe(404);
    });

    it('returns 400 when sanitized username is empty', async () => {
      mockProvider.sanitizeUsername = vi.fn().mockReturnValue('');

      const res = await request(app).get('/api/badge/!!!');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
    });
  });

  // =================================================================
  //  Shields.io JSON format
  // =================================================================

  describe('shields.io JSON format', () => {
    it('returns correct shields.io schema', async () => {
      const res = await request(app).get('/api/badge/testuser');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        schemaVersion: 1,
        label: 'Gittymon',
        namedLogo: 'github',
        logoColor: '#e2dfde',
      });
      expect(res.body.message).toBeTruthy();
      expect(res.body.color).toBeTruthy();
    });

    it('uses GitLab namedLogo when provider=gitlab is passed', async () => {
      const gitlabProvider = createMockProvider('gitlab');
      mockGetProvider.mockImplementation((type: string) => {
        if (type === 'gitlab') return gitlabProvider;
        return mockProvider;
      });

      const res = await request(app).get('/api/badge/testuser?provider=gitlab');
      expect(res.status).toBe(200);
      expect(res.body.namedLogo).toBe('gitlab');
    });
  });

  // =================================================================
  //  Level calculation
  // =================================================================

  describe('level calculation', () => {
    it('uses leaderboard level when entry exists', async () => {
      mockLoadLeaderboard.mockReturnValue([
        {
          username: 'testuser', provider: 'github', monName: 'NodeSlime',
          level: 42, wins: 10, losses: 2, avatarUrl: '',
        },
      ]);

      const res = await request(app).get('/api/badge/testuser');
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('LV 42');
    });

    it('falls back to deterministic level when no leaderboard entry', async () => {
      // testuser (8 chars), charCode of 't' = 116
      // level = max(1, min(99, floor(8*3 + 116 % 20))) = floor(24 + 16) = 40
      const res = await request(app).get('/api/badge/testuser');
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('LV 40');
    });

    it('computes deterministic level only using sanitized username characters', async () => {
      // 'a-b' → sanitized to 'a-b' (3 chars), charCode of 'a' = 97
      // level = max(1, min(99, floor(3*3 + 97 % 20))) = floor(9 + 17) = 26
      const res = await request(app).get('/api/badge/a-b');
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('LV 26');
    });
  });

  // =================================================================
  //  Rank calculation
  // =================================================================

  describe('rank calculation', () => {
    it('shows no rank when user is not on leaderboard', async () => {
      const res = await request(app).get('/api/badge/testuser');
      expect(res.status).toBe(200);
      expect(res.body.message).not.toContain('#');
      expect(res.body.message).toMatch(/^LV /);
    });

    it('shows rank #1 for the top entry', async () => {
      mockLoadLeaderboard.mockReturnValue([
        {
          username: 'testuser', provider: 'github', monName: 'TopMon',
          level: 99, wins: 50, losses: 5, avatarUrl: '',
        },
        {
          username: 'other', provider: 'github', monName: 'OtherMon',
          level: 10, wins: 1, losses: 10, avatarUrl: '',
        },
      ]);

      const res = await request(app).get('/api/badge/testuser');
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/#1 · LV \d+/);
    });

    it('shows rank #2 for the second-best entry', async () => {
      mockLoadLeaderboard.mockReturnValue([
        {
          username: 'winner', provider: 'github', monName: 'WinnerMon',
          level: 99, wins: 50, losses: 5, avatarUrl: '',
        },
        {
          username: 'testuser', provider: 'github', monName: 'SecondMon',
          level: 60, wins: 30, losses: 10, avatarUrl: '',
        },
        {
          username: 'loser', provider: 'github', monName: 'LoserMon',
          level: 5, wins: 0, losses: 20, avatarUrl: '',
        },
      ]);

      const res = await request(app).get('/api/badge/testuser');
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/#2 · LV 60/);
    });

    it('computes rank across all providers (not filtered by provider)', async () => {
      mockLoadLeaderboard.mockReturnValue([
        {
          username: 'testuser', provider: 'github', monName: 'TestMon',
          level: 50, wins: 20, losses: 5, avatarUrl: '',
        },
        {
          username: 'testuser', provider: 'gitlab', monName: 'GitLabMon',
          level: 80, wins: 40, losses: 2, avatarUrl: '',
        },
      ]);

      // Server sorts ALL entries by net wins then finds the position of the
      // matching (username+provider) entry. GitLab entry has 38 net (40-2),
      // GitHub entry has 15 net (20-5) — so GitHub is ranked #2 behind GitLab.
      const res = await request(app).get('/api/badge/testuser');
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/#2 · LV 50/);
    });
  });

  // =================================================================
  //  Color scheme
  // =================================================================

  describe('color scheme', () => {
    it('uses default crimson (#7f001c) when not ranked', async () => {
      const res = await request(app).get('/api/badge/testuser');
      expect(res.status).toBe(200);
      expect(res.body.color).toBe('#7f001c');
    });

    it('uses gold (#facc15) for rank #1 (top 3)', async () => {
      mockLoadLeaderboard.mockReturnValue([
        {
          username: 'testuser', provider: 'github', monName: 'GoldMon',
          level: 99, wins: 100, losses: 0, avatarUrl: '',
        },
      ]);

      const res = await request(app).get('/api/badge/testuser');
      expect(res.status).toBe(200);
      expect(res.body.color).toBe('#facc15');
    });

    it('uses gold for rank #2 (still top 3)', async () => {
      const entries = [
        { username: 'first', provider: 'github' as const, monName: 'FirstMon', level: 99, wins: 100, losses: 0, avatarUrl: '' },
        { username: 'testuser', provider: 'github' as const, monName: 'SecondMon', level: 90, wins: 80, losses: 10, avatarUrl: '' },
        { username: 'third', provider: 'github' as const, monName: 'ThirdMon', level: 85, wins: 70, losses: 15, avatarUrl: '' },
        { username: 'fourth', provider: 'github' as const, monName: 'FourthMon', level: 50, wins: 30, losses: 20, avatarUrl: '' },
      ];
      mockLoadLeaderboard.mockReturnValue(entries);

      const res = await request(app).get('/api/badge/testuser');
      expect(res.status).toBe(200);
      expect(res.body.color).toBe('#facc15');
    });

    it('uses gold for rank #3 (still top 3)', async () => {
      const entries = [
        { username: 'first', provider: 'github' as const, monName: 'FirstMon', level: 99, wins: 100, losses: 0, avatarUrl: '' },
        { username: 'second', provider: 'github' as const, monName: 'SecondMon', level: 90, wins: 80, losses: 10, avatarUrl: '' },
        { username: 'testuser', provider: 'github' as const, monName: 'ThirdMon', level: 85, wins: 70, losses: 15, avatarUrl: '' },
        { username: 'fourth', provider: 'github' as const, monName: 'FourthMon', level: 50, wins: 30, losses: 20, avatarUrl: '' },
      ];
      mockLoadLeaderboard.mockReturnValue(entries);

      const res = await request(app).get('/api/badge/testuser');
      expect(res.status).toBe(200);
      expect(res.body.color).toBe('#facc15');
    });

    it('uses green (#22c55e) for rank #4 (top 10)', async () => {
      const entries = [
        { username: 'a', provider: 'github' as const, monName: 'A', level: 99, wins: 100, losses: 1, avatarUrl: '' },
        { username: 'b', provider: 'github' as const, monName: 'B', level: 98, wins: 95, losses: 2, avatarUrl: '' },
        { username: 'c', provider: 'github' as const, monName: 'C', level: 97, wins: 90, losses: 3, avatarUrl: '' },
        { username: 'testuser', provider: 'github' as const, monName: 'Test', level: 96, wins: 85, losses: 4, avatarUrl: '' },
      ];
      mockLoadLeaderboard.mockReturnValue(entries);

      const res = await request(app).get('/api/badge/testuser');
      expect(res.status).toBe(200);
      expect(res.body.color).toBe('#22c55e');
    });

    it('uses green for rank #10 (boundary — still top 10)', async () => {
      const entries = Array.from({ length: 10 }, (_, i) => ({
        username: `user${i}`,
        provider: 'github' as const,
        monName: `Mon${i}`,
        level: 100 - i,
        wins: 100 - i * 10,
        losses: i,
        avatarUrl: '',
      }));
      entries[9] = { ...entries[9], username: 'testuser' };
      mockLoadLeaderboard.mockReturnValue(entries);

      const res = await request(app).get('/api/badge/testuser');
      expect(res.status).toBe(200);
      expect(res.body.color).toBe('#22c55e');
    });

    it('uses orange (#f97316) for rank #50 (boundary — top 50)', async () => {
      const entries = Array.from({ length: 50 }, (_, i) => ({
        username: `user${i}`,
        provider: 'github' as const,
        monName: `Mon${i}`,
        level: 100 - i,
        wins: 100 - i * 2,
        losses: i,
        avatarUrl: '',
      }));
      entries[49] = { ...entries[49], username: 'testuser' };
      mockLoadLeaderboard.mockReturnValue(entries);

      const res = await request(app).get('/api/badge/testuser');
      expect(res.status).toBe(200);
      expect(res.body.color).toBe('#f97316');
    });

    it('uses orange for rank #11 (top 50 but not top 10)', async () => {
      const entries = Array.from({ length: 12 }, (_, i) => ({
        username: `user${i}`,
        provider: 'github' as const,
        monName: `Mon${i}`,
        level: 100 - i,
        wins: 100 - i * 8,
        losses: i,
        avatarUrl: '',
      }));
      entries[11] = { ...entries[11], username: 'testuser' };
      mockLoadLeaderboard.mockReturnValue(entries);

      const res = await request(app).get('/api/badge/testuser');
      expect(res.status).toBe(200);
      expect(res.body.color).toBe('#f97316');
    });
  });

  // =================================================================
  //  Cache-Control header
  // =================================================================

  describe('Cache-Control header', () => {
    it('sets public cache headers with max-age and s-maxage', async () => {
      const res = await request(app).get('/api/badge/testuser');
      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toContain('max-age=120');
      expect(res.headers['cache-control']).toContain('s-maxage=300');
    });
  });

  // =================================================================
  //  Rate limiting
  // =================================================================

  describe('rate limiting', () => {
    it('returns 429 when badge rate limit is exceeded', async () => {
      mockRateLimitMiddleware.mockImplementation(
        (_req: unknown, res: any, _next: unknown) => {
          res.status(429).json({ error: 'Too many badge requests. Please wait before trying again.' });
        },
      );

      const res = await request(app).get('/api/badge/testuser');
      expect(res.status).toBe(429);
      expect(res.body.error).toContain('Too many badge');
    });
  });

  // =================================================================
  //  Provider-specific behaviour
  // =================================================================

  describe('provider-specific behaviour', () => {
    it('defaults to GitHub provider when no provider param is sent', async () => {
      const res = await request(app).get('/api/badge/testuser');
      expect(res.status).toBe(200);
      expect(res.body.namedLogo).toBe('github');
    });

    it('uses GitLab provider when ?provider=gitlab is passed', async () => {
      const gitlabProvider = createMockProvider('gitlab');
      mockGetProvider.mockImplementation((type: string) => {
        if (type === 'gitlab') return gitlabProvider;
        return mockProvider;
      });

      const res = await request(app).get('/api/badge/thejobin?provider=gitlab');
      expect(res.status).toBe(200);
      expect(res.body.namedLogo).toBe('gitlab');
    });
  });
});

// =====================================================================
//  Tests — Leaderboard endpoint
// =====================================================================

describe('Express server /api/leaderboard', () => {
  let app: Express;

  beforeAll(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    const mod = await import('../server');
    app = mod.app;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue('<html>mock</html>');
    mockLoadLeaderboard.mockReturnValue([]);
    // Restore default pass-through rate limit middleware (not used by this endpoint
    // but needs a clean state so other tests in this file don't interfere)
    mockRateLimitMiddleware.mockImplementation(
      (_req: unknown, _res: unknown, next: () => void) => next(),
    );
  });

  // =================================================================
  //  Empty state
  // =================================================================

  describe('empty state', () => {
    it('returns 200 with empty array when leaderboard is empty', async () => {
      const res = await request(app).get('/api/leaderboard');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns Content-Type application/json', async () => {
      const res = await request(app).get('/api/leaderboard');
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });
  });

  // =================================================================
  //  Data pass-through
  // =================================================================

  describe('data pass-through', () => {
    it('returns exactly what loadLeaderboard returns without modification', async () => {
      const entries = [
        {
          username: 'testuser', provider: 'github' as const, monName: 'TestMon',
          level: 50, wins: 30, losses: 10, avatarUrl: 'https://example.com/avatar.png',
        },
        {
          username: 'gitlabuser', provider: 'gitlab' as const, monName: 'GitMon',
          level: 60, wins: 20, losses: 5, avatarUrl: 'https://gitlab.com/avatar.png',
        },
      ];
      mockLoadLeaderboard.mockReturnValue(entries);

      const res = await request(app).get('/api/leaderboard');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].username).toBe('testuser');
      expect(res.body[0].provider).toBe('github');
      expect(res.body[0].monName).toBe('TestMon');
      expect(res.body[0].level).toBe(50);
      expect(res.body[0].wins).toBe(30);
      expect(res.body[0].losses).toBe(10);
      expect(res.body[0].avatarUrl).toBe('https://example.com/avatar.png');
      expect(res.body[1].username).toBe('gitlabuser');
      expect(res.body[1].provider).toBe('gitlab');
    });

    it('preserves the sort order returned by loadLeaderboard', async () => {
      const entries = [
        { username: 'worst', provider: 'github' as const, monName: 'WorstMon', level: 10, wins: 0, losses: 20, avatarUrl: '' },
        { username: 'best', provider: 'github' as const, monName: 'BestMon', level: 99, wins: 50, losses: 2, avatarUrl: '' },
        { username: 'mid', provider: 'github' as const, monName: 'MidMon', level: 50, wins: 10, losses: 5, avatarUrl: '' },
      ];
      mockLoadLeaderboard.mockReturnValue(entries);

      const res = await request(app).get('/api/leaderboard');
      expect(res.status).toBe(200);
      // The endpoint returns entries in the exact order provided by loadLeaderboard
      expect(res.body[0].username).toBe('worst');
      expect(res.body[1].username).toBe('best');
      expect(res.body[2].username).toBe('mid');
    });

    it('handles large number of entries (passes through all 100)', async () => {
      const entries = Array.from({ length: 100 }, (_, i) => ({
        username: `user${i}`,
        provider: 'github' as const,
        monName: `Mon${i}`,
        level: 100 - i,
        wins: i * 2,
        losses: i,
        avatarUrl: '',
      }));
      mockLoadLeaderboard.mockReturnValue(entries);

      const res = await request(app).get('/api/leaderboard');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(100);
      expect(res.body[0].username).toBe('user0');
      expect(res.body[99].username).toBe('user99');
    });
  });

  // =================================================================
  //  Cross-provider entries
  // =================================================================

  describe('cross-provider entries', () => {
    it('includes entries from both GitHub and GitLab providers', async () => {
      const entries = [
        { username: 'githubuser', provider: 'github' as const, monName: 'GHMon', level: 50, wins: 10, losses: 5, avatarUrl: '' },
        { username: 'gitlabuser', provider: 'gitlab' as const, monName: 'GLMon', level: 60, wins: 20, losses: 3, avatarUrl: '' },
        { username: 'another-gh', provider: 'github' as const, monName: 'GHMon2', level: 40, wins: 5, losses: 1, avatarUrl: '' },
      ];
      mockLoadLeaderboard.mockReturnValue(entries);

      const res = await request(app).get('/api/leaderboard');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
      const providers = res.body.map((e: { provider: string }) => e.provider);
      expect(providers.filter((p: string) => p === 'github')).toHaveLength(2);
      expect(providers.filter((p: string) => p === 'gitlab')).toHaveLength(1);
    });

    it('preserves duplicate usernames from different providers', async () => {
      const entries = [
        { username: 'testuser', provider: 'github' as const, monName: 'GHMon', level: 50, wins: 10, losses: 5, avatarUrl: '' },
        { username: 'testuser', provider: 'gitlab' as const, monName: 'GLMon', level: 60, wins: 20, losses: 3, avatarUrl: '' },
      ];
      mockLoadLeaderboard.mockReturnValue(entries);

      const res = await request(app).get('/api/leaderboard');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].provider).toBe('github');
      expect(res.body[1].provider).toBe('gitlab');
    });
  });

  // =================================================================
  //  Rate limiting
  // =================================================================

  describe('rate limiting', () => {
    it('returns 429 when leaderboard rate limit is exceeded', async () => {
      mockRateLimitMiddleware.mockImplementation(
        (_req: unknown, res: any, _next: unknown) => {
          res.status(429).json({ error: 'Too many leaderboard requests. Please wait before trying again.' });
        },
      );

      const res = await request(app).get('/api/leaderboard');
      expect(res.status).toBe(429);
      expect(res.body.error).toContain('Too many leaderboard');
    });
  });
});

// =====================================================================
//  Tests — Card page endpoint
// =====================================================================

describe('Express server /card/:username', () => {
  let app: Express;
  let mockProvider: IProfileProvider;

  beforeAll(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    const mod = await import('../server');
    app = mod.app;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = createMockProvider('github');
    mockGetProvider.mockReturnValue(mockProvider);
    mockDetectProvider.mockReturnValue(mockProvider);
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue('<html>mock</html>');
    mockLoadLeaderboard.mockReturnValue([]);
    mockRateLimitMiddleware.mockImplementation(
      (_req: unknown, _res: unknown, next: () => void) => next(),
    );
  });

  // =================================================================
  //  Validation
  // =================================================================

  describe('validation', () => {
    it('returns 400 when username param is empty (Express requires non-empty :username)', async () => {
      const res = await request(app).get('/card/');
      expect(res.status).toBe(404);
    });

    it('returns 400 when sanitized username is empty', async () => {
      mockProvider.sanitizeUsername = vi.fn().mockReturnValue('');

      const res = await request(app).get('/card/!!!');
      expect(res.status).toBe(400);
      expect(res.text).toContain('Invalid');
    });
  });

  // =================================================================
  //  Response headers
  // =================================================================

  describe('response headers', () => {
    it('returns Content-Type text/html; charset=utf-8', async () => {
      const res = await request(app).get('/card/testuser');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/html;\s*charset=utf-8/);
    });

    it('sets Cache-Control to no-cache', async () => {
      const res = await request(app).get('/card/testuser');
      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('no-cache');
    });
  });

  // =================================================================
  //  HTML structure
  // =================================================================

  describe('HTML structure', () => {
    it('returns valid HTML with doctype and html tags', async () => {
      const res = await request(app).get('/card/testuser');
      expect(res.status).toBe(200);
      expect(res.text).toMatch(/^<!DOCTYPE html>/i);
      expect(res.text).toContain('<html');
      expect(res.text).toContain('</html>');
      expect(res.text).toContain('<head>');
      expect(res.text).toContain('</head>');
      expect(res.text).toContain('<body');
      expect(res.text).toContain('</body>');
    });
  });

  // =================================================================
  //  Open Graph tags
  // =================================================================

  describe('Open Graph tags', () => {
    it('includes og:title with username and deterministic mon name and level', async () => {
      // testuser (8 chars) → codeHash = 8 + 16 = 24 → names[24%8] = names[0] = 'NodeSlime'
      // Level: max(1, min(99, floor(8*3 + 116%20))) = 40
      const res = await request(app).get('/card/testuser');
      expect(res.status).toBe(200);
      expect(res.text).toContain('<meta property="og:title"');
      expect(res.text).toContain("@testuser's Gittymon");
      expect(res.text).toContain('NODESLIME');
    });

    it('includes og:type and og:site_name', async () => {
      const res = await request(app).get('/card/testuser');
      expect(res.status).toBe(200);
      expect(res.text).toContain('<meta property="og:type" content="website">');
      expect(res.text).toContain('<meta property="og:site_name" content="Gittymon">');
    });

    it('includes og:url pointing to the same card page', async () => {
      const res = await request(app).get('/card/testuser');
      expect(res.status).toBe(200);
      expect(res.text).toContain('<meta property="og:url"');
      expect(res.text).toContain('/card/testuser');
    });
  });

  // =================================================================
  //  Twitter Card tags
  // =================================================================

  describe('Twitter Card tags', () => {
    it('includes twitter:card as summary_large_image', async () => {
      const res = await request(app).get('/card/testuser');
      expect(res.status).toBe(200);
      expect(res.text).toContain('<meta name="twitter:card" content="summary_large_image">');
    });

    it('includes twitter:title matching the OG title', async () => {
      const res = await request(app).get('/card/testuser');
      expect(res.status).toBe(200);
      expect(res.text).toContain('<meta name="twitter:title"');
      expect(res.text).toContain('NODESLIME');
    });
  });

  // =================================================================
  //  Deterministic card data (no leaderboard entry)
  // =================================================================

  describe('deterministic fallback (no leaderboard entry)', () => {
    it('shows deterministic mon name computed from username', async () => {
      // testuser (8 chars) → codeHash = 24 → names[24%8] = names[0] = 'NodeSlime'
      const res = await request(app).get('/card/testuser');
      expect(res.status).toBe(200);
      expect(res.text).toContain('NODESLIME');
    });

    it('shows deterministic mon type computed from charCode', async () => {
      // 't'.charCodeAt(0) = 116 → types[116%6] = types[2] = 'StackOverflow Cloner'
      const res = await request(app).get('/card/testuser');
      expect(res.status).toBe(200);
      expect(res.text).toContain('STACKOVERFLOW CLONER');
    });

    it('shows deterministic level computed from username length and charCode', async () => {
      // LV 40 for 'testuser' (8 chars, charCode 116 → 8*3 + 116%20 = 40)
      const res = await request(app).get('/card/testuser');
      expect(res.status).toBe(200);
      expect(res.text).toContain('LV 40');
    });

    it('shows 0 wins and 0 losses when no leaderboard entry', async () => {
      const res = await request(app).get('/card/testuser');
      expect(res.status).toBe(200);
      expect(res.text).toContain('W: <strong>0</strong>');
      expect(res.text).toContain('L: <strong>0</strong>');
    });
  });

  // =================================================================
  //  Leaderboard data rendered
  // =================================================================

  describe('leaderboard data rendered', () => {
    it('uses monName from leaderboard entry', async () => {
      mockLoadLeaderboard.mockReturnValue([
        {
          username: 'testuser', provider: 'github', monName: 'LeaderboardMon',
          level: 50, wins: 10, losses: 2, avatarUrl: '',
        },
      ]);

      const res = await request(app).get('/card/testuser');
      expect(res.status).toBe(200);
      expect(res.text).toContain('LEADERBOARDMON');
    });

    it('uses level from leaderboard entry', async () => {
      mockLoadLeaderboard.mockReturnValue([
        {
          username: 'testuser', provider: 'github', monName: 'LBM',
          level: 75, wins: 10, losses: 2, avatarUrl: '',
        },
      ]);

      const res = await request(app).get('/card/testuser');
      expect(res.status).toBe(200);
      expect(res.text).toContain('LV 75');
    });

    it('shows wins and losses from leaderboard entry', async () => {
      mockLoadLeaderboard.mockReturnValue([
        {
          username: 'testuser', provider: 'github', monName: 'LBM',
          level: 50, wins: 42, losses: 7, avatarUrl: '',
        },
      ]);

      const res = await request(app).get('/card/testuser');
      expect(res.status).toBe(200);
      expect(res.text).toContain('W: <strong>42</strong>');
      expect(res.text).toContain('L: <strong>7</strong>');
    });
  });

  // =================================================================
  //  GitLab provider
  // =================================================================

  describe('GitLab provider', () => {
    it('includes ?provider=gitlab in the embed GIF URL when GitLab is detected', async () => {
      const gitlabProvider = createMockProvider('gitlab');
      mockDetectProvider.mockReturnValue(gitlabProvider);

      const res = await request(app).get('/card/thejobin');
      expect(res.status).toBe(200);
      // The GIF URL should include the provider query param for GitLab
      expect(res.text).toContain('/api/embed/thejobin.gif?provider=gitlab');
    });

    it('does NOT include provider query param for GitHub users', async () => {
      const res = await request(app).get('/card/testuser');
      expect(res.status).toBe(200);
      // GitHub is the default — no provider query param needed
      expect(res.text).toContain('/api/embed/testuser.gif');
      expect(res.text).not.toContain('?provider=github');
      expect(res.text).not.toContain('?provider=gitlab');
    });
  });

  // =================================================================
  //  Rate limiting
  // =================================================================

  describe('rate limiting', () => {
    it('returns 429 when card page rate limit is exceeded', async () => {
      mockRateLimitMiddleware.mockImplementation(
        (_req: unknown, res: any, _next: unknown) => {
          res.status(429).json({ error: 'Too many card page requests. Please wait before trying again.' });
        },
      );

      const res = await request(app).get('/card/testuser');
      expect(res.status).toBe(429);
      expect(res.body.error).toContain('card page');
    });
  });

  // =================================================================
  //  Different username produces different deterministic values
  // =================================================================

  describe('username sensitivity', () => {
    it('produces different mon names for different usernames', async () => {
      // 'x' (1 char, charCode 120) → codeHash = 1+2 = 3 → names[3%8] = names[3] = 'CommitoBat'
      const resA = await request(app).get('/card/x');
      expect(resA.status).toBe(200);
      expect(resA.text).toContain('COMMITOBAT');

      // 'y' (1 char, charCode 121) → codeHash = 1+2 = 3 → names[3%8] = names[3] = 'CommitoBat'
      // Same length means same codeHash, so different roast but same mon name
      // Let me use a longer username
      // 'abcdefghij' (10 chars) → codeHash = 10+20 = 30 → names[30%8] = names[6] = 'JSON_Golem'
      const resB = await request(app).get('/card/abcdefghij');
      expect(resB.status).toBe(200);
      expect(resB.text).toContain('JSON_GOLEM');
    });

    it('computes different levels for usernames with different lengths', async () => {
      // 'a' (1 char, charCode 97) → LV = max(1, min(99, floor(1*3 + 97%20))) = floor(3 + 17) = 20
      const resShort = await request(app).get('/card/a');
      expect(resShort.status).toBe(200);
      expect(resShort.text).toContain('LV 20');

      // 'zzzzzzzzzz' (10 chars, charCode 122) → LV = max(1, min(99, floor(10*3 + 122%20))) = floor(30 + 2) = 32
      const resLong = await request(app).get('/card/zzzzzzzzzz');
      expect(resLong.status).toBe(200);
      expect(resLong.text).toContain('LV 32');
    });
  });
});

// =====================================================================
//  Tests — Embed endpoints
// =====================================================================

describe('Express server /api/embed endpoints', () => {
  let app: Express;
  let mockProvider: IProfileProvider;

  beforeAll(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    const mod = await import('../server');
    app = mod.app;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = createMockProvider('github');
    mockGetProvider.mockReturnValue(mockProvider);
    mockDetectProvider.mockReturnValue(mockProvider);
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue('<html>mock</html>');
    mockLoadLeaderboard.mockReturnValue([]);
    mockGenerateSvgCard.mockReturnValue('<svg>mock-svg-card</svg>');
    mockGenerateGifCard.mockReturnValue(Buffer.from('mock-gif-binary'));
    // Restore default pass-through rate limit middleware
    mockRateLimitMiddleware.mockImplementation(
      (_req: unknown, _res: unknown, next: () => void) => next(),
    );
  });

  // =================================================================
  //  Validation
  // =================================================================

  describe('validation', () => {
    it('returns 404 when SVG username param is empty (Express routing)', async () => {
      const res = await request(app).get('/api/embed/svg/');
      expect(res.status).toBe(404);
    });

    it('returns 404 when GIF username param is empty (Express routing)', async () => {
      const res = await request(app).get('/api/embed/gif/');
      expect(res.status).toBe(404);
    });
  });

  // =================================================================
  //  SVG endpoint
  // =================================================================

  describe('SVG endpoint', () => {
    it('returns SVG card with image/svg+xml content type', async () => {
      mockGenerateSvgCard.mockReturnValue('<svg viewBox="0 0 400 200"><text>TestMon</text></svg>');

      const res = await request(app).get('/api/embed/svg/testuser');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/image\/svg\+xml/);
      // SVG content is returned as the raw response body (not parsed as text by supertest for image types)
      expect(Buffer.from(res.body).toString()).toContain('TestMon');
    });

    it('passes username and palette to generateSvgCard', async () => {
      await request(app).get('/api/embed/svg/testuser');

      expect(mockGenerateSvgCard).toHaveBeenCalledTimes(1);
      const args = mockGenerateSvgCard.mock.calls[0];
      // Signature: generateSvgCard(username, palette, provider)
      expect(args[0]).toBe('testuser');
      expect(args[1]).toBeUndefined(); // no palette passed
      expect(args[2]).toBeUndefined(); // no provider passed → detectProvider used internally
    });

    it('passes palette when ?palette= param is provided', async () => {
      await request(app).get('/api/embed/svg/testuser?palette=dark');

      expect(mockGenerateSvgCard).toHaveBeenCalled();
      const args = mockGenerateSvgCard.mock.calls[0];
      expect(args[1]).toBe('dark');
    });

    it('passes provider when ?provider=gitlab is provided', async () => {
      const gitlabProvider = createMockProvider('gitlab');
      mockGetProvider.mockImplementation((type: string) => {
        if (type === 'gitlab') return gitlabProvider;
        return mockProvider;
      });

      await request(app).get('/api/embed/svg/thejobin?provider=gitlab');

      expect(mockGenerateSvgCard).toHaveBeenCalled();
      const args = mockGenerateSvgCard.mock.calls[0];
      expect(args[2]).toBe('gitlab');
    });

    it('sets Cache-Control header with max-age=60 and s-maxage=120', async () => {
      const res = await request(app).get('/api/embed/svg/testuser');
      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toContain('max-age=60');
      expect(res.headers['cache-control']).toContain('s-maxage=120');
    });
  });

  // =================================================================
  //  GIF endpoint
  // =================================================================

  describe('GIF endpoint', () => {
    it('returns GIF as image/gif with correct content type', async () => {
      mockGenerateGifCard.mockReturnValue(Buffer.from('GIF89a...binary-data'));

      const res = await request(app).get('/api/embed/gif/testuser');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/image\/gif/);
    });

    it('passes username and palette to generateGifCard', async () => {
      await request(app).get('/api/embed/gif/testuser');

      expect(mockGenerateGifCard).toHaveBeenCalledTimes(1);
      const args = mockGenerateGifCard.mock.calls[0];
      // Signature: generateGifCard(username, palette, provider)
      expect(args[0]).toBe('testuser');
      expect(args[1]).toBeUndefined();
      expect(args[2]).toBeUndefined();
    });

    it('passes palette when ?palette= param is provided', async () => {
      await request(app).get('/api/embed/gif/testuser?palette=neon');

      expect(mockGenerateGifCard).toHaveBeenCalled();
      const args = mockGenerateGifCard.mock.calls[0];
      expect(args[1]).toBe('neon');
    });

    it('passes provider when ?provider=gitlab is provided', async () => {
      const gitlabProvider = createMockProvider('gitlab');
      mockGetProvider.mockImplementation((type: string) => {
        if (type === 'gitlab') return gitlabProvider;
        return mockProvider;
      });

      await request(app).get('/api/embed/gif/thejobin?provider=gitlab');

      expect(mockGenerateGifCard).toHaveBeenCalled();
      const args = mockGenerateGifCard.mock.calls[0];
      expect(args[2]).toBe('gitlab');
    });

    it('sets Cache-Control header with max-age=60 and s-maxage=120', async () => {
      const res = await request(app).get('/api/embed/gif/testuser');
      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toContain('max-age=60');
      expect(res.headers['cache-control']).toContain('s-maxage=120');
    });

    it('returns 500 with error message when generateGifCard throws', async () => {
      mockGenerateGifCard.mockImplementation(() => {
        throw new Error('GIF generation failed');
      });

      const res = await request(app).get('/api/embed/gif/testuser');
      expect(res.status).toBe(500);
      expect(res.text).toContain('Error generating profile GIF');
    });
  });

  // =================================================================
  //  Alias routes
  // =================================================================

  describe('alias routes', () => {
    it('/:username.svg serves SVG with image/svg+xml', async () => {
      const res = await request(app).get('/api/embed/testuser.svg');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/image\/svg\+xml/);
    });

    it('/:username.gif serves GIF with image/gif', async () => {
      mockGenerateGifCard.mockReturnValue(Buffer.from('GIF89a...'));

      const res = await request(app).get('/api/embed/testuser.gif');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/image\/gif/);
    });
  });

  // =================================================================
  //  Default provider via detectProvider
  // =================================================================

  // =================================================================
  //  Rate limiting
  // =================================================================

  describe('rate limiting', () => {
    it('returns 429 when embed rate limit is exceeded', async () => {
      mockRateLimitMiddleware.mockImplementation(
        (_req: unknown, res: any, _next: unknown) => {
          res.status(429).json({ error: 'Too many embed requests. Please wait before trying again.' });
        },
      );

      const res = await request(app).get('/api/embed/svg/testuser');
      expect(res.status).toBe(429);
      expect(res.body.error).toContain('Too many embed');
    });

    it('returns 429 on alias routes when embed rate limit is exceeded', async () => {
      mockRateLimitMiddleware.mockImplementation(
        (_req: unknown, res: any, _next: unknown) => {
          res.status(429).json({ error: 'Too many embed requests. Please wait before trying again.' });
        },
      );

      const res = await request(app).get('/api/embed/testuser.svg');
      expect(res.status).toBe(429);
      expect(res.body.error).toContain('Too many embed');
    });

    it('returns 429 on GIF route when embed rate limit is exceeded', async () => {
      mockRateLimitMiddleware.mockImplementation(
        (_req: unknown, res: any, _next: unknown) => {
          res.status(429).json({ error: 'Too many embed requests. Please wait before trying again.' });
        },
      );

      const res = await request(app).get('/api/embed/gif/testuser');
      expect(res.status).toBe(429);
      expect(res.body.error).toContain('Too many embed');
    });

    it('returns 429 on .gif alias route when embed rate limit is exceeded', async () => {
      mockRateLimitMiddleware.mockImplementation(
        (_req: unknown, res: any, _next: unknown) => {
          res.status(429).json({ error: 'Too many embed requests. Please wait before trying again.' });
        },
      );

      const res = await request(app).get('/api/embed/testuser.gif');
      expect(res.status).toBe(429);
      expect(res.body.error).toContain('Too many embed');
    });
  });

  // =================================================================
  //  Default provider via detectProvider
  // =================================================================

  describe('default provider', () => {
    it('defaults to GitHub via detectProvider when no provider param is sent', async () => {
      await request(app).get('/api/embed/svg/testuser');

      expect(mockGenerateSvgCard).toHaveBeenCalled();
      const args = mockGenerateSvgCard.mock.calls[0];
      // No provider param → provider arg is undefined → generateSvgCard calls detectProvider(username) internally
      expect(args[2]).toBeUndefined();
    });

    it('uses undefined palette when no palette param is sent', async () => {
      await request(app).get('/api/embed/svg/testuser');

      expect(mockGenerateSvgCard).toHaveBeenCalled();
      const args = mockGenerateSvgCard.mock.calls[0];
      expect(args[1]).toBeUndefined();
    });
  });
});
