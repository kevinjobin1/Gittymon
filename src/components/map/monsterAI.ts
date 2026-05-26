import type { Gittymon } from './types';
import type { MonType } from './types';

/* ------------------------------------------------------------------ */
/*  Spawning                                                           */
/* ------------------------------------------------------------------ */

const MONSTER_TYPES: MonType[] = ['trex', 'slime', 'octo', 'bat'];
const MONSTER_COLORS = ['#7ba4b5', '#c98286', '#8ca376', '#e8ece9', '#dbbc7f', '#9e8fa3'];

/** Create the initial batch of 14 roaming monsters */
export function spawnInitialMonsters(width: number, height: number): Gittymon[] {
  const list: Gittymon[] = [];
  for (let i = 0; i < 14; i++) {
    const startX = Math.random() * width;
    const startY = Math.random() * height;
    list.push({
      id: i,
      x: startX,
      y: startY,
      targetX: startX,
      targetY: startY,
      type: MONSTER_TYPES[i % MONSTER_TYPES.length],
      state: Math.random() > 0.4 ? 'walking' : 'idle',
      color: MONSTER_COLORS[i % MONSTER_COLORS.length],
      speed: 0.35 + Math.random() * 0.4,
      frameTimer: 0,
      frame: 0,
      idleTimer: Math.random() * 120,
      lastDir: Math.random() > 0.5 ? 'L' : 'R',
      jumpY: 0,
      jumpVelocity: 0,
      panicTimer: 0,
      clickReactionTimer: 0,
    });
  }
  return list;
}

/* ------------------------------------------------------------------ */
/*  AI update — called every animation frame                           */
/* ------------------------------------------------------------------ */

/** Runs one frame of AI logic for all monsters. Mutates mon objects in place. */
export function updateMonsters(monsters: Gittymon[], canvasW: number, canvasH: number) {
  const devCenterX = canvasW / 2;
  const devCenterY = canvasH / 2;

  for (let i = 0; i < monsters.length; i++) {
    const mon = monsters[i];

    // Animation frame tick
    mon.frameTimer++;
    if (mon.frameTimer > 18) {
      mon.frame = mon.frame === 0 ? 1 : 0;
      mon.frameTimer = 0;
    }

    // Gravity / jump physics
    mon.jumpY += mon.jumpVelocity;
    mon.jumpVelocity += 0.45;
    if (mon.jumpY >= 0) {
      mon.jumpY = 0;
      mon.jumpVelocity = 0;
    }

    if (mon.state === 'panic') {
      updatePanic(mon, canvasW, canvasH);
    } else if (mon.state === 'idle') {
      updateIdle(mon, canvasW, canvasH, devCenterX, devCenterY);
    } else {
      updateWalking(mon);
    }

    // Clamp to canvas
    mon.x = Math.max(10, Math.min(canvasW - 40, mon.x));
    mon.y = Math.max(10, Math.min(canvasH - 45, mon.y));
  }
}

function updatePanic(mon: Gittymon, _canvasW: number, _canvasH: number) {
  mon.panicTimer--;
  const dx = mon.targetX - mon.x;
  const dy = mon.targetY - mon.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 5) {
    mon.x += (dx / dist) * mon.speed;
    mon.y += (dy / dist) * mon.speed;
    mon.lastDir = dx > 0 ? 'R' : 'L';
  }
  // Random hop while panicked
  if (mon.jumpY === 0 && Math.random() < 0.15) {
    mon.jumpVelocity = -4 - Math.random() * 3;
  }
  if (mon.panicTimer <= 0) {
    mon.state = 'idle';
    mon.speed = 0.35 + Math.random() * 0.4;
    mon.idleTimer = 60 + Math.random() * 100;
  }
}

function updateIdle(mon: Gittymon, canvasW: number, canvasH: number, cx: number, cy: number) {
  mon.idleTimer--;
  if (mon.idleTimer <= 0) {
    mon.state = 'walking';
    mon.targetX = Math.random() * canvasW;
    mon.targetY = Math.random() * canvasH;
    // Avoid console center area
    if (Math.abs(mon.targetX - cx) < 220 && Math.abs(mon.targetY - cy) < 330) {
      mon.targetX += mon.targetX < cx ? -190 : 190;
    }
  }
}

function updateWalking(mon: Gittymon) {
  const dx = mon.targetX - mon.x;
  const dy = mon.targetY - mon.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 5) {
    mon.state = 'idle';
    mon.idleTimer = 40 + Math.random() * 120;
  } else {
    mon.x += (dx / dist) * mon.speed;
    mon.y += (dy / dist) * mon.speed;
    mon.lastDir = dx > 0 ? 'R' : 'L';
  }
}

/* ------------------------------------------------------------------ */
/*  Mouse interaction                                                  */
/* ------------------------------------------------------------------ */

/** Scatter monsters within a radius from a click point (mutates in place) */
export function scatterMonstersFromClick(
  monsters: Gittymon[],
  clickX: number,
  clickY: number,
  radius: number,
) {
  const reactPhrases = [
    'YEET!', 'OOF!', 'GIT DETECTED', 'COMMIT!',
    'CODE REFACTOR!', 'MERGING OUT!', 'BUG SHIELD!', 'BZZZ!',
  ];

  for (let i = 0; i < monsters.length; i++) {
    const mon = monsters[i];
    const dx = mon.x - clickX;
    const dy = mon.y - clickY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < radius) {
      mon.state = 'panic';
      mon.panicTimer = 180;
      const scaleDir = dist === 0 ? 1 : dist;
      mon.targetX = mon.x + (dx / scaleDir) * 200 + (Math.random() - 0.5) * 80;
      mon.targetY = mon.y + (dy / scaleDir) * 200 + (Math.random() - 0.5) * 80;
      mon.speed = 1.8 + Math.random() * 1.5;
      mon.jumpVelocity = -7 - Math.random() * 5;
      mon.clickReactionText = reactPhrases[Math.floor(Math.random() * reactPhrases.length)];
      mon.clickReactionTimer = 90;
    }
  }
}
