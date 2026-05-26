import { loadLeaderboard, recordMatchResult } from './leaderboard';
import { lookupSummonCache, addToSummonCache } from './summonCache';
import { generateSvgCard, generateGifCard } from './embed';
import { GameServer } from './multiplayer';
import { Env, RoastMon, GithubData, GroqResponse, AiBossCommentRequest, BadgeResponse } from './types';
import { SHELL_HTML } from './shellHtml';
import { render } from './entry-server';

// Cached SSR HTML — the SPA always renders the same initial splash screen,
// so we render once and reuse the result across requests per Worker isolate.
let ssrResult: string | null = null;

async function getSsrHtml(): Promise<string> {
  if (ssrResult != null) return ssrResult;
  try {
    ssrResult = await render();
  } catch (err) {
    console.error('SSR render failed:', err);
    ssrResult = '';
  }
  return ssrResult;
}

export { GameServer };

// ======== Helpers ========
const escapeHtml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function generateMockRoastMon(githubData: GithubData, username: string): RoastMon {
  const codeHash = username.length + githubData.public_repos;
  const hp = Math.max(25, Math.min(99, 30 + (githubData.followers * 3) % 70));
  const attack = Math.max(25, Math.min(99, 40 + (githubData.public_repos * 2) % 60));
  const defense = Math.max(25, Math.min(99, 50 + (parseInt(githubData.joinedYear) % 10) * 5));
  const speed = Math.max(25, Math.min(99, 45 + (username.charCodeAt(0) % 50)));
  const chaos = Math.max(25, Math.min(99, 10 + (githubData.public_repos * 5) % 90));
  const names = ['NodeSlime','Forkachu','AsyncPod','CommitoBat','Dockergon','GitSlasher','JSON_Golem','BugMander'];
  const name = names[codeHash % names.length];
  const types = ['Direct-to-master','AnyScript-Type','StackOverflow Cloner','Merge-Fearful','Coffee-Fueled','Infinite-Loop'];
  const type = types[username.charCodeAt(0) % types.length];
  const roasts = [
    `Has ${githubData.public_repos} archives but only uses Git Push --Force. Afraid of real code review.`,
    `Bio is literally blank. Stalks StackOverflow daily hoping nobody notices they copying code.`,
    `Has followers: ${githubData.followers}. Most of them are bot accounts. Coding style is pure legacy.`,
    `Joined in ${githubData.joinedYear}. Still types 'sudo' on every line of terminal because of trust issues.`
  ];
  const roast = roasts[codeHash % roasts.length];
  return {
    username, name,
    avatarUrl: githubData.avatar_url,
    type,
    level: Math.max(1, Math.min(99, Math.floor(githubData.public_repos * 1.5 + githubData.followers))),
    bio: githubData.bio, roast,
    stats: { hp, attack, defense, speed, chaos },
    moves: [
      { name: 'Git Commit Force', power: 75, desc: 'Bypasses CI pipelines like a wild cowboy.' },
      { name: 'Nuke node_modules', power: 55, desc: 'Deletes dependencies to solve simple lint issues.' },
      { name: 'StackOverflow Clone', power: 45, desc: 'Instantly copies code without understanding how it works.' },
      { name: 'Cry in Terminal', power: 20, desc: 'Reduces opponent defense from sheer pity.' },
    ],
    joinedYear: githubData.joinedYear,
    publicRepos: githubData.public_repos,
    followers: githubData.followers,
    location: githubData.location,
    spriteSeed: `${username}-${githubData.joinedYear}-${githubData.public_repos}`,
  };
}

// ======== Static SEO Routes ========

const ROBOTS_TXT = `User-agent: *
Allow: /

# Disallow internal API endpoints
Disallow: /api/

# Sitemap
Sitemap: https://gittymon.dev/sitemap.xml
`;

const SITE_URL = 'https://gittymon.dev';
const SITEMAP_TTL_MS = 3600_000; // 1 hour — rebuild sitemap periodically to reflect leaderboard changes

