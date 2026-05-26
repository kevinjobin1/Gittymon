import { describe, it, expect, vi } from 'vitest';
import { spawnInitialMonsters, updateMonsters, scatterMonstersFromClick } from './monsterAI';
import type { Gittymon } from './types';

// Helper: create a known monster for deterministic tests
function createKnownMon(overrides: Partial<Gittymon> = {}): Gittymon {
  return {
    id: 0,
    x: 200,
    y: 200,
    targetX: 200,
    targetY: 200,
    type: 'trex',
    state: 'idle',
    color: '#7ba4b5',
    speed: 1,
    frameTimer: 0,
    frame: 0,
    idleTimer: 0,
    lastDir: 'R',
    jumpY: 0,
    jumpVelocity: 0,
    panicTimer: 0,
    clickReactionTimer: 0,
    ...overrides,
  };
}

// ===================================================================
//  spawnInitialMonsters
// ===================================================================

describe('spawnInitialMonsters', () => {
  it('should spawn exactly 14 monsters', () => {
    const monsters = spawnInitialMonsters(800, 600);
    expect(monsters).toHaveLength(14);
  });

  it('should place monsters within canvas bounds', () => {
    const w = 800, h = 600;
    const monsters = spawnInitialMonsters(w, h);
    for (const mon of monsters) {
      expect(mon.x).toBeGreaterThanOrEqual(0);
      expect(mon.x).toBeLessThanOrEqual(w);
      expect(mon.y).toBeGreaterThanOrEqual(0);
      expect(mon.y).toBeLessThanOrEqual(h);
    }
  });

  it('should assign all required fields to every monster', () => {
    const monsters = spawnInitialMonsters(800, 600);
    for (const mon of monsters) {
      expect(mon).toHaveProperty('id');
      expect(mon).toHaveProperty('x');
      expect(mon).toHaveProperty('y');
      expect(mon).toHaveProperty('targetX');
      expect(mon).toHaveProperty('targetY');
      expect(mon).toHaveProperty('type');
      expect(mon).toHaveProperty('state');
      expect(['walking', 'idle']).toContain(mon.state);
      expect(mon).toHaveProperty('color');
      expect(mon).toHaveProperty('speed');
      expect(mon.speed).toBeGreaterThanOrEqual(0.35);
      expect(mon.speed).toBeLessThanOrEqual(0.75);
      expect(mon).toHaveProperty('frameTimer');
      expect(mon).toHaveProperty('frame');
      expect(mon).toHaveProperty('idleTimer');
      expect(mon).toHaveProperty('lastDir');
      expect(['L', 'R']).toContain(mon.lastDir);
      expect(mon).toHaveProperty('jumpY');
      expect(mon).toHaveProperty('jumpVelocity');
      expect(mon).toHaveProperty('panicTimer');
      expect(mon).toHaveProperty('clickReactionTimer');
      expect(mon.clickReactionTimer).toBe(0);
    }
  });

  it('should distribute monster types across trex, slime, octo, bat', () => {
    const monsters = spawnInitialMonsters(800, 600);
    const types = new Set(monsters.map(m => m.type));
    expect(types.has('trex')).toBe(true);
    expect(types.has('slime')).toBe(true);
    expect(types.has('octo')).toBe(true);
    expect(types.has('bat')).toBe(true);
  });

  it('should assign unique IDs', () => {
    const monsters = spawnInitialMonsters(800, 600);
    const ids = monsters.map(m => m.id);
    expect(new Set(ids).size).toBe(14);
  });
});

// ===================================================================
//  updateMonsters — state transitions
// ===================================================================

