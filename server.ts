import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { loadLeaderboard } from './server/leaderboard.js';
import { setupMultiplayer } from './server/multiplayer.js';
import { generateSvgCard, generateGifCard } from './server/embed.js';

// Load environment variables from .env
dotenv.config();

const escapeHtml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const app = express();
app.set('trust proxy', 1);
const PORT = 3000;

app.use(express.json());

// Initialize Groq client (OpenAI-compatible) for Llama 3 inference
// Sign up for a free API key at https://console.groq.com
const apiKey = process.env.GROQ_API_KEY;
let groq: OpenAI | null = null;

if (apiKey) {
  groq = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });
} else {
  console.warn('GROQ_API_KEY is not defined in the environment variables. Mock AI generations will be used as fallback.');
}

/**
 * Endpoint to summon a Roast-mon based on a GitHub username
 */
app.post('/api/summon', async (req, res) => {
  const { username } = req.body;

  if (!username || typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'GitHub username is required.' });
  }

  const cleanUsername = username.trim().replace(/[^a-zA-Z0-9-]/g, '');

  // Check summon cache first — skip AI if we already have a result for this user
  const isRefresh = req.body.refresh === true;
  if (!isRefresh) {
    const cache = loadSummonCache();
    const cached = cache.find(e => e.username.toLowerCase() === cleanUsername.toLowerCase());
    if (cached) {
      console.log(`Serving cached summon for ${cleanUsername}`);
      return res.json(cached.resultMon);
    }
  }

  let githubData = {
    name: cleanUsername,
    public_repos: 12,
    followers: 4,
    location: 'Internet Wilderness',
    joinedYear: '2022',
    bio: 'A mysterious code crafter.',
    avatar_url: `https://github.com/${cleanUsername}.png`
  };

  try {
    // Attempt fetching public details of the user from GitHub API
    // Setting clean headers with a custom User-Agent to satisfy GitHub policies
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);

    const ghResponse = await fetch(`https://api.github.com/users/${cleanUsername}`, {
      headers: { 'User-Agent': 'RoastMonGameboyApplet' },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (ghResponse.ok) {
      const data = await ghResponse.json();
      githubData = {
        name: data.name || cleanUsername,
        public_repos: data.public_repos ?? 10,
        followers: data.followers ?? 2,
        location: data.location || 'Unknown Coordinates',
        joinedYear: data.created_at ? new Date(data.created_at).getFullYear().toString() : '2021',
        bio: data.bio || 'Code without comments, coffee without milk.',
        avatar_url: data.avatar_url || `https://github.com/${cleanUsername}.png`
      };
    } else {
      console.warn(`GitHub API returned response status: ${ghResponse.status}. Using fallback default metrics.`);
    }
  } catch (err) {
    console.warn('Could not contact GitHub API due to networking or rate limits. Utilizing fallback metrics gracefully.', err);
  }

  // If Groq is not initialized or fails, generate a hilarious local mock so the game remains completely playable
  if (!groq) {
    const mockState = generateMockRoastMon(githubData, cleanUsername);
    addToSummonCache(cleanUsername, mockState);
    return res.json(mockState);
  }

  try {
    const systemPrompt = `You are an elite, sarcastic, witty retro RPG narrator for "ROAST-MON" (inspired by Pokemon, 8-bit games, and funny coding critiques).

You must respond with valid JSON matching this exact schema:
{
  "name": "string (creative monster name like Commitobat, Forkachu, LegacyGhost)",
  "type": "string (fictional RPG type like NullPointer, DirectMaster, CoffeeFueled)",
  "roast": "string (funny biting developer roast, MAX 150 characters)",
  "stats": {
    "hp": "number 10-100",
    "attack": "number 10-100",
    "defense": "number 10-100",
    "speed": "number 10-100",
    "chaos": "number 10-100"
  },
  "moves": [
    { "name": "string", "power": "number 10-100", "desc": "string" }
  ]
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
1. Choose a funny, mock Poke-style monster name fitting for a software engineer (e.g. Commitobat, Monadon, Forkachu, Bugmander, NodeSlime, Dockergon, Asyncopod). Reflect their metrics or handle.
2. Choose a type (e.g., "Direct-to-master", "Coffee-Fueled", "Recursive Nightmare", "Unresolved Conflict", "Legacy Ghost", "AnyScript", "StackOverflow Cloner", "Infinite-Loop").
3. Write a hilarious, biting, yet playful 8-bit RPG-style ROAST. MAX 150 characters.
4. Assign stats (HP, Attack, Defense, Speed, Chaos) between 10 and 100 based loosely on metrics.
5. Formulate exactly 4 funny custom battle moves with name, power (10-100), and short description.`;

    // Query Groq Llama 3 with JSON mode for structured output
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 1200,
    });

    const responseText = response.choices[0]?.message?.content || '';
    const parsedData = JSON.parse(responseText.trim());

    // Merge everything with original metadata for the application state
    const resultMon = {
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
        { name: 'Bug Deploy', power: 75, desc: 'Unleashes infinite loop onto production' }
      ],
      joinedYear: githubData.joinedYear,
      publicRepos: githubData.public_repos,
      followers: githubData.followers,
      location: githubData.location,
      spriteSeed: `${cleanUsername}-${githubData.joinedYear}-${githubData.public_repos}`
    };

    addToSummonCache(cleanUsername, resultMon);
    res.json(resultMon);

  } catch (error) {
    console.error('Groq summon error. Utilizing local dithered model fallback gracefully:', error);
    const fallbackMon = generateMockRoastMon(githubData, cleanUsername);
    addToSummonCache(cleanUsername, fallbackMon);
    res.json(fallbackMon);
  }
});

