import type { CosmicParticle } from './types';

/* ------------------------------------------------------------------ */
/*  Spawning helpers                                                   */
/* ------------------------------------------------------------------ */

const DOT_COLORS = [
  'rgba(123, 164, 181, 0.35)',
  'rgba(201, 130, 134, 0.35)',
];

const GIT_HINTS = [
  'git commit -m "fix bug"', 'git push origin main',
  'git checkout -b feature', 'git merge upstream',
  'git rebase', 'git clone', 'npm run dev',
  '<div className="Gittymon">', 'await fetch("/api/summon")',
  'const root = createRoot()', 'import React from "react"',
  'git init', 'git diff', '{ monState: "ROAMING" }',
  '() => summon()', 'export default App',
  'docker-compose up', 'eslint --fix',
];

const CLICK_COLORS = ['#7ba4b5', '#c98286', '#8ca376', '#dbbc7f', '#9e8fa3'];
const CLICK_OUTPUTS = [
  '+1 COMMIT', 'PULL REQUEST APPLIED', 'BUG SQUASHED!',
  'MERGED TO MAIN', 'GIT UPDATE SUCCESS', 'CLEAN DEPLOYED',
  'CHANCE OF BUG: 0%', 'RE-BUILT ok', 'GIT PUSH COMPLETE',
];

/** Fill particles up to a baseline count with background dots + text hints */
export function spawnBackgroundParticles(
  particles: CosmicParticle[],
  width: number,
  height: number,
) {
  const list = [...particles];
  // Dot particles up to 40
  while (list.length < 40) {
    list.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -0.1 - Math.random() * 0.3,
      size: 1 + Math.random() * 2,
      alpha: 0.2 + Math.random() * 0.5,
      color: DOT_COLORS[Math.floor(Math.random() * DOT_COLORS.length)],
    });
  }
  // Text particles up to 55
  while (list.length < 55) {
    list.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.1,
      vy: -0.05 - Math.random() * 0.15,
      size: 7 + Math.random() * 3,
      alpha: 0.12 + Math.random() * 0.3,
      text: GIT_HINTS[Math.floor(Math.random() * GIT_HINTS.length)],
      color: Math.random() > 0.5 ? '#7ba4b5' : '#cbd5e1',
    });
  }
  return list;
}

/** Spawn 8 burst particles + 1 floating text at a click point */
export function spawnClickParticles(
  particles: CosmicParticle[],
  clickX: number,
  clickY: number,
) {
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8 + (Math.random() * 0.4 - 0.2);
    const speed = 1.5 + Math.random() * 2.5;
    particles.push({
      x: clickX, y: clickY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 1.5 + Math.random() * 2,
      alpha: 1.0,
      color: CLICK_COLORS[i % CLICK_COLORS.length],
    });
  }
  particles.push({
    x: clickX, y: clickY - 10,
    vx: (Math.random() - 0.5) * 0.4,
    vy: -1.0 - Math.random() * 0.6,
    size: 9 + Math.random() * 3,
    alpha: 1.0,
    text: CLICK_OUTPUTS[Math.floor(Math.random() * CLICK_OUTPUTS.length)],
    color: '#a3e635',
  });
}

/** Spawn a trail spark from a panicking monster */
export function spawnTrailSpark(
  x: number,
  y: number,
  color: string,
): CosmicParticle {
  return {
    x, y,
    vx: (Math.random() - 0.5) * 0.8,
    vy: -0.4 - Math.random() * 0.6,
    size: 1 + Math.random() * 2,
    alpha: 0.9,
    color,
  };
}

/* ------------------------------------------------------------------ */
/*  Update + render all particles                                      */
/* ------------------------------------------------------------------ */

/** Move all particles, remove dead ones, draw them onto the canvas */
export function updateAndRenderParticles(
  ctx: CanvasRenderingContext2D,
  particles: CosmicParticle[],
  canvasW: number,
  canvasH: number,
) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;

    if (!p.text) {
      // Dot — wrap around edges
      if (p.y < -30) { p.y = canvasH + 10; p.x = Math.random() * canvasW; }
      if (p.x < -100) p.x = canvasW + 100;
      if (p.x > canvasW + 100) p.x = -100;

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Text — fade and remove
      p.alpha -= 0.01;
      if (p.alpha <= 0) { particles.splice(i, 1); continue; }

      ctx.font = `bold ${p.size}px "JetBrains Mono", monospace`;
      // Outline
      ctx.fillStyle = '#0a0d16';
      ctx.fillText(p.text, p.x + 1, p.y + 1);
      // Fill
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fillText(p.text, p.x, p.y);
      ctx.globalAlpha = 1.0;
    }
  }
}