describe('updateMonsters', () => {
  it('should advance frame timer and toggle frame', () => {
    const mon = createKnownMon({ frameTimer: 18, frame: 0 });
    updateMonsters([mon], 800, 600);
    // frameTimer (18)++ = 19 > 18 → triggers toggle: frameTimer→0, frame flips
    expect(mon.frameTimer).toBeLessThanOrEqual(0);
    expect(mon.frame).toBe(1);
  });

  it('should NOT toggle frame before timer threshold', () => {
    const mon = createKnownMon({ frameTimer: 5, frame: 0 });
    updateMonsters([mon], 800, 600);
    expect(mon.frameTimer).toBe(6);
    expect(mon.frame).toBe(0);
  });

  it('should apply gravity to jump physics', () => {
    const mon = createKnownMon({ jumpY: -10, jumpVelocity: -2 });
    updateMonsters([mon], 800, 600);
    // Code applies jumpY += jumpVelocity FIRST: -10 + (-2) = -12
    // THEN jumpVelocity += 0.45: -2 + 0.45 = -1.55
    expect(mon.jumpY).toBeCloseTo(-12);
    expect(mon.jumpVelocity).toBeCloseTo(-1.55);
  });

  it('should clamp jumpY to 0 and reset velocity on ground', () => {
    const mon = createKnownMon({ jumpY: -3, jumpVelocity: 4 });
    updateMonsters([mon], 800, 600);
    // jumpY: -3 + 4 = 1 → clamped to 0
    expect(mon.jumpY).toBe(0);
    expect(mon.jumpVelocity).toBe(0);
  });

  it('should transition idle→walking when idleTimer expires', () => {
    const mon = createKnownMon({ state: 'idle', idleTimer: 0 });
    updateMonsters([mon], 800, 600);
    expect(mon.state).toBe('walking');
    // Should have set a target away from center
    expect(mon.targetX).toBeDefined();
    expect(mon.targetY).toBeDefined();
  });

  it('should stay idle when idleTimer is positive', () => {
    const mon = createKnownMon({ state: 'idle', idleTimer: 50 });
    updateMonsters([mon], 800, 600);
    expect(mon.state).toBe('idle');
    expect(mon.idleTimer).toBe(49);
  });

  it('should move walking monster toward target', () => {
    const mon = createKnownMon({
      state: 'walking',
      x: 100, y: 100,
      targetX: 200, targetY: 100,
      speed: 1,
    });
    updateMonsters([mon], 800, 600);
    expect(mon.x).toBeGreaterThan(100); // moved right
    expect(mon.y).toBe(100); // no vertical movement
    expect(mon.lastDir).toBe('R');
  });

  it('should transition walking→idle when close to target', () => {
    const mon = createKnownMon({
      state: 'walking',
      x: 100, y: 100,
      targetX: 102, targetY: 100, // dist = 2 < 5
    });
    updateMonsters([mon], 800, 600);
    expect(mon.state).toBe('idle');
    expect(mon.idleTimer).toBeGreaterThan(0);
  });

  it('should update lastDir based on direction', () => {
    const mon = createKnownMon({
      state: 'walking',
      x: 200, y: 100,
      targetX: 100, targetY: 100,
    });
    updateMonsters([mon], 800, 600);
    expect(mon.lastDir).toBe('L');
  });

  it('should clamp monsters to canvas bounds', () => {
    const mon = createKnownMon({ x: -50, y: -50 });
    updateMonsters([mon], 800, 600);
    expect(mon.x).toBeGreaterThanOrEqual(10);
    expect(mon.y).toBeGreaterThanOrEqual(10);

    const mon2 = createKnownMon({ x: 5000, y: 5000 });
    updateMonsters([mon2], 800, 600);
    expect(mon2.x).toBeLessThanOrEqual(800 - 40);
    expect(mon2.y).toBeLessThanOrEqual(600 - 45);
  });

  it('should update panic state movement and timer', () => {
    const mon = createKnownMon({
      state: 'panic',
      panicTimer: 100,
      x: 100, y: 100,
      targetX: 300, targetY: 100,
      speed: 2,
    });
    updateMonsters([mon], 800, 600);
    // Moved toward target
    expect(mon.x).toBeGreaterThan(100);
    // Panic timer decreased
    expect(mon.panicTimer).toBe(99);
  });

  it('should transition panic→idle when panicTimer expires', () => {
    const mon = createKnownMon({
      state: 'panic',
      panicTimer: 1,
      x: 300, y: 300,
      targetX: 301, targetY: 300, // close enough to target
    });
    updateMonsters([mon], 800, 600);
    expect(mon.state).toBe('idle');
    expect(mon.idleTimer).toBeGreaterThan(0);
  });

  it('should set facing direction correctly in panic state', () => {
    const mon = createKnownMon({
      state: 'panic',
      x: 300, y: 100,
      targetX: 100, targetY: 100,
      lastDir: 'R',
    });
    updateMonsters([mon], 800, 600);
    expect(mon.lastDir).toBe('L');
  });
});

