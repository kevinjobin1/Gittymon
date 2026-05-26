import { describe, it, expect } from 'vitest';
import {
  spawnBackgroundParticles,
  spawnClickParticles,
  spawnTrailSpark,
  updateAndRenderParticles,
} from './particleSystem';
import type { CosmicParticle } from './types';

// Helper: create a minimal mock canvas 2D context
function createMockCtx(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    globalAlpha: 1,
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    fillText: () => {},
    font: '',
  } as unknown as CanvasRenderingContext2D;
}

// ===================================================================
//  spawnBackgroundParticles
// ===================================================================

describe('spawnBackgroundParticles', () => {
  it('should fill empty array to 55 particles (40 dots + 15 text)', () => {
    const particles = spawnBackgroundParticles([], 800, 600);
    expect(particles).toHaveLength(55);
  });

  it('should keep existing particles and only add up to the limit', () => {
    const existing: CosmicParticle[] = Array.from({ length: 30 }, (_, i) => ({
      x: 100 + i, y: 100 + i, vx: 0, vy: 0,
      size: 2, alpha: 0.5, color: '#fff',
    }));
    const particles = spawnBackgroundParticles(existing, 800, 600);
    expect(particles).toHaveLength(55);
    // First 30 should be the originals
    for (let i = 0; i < 30; i++) {
      expect(particles[i].x).toBe(100 + i);
    }
  });

  it('should not add particles when already at capacity', () => {
    const full: CosmicParticle[] = Array.from({ length: 60 }, (_, i) => ({
      x: i, y: i, vx: 0, vy: 0, size: 2, alpha: 0.5, color: '#fff',
    }));
    const particles = spawnBackgroundParticles(full, 800, 600);
    expect(particles).toHaveLength(60);
  });

  it('should place dot particles within canvas bounds', () => {
    const particles = spawnBackgroundParticles([], 800, 600);
    const dots = particles.filter(p => !p.text);
    expect(dots.length).toBeGreaterThanOrEqual(40);
    for (const p of dots) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(800);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(600);
      expect(p.size).toBeGreaterThanOrEqual(1);
      expect(p.size).toBeLessThanOrEqual(3);
      expect(p.alpha).toBeGreaterThanOrEqual(0.2);
      expect(p.alpha).toBeLessThanOrEqual(0.7);
    }
  });

  it('should assign text particles with code hints', () => {
    const particles = spawnBackgroundParticles([], 800, 600);
    const texts = particles.filter(p => p.text);
    expect(texts.length).toBeGreaterThanOrEqual(15);
    for (const p of texts) {
      expect(p.text).toBeTruthy();
      expect(typeof p.text).toBe('string');
      expect(p.text!.length).toBeGreaterThan(0);
      expect(p.size).toBeGreaterThanOrEqual(7);
      expect(p.size).toBeLessThanOrEqual(10);
      expect(p.alpha).toBeGreaterThanOrEqual(0.12);
      expect(p.alpha).toBeLessThanOrEqual(0.42);
    }
  });

  it('should assign upward velocity to all particles', () => {
    const particles = spawnBackgroundParticles([], 800, 600);
    for (const p of particles) {
      expect(p.vy).toBeLessThanOrEqual(0); // upward or neutral
    }
  });
});

// ===================================================================
//  spawnClickParticles
// ===================================================================

describe('spawnClickParticles', () => {
  it('should add 9 particles (8 burst + 1 text) to the array', () => {
    const particles: CosmicParticle[] = [];
    spawnClickParticles(particles, 200, 200);
    expect(particles).toHaveLength(9);
  });

  it('should place burst particles at click point', () => {
    const particles: CosmicParticle[] = [];
    spawnClickParticles(particles, 400, 300);
    const burst = particles.filter(p => !p.text);
    expect(burst).toHaveLength(8);
    for (const p of burst) {
      expect(p.x).toBe(400);
      expect(p.y).toBe(300);
      expect(p.size).toBeGreaterThanOrEqual(1.5);
      expect(p.size).toBeLessThanOrEqual(3.5);
      expect(p.alpha).toBe(1.0);
    }
  });

  it('should add a floating text particle above click point', () => {
    const particles: CosmicParticle[] = [];
    spawnClickParticles(particles, 300, 200);
    const textParticle = particles.find(p => p.text);
    expect(textParticle).toBeDefined();
    expect(textParticle!.x).toBe(300);
    expect(textParticle!.y).toBe(190); // clickY - 10
    expect(textParticle!.vy).toBeLessThan(0); // floats upward
    expect(textParticle!.alpha).toBe(1.0);
  });

  it('should emit burst particles in different directions', () => {
    const particles: CosmicParticle[] = [];
    spawnClickParticles(particles, 0, 0);
    const burst = particles.filter(p => !p.text);
    // At least some particles should have different velocities
    const velocities = new Set(burst.map(p => `${p.vx},${p.vy}`));
    expect(velocities.size).toBeGreaterThan(4);
  });

  it('should append to existing particles', () => {
    const existing: CosmicParticle[] = [{ x: 0, y: 0, vx: 0, vy: 0, size: 1, alpha: 1, color: '#fff' }];
    spawnClickParticles(existing, 200, 200);
    expect(existing).toHaveLength(10); // 1 existing + 9 new
  });
});

