import { loadLeaderboard } from './leaderboard.js';
import gifenc from 'gifenc';

function createGIFEncoder(opts?: any) {
  if (typeof gifenc === 'function') {
    return (gifenc as any)(opts);
  }
  const anyGifenc = gifenc as any;
  if (anyGifenc && typeof anyGifenc.GIFEncoder === 'function') {
    return anyGifenc.GIFEncoder(opts);
  }
  if (anyGifenc && typeof anyGifenc.default === 'function') {
    return anyGifenc.default(opts);
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

// Generates procedural sprite data as SVG rects
function getProceduralSpriteSvg(seed: string): string {
  const hash = getSeedHash(seed);
  const lcg = new LCG(hash);

  const colors = ['#1a1a1a', '#7f001c', '#e2dfde', '#ffffff'];

  const pixelGrid: number[][] = Array(24).fill(0).map(() => Array(24).fill(0));

  const limbsType = lcg.nextRange(0, 3);
  const eyesType = lcg.nextRange(0, 3);
  const hornsType = lcg.nextRange(0, 4);

  for (let y = 4; y < 20; y++) {
    for (let x = 3; x < 12; x++) {
      let fillType = 0;

      if (x <= 11 && x >= 11 - Math.floor(lcg.next() * 5 + 3)) {
        if (y >= 7 && y <= 16) {
          fillType = lcg.next() > 0.35 ? 2 : 3;
        }
      }

      if (hornsType === 0 && y >= 4 && y <= 6 && x >= 8 && x < 11) {
        fillType = 2;
      } else if (hornsType === 1 && y === 5 && x >= 5 && x <= 8) {
        fillType = 3;
      } else if (hornsType === 2 && y >= 3 && y <= 5 && x === 10) {
        fillType = 3;
      }

      if (limbsType === 0 && y >= 11 && y <= 13 && x >= 3 && x <= 6) {
        fillType = 2;
      } else if (limbsType === 1 && y >= 14 && y <= 15 && x >= 2 && x <= 5) {
        fillType = 3;
      }

      if (y >= 17 && y <= 18 && x >= 6 && x <= 10) {
        fillType = 2;
      }

      pixelGrid[y][x] = fillType;
    }
  }

  if (eyesType === 0) {
    pixelGrid[9][8] = 3;
    pixelGrid[10][8] = 0;
    pixelGrid[9][9] = 3;
  } else if (eyesType === 1) {
    pixelGrid[9][7] = 3;
    pixelGrid[9][8] = 3;
    pixelGrid[9][9] = 3;
  } else {
    pixelGrid[8][7] = 3;
    pixelGrid[9][8] = 3;
    pixelGrid[9][9] = 3;
  }

  pixelGrid[12][10] = 0;
  pixelGrid[13][11] = 2;

  // Mirror
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 12; x++) {
      pixelGrid[y][23 - x] = pixelGrid[y][x];
    }
  }

  // Outline
  const finalGrid: number[][] = Array(24).fill(0).map(() => Array(24).fill(0));
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const current = pixelGrid[y][x];
      if (current > 0) {
        finalGrid[y][x] = current;
      } else {
        let hasFilledNeighbor = false;
        const neighbors = [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]];
        for (const [ny, nx] of neighbors) {
          if (ny >= 0 && ny < 24 && nx >= 0 && nx < 24) {
            if (pixelGrid[ny][nx] > 0) {
              hasFilledNeighbor = true;
              break;
            }
          }
        }
        if (hasFilledNeighbor) {
          finalGrid[y][x] = 1;
        }
      }
    }
  }

  // Draw SVG rects (scaled 5x each pixel)
  let rects = '';
  const pixelSize = 4;
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const cell = finalGrid[y][x];
      if (cell === 0) continue;
      const fillColor = cell === 1 ? colors[0] : cell === 2 ? colors[1] : colors[2];
      const px = x * pixelSize;
      const py = y * pixelSize;
      
      // We apply standard translate wrapping inside group instead of absolute bob on each pixel
      rects += `<rect x="${px}" y="${py}" width="${pixelSize}" height="${pixelSize}" fill="${fillColor}" />\n`;
    }
  }
  return rects;
}