/**
 * Dynamic SVG Card Embed Generator API Endpoint
 * Formats a fully vector-drawn Gameboy-style visual of their Roastmon profile
 */
app.get('/api/embed/svg/:username', (req, res) => {
  const { username } = req.params;
  if (!username) {
    return res.status(400).send('Username parameter required');
  }
  const svg = generateSvgCard(username);
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'max-age=60, s-maxage=120, stale-while-revalidate=600');
  return res.send(svg);
});

// Also support alternate .svg extension directly for convenient readme formatting
app.get('/api/embed/:username.svg', (req, res) => {
  const { username } = req.params;
  if (!username) {
    return res.status(400).send('Username parameter required');
  }
  const svg = generateSvgCard(username);
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'max-age=60, s-maxage=120, stale-while-revalidate=600');
  return res.send(svg);
});

/**
 * Dynamic GIF Card Embed Generator API Endpoint
 * Formats a fully animated looping Gameboy visual of their Roastmon profile
 */
app.get('/api/embed/gif/:username', (req, res) => {
  const { username } = req.params;
  if (!username) {
    return res.status(400).send('Username parameter required');
  }
  try {
    const gifBuffer = generateGifCard(username);
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'max-age=60, s-maxage=120, stale-while-revalidate=600');
    return res.send(gifBuffer);
  } catch (error) {
    console.error('GIF Generation Error:', error);
    return res.status(500).send('Error generating profile GIF');
  }
});

// Also support alternate .gif extension directly for convenient readme formatting
app.get('/api/embed/:username.gif', (req, res) => {
  const { username } = req.params;
  if (!username) {
    return res.status(400).send('Username parameter required');
  }
  try {
    const gifBuffer = generateGifCard(username);
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'max-age=60, s-maxage=120, stale-while-revalidate=600');
    return res.send(gifBuffer);
  } catch (error) {
    console.error('GIF Generation Error:', error);
    return res.status(500).send('Error generating profile GIF');
  }
});

/**
 * Shields.io dynamic badge endpoint.
 * Returns JSON in shields.io endpoint format for live badge rendering.
 */
