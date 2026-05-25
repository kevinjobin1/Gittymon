import { loadLeaderboard } from './leaderboard';
import { GIFEncoder } from 'gifenc';
import { Env } from './types';

// ======== Seed Hashing & RNG ========
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
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 4294967296;
  }
  nextRange(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }
}

// ======== Full sprite builder matching the client-side buildSpriteGrid ========

const SERVER_PALETTES: Record<string, [string, string, string, string]> = {
  dmg:    ['#1a1a1a', '#7f001c', '#e2dfde', '#ffffff'],
  pocket: ['#0f172a', '#475569', '#94a3b8', '#f8fafc'],
  ember:  ['#1a1a1a', '#dc2626', '#fdba74', '#fef3c7'],
  frost:  ['#1e293b', '#0284c7', '#7dd3fc', '#f0f9ff'],
  toxic:  ['#1a1a1a', '#16a34a', '#a3e635', '#f0fdf4'],
  royal:  ['#1a1a1a', '#7e22ce', '#e9d5ff', '#faf5ff'],
  neon:   ['#1a1a1a', '#ec4899', '#2dd4bf', '#ffffff'],
};
const SERVER_PALETTE_NAMES = Object.keys(SERVER_PALETTES);

interface ServerSpriteResult {
  grid: number[][];
  palette: [string, string, string, string];
}

