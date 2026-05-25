import { getSeedHash, LCG } from './procGen';

// Build the 24x24 procedural sprite grid (mirrored, outlined)
function buildSpriteGrid(seed: string): number[][] {
  const hash = getSeedHash(seed);
  const lcg = new LCG(hash);

  const grid: number[][] = Array.from({ length: 24 }, () => Array(24).fill(0));
  const limbsType = lcg.nextRange(0, 3);
  const eyesType = lcg.nextRange(0, 3);
  const hornsType = lcg.nextRange(0, 4);

  for (let y = 4; y < 20; y++) {
    for (let x = 3; x < 12; x++) {
      let fill = 0;
      if (x <= 11 && x >= 11 - Math.floor(lcg.next() * 5 + 3)) {
        if (y >= 7 && y <= 16) fill = lcg.next() > 0.35 ? 2 : 3;
      }
      if (hornsType === 0 && y >= 4 && y <= 6 && x >= 8 && x < 11) fill = 2;
      else if (hornsType === 1 && y === 5 && x >= 5 && x <= 8) fill = 3;
      else if (hornsType === 2 && y >= 3 && y <= 5 && x === 10) fill = 3;
      if (limbsType === 0 && y >= 11 && y <= 13 && x >= 3 && x <= 6) fill = 2;
      else if (limbsType === 1 && y >= 14 && y <= 15 && x >= 2 && x <= 5) fill = 3;
      if (y >= 17 && y <= 18 && x >= 6 && x <= 10) fill = 2;
      grid[y][x] = fill;
    }
  }

  if (eyesType === 0) { grid[9][8] = 3; grid[10][8] = 0; grid[9][9] = 3; }
  else if (eyesType === 1) { grid[9][7] = 3; grid[9][8] = 3; grid[9][9] = 3; }
  else { grid[8][7] = 3; grid[9][8] = 3; grid[9][9] = 3; }

  grid[12][10] = 0;
  grid[13][11] = 2;

  // Mirror
  for (let y = 0; y < 24; y++)
    for (let x = 0; x < 12; x++)
      grid[y][23 - x] = grid[y][x];

  // Outline
  const final: number[][] = Array.from({ length: 24 }, () => Array(24).fill(0));
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      if (grid[y][x] > 0) { final[y][x] = grid[y][x]; continue; }
      for (const [ny, nx] of [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]]) {
        if (ny >= 0 && ny < 24 && nx >= 0 && nx < 24 && grid[ny][nx] > 0) {
          final[y][x] = 1; break;
        }
      }
    }
  }
  return final;
}

function drawSpriteOnCanvas(
  ctx: CanvasRenderingContext2D,
  grid: number[][],
  ox: number,
  oy: number,
  pixelSize: number,
  bounceOffset: number = 0
) {
  const colors = ['#1a1a1a', '#1a1a1a', '#7f001c', '#e2dfde'];
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const cell = grid[y][x];
      if (cell === 0) continue;
      const dy = y < 17 ? bounceOffset : 0;
      ctx.fillStyle = colors[cell] || '#1a1a1a';
      ctx.fillRect(ox + x * pixelSize, oy + y * pixelSize + dy, pixelSize, pixelSize);
    }
  }
}

// Wrap text at a character limit
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

export interface CardData {
  username: string;
  monName: string;
  type: string;
  level: number;
  roast: string;
  stats: { hp: number; attack: number; defense: number; speed: number; chaos: number };
  spriteSeed: string;
  wins?: number;
  losses?: number;
}