// Simple word wrapping for the roast text
function wrapText(text: string, maxLen: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxLen) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export function generateSvgCard(username: string): string {
  const cleanUsername = username.trim().replace(/[^a-zA-Z0-9-]/g, '');

  // Look up user on the high score leaderboard file first!
  const leaderboard = loadLeaderboard();
  const entry = leaderboard.find(e => e.username.toLowerCase() === cleanUsername.toLowerCase());

  // Deterministically recreate stats based on the usernames length
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
    `Only uses brute force push -m. Absolute terror to code reviews.`,
    `Bio is standard default template. Crawls StackOverflow daily for solutions.`,
    `Has zero comments, uses var instead of let. Legacy engine standby.`,
    `Spends 5 hours styling tiny retro buttons instead of shipping real core features.`
  ];
  const roast = roasts[codeHash % roasts.length];

  const spriteSeed = `${cleanUsername}-${githubMockData.joinedYear}-${githubMockData.public_repos}`;
  const spriteSvgRects = getProceduralSpriteSvg(spriteSeed);

  // SVG dimensions: 460 x 220
  const width = 460;
  const height = 220;

  // Wrap Roast lines
  const roastLines = wrapText(roast.toUpperCase(), 35);
  const lineYStart = 158;
  const lineGap = 11;
  let roastTextSvg = '';
  roastLines.slice(0, 3).forEach((line, i) => {
    roastTextSvg += `<text x="145" y="${lineYStart + i * lineGap}" fill="#7f001c" font-family="monospace" font-size="7.5" font-weight="extrabold">${line}</text>\n`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  <defs>
    <!-- Card Gradients -->
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b" />
      <stop offset="100%" stop-color="#0f0f13" />
    </linearGradient>
    <linearGradient id="bezelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3f3f46" />
      <stop offset="100%" stop-color="#18181b" />
    </linearGradient>
    <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#c5cbb4" />
      <stop offset="100%" stop-color="#adb596" />
    </linearGradient>
    <style>
      @keyframes spriteBob {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-3px); }
        100% { transform: translateY(0px); }
      }
      .sprite-group {
        animation: spriteBob 3.5s ease-in-out infinite;
      }
      .glow-text {
        text-shadow: 0px 0px 4px rgba(255, 255, 255, 0.2);
      }
    </style>
  </defs>

  <!-- High-Craft Outer Console Frame -->
  <rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="14" fill="url(#cardGrad)" stroke="#1a1a1a" stroke-width="4" />
  <rect x="6" y="6" width="${width - 12}" height="${height - 12}" rx="10" fill="none" stroke="#7f001c" stroke-width="1.5" stroke-dasharray="2 3" opacity="0.6" />

  <!-- Left Side: LCD Gameboy Bezel Screen -->
  <rect x="18" y="18" width="112" height="184" rx="6" fill="url(#bezelGrad)" stroke="#1a1a1a" stroke-width="2" />
  
  <!-- Screen LCD Panel -->
  <rect x="24" y="24" width="100" height="115" rx="3" fill="url(#screenGrad)" stroke="#1a1a1a" stroke-width="1.5" />
  
  <!-- Retro Screen Dither Grids Accents -->
  <line x1="24" y1="24" x2="124" y2="24" stroke="#7f001c" stroke-width="1" opacity="0.1" />
  <line x1="24" y1="34" x2="124" y2="34" stroke="#1a1a1a" stroke-width="1" opacity="0.05" />
  <line x1="24" y1="44" x2="124" y2="44" stroke="#1a1a1a" stroke-width="1" opacity="0.05" />
  <line x1="24" y1="54" x2="124" y2="54" stroke="#1a1a1a" stroke-width="1" opacity="0.05" />
  <line x1="24" y1="64" x2="124" y2="64" stroke="#1a1a1a" stroke-width="1" opacity="0.05" />
  <line x1="24" y1="74" x2="124" y2="74" stroke="#1a1a1a" stroke-width="1" opacity="0.05" />
  <line x1="24" y1="84" x2="124" y2="84" stroke="#1a1a1a" stroke-width="1" opacity="0.05" />
  <line x1="24" y1="94" x2="124" y2="94" stroke="#1a1a1a" stroke-width="1" opacity="0.05" />
  <line x1="24" y1="104" x2="124" y2="104" stroke="#1a1a1a" stroke-width="1" opacity="0.05" />
  <line x1="24" y1="114" x2="124" y2="114" stroke="#1a1a1a" stroke-width="1" opacity="0.05" />

  <!-- Animated Procedural Sprite Group (Scaled 24x24 pixel-art upscaled visually) -->
  <g class="sprite-group" transform="translate(26, 32)">
    ${spriteSvgRects}
  </g>

  <!-- Battery/Status LED Red Light indicator -->
  <circle cx="21" cy="40" r="2.5" fill="#ef4444" />
  <circle cx="21" cy="40" r="1.5" fill="#fca5a5" />

  <!-- Screen Label Inside Screen Frame -->
  <rect x="24" y="145" width="100" height="42" rx="3" fill="#1a1a1a" />
  <text x="74" y="157" fill="#ffffff" font-family="monospace" font-size="8.5" font-weight="black" text-anchor="middle" letter-spacing="0.5">LV ${level}</text>
  <text x="74" y="169" fill="#e2dfde" font-family="monospace" font-size="7" opacity="0.8" text-anchor="middle">ROASTEMON PROFILE</text>
  <text x="74" y="179" fill="#7f001c" font-family="monospace" font-size="6.5" font-weight="black" text-anchor="middle">CHAOS NETWORK</text>

  <!-- Right Side: Developer Stats & Parameters Panel -->
  <!-- Header: Username tag -->
  <rect x="142" y="18" width="300" height="24" rx="4" fill="#1a1a1a" />
  <text x="152" y="34" fill="#ffffff" font-family="monospace" font-size="10" font-weight="900" letter-spacing="1">@${cleanUsername.toUpperCase()}</text>
  <text x="432" y="33" fill="#7f001c" font-family="monospace" font-size="8.5" font-weight="black" text-anchor="end">W:${entry?.wins || 0} L:${entry?.losses || 0}</text>

  <!-- Active Mon Label & Type -->
  <text x="145" y="58" fill="#ffffff" font-family="monospace" font-size="12" font-weight="black" class="glow-text">${monName.toUpperCase()}</text>
  
  <!-- Type Pill badge outline -->
  <rect x="330" y="47" width="112" height="15" rx="35" fill="none" stroke="#7f001c" stroke-width="1.5" />
  <text x="386" y="57" fill="#7f001c" font-family="monospace" font-size="7.5" font-weight="bold" text-anchor="middle">${type.toUpperCase()}</text>

  <!-- Separation bar -->
  <line x1="142" y1="67" x2="442" y2="67" stroke="#334155" stroke-width="1.5" stroke-dasharray="2 3" opacity="0.3" />

  <!-- Core Stats Grid Layout -->
  <!-- HP -->
  <text x="145" y="85" fill="#a1a1aa" font-family="monospace" font-size="8" font-weight="bold">HEALTH LOOP</text>
  <text x="215" y="85" fill="#ffffff" font-family="monospace" font-size="8" font-weight="bold">${hp}%</text>
  <rect x="245" y="78" width="197" height="8" rx="2" fill="#27272a" />
  <rect x="245" y="78" width="${Math.floor(hp * 1.97)}" height="8" rx="2" fill="#7f001c" />

  <!-- ATTACK -->
  <text x="145" y="98" fill="#a1a1aa" font-family="monospace" font-size="8" font-weight="bold">BUG SUMMONS</text>
  <text x="215" y="98" fill="#ffffff" font-family="monospace" font-size="8" font-weight="bold">${attack}%</text>
  <rect x="245" y="91" width="197" height="8" rx="2" fill="#27272a" />
  <rect x="245" y="91" width="${Math.floor(attack * 1.97)}" height="8" rx="2" fill="#e2dfde" />

  <!-- DEFENSE -->
  <text x="145" y="111" fill="#a1a1aa" font-family="monospace" font-size="8" font-weight="bold">CODE SHIELD</text>
  <text x="215" y="111" fill="#ffffff" font-family="monospace" font-size="8" font-weight="bold">${defense}%</text>
  <rect x="245" y="104" width="197" height="8" rx="2" fill="#27272a" />
  <rect x="245" y="104" width="${Math.floor(defense * 1.97)}" height="8" rx="2" fill="#ffffff" />

  <!-- SPEED -->
  <text x="145" y="124" fill="#a1a1aa" font-family="monospace" font-size="8" font-weight="bold">CYCLE SPEED</text>
  <text x="215" y="124" fill="#ffffff" font-family="monospace" font-size="8" font-weight="bold">${speed}%</text>
  <rect x="245" y="117" width="197" height="8" rx="2" fill="#27272a" />
  <rect x="245" y="117" width="${Math.floor(speed * 1.97)}" height="8" rx="2" fill="#4b5563" />

  <!-- CHAOS -->
  <text x="145" y="137" fill="#a1a1aa" font-family="monospace" font-size="8" font-weight="bold">CHAOS FLOW</text>
  <text x="215" y="137" fill="#ffffff" font-family="monospace" font-size="8" font-weight="bold">${chaos}%</text>
  <rect x="245" y="130" width="197" height="8" rx="2" fill="#27272a" />
  <rect x="245" y="130" width="${Math.floor(chaos * 1.97)}" height="8" rx="2" fill="#b91c1c" />

  <!-- Narrative Dialogue Box Bezel on Right -->
  <rect x="142" y="146" width="300" height="42" rx="4" fill="#f1f5f9" stroke="#1a1a1a" stroke-width="1.5" />
  <line x1="142" y1="146" x2="442" y2="146" stroke="#e2dfde" stroke-width="1.5" />
  ${roastTextSvg}

  <!-- Footer Watermark brand lines -->
  <text x="145" y="199" fill="#7f001c" font-family="monospace" font-size="6.5" font-weight="black" letter-spacing="1.5">● GAMEBOY RETRO PLATFORM V2</text>
  <text x="442" y="199" fill="#cbd5e1" font-family="monospace" font-size="6.5" font-weight="black" text-anchor="end" opacity="0.4">SUMMONED AT AI.STUDIO/BUILD</text>

