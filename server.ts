import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { loadLeaderboard } from './server/leaderboard.js';
import { setupMultiplayer } from './server/multiplayer.js';
import { generateSvgCard, generateGifCard } from './server/embed.js';

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client safely
// Ensure that User-Agent is set to 'aistudio-build' for telemetry as required
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  console.warn('GEMINI_API_KEY is not defined in the environment variables. Mock AI generations will be used fallback.');
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

  // If Gemini API is not initialized or fails, generate a hilarious local mock so the game remains completely playable
  if (!ai) {
    const mockState = generateMockRoastMon(githubData, cleanUsername);
    return res.json(mockState);
  }

  try {
    const prompt = `
      You are an elite, sarcastic, witty retro RPG narrator for "ROAST-MON" (inspired by Pokemon, 8-bit games, and funny coding critiques).
      Analyze this GitHub user's metrics:
      - Username: ${cleanUsername}
      - Real Name: ${githubData.name}
      - Bio: "${githubData.bio}"
      - Public Repos: ${githubData.public_repos}
      - Followers: ${githubData.followers}
      - Joined GitHub: ${githubData.joinedYear}
      - Location: ${githubData.location}

      Summon their customized 8-bit "ROAST-MON" creature!
      1. Choose a funny, mock Poke-style monster name for them, fitting for a software engineer (e.g. Commitobat, Monadon, Forkachu, Bugmander, NodeSlime, Dockergon, Asyncopod). It should reflect their metrics or handle.
      2. Choose a type (e.g., "Direct-to-master", "Coffee-Fueled", "Recursive Nightmare", "Unresolved Conflict", "Legacy Ghost", "AnyScript", "StackOverflow Cloner", "Infinite-Loop").
      3. Write a hilarious, biting, yet playful 8-bit RPG-style ROAST. Make it snappy and fit for an 8-bit handheld review. Critiques their public repos, lack of bio, follower count, or location. Keep it to max 150 characters to fit on a small retro screen.
      4. Assign structured stats (HP, Attack, Defense, Speed, Chaos level) between 10 and 100 based loosely on their metrics. (e.g. Followers increase HP, public repos increase Attack or Chaos, Age of account increases defense, speed depends on their style).
      5. Formulate 4 funny custom battle moves (e.g., "Force-Push Master", "Drop Node_Modules", "Coffee Spill Panic", "Stack Overflow Ctrl-C", "Copy AI Prompt", "Scream at Terminal"). For each move, define its name, an 8-bit attack power (0 to 100), and a short descriptions.
    `;

    // Query Gemini 3.5-flash with a structured JSON response representation
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "The creative mock monster name, e.g. Commitobat, Forkachu, LegacyGhost"
            },
            type: {
              type: Type.STRING,
              description: "Fictional RPG character type, e.g. NullPointer, DirectMaster, CoffeeFueled"
            },
            roast: {
              type: Type.STRING,
              description: "A funny, snappy, biting developer roast of this user. MAX 150 characters."
            },
            stats: {
              type: Type.OBJECT,
              properties: {
                hp: { type: Type.INTEGER, description: "HP (10 - 100)" },
                attack: { type: Type.INTEGER, description: "Attack (10 - 100)" },
                defense: { type: Type.INTEGER, description: "Defense (10 - 100)" },
                speed: { type: Type.INTEGER, description: "Speed (10 - 100)" },
                chaos: { type: Type.INTEGER, description: "Chaos level (10 - 100)" }
              },
              required: ['hp', 'attack', 'defense', 'speed', 'chaos']
            },
            moves: {
              type: Type.ARRAY,
              description: "Exactly 4 custom moves reflecting their metrics and developer traits",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Move title" },
                  power: { type: Type.INTEGER, description: "Damage power representation (10 - 100)" },
                  desc: { type: Type.STRING, description: "Move short description" }
                },
                required: ['name', 'power', 'desc']
              }
            }
          },
          required: ['name', 'type', 'roast', 'stats', 'moves']
        }
      }
    });

    const responseText = response.text || '';
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

    res.json(resultMon);

  } catch (error) {
    console.error('Gemini summon error. Utilizing local dithered model fallback gracefully:', error);
    const fallbackMon = generateMockRoastMon(githubData, cleanUsername);
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

  if (!ai) {
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
    const prompt = `
      You are CYBER-DRAKE-Y2K, the elite Level 99 AI Arch-Glitch Gym Leader in "ROAST-MON".
      You speak in retro-RPG uppercase or witty sassy critiques.
      You are actively battling a developer named ${username} who has summoned their creature ${cleanMonName} (Stats: HP: ${stats?.hp ?? 50}, Attack: ${stats?.attack ?? 50}, Defense: ${stats?.defense ?? 50}).
      The player just made the turn combat action: "${cleanAction}".
      Your current boss health is ${bossHPVal}/250 HP.
      
      Output a single hilarious, snappy, extremely biting retro roast (MAX 100 characters!) mocking their action, their Roast-mon's weak stats, or their GitHub quality. Be sassy, short, and punchy. No Markdown or styling.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 80,
      }
    });

    const comment = response.text?.trim() || `My syntax analyzer refuses to even parse your ${cleanAction}!`;
    res.json({ comment: `"${comment}"` });
  } catch (error) {
    console.error('Gemini boss comment generation error:', error);
    res.json({ comment: `Evaluation of ${cleanAction} threw a critical StackOverflowException!` });
  }
});


/**
 * Generates an extremely fun mock Roast-Mon in case Gemini key is missing or is exhausted
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

// Vite static assets mount structure
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server running on port ${PORT}`);
  });

  setupMultiplayer(server);

}

startServer();