// Cached sitemap with expiry — regenerated when the cached copy is older than SITEMAP_TTL_MS
let cachedSitemap: string | null = null;
let lastSitemapFetch: number = 0;

async function getSitemap(env: Env): Promise<string> {
  const now = Date.now();
  if (cachedSitemap != null && (now - lastSitemapFetch) < SITEMAP_TTL_MS) {
    return cachedSitemap;
  }
  try {
    cachedSitemap = await buildSitemap(env);
    lastSitemapFetch = now;
  } catch (err) {
    console.error('Sitemap build failed:', err);
    // If we have a stale cache, keep using it rather than returning nothing
    if (cachedSitemap == null) {
      cachedSitemap = await buildSitemapFallback();
      lastSitemapFetch = now;
    }
  }
  return cachedSitemap;
}

async function buildSitemap(env: Env): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  let urls = `<url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`;

  const leaderboard = await loadLeaderboard(env.LEADERBOARD);
  for (const entry of leaderboard) {
    const safeUsername = entry.username.replace(/[&<>"']/g, '');
    // Use lastBattledAt when available for accurate lastmod, fall back to today
    const lastmod = entry.lastBattledAt ? entry.lastBattledAt.slice(0, 10) : today;
    urls += `
  <url>
    <loc>${SITE_URL}/card/${escapeXml(safeUsername)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;
}

function buildSitemapFallback(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/**
 * Inject dynamic SEO metadata into the SPA shell HTML.
 */
function injectSeoMeta(html: string, origin: string): string {
  const absOrigin = origin;
  return html
    .replace('<!-- CANONICAL_INJECTED_BY_SERVER -->', `<link rel="canonical" href="${absOrigin}/">`)
    .replace('<!-- OG_URL_INJECTED_BY_SERVER -->', `<meta property="og:url" content="${absOrigin}/">`)
    .replace('<!-- OG_IMAGE_INJECTED_BY_SERVER -->', `<meta property="og:image" content="${absOrigin}/social-preview.png">`)
    .replace('<!-- TWITTER_IMAGE_INJECTED_BY_SERVER -->', `<meta name="twitter:image" content="${absOrigin}/social-preview.png">`);
}

// ======== Main Worker ========
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = `${url.protocol}//${url.host}`;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(url.origin) });
    }

    try {
      // ---- SEO Routes (served before ASSETS so they work without a file) ----
      if (path === '/robots.txt') {
        return new Response(ROBOTS_TXT, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'max-age=86400' },
        });
      }

      if (path === '/sitemap.xml') {
        const sitemap = await getSitemap(env);
        return new Response(sitemap, {
          headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'max-age=3600, s-maxage=3600, stale-while-revalidate=86400' },
        });
      }

      // ---- WebSocket upgrade for multiplayer ----
      if (path === '/ws' || path.startsWith('/ws/')) {
        const id = env.GAME_SERVER.idFromName('global-lobby');
        const stub = env.GAME_SERVER.get(id);
        return stub.fetch(request);
      }

      // ---- API Routes ----
      if (path.startsWith('/api/')) {
        return handleApiRoute(request, env, ctx, url, origin);
      }

      // ---- Card Pages ----
      const cardMatch = path.match(/^\/card\/([^/]+)$/);
      if (cardMatch) {
        return handleCardPage(request, env, cardMatch[1], origin);
      }

      // ---- Static Assets ----
      // Serve static files from the assets directory. In dev (via @cloudflare/vite-plugin), the ASSETS
      // binding proxies to Vite which can transform source files (.tsx, .ts) on the fly. In production,
      // ASSETS only has built files — source file requests get 404, caught by the handler below.
      if (request.method === 'GET' || request.method === 'HEAD') {
        try {
          const assetResponse = await env.ASSETS.fetch(request);
          if (assetResponse.status !== 404) {
            return assetResponse;
          }
        } catch {
          // ASSETS.fetch may throw if the binding is unavailable (e.g., local dev)
        }
      }

      // ---- Unhandled file extensions ----
      // If a path has a file extension and wasn't served by ASSETS, return 404.
      // This prevents source files (.tsx, .ts, .jsx, .js) from being served as HTML.
      const hasFileExtension = path.includes('.') && !path.endsWith('/');
      if (hasFileExtension && path !== '/') {
        return new Response('Not Found', { status: 404 });
      }

      // ---- SPA Routes & Root (with SSR + SEO injection) ----
      // Fall through: serve index.html for all non-file routes that weren't matched by ASSETS
      let html = SHELL_HTML;

      // Server-side render the React app for initial page load SEO
      // (rendered once and cached — the SPA always shows the same splash screen)
      const appHtml = await getSsrHtml();
      if (appHtml) {
        html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
      }

      html = injectSeoMeta(html, origin);
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Worker error:', err);
      return new Response(JSON.stringify({ error: 'Internal Server Error', message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};

// ======== API Router ========
async function handleApiRoute(request: Request, env: Env, ctx: ExecutionContext, url: URL, origin: string): Promise<Response> {
  const path = url.pathname;

  // POST /api/summon
  if (path === '/api/summon' && request.method === 'POST') {
    return handleSummon(request, env);
  }

  // POST /api/revalidate-sitemap — invalidate cached sitemap so it rebuilds on next request
  if (path === '/api/revalidate-sitemap' && request.method === 'POST') {
    if (env.REVALIDATE_KEY) {
      const providedKey = request.headers.get('X-Revalidate-Key');
      if (providedKey !== env.REVALIDATE_KEY) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    lastSitemapFetch = 0;
    cachedSitemap = null;
    return new Response(JSON.stringify({ ok: true, message: 'Sitemap cache invalidated' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // GET /api/leaderboard
  if (path === '/api/leaderboard') {
    const leaderboard = await loadLeaderboard(env.LEADERBOARD);
    return new Response(JSON.stringify(leaderboard), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=30, s-maxage=60' },
    });
  }

  // POST /api/ai-boss-comment
  if (path === '/api/ai-boss-comment' && request.method === 'POST') {
    return handleAiBossComment(request, env);
  }

  // GET /api/embed/svg/:username
  const svgMatch = path.match(/^\/api\/embed\/svg\/([^/]+)$/);
  if (svgMatch) {
    const svg = await generateSvgCard(svgMatch[1], env);
    return new Response(svg, {
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'max-age=60, s-maxage=120' },
    });
  }

  // GET /api/embed/:username.svg
  const svgAltMatch = path.match(/^\/api\/embed\/([^/]+)\.svg$/);
  if (svgAltMatch) {
    const svg = await generateSvgCard(svgAltMatch[1], env);
    return new Response(svg, {
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'max-age=60, s-maxage=120' },
    });
  }

  // GET /api/embed/gif/:username
  const gifMatch = path.match(/^\/api\/embed\/gif\/([^/]+)$/);
  if (gifMatch) {
    const gif = await generateGifCard(gifMatch[1], env);
    return new Response(gif, {
      headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'max-age=60, s-maxage=120' },
    });
  }

  // GET /api/embed/:username.gif
  const gifAltMatch = path.match(/^\/api\/embed\/([^/]+)\.gif$/);
  if (gifAltMatch) {
    const gif = await generateGifCard(gifAltMatch[1], env);
    return new Response(gif, {
      headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'max-age=60, s-maxage=120' },
    });
  }

  // GET /api/badge/:username
  const badgeMatch = path.match(/^\/api\/badge\/([^/]+)$/);
  if (badgeMatch) {
    return handleBadge(badgeMatch[1], env);
  }

  return new Response('Not Found', { status: 404 });
}

// ======== Summon Handler ========
async function handleSummon(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;
  const { username } = body;

  if (!username || typeof username !== 'string' || !username.trim()) {
    return new Response(JSON.stringify({ error: 'GitHub username is required.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const cleanUsername = username.trim().replace(/[^a-zA-Z0-9-]/g, '');
  const isRefresh = body.refresh === true;

  // Check cache
  if (!isRefresh) {
    const cached = await lookupSummonCache(env.SUMMON_CACHE, cleanUsername);
    if (cached) return new Response(JSON.stringify(cached), { headers: { 'Content-Type': 'application/json' } });
  }

  let githubData: GithubData = {
    name: cleanUsername, public_repos: 12, followers: 4,
    location: 'Internet Wilderness', joinedYear: '2022',
    bio: 'A mysterious code crafter.',
    avatar_url: `https://github.com/${cleanUsername}.png`
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);
    const ghResponse = await fetch(`https://api.github.com/users/${cleanUsername}`, {
      headers: { 'User-Agent': 'RoastMonGameboyApplet' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (ghResponse.ok) {
      const data = await ghResponse.json() as Record<string, unknown>;
      githubData = {
        name: (data.name as string) || cleanUsername,
        public_repos: (data.public_repos as number) ?? 10,
        followers: (data.followers as number) ?? 2,
        location: (data.location as string) || 'Unknown Coordinates',
        joinedYear: data.created_at ? new Date(data.created_at as string).getFullYear().toString() : '2021',
        bio: (data.bio as string) || 'Code without comments, coffee without milk.',
        avatar_url: (data.avatar_url as string) || `https://github.com/${cleanUsername}.png`,
      };
    }
  } catch (err) {
    console.warn('GitHub API error, using fallback:', err);
  }

  // Try Groq AI
  const groqApiKey = env.GROQ_API_KEY;
  if (groqApiKey) {
    try {
      const resultMon = await callGroqSummon(groqApiKey, cleanUsername, githubData);
      await addToSummonCache(env.SUMMON_CACHE, cleanUsername, resultMon);
      return new Response(JSON.stringify(resultMon), { headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
      console.error('Groq error:', err);
    }
  }

  // Fallback: generate mock
  const mockState = generateMockRoastMon(githubData, cleanUsername);
  await addToSummonCache(env.SUMMON_CACHE, cleanUsername, mockState);
  return new Response(JSON.stringify(mockState), { headers: { 'Content-Type': 'application/json' } });
}

async function callGroqSummon(apiKey: string, cleanUsername: string, githubData: GithubData): Promise<RoastMon> {
  const systemPrompt = `You are an elite, sarcastic, witty retro RPG narrator for "ROAST-MON" (inspired by Pokemon, 8-bit games, and funny coding critiques).

You must respond with valid JSON matching this exact schema:
{
  "name": "string (creative monster name like Commitobat, Forkachu, LegacyGhost)",
  "type": "string (fictional RPG type like NullPointer, DirectMaster, CoffeeFueled)",
  "roast": "string (funny biting developer roast, MAX 150 characters)",
  "stats": { "hp": "number 10-100", "attack": "number 10-100", "defense": "number 10-100", "speed": "number 10-100", "chaos": "number 10-100" },
  "moves": [ { "name": "string", "power": "number 10-100", "desc": "string" } ]
}
Exactly 4 moves. Return ONLY valid JSON, no other text.`;

  const userPrompt = `Analyze this GitHub user's metrics:
- Username: ${cleanUsername}
- Real Name: ${githubData.name}
- Bio: "${githubData.bio}"
- Public Repos: ${githubData.public_repos}
- Followers: ${githubData.followers}
- Joined GitHub: ${githubData.joinedYear}
- Location: ${githubData.location}

Summon their customized 8-bit "ROAST-MON" creature!
1. Choose a funny, mock Poke-style monster name fitting for a software engineer (e.g. Commitobat, Monadon, Forkachu, Bugmander, NodeSlime, Dockergon, Asyncopod).
2. Choose a type (e.g. "Direct-to-master", "Coffee-Fueled", "Recursive Nightmare", "Unresolved Conflict", "Legacy Ghost", "AnyScript", "StackOverflow Cloner", "Infinite-Loop").
3. Write a hilarious, biting, yet playful 8-bit RPG-style ROAST. MAX 150 characters.
4. Assign stats (HP, Attack, Defense, Speed, Chaos) between 10 and 100.
5. Formulate exactly 4 funny custom battle moves with name, power (10-100), and short description.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 1200,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const responseData = await response.json() as GroqResponse;
  const responseText = responseData.choices?.[0]?.message?.content || '';
  const parsedData = JSON.parse(responseText.trim());

  return {
    username: cleanUsername,
    name: parsedData.name || `${cleanUsername}mon`,
    avatarUrl: githubData.avatar_url,
    type: parsedData.type || 'Standard Dev',
    level: Math.max(1, Math.min(99, Math.floor((githubData.public_repos * 1.5) + (githubData.followers / 2)))),
    bio: githubData.bio,
    roast: parsedData.roast || 'Spends too much time polishing buttons and not committing code.',
    stats: {
      hp: parsedData.stats?.hp ?? 50,
      attack: parsedData.stats?.attack ?? 50,
      defense: parsedData.stats?.defense ?? 50,
      speed: parsedData.stats?.speed ?? 50,
      chaos: parsedData.stats?.chaos ?? 50,
    },
    moves: (parsedData.moves && parsedData.moves.length >= 4) ? parsedData.moves.slice(0, 4) : [
      { name: 'Git Commit', power: 30, desc: 'Commits with no message' },
      { name: 'StackOverflow', power: 50, desc: 'Clones code instantly' },
      { name: 'Coffee Refill', power: 25, desc: 'Heals minor syntax errors' },
      { name: 'Bug Deploy', power: 75, desc: 'Unleashes infinite loop onto production' },
    ],
    joinedYear: githubData.joinedYear,
    publicRepos: githubData.public_repos,
    followers: githubData.followers,
    location: githubData.location,
    spriteSeed: `${cleanUsername}-${githubData.joinedYear}-${githubData.public_repos}`,
  };
}

// ======== AI Boss Comment Handler ========
async function handleAiBossComment(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as AiBossCommentRequest;
  const { username, monName, stats, action, bossHP } = body;
  if (!username) return new Response(JSON.stringify({ error: 'Username is required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const cleanAction = action || 'fight';
  const cleanMonName = monName || 'RoastMon';
  const bossHPVal = bossHP ?? 250;

  if (!env.GROQ_API_KEY) {
    const fallbacks = [
      `Your level 50 ${cleanMonName} is a joke! A direct push to master with no code reviews!`,
      `Using ${cleanAction} on me? My compiler is already refactoring your entire life's work!`,
      `Your active stats represent a legacy codebase. Prepare to be deprecated!`,
      `Evaluating ${cleanAction}... Exception detected! Did you write this action with an unvetted AI prompt?`,
      `Staring down my Y2K Glitch engine with merely ${stats?.hp ?? 50} HP? How delightfully optimistic.`,
    ];
    const comment = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    return new Response(JSON.stringify({ comment }), { headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: `You are CYBER-DRAKE-Y2K, the elite Level 99 AI Arch-Glitch Gym Leader in "ROAST-MON". You speak in retro-RPG uppercase or witty sassy critiques. Output a single hilarious, snappy, extremely biting retro roast (MAX 100 characters!). No Markdown, no styling, no quotes. Just the raw roast text.` },
          { role: 'user', content: `You are actively battling a developer named ${username} who has summoned their creature ${cleanMonName} (Stats: HP: ${stats?.hp ?? 50}, Attack: ${stats?.attack ?? 50}, Defense: ${stats?.defense ?? 50}). The player just made the turn combat action: "${cleanAction}". Your current boss health is ${bossHPVal}/250 HP. Mock their action, their Roast-mon's weak stats, or their GitHub quality. Be sassy, short, and punchy. MAX 100 characters.` },
        ],
        temperature: 0.9,
        max_tokens: 80,
      }),
    });
    const data = await response.json() as GroqResponse;
    const comment = data.choices?.[0]?.message?.content?.trim() || `My syntax analyzer refuses to even parse your ${cleanAction}!`;
    return new Response(JSON.stringify({ comment: `"${comment}"` }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('AI boss comment error:', err);
    return new Response(JSON.stringify({ comment: `Evaluation of ${cleanAction} threw a critical StackOverflowException!` }), { headers: { 'Content-Type': 'application/json' } });
  }
}

// ======== Badge Handler ========
async function handleBadge(username: string, env: Env): Promise<Response> {
  const cleanUsername = username.trim().replace(/[^a-zA-Z0-9-]/g, '');
  if (!cleanUsername) return new Response(JSON.stringify({ error: 'Invalid username' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const leaderboard = await loadLeaderboard(env.LEADERBOARD);
  const entry = leaderboard.find(e => e.username.toLowerCase() === cleanUsername.toLowerCase());
  const level = entry?.level || Math.max(1, Math.min(99, Math.floor(cleanUsername.length * 3 + (cleanUsername.charCodeAt(0) % 20))));
  const rank = entry ? [...leaderboard].sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses)).findIndex(e => e.username.toLowerCase() === cleanUsername.toLowerCase()) + 1 : null;
  let color = '#7f001c';
  if (rank) { if (rank <= 3) color = '#facc15'; else if (rank <= 10) color = '#22c55e'; else if (rank <= 50) color = '#f97316'; }
  const message = rank ? `#${rank} · LV ${level}` : `LV ${level}`;
  return new Response(JSON.stringify({ schemaVersion: 1, label: 'Gittymon', message, color, namedLogo: 'github', logoColor: '#e2dfde' }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=120, s-maxage=300' },
  });
}

// ======== Card Page Handler ========
async function handleCardPage(request: Request, env: Env, username: string, origin: string): Promise<Response> {
  const cleanUsername = username.trim().replace(/[^a-zA-Z0-9-]/g, '');
  if (!cleanUsername) return new Response('Invalid username', { status: 400 });

  const leaderboard = await loadLeaderboard(env.LEADERBOARD);
  const entry = leaderboard.find(e => e.username.toLowerCase() === cleanUsername.toLowerCase());

  const codeHash = cleanUsername.length + (cleanUsername.length * 2);
  const names = ['NodeSlime','Forkachu','AsyncPod','CommitoBat','Dockergon','GitSlasher','JSON_Golem','BugMander'];
  const monName = entry?.monName || names[codeHash % names.length];
  const types = ['Direct-to-master','AnyScript-Type','StackOverflow Cloner','Merge-Fearful','Coffee-Fueled','Infinite-Loop'];
  const type = types[cleanUsername.charCodeAt(0) % types.length];
  const level = entry?.level || Math.max(1, Math.min(99, Math.floor(cleanUsername.length * 3 + (cleanUsername.charCodeAt(0) % 20))));
  const roasts = [
    'Only uses brute force push -m. Absolute terror to code reviews.',
    'Bio is standard default template. Crawls StackOverflow daily for solutions.',
    'Has zero comments, uses var instead of let. Legacy engine standby.',
    'Spends 5 hours styling tiny retro buttons instead of shipping real core features.',
  ];
  const roast = roasts[codeHash % roasts.length];
  const wins = entry?.wins ?? 0;
  const losses = entry?.losses ?? 0;

  const gifUrl = `${origin}/api/embed/${cleanUsername}.gif`;
  const cardUrl = `${origin}/card/${cleanUsername}`;
  const socialPreviewUrl = `${origin}/social-preview.png`;
  const title = `${monName.toUpperCase()} LV ${level}`;
  const ogTitle = `@${cleanUsername}'s Gittymon — ${title}`;
  const h = escapeHtml;

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${h(ogTitle)}</title>
<meta name="description" content="${h(roast)}"><meta name="robots" content="index, follow"><link rel="canonical" href="${cardUrl}">
<meta property="og:title" content="${h(ogTitle)}"><meta property="og:description" content="${h(roast)}"><meta property="og:image" content="${socialPreviewUrl}"><meta property="og:image:width" content="1280"><meta property="og:image:height" content="640"><meta property="og:image:type" content="image/png"><meta property="og:image:alt" content="@${cleanUsername}'s Gittymon Monster Card"><meta property="og:url" content="${cardUrl}"><meta property="og:type" content="website"><meta property="og:site_name" content="Gittymon">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${h(ogTitle)}"><meta name="twitter:description" content="${h(roast)}"><meta name="twitter:image" content="${socialPreviewUrl}">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"${h(ogTitle)}","description":"${h(roast)}","url":"${cardUrl}","about":{"@type":"Thing","name":"${h(monName.toUpperCase())}"},"mainEntity":{"@type":"Question","name":"What is @${cleanUsername}'s Gittymon?","acceptedAnswer":{"@type":"Answer","text":"${h(monName.toUpperCase())} is a LV ${level} ${h(type.toUpperCase())}-type Gittymon summoned from @${cleanUsername}'s GitHub profile. Record: ${wins} wins, ${losses} losses."}}}</script>
<style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{background:#0f0f13;color:#e2dfde;font-family:'Courier New',Courier,monospace;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}.bg-grid{position:fixed;inset:0;pointer-events:none;z-index:0;background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);background-size:40px 40px}.container{position:relative;z-index:1;text-align:center;max-width:600px}.logo{font-size:10px;font-weight:900;letter-spacing:3px;color:#7f001c;text-transform:uppercase;margin-bottom:16px}.card-frame{display:inline-block;background:#18181b;border:2px solid #27272a;border-radius:12px;padding:12px;box-shadow:0 0 60px rgba(127,0,28,0.15),0 8px 32px rgba(0,0,0,0.5)}.card-frame img{display:block;max-width:100%;height:auto;image-rendering:pixelated;border-radius:4px}.info{margin-top:20px;display:flex;flex-direction:column;align-items:center;gap:8px}.username{font-size:14px;font-weight:900;color:#fff;letter-spacing:1px}.username span{color:#7f001c}.mon-name{font-size:20px;font-weight:900;color:#fff;letter-spacing:2px;text-shadow:0 0 12px rgba(127,0,28,0.4)}.type-badge{display:inline-block;font-size:8px;font-weight:700;color:#7f001c;border:1px solid #7f001c;border-radius:20px;padding:4px 14px;letter-spacing:1px;text-transform:uppercase}.record{font-size:9px;color:#71717a;letter-spacing:1px}.record strong{color:#a1a1aa}.roast-box{margin-top:12px;background:#1a1a1e;border-left:3px solid #7f001c;border-radius:4px;padding:12px 16px;max-width:460px}.roast-box p{font-size:9px;line-height:1.6;color:#a1a1aa;font-style:italic;text-align:left}.roast-label{font-size:7px;font-weight:700;color:#7f001c;letter-spacing:2px;margin-bottom:6px;text-transform:uppercase}.share-hint{margin-top:24px;font-size:7px;color:#52525b}.footer{margin-top:32px;font-size:7px;color:#3f3f46}.footer a{color:#7f001c;text-decoration:none}</style></head><body><div class="bg-grid"></div><div class="container"><div class="logo">⚡ Gittymon Network ⚡</div><div class="card-frame"><img src="${gifUrl}" width="460" height="220" alt="@${cleanUsername}'s Gittymon Monster Card — ${h(monName.toUpperCase())} LV ${level}"></div><div class="info"><div class="username">@<span>${cleanUsername}</span></div><div class="mon-name">${h(monName.toUpperCase())}</div><div class="type-badge">${h(type.toUpperCase())}</div><div class="record">LV ${level} · W: <strong>${wins}</strong> L: <strong>${losses}</strong></div></div><div class="roast-box"><div class="roast-label">📟 System Roast</div><p>"${h(roast)}"</p></div><div class="share-hint">Share this page — Open Graph &amp; Twitter Card enabled</div><div class="footer">Summon your own at <a href="/">gittymon.dev</a></div></div></body></html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'max-age=3600, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