app.get('/api/badge/:username', (req, res) => {
  const { username } = req.params;
  if (!username) return res.status(400).json({ error: 'Username parameter required' });

  const cleanUsername = username.trim().replace(/[^a-zA-Z0-9-]/g, '');
  if (!cleanUsername) return res.status(400).json({ error: 'Invalid username' });

  const leaderboard = loadLeaderboard();
  const entry = leaderboard.find(e => e.username.toLowerCase() === cleanUsername.toLowerCase());

  // Deterministic level (same as embed.ts) — use leaderboard if available
  const level = entry?.level || Math.max(1, Math.min(99, Math.floor(cleanUsername.length * 3 + (cleanUsername.charCodeAt(0) % 20))));

  // Rank on leaderboard (1-indexed)
  const rank = entry
    ? [...leaderboard].sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses)).findIndex(e => e.username.toLowerCase() === cleanUsername.toLowerCase()) + 1
    : null;

  // Color scheme based on rank
  let color = '#7f001c';  // default crimson
  if (rank) {
    if (rank <= 3) color = '#facc15';    // gold for top 3
    else if (rank <= 10) color = '#22c55e'; // green for top 10
    else if (rank <= 50) color = '#f97316'; // orange for top 50
  }

  const message = rank ? `#${rank} · LV ${level}` : `LV ${level}`;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'max-age=120, s-maxage=300, stale-while-revalidate=600');
  res.json({
    schemaVersion: 1,
    label: 'Gittymon',
    message,
    color,
    namedLogo: 'github',
    logoColor: '#e2dfde',
  });
});

/**
 * Social share / standalone card page route.
 * Renders a full HTML page with Open Graph tags for sharing on Twitter, Discord, etc.
 */
