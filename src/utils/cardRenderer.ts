import { buildSpriteGrid, drawSpriteOnCanvas } from './procGen';

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

/**
 * Draw a Pokémon TCG-inspired card on a 460×220 canvas.
 * Clean layout — big artwork, bold text, minimal clutter.
 */
export function drawCardFrame(
  canvas: HTMLCanvasElement,
  data: CardData,
  frame: number = 0
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = 460;
  const H = 220;
  ctx.clearRect(0, 0, W, H);

  // ── Background ──
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#0f172a');
  bgGrad.addColorStop(0.5, '#0a0d16');
  bgGrad.addColorStop(1, '#05080f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle card shine (top highlight)
  const shineGrad = ctx.createRadialGradient(W / 2, 40, 10, W / 2, 40, 220);
  shineGrad.addColorStop(0, 'rgba(255,255,255,0.04)');
  shineGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shineGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Card Border ──
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(3, 3, W - 6, H - 6, 10);
  ctx.stroke();

  // Colored top accent bar (signature crimson)
  ctx.fillStyle = '#7f001c';
  ctx.fillRect(4, 4, W - 8, 3);

  // ── Top Strip: Name + Level + HP ──
  // Name (left, big)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'left';
  const displayName = data.monName.length > 16 ? data.monName.slice(0, 16) : data.monName;
  ctx.fillText(displayName.toUpperCase(), 16, 24);

  // Level + HP badge group (right)
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.roundRect(W - 120, 8, 108, 18, 5);
  ctx.fill();

  ctx.fillStyle = '#e2dfde';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';

  // HP text with heart
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('♥', W - 112, 22);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${data.stats.hp}`, W - 98, 22);

  // Separator
  ctx.fillStyle = '#52525b';
  ctx.fillText('|', W - 76, 22);

  // Level
  ctx.fillStyle = '#e2dfde';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(`LV${data.level}`, W - 58, 22);

  // ── Separator line ──
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(12, 34);
  ctx.lineTo(448, 34);
  ctx.stroke();

  // ── Sprite (big, centered) ──
  // Artwork panel — light enough that dark sprite outlines are clearly visible
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.roundRect(140, 34, 180, 108, 8);
  ctx.fill();

  const spriteResult = buildSpriteGrid(data.spriteSeed, frame);
  const spriteSize = 24 * 4; // pixelSize=4 → 96px
  const spriteX = Math.floor((W - spriteSize) / 2);
  const spriteY = 40;
  drawSpriteOnCanvas(ctx, spriteResult, spriteX, spriteY, 4, frame);

  // ── Type Badge (below sprite) ──
  const trimmedType = data.type.length > 16 ? data.type.slice(0, 16) : data.type;
  const typeLabel = trimmedType.toUpperCase();
  ctx.font = 'bold 7px monospace';
  const typeW = ctx.measureText(typeLabel).width + 16;
  const typeX = W / 2 - typeW / 2;

  ctx.fillStyle = 'rgba(127, 0, 28, 0.15)';
  ctx.beginPath();
  ctx.roundRect(typeX, 142, typeW, 14, 7);
  ctx.fill();
  ctx.strokeStyle = '#7f001c';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.roundRect(typeX, 142, typeW, 14, 7);
  ctx.stroke();
  ctx.fillStyle = '#7f001c';
  ctx.textAlign = 'center';
  ctx.font = 'bold 7px monospace';
  ctx.fillText(typeLabel, W / 2, 153);

  // ── Stats Row ──
  const statsY = 164;

  // HP bar
  ctx.textAlign = 'left';
  ctx.fillStyle = '#a1a1aa';
  ctx.font = 'bold 7px monospace';
  ctx.fillText('HP', 16, statsY + 6);

  ctx.fillStyle = '#27272a';
  ctx.beginPath();
  ctx.roundRect(34, statsY, 80, 10, 4);
  ctx.fill();
  const hpPct = Math.min(100, data.stats.hp) / 100;
  ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444';
  ctx.beginPath();
  ctx.roundRect(34, statsY, Math.max(4, Math.floor(80 * hpPct)), 10, 4);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`${data.stats.hp}`, 40, statsY + 8);

  // ATK / DEF / SPD compact
  const statLabels = [
    { label: 'ATK', val: data.stats.attack, x: 140 },
    { label: 'DEF', val: data.stats.defense, x: 210 },
    { label: 'SPD', val: data.stats.speed, x: 280 },
    { label: 'CHA', val: data.stats.chaos, x: 350 },
  ];

  statLabels.forEach((s) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#71717a';
    ctx.font = 'bold 6.5px monospace';
    ctx.fillText(s.label, s.x, statsY + 6);
    ctx.fillStyle = '#e2dfde';
    ctx.font = 'bold 8px monospace';
    ctx.fillText(`${s.val}`, s.x + 26, statsY + 6);
  });

  // W/L record (right edge)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#52525b';
  ctx.font = 'bold 7px monospace';
  ctx.fillText(`W:${data.wins ?? 0} L:${data.losses ?? 0}`, 444, statsY + 6);

  // ── Roast / Description Box ──
  ctx.fillStyle = '#1e1e24';
  ctx.beginPath();
  ctx.roundRect(16, 180, 428, 24, 4);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.roundRect(16, 180, 428, 24, 4);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#a1a1aa';
  ctx.font = 'italic 7.5px monospace';
  const roastLines = wrapText(data.roast.toUpperCase(), 48).slice(0, 2);
  roastLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, 194 + i * 8);
  });

  // ── Footer ──
  ctx.textAlign = 'left';
  ctx.fillStyle = '#52525b';
  ctx.font = 'bold 6.5px monospace';
  ctx.fillText(`@${data.username.toUpperCase()}`, 16, 214);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#7f001c';
  ctx.font = 'bold 7px monospace';
  ctx.fillText('⚡ GITTYMON', 444, 214);
  ctx.textAlign = 'left';
}

// Render a static card (frame 0) and return the canvas
function renderStaticCard(data: CardData): HTMLCanvasElement {
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

/**
 * Generate a full inline SVG string of the card from CardData.
 * Matches the TCG-inspired canvas design — same layout, colors, sparkles.
 */
export function generateCardSvg(data: CardData): string {
  const W = 460;
  const H = 220;

  const spriteResult = buildSpriteGrid(data.spriteSeed, 0);
  const [outlineColor, bodyColor, lightColor, accentColor] = spriteResult.palette;
  const paletteColors = spriteResult.palette;
  const grid = spriteResult.grid;

  // ── Generate sprite rects ──
  let spriteRects = '';
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const cell = grid[y][x];
      if (cell === 0) continue;
      const color = cell === 1 ? paletteColors[0]
        : cell === 2 ? paletteColors[1]
        : cell === 3 ? paletteColors[2]
        : cell === 4 ? paletteColors[3]
        : cell === 5 ? '#ffffff' : paletteColors[0];
      spriteRects += `<rect x="${x * 4}" y="${y * 4}" width="4" height="4" fill="${color}" />\n`;
    }
  }

  // ── Roast lines ──
  const roastLines = wrapText(data.roast.toUpperCase(), 48).slice(0, 2);
  let roastSvg = '';
  roastLines.forEach((line, i) => {
    roastSvg += `<text x="230" y="${194 + i * 8}" fill="#a1a1aa" font-family="monospace" font-size="7.5" font-style="italic" text-anchor="middle">${escapeXml(line)}</text>\n`;
  });

  // ── Type label ──
  const trimmedType = data.type.length > 16 ? data.type.slice(0, 16).toUpperCase() : data.type.toUpperCase();
  const typeW = Math.max(40, trimmedType.length * 4.5 + 16);
  const typeX = (W - typeW) / 2;

  // ── HP bar color ──
  const hpPct = Math.min(100, data.stats.hp) / 100;
  const hpColor = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444';
  const hpW = Math.max(4, Math.floor(80 * hpPct));

  const displayName = data.monName.length > 16 ? data.monName.slice(0, 16) : data.monName;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none">
  <defs>
    <linearGradient id="bgG" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#0a0d16" />
      <stop offset="100%" stop-color="#05080f" />
    </linearGradient>
    <radialGradient id="shineG" cx="50%" cy="18%" r="50%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.04)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0)" />
    </radialGradient>

  </defs>

  <rect width="${W}" height="${H}" rx="10" fill="url(#bgG)" />
  <rect width="${W}" height="${H}" rx="10" fill="url(#shineG)" />

  <rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="10" stroke="#27272a" stroke-width="2" fill="none" />
  <rect x="4" y="4" width="${W - 8}" height="3" fill="#7f001c" />

  <text x="16" y="24" fill="#ffffff" font-family="monospace" font-size="18" font-weight="bold">${escapeXml(displayName.toUpperCase())}</text>

  <rect x="${W - 120}" y="8" width="108" height="18" rx="5" fill="#1a1a1a" />
  <text x="${W - 112}" y="22" fill="#ef4444" font-family="monospace" font-size="11" font-weight="bold">&#9829;</text>
  <text x="${W - 98}" y="22" fill="#ffffff" font-family="monospace" font-size="11" font-weight="bold">${data.stats.hp}</text>
  <text x="${W - 76}" y="22" fill="#52525b" font-family="monospace" font-size="11" font-weight="bold">|</text>
  <text x="${W - 58}" y="22" fill="#e2dfde" font-family="monospace" font-size="11" font-weight="bold">LV${data.level}</text>

  <line x1="12" y1="34" x2="${W - 12}" y2="34" stroke="#1e293b" stroke-width="1" />

  <rect x="140" y="34" width="180" height="108" rx="8" fill="#475569" />

  <g transform="translate(${(W - 96) / 2}, 40)">
    ${spriteRects}
  </g>

  <rect x="${typeX}" y="142" width="${typeW}" height="14" rx="7" fill="rgba(127,0,28,0.15)" stroke="#7f001c" stroke-width="0.5" />
  <text x="${W / 2}" y="153" fill="#7f001c" font-family="monospace" font-size="7" font-weight="bold" text-anchor="middle">${escapeXml(trimmedType)}</text>

  <text x="16" y="170" fill="#a1a1aa" font-family="monospace" font-size="7" font-weight="bold">HP</text>
  <rect x="34" y="164" width="80" height="10" rx="4" fill="#27272a" />
  <rect x="34" y="164" width="${hpW}" height="10" rx="4" fill="${hpColor}" />
  <text x="40" y="172" fill="#ffffff" font-family="monospace" font-size="7" font-weight="bold">${data.stats.hp}</text>

  <text x="140" y="170" fill="#71717a" font-family="monospace" font-size="6.5" font-weight="bold">ATK</text>
  <text x="166" y="170" fill="#e2dfde" font-family="monospace" font-size="8" font-weight="bold">${data.stats.attack}</text>
  <text x="210" y="170" fill="#71717a" font-family="monospace" font-size="6.5" font-weight="bold">DEF</text>
  <text x="236" y="170" fill="#e2dfde" font-family="monospace" font-size="8" font-weight="bold">${data.stats.defense}</text>
  <text x="280" y="170" fill="#71717a" font-family="monospace" font-size="6.5" font-weight="bold">SPD</text>
  <text x="306" y="170" fill="#e2dfde" font-family="monospace" font-size="8" font-weight="bold">${data.stats.speed}</text>
  <text x="350" y="170" fill="#71717a" font-family="monospace" font-size="6.5" font-weight="bold">CHA</text>
  <text x="376" y="170" fill="#e2dfde" font-family="monospace" font-size="8" font-weight="bold">${data.stats.chaos}</text>

  <text x="${W - 16}" y="170" fill="#52525b" font-family="monospace" font-size="7" font-weight="bold" text-anchor="end">W:${data.wins ?? 0} L:${data.losses ?? 0}</text>

  <rect x="16" y="180" width="${W - 32}" height="24" rx="4" fill="#1e1e24" stroke="#334155" stroke-width="0.5" />
  ${roastSvg}

  <text x="16" y="214" fill="#52525b" font-family="monospace" font-size="6.5" font-weight="bold">@${escapeXml(data.username.toUpperCase())}</text>
  <text x="${W - 16}" y="214" fill="#7f001c" font-family="monospace" font-size="7" font-weight="bold" text-anchor="end">&#9889; GITTYMON</text>
</svg>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
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
