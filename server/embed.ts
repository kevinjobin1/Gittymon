import { loadLeaderboard } from './leaderboard.js';
import gifenc from 'gifenc';

function createGIFEncoder(opts?: any) {
  const anyGifenc = gifenc as any;
  if (typeof anyGifenc.GIFEncoder === 'function') {
    return new anyGifenc.GIFEncoder(opts);
  }
  if (typeof anyGifenc === 'function') {
    return new anyGifenc(opts);
  }
  throw new Error('Could not find GIFEncoder in gifenc module');
}

function getSeedHash(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

class LCG {
  private state: number;
  constructor(seedHash: number) {
    this.state = seedHash || 123456789;
  }
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) % 4294967296;
    return this.state / 4294967296;
  }
  nextRange(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }
}

// Generates procedural sprite data as SVG rects (24x24 pixel grid)
function getProceduralSpriteSvg(seed: string): string {
  const hash = getSeedHash(seed);
  const lcg = new LCG(hash);
  const colors = ['#1a1a1a', '#7f001c', '#e2dfde', '#ffffff'];
  const grid: number[][] = Array(24).fill(0).map(() => Array(24).fill(0));
  const limbsType = lcg.nextRange(0, 3);
  const eyesType = lcg.nextRange(0, 3);
  const hornsType = lcg.nextRange(0, 4);

  for (let y = 4; y < 20; y++) {
    for (let x = 3; x < 12; x++) {
      let fillType = 0;
      if (x <= 11 && x >= 11 - Math.floor(lcg.next() * 5 + 3)) {
        if (y >= 7 && y <= 16) fillType = lcg.next() > 0.35 ? 2 : 3;
      }
      if (hornsType === 0 && y >= 4 && y <= 6 && x >= 8 && x < 11) fillType = 2;
      else if (hornsType === 1 && y === 5 && x >= 5 && x <= 8) fillType = 3;
      else if (hornsType === 2 && y >= 3 && y <= 5 && x === 10) fillType = 3;
      if (limbsType === 0 && y >= 11 && y <= 13 && x >= 3 && x <= 6) fillType = 2;
      else if (limbsType === 1 && y >= 14 && y <= 15 && x >= 2 && x <= 5) fillType = 3;
      if (y >= 17 && y <= 18 && x >= 6 && x <= 10) fillType = 2;
      grid[y][x] = fillType;
    }
  }

  if (eyesType === 0) { grid[9][8] = 3; grid[10][8] = 0; grid[9][9] = 3; }
  else if (eyesType === 1) { grid[9][7] = 3; grid[9][8] = 3; grid[9][9] = 3; }
  else { grid[8][7] = 3; grid[9][8] = 3; grid[9][9] = 3; }
  grid[12][10] = 0;
  grid[13][11] = 2;

  for (let y = 0; y < 24; y++)
    for (let x = 0; x < 12; x++)
      grid[y][23 - x] = grid[y][x];

  const finalGrid: number[][] = Array(24).fill(0).map(() => Array(24).fill(0));
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const c = grid[y][x];
      if (c > 0) { finalGrid[y][x] = c; continue; }
      for (const [ny, nx] of [[y-1,x],[y+1,x],[y,x-1],[y,x+1]]) {
        if (ny >= 0 && ny < 24 && nx >= 0 && nx < 24 && grid[ny][nx] > 0) {
          finalGrid[y][x] = 1; break;
        }
      }
    }
  }

  let rects = '';
  const ps = 4;
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const cell = finalGrid[y][x];
      if (cell === 0) continue;
      const fillColor = cell === 1 ? colors[0] : cell === 2 ? colors[1] : colors[2];
      rects += `<rect x="${x * ps}" y="${y * ps}" width="${ps}" height="${ps}" fill="${fillColor}" />\n`;
    }
  }
  return rects;
}

