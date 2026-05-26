import { describe, it, expect } from 'vitest';
import { getMonsterDisplay, drawSprite } from './spriteRenderer';

// ===================================================================
//  getMonsterDisplay
// ===================================================================

describe('getMonsterDisplay', () => {
  it('should return a sprite array for trex frame 0', () => {
    const result = getMonsterDisplay('trex', 0);
    expect(result.sprite).toBeDefined();
    expect(Array.isArray(result.sprite)).toBe(true);
    expect(result.sprite.length).toBeGreaterThan(0);
    expect(typeof result.sprite[0]).toBe('string');
    expect(result.scale).toBeCloseTo(2.2);
  });

  it('should return a sprite array for trex frame 1', () => {
    const result = getMonsterDisplay('trex', 1);
    expect(result.sprite).toBeDefined();
    expect(result.sprite.length).toBeGreaterThan(0);
  });

  it('should return different sprites for frame 0 vs frame 1', () => {
    const f0 = getMonsterDisplay('trex', 0);
    const f1 = getMonsterDisplay('trex', 1);
    // The two frames should differ in at least one row
    const differs = f0.sprite.some((row, i) => row !== f1.sprite[i]);
    expect(differs).toBe(true);
  });

  it('should provide correct scale for each monster type', () => {
    const scales: Record<string, number> = {
      trex: 2.2,
      slime: 2.4,
      octo: 2.3,
      bat: 2.2,
    };

    for (const [type, expectedScale] of Object.entries(scales)) {
      const result = getMonsterDisplay(type as 'trex' | 'slime' | 'octo' | 'bat', 0);
      expect(result.scale).toBeCloseTo(expectedScale);
    }
  });

  it('should return valid sprite strings for all types', () => {
    const types = ['trex', 'slime', 'octo', 'bat'] as const;
    for (const type of types) {
      for (const frame of [0, 1]) {
        const result = getMonsterDisplay(type, frame);
        for (const row of result.sprite) {
          // Every character should be valid: space, X, O, A, S, P, E
          for (const char of row) {
            expect([' ', 'X', 'O', 'A', 'S', 'P', 'E']).toContain(char);
          }
        }
      }
    }
  });

  it('should have non-empty sprites for all types', () => {
    const types = ['trex', 'slime', 'octo', 'bat'] as const;
    for (const type of types) {
      const result = getMonsterDisplay(type, 0);
      for (const row of result.sprite) {
        // Each row should have at least one non-space character
        expect(row.trim()).not.toBe('');
      }
    }
  });
});

// ===================================================================
//  drawSprite — character mapping validation
// ===================================================================

describe('drawSprite character mapping', () => {
  it('should handle all valid sprite characters without throwing', () => {
    // Create a minimal sprite with all valid chars
    const sprite = ['XOA SPE'];
    const ctx = {
      fillStyle: '',
      fillRect: () => {},
    } as unknown as CanvasRenderingContext2D;

    expect(() => drawSprite(ctx, sprite, 0, 0, 2, '#ff0000', false)).not.toThrow();
  });

  it('should handle empty/spaces-only sprites without throwing', () => {
    const sprite = ['         '];
    const ctx = {
      fillStyle: '',
      fillRect: () => {},
    } as unknown as CanvasRenderingContext2D;

    expect(() => drawSprite(ctx, sprite, 0, 0, 2, '#ff0000', false)).not.toThrow();
  });

  it('should handle single-character sprite without throwing', () => {
    const sprite = ['X'];
    const ctx = {
      fillStyle: '',
      fillRect: () => {},
    } as unknown as CanvasRenderingContext2D;

    expect(() => drawSprite(ctx, sprite, 0, 0, 2, '#ff0000', true)).not.toThrow();
  });

  it('should handle facing left vs right (no throw)', () => {
    const sprite = ['X', 'O', 'A', 'S', 'P', 'E'];
    const ctx = {
      fillStyle: '',
      fillRect: () => {},
    } as unknown as CanvasRenderingContext2D;

    expect(() => drawSprite(ctx, sprite, 10, 20, 2, '#00ff00', true)).not.toThrow();
    expect(() => drawSprite(ctx, sprite, 10, 20, 2, '#00ff00', false)).not.toThrow();
  });
});