function buildServerSpriteGrid(seed: string): ServerSpriteResult {
  const hash = getSeedHash(seed);
  const lcg = new LCG(hash);
  const paletteName = SERVER_PALETTE_NAMES[lcg.nextRange(0, SERVER_PALETTE_NAMES.length)];
  const palette = SERVER_PALETTES[paletteName];

  const bodyShape   = lcg.nextRange(0, 5);
  const limbsType   = lcg.nextRange(0, 4);
  const eyesType    = lcg.nextRange(0, 6);
  const hornsType   = lcg.nextRange(0, 5);
  const tailType    = lcg.nextRange(0, 4);
  const patternType = lcg.nextRange(0, 4);
  const mouthType   = lcg.nextRange(0, 3);

  const blinkPeriod = lcg.nextRange(120, 200);
  const blinkDuration = lcg.nextRange(4, 8);
  const localFrame = 0 % blinkPeriod;
  const blinkState = localFrame < blinkDuration
    ? (localFrame < 2 ? 2 : localFrame < blinkDuration - 2 ? 1 : 0) : 0;

  const grid: number[][] = Array.from({ length: 24 }, () => Array(24).fill(0));

  // 1. CORE BODY
  for (let y = 4; y < 20; y++) {
    for (let x = 3; x < 12; x++) {
      let fill = 0;
      switch (bodyShape) {
        case 0:
          if (x <= 11 && x >= 11 - Math.floor(lcg.next() * 5 + 3) && y >= 7 && y <= 16) {
            fill = lcg.next() > 0.35 ? 2 : 3;
          }
          break;
        case 1:
          if (x >= 7 && x <= 11 && y >= 4 && y <= 18) {
            fill = 2;
          } else if (y >= 7 && y <= 16 && x >= 5 && x <= 11) {
            fill = lcg.next() > 0.4 ? 2 : 3;
          }
          break;
        case 2:
          if (y >= 8 && y <= 15 && x >= 2 && x <= 11) {
            fill = lcg.next() > 0.35 ? 2 : 3;
          }
          break;
        case 3:
          if (y >= 5 && y <= 18) {
            const halfW = Math.floor((18 - Math.abs(11.5 - y)) / 1.8);
            if (x >= 11 - halfW) fill = lcg.next() > 0.3 ? 2 : 3;
          }
          break;
        case 4:
          const pearW = y > 12 ? 11 - Math.floor((y - 12) * 0.3) : 8 - Math.floor((12 - y) * 0.4);
          if (x >= 11 - pearW && y >= 6 && y <= 18) {
            fill = lcg.next() > 0.35 ? 2 : 3;
          }
          break;
      }
      grid[y][x] = fill;
    }
  }

  // 2. HORNS
  if (hornsType === 0) {
    for (let y = 3; y <= 6; y++) {
      if (y >= 4 && y <= 6) { grid[y][9] = 2; grid[y][10] = 2; }
      if (y === 3) { grid[3][9] = 3; grid[3][10] = 3; }
    }
  } else if (hornsType === 1) {
    grid[5][5] = 3; grid[5][6] = 3; grid[6][5] = 2;
  } else if (hornsType === 2) {
    grid[3][10] = 3; grid[3][11] = 3; grid[4][10] = 3; grid[4][11] = 3;
    grid[2][10] = 3; grid[2][11] = 3;
  } else if (hornsType === 3) {
    grid[4][7] = lcg.next() > 0.5 ? 3 : 2;
    grid[4][8] = lcg.next() > 0.5 ? 3 : 2;
    grid[4][9] = lcg.next() > 0.5 ? 3 : 2;
    grid[4][10] = lcg.next() > 0.5 ? 3 : 2;
    grid[5][7] = 2; grid[5][10] = 2;
  }

  // 3. LIMBS
  if (limbsType === 0) {
    for (let y = 11; y <= 13; y++) { grid[y][3] = 2; grid[y][4] = 2; }
  } else if (limbsType === 1) {
    for (let y = 13; y <= 15; y++) { grid[y][2] = 3; grid[y][3] = 3; }
    grid[16][2] = 2;
  } else if (limbsType === 2) {
    for (let y = 8; y <= 14; y++) {
      const wingX = y < 11 ? y - 5 : 14 - y + 3;
      if (wingX >= 1) { grid[y][wingX] = (y % 2 === 0) ? 3 : 2; }
    }
    grid[10][2] = 3; grid[10][3] = 3;
  }

  // 4. FEET
  for (let y = 17; y <= 18; y++) { grid[y][6] = 2; grid[y][7] = 2; grid[y][9] = 2; grid[y][10] = 2; }
  grid[18][5] = 3; grid[18][8] = 3; grid[18][11] = 3;

  // 5. EYES
  const eyeY = eyesType === 4 ? 10 : 9;
  if (blinkState === 2) {
    grid[eyeY][8] = 1; grid[eyeY][9] = 1;
  } else if (blinkState === 1) {
    grid[eyeY][8] = 1; grid[eyeY][9] = 1;
    grid[eyeY - 1][8] = 3; grid[eyeY - 1][9] = 3;
  } else if (eyesType === 0) {
    grid[eyeY][7] = 3; grid[eyeY + 1][7] = 3;
    grid[eyeY][8] = 0; grid[eyeY + 1][8] = 3;
    grid[eyeY][9] = 3; grid[eyeY + 1][9] = 3;
    grid[eyeY][7] = 0;
  } else if (eyesType === 1) {
    grid[eyeY][6] = 3; grid[eyeY][7] = 3; grid[eyeY][8] = 3; grid[eyeY][9] = 3;
  } else if (eyesType === 2) {
    grid[8][6] = 3; grid[9][7] = 3; grid[9][8] = 3; grid[9][9] = 3;
  } else if (eyesType === 3) {
    grid[eyeY][7] = 3; grid[eyeY][8] = 0; grid[eyeY][9] = 3;
    grid[eyeY - 1][7] = 3; grid[eyeY - 1][9] = 3;
  } else if (eyesType === 4) {
    grid[9][7] = 3; grid[9][8] = 3; grid[9][9] = 3; grid[10][8] = 0;
  } else if (eyesType === 5) {
    grid[eyeY][8] = 5; grid[eyeY][9] = 5;
    grid[eyeY - 1][8] = 5; grid[eyeY - 1][9] = 5;
  }

  // 6. MOUTH
  if (mouthType === 0) { grid[12][9] = 0; grid[12][10] = 0; grid[13][10] = 2; }
  else if (mouthType === 1) { grid[12][9] = 0; grid[12][10] = 0; grid[11][10] = 2; }
  else { grid[12][9] = 0; grid[12][10] = 0; grid[13][9] = 0; grid[13][10] = 0; }

  // TAIL (on left side BEFORE mirror — mirror will produce the right side)
  if (tailType === 1) { grid[15][2] = 2; grid[14][1] = 3; grid[15][1] = 2; grid[14][0] = 3; grid[15][0] = 2; }
  else if (tailType === 2) { grid[14][1] = 2; grid[13][0] = 3; grid[15][1] = 2; grid[16][0] = 3; }
  else if (tailType === 3) { grid[14][2] = 2; grid[13][1] = 3; grid[14][1] = 3; grid[15][2] = 2; grid[15][1] = 2; grid[14][0] = 3; grid[15][0] = 2; }

  // MIRROR
  for (let y = 0; y < 24; y++)
    for (let x = 0; x < 12; x++)
      grid[y][23 - x] = grid[y][x];

  // OUTLINES
  const finalGrid: number[][] = Array.from({ length: 24 }, () => Array(24).fill(0));
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const cell = grid[y][x];
      if (cell > 0) { finalGrid[y][x] = cell; }
      else {
        for (const [ny, nx] of [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]]) {
          if (ny >= 0 && ny < 24 && nx >= 0 && nx < 24 && grid[ny][nx] > 0) { finalGrid[y][x] = 1; break; }
        }
      }
    }
  }

  // PATTERNS (left half only, then re-mirror to preserve symmetry)
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 12; x++) {
      if (finalGrid[y][x] === 2 && patternType === 1 && (Math.floor(y / 2) % 2 === 0)) finalGrid[y][x] = 4;
      if (finalGrid[y][x] === 2 && patternType === 2 && (y % 3 === 0 && x % 3 === 0)) finalGrid[y][x] = 4;
      if (finalGrid[y][x] === 2 && patternType === 3 && ((y + x) % 4 < 2)) finalGrid[y][x] = 3;
    }
  }
  // Re-mirror left half pattern changes to right half
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 12; x++) {
      finalGrid[y][23 - x] = finalGrid[y][x];
    }
  }

  return { grid: finalGrid, palette };
}