function wrapText(text: string, maxLen: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= maxLen) cur = (cur + ' ' + w).trim();
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function generateSvgCard(username: string): string {
  const cleanUsername = username.trim().replace(/[^a-zA-Z0-9-]/g, '');

  const leaderboard = loadLeaderboard();
  const entry = leaderboard.find(e => e.username.toLowerCase() === cleanUsername.toLowerCase());

  const githubMockData = {
    public_repos: cleanUsername.length * 2 || 12,
    followers: (cleanUsername.charCodeAt(0) % 20) || 4,
    joinedYear: '2022',
  };

  const codeHash = cleanUsername.length + githubMockData.public_repos;
  const hp = Math.max(25, Math.min(99, 30 + (githubMockData.followers * 3) % 70));
  const attack = Math.max(25, Math.min(99, 40 + (githubMockData.public_repos * 2) % 60));
  const defense = Math.max(25, Math.min(99, 50 + (parseInt(githubMockData.joinedYear) % 10) * 5));
  const speed = Math.max(25, Math.min(99, 45 + (cleanUsername.charCodeAt(0) % 50)));
  const chaos = Math.max(25, Math.min(99, 10 + (githubMockData.public_repos * 5) % 90));

  const names = ['NodeSlime', 'Forkachu', 'AsyncPod', 'CommitoBat', 'Dockergon', 'GitSlasher', 'JSON_Golem', 'BugMander'];
  const monName = entry?.monName || names[codeHash % names.length];
  const types = ['Direct-to-master', 'AnyScript-Type', 'StackOverflow Cloner', 'Merge-Fearful', 'Coffee-Fueled', 'Infinite-Loop'];
  const type = types[cleanUsername.charCodeAt(0) % types.length];
  const level = entry?.level || Math.max(1, Math.min(99, Math.floor(githubMockData.public_repos * 1.5 + githubMockData.followers)));

  // Expanded roast pool for more variety
  const roasts = [
    'Only uses brute force push -m. Absolute terror to code reviews.',
    'Bio is standard default template. Crawls StackOverflow daily for solutions.',
    'Has zero comments, uses var instead of let. Legacy engine standby.',
    'Spends 5 hours styling tiny retro buttons instead of shipping real core features.',
    'Your commit messages are single letters. Git history looks like a ransom note.',
    'Writes code like its a typing test. Zero regard for the human maintainer.',
    'Your PR descriptions are three words max. Code review is archaeology.',
    'Uses nested ternaries like Russian nesting dolls. Nobody dares touch your files.'
  ];
  const roast = roasts[codeHash % roasts.length];

  const spriteSeed = `${cleanUsername}-${githubMockData.joinedYear}-${githubMockData.public_repos}`;
  const spriteSvgRects = getProceduralSpriteSvg(spriteSeed);

  const W = 460;
  const H = 220;
  const roastLines = wrapText(roast.toUpperCase(), 35).slice(0, 3);
  let roastSvg = '';
  roastLines.forEach((line, i) => {
    roastSvg += `<text x="150" y="${159 + i * 11}" fill="#7f001c" font-family="monospace" font-size="7.5" font-weight="900">${line}</text>\n`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#1e1b2e" />
      <stop offset="60%" stop-color="#0f0f1a" />
      <stop offset="100%" stop-color="#07070d" />
    </radialGradient>

    <!-- Card Outer Frame -->
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#27272a" />
      <stop offset="100%" stop-color="#18181b" />
    </linearGradient>

    <!-- LCD Bezel -->
    <linearGradient id="bezelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#52525b" />
      <stop offset="40%" stop-color="#3f3f46" />
      <stop offset="100%" stop-color="#18181b" />
    </linearGradient>

    <!-- Screen Gradient -->
    <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#d4dbb8" />
      <stop offset="50%" stop-color="#c5cbb4" />
      <stop offset="100%" stop-color="#a3ad8e" />
    </linearGradient>

    <!-- Screen Glare Reflection -->
    <linearGradient id="screenGlare" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18" />
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0.06" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>

    <!-- CRT Scanline Pattern -->
    <pattern id="scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="4" y2="0" stroke="#000" stroke-width="1" opacity="0.07" />
    </pattern>

    <!-- Stat Bar Gradients -->
    <linearGradient id="hpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#991b1b" />
      <stop offset="50%" stop-color="#dc2626" />
      <stop offset="100%" stop-color="#7f001c" />
    </linearGradient>
    <linearGradient id="atkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#a1a1aa" />
      <stop offset="100%" stop-color="#e2dfde" />
    </linearGradient>
    <linearGradient id="defGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#d4d4d8" />
      <stop offset="100%" stop-color="#ffffff" />
    </linearGradient>
    <linearGradient id="spdGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="100%" stop-color="#64748b" />
    </linearGradient>
    <linearGradient id="chaosGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7f1d1d" />
      <stop offset="50%" stop-color="#b91c1c" />
      <stop offset="100%" stop-color="#dc2626" />
    </linearGradient>

    <!-- Bar Shine Overlay -->
    <linearGradient id="barShine" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25" />
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.15" />
    </linearGradient>

    <!-- Glow filter for text -->
    <filter id="glow">
      <feGaussianBlur stdDeviation="1.5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="ledGlow">
      <feGaussianBlur stdDeviation="2" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <style>
      @keyframes spriteBob {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-3px); }
        100% { transform: translateY(0px); }
      }
      @keyframes ledPulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
      @keyframes ledGlowPulse {
        0%, 100% { opacity: 0.2; transform: scale(0.6); }
        50% { opacity: 0.5; transform: scale(1); }
      }
      @keyframes hpPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.85; }
      }
      .sprite-group { animation: spriteBob 3.5s ease-in-out infinite; }
      .led-core { animation: ledPulse 1.8s ease-in-out infinite; }
      .led-glow { animation: ledGlowPulse 1.8s ease-in-out infinite; transform-origin: 74px 160px; }
      .hp-bar { animation: hpPulse 2s ease-in-out infinite; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" rx="16" fill="url(#bgGlow)" />

  <!-- Subtle star field (static particles) -->
  <circle cx="23" cy="8" r="0.8" fill="#ffffff" opacity="0.3" />
  <circle cx="87" cy="12" r="0.6" fill="#ffffff" opacity="0.2" />
  <circle cx="156" cy="5" r="0.7" fill="#ffffff" opacity="0.25" />
  <circle cx="302" cy="9" r="0.5" fill="#ffffff" opacity="0.15" />
  <circle cx="418" cy="6" r="0.8" fill="#ffffff" opacity="0.2" />
  <circle cx="55" cy="210" r="0.6" fill="#ffffff" opacity="0.15" />
  <circle cx="380" cy="214" r="0.7" fill="#ffffff" opacity="0.2" />

  <!-- Outer Console Frame -->
  <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="14" fill="url(#cardGrad)" stroke="#52525b" stroke-width="2" />
  <rect x="5" y="5" width="${W - 10}" height="${H - 10}" rx="11" fill="none" stroke="#7f001c" stroke-width="1" stroke-dasharray="2 4" opacity="0.5" />

  <!-- Glowing Corner Brackets -->
  <!-- Top-left -->
  <path d="M 10 16 L 10 10 L 16 10" stroke="#7f001c" stroke-width="2" fill="none" opacity="0.8" />
  <path d="M 11 17 L 11 11 L 17 11" stroke="#f87171" stroke-width="0.8" fill="none" opacity="0.3" />
  <!-- Top-right -->
  <path d="M ${W - 10} 16 L ${W - 10} 10 L ${W - 16} 10" stroke="#7f001c" stroke-width="2" fill="none" opacity="0.8" />
  <path d="M ${W - 11} 17 L ${W - 11} 11 L ${W - 17} 11" stroke="#f87171" stroke-width="0.8" fill="none" opacity="0.3" />
  <!-- Bottom-left -->
  <path d="M 10 ${H - 16} L 10 ${H - 10} L 16 ${H - 10}" stroke="#7f001c" stroke-width="2" fill="none" opacity="0.8" />
  <path d="M 11 ${H - 17} L 11 ${H - 11} L 17 ${H - 11}" stroke="#f87171" stroke-width="0.8" fill="none" opacity="0.3" />
  <!-- Bottom-right -->
  <path d="M ${W - 10} ${H - 16} L ${W - 10} ${H - 10} L ${W - 16} ${H - 10}" stroke="#7f001c" stroke-width="2" fill="none" opacity="0.8" />
  <path d="M ${W - 11} ${H - 17} L ${W - 11} ${H - 11} L ${W - 17} ${H - 11}" stroke="#f87171" stroke-width="0.8" fill="none" opacity="0.3" />

  <!-- Circuit trace dots along top edge -->
  <circle cx="30" cy="8" r="1" fill="#7f001c" opacity="0.5" />
  <circle cx="60" cy="8" r="0.7" fill="#7f001c" opacity="0.3" />
  <circle cx="${W - 30}" cy="8" r="1" fill="#7f001c" opacity="0.5" />
  <circle cx="${W - 60}" cy="8" r="0.7" fill="#7f001c" opacity="0.3" />

  <!-- Left Side: LCD Gameboy Bezel -->
  <rect x="18" y="18" width="112" height="184" rx="6" fill="url(#bezelGrad)" stroke="#18181b" stroke-width="1.5" />

  <!-- Left side screw dots -->
  <circle cx="22" cy="22" r="1.5" fill="#18181b" opacity="0.6" />
  <circle cx="22" cy="${198}" r="1.5" fill="#18181b" opacity="0.6" />
  <circle cx="126" cy="22" r="1.5" fill="#18181b" opacity="0.6" />
  <circle cx="126" cy="${198}" r="1.5" fill="#18181b" opacity="0.6" />

  <!-- Screen LCD Panel -->
  <rect x="24" y="24" width="100" height="115" rx="3" fill="url(#screenGrad)" stroke="#18181b" stroke-width="1.5" />

  <!-- CRT Scanline Overlay -->
  <rect x="24" y="24" width="100" height="115" rx="3" fill="url(#scanlines)" />

  <!-- Screen Glare Reflection -->
  <polygon points="24,24 124,24 24,115" fill="url(#screenGlare)" />

  <!-- Screen Pixel Grid Corner Marks -->
  <rect x="26" y="26" width="4" height="4" fill="#18181b" opacity="0.08" />
  <rect x="118" y="26" width="4" height="4" fill="#18181b" opacity="0.08" />
  <rect x="26" y="137" width="4" height="4" fill="#18181b" opacity="0.08" />
  <rect x="118" y="137" width="4" height="4" fill="#18181b" opacity="0.08" />

  <!-- Sprite Shadow -->
  <ellipse cx="76" cy="140" rx="16" ry="3" fill="#000" opacity="0.12" class="sprite-group" />

  <!-- Animated Procedural Sprite -->
  <g class="sprite-group" transform="translate(26, 30)">
    ${spriteSvgRects}
  </g>

  <!-- Decorative ground platform for sprite -->
  <rect x="48" y="137" width="50" height="2" fill="#18181b" opacity="0.08" />

  <!-- Battery/Status LED with glow -->
  <circle cx="74" cy="160" r="6" fill="#7f001c" opacity="0.15" class="led-glow" />
  <circle cx="74" cy="160" r="3" fill="#ef4444" class="led-core" />
  <circle cx="74" cy="160" r="1.5" fill="#fca5a5" class="led-core" />

  <!-- Screen Label Section -->
  <rect x="24" y="145" width="100" height="42" rx="3" fill="#18181b" />
  
  <!-- LV display with decorative accent line -->
  <line x1="30" y1="153" x2="118" y2="153" stroke="#7f001c" stroke-width="0.5" opacity="0.3" />
  <text x="74" y="164" fill="#ffffff" font-family="monospace" font-size="9" font-weight="900" text-anchor="middle" letter-spacing="1">LV ${level}</text>
  <text x="74" y="173" fill="#a1a1aa" font-family="monospace" font-size="6.5" opacity="0.7" text-anchor="middle" letter-spacing="0.5">ROASTEMON PROFILE</text>
  <text x="74" y="182" fill="#7f001c" font-family="monospace" font-size="6" font-weight="bold" text-anchor="middle" letter-spacing="1">CHAOS NETWORK</text>
  
  <!-- Version badge in screen -->
  <rect x="94" y="147" width="26" height="8" rx="2" fill="#7f001c" opacity="0.3" />
  <text x="107" y="153" fill="#fca5a5" font-family="monospace" font-size="5" font-weight="bold" text-anchor="middle">GEN.2</text>

  <!-- Right Panel: Username Bar -->
  <rect x="142" y="18" width="300" height="24" rx="4" fill="#18181b" stroke="#27272a" stroke-width="0.5" />
  <!-- Username with @ symbol highlight -->
  <text x="150" y="34" fill="#7f001c" font-family="monospace" font-size="10" font-weight="900">@</text>
  <text x="158" y="34" fill="#ffffff" font-family="monospace" font-size="10" font-weight="900" letter-spacing="0.5">${cleanUsername.toUpperCase()}</text>
  
  <!-- Win/Loss with trophy indicator -->
  <text x="432" y="34" fill="#facc15" font-family="monospace" font-size="6" text-anchor="end" opacity="0.7">W</text>
  <text x="426" y="34" fill="#ffffff" font-family="monospace" font-size="8.5" font-weight="bold" text-anchor="end">${entry?.wins || 0}</text>
  <text x="440" y="28" fill="#a1a1aa" font-family="monospace" font-size="5" text-anchor="end" opacity="0.5">L</text>
  <text x="440" y="34" fill="#a1a1aa" font-family="monospace" font-size="7" text-anchor="end">${entry?.losses || 0}</text>

  <!-- Monster Name with glow -->
  <text x="145" y="57" fill="#ffffff" font-family="monospace" font-size="12" font-weight="900" filter="url(#glow)">${monName.toUpperCase()}</text>

  <!-- Decorative underline for mon name -->
  <line x1="145" y1="60" x2="145" y2="60" stroke="#7f001c" stroke-width="1.5" opacity="0.6" />
  <line x1="145" y1="60" x2="${145 + monName.length * 7.5}" y2="60" stroke="#7f001c" stroke-width="1" opacity="0.3" />

  <!-- Type Badge with gradient border -->
  <rect x="330" y="46" width="112" height="16" rx="20" fill="#18181b" stroke="#7f001c" stroke-width="1.5" />
  <rect x="331.5" y="47.5" width="109" height="13" rx="18" fill="none" stroke="#f87171" stroke-width="0.5" opacity="0.3" />
  <text x="386" y="57" fill="#fca5a5" font-family="monospace" font-size="7.5" font-weight="bold" text-anchor="middle" letter-spacing="0.5">${type.toUpperCase()}</text>

  <!-- Separator -->
  <line x1="142" y1="67" x2="442" y2="67" stroke="#334155" stroke-width="1" stroke-dasharray="2 4" opacity="0.4" />

  <!-- Core Stats -->
  <!-- HP -->
  <text x="145" y="85" fill="#a1a1aa" font-family="monospace" font-size="7.5" font-weight="bold">HEALTH LOOP</text>
  <text x="220" y="85" fill="#ffffff" font-family="monospace" font-size="8" font-weight="bold" text-anchor="end">${hp}%</text>
  <rect x="228" y="77" width="214" height="9" rx="3" fill="#18181b" />
  <rect x="228" y="77" width="${Math.floor(hp * 2.14)}" height="9" rx="3" fill="url(#hpGrad)" class="hp-bar" />
  <rect x="228" y="77" width="${Math.floor(hp * 2.14)}" height="9" rx="3" fill="url(#barShine)" />
  <rect x="228" y="77" width="${Math.floor(hp * 2.14)}" height="4" rx="2" fill="#ffffff" opacity="0.08" />

  <!-- ATTACK -->
  <text x="145" y="98" fill="#a1a1aa" font-family="monospace" font-size="7.5" font-weight="bold">BUG SUMMONS</text>
  <text x="220" y="98" fill="#ffffff" font-family="monospace" font-size="8" font-weight="bold" text-anchor="end">${attack}%</text>
  <rect x="228" y="90" width="214" height="9" rx="3" fill="#18181b" />
  <rect x="228" y="90" width="${Math.floor(attack * 2.14)}" height="9" rx="3" fill="url(#atkGrad)" />
  <rect x="228" y="90" width="${Math.floor(attack * 2.14)}" height="9" rx="3" fill="url(#barShine)" />
  <rect x="228" y="90" width="${Math.floor(attack * 2.14)}" height="4" rx="2" fill="#ffffff" opacity="0.08" />

  <!-- DEFENSE -->
  <text x="145" y="111" fill="#a1a1aa" font-family="monospace" font-size="7.5" font-weight="bold">CODE SHIELD</text>
  <text x="220" y="111" fill="#ffffff" font-family="monospace" font-size="8" font-weight="bold" text-anchor="end">${defense}%</text>
  <rect x="228" y="103" width="214" height="9" rx="3" fill="#18181b" />
  <rect x="228" y="103" width="${Math.floor(defense * 2.14)}" height="9" rx="3" fill="url(#defGrad)" />
  <rect x="228" y="103" width="${Math.floor(defense * 2.14)}" height="9" rx="3" fill="url(#barShine)" />
  <rect x="228" y="103" width="${Math.floor(defense * 2.14)}" height="4" rx="2" fill="#ffffff" opacity="0.08" />

  <!-- SPEED -->
  <text x="145" y="124" fill="#a1a1aa" font-family="monospace" font-size="7.5" font-weight="bold">CYCLE SPEED</text>
  <text x="220" y="124" fill="#ffffff" font-family="monospace" font-size="8" font-weight="bold" text-anchor="end">${speed}%</text>
  <rect x="228" y="116" width="214" height="9" rx="3" fill="#18181b" />
  <rect x="228" y="116" width="${Math.floor(speed * 2.14)}" height="9" rx="3" fill="url(#spdGrad)" />
  <rect x="228" y="116" width="${Math.floor(speed * 2.14)}" height="9" rx="3" fill="url(#barShine)" />
  <rect x="228" y="116" width="${Math.floor(speed * 2.14)}" height="4" rx="2" fill="#ffffff" opacity="0.08" />

  <!-- CHAOS -->
  <text x="145" y="137" fill="#a1a1aa" font-family="monospace" font-size="7.5" font-weight="bold">CHAOS FLOW</text>
  <text x="220" y="137" fill="#ffffff" font-family="monospace" font-size="8" font-weight="bold" text-anchor="end">${chaos}%</text>
  <rect x="228" y="129" width="214" height="9" rx="3" fill="#18181b" />
  <rect x="228" y="129" width="${Math.floor(chaos * 2.14)}" height="9" rx="3" fill="url(#chaosGrad)" />
  <rect x="228" y="129" width="${Math.floor(chaos * 2.14)}" height="9" rx="3" fill="url(#barShine)" />
  <rect x="228" y="129" width="${Math.floor(chaos * 2.14)}" height="4" rx="2" fill="#ffffff" opacity="0.08" />

  <!-- Dialogue / Roast Box -->
  <!-- Outer bezel -->
  <rect x="140" y="146" width="304" height="42" rx="5" fill="#18181b" stroke="#27272a" stroke-width="1" />
  <!-- Inner dialogue background -->
  <rect x="142" y="148" width="300" height="38" rx="3" fill="#f1f5f9" />
  <!-- Scanlines inside dialogue box -->
  <rect x="142" y="148" width="300" height="38" rx="3" fill="url(#scanlines)" opacity="0.3" />
  
  <!-- Dialogue top accent line -->
  <line x1="142" y1="148" x2="442" y2="148" stroke="#7f001c" stroke-width="1" />
  <!-- Dialogue pointer triangle (retro game style) -->
  <polygon points="150,148 150,156 158,148" fill="#7f001c" opacity="0.8" />
  <polygon points="151,149 151,155 157,149" fill="#f1f5f9" />

  ${roastSvg}

  <!-- Footer Watermark -->
  <text x="145" y="207" fill="#7f001c" font-family="monospace" font-size="6" font-weight="bold" letter-spacing="1.5">● GITTYMON-STER</text>
  
  <!-- Generation badge in footer -->
  <rect x="256" y="198" width="36" height="10" rx="3" fill="#7f001c" opacity="0.2" />
  <text x="274" y="205" fill="#7f001c" font-family="monospace" font-size="5.5" font-weight="bold" text-anchor="middle" letter-spacing="0.5">V2.0</text>

  <text x="442" y="207" fill="#3f3f46" font-family="monospace" font-size="6" font-weight="bold" text-anchor="end" opacity="0.5">GITHUB.COM/KEVINJOBIN1/GITTYMON</text>

</svg>`;
}

// ======== GIF Card Generator ========

function getProceduralGrid24(seed: string): number[][] {
  const hash = getSeedHash(seed);
  const lcg = new LCG(hash);
  const grid: number[][] = Array(24).fill(0).map(() => Array(24).fill(0));
  const limbsType = lcg.nextRange(0, 3);
  const eyesType = lcg.nextRange(0, 3);
  const hornsType = lcg.nextRange(0, 4);

  for (let y = 4; y < 20; y++) {
    for (let x = 3; x < 12; x++) {
      let fillType = 0;
      if (x <= 11 && x >= 11 - Math.floor(lcg.next() * 5 + 3)) {
        if (y >= 7 && y <= 16) fillType = lcg.next() > 0.35 ? 2 : 3;
      }
      if (hornsType === 0 && y >= 4 && y <= 6 && x >= 8 && x < 11) fillType = 2;
      else if (hornsType === 1 && y === 5 && x >= 5 && x <= 8) fillType = 3;
      else if (hornsType === 2 && y >= 3 && y <= 5 && x === 10) fillType = 3;
      if (limbsType === 0 && y >= 11 && y <= 13 && x >= 3 && x <= 6) fillType = 2;
      else if (limbsType === 1 && y >= 14 && y <= 15 && x >= 2 && x <= 5) fillType = 3;
      if (y >= 17 && y <= 18 && x >= 6 && x <= 10) fillType = 2;
      grid[y][x] = fillType;
    }
  }

  if (eyesType === 0) { grid[9][8] = 3; grid[10][8] = 0; grid[9][9] = 3; }
  else if (eyesType === 1) { grid[9][7] = 3; grid[9][8] = 3; grid[9][9] = 3; }
  else { grid[8][7] = 3; grid[9][8] = 3; grid[9][9] = 3; }
  grid[12][10] = 0;
  grid[13][11] = 2;

  for (let y = 0; y < 24; y++)
    for (let x = 0; x < 12; x++)
      grid[y][23 - x] = grid[y][x];

  const finalGrid: number[][] = Array(24).fill(0).map(() => Array(24).fill(0));
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const c = grid[y][x];
      if (c > 0) { finalGrid[y][x] = c; continue; }
      for (const [ny, nx] of [[y-1,x],[y+1,x],[y,x-1],[y,x+1]]) {
        if (ny >= 0 && ny < 24 && nx >= 0 && nx < 24 && grid[ny][nx] > 0) {
          finalGrid[y][x] = 1; break;
        }
      }
    }
  }
  return finalGrid;
}

// --- 5x5 Pixel Font Dictionary ---
const BITMAPS: Record<string, string[]> = {
  'A': [" XXX ", "X   X", "XXXXX", "X   X", "X   X"],
  'B': ["XXXX ", "X   X", "XXXX ", "X   X", "XXXX "],
  'C': [" XXXX", "X    ", "X    ", "X    ", " XXXX"],
  'D': ["XXXX ", "X   X", "X   X", "X   X", "XXXX "],
  'E': ["XXXXX", "X    ", "XXXX ", "X    ", "XXXXX"],
  'F': ["XXXXX", "X    ", "XXXX ", "X    ", "X    "],
  'G': [" XXXX", "X    ", "X  XX", "X   X", " XXXX"],
  'H': ["X   X", "X   X", "XXXXX", "X   X", "X   X"],
  'I': [" XXX ", "  X  ", "  X  ", "  X  ", " XXX "],
  'J': ["  XXX", "    X", "    X", "X   X", " XXX "],
  'K': ["X   X", "X  X ", "XXX  ", "X  X ", "X   X"],
  'L': ["X    ", "X    ", "X    ", "X    ", "XXXXX"],
  'M': ["X   X", "XX XX", "X X X", "X   X", "X   X"],
  'N': ["X   X", "XX  X", "X X X", "X  XX", "X   X"],
  'O': [" XXX ", "X   X", "X   X", "X   X", " XXX "],
  'P': ["XXXX ", "X   X", "XXXX ", "X    ", "X    "],
  'Q': [" XXX ", "X   X", "X   X", "X  XX", " XXXX"],
  'R': ["XXXX ", "X   X", "XXXX ", "X  X ", "X   X"],
  'S': [" XXXX", "X    ", " XXX ", "    X", "XXXX "],
  'T': ["XXXXX", "  X  ", "  X  ", "  X  ", "  X  "],
  'U': ["X   X", "X   X", "X   X", "X   X", " XXX "],
  'V': ["X   X", "X   X", "X   X", " X X ", "  X  "],
  'W': ["X   X", "X   X", "X X X", "XX XX", "X   X"],
  'X': ["X   X", " X X ", "  X  ", " X X ", "X   X"],
  'Y': ["X   X", " X X ", "  X  ", "  X  ", "  X  "],
  'Z': ["XXXXX", "   X ", "  X  ", " X   ", "XXXXX"],
  '0': [" XXX ", "X  XX", "X X X", "XX  X", " XXX "],
  '1': ["  X  ", " XX  ", "  X  ", "  X  ", " XXX "],
  '2': [" XXX ", "X   X", "  XX ", " X   ", "XXXXX"],
  '3': ["XXXX ", "    X", " XXX ", "    X", "XXXX "],
  '4': ["X  X ", "X  X ", "XXXXX", "   X ", "   X "],
  '5': ["XXXXX", "X    ", "XXXX ", "    X", "XXXX "],
  '6': [" XXXX", "X    ", "XXXX ", "X   X", "XXXX "],
  '7': ["XXXXX", "    X", "   X ", "  X  ", "  X  "],
  '8': [" XXX ", "X   X", " XXX ", "X   X", " XXX "],
  '9': [" XXX ", "X   X", " XXXX", "    X", " XXX "],
  ' ': ["     ", "     ", "     ", "     ", "     "],
  ':': ["     ", "  X  ", "     ", "  X  ", "     "],
  '@': [" XXX ", "X  XX", "X X X", "X  X ", " XXXX"],
  '-': ["     ", "     ", " XXX ", "     ", "     "],
  '_': ["     ", "     ", "     ", "     ", "XXXXX"],
  '.': ["     ", "     ", "     ", "  X  ", "  X  "],
  '%': ["X   X", "   X ", "  X  ", " X   ", "X   X"],
  '+': ["     ", "  X  ", " XXX ", "  X  ", "     "],
  '*': [" X X ", "  X  ", "XXXXX", "  X  ", " X X "],
  '/': ["    X", "   X ", "  X  ", " X   ", "X    "],
  '!': ["  X  ", "  X  ", "  X  ", "     ", "  X  "],
  '?': [" XXX ", "    X", "  XX ", "     ", "  X  "],
  '[': ["  XX ", "  X  ", "  X  ", "  X  ", "  XX "],
  ']': [" XX  ", "  X  ", "  X  ", "  X  ", " XX  "],
  '|': ["  X  ", "  X  ", "  X  ", "  X  ", "  X  "],
};

class PixelCanvas {
  width: number;
  height: number;
  pixels: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height);
  }

  setPixel(x: number, y: number, colorIndex: number) {
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    if (cx >= 0 && cx < this.width && cy >= 0 && cy < this.height) {
      this.pixels[cy * this.width + cx] = colorIndex;
    }
  }

  fillRect(x: number, y: number, w: number, h: number, colorIndex: number) {
    const xS = Math.max(0, Math.floor(x));
    const xE = Math.min(this.width, Math.floor(x + w));
    const yS = Math.max(0, Math.floor(y));
    const yE = Math.min(this.height, Math.floor(y + h));
    for (let cy = yS; cy < yE; cy++) {
      const off = cy * this.width;
      for (let cx = xS; cx < xE; cx++) this.pixels[off + cx] = colorIndex;
    }
  }

  drawRect(x: number, y: number, w: number, h: number, colorIndex: number) {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const w0 = Math.floor(w), h0 = Math.floor(h);
    for (let cx = x0; cx < x0 + w0; cx++) { this.setPixel(cx, y0, colorIndex); this.setPixel(cx, y0 + h0 - 1, colorIndex); }
    for (let cy = y0; cy < y0 + h0; cy++) { this.setPixel(x0, cy, colorIndex); this.setPixel(x0 + w0 - 1, cy, colorIndex); }
  }

  drawText(text: string, x: number, y: number, colorIndex: number) {
    const upper = text.toUpperCase();
    let cx = Math.floor(x);
    const sy = Math.floor(y);
    for (let i = 0; i < upper.length; i++) {
      const bm = BITMAPS[upper[i]] || BITMAPS[' '];
      for (let r = 0; r < 5; r++)
        for (let c = 0; c < 5; c++)
          if (bm[r][c] === 'X') this.setPixel(cx + c, sy + r, colorIndex);
      cx += 6;
    }
  }
}

function wrapTextToLength(text: string, maxLen: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= maxLen) cur = (cur + ' ' + w).trim();
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function generateGifCard(username: string): Buffer {
  const cleanUsername = username.trim().replace(/[^a-zA-Z0-9-]/g, '');

  const leaderboard = loadLeaderboard();
  const entry = leaderboard.find(e => e.username.toLowerCase() === cleanUsername.toLowerCase());

  const githubMockData = {
    public_repos: cleanUsername.length * 2 || 12,
    followers: (cleanUsername.charCodeAt(0) % 20) || 4,
    joinedYear: '2022',
  };

  const codeHash = cleanUsername.length + githubMockData.public_repos;
  const hp = Math.max(25, Math.min(99, 30 + (githubMockData.followers * 3) % 70));
  const attack = Math.max(25, Math.min(99, 40 + (githubMockData.public_repos * 2) % 60));
  const defense = Math.max(25, Math.min(99, 50 + (parseInt(githubMockData.joinedYear) % 10) * 5));
  const speed = Math.max(25, Math.min(99, 45 + (cleanUsername.charCodeAt(0) % 50)));
  const chaos = Math.max(25, Math.min(99, 10 + (githubMockData.public_repos * 5) % 90));

  const names = ['NodeSlime', 'Forkachu', 'AsyncPod', 'CommitoBat', 'Dockergon', 'GitSlasher', 'JSON_Golem', 'BugMander'];
  const monName = entry?.monName || names[codeHash % names.length];
  const types = ['Direct-to-master', 'AnyScript-Type', 'StackOverflow Cloner', 'Merge-Fearful', 'Coffee-Fueled', 'Infinite-Loop'];
  const type = types[cleanUsername.charCodeAt(0) % types.length];
  const level = entry?.level || Math.max(1, Math.min(99, Math.floor(githubMockData.public_repos * 1.5 + githubMockData.followers)));

  const roasts = [
    'Only uses brute force push -m. Absolute terror to code reviews.',
    'Bio is standard default template. Crawls StackOverflow daily for solutions.',
    'Has zero comments, uses var instead of let. Legacy engine standby.',
    'Spends 5 hours styling tiny retro buttons instead of shipping real core features.',
    'Your commit messages are single letters. Git history looks like a ransom note.',
    'Writes code like its a typing test. Zero regard for the human maintainer.',
    'Your PR descriptions are three words max. Code review is archaeology.',
    'Uses nested ternaries like Russian nesting dolls. Nobody dares touch your files.'
  ];
  const roast = roasts[codeHash % roasts.length];

  const spriteSeed = `${cleanUsername}-${githubMockData.joinedYear}-${githubMockData.public_repos}`;
  const spriteGrid = getProceduralGrid24(spriteSeed);

  const W = 230;
  const H = 110;

  const PALETTE = [
    [10, 13, 22],     // 0: Space navy background
    [24, 24, 27],     // 1: Slate console frame
    [127, 0, 28],     // 2: Crimson red
    [255, 255, 255], // 3: Pure white
    [197, 203, 180], // 4: Screen light LCD
    [173, 181, 150], // 5: Screen dark LCD
    [26, 26, 26],     // 6: Deep text pixels
    [63, 63, 70],     // 7: Bezel gray
    [226, 223, 222], // 8: Light dialog
    [239, 68, 68],   // 9: LED red
    [250, 204, 21],   // 10: Amber
    [39, 39, 42],     // 11: Dark bar bg
    [161, 161, 170], // 12: Silver label
    [56, 189, 248],  // 13: Neon cyan
    [244, 63, 94],   // 14: Pink
    [15, 23, 42],    // 15: Dark blue
    [248, 113, 113], // 16: Light red (HP glow)
    [168, 85, 247],  // 17: Purple (chaos glow)
    [34, 211, 238],  // 18: Bright cyan
    [250, 204, 21],  // 19: Gold
  ];

  const flatPalette = PALETTE.flat();
  const gif = createGIFEncoder();

  const NUM_FRAMES = 16;

  // Bounce curve: smoother with ease-in-out feel
  const bounceCurve = [0, -0.5, -1.5, -2.5, -3, -2.5, -1.5, -0.5, 0, -0.5, -1.5, -2, -1.5, -0.5, 0, -0.5];

  for (let f = 0; f < NUM_FRAMES; f++) {
    const canvas = new PixelCanvas(W, H);

    // -- Background with shifting grid --
    canvas.fillRect(0, 0, W, H, 0);
    
    // Animated dot grid background
    for (let gy = 0; gy < H; gy += 8) {
      for (let gx = 0; gx < W; gx += 8) {
        const phase = (gx + gy + f * 3) % 24;
        if (phase < 12) {
          canvas.setPixel(gx, gy, 15);
        }
      }
    }

    // Moving CRT scanline
    const scanY = Math.floor(((f * 7) % H));
    for (let sx = 0; sx < W; sx++) {
      if (sx % 2 === 0) canvas.setPixel(sx, scanY, 13);
      if (sx % 3 === 0 && scanY + 1 < H) canvas.setPixel(sx, scanY + 1, 13);
    }

    // -- Outer Frame --
    canvas.fillRect(3, 3, W - 6, H - 6, 1);
    canvas.drawRect(3, 3, W - 6, H - 6, 6);

    // Corner brackets
    const cb = 2; // corner bracket color
    for (let dx = 5; dx < 14; dx++) { canvas.setPixel(dx, 4, cb); canvas.setPixel(dx, H - 5, cb); }
    for (let dx = W - 14; dx < W - 5; dx++) { canvas.setPixel(dx, 4, cb); canvas.setPixel(dx, H - 5, cb); }
    for (let dy = 5; dy < 14; dy++) { canvas.setPixel(4, dy, cb); canvas.setPixel(W - 5, dy, cb); }
    for (let dy = H - 14; dy < H - 5; dy++) { canvas.setPixel(4, dy, cb); canvas.setPixel(W - 5, dy, cb); }

    // Border pulse (alternating frames)
    if (f % 2 === 0) {
      for (let cx = 6; cx < W - 6; cx += 4) { canvas.setPixel(cx, 5, 2); canvas.setPixel(cx, H - 6, 2); }
      for (let cy = 6; cy < H - 6; cy += 4) { canvas.setPixel(5, cy, 2); canvas.setPixel(W - 6, cy, 2); }
    }

    // -- Screen Bezel --
    canvas.fillRect(9, 9, 56, 90, 7);
    canvas.drawRect(9, 9, 56, 90, 6);

    // -- LED with glow ring --
    const ledColor = (f % 4 < 2) ? 9 : 10;
    canvas.fillRect(11, 19, 3, 3, ledColor);
    if (f % 3 === 0) {
      // Glow ring
      canvas.setPixel(10, 18, 9); canvas.setPixel(14, 18, 9);
      canvas.setPixel(10, 22, 9); canvas.setPixel(14, 22, 9);
      canvas.setPixel(12, 17, 9); canvas.setPixel(12, 23, 9);
      canvas.setPixel(9, 20, 9); canvas.setPixel(15, 20, 9);
    }

    // -- LCD Screen --
    canvas.fillRect(12, 12, 50, 56, 4);
    // CRT dither pattern on screen
    for (let sy = 12; sy < 68; sy += 2) {
      for (let sx = 12; sx < 62; sx++) {
        canvas.setPixel(sx, sy, 5);
      }
    }
    canvas.drawRect(12, 12, 50, 56, 6);

    // Screen glare (diagonal bright pixels)
    if (f % 2 === 0) {
      for (let g = 0; g < 6; g++) {
        canvas.setPixel(14 + g, 14 + g, 3);
        canvas.setPixel(16 + g, 16 + g, 4);
      }
    }

    // -- Sprite with squish bounce --
    const bounceY = Math.floor(bounceCurve[f]);
    // Sprite shadow (grows when sprite is at lowest bounce)
    const shadowSquish = (bounceY < -2) ? 5 : 3;
    canvas.fillRect(30, 64 - shadowSquish, 14, 4, 15);
    canvas.setPixel(34, 64 - shadowSquish, 6);

    // Draw sprite
    for (let yGrid = 0; yGrid < 24; yGrid++) {
      for (let xGrid = 0; xGrid < 24; xGrid++) {
        const cell = spriteGrid[yGrid][xGrid];
        if (cell > 0) {
          let ci = 6;
          if (cell === 2) ci = 2;
          else if (cell === 3) ci = 3;
          const dy = (yGrid < 17) ? bounceY : 0;
          canvas.setPixel(25 + xGrid, 27 + yGrid + dy, ci);
        }
      }
    }

    // -- Bottom Screen Label --
    canvas.fillRect(12, 70, 50, 20, 6);
    canvas.drawText(`LV ${level}`, 20, 73, 3);
    canvas.drawText(`GITTY`, 20, 82, 2);

    // GEN badge in screen
    canvas.drawRect(52, 71, 8, 3, 2);
    canvas.drawText('2', 53, 72, 3);

    // -- Username Bar --
    canvas.fillRect(69, 8, 154, 12, 6);
    canvas.drawText(`@${cleanUsername.toUpperCase().slice(0, 14)}`, 73, 11, 3);
    const wlStr = `W:${entry?.wins || 0}L:${entry?.losses || 0}`;
    canvas.drawText(wlStr, 175, 11, 2);

    // -- Mon Name --
    const trimmedName = monName.toUpperCase().slice(0, 12);
    canvas.drawText(trimmedName, 73, 24, 3);

    // Type badge
    canvas.drawRect(156, 22, 64, 8, 2);
    const trimmedType = type.length > 10 ? type.substring(0, 10) : type;
    canvas.drawText(trimmedType.toUpperCase(), 159, 24, 2);

    // Separator line
    for (let dx = 69; dx < 222; dx += 4) { canvas.setPixel(dx, 32, 11); }

    // -- Stat Bars with animated glow on HP --
    const stats = [
      { name: "HP ", val: hp, col: 2, glowCol: 16, glow: true },
      { name: "ATK", val: attack, col: 8, glowCol: 3, glow: false },
      { name: "DEF", val: defense, col: 3, glowCol: 3, glow: false },
      { name: "SPD", val: speed, col: 7, glowCol: 13, glow: false },
      { name: "CHS", val: chaos, col: 14, glowCol: 17, glow: true }
    ];

    stats.forEach((st, idx) => {
      const ry = 35 + idx * 7;
      canvas.drawText(st.name, 73, ry, 12);
      canvas.drawText(`${st.val}%`, 100, ry, 3);
      canvas.fillRect(126, ry + 1, 93, 3, 11);
      const fillW = Math.max(2, Math.floor((st.val / 100) * 93));
      canvas.fillRect(126, ry + 1, fillW, 3, st.col);

      // Glow effect on some stats (animated)
      if (st.glow && f % 4 < 2) {
        canvas.fillRect(126, ry + 1, Math.min(fillW, 93), 3, st.glowCol);
      }
    });

    // -- Dialogue Box --
    canvas.fillRect(69, 71, 154, 22, 8);
    canvas.drawRect(69, 71, 154, 22, 6);

    // Dialogue pointer
    canvas.fillRect(72, 71, 5, 4, 2);
    canvas.fillRect(73, 72, 3, 2, 8);

    // Typewriter effect roast text with cursor
    const fullRoastUpper = roast.toUpperCase();
    const totalChars = fullRoastUpper.length;
    let visibleCount = totalChars;
    if (f < 12) {
      visibleCount = Math.floor(totalChars * (f + 1) / 12);
    }
    const visibleText = fullRoastUpper.substring(0, visibleCount);
    const wrapLines = wrapTextToLength(visibleText, 22).slice(0, 3);

    if (f % 3 < 2 && wrapLines.length > 0) {
      const lastIdx = wrapLines.length - 1;
      if (wrapLines[lastIdx].length < 22) {
        wrapLines[lastIdx] += '_';
      }
    }

    wrapLines.forEach((line, li) => {
      canvas.drawText(line, 74, 74 + li * 6, 6);
    });

    gif.writeFrame(canvas.pixels, W, H, {
      palette: flatPalette,
      delay: 100
    });
  }

  gif.finish();
  const bytes = gif.bytes();
  return Buffer.from(bytes);
}
