/**
 * Simple hash utility to generate numerical pseudo-random values from a seed string.
 */
export function getSeedHash(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

// Deterministic random numbers from a hash stream
export class LCG {
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

// ── Color Palettes (4 colors: outline, body-fill, light-fill, accent) ──
export const PALETTES: Record<string, [string, string, string, string]> = {
  dmg:    ['#1a1a1a', '#7f001c', '#e2dfde', '#ffffff'],
  pocket: ['#0f172a', '#475569', '#94a3b8', '#f8fafc'],
  ember:  ['#1a1a1a', '#dc2626', '#fdba74', '#fef3c7'],
  frost:  ['#1e293b', '#0284c7', '#7dd3fc', '#f0f9ff'],
  toxic:  ['#1a1a1a', '#16a34a', '#a3e635', '#f0fdf4'],
  royal:  ['#1a1a1a', '#7e22ce', '#e9d5ff', '#faf5ff'],
  neon:   ['#1a1a1a', '#ec4899', '#2dd4bf', '#ffffff'],
};

export type PaletteName = keyof typeof PALETTES;

// ── Palette selection by seed ──
export const PALETTE_NAMES = Object.keys(PALETTES) as PaletteName[];
export function pickPalette(lcg: LCG): PaletteName {
  return PALETTE_NAMES[lcg.nextRange(0, PALETTE_NAMES.length)];
}

// ── Return type for the shared grid builder ──
export interface SpriteResult {
  grid: number[][];           // 24×24 grid 0=empty, 1=outline, 2=body, 3=accent, 4=pattern, 5=glow
  palette: [string, string, string, string];
  paletteName: PaletteName;
  eyesType: number;
  blinkState: number;         // 0=open, 1=half, 2=closed
  mouthType: number;
}

/**
 * Build the full 24×24 sprite grid deterministically from a seed + frame.
 * Returns the grid and visual metadata so both procGen and cardRenderer can use it.
 */
export function buildSpriteGrid(seed: string, frame: number, paletteOverride?: PaletteName): SpriteResult {
  const hash = getSeedHash(seed);
  const lcg = new LCG(hash);

  const paletteName = paletteOverride || pickPalette(lcg);
  const palette = PALETTES[paletteName];

  // ── Anatomy selectors ──
  const bodyShape     = lcg.nextRange(0, 5);    // 0=round, 1=tall, 2=wide, 3=diamond, 4=pear
  const limbsType     = lcg.nextRange(0, 4);    // 0=stubby, 1=claws, 2=wings, 3=none
  const eyesType      = lcg.nextRange(0, 6);    // 0=round, 1=strip, 2=angry, 3=happy, 4=sleepy, 5=glow
  const hornsType     = lcg.nextRange(0, 5);    // 0=bunny, 1=wing-horns, 2=unicorn, 3=spikes, 4=none
  const tailType      = lcg.nextRange(0, 4);    // 0=none, 1=curly, 2=spiky, 3=fluffy
  const patternType   = lcg.nextRange(0, 4);    // 0=none, 1=stripes, 2=spots, 3=checker
  const mouthType     = lcg.nextRange(0, 3);    // 0=smile, 1=frown, 2=open

  // ── Blink timing (every ~120–200 frames, closed for ~6 frames) ──
  const blinkPeriod = lcg.nextRange(120, 200);
  const blinkDuration = lcg.nextRange(4, 8);
  const localFrame = frame % blinkPeriod;
  const blinkState = localFrame < blinkDuration
    ? (localFrame < 2 ? 2 : localFrame < blinkDuration - 2 ? 1 : 0)
    : 0;

  const grid: number[][] = Array.from({ length: 24 }, () => Array(24).fill(0));

  // ── Helper: fill pixel with pattern override ──
  const fillWithPattern = (y: number, x: number, base: number): number => {
    if (base === 0) return 0;
    if (base === 1 || base === 4 || base === 5) return base;
    if (base === 2 && patternType === 1 && (Math.floor(y / 2) % 2 === 0)) return 4; // stripes
    if (base === 2 && patternType === 2 && (y % 3 === 0 && x % 3 === 0)) return 4;  // spots
    if (base === 2 && patternType === 3 && ((y + x) % 4 < 2)) return 3;             // checker → accent
    return base;
  };

  // ═══════════════════════════════════════════════
  //  1. CORE BODY
  // ═══════════════════════════════════════════════
  for (let y = 4; y < 20; y++) {
    for (let x = 3; x < 12; x++) {
      let fill = 0;

      switch (bodyShape) {
        case 0: // Round (classic blob)
          if (x <= 11 && x >= 11 - Math.floor(lcg.next() * 5 + 3) && y >= 7 && y <= 16) {
            fill = lcg.next() > 0.35 ? 2 : 3;
          }
          break;
        case 1: // Tall — extend to column 11 so mirror is continuous
          if (x >= 7 && x <= 11 && y >= 4 && y <= 18) {
            fill = 2;
          } else if (y >= 7 && y <= 16 && x >= 5 && x <= 11) {
            fill = lcg.next() > 0.4 ? 2 : 3;
          }
          break;
        case 2: // Wide
          if (y >= 8 && y <= 15 && x >= 2 && x <= 11) {
            fill = lcg.next() > 0.35 ? 2 : 3;
          }
          break;
        case 3: // Diamond
          if (y >= 5 && y <= 18) {
            const halfW = Math.floor((18 - Math.abs(11.5 - y)) / 1.8);
            if (x >= 11 - halfW) fill = lcg.next() > 0.3 ? 2 : 3;
          }
          break;
        case 4: // Pear
          const pearW = y > 12 ? 11 - Math.floor((y - 12) * 0.3) : 8 - Math.floor((12 - y) * 0.4);
          if (x >= 11 - pearW && y >= 6 && y <= 18) {
            fill = lcg.next() > 0.35 ? 2 : 3;
          }
          break;
      }
      grid[y][x] = fill;
    }
  }

  // ═══════════════════════════════════════════════
  //  2. HORNS / EARS / HEADGEAR
  // ═══════════════════════════════════════════════
  if (hornsType === 0) {
    // Bunny ears
    for (let y = 3; y <= 6; y++) {
      if (y >= 4 && y <= 6) { grid[y][9] = 2; grid[y][10] = 2; }
      if (y === 3) { grid[3][9] = 3; grid[3][10] = 3; }
    }
  } else if (hornsType === 1) {
    // Wing-horns (side protrusions)
    grid[5][5] = 3; grid[5][6] = 3; grid[6][5] = 2;
  } else if (hornsType === 2) {
    // Unicorn horn (center)
    grid[3][10] = 3; grid[3][11] = 3; grid[4][10] = 3; grid[4][11] = 3;
    grid[2][10] = 3; grid[2][11] = 3;
  } else if (hornsType === 3) {
    // Crown spikes
    grid[4][7] = lcg.next() > 0.5 ? 3 : 2;
    grid[4][8] = lcg.next() > 0.5 ? 3 : 2;
    grid[4][9] = lcg.next() > 0.5 ? 3 : 2;
    grid[4][10] = lcg.next() > 0.5 ? 3 : 2;
    grid[5][7] = 2; grid[5][10] = 2;
  }
  // hornsType === 4 → none, skip

  // ═══════════════════════════════════════════════
  //  3. LIMBS / ARMS
  // ═══════════════════════════════════════════════
  if (limbsType === 0) {
    // Stubby arms
    for (let y = 11; y <= 13; y++) {
      grid[y][3] = 2; grid[y][4] = 2;
    }
  } else if (limbsType === 1) {
    // Long claws
    for (let y = 13; y <= 15; y++) {
      grid[y][2] = 3; grid[y][3] = 3;
    }
    grid[16][2] = 2;
  } else if (limbsType === 2) {
    // Wings (wide side decorations)
    for (let y = 8; y <= 14; y++) {
      const wingX = y < 11 ? y - 5 : 14 - y + 3;
      if (wingX >= 1) {
        grid[y][wingX] = (y % 2 === 0) ? 3 : 2;
      }
    }
    grid[10][2] = 3; grid[10][3] = 3;
  }
  // limbsType === 3 → no arms

  // ═══════════════════════════════════════════════
  //  4. FEET / LEGS
  // ═══════════════════════════════════════════════
  for (let y = 17; y <= 18; y++) {
    grid[y][6] = 2; grid[y][7] = 2;
    grid[y][9] = 2; grid[y][10] = 2;
  }
  // Toes
  grid[18][5] = 3; grid[18][8] = 3; grid[18][11] = 3;

  // ═══════════════════════════════════════════════
  //  5. EYES
  // ═══════════════════════════════════════════════
  const eyeY = eyesType === 4 ? 10 : 9; // sleepy eyes lower
  const closed = blinkState === 2;
  const half = blinkState === 1;

  if (closed) {
    // Closed eyes = horizontal line
    grid[eyeY][8] = 1; grid[eyeY][9] = 1;
  } else if (half) {
    grid[eyeY][8] = 1; grid[eyeY][9] = 1;
    grid[eyeY - 1][8] = 3; grid[eyeY - 1][9] = 3;
  } else if (eyesType === 0) {
    // Large round eyes
    grid[eyeY][7] = 3; grid[eyeY + 1][7] = 3;
    grid[eyeY][8] = 0; grid[eyeY + 1][8] = 3;
    grid[eyeY][9] = 3; grid[eyeY + 1][9] = 3;
    // Pupils
    grid[eyeY][7] = 0;
  } else if (eyesType === 1) {
    // Horizontal strip
    grid[eyeY][6] = 3; grid[eyeY][7] = 3; grid[eyeY][8] = 3;
    grid[eyeY][9] = 3;
  } else if (eyesType === 2) {
    // Angry slanted
    grid[8][6] = 3; grid[9][7] = 3; grid[9][8] = 3;
    grid[9][9] = 3;
  } else if (eyesType === 3) {
    // Happy crescents
    grid[eyeY][7] = 3; grid[eyeY][8] = 0;
    grid[eyeY][9] = 3;
    grid[eyeY - 1][7] = 3; grid[eyeY - 1][9] = 3;
  } else if (eyesType === 4) {
    // Sleepy / half-lidded
    grid[9][7] = 3; grid[9][8] = 3;
    grid[9][9] = 3; grid[10][8] = 0;
  } else if (eyesType === 5) {
    // Glowing empty
    grid[eyeY][8] = 5; grid[eyeY][9] = 5;
    grid[eyeY - 1][8] = 5; grid[eyeY - 1][9] = 5;
  }

  // ═══════════════════════════════════════════════
  //  6. MOUTH
  // ═══════════════════════════════════════════════
  if (mouthType === 0) {
    // Smile
    grid[12][9] = 0; grid[12][10] = 0;
    grid[13][10] = 2;
  } else if (mouthType === 1) {
    // Frown
    grid[12][9] = 0; grid[12][10] = 0;
    grid[11][10] = 2;
  } else {
    // Open mouth (O-shape)
    grid[12][9] = 0; grid[12][10] = 0;
    grid[13][9] = 0; grid[13][10] = 0;
  }

  // ═══════════════════════════════════════════════
  //  7. TAIL (on left side BEFORE mirror — mirror will produce the right side)
  // ═══════════════════════════════════════════════
  // Tail coordinates are specified on the RIGHT side (x>=12).
  // We place them on the LEFT side (x = 23 - right_x) so mirror creates both sides.
  if (tailType === 1) {
    // Curly tail
    grid[15][2] = 2; grid[14][1] = 3; grid[15][1] = 2;
    grid[14][0] = 3; grid[15][0] = 2;
  } else if (tailType === 2) {
    // Spiky tail
    grid[14][1] = 2; grid[13][0] = 3;
    grid[15][1] = 2; grid[16][0] = 3;
  } else if (tailType === 3) {
    // Fluffy tail
    grid[14][2] = 2; grid[13][1] = 3; grid[14][1] = 3;
    grid[15][2] = 2; grid[15][1] = 2;
    grid[14][0] = 3; grid[15][0] = 2;
  }

  // ═══════════════════════════════════════════════
  //  8. MIRROR LEFT → RIGHT
  // ═══════════════════════════════════════════════
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 12; x++) {
      grid[y][23 - x] = grid[y][x];
    }
  }

  // ═══════════════════════════════════════════════
  //  10. OUTLINES
  // ═══════════════════════════════════════════════
  const finalGrid: number[][] = Array.from({ length: 24 }, () => Array(24).fill(0));

  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const cell = grid[y][x];
      if (cell > 0) {
        finalGrid[y][x] = cell;
      } else {
        // Check 4-direction neighbors
        for (const [ny, nx] of [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]]) {
          if (ny >= 0 && ny < 24 && nx >= 0 && nx < 24 && grid[ny][nx] > 0) {
            finalGrid[y][x] = 1;
            break;
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════════
  //  11. APPLY PATTERNS (left half only, then re-mirror to preserve symmetry)
  // ═══════════════════════════════════════════════
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 12; x++) {
      if (finalGrid[y][x] === 2 && patternType === 1 && (Math.floor(y / 2) % 2 === 0)) {
        finalGrid[y][x] = 4;
      }
      if (finalGrid[y][x] === 2 && patternType === 2 && (y % 3 === 0 && x % 3 === 0)) {
        finalGrid[y][x] = 4;
      }
      if (finalGrid[y][x] === 2 && patternType === 3 && ((y + x) % 4 < 2)) {
        finalGrid[y][x] = 3;
      }
    }
  }
  // Re-mirror left half pattern changes to right half
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 12; x++) {
      finalGrid[y][23 - x] = finalGrid[y][x];
    }
  }

  return {
    grid: finalGrid,
    palette,
    paletteName,
    eyesType,
    blinkState,
    mouthType,
  };
}