function getSpriteSvgRects(grid: number[][], palette: [string, string, string, string]): string {
  let rects = '';
  const ps = 4;
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const cell = grid[y][x];
      if (cell === 0) continue;
      const color = cell === 1 ? palette[0] : cell === 2 ? palette[1] : cell === 3 ? palette[2] : cell === 4 ? palette[3] : cell === 5 ? '#ffffff' : palette[0];
      rects += `<rect x="${x * ps}" y="${y * ps}" width="${ps}" height="${ps}" fill="${color}" />\n`;
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

// ======== SVG Card Generator (Pokémon TCG Layout) ========
export async function generateSvgCard(username: string, env: Env): Promise<string> {
  const cleanUsername = (username.trim().replace(/[^a-zA-Z0-9-]/g, '')) || 'x';
  const leaderboard = await loadLeaderboard(env.LEADERBOARD);
  const entry = leaderboard.find(e => e.username.toLowerCase() === cleanUsername.toLowerCase());

  const publicRepos = cleanUsername.length * 2 || 12;
  const followers = (cleanUsername.charCodeAt(0) % 20) || 4;
  const joinedYear = '2022';
  const codeHash = cleanUsername.length + publicRepos;
  const hp = Math.max(25, Math.min(99, 30 + (followers * 3) % 70));
  const attack = Math.max(25, Math.min(99, 40 + (publicRepos * 2) % 60));
  const defense = Math.max(25, Math.min(99, 50 + (parseInt(joinedYear) % 10) * 5));
  const speed = Math.max(25, Math.min(99, 45 + (cleanUsername.charCodeAt(0) % 50)));
  const chaos = Math.max(25, Math.min(99, 10 + (publicRepos * 5) % 90));

  const names = ['NodeSlime','Forkachu','AsyncPod','CommitoBat','Dockergon','GitSlasher','JSON_Golem','BugMander'];
  const monName = entry?.monName || names[codeHash % names.length];
  const types = ['Direct-to-master','AnyScript-Type','StackOverflow Cloner','Merge-Fearful','Coffee-Fueled','Infinite-Loop'];
  const type = types[cleanUsername.charCodeAt(0) % types.length];
  const level = entry?.level || Math.max(1, Math.min(99, Math.floor(publicRepos * 1.5 + followers)));
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
  const spriteSeed = `${cleanUsername}-${joinedYear}-${publicRepos}`;
  const spriteResult = buildServerSpriteGrid(spriteSeed);
  const spriteSvgRects = getSpriteSvgRects(spriteResult.grid, spriteResult.palette);
  const W = 460, H = 220;

  const roastLines = wrapText(roast.toUpperCase(), 48).slice(0, 2);
  let roastSvg = '';
  roastLines.forEach((line, i) => {
    roastSvg += `<text x="230" y="${194 + i * 8}" fill="#a1a1aa" font-family="monospace" font-size="7.5" font-style="italic" text-anchor="middle">${line}</text>\n`;
  });

  const typeLabel = type.length > 16 ? type.slice(0, 16).toUpperCase() : type.toUpperCase();
  const typeW = Math.max(40, typeLabel.length * 4.5 + 16);
  const typeX = (W - typeW) / 2;
  const hpColor = hp > 50 ? '#22c55e' : hp > 25 ? '#eab308' : '#ef4444';
  const hpW = Math.max(4, Math.floor(80 * (Math.min(100, hp) / 100)));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#0a0d16" />
      <stop offset="100%" stop-color="#05080f" />
    </linearGradient>
    <radialGradient id="cardShine" cx="50%" cy="18%" r="50%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.04)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0)" />
    </radialGradient>

  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" rx="10" fill="url(#bgGrad)" />
  <rect width="${W}" height="${H}" rx="10" fill="url(#cardShine)" />

  <!-- Card Border -->
  <rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="10" stroke="#27272a" stroke-width="2" fill="none" />

  <!-- Top Accent Bar -->
  <rect x="4" y="4" width="${W - 8}" height="3" fill="#7f001c" />

  <!-- Monster Name (big, left) -->
  <text x="16" y="24" fill="#ffffff" font-family="monospace" font-size="18" font-weight="bold">${monName.toUpperCase().slice(0, 16)}</text>

  <!-- HP / LV Badge (right) -->
  <rect x="${W - 120}" y="8" width="108" height="18" rx="5" fill="#1a1a1a" />
  <text x="${W - 112}" y="22" fill="#ef4444" font-family="monospace" font-size="11" font-weight="bold">&#9829;</text>
  <text x="${W - 98}" y="22" fill="#ffffff" font-family="monospace" font-size="11" font-weight="bold">${hp}</text>
  <text x="${W - 76}" y="22" fill="#52525b" font-family="monospace" font-size="11" font-weight="bold">|</text>
  <text x="${W - 58}" y="22" fill="#e2dfde" font-family="monospace" font-size="11" font-weight="bold">LV${level}</text>

  <!-- Separator -->
  <line x1="12" y1="34" x2="${W - 12}" y2="34" stroke="#1e293b" stroke-width="1" />

  <!-- Artwork Panel -->
  <rect x="140" y="34" width="180" height="108" rx="8" fill="#475569" />

  <!-- Procedural Sprite -->
  <g transform="translate(${(W - 96) / 2}, 40)">
    ${spriteSvgRects}
  </g>

  <!-- Type Badge -->
  <rect x="${typeX}" y="142" width="${typeW}" height="14" rx="7" fill="rgba(127,0,28,0.15)" stroke="#7f001c" stroke-width="0.5" />
  <text x="${W / 2}" y="153" fill="#7f001c" font-family="monospace" font-size="7" font-weight="bold" text-anchor="middle">${typeLabel}</text>

  <!-- HP Bar -->
  <text x="16" y="170" fill="#a1a1aa" font-family="monospace" font-size="7" font-weight="bold">HP</text>
  <rect x="34" y="164" width="80" height="10" rx="4" fill="#27272a" />
  <rect x="34" y="164" width="${hpW}" height="10" rx="4" fill="${hpColor}" />
  <text x="40" y="172" fill="#ffffff" font-family="monospace" font-size="7" font-weight="bold">${hp}</text>

  <!-- ATK / DEF / SPD / CHA Stats -->
  <text x="140" y="170" fill="#71717a" font-family="monospace" font-size="6.5" font-weight="bold">ATK</text>
  <text x="166" y="170" fill="#e2dfde" font-family="monospace" font-size="8" font-weight="bold">${attack}</text>

  <text x="210" y="170" fill="#71717a" font-family="monospace" font-size="6.5" font-weight="bold">DEF</text>
  <text x="236" y="170" fill="#e2dfde" font-family="monospace" font-size="8" font-weight="bold">${defense}</text>

  <text x="280" y="170" fill="#71717a" font-family="monospace" font-size="6.5" font-weight="bold">SPD</text>
  <text x="306" y="170" fill="#e2dfde" font-family="monospace" font-size="8" font-weight="bold">${speed}</text>

  <text x="350" y="170" fill="#71717a" font-family="monospace" font-size="6.5" font-weight="bold">CHA</text>
  <text x="376" y="170" fill="#e2dfde" font-family="monospace" font-size="8" font-weight="bold">${chaos}</text>

  <!-- W/L Record -->
  <text x="${W - 16}" y="170" fill="#52525b" font-family="monospace" font-size="7" font-weight="bold" text-anchor="end">W:${entry?.wins || 0} L:${entry?.losses || 0}</text>

  <!-- Roast / Description Box -->
  <rect x="16" y="180" width="${W - 32}" height="24" rx="4" fill="#1e1e24" stroke="#334155" stroke-width="0.5" />
  ${roastSvg}

  <!-- Footer -->
  <text x="16" y="214" fill="#52525b" font-family="monospace" font-size="6.5" font-weight="bold">@${cleanUsername.toUpperCase()}</text>
  <text x="${W - 16}" y="214" fill="#7f001c" font-family="monospace" font-size="7" font-weight="bold" text-anchor="end">&#9889; GITTYMON</text>
</svg>`;
}

// ======== 5x5 Pixel Font Dictionary ========
const BITMAPS: Record<string, string[]> = {
  'A':[" XXX ","X   X","XXXXX","X   X","X   X"],'B':["XXXX ","X   X","XXXX ","X   X","XXXX "],
  'C':[" XXXX","X    ","X    ","X    "," XXXX"],'D':["XXXX ","X   X","X   X","X   X","XXXX "],
  'E':["XXXXX","X    ","XXXX ","X    ","XXXXX"],'F':["XXXXX","X    ","XXXX ","X    ","X    "],
  'G':[" XXXX","X    ","X  XX","X   X"," XXXX"],'H':["X   X","X   X","XXXXX","X   X","X   X"],
  'I':[" XXX ","  X  ","  X  ","  X  "," XXX "],'J':["  XXX","    X","    X","X   X"," XXX "],
  'K':["X   X","X  X ","XXX  ","X  X ","X   X"],'L':["X    ","X    ","X    ","X    ","XXXXX"],
  'M':["X   X","XX XX","X X X","X   X","X   X"],'N':["X   X","XX  X","X X X","X  XX","X   X"],
  'O':[" XXX ","X   X","X   X","X   X"," XXX "],'P':["XXXX ","X   X","XXXX ","X    ","X    "],
  'Q':[" XXX ","X   X","X   X","X  XX"," XXXX"],'R':["XXXX ","X   X","XXXX ","X  X ","X   X"],
  'S':[" XXXX","X    "," XXX ","    X","XXXX "],'T':["XXXXX","  X  ","  X  ","  X  ","  X  "],
  'U':["X   X","X   X","X   X","X   X"," XXX "],'V':["X   X","X   X","X   X"," X X ","  X  "],
  'W':["X   X","X   X","X X X","XX XX","X   X"],'X':["X   X"," X X ","  X  "," X X ","X   X"],
  'Y':["X   X"," X X ","  X  ","  X  ","  X  "],'Z':["XXXXX","   X ","  X  "," X   ","XXXXX"],
  '0':[" XXX ","X  XX","X X X","XX  X"," XXX "],'1':["  X  "," XX  ","  X  ","  X  "," XXX "],
  '2':[" XXX ","X   X","  XX "," X   ","XXXXX"],'3':["XXXX ","    X"," XXX ","    X","XXXX "],
  '4':["X  X ","X  X ","XXXXX","   X ","   X "],'5':["XXXXX","X    ","XXXX ","    X","XXXX "],
  '6':[" XXXX","X    ","XXXX ","X   X","XXXX "],'7':["XXXXX","    X","   X ","  X  ","  X  "],
  '8':[" XXX ","X   X"," XXX ","X   X"," XXX "],'9':[" XXX ","X   X"," XXXX","    X"," XXX "],
  ' ':["     ","     ","     ","     ","     "],':':["     ","  X  ","     ","  X  ","     "],
  '@':[" XXX ","X  XX","X X X","X  X "," XXXX"],'-':["     ","     "," XXX ","     ","     "],
  '_':["     ","     ","     ","     ","XXXXX"],'.':["     ","     ","     ","  X  ","  X  "],
  '%':["X   X","   X ","  X  "," X   ","X   X"],'+':["     ","  X  "," XXX ","  X  ","     "],
  '*':[" X X ","  X  ","XXXXX","  X  "," X X "],'/':["    X","   X ","  X  "," X   ","X    "],
  '!':["  X  ","  X  ","  X  ","     ","  X  "],'?':[" XXX ","    X","  XX ","     ","  X  "],
  '[':["  XX ","  X  ","  X  ","  X  ","  XX "],']':[" XX  ","  X  ","  X  ","  X  "," XX  "],
  '|':["  X  ","  X  ","  X  ","  X  ","  X  "],
};

class PixelCanvas {
  width: number; height: number; pixels: Uint8Array;
  constructor(width: number, height: number) {
    this.width = width; this.height = height;
    this.pixels = new Uint8Array(width * height);
  }
  setPixel(x: number, y: number, ci: number) {
    const cx = Math.floor(x), cy = Math.floor(y);
    if (cx >= 0 && cx < this.width && cy >= 0 && cy < this.height) this.pixels[cy * this.width + cx] = ci;
  }
  fillRect(x: number, y: number, w: number, h: number, ci: number) {
    const xS = Math.max(0, Math.floor(x)), xE = Math.min(this.width, Math.floor(x + w));
    const yS = Math.max(0, Math.floor(y)), yE = Math.min(this.height, Math.floor(y + h));
    for (let cy = yS; cy < yE; cy++) { const off = cy * this.width; for (let cx = xS; cx < xE; cx++) this.pixels[off + cx] = ci; }
  }
  drawRect(x: number, y: number, w: number, h: number, ci: number) {
    const x0 = Math.floor(x), y0 = Math.floor(y), w0 = Math.floor(w), h0 = Math.floor(h);
    for (let cx = x0; cx < x0 + w0; cx++) { this.setPixel(cx, y0, ci); this.setPixel(cx, y0 + h0 - 1, ci); }
    for (let cy = y0; cy < y0 + h0; cy++) { this.setPixel(x0, cy, ci); this.setPixel(x0 + w0 - 1, cy, ci); }
  }
  drawText(text: string, x: number, y: number, ci: number) {
    const upper = text.toUpperCase(); let cx = Math.floor(x); const sy = Math.floor(y);
    for (let i = 0; i < upper.length; i++) {
      const bm = BITMAPS[upper[i]] || BITMAPS[' '];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (bm[r][c] === 'X') this.setPixel(cx + c, sy + r, ci);
      cx += 6;
    }
  }
}

function wrapTextToLength(text: string, maxLen: number): string[] {
  const words = text.split(' '); const lines: string[] = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length <= maxLen) cur = (cur + ' ' + w).trim(); else { if (cur) lines.push(cur); cur = w; } }
  if (cur) lines.push(cur); return lines;
}

// ======== GIF Card Generator ========
export async function generateGifCard(username: string, env: Env): Promise<Uint8Array> {
  const cleanUsername = (username.trim().replace(/[^a-zA-Z0-9-]/g, '')) || 'x';
  const leaderboard = await loadLeaderboard(env.LEADERBOARD);
  const entry = leaderboard.find(e => e.username.toLowerCase() === cleanUsername.toLowerCase());
  const publicRepos = cleanUsername.length * 2 || 12;
  const followers = (cleanUsername.charCodeAt(0) % 20) || 4;
  const joinedYear = '2022';
  const codeHash = cleanUsername.length + publicRepos;
  const hp = Math.max(25, Math.min(99, 30 + (followers * 3) % 70));
  const attack = Math.max(25, Math.min(99, 40 + (publicRepos * 2) % 60));
  const defense = Math.max(25, Math.min(99, 50 + (parseInt(joinedYear) % 10) * 5));
  const speed = Math.max(25, Math.min(99, 45 + (cleanUsername.charCodeAt(0) % 50)));
  const chaos = Math.max(25, Math.min(99, 10 + (publicRepos * 5) % 90));
  const names = ['NodeSlime','Forkachu','AsyncPod','CommitoBat','Dockergon','GitSlasher','JSON_Golem','BugMander'];
  const monName = entry?.monName || names[codeHash % names.length];
  const types = ['Direct-to-master','AnyScript-Type','StackOverflow Cloner','Merge-Fearful','Coffee-Fueled','Infinite-Loop'];
  const type = types[cleanUsername.charCodeAt(0) % types.length];
  const level = entry?.level || Math.max(1, Math.min(99, Math.floor(publicRepos * 1.5 + followers)));
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
  const spriteSeed = `${cleanUsername}-${joinedYear}-${publicRepos}`;
  const spriteResult = buildServerSpriteGrid(spriteSeed);
  const spriteGrid = spriteResult.grid;
  const W = 230, H = 110;
  const PALETTE = [
    [10,13,22],[24,24,27],[127,0,28],[255,255,255],[30,41,59],[20,26,38],
    [26,26,26],[63,63,70],[226,223,222],[239,68,68],[250,204,21],[39,39,42],
    [161,161,170],[56,189,248],[113,113,122],[15,23,42],[34,197,94],[168,85,247],
    [34,211,238],[250,204,21],
  ];
  const gif = new GIFEncoder();
  const NUM_FRAMES = 16;
  const bounceCurve = [0,-0.5,-1.5,-2.5,-3,-2.5,-1.5,-0.5,0,-0.5,-1.5,-2,-1.5,-0.5,0,-0.5];

  for (let f = 0; f < NUM_FRAMES; f++) {
    const canvas = new PixelCanvas(W, H);
    canvas.fillRect(0, 0, W, H, 0);
    // Background dots
    for (let gy = 0; gy < H; gy += 8) {
      for (let gx = 0; gx < W; gx += 8) { if ((gx + gy + f * 3) % 24 < 12) canvas.setPixel(gx, gy, 15); }
    }
    // Outer frame
    canvas.fillRect(2, 2, W - 4, H - 4, 1);
    canvas.drawRect(2, 2, W - 4, H - 4, 7);
    // Top accent bar
    canvas.fillRect(3, 3, W - 6, 2, 2);

    // Name
    const trimmedName = monName.toUpperCase().slice(0, 14);
    canvas.drawText(trimmedName, 6, 8, 3);
    // HP/LV badge
    const hpStr = `${hp}`;
    canvas.drawText(`LV${level}`, W - 14 - hpStr.length * 6, 8, 12);
    canvas.drawText(`HP${hpStr}`, W - 14 - hpStr.length * 6 - 6 - 8, 8, 9);

    // Separator
    for (let dx = 4; dx < W - 4; dx += 2) canvas.setPixel(dx, 16, 11);

    // Sprite with bounce
    const bounceY = Math.floor(bounceCurve[f]);
    const shadowSquish = (bounceY < -2) ? 5 : 3;
    canvas.fillRect(79, 70 - shadowSquish, 14, 4, 15);
    canvas.setPixel(83, 70 - shadowSquish, 6);

    const spriteScale = 2;
    const spriteX = Math.floor((W - 24 * spriteScale) / 2);
    const spriteY = 22;
    for (let yGrid = 0; yGrid < 24; yGrid++) {
      for (let xGrid = 0; xGrid < 24; xGrid++) {
        const cell = spriteGrid[yGrid][xGrid];
        if (cell > 0) { let ci = 6; if (cell === 2) ci = 2; else if (cell === 3) ci = 3; const dy = (yGrid < 17) ? bounceY : 0; canvas.setPixel(spriteX + xGrid, spriteY + yGrid + dy, ci); }
      }
    }

    // Type below sprite
    const trimmedType = type.length > 10 ? type.substring(0, 10) : type;
    canvas.drawText(trimmedType.toUpperCase(), Math.floor((W - trimmedType.length * 6) / 2), 78, 2);

    // Stats row
    canvas.fillRect(4, 83, 70, 5, 11);
    const hpPct = Math.min(100, hp) / 100;
    const hpColor = hpPct > 0.5 ? 16 : hpPct > 0.25 ? 10 : 9;
    canvas.fillRect(4, 83, Math.max(2, Math.floor(70 * hpPct)), 5, hpColor);
    canvas.drawText(`HP${hp}`, 6, 84, 3);

    canvas.drawText(`ATK${attack}`, 82, 84, 3);
    canvas.drawText(`DEF${defense}`, 82, 90, 3);
    canvas.drawText(`SPD${speed}`, 147, 84, 3);
    canvas.drawText(`CHA${chaos}`, 147, 90, 3);

    const wlStr = `W${entry?.wins || 0}L${entry?.losses || 0}`;
    canvas.drawText(wlStr, W - 6 - wlStr.length * 6, 84, 14);

    // Roast
    canvas.fillRect(3, 96, W - 6, 11, 11);
    const fullRoastUpper = roast.toUpperCase();
    let visibleCount = fullRoastUpper.length;
    if (f < 12) visibleCount = Math.floor(fullRoastUpper.length * (f + 1) / 12);
    const visibleText = fullRoastUpper.substring(0, visibleCount);
    const wrapLines = wrapTextToLength(visibleText, 18).slice(0, 1);
    if (f % 3 < 2 && wrapLines.length > 0) {
      wrapLines[0] = wrapLines[0].padEnd(19, '_');
    }
    wrapLines.forEach((line, li) => canvas.drawText(line, 6, 98 + li * 6, 8));

    gif.writeFrame(canvas.pixels, W, H, { palette: PALETTE, delay: 100 });
  }
  gif.finish();
  return gif.bytes();
}