// ===================================================================
//  spawnTrailSpark
// ===================================================================

describe('spawnTrailSpark', () => {
  it('should create a single particle at the given position', () => {
    const p = spawnTrailSpark(150, 250, '#ff0000');
    expect(p.x).toBe(150);
    expect(p.y).toBe(250);
    expect(p.color).toBe('#ff0000');
    expect(p.size).toBeGreaterThanOrEqual(1);
    expect(p.size).toBeLessThanOrEqual(3);
    expect(p.alpha).toBe(0.9);
  });

  it('should have upward/random velocity', () => {
    const p = spawnTrailSpark(100, 100, '#fff');
    expect(p.vy).toBeLessThan(0); // upward
    expect(Math.abs(p.vx)).toBeLessThanOrEqual(0.8);
  });

  it('should not have text (it is a dot)', () => {
    const p = spawnTrailSpark(0, 0, '#fff');
    expect(p.text).toBeUndefined();
  });
});

// ===================================================================
//  updateAndRenderParticles
// ===================================================================

describe('updateAndRenderParticles', () => {
  it('should move particles by their velocity', () => {
    const particles: CosmicParticle[] = [
      { x: 100, y: 100, vx: 2, vy: -1, size: 2, alpha: 0.5, color: '#fff' },
    ];
    updateAndRenderParticles(createMockCtx(), particles, 800, 600);
    expect(particles[0].x).toBe(102);
    expect(particles[0].y).toBe(99);
  });

  it('should wrap dot particles that go off bottom edge', () => {
    const particles: CosmicParticle[] = [
      { x: 400, y: -40, vx: 0, vy: 0, size: 2, alpha: 0.5, color: '#fff' },
    ];
    updateAndRenderParticles(createMockCtx(), particles, 800, 600);
    // y < -30 → wrapped to bottom
    expect(particles[0].y).toBe(610);
    expect(particles[0].x).toBeGreaterThanOrEqual(0);
  });

  it('should wrap dot particles that go off left edge', () => {
    const particles: CosmicParticle[] = [
      { x: -150, y: 300, vx: 0, vy: 0, size: 2, alpha: 0.5, color: '#fff' },
    ];
    updateAndRenderParticles(createMockCtx(), particles, 800, 600);
    expect(particles[0].x).toBe(900); // canvasW + 100
  });

  it('should wrap dot particles that go off right edge', () => {
    const particles: CosmicParticle[] = [
      { x: 950, y: 300, vx: 0, vy: 0, size: 2, alpha: 0.5, color: '#fff' },
    ];
    updateAndRenderParticles(createMockCtx(), particles, 800, 600);
    expect(particles[0].x).toBe(-100);
  });

  it('should NOT remove dot particles (only text particles can be removed)', () => {
    const particles: CosmicParticle[] = [
      { x: -150, y: 300, vx: 0, vy: 0, size: 2, alpha: 0.5, color: '#fff' }, // off left
      { x: 950, y: 300, vx: 0, vy: 0, size: 2, alpha: 0.5, color: '#fff' }, // off right
    ];
    updateAndRenderParticles(createMockCtx(), particles, 800, 600);
    expect(particles).toHaveLength(2);
  });

  it('should fade text particles and remove them when alpha hits 0', () => {
    const particles: CosmicParticle[] = [
      { x: 100, y: 100, vx: 0, vy: 0, size: 8, alpha: 0.02, color: '#fff', text: 'git push' },
    ];
    updateAndRenderParticles(createMockCtx(), particles, 800, 600);
    // alpha 0.02 - 0.01 = 0.01, still > 0
    expect(particles[0].alpha).toBeCloseTo(0.01);
    expect(particles).toHaveLength(1);

    // One more frame removes it
    updateAndRenderParticles(createMockCtx(), particles, 800, 600);
    expect(particles).toHaveLength(0);
  });

  it('should keep text particle if alpha is positive', () => {
    const particles: CosmicParticle[] = [
      { x: 100, y: 100, vx: 0, vy: 0, size: 8, alpha: 0.5, color: '#fff', text: 'git merge' },
    ];
    updateAndRenderParticles(createMockCtx(), particles, 800, 600);
    expect(particles).toHaveLength(1);
    expect(particles[0].alpha).toBeCloseTo(0.49);
  });

  it('should not remove non-text particles when they go off screen (they wrap)', () => {
    const particles: CosmicParticle[] = [
      { x: -200, y: 300, vx: 0, vy: 0, size: 2, alpha: 0.5, color: '#fff' },
    ];
    updateAndRenderParticles(createMockCtx(), particles, 800, 600);
    expect(particles).toHaveLength(1);
  });
});
