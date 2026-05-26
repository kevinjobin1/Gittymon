import type { CosmicParticle } from './types';
import { updateAndRenderParticles } from './particleSystem';
import {
  drawSprite,
  drawGlow,
  drawShadow,
  drawReactionBubble,
  getMonsterDisplay,
} from './spriteRenderer';
import { spawnTrailSpark } from './particleSystem';
import { updateMonsters } from './monsterAI';
import type { Gittymon } from './types';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  canvasW: number;
  canvasH: number;
  expanded: boolean;
  gridOffset: { x: number; y: number };
  monRefs: Gittymon[];
  particleRefs: CosmicParticle[];
  mouse: { x: number; y: number; idleTicks: number };
}

/* ------------------------------------------------------------------ */
/*  Background grid, radar circles, mouse crosshair HUD               */
/* ------------------------------------------------------------------ */

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, gx: number, gy: number) {
  const gridSize = 64;
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
  ctx.lineWidth = 1;
  for (let x = -gridSize + (gx % gridSize); x < w + gridSize; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = -gridSize + (gy % gridSize); y < h + gridSize; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function drawRadarCircle(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = 'rgba(244, 63, 94, 0.03)';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 380, 0, Math.PI * 2);
  ctx.stroke();
}

function drawMouseHUD(ctx: CanvasRenderingContext2D, m: { x: number; y: number; idleTicks: number }) {
  if (m.x < 0 || m.y < 0 || m.idleTicks >= 300) return;

  const lineAlpha = Math.max(0, 1 - m.idleTicks / 300);
  ctx.strokeStyle = `rgba(56, 189, 248, ${lineAlpha * 0.15})`;
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;

  // Crosshair lines
  ctx.beginPath(); ctx.moveTo(0, m.y); ctx.lineTo(ctx.canvas.width, m.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(m.x, 0); ctx.lineTo(m.x, ctx.canvas.height); ctx.stroke();
  ctx.setLineDash([]);

  // HUD coordinate label
  ctx.fillStyle = `rgba(56, 189, 248, ${lineAlpha * 0.6})`;
  ctx.font = '8px "JetBrains Mono", monospace';
  const hexX = `0x${Math.floor(m.x).toString(16).toUpperCase().padStart(3, '0')}`;
  const hexY = `0x${Math.floor(m.y).toString(16).toUpperCase().padStart(3, '0')}`;
  ctx.fillText(`[G-LOC: ${hexX}, ${hexY}]`, m.x + 12, m.y - 8);

  // Pulsing radar ring
  ctx.strokeStyle = `rgba(244, 63, 94, ${lineAlpha * 0.3})`;
  ctx.beginPath();
  const pulseRadius = 6 + Math.sin(Date.now() / 150) * 2;
  ctx.arc(m.x, m.y, pulseRadius, 0, Math.PI * 2);
  ctx.stroke();
}

/* ------------------------------------------------------------------ */
/*  Single frame render                                                */
/* ------------------------------------------------------------------ */

/** Render one animation frame onto the canvas */
export function renderFrame(ctx: RenderContext) {
  const { ctx: c, canvasW, canvasH, gridOffset, mouse, particleRefs, monRefs } = ctx;

  // --- Clear & background ---
  c.fillStyle = '#0a0d16';
  c.fillRect(0, 0, canvasW, canvasH);
  drawGrid(c, canvasW, canvasH, gridOffset.x, gridOffset.y);
  drawRadarCircle(c, canvasW, canvasH);
  drawMouseHUD(c, mouse);

  // --- Particles ---
  updateAndRenderParticles(c, particleRefs, canvasW, canvasH);

  // --- Update AI ---
  updateMonsters(monRefs, canvasW, canvasH);

  // --- Render monsters ---
  for (let i = 0; i < monRefs.length; i++) {
    const mon = monRefs[i];
    const display = getMonsterDisplay(mon.type, mon.frame);
    const drawY = mon.y + mon.jumpY;
    const spriteW = display.sprite[0].length * display.scale;
    const spriteH = display.sprite.length * display.scale;

    // Glow + shadow
    drawGlow(c, mon.x, mon.y, spriteW, mon.color);
    drawShadow(c, mon.x, mon.y, spriteW, display.scale, mon.jumpY);

    // Trail sparks while panicking
    if (mon.state === 'panic' && Math.random() < 0.15) {
      particleRefs.push(
        spawnTrailSpark(
          mon.x + spriteW / 2 + (Math.random() - 0.5) * 16,
          drawY + spriteH / 2 + (Math.random() - 0.5) * 16,
          mon.color,
        ),
      );
    }

    // Sprite
    drawSprite(c, display.sprite, mon.x, drawY, display.scale, mon.color, mon.lastDir === 'L');

    // Reaction bubble
    if (mon.clickReactionTimer > 0 && mon.clickReactionText) {
      mon.clickReactionTimer--;
      drawReactionBubble(c, mon.clickReactionText, mon.x, drawY);
    }
  }
}