/**
 * Render a sprite grid onto a canvas with integer-only pixel rendering.
 * All offsets are Math.floor'd to prevent sub-pixel anti-aliasing artifacts.
 */
export function drawSpriteOnCanvas(
  ctx: CanvasRenderingContext2D,
  sprite: SpriteResult,
  ox: number, oy: number,
  pixelSize: number,
  frame: number,
) {
  const { grid, palette } = sprite;
  const [outlineColor, bodyColor, lightColor, accentColor] = palette;

  // ── Breathing animation (integer offsets only) ──
  const breathSin = Math.sin(frame * 0.2);
  // Floor to integer pixels — prevents sub-pixel anti-aliasing
  const breathOffset = Math.floor(breathSin * 0.4);

  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < 24; y++) {
    // dy is only applied to upper body (y < 17)
    const dy = y < 17 ? breathOffset : 0;

    for (let x = 0; x < 24; x++) {
      const cell = grid[y][x];
      if (cell === 0) continue;

      // Determine fill color
      let color: string;
      switch (cell) {
        case 1: color = outlineColor; break;
        case 2: color = bodyColor; break;
        case 3: color = lightColor; break;
        case 4: color = accentColor; break;
        case 5: color = accentColor; break;  // glow = accent color (no pulsing)
        default: color = outlineColor;
      }

      ctx.fillStyle = color;
      ctx.fillRect(
        ox + (x * pixelSize),
        oy + (y * pixelSize) + dy,
        pixelSize,
        pixelSize,
      );
    }
  }
}


