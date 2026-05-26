import { adjustColor } from './colorUtils';
import { getSpriteFrames } from './spriteData';
import type { Gittymon, MonType } from './types';

/* ------------------------------------------------------------------ */
/*  Sprite drawing                                                     */
/* ------------------------------------------------------------------ */

/** Draw a single pixel-art sprite onto a canvas context */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: string[],
  x: number,
  y: number,
  scale: number,
  color: string,
  facingL: boolean,
) {
  const h = sprite.length;
  const w = sprite[0].length;
  const outlineColor = 'rgba(10, 11, 16, 0.85)';
  const shadowColor = adjustColor(color, -25);
  const highlightColor = adjustColor(color, 20);
  const accentColor = '#fbebcd';
  const pupilColor = '#12131a';

  // Outline pass
  ctx.fillStyle = outlineColor;
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const char = sprite[r][c];
      if (char && char !== ' ') {
        const drawCol = facingL ? c : w - 1 - c;
        const px = x + drawCol * scale;
        const py = y + r * scale;
        ctx.fillRect(px - scale, py, scale * 3, scale);
        ctx.fillRect(px, py - scale, scale, scale * 3);
      }
    }
  }

  // Color fill pass
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const char = sprite[r][c];
      if (!char || char === ' ') continue;
      const drawCol = facingL ? c : w - 1 - c;
      const px = x + drawCol * scale;
      const py = y + r * scale;

      switch (char) {
        case 'X': ctx.fillStyle = color; break;
        case 'O': ctx.fillStyle = '#ffffff'; break;
        case 'A': ctx.fillStyle = highlightColor; break;
        case 'S': ctx.fillStyle = shadowColor; break;
        case 'P': ctx.fillStyle = accentColor; break;
        case 'E': ctx.fillStyle = pupilColor; break;
        default: continue;
      }
      ctx.fillRect(px, py, scale, scale);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Monster visual helpers (glow, shadow, sparks, reaction bubble)     */
/* ------------------------------------------------------------------ */

/** Draw floor glow under a monster */
export function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string) {
  const shadowX = x + w / 2;
  const shadowY = y + 2;
  const glowRadius = w * 1.3;
  const floorGlow = ctx.createRadialGradient(shadowX, shadowY, 2, shadowX, shadowY, glowRadius);
  floorGlow.addColorStop(0, `${color}25`);
  floorGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = floorGlow;
  ctx.beginPath();
  ctx.arc(shadowX, shadowY, glowRadius, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw dynamic ground shadow (shrinks with jump) */
export function drawShadow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  spriteW: number,
  scale: number,
  jumpY: number,
) {
  const shadowX = x + spriteW / 2;
  const shadowY = y + 2;
  const jumpFactor = Math.max(0, 1 - Math.abs(jumpY) / 50);
  const rx = spriteW * 0.45 * jumpFactor;
  const ry = scale * 1.8 * jumpFactor;
  ctx.fillStyle = `rgba(10, 13, 22, ${0.35 * jumpFactor})`;
  ctx.beginPath();
  ctx.ellipse(shadowX, shadowY, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw a reaction speech bubble above a monster */
export function drawReactionBubble(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  drawY: number,
) {
  ctx.font = 'bold 7px "Space Mono", Monaco, monospace';
  const txtWidth = ctx.measureText(text).width;
  const labelX = x - txtWidth / 2 + 8;
  const labelY = drawY - 14;

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(labelX - 3, labelY - 8, txtWidth + 6, 11);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(labelX - 2, labelY - 7, txtWidth + 4, 9);
  ctx.fillStyle = '#7f001c';
  ctx.fillText(text, labelX, labelY);
}

/**
 * Determine which sprite frame to use for a monster and what scale factor.
 */
export function getMonsterDisplay(
  type: MonType,
  frame: number,
): { sprite: string[]; scale: number } {
  const sc: Record<MonType, number> = { trex: 2.2, slime: 2.4, octo: 2.3, bat: 2.2 };
  return {
    sprite: getSpriteFrames(type, frame),
    scale: sc[type],
  };
}