app.get('/card/:username', (req, res) => {
  const { username } = req.params;
  if (!username) return res.status(400).send('Username parameter required');

  const cleanUsername = username.trim().replace(/[^a-zA-Z0-9-]/g, '');
  if (!cleanUsername) return res.status(400).send('Invalid username');

  const leaderboard = loadLeaderboard();
  const entry = leaderboard.find(e => e.username.toLowerCase() === cleanUsername.toLowerCase());

  // Deterministic card data (matches server/embed.ts generation)
  const codeHash = cleanUsername.length + (cleanUsername.length * 2);
  const names = ['NodeSlime', 'Forkachu', 'AsyncPod', 'CommitoBat', 'Dockergon', 'GitSlasher', 'JSON_Golem', 'BugMander'];
  const monName = entry?.monName || names[codeHash % names.length];
  const types = ['Direct-to-master', 'AnyScript-Type', 'StackOverflow Cloner', 'Merge-Fearful', 'Coffee-Fueled', 'Infinite-Loop'];
  const type = types[cleanUsername.charCodeAt(0) % types.length];
  const level = entry?.level || Math.max(1, Math.min(99, Math.floor(cleanUsername.length * 3 + (cleanUsername.charCodeAt(0) % 20))));
  const roasts = [
    'Only uses brute force push -m. Absolute terror to code reviews.',
    'Bio is standard default template. Crawls StackOverflow daily for solutions.',
    'Has zero comments, uses var instead of let. Legacy engine standby.',
    'Spends 5 hours styling tiny retro buttons instead of shipping real core features.'
  ];
  const roast = roasts[codeHash % roasts.length];
  const wins = entry?.wins ?? 0;
  const losses = entry?.losses ?? 0;

  const origin = `${req.protocol}://${req.get('host')}`;
  const gifUrl = `${origin}/api/embed/${cleanUsername}.gif`;
  const cardUrl = `${origin}/card/${cleanUsername}`;
  const socialPreviewUrl = `${origin}/social-preview.png`;
  const title = `${monName.toUpperCase()} LV ${level}`;
  const ogTitle = `@${cleanUsername}'s Gittymon — ${title}`;

  const h = escapeHtml;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${h(ogTitle)}</title>
  <meta name="description" content="${h(roast)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${cardUrl}">

  <!-- Open Graph -->
  <meta property="og:title" content="${h(ogTitle)}">
  <meta property="og:description" content="${h(roast)}">
  <meta property="og:image" content="${socialPreviewUrl}">
  <meta property="og:image:width" content="1280">
  <meta property="og:image:height" content="640">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:alt" content="@${cleanUsername}'s Gittymon Monster Card">
  <meta property="og:url" content="${cardUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Gittymon">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${h(ogTitle)}">
  <meta name="twitter:description" content="${h(roast)}">
  <meta name="twitter:image" content="${socialPreviewUrl}">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "${h(ogTitle)}",
    "description": "${h(roast)}",
    "url": "${cardUrl}",
    "about": {
      "@type": "Thing",
      "name": "${h(monName.toUpperCase())}"
    },
    "mainEntity": {
      "@type": "Question",
      "name": "What is @${cleanUsername}'s Gittymon?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "${h(monName.toUpperCase())} is a LV ${level} ${h(type.toUpperCase())}-type Gittymon summoned from @${cleanUsername}'s GitHub profile. Record: ${wins} wins, ${losses} losses."
      }
    }
  }
  </script>

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0f0f13;
      color: #e2dfde;
      font-family: 'Courier New', Courier, monospace;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .bg-grid {
      position: fixed; inset: 0; pointer-events: none; z-index: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 40px 40px;
    }
    .container { position: relative; z-index: 1; text-align: center; max-width: 600px; }
    .logo {
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 3px;
      color: #7f001c;
      margin-bottom: 16px;
      text-transform: uppercase;
    }
    .card-frame {
      display: inline-block;
      background: #18181b;
      border: 2px solid #27272a;
      border-radius: 12px;
      padding: 12px;
      box-shadow: 0 0 60px rgba(127, 0, 28, 0.15), 0 8px 32px rgba(0,0,0,0.5);
    }
    .card-frame img {
      display: block;
      max-width: 100%;
      height: auto;
      image-rendering: pixelated;
      border-radius: 4px;
    }
    .info {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .username {
      font-size: 14px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: 1px;
    }
    .username span { color: #7f001c; }
    .mon-name {
      font-size: 20px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: 2px;
      text-shadow: 0 0 12px rgba(127, 0, 28, 0.4);
    }
    .type-badge {
      display: inline-block;
      font-size: 8px;
      font-weight: 700;
      color: #7f001c;
      border: 1px solid #7f001c;
      border-radius: 20px;
      padding: 4px 14px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .record {
      font-size: 9px;
      color: #71717a;
      letter-spacing: 1px;
    }
    .record strong { color: #a1a1aa; }
    .roast-box {
      margin-top: 12px;
      background: #1a1a1e;
      border-left: 3px solid #7f001c;
      border-radius: 4px;
      padding: 12px 16px;
      max-width: 460px;
    }
    .roast-box p {
      font-size: 9px;
      line-height: 1.6;
      color: #a1a1aa;
      font-style: italic;
      text-align: left;
    }
    .roast-label {
      font-size: 7px;
      font-weight: 700;
      color: #7f001c;
      letter-spacing: 2px;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .share-hint {
      margin-top: 24px;
      font-size: 7px;
      color: #52525b;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .footer {
      margin-top: 32px;
      font-size: 7px;
      color: #3f3f46;
      letter-spacing: 1px;
    }
    .footer a {
      color: #7f001c;
      text-decoration: none;
    }
    .footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="container">
    <div class="logo">⚡ Gittymon Network ⚡</div>
    <div class="card-frame">
      <img src="${gifUrl}" width="460" height="220" alt="@${cleanUsername}'s Gittymon Monster Card — ${h(monName.toUpperCase())} LV ${level}">
    </div>
    <div class="info">
      <div class="username">@<span>${cleanUsername}</span></div>
      <div class="mon-name">${h(monName.toUpperCase())}</div>
      <div class="type-badge">${h(type.toUpperCase())}</div>
      <div class="record">LV ${level} &nbsp;·&nbsp; W: <strong>${wins}</strong> &nbsp; L: <strong>${losses}</strong></div>
    </div>
    <div class="roast-box">
      <div class="roast-label">📟 System Roast</div>
      <p>"${h(roast)}"</p>
    </div>
    <div class="share-hint">Share this page — Open Graph &amp; Twitter Card enabled</div>
    <div class="footer">
      Summon your own at <a href="/">gittymon.dev</a>
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
  res.send(html);
});

/**
 * Endpoint to load the global high scores leaderboard
 */
app.get('/api/leaderboard', (req, res) => {
  res.json(loadLeaderboard());
});

/**
 * Endpoint to generate dynamic AI comments during Gym Leader / Glitch Boss PVP combat
 */
app.post('/api/ai-boss-comment', async (req, res) => {
  const { username, monName, stats, action, bossHP } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required.' });
  }

  const cleanAction = action || 'fight';
  const cleanMonName = monName || 'RoastMon';
  const bossHPVal = bossHP ?? 250;

  if (!groq) {
    const fallbackBossComments = [
      `Your level 50 ${cleanMonName} is a joke! A direct push to master with no code reviews!`,
      `Using ${cleanAction} on me? My compiler is already refactoring your entire life's work!`,
      `Your active stats represent a legacy codebase. Prepare to be deprecated!`,
      `Evaluating ${cleanAction}... Exception detected! Did you write this action with an unvetted AI prompt?`,
      `Staring down my Y2K Glitch engine with merely ${stats?.hp ?? 50} HP? How delightfully optimistic.`,
    ];
    const comment = fallbackBossComments[Math.floor(Math.random() * fallbackBossComments.length)];
    return res.json({ comment });
  }

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are CYBER-DRAKE-Y2K, the elite Level 99 AI Arch-Glitch Gym Leader in "ROAST-MON".
You speak in retro-RPG uppercase or witty sassy critiques.
Output a single hilarious, snappy, extremely biting retro roast (MAX 100 characters!).
No Markdown, no styling, no quotes. Just the raw roast text.`
        },
        {
          role: 'user',
          content: `You are actively battling a developer named ${username} who has summoned their creature ${cleanMonName} (Stats: HP: ${stats?.hp ?? 50}, Attack: ${stats?.attack ?? 50}, Defense: ${stats?.defense ?? 50}).
The player just made the turn combat action: "${cleanAction}".
Your current boss health is ${bossHPVal}/250 HP.

Mock their action, their Roast-mon's weak stats, or their GitHub quality. Be sassy, short, and punchy. MAX 100 characters.`
        }
      ],
      temperature: 0.9,
      max_tokens: 80,
    });

    const comment = response.choices[0]?.message?.content?.trim() || `My syntax analyzer refuses to even parse your ${cleanAction}!`;
    res.json({ comment: `"${comment}"` });
  } catch (error) {
    console.error('Groq boss comment generation error:', error);
    res.json({ comment: `Evaluation of ${cleanAction} threw a critical StackOverflowException!` });
  }
});