/**
 * Procedural generation of a retro 8-bit pocket monster on a canvas.
 * Draws a symmetrical sprite.
 */
export function drawProceduralMon(
  canvas: HTMLCanvasElement,
  seed: string,
  frame: number,
  colorTheme?: PaletteName,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const pixelSize = Math.floor(width / 24);
  const startX = Math.floor((width - (24 * pixelSize)) / 2);
  const startY = Math.floor((height - (24 * pixelSize)) / 2);
  const sprite = buildSpriteGrid(seed, frame, colorTheme);
  drawSpriteOnCanvas(ctx, sprite, startX, startY, pixelSize, frame);
}

/**
 * Super precise 4-color threshold ditherer for any image URL.
 * Falls back to drawing a custom grid badge on failure (e.g., CORS).
 */
export function drawDitheredAvatar(
  canvas: HTMLCanvasElement,
  imgUrl: string,
  onComplete?: () => void
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // Clear canvas
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, w, h);

  if (!imgUrl) {
    drawFallbackBadge(ctx, w, h);
    if (onComplete) onComplete();
    return;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.referrerPolicy = 'no-referrer';
  img.src = imgUrl;

  img.onload = () => {
    try {
      // Draw image to smaller internal buffer for beautiful chunky pixels (e.g. 40x40 pixel look)
      const resWidth = 44;
      const resHeight = 44;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = resWidth;
      tempCanvas.height = resHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        drawFallbackBadge(ctx, w, h);
        return;
      }

      // Draw avatar resized
      tempCtx.drawImage(img, 0, 0, resWidth, resHeight);
      const imgData = tempCtx.getImageData(0, 0, resWidth, resHeight);
      const data = imgData.data;

      // Gameboy DMG Palette colors mapped from dark to light
      const shades = [
        [26, 26, 26],    // Black
        [127, 0, 28],    // Dark Pink-Red
        [226, 223, 222], // Light Grey
        [255, 255, 255]  // White
      ];

      // Ordered dithering Bayer matrix 4x4
      const bayerMatrix = [
        [0,  8,  2,  10],
        [12, 4,  14, 6],
        [3,  11, 1,  9],
        [15, 7,  13, 5]
      ];

      // Process image pixel data
      for (let y = 0; y < resHeight; y++) {
        for (let x = 0; x < resWidth; x++) {
          const idx = (y * resWidth + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Compute grayscale value
          let gray = 0.299 * r + 0.587 * g + 0.114 * b;

          // Add Ordered Dither Noise (scale Bayer matrix values to match grey range)
          const matrixVal = bayerMatrix[y % 4][x % 4];
          const ditherDelta = (matrixVal - 7.5) * 4.5;
          gray = Math.max(0, Math.min(255, gray + ditherDelta));

          // Map grayscale value (0-255) to 4 colors
          let colorIndex = 0;
          if (gray < 64) {
            colorIndex = 0;
          } else if (gray < 128) {
            colorIndex = 1;
          } else if (gray < 192) {
            colorIndex = 2;
          } else {
            colorIndex = 3;
          }

          const finalColor = shades[colorIndex];
          data[idx] = finalColor[0];
          data[idx + 1] = finalColor[1];
          data[idx + 2] = finalColor[2];
        }
      }

      tempCtx.putImageData(imgData, 0, 0);

      // Disable image smoothing for perfect pixel-art sizing upscale
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tempCanvas, 0, 0, w, h);

      // Draw clean border frame
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, w, h);

      if (onComplete) onComplete();
    } catch (e) {
      console.warn('Canvas dither fail (CORS block/error):', e);
      drawFallbackBadge(ctx, w, h);
      if (onComplete) onComplete();
    }
  };

  img.onerror = () => {
    drawFallbackBadge(ctx, w, h);
    if (onComplete) onComplete();
  };
}

function drawFallbackBadge(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Classic Pokéball styled badge or logo in case of error
  ctx.fillStyle = '#e2dfde';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, w, h);

  // Draw 8-bit visual pattern
  ctx.fillStyle = '#7f001c'; // Red
  ctx.fillRect(4, 4, w - 8, (h - 8) / 2);

  ctx.fillStyle = '#ffffff'; // White
  ctx.fillRect(4, h / 2, w - 8, (h - 8) / 2);

  // Black separator bar
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, h / 2 - 3, w, 6);

  // Center button
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a1a';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}