// Draw full animated frame onto a canvas
export function drawCardFrame(
  canvas: HTMLCanvasElement,
  data: CardData,
  frame: number = 0
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;   // 460
  const H = canvas.height;  // 220
  ctx.clearRect(0, 0, W, H);

  // ── Background ──
  ctx.fillStyle = '#0a0d16';
  ctx.fillRect(0, 0, W, H);

  // Subtle grid pattern
  ctx.fillStyle = '#0f172a';
  for (let gx = 0; gx < W; gx += 8)
    for (let gy = 0; gy < H; gy += 8)
      if ((gx + gy) % 16 === 0) ctx.fillRect(gx, gy, 2, 2);

  // ── Outer Frame ──
  ctx.fillStyle = '#18181b';
  ctx.roundRect(4, 4, W - 8, H - 8, 14);
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 3;
  ctx.roundRect(4, 4, W - 8, H - 8, 14);
  ctx.stroke();

  // Inner crimson dashed accent
  ctx.strokeStyle = '#7f001c';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.globalAlpha = 0.5;
  ctx.roundRect(8, 8, W - 16, H - 16, 10);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // ── Left LCD Bezel ──
  const bezelGrad = ctx.createLinearGradient(0, 18, 0, 206);
  bezelGrad.addColorStop(0, '#3f3f46');
  bezelGrad.addColorStop(1, '#18181b');
  ctx.fillStyle = bezelGrad;
  ctx.roundRect(16, 16, 112, 188, 6);
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;
  ctx.roundRect(16, 16, 112, 188, 6);
  ctx.stroke();

  // ── LCD Screen ──
  const screenGrad = ctx.createLinearGradient(0, 22, 0, 140);
  screenGrad.addColorStop(0, '#c5cbb4');
  screenGrad.addColorStop(1, '#adb596');
  ctx.fillStyle = screenGrad;
  ctx.fillRect(22, 22, 100, 115);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  ctx.strokeRect(22, 22, 100, 115);

  // Scanlines on LCD
  ctx.strokeStyle = '#1a1a1a';
  ctx.globalAlpha = 0.04;
  for (let sy = 22; sy < 137; sy += 3) {
    ctx.beginPath();
    ctx.moveTo(22, sy);
    ctx.lineTo(122, sy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // ── Procedural Sprite ──
  const spriteGrid = buildSpriteGrid(data.spriteSeed);
  const bounceOffsets = [0, -1, -2, -3, -2, -1, 0, -1, -2, -1];
  const bounce = bounceOffsets[frame % bounceOffsets.length];
  drawSpriteOnCanvas(ctx, spriteGrid, 48, 32, 2, bounce);

  // ── Battery LED ──
  ctx.fillStyle = frame % 4 < 2 ? '#fca5a5' : '#ef4444';
  ctx.beginPath();
  ctx.arc(32, 160, 3, 0, Math.PI * 2);
  ctx.fill();

  // ── Bottom Screen Label ──
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(22, 142, 100, 46);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`LV ${data.level}`, 72, 157);

  ctx.fillStyle = '#e2dfde';
  ctx.font = '8px monospace';
  ctx.fillText('GITTYMON PROFILE', 72, 170);

  ctx.fillStyle = '#7f001c';
  ctx.font = 'bold 7px monospace';
  ctx.fillText('CHAOS NETWORK', 72, 182);

  // ── Right Side: Username Bar ──
  ctx.textAlign = 'start';
  ctx.fillStyle = '#1a1a1a';
  ctx.roundRect(140, 16, 304, 24, 5);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(`@${data.username.toUpperCase()}`, 150, 33);

  ctx.fillStyle = '#7f001c';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'end';
  ctx.fillText(`W:${data.wins ?? 0} L:${data.losses ?? 0}`, 440, 33);
  ctx.textAlign = 'start';

  // ── Monster Name + Type ──
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(data.monName.toUpperCase(), 148, 56);

  // Type badge
  const trimmedType = data.type.length > 14 ? data.type.slice(0, 14) : data.type;
  ctx.strokeStyle = '#7f001c';
  ctx.lineWidth = 1;
  ctx.roundRect(335, 46, 109, 14, 20);
  ctx.stroke();
  ctx.fillStyle = '#7f001c';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(trimmedType.toUpperCase(), 390, 56);
  ctx.textAlign = 'start';

  // ── Separator ──
  ctx.strokeStyle = '#334155';
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(140, 63);
  ctx.lineTo(444, 63);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // ── Stats Bars ──
  const stats = [
    { label: 'HEALTH LOOP', val: data.stats.hp, color: '#7f001c' },
    { label: 'BUG SUMMONS', val: data.stats.attack, color: '#e2dfde' },
    { label: 'CODE SHIELD', val: data.stats.defense, color: '#ffffff' },
    { label: 'CYCLE SPEED', val: data.stats.speed, color: '#4b5563' },
    { label: 'CHAOS FLOW', val: data.stats.chaos, color: '#b91c1c' },
  ];

  stats.forEach((st, i) => {
    const rowY = 74 + i * 13;
    ctx.fillStyle = '#a1a1aa';
    ctx.font = 'bold 8px monospace';
    ctx.fillText(st.label, 142, rowY);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'end';
    ctx.fillText(`${st.val}%`, 212, rowY);
    ctx.textAlign = 'start';

    // Bar background
    ctx.fillStyle = '#27272a';
    ctx.roundRect(218, rowY - 6, 226, 9, 3);
    ctx.fill();

    // Bar fill
    ctx.fillStyle = st.color;
    const barW = Math.max(4, Math.floor((st.val / 100) * 226));
    ctx.roundRect(218, rowY - 6, barW, 9, 3);
    ctx.fill();
  });

  // ── Dialogue / Roast Box ──
  ctx.fillStyle = '#f1f5f9';
  ctx.roundRect(140, 142, 304, 40, 5);
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  ctx.roundRect(140, 142, 304, 40, 5);
  ctx.stroke();

  // Roast text with typewriter effect
  const roastLines = wrapText(data.roast.toUpperCase(), 35).slice(0, 3);
  roastLines.forEach((line, i) => {
    ctx.fillStyle = '#7f001c';
    ctx.font = 'bold 8px monospace';
    ctx.fillText(line, 148, 158 + i * 11);
  });

  // ── Footer ──
  ctx.fillStyle = '#7f001c';
  ctx.font = 'bold 7px monospace';
  ctx.fillText('● GITTYMON-STER', 142, 208);

  ctx.fillStyle = '#cbd5e1';
  ctx.globalAlpha = 0.4;
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'end';
  ctx.fillText('SUMMONED AT GITHUB.COM/KEVINJOBIN1/GITTYMON', 442, 208);
  ctx.textAlign = 'start';
  ctx.globalAlpha = 1;
}

// Render a static card (frame 0) and return the canvas
export function renderStaticCard(data: CardData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 460;
  canvas.height = 220;
  drawCardFrame(canvas, data, 0);
  return canvas;
}



// Download a canvas as PNG
export function downloadCardAsPng(data: CardData, filename?: string) {
  const canvas = renderStaticCard(data);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${data.username}-gittymon-card.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// Download from a URL (fetches as blob for reliable cross-browser download)
export async function downloadFromUrl(url: string, filename: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.warn('Failed to download:', err);
  }
}