</svg>
`;
}

// Procedural Sprite Grid Extractor (clean mirroring & outline builder)
function getProceduralGrid24(seed: string): number[][] {
  const hash = getSeedHash(seed);
  const lcg = new LCG(hash);

  const pixelGrid: number[][] = Array(24).fill(0).map(() => Array(24).fill(0));

  const limbsType = lcg.nextRange(0, 3);
  const eyesType = lcg.nextRange(0, 3);
  const hornsType = lcg.nextRange(0, 4);

  for (let y = 4; y < 20; y++) {
    for (let x = 3; x < 12; x++) {
      let fillType = 0;

      if (x <= 11 && x >= 11 - Math.floor(lcg.next() * 5 + 3)) {
        if (y >= 7 && y <= 16) {
          fillType = lcg.next() > 0.35 ? 2 : 3;
        }
      }

      if (hornsType === 0 && y >= 4 && y <= 6 && x >= 8 && x < 11) {
        fillType = 2;
      } else if (hornsType === 1 && y === 5 && x >= 5 && x <= 8) {
        fillType = 3;
      } else if (hornsType === 2 && y >= 3 && y <= 5 && x === 10) {
        fillType = 3;
      }

      if (limbsType === 0 && y >= 11 && y <= 13 && x >= 3 && x <= 6) {
        fillType = 2;
      } else if (limbsType === 1 && y >= 14 && y <= 15 && x >= 2 && x <= 5) {
        fillType = 3;
      }

      if (y >= 17 && y <= 18 && x >= 6 && x <= 10) {
        fillType = 2;
      }

      pixelGrid[y][x] = fillType;
    }
  }

  if (eyesType === 0) {
    pixelGrid[9][8] = 3;
    pixelGrid[10][8] = 0;
    pixelGrid[9][9] = 3;
  } else if (eyesType === 1) {
    pixelGrid[9][7] = 3;
    pixelGrid[9][8] = 3;
    pixelGrid[9][9] = 3;
  } else {
    pixelGrid[8][7] = 3;
    pixelGrid[9][8] = 3;
    pixelGrid[9][9] = 3;
  }

  pixelGrid[12][10] = 0;
  pixelGrid[13][11] = 2;

  // Mirror
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 12; x++) {
      pixelGrid[y][23 - x] = pixelGrid[y][x];
    }
  }

  // Outline
  const finalGrid: number[][] = Array(24).fill(0).map(() => Array(24).fill(0));
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const current = pixelGrid[y][x];
      if (current > 0) {
        finalGrid[y][x] = current;
      } else {
        let hasFilledNeighbor = false;
        const neighbors = [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]];
        for (const [ny, nx] of neighbors) {
          if (ny >= 0 && ny < 24 && nx >= 0 && nx < 24) {
            if (pixelGrid[ny][nx] > 0) {
              hasFilledNeighbor = true;
              break;
            }
          }
        }
        if (hasFilledNeighbor) {
          finalGrid[y][x] = 1;
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
    const xStart = Math.max(0, Math.floor(x));
    const xEnd = Math.min(this.width, Math.floor(x + w));
    const yStart = Math.max(0, Math.floor(y));
    const yEnd = Math.min(this.height, Math.floor(y + h));
    for (let cy = yStart; cy < yEnd; cy++) {
      const offset = cy * this.width;
      for (let cx = xStart; cx < xEnd; cx++) {
        this.pixels[offset + cx] = colorIndex;
      }
    }
  }

  drawRect(x: number, y: number, w: number, h: number, colorIndex: number) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const w0 = Math.floor(w);
    const h0 = Math.floor(h);
    for (let cx = x0; cx < x0 + w0; cx++) {
      this.setPixel(cx, y0, colorIndex);
      this.setPixel(cx, y0 + h0 - 1, colorIndex);
    }
    for (let cy = y0; cy < y0 + h0; cy++) {
      this.setPixel(x0, cy, colorIndex);
      this.setPixel(x0 + w0 - 1, cy, colorIndex);
    }
  }

  drawText(text: string, x: number, y: number, colorIndex: number) {
    const upper = text.toUpperCase();
    let currentX = Math.floor(x);
    const startY = Math.floor(y);
    for (let i = 0; i < upper.length; i++) {
      const char = upper[i];
      const bitmap = BITMAPS[char] || BITMAPS[' '];
      for (let r = 0; r < 5; r++) {
        const line = bitmap[r];
        for (let c = 0; c < 5; c++) {
          if (line[c] === 'X') {
            this.setPixel(currentX + c, startY + r, colorIndex);
          }
        }
      }
      currentX += 6;
    }
  }
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
    `Only uses brute force push -m. Absolute terror to code reviews.`,
    `Bio is standard default template. Crawls StackOverflow daily for solutions.`,
    `Has zero comments, uses var instead of let. Legacy engine standby.`,
    `Spends 5 hours styling tiny retro buttons instead of shipping real core features.`
  ];
  const roast = roasts[codeHash % roasts.length];

  const spriteSeed = `${cleanUsername}-${githubMockData.joinedYear}-${githubMockData.public_repos}`;
  const spriteGrid = getProceduralGrid24(spriteSeed);

  const width = 230;
  const height = 110;

  const PALETTE = [
    [10, 13, 22],     // 0: Space navy background
    [24, 24, 27],     // 1: Slate console frame body
    [127, 0, 28],     // 2: Crimson red highlights
    [255, 255, 255], // 3: Pure white
    [197, 203, 180], // 4: Screen light LCD base
    [173, 181, 150], // 5: Screen dark LCD dither
    [26, 26, 26],     // 6: Deep screen text pixels
    [63, 63, 70],     // 7: Screen bezel dark gray
    [226, 223, 222], // 8: Light dialog/stats slate-white
    [239, 68, 68],   // 9: Bright battery LED Red
    [250, 204, 21],   // 10: Bright amber pulse
    [39, 39, 42],     // 11: Dark grey bars
    [161, 161, 170], // 12: Silver labels
    [56, 189, 248],  // 13: Neon cyber cyan
    [244, 63, 94],   // 14: Cyber pulse pink
    [15, 23, 42]      // 15: Dark blue-slate backdrop
  ];

  const flatPalette = PALETTE.flat();
  const gif = createGIFEncoder();

  for (let f = 0; f < 10; f++) {
    const canvas = new PixelCanvas(width, height);

    canvas.fillRect(0, 0, width, height, 0);
    for (let gy = 0; gy < height; gy += 16) {
      for (let gx = 0; gx < width; gx += 16) {
        const shiftX = (gx + f) % width;
        canvas.setPixel(shiftX, gy, 15);
      }
    }

    const scanlineY = Math.floor((f / 10) * height);
    for (let sx = 0; sx < width; sx++) {
      if (sx % 2 === 0) {
        canvas.setPixel(sx, scanlineY, 13);
      }
    }

    canvas.fillRect(4, 4, width - 8, height - 8, 1);
    canvas.drawRect(4, 4, width - 8, height - 8, 6);

    for (let cx = 6; cx < width - 6; cx += 3) {
      canvas.setPixel(cx, 6, 2);
      canvas.setPixel(cx, height - 7, 2);
    }
    for (let cy = 6; cy < height - 6; cy += 3) {
      canvas.setPixel(6, cy, 2);
      canvas.setPixel(width - 7, cy, 2);
    }

    canvas.fillRect(9, 9, 56, 92, 7);
    canvas.drawRect(9, 9, 56, 92, 6);

    const batteryColor = (f === 3 || f === 7) ? 10 : 9;
    canvas.fillRect(10, 20, 2, 2, batteryColor);

    canvas.fillRect(12, 12, 50, 58, 4);
    for (let sy = 12; sy < 12 + 58; sy += 2) {
      for (let sx = 12; sx < 12 + 50; sx++) {
        canvas.setPixel(sx, sy, 5);
      }
    }
    canvas.drawRect(12, 12, 50, 58, 6);

    const bounceOffset = [0, -1, -2, -3, -2, -1, 0, -1, -2, -1];
    const bounceY = bounceOffset[f];

    for (let yGrid = 0; yGrid < 24; yGrid++) {
      for (let xGrid = 0; xGrid < 24; xGrid++) {
        const cell = spriteGrid[yGrid][xGrid];
        if (cell > 0) {
          let colIdx = 6;
          if (cell === 2) {
            colIdx = 2;
          } else if (cell === 3) {
            colIdx = 3;
          }
          canvas.setPixel(25 + xGrid, 27 + yGrid + bounceY, colIdx);
        }
      }
    }

    canvas.fillRect(12, 72, 50, 21, 6);
    canvas.drawText(`LV ${level}`, 20, 75, 3);
    canvas.drawText(`GITTY`, 20, 84, 2);

    canvas.fillRect(71, 9, 150, 12, 6);
    canvas.drawText(`@${cleanUsername.toUpperCase()}`, 75, 12, 3);
    
    const winLossStr = `W:${entry?.wins || 0} L:${entry?.losses || 0}`;
    canvas.drawText(winLossStr, 175, 12, 2);

    canvas.drawText(monName.toUpperCase(), 74, 25, 3);
    canvas.drawRect(155, 23, 66, 8, 2);
    const trimmedType = (type.length > 10 ? type.substring(0, 10) : type).toUpperCase();
    canvas.drawText(trimmedType, 158, 25, 2);

    for (let dx = 71; dx < 221; dx += 4) {
      canvas.setPixel(dx, 33, 11);
    }

    const stats = [
      { name: "HP ", val: hp, col: 2 },
      { name: "ATK", val: attack, col: 8 },
      { name: "DEF", val: defense, col: 3 },
      { name: "SPD", val: speed, col: 7 },
      { name: "CHS", val: chaos, col: 14 }
    ];

    stats.forEach((st, idx) => {
      const rowY = 36 + idx * 7;
      canvas.drawText(st.name, 74, rowY, 12);
      canvas.drawText(`${st.val}%`, 100, rowY, 3);
      canvas.fillRect(125, rowY + 1, 95, 3, 11);
      const fillW = Math.max(2, Math.floor((st.val / 100) * 95));
      canvas.fillRect(125, rowY + 1, fillW, 3, st.col);
    });

    canvas.fillRect(71, 73, 150, 21, 8);
    canvas.drawRect(71, 73, 150, 21, 6);

    const fullRoastUpper = roast.toUpperCase();
    const totalChars = fullRoastUpper.length;
    let visibleCount = totalChars;
    if (f < 7) {
      visibleCount = Math.floor(totalChars * (f + 1) / 7);
    }
    const visibleRoastText = fullRoastUpper.substring(0, visibleCount);
    const wrapLines = wrapTextToLength(visibleRoastText, 24).slice(0, 3);

    const showCursor = (f % 2 === 0);
    if (showCursor && wrapLines.length > 0) {
      const lastLineIdx = wrapLines.length - 1;
      if (wrapLines[lastLineIdx].length < 24) {
        wrapLines[lastLineIdx] += '_';
      }
    }

    wrapLines.forEach((line, lineIdx) => {
      canvas.drawText(line, 74, 76 + lineIdx * 6, 6);
    });

    gif.writeFrame(canvas.pixels, width, height, {
      palette: flatPalette,
      delay: 110
    });
  }

  gif.finish();
  const bytes = gif.bytes();
  return Buffer.from(bytes);
}

// Word wrap helper at fixed width
function wrapTextToLength(text: string, maxLen: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxLen) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

