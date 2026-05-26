import { buildSpriteGrid, drawSpriteOnCanvas } from './procGen';
import type { PaletteName } from './procGen';

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
  publicRepos?: number;
  followers?: number;
  joinedYear?: string;
  location?: string;
  moves?: Array<{ name: string; power: number; desc: string }>;
  paletteOverride?: PaletteName;
}

/**
 * Draw a MonDetailsView-style card on a 460×220 canvas.
 * White card with dark border — sprite on left, info/stats/moves on right.
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

  // ── White Background ──
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // ── Card Border ──
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  // ── Header background strip ──
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(2, 2, W - 4, 26);

  // ── Header: Name (left) + LV (right) ──
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'left';
  const displayName = data.monName.length > 18 ? data.monName.slice(0, 18) : data.monName;
  ctx.fillText(displayName.toUpperCase(), 10, 16);

  ctx.fillStyle = '#7f001c';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`LV ${data.level}`, W - 10, 16);

  // ── Separator line under header ──
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(4, 29);
  ctx.lineTo(W - 4, 29);
  ctx.stroke();

  // ── SPRITE (left, 96×96 with border) ──
  const spriteX = 8;
  const spriteY = 34;

  // Sprite background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(spriteX, spriteY, 96, 96);

  // Sprite border
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  ctx.strokeRect(spriteX, spriteY, 96, 96);

  const spriteResult = buildSpriteGrid(data.spriteSeed, frame, data.paletteOverride);
  drawSpriteOnCanvas(ctx, spriteResult, spriteX, spriteY, 4, frame);

  // Palette badge on sprite (small, bottom-right)
  const paletteBadge = data.paletteOverride || 'DMG';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(spriteX + 72, spriteY + 94, 22, 8);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(spriteX + 72, spriteY + 94, 22, 8);
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 5px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${paletteBadge.toUpperCase()} ◈`, spriteX + 83, spriteY + 98);

  // ── RIGHT PANEL: Info (starting right of sprite) ──
  const infoX = 114;
  let infoY = 40;

  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  // TYPE
  ctx.fillStyle = '#6b7280';
  ctx.font = 'bold 7px monospace';
  ctx.fillText('TYPE:', infoX, infoY);
  const typeText = data.type.length > 20 ? data.type.slice(0, 20) : data.type;
  ctx.fillStyle = '#7f001c';
  ctx.font = 'bold 7px monospace';
  ctx.fillText(typeText.toUpperCase(), infoX + 30, infoY);
  infoY += 13;

  // REPOS / FOLLOWER
  ctx.fillStyle = '#6b7280';
  ctx.font = 'bold 7px monospace';
  ctx.fillText('REPOS/FOLLOWER:', infoX, infoY);
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 7px monospace';
  ctx.fillText(`${data.publicRepos ?? '?'} / ${data.followers ?? '?'}`, infoX + 78, infoY);
  infoY += 13;

  // BORN IN
  ctx.fillStyle = '#6b7280';
  ctx.font = 'bold 7px monospace';
  ctx.fillText('BORN IN:', infoX, infoY);
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 7px monospace';
  const loc = data.location ? data.location.split(',')[0].slice(0, 10) : '?';
  ctx.fillText(`${data.joinedYear ?? '?'} @ ${loc}`, infoX + 44, infoY);
  infoY += 16;

  // ── Compact Stat Bars (5 rows) ──
  const statEntries: Array<[string, number]> = [
    ['HP', data.stats.hp],
    ['ATK', data.stats.attack],
    ['DEF', data.stats.defense],
    ['SPD', data.stats.speed],
    ['CHA', data.stats.chaos],
  ];

  const barMaxWidth = 160;
  const barHeight = 8;
  const barYStart = infoY;

  statEntries.forEach(([label, val], i) => {
    const y = barYStart + i * (barHeight + 3);

    // Label
    ctx.fillStyle = '#6b7280';
    ctx.font = 'bold 6px monospace';
    ctx.fillText(label, infoX, y);

    // Bar background
    ctx.fillStyle = '#f3f4f6';
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 0.5;
    const barX = infoX + 24;
    ctx.fillRect(barX, y, barMaxWidth, barHeight);
    ctx.strokeRect(barX, y, barMaxWidth, barHeight);

    // Bar filled segments (8 segments, each 12.5%)
    const segments = 8;
    const segW = Math.floor(barMaxWidth / segments);
    for (let s = 0; s < segments; s++) {
      const blockMax = (s + 1) * 12.5;
      if (val >= blockMax) {
        ctx.fillStyle = label === 'CHA' ? '#7f001c' : '#1a1a1a';
        ctx.fillRect(barX + s * segW, y + 1, segW - 1, barHeight - 2);
      }
    }

    // Value
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${val}`, barX + barMaxWidth + 18, y);
    ctx.textAlign = 'left';
  });

  infoY = barYStart + 5 * (barHeight + 3) + 4;

  // ── Compact Moves ──
  if (data.moves && data.moves.length > 0) {
    let moveX = infoX;
    let moveRowY = infoY;

    data.moves.forEach((move) => {
      const moveText = `${move.name.toUpperCase()} P${move.power}`;
      ctx.font = 'bold 5.5px monospace';
      const textW = ctx.measureText(moveText).width + 8;

      // Wrap to next row if needed
      if (moveX + textW > W - 8) {
        moveX = infoX;
        moveRowY += 10;
      }

      // Pill background
      ctx.fillStyle = '#f3f4f6';
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 0.5;
      const pillH = 8;
      ctx.fillRect(moveX, moveRowY, textW, pillH);
      ctx.strokeRect(moveX, moveRowY, textW, pillH);

      // Move name (crimson) + power (gray)
      ctx.textBaseline = 'middle';
      const nameW = ctx.measureText(move.name.toUpperCase()).width;
      ctx.fillStyle = '#7f001c';
      ctx.font = 'bold 5.5px monospace';
      ctx.fillText(move.name.toUpperCase(), moveX + 3, moveRowY + pillH / 2);
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(`P${move.power}`, moveX + 3 + nameW + 2, moveRowY + pillH / 2);

      moveX += textW + 2;
    });
  }

  // ── Dashed separator before roast ──
  const dashY = 167;
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(8, dashY);
  ctx.lineTo(W - 8, dashY);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── Roast ──
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#6b7280';
  ctx.font = 'italic 6.5px monospace';
  ctx.textAlign = 'left';
  const roastLines = wrapText(`"${data.roast}"`, 60).slice(0, 2);
  roastLines.forEach((line, i) => {
    ctx.fillText(line, 8, dashY + 4 + i * 9);
  });

  // ── Footer separator ──
  const footerY = 192;
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(4, footerY);
  ctx.lineTo(W - 4, footerY);
  ctx.stroke();

  // ── Footer background ──
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(2, footerY + 1, W - 4, H - footerY - 3);

  // ── Footer: W/L (left) + @username (right) ──
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#6b7280';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`W:${data.wins ?? 0} L:${data.losses ?? 0}`, 8, footerY + 13);

  ctx.fillStyle = '#7f001c';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`@${data.username.toUpperCase()}`, W - 8, footerY + 13);
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

/**
 * Generate a full inline SVG string of the card from CardData.
 * Matches the MonDetailsView-style canvas design.
 */
