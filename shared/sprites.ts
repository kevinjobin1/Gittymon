import type { ServerSpriteResult } from './types';

/* ------------------------------------------------------------------ */
/*  Seed Hashing & RNG                                                */
/* ------------------------------------------------------------------ */

export function getSeedHash(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export class LCG {
  private state: number;
  constructor(seedHash: number, useUnsigned = false) {
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

/* ------------------------------------------------------------------ */
/*  Palettes                                                          */
/* ------------------------------------------------------------------ */

export const SERVER_PALETTES: Record<string, [string, string, string, string]> = {
  dmg:    ['#1a1a1a', '#7f001c', '#e2dfde', '#ffffff'],
  pocket: ['#0f172a', '#475569', '#94a3b8', '#f8fafc'],
  ember:  ['#1a1a1a', '#dc2626', '#fdba74', '#fef3c7'],
  frost:  ['#1e293b', '#0284c7', '#7dd3fc', '#f0f9ff'],
  toxic:  ['#1a1a1a', '#16a34a', '#a3e635', '#f0fdf4'],
  royal:  ['#1a1a1a', '#7e22ce', '#e9d5ff', '#faf5ff'],
  neon:   ['#1a1a1a', '#ec4899', '#2dd4bf', '#ffffff'],
};
export const SERVER_PALETTE_NAMES = Object.keys(SERVER_PALETTES);

/* ------------------------------------------------------------------ */
/*  Full detailed sprite grid (24×24) - used for SVG cards             */
/* ------------------------------------------------------------------ */

export function buildServerSpriteGrid(
  seed: string,
  frame?: number,
): ServerSpriteResult {
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
  const localFrame = (frame ?? 0) % blinkPeriod;
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

/** Build SVG <rect> elements from a sprite grid. */
export function getSpriteSvgRects(
  grid: number[][],
  palette: [string, string, string, string],
): string {
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

/* ------------------------------------------------------------------ */
/*  Simpler procedural grid (24×24) - used for animated GIF cards     */
/* ------------------------------------------------------------------ */

export function getProceduralGrid24(seed: string): number[][] {
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

/** Wrap text into lines of at most maxLen characters. */
export function wrapText(text: string, maxLen: number): string[] {
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
