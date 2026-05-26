import { buildSpriteGrid, drawSpriteOnCanvas } from './procGen';
import { RARITY_CONFIGS } from '../lib/rarity';
import type { Rarity, Stats } from '../types';

export interface ShareCardData {
  name: string;
  username: string;
  type: string;
  level: number;
  rarity: Rarity;
  form: string;
  stats: Stats;
  spriteSeed: string;
  roast: string;
  mutations: string[];
}

const SIZE = 600;
const PAD = 24;
const INNER = SIZE - PAD * 2; // 552

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

/**
 * Draw a premium 1:1 share card on a 600×600 canvas.
 * Dark gradient BG, glowing rarity border, large animated sprite,
 * compact stat bars, roast text, mutation tags, and subtle watermark.
 */
function renderShareCard(
  canvas: HTMLCanvasElement,
  data: ShareCardData,
  frame: number = 0,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = SIZE;
  const H = SIZE;
  ctx.clearRect(0, 0, W, H);

  const config = RARITY_CONFIGS[data.rarity];

  // ── Background ──
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#0f172a');
  bgGrad.addColorStop(0.3, '#0a0d16');
  bgGrad.addColorStop(1, '#05080f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Outer glow ──
  ctx.save();
  ctx.shadowColor = config.glowColor;
  ctx.shadowBlur = 50;
  ctx.strokeStyle = 'transparent';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(PAD - 4, PAD - 4, INNER + 8, INNER + 8, 20);
  ctx.stroke();
  ctx.restore();

  // ── Glowing border ring ──
  ctx.save();
  ctx.shadowColor = config.glowColor;
  ctx.shadowBlur = 25;
  ctx.strokeStyle = config.color;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.roundRect(PAD, PAD, INNER, INNER, 16);
  ctx.stroke();
  ctx.restore();

  // ── Inner card background ──
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.beginPath();
  ctx.roundRect(PAD + 1, PAD + 1, INNER - 2, INNER - 2, 16);
  ctx.fill();

  // Subtle card shine
  const shineGrad = ctx.createRadialGradient(W / 2, 100, 20, W / 2, 100, 300);
  shineGrad.addColorStop(0, 'rgba(255,255,255,0.04)');
  shineGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shineGrad;
  ctx.beginPath();
  ctx.roundRect(PAD, PAD, INNER, INNER, 16);
  ctx.fill();

  // ── Top accent bar ──
  ctx.fillStyle = config.color;
  ctx.beginPath();
  ctx.roundRect(PAD + 1, PAD + 1, INNER - 2, 4, [16, 16, 0, 0]);
  ctx.fill();

  // ═════════════════════════════════════╗
  //   LAYOUT
  // ═════════════════════════════════════╝

  // ── Rarity badge (centered, prominent) ──
  ctx.textAlign = 'center';
  const badgeLabel = config.label;
  ctx.font = 'bold 13px monospace';
  const badgeW = ctx.measureText(badgeLabel).width + 32;
  const badgeX = (W - badgeW) / 2;
  const badgeY = 48;

  // Badge glow
  ctx.save();
  ctx.shadowColor = config.color;
  ctx.shadowBlur = 12;
  ctx.fillStyle = config.color;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, 24, 12);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = config.textColor;
  ctx.font = 'bold 10px monospace';
  ctx.fillText(badgeLabel, W / 2, badgeY + 16);

  // ── Sprite panel ──
  const spritePixelSize = 8; // 24×8 = 192px
  const spriteSize = 24 * spritePixelSize;
  const spriteX = (W - spriteSize) / 2;
  const spriteY = 86;

  // Sprite background panel
  ctx.fillStyle = 'rgba(71, 85, 105, 0.25)';
  ctx.beginPath();
  ctx.roundRect(spriteX - 10, spriteY - 10, spriteSize + 20, spriteSize + 20, 14);
  ctx.fill();

  // Sprite panel border
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(spriteX - 10, spriteY - 10, spriteSize + 20, spriteSize + 20, 14);
  ctx.stroke();

  const sprite = buildSpriteGrid(data.spriteSeed, frame);
  drawSpriteOnCanvas(ctx, sprite, spriteX, spriteY, spritePixelSize, frame);

  // ── Name (big, bold) ──
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px monospace';
  const displayName = data.name.length > 20 ? data.name.slice(0, 19) + '…' : data.name;
  ctx.fillText(displayName.toUpperCase(), W / 2, 310);

  // ── Info line (form · level · type) ──
  ctx.fillStyle = '#a1a1aa';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(
    `${data.form.toUpperCase()} · LV${data.level} · ${data.type.toUpperCase()}`,
    W / 2,
    335,
  );

  // ── Stats bars ──
  const statEntries: { label: string; value: number; color: string }[] = [
    { label: 'HP', value: data.stats.hp, color: '#ef4444' },
    { label: 'ATK', value: data.stats.attack, color: '#f97316' },
    { label: 'DEF', value: data.stats.defense, color: '#22c55e' },
    { label: 'SPD', value: data.stats.speed, color: '#3b82f6' },
    { label: 'CHA', value: data.stats.chaos, color: '#a855f7' },
  ];

  const maxStat = 150;
  const statStartY = 360;
  const statLabelX = PAD + 60;
  const statBarX = statLabelX + 44;
  const statBarW = 280;
  const statBarH = 14;
  const statRowH = 24;
  const statValueX = statBarX + statBarW + 12;

  statEntries.forEach((s, i) => {
    const y = statStartY + i * statRowH;

    // Label
    ctx.textAlign = 'left';
    ctx.fillStyle = '#71717a';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(s.label, statLabelX, y + 11);

    // Bar background
    ctx.fillStyle = '#27272a';
    ctx.beginPath();
    ctx.roundRect(statBarX, y, statBarW, statBarH, 7);
    ctx.fill();

    // Bar fill — with a tiny shine
    const pct = Math.min(100, (s.value / maxStat) * 100);
    const fillW = Math.max(8, (statBarW * pct) / 100);

    const barGrad = ctx.createLinearGradient(statBarX, y, statBarX, y + statBarH);
    barGrad.addColorStop(0, s.color);
    barGrad.addColorStop(0.5, s.color);
    barGrad.addColorStop(1, darkenColor(s.color, 0.3));
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    ctx.roundRect(statBarX, y, fillW, statBarH, 7);
    ctx.fill();

    // Value text
    ctx.fillStyle = '#e2dfde';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`${s.value}`, statValueX, y + 11);
  });

  // ── Roast text ──
  const roastY = 484;
  ctx.fillStyle = 'rgba(30, 30, 36, 0.6)';
  ctx.beginPath();
  ctx.roundRect(PAD + 20, roastY, INNER - 40, 34, 8);
  ctx.fill();

  ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.roundRect(PAD + 20, roastY, INNER - 40, 34, 8);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#a1a1aa';
  ctx.font = 'italic 10px monospace';
  const roastLines = wrapText(data.roast.toUpperCase(), 50).slice(0, 2);
  roastLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, roastY + 14 + i * 14);
  });

  // ── Mutation tags ──
  if (data.mutations.length > 0) {
    const mutY = 528;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#52525b';
    ctx.font = 'bold 7px monospace';
    ctx.fillText('✦ MUTATIONS', PAD + 20, mutY);

    let x = PAD + 108;
    data.mutations.slice(0, 5).forEach((m) => {
      const label = m.length > 16 ? m.slice(0, 15) + '…' : m;
      ctx.font = '7px monospace';
      const textW = ctx.measureText(label).width + 14;
      ctx.fillStyle = 'rgba(127, 0, 28, 0.15)';
      ctx.beginPath();
      ctx.roundRect(x, mutY - 7, textW, 16, 8);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 6px monospace';
      ctx.fillText(label, x + 7, mutY + 5);
      x += textW + 6;
    });
  }

  // ── Username (bottom left) ──
  ctx.textAlign = 'left';
  ctx.fillStyle = '#52525b';
  ctx.font = 'bold 9px monospace';
  ctx.fillText(`@${data.username.toUpperCase()}`, PAD + 20, 568);

  // ── Watermark (bottom right) ──
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(127, 0, 28, 0.45)';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('⚡ Gittymon.ai', W - PAD - 20, 568);
}