// -------------------------------------------------------------------------
// Summon Cache — persisted to disk so repeated lookups skip the AI call
// -------------------------------------------------------------------------
const SUMMON_CACHE_FILE = path.join(process.cwd(), 'summon-cache.json');

interface SummonCacheEntry {
  username: string;
  resultMon: any;
  generatedAt: string;
}

function loadSummonCache(): SummonCacheEntry[] {
  try {
    if (fs.existsSync(SUMMON_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(SUMMON_CACHE_FILE, 'utf-8'));
    }
  } catch (error) {
    console.warn('Failed to read summon cache:', error);
  }
  return [];
}

function saveSummonCache(cache: SummonCacheEntry[]): void {
  try {
    fs.writeFileSync(SUMMON_CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (error) {
    console.warn('Failed to write summon cache:', error);
  }
}

function addToSummonCache(username: string, resultMon: any): void {
  const cache = loadSummonCache();
  // Remove existing entry if present (e.g. on refresh)
  const existingIdx = cache.findIndex(e => e.username.toLowerCase() === username.toLowerCase());
  if (existingIdx !== -1) cache.splice(existingIdx, 1);
  // Keep cache size manageable
  if (cache.length >= 500) cache.shift();
  cache.push({
    username,
    resultMon,
    generatedAt: new Date().toISOString(),
  });
  saveSummonCache(cache);
}

/**
 * Generates an extremely fun mock Roast-Mon in case Groq API key is missing or is exhausted
 */
function generateMockRoastMon(githubData: any, username: string) {
  const codeHash = username.length + githubData.public_repos;
  const hp = Math.max(25, Math.min(99, 30 + (githubData.followers * 3) % 70));
  const attack = Math.max(25, Math.min(99, 40 + (githubData.public_repos * 2) % 60));
  const defense = Math.max(25, Math.min(99, 50 + (parseInt(githubData.joinedYear) % 10) * 5));
  const speed = Math.max(25, Math.min(99, 45 + (username.charCodeAt(0) % 50)));
  const chaos = Math.max(25, Math.min(99, 10 + (githubData.public_repos * 5) % 90));

  const names = ['NodeSlime', 'Forkachu', 'AsyncPod', 'CommitoBat', 'Dockergon', 'GitSlasher', 'JSON_Golem', 'BugMander'];
  const name = names[codeHash % names.length];

  const types = ['Direct-to-master', 'AnyScript-Type', 'StackOverflow Cloner', 'Merge-Fearful', 'Coffee-Fueled', 'Infinite-Loop'];
  const type = types[username.charCodeAt(0) % types.length];

  const roasts = [
    `Has ${githubData.public_repos} archives but only uses Git Push --Force. Afraid of real code review.`,
    `Bio is literally blank. Stalks StackOverflow daily hoping nobody notices they copying code.`,
    `Has followers: ${githubData.followers}. Most of them are bot accounts. Coding style is pure legacy.`,
    `Joined in ${githubData.joinedYear}. Still types 'sudo' on every line of terminal because of trust issues.`
  ];
  const roast = roasts[codeHash % roasts.length];

  return {
    username,
    name,
    avatarUrl: githubData.avatar_url,
    type,
    level: Math.max(1, Math.min(99, Math.floor(githubData.public_repos * 1.5 + githubData.followers))),
    bio: githubData.bio,
    roast,
    stats: { hp, attack, defense, speed, chaos },
    moves: [
      { name: 'Git Commit Force', power: 75, desc: 'Bypasses CI pipelines like a wild cowboy.' },
      { name: 'Nuke node_modules', power: 55, desc: 'Deletes dependencies to solve simple lint issues.' },
      { name: 'StackOverflow Clone', power: 45, desc: 'Instantly copies code without understanding how it works.' },
      { name: 'Cry in Terminal', power: 20, desc: 'Reduces opponent defense from sheer pity.' }
    ],
    joinedYear: githubData.joinedYear,
    publicRepos: githubData.public_repos,
    followers: githubData.followers,
    location: githubData.location,
    spriteSeed: `${username}-${githubData.joinedYear}-${githubData.public_repos}`
  };
}

// Static SEO content
const ROBOTS_TXT = `User-agent: *
Allow: /

# Disallow internal API endpoints
Disallow: /api/

# Sitemap
Sitemap: https://gittymon.dev/sitemap.xml
`;

const SITEMAP_TTL_MS = 3600_000; // 1 hour — rebuild sitemap periodically to reflect leaderboard changes

// Cached sitemap with expiry — regenerated when the cached copy is older than SITEMAP_TTL_MS
let cachedSitemap: string | null = null;
let lastSitemapFetch: number = 0;

function getSitemap(origin: string): string {
  const now = Date.now();
  if (cachedSitemap != null && (now - lastSitemapFetch) < SITEMAP_TTL_MS) {
    return cachedSitemap;
  }
  try {
    cachedSitemap = buildSitemap(origin);
    lastSitemapFetch = now;
  } catch (err) {
    console.error('Sitemap build failed:', err);
    if (cachedSitemap == null) {
      cachedSitemap = buildSitemapFallback(origin);
      lastSitemapFetch = now;
    }
  }
  return cachedSitemap;
}

function buildSitemap(origin: string): string {
  const today = new Date().toISOString().slice(0, 10);
  let urls = `<url>
    <loc>${origin}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`;

  const leaderboard = loadLeaderboard();
  for (const entry of leaderboard) {
    const safeUsername = entry.username.replace(/[&<>"']/g, '');
    // Use lastBattledAt when available for accurate lastmod, fall back to today
    const lastmod = entry.lastBattledAt ? entry.lastBattledAt.slice(0, 10) : today;
    urls += `
  <url>
    <loc>${origin}/card/${escapeXml(safeUsername)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;
}

function buildSitemapFallback(origin: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${origin}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Vite static assets mount structure
async function startServer() {
  // Helper: inject dynamic absolute URLs and SEO metadata into static meta tags
  function injectSeoMeta(html: string, req: express.Request): string {
    const origin = `${req.protocol}://${req.get('host')}`;
    return html
      .replace('<!-- CANONICAL_INJECTED_BY_SERVER -->', `<link rel="canonical" href="${origin}/">`)
      .replace(
        '<!-- OG_URL_INJECTED_BY_SERVER -->',
        `<meta property="og:url" content="${origin}/">`
      )
      .replace(
        '<!-- OG_IMAGE_INJECTED_BY_SERVER -->',
        `<meta property="og:image" content="${origin}/social-preview.png">`
      )
      .replace(
        '<!-- TWITTER_IMAGE_INJECTED_BY_SERVER -->',
        `<meta name="twitter:image" content="${origin}/social-preview.png">`
      );
  }

  let viteDevServer: Awaited<ReturnType<typeof createViteServer>> | null = null;

  if (process.env.NODE_ENV !== 'production') {
    viteDevServer = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
  }

  // POST /api/revalidate-sitemap — invalidate cached sitemap so it rebuilds on next request
  app.post('/api/revalidate-sitemap', (req, res) => {
    const expectedKey = process.env.REVALIDATE_KEY;
    if (expectedKey) {
      const providedKey = req.headers['x-revalidate-key'] as string | undefined;
      if (providedKey !== expectedKey) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }
    lastSitemapFetch = 0;
    cachedSitemap = null;
    res.setHeader('Content-Type', 'application/json');
    res.json({ ok: true, message: 'Sitemap cache invalidated' });
  });

  // Static SEO files
  app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'max-age=86400');
    res.send(ROBOTS_TXT);
  });

  app.get('/sitemap.xml', (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    const sitemap = getSitemap(origin);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
    res.send(sitemap);
  });

  // Inject dynamic absolute og:url for the root page
  // NOTE: registered BEFORE Vite middleware so OUR handler runs first for '/'
  // We call viteDevServer.transformIndexHtml() ourselves to inject the React refresh preamble
  app.get('/', async (req, res) => {
    const htmlPath = process.env.NODE_ENV !== 'production'
      ? path.join(process.cwd(), 'index.html')
      : path.join(process.cwd(), 'dist', 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf-8');

    let appHtml = '';

    if (viteDevServer) {
      // --- SSR in dev mode via Vite ---
      try {
        const { render } = await viteDevServer.ssrLoadModule('/src/entry-server.tsx');
        appHtml = await render();
      } catch (ssrErr) {
        console.warn('SSR render failed in dev mode, falling back to client-only:', ssrErr);
      }
    } else {
      // --- SSR in production mode (pre-built module) ---
      try {
        const { render } = await import('./dist/server/entry-server.js');
        appHtml = await render();
      } catch (ssrErr) {
        console.warn('SSR render failed in production, falling back to client-only:', ssrErr);
      }
    }

    // Inject SSR content into the root div
    if (appHtml) {
      html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
    }

    // In dev, run through Vite's HTML transform pipeline to inject React refresh preamble etc.
    if (viteDevServer) {
      html = await viteDevServer.transformIndexHtml(req.url, html);
    }

    html = injectSeoMeta(html, req);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(html);
  });

  // Mount Vite middleware AFTER our root handler so it handles other routes (.ts, .tsx, etc.)
  if (process.env.NODE_ENV !== 'production' && viteDevServer) {
    app.use(viteDevServer.middlewares);
  }

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', async (req, res) => {
      const htmlPath = path.join(distPath, 'index.html');
      let html = fs.readFileSync(htmlPath, 'utf-8');

      // SSR in production mode (pre-built module)
      try {
        const { render } = await import('./dist/server/entry-server.js');
        const appHtml = await render();
        html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
      } catch (ssrErr) {
        console.warn('SSR render failed in production, falling back to client-only:', ssrErr);
      }

      html = injectSeoMeta(html, req);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(html);
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server running on port ${PORT}`);
  });

  setupMultiplayer(server);

}

startServer();
