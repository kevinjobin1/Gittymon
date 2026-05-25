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

/**
 * Procedural generation of a retro 8-bit pocket monster on a canvas.
 * Draws a symmetrical sprite.
 */
export function drawProceduralMon(
  canvas: HTMLCanvasElement,
  seed: string,
  frame: number,
  colorTheme: 'dmg' | 'pocket' = 'dmg'
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const hash = getSeedHash(seed);
  const lcg = new LCG(hash);

  // Palette selectors
  // DMG classic screen palette (4 shades of retro olive/grey)
  const ditherPalette = {
    dmg: ['#1a1a1a', '#7f001c', '#e2dfde', '#ffffff'], // DMG console-theme styled pocket style (Charcoal, PrimaryRed, LightGray, White)
    pocket: ['#0f172a', '#475569', '#94a3b8', '#f8fafc'] // Pocket grey style
  };

  const colors = ditherPalette[colorTheme] || ditherPalette.dmg;

  // Render variables
  const gridSize = 12; // Half width is 12 (mirrored to 24)
  const pixelSize = Math.floor(width / 24); // Fits 24x24 canvas perfectly
  const startX = Math.floor((width - (24 * pixelSize)) / 2);
  const startY = Math.floor((height - (24 * pixelSize)) / 2);

  // Animation breathing variables
  const breathOffset = Math.sin(frame * 0.2) * 0.4;

  const pixelGrid: number[][] = Array(24).fill(0).map(() => Array(24).fill(0));

  // Determine monster anatomy types from seed
  const limbsType = lcg.nextRange(0, 3);
  const eyesType = lcg.nextRange(0, 3);
  const hornsType = lcg.nextRange(0, 4);

  // Fill horizontal symmetry half (x from 0 to 11)
  // Inside a 24x24 grid, let's define core body around center (y: 6 to 18, x: 2 to 11)
  for (let y = 4; y < 20; y++) {
    for (let x = 3; x < 12; x++) {
      // Create body blobs
      let fillType = 0; // 0: empty, 1: outline, 2: dark color, 3: accent color

      // Core body chance increases near x = 11 down to 5
      const bodyWidthBound = 11 - Math.abs(12 - y) * 0.5;
      if (x <= 11 && x >= 11 - Math.floor(lcg.next() * 5 + 3)) {
        if (y >= 7 && y <= 16) {
          fillType = lcg.next() > 0.35 ? 2 : 3;
        }
      }

      // Add Horns / Ears
      if (hornsType === 0 && y >= 4 && y <= 6 && x >= 8 && x < 11) {
        // Bunny ears / sharp horns
        fillType = 2;
      } else if (hornsType === 1 && y === 5 && x >= 5 && x <= 8) {
        // Wing horns
        fillType = 3;
      } else if (hornsType === 2 && y >= 3 && y <= 5 && x === 10) {
        // Unicorn single middle horn (x closer to mirroring)
        fillType = 3;
      }

      // Add Arms / Limbs
      if (limbsType === 0 && y >= 11 && y <= 13 && x >= 3 && x <= 6) {
        // Short stubby arms
        fillType = 2;
      } else if (limbsType === 1 && y >= 14 && y <= 15 && x >= 2 && x <= 5) {
        // Long drop claws
        fillType = 3;
      }

      // Add Feet / Legs
      if (y >= 17 && y <= 18 && x >= 6 && x <= 10) {
        fillType = 2; // steady stance feet
      }

      pixelGrid[y][x] = fillType;
    }
  }

  // Draw Eyes & Mouth (near the center axis, mapped onto grid)
  // Eye x-pos around 8, y-pos around 9
  if (eyesType === 0) {
    // Large round eyes
    pixelGrid[9][8] = 3;
    pixelGrid[10][8] = 0; // eye detail
    pixelGrid[9][9] = 3;
  } else if (eyesType === 1) {
    // Intense horizontal strip eye
    pixelGrid[9][7] = 3;
    pixelGrid[9][8] = 3;
    pixelGrid[9][9] = 3;
  } else {
    // Angry eyes
    pixelGrid[8][7] = 3;
    pixelGrid[9][8] = 3;
    pixelGrid[9][9] = 3;
  }

  // Mouth around y = 12, x = 10,11
  pixelGrid[12][10] = 0; // mouth gap
  pixelGrid[13][11] = 2; // chin indent

  // Mirror grid onto the right half (x = 12 to 23)
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 12; x++) {
      pixelGrid[y][23 - x] = pixelGrid[y][x];
    }
  }

  // Create clean outlines around filled pixels
  const finalGrid: number[][] = Array(24).fill(0).map(() => Array(24).fill(0));
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const current = pixelGrid[y][x];
      if (current > 0) {
        finalGrid[y][x] = current;
      } else {
        // Check if adjacent is filled (generating a flat black outline)
        let hasFilledNeighbor = false;
        const neighbors = [
          [y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]
        ];
        for (const [ny, nx] of neighbors) {
          if (ny >= 0 && ny < 24 && nx >= 0 && nx < 24) {
            if (pixelGrid[ny][nx] > 0) {
              hasFilledNeighbor = true;
              break;
            }
          }
        }
        if (hasFilledNeighbor) {
          finalGrid[y][x] = 1; // Mark outline
        }
      }
    }
  }

  // Now, render final grid onto Canvas
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const cell = finalGrid[y][x];
      if (cell === 0) continue; // transparent space

      // Apply animated breathing translation to body elements (anything not the ground-level feet)
      let dy = 0;
      if (y < 17) {
        dy = breathOffset; // subtle bob
      }

      ctx.fillStyle = cell === 1 ? colors[0] : cell === 2 ? colors[1] : colors[2];
      ctx.fillRect(
        startX + x * pixelSize,
        startY + y * pixelSize + dy,
        pixelSize,
        pixelSize
      );
    }
  }
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