/**
 * Darken a hex color by a factor (0-1).
 */
function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.floor(r * (1 - factor))}, ${Math.floor(g * (1 - factor))}, ${Math.floor(b * (1 - factor))})`;
}

/**
 * Render a static share card (frame 0) and return the canvas.
 */
function renderShareCardStatic(data: ShareCardData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  renderShareCard(canvas, data, 0);
  return canvas;
}

/**
 * Download a share card as a PNG image.
 */
export function downloadShareCardPng(data: ShareCardData, filename?: string) {
  const canvas = renderShareCardStatic(data);
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
 * Open a share card in a new tab as a standalone image.
 */
function openShareCardInTab(data: ShareCardData) {
  const canvas = renderShareCardStatic(data);
  const url = canvas.toDataURL('image/png');
  window.open(url, '_blank');
}

/**
 * Render a composite gallery image from multiple cards and download as PNG.
 * Arranges cards in a grid with a header showing collection summary.
 */
export function downloadCompositePng(cards: ShareCardData[], username?: string) {
  const COLS = Math.min(3, Math.max(2, Math.ceil(cards.length / 4)));
  const CARD_W = 340;
  const CARD_H = 190;
  const GAP = 16;
  const HEADER_H = 64;
  const PAD = 24;

  const rows = Math.ceil(cards.length / COLS);
  const W = PAD * 2 + COLS * CARD_W + (COLS - 1) * GAP;
  const H = HEADER_H + PAD * 2 + rows * CARD_H + (rows - 1) * GAP;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // ── Background ──
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#0f172a');
  bgGrad.addColorStop(0.3, '#0a0d16');
  bgGrad.addColorStop(1, '#05080f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Header bar ──
  ctx.fillStyle = 'rgba(127, 0, 28, 0.85)';
  ctx.beginPath();
  ctx.roundRect(PAD, PAD, W - PAD * 2, HEADER_H, 10);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(`⚡ GITTYMON COLLECTION — ${cards.length} CARDS`, W / 2, PAD + 28);

  if (username) {
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`@${username.toUpperCase()}`, W / 2, PAD + 48);
  }

  // ── Card grid ──
  const maxStat = 150;

  cards.forEach((card, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const x = PAD + col * (CARD_W + GAP);
    const y = PAD + HEADER_H + PAD + row * (CARD_H + GAP);

    const config = RARITY_CONFIGS[card.rarity];

    // Card background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(x, y, CARD_W, CARD_H, 8);
    ctx.fill();

    // Rarity top accent
    ctx.fillStyle = config.color;
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, CARD_W - 2, 3, [8, 8, 0, 0]);
    ctx.fill();

    // Glow border
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.roundRect(x, y, CARD_W, CARD_H, 8);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Sprite (left side)
    const spriteSize = 64;
    const spriteX = x + 12;
    const spriteY = y + 16;

    // Sprite background panel
    ctx.fillStyle = 'rgba(71, 85, 105, 0.2)';
    ctx.beginPath();
    ctx.roundRect(spriteX - 4, spriteY - 4, spriteSize + 8, spriteSize + 8, 6);
    ctx.fill();

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 24;
    tempCanvas.height = 24;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      const sprite = buildSpriteGrid(card.spriteSeed, 0);
      drawSpriteOnCanvas(tempCtx, sprite, 0, 0, 1, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tempCanvas, spriteX, spriteY, spriteSize, spriteSize);
    }

    // Name
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    const displayName = card.name.length > 16 ? card.name.slice(0, 15) + '…' : card.name;
    ctx.fillText(displayName.toUpperCase(), spriteX + spriteSize + 14, spriteY + 14);

    // Info line
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '8px monospace';
    ctx.fillText(`LV${card.level} · ${card.type.toUpperCase()} · ${card.form.length > 12 ? card.form.slice(0, 11) + '…' : card.form.toUpperCase()}`, spriteX + spriteSize + 14, spriteY + 28);

    // Rarity badge
    ctx.textAlign = 'center';
    const badgeLabel = config.label;
    ctx.font = 'bold 7px monospace';
    const badgeW = ctx.measureText(badgeLabel).width + 14;
    const badgeX = spriteX + spriteSize + 14;
    const badgeY = spriteY + 36;
    ctx.fillStyle = config.color;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, 14, 7);
    ctx.fill();
    ctx.fillStyle = config.textColor;
    ctx.font = 'bold 6px monospace';
    ctx.fillText(badgeLabel, badgeX + badgeW / 2, badgeY + 10);

    // Username
    ctx.textAlign = 'left';
    ctx.fillStyle = '#52525b';
    ctx.font = 'bold 7px monospace';
    ctx.fillText(`@${card.username.toUpperCase()}`, spriteX + spriteSize + 14, spriteY + 62);

    // Stats mini-bars (right side)
    const statEntries: { label: string; value: number; color: string }[] = [
      { label: 'HP', value: card.stats.hp, color: '#ef4444' },
      { label: 'ATK', value: card.stats.attack, color: '#f97316' },
      { label: 'DEF', value: card.stats.defense, color: '#22c55e' },
      { label: 'SPD', value: card.stats.speed, color: '#3b82f6' },
      { label: 'CHA', value: card.stats.chaos, color: '#a855f7' },
    ];

    const statStartX = x + CARD_W - 110;
    const statBarW = 70;
    const statBarH = 6;
    const statRowH = 16;

    statEntries.forEach((s, i) => {
      const sy = spriteY + i * statRowH;

      ctx.textAlign = 'left';
      ctx.fillStyle = '#71717a';
      ctx.font = 'bold 6px monospace';
      ctx.fillText(s.label, statStartX, sy + 6);

      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.roundRect(statStartX + 18, sy, statBarW, statBarH, 3);
      ctx.fill();

      const pct = Math.min(100, (s.value / maxStat) * 100);
      const fillW = Math.max(4, (statBarW * pct) / 100);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.roundRect(statStartX + 18, sy, fillW, statBarH, 3);
      ctx.fill();

      ctx.fillStyle = '#e2dfde';
      ctx.font = 'bold 6px monospace';
      ctx.fillText(`${s.value}`, statStartX + 18 + statBarW + 4, sy + 6);
    });

    // Mutations count indicator
    if (card.mutations.length > 0) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '6px monospace';
      ctx.fillText(`✦${card.mutations.length}`, x + CARD_W - 8, y + CARD_H - 6);
    }
  });

  // ── Watermark ──
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(127, 0, 28, 0.3)';
  ctx.font = 'bold 8px monospace';
  ctx.fillText('⚡ Gittymon.ai', W / 2, H - 8);

  // ── Download ──
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${username || 'collection'}-gittymon-collection.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}