// ===================================================================
//  scatterMonstersFromClick
// ===================================================================

describe('scatterMonstersFromClick', () => {
  it('should set nearby monsters to panic state', () => {
    const mon = createKnownMon({ x: 200, y: 200, state: 'idle' });
    scatterMonstersFromClick([mon], 200, 200, 100);
    expect(mon.state).toBe('panic');
    expect(mon.panicTimer).toBe(180);
  });

  it('should NOT affect monsters outside radius', () => {
    const mon = createKnownMon({ x: 500, y: 500, state: 'idle' });
    scatterMonstersFromClick([mon], 200, 200, 50);
    expect(mon.state).toBe('idle');
  });

  it('should set reaction text and timer on affected monsters', () => {
    const mon = createKnownMon({ x: 200, y: 200, state: 'idle' });
    scatterMonstersFromClick([mon], 200, 200, 100);
    expect(mon.clickReactionText).toBeDefined();
    expect(mon.clickReactionTimer).toBe(90);
  });

  it('should set monster speed to panic speed (1.8 - 3.3)', () => {
    const mon = createKnownMon({ x: 200, y: 200, state: 'idle' });
    scatterMonstersFromClick([mon], 200, 200, 100);
    expect(mon.speed).toBeGreaterThanOrEqual(1.8);
    expect(mon.speed).toBeLessThanOrEqual(3.3);
  });

  it('should set a jump velocity for affected monsters', () => {
    const mon = createKnownMon({ x: 200, y: 200, state: 'idle' });
    scatterMonstersFromClick([mon], 200, 200, 100);
    expect(mon.jumpVelocity).toBeLessThan(0); // negative = upward
  });

  it('should push monsters away from click point', () => {
    // Monster is to the right of click point
    const mon = createKnownMon({ x: 250, y: 200, state: 'idle' });
    scatterMonstersFromClick([mon], 200, 200, 100);
    // targetX should be > 250 (pushed further right)
    expect(mon.targetX).toBeGreaterThan(250);
    // targetY should be around 200 (same y)
  });

  it('should handle click at exact monster position (dist=0)', () => {
    const mon = createKnownMon({ x: 200, y: 200, state: 'idle' });
    expect(() => scatterMonstersFromClick([mon], 200, 200, 100)).not.toThrow();
    expect(mon.state).toBe('panic');
  });

  it('should scatter multiple monsters in radius', () => {
    const monsters = [
      createKnownMon({ id: 0, x: 190, y: 190 }),
      createKnownMon({ id: 1, x: 210, y: 210 }),
      createKnownMon({ id: 2, x: 500, y: 500 }), // outside radius
    ];
    scatterMonstersFromClick(monsters, 200, 200, 100);
    expect(monsters[0].state).toBe('panic');
    expect(monsters[1].state).toBe('panic');
    expect(monsters[2].state).toBe('idle');
  });

  it('should set realistic reaction phrases', () => {
    const phrases = ['YEET!', 'OOF!', 'GIT DETECTED', 'COMMIT!',
      'CODE REFACTOR!', 'MERGING OUT!', 'BUG SHIELD!', 'BZZZ!'];
    const mon = createKnownMon({ x: 200, y: 200, state: 'idle' });
    scatterMonstersFromClick([mon], 200, 200, 100);
    expect(phrases).toContain(mon.clickReactionText);
  });
});