export function generateCardSvg(data: CardData): string {
  const W = 460;
  const H = 220;

  const spriteResult = buildSpriteGrid(data.spriteSeed, 0, data.paletteOverride);
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
  const roastLines = wrapText(`"${data.roast}"`, 60).slice(0, 2);
  let roastSvg = '';
  roastLines.forEach((line, i) => {
    roastSvg += `<text x="8" y="${175 + i * 9}" fill="#6b7280" font-family="monospace" font-size="6.5" font-style="italic">${escapeXml(line)}</text>\n`;
  });

  // ── Info field values ──
  const typeText = data.type.length > 20 ? data.type.slice(0, 20) : data.type;
  const loc = data.location ? data.location.split(',')[0].slice(0, 10) : '?';
  const displayName = data.monName.length > 18 ? data.monName.slice(0, 18) : data.monName;
  const paletteBadge = (data.paletteOverride || 'DMG').toUpperCase();

  // ── Stat bars ──
  const statEntries: Array<[string, number]> = [
    ['HP', data.stats.hp],
    ['ATK', data.stats.attack],
    ['DEF', data.stats.defense],
    ['SPD', data.stats.speed],
    ['CHA', data.stats.chaos],
  ];

  let statBarsSvg = '';
  const barMaxW = 160;
  const barH = 8;
  const segments = 8;
  const segW = Math.floor(barMaxW / segments);

  statEntries.forEach(([label, val], i) => {
    const y = 82 + i * (barH + 3);
    // Label
    statBarsSvg += `<text x="114" y="${y + 6}" fill="#6b7280" font-family="monospace" font-size="6" font-weight="bold">${label}</text>\n`;
    // Bar bg
    statBarsSvg += `<rect x="138" y="${y}" width="${barMaxW}" height="${barH}" fill="#f3f4f6" stroke="#d1d5db" stroke-width="0.5" />\n`;
    // Filled segments
    for (let s = 0; s < segments; s++) {
      const blockMax = (s + 1) * 12.5;
      if (val >= blockMax) {
        const fill = label === 'CHA' ? '#7f001c' : '#1a1a1a';
        statBarsSvg += `<rect x="${138 + s * segW}" y="${y + 1}" width="${segW - 1}" height="${barH - 2}" fill="${fill}" />\n`;
      }
    }
    // Value
    statBarsSvg += `<text x="${138 + barMaxW + 18}" y="${y + 6}" fill="#1a1a1a" font-family="monospace" font-size="6" font-weight="bold" text-anchor="end">${val}</text>\n`;
  });

  // ── Move pills ──
  let movesSvg = '';
  if (data.moves && data.moves.length > 0) {
    let mx = 114;
    let my = 141;
    const pillH = 8;

    data.moves.forEach((move) => {
      const moveText = `${move.name.toUpperCase()} P${move.power}`;
      // Estimate text width: ~3.3px per char at 5.5px font
      const textW = moveText.length * 3.3 + 8;

      if (mx + textW > W - 8) {
        mx = 114;
        my += pillH + 2;
      }

      movesSvg += `<rect x="${mx}" y="${my}" width="${Math.floor(textW)}" height="${pillH}" fill="#f3f4f6" stroke="#d1d5db" stroke-width="0.5" />\n`;
      movesSvg += `<text x="${mx + 3}" y="${my + pillH / 2 + 1}" fill="#7f001c" font-family="monospace" font-size="5.5" font-weight="bold" dominant-baseline="middle">${escapeXml(move.name.toUpperCase())}</text>\n`;
      const nameW = move.name.length * 3.3;
      movesSvg += `<text x="${mx + 3 + nameW + 2}" y="${my + pillH / 2 + 1}" fill="#9ca3af" font-family="monospace" font-size="5.5" dominant-baseline="middle">P${move.power}</text>\n`;

      mx += Math.floor(textW) + 2;
    });
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none">
  <!-- Card Background -->
  <rect width="${W}" height="${H}" fill="#ffffff" />

  <!-- Card Border -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" stroke="#1a1a1a" stroke-width="2" fill="none" />

  <!-- Header Background -->
  <rect x="2" y="2" width="${W - 4}" height="26" fill="#fafafa" />

  <!-- Monster Name -->
  <text x="10" y="16" fill="#1a1a1a" font-family="monospace" font-size="13" font-weight="bold" dominant-baseline="middle">${escapeXml(displayName.toUpperCase())}</text>

  <!-- Level -->
  <text x="${W - 10}" y="16" fill="#7f001c" font-family="monospace" font-size="11" font-weight="bold" text-anchor="end" dominant-baseline="middle">LV ${data.level}</text>

  <!-- Header Separator -->
  <line x1="4" y1="29" x2="${W - 4}" y2="29" stroke="#1a1a1a" stroke-width="1" />

  <!-- Sprite Area -->
  <rect x="8" y="34" width="96" height="96" fill="#ffffff" stroke="#1a1a1a" stroke-width="1" />

  <!-- Procedural Sprite -->
  <g transform="translate(8, 34)">
    ${spriteRects}
  </g>

  <!-- Palette Badge -->
  <rect x="80" y="128" width="22" height="8" fill="#ffffff" stroke="#1a1a1a" stroke-width="0.5" />
  <text x="91" y="132" fill="#1a1a1a" font-family="monospace" font-size="5" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${escapeXml(paletteBadge)} ◈</text>

  <!-- Info Panel -->
  <text x="114" y="40" fill="#6b7280" font-family="monospace" font-size="7" font-weight="bold">TYPE:</text>
  <text x="144" y="40" fill="#7f001c" font-family="monospace" font-size="7" font-weight="bold">${escapeXml(typeText.toUpperCase())}</text>

  <text x="114" y="53" fill="#6b7280" font-family="monospace" font-size="7" font-weight="bold">REPOS/FOLLOWER:</text>
  <text x="192" y="53" fill="#1a1a1a" font-family="monospace" font-size="7" font-weight="bold">${data.publicRepos ?? '?'} / ${data.followers ?? '?'}</text>

  <text x="114" y="66" fill="#6b7280" font-family="monospace" font-size="7" font-weight="bold">BORN IN:</text>
  <text x="158" y="66" fill="#1a1a1a" font-family="monospace" font-size="7" font-weight="bold">${data.joinedYear ?? '?'} @ ${escapeXml(loc)}</text>

  <!-- Stat Bars -->
  ${statBarsSvg}

  <!-- Move Pills -->
  ${movesSvg}

  <!-- Dashed Separator -->
  <line x1="8" y1="167" x2="${W - 8}" y2="167" stroke="#d1d5db" stroke-width="0.5" stroke-dasharray="3,3" />

  <!-- Roast -->
  ${roastSvg}

  <!-- Footer Separator -->
  <line x1="4" y1="192" x2="${W - 4}" y2="192" stroke="#1a1a1a" stroke-width="1" />

  <!-- Footer Background -->
  <rect x="2" y="193" width="${W - 4}" height="${H - 195}" fill="#f5f5f5" />

  <!-- W/L Record -->
  <text x="8" y="205" fill="#6b7280" font-family="monospace" font-size="7" font-weight="bold" dominant-baseline="middle">W:${data.wins ?? 0} L:${data.losses ?? 0}</text>

  <!-- Username -->
  <text x="${W - 8}" y="205" fill="#7f001c" font-family="monospace" font-size="7" font-weight="bold" text-anchor="end" dominant-baseline="middle">@${escapeXml(data.username.toUpperCase())}</text>
</svg>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Download an SVG file from CardData
export function downloadCardAsSvg(data: CardData, filename?: string) {
  const svg = generateCardSvg(data);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${data.username}-gittymon-card.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
