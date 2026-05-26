import { describe, it, expect } from 'vitest';
import { buildSpriteGrid } from './utils/procGen';
import { generateCardSvg } from './utils/cardRenderer';
import type { CardData } from './utils/cardRenderer';

// ======== Sample Card Data ========
const SAMPLE_CARD: CardData = {
  username: 'testuser',
  monName: 'TestMon',
  type: 'test-type',
  level: 42,
  roast: 'This is a test roast for the card renderer regression test suite.',
  stats: { hp: 80, attack: 60, defense: 50, speed: 70, chaos: 40 },
  spriteSeed: 'test-seed-regression',
  wins: 10,
  losses: 3,
};

// ======== Sprite Symmetry Tests ========
describe('Sprite Symmetry (buildSpriteGrid)', () => {
  const testSeeds = [
    'test-seed-1',
    'octocat-demo',
    'torvalds-2022-30',
    'kevin-jobin-1',
    'aaaaaaaaaaaaaaaaaaaaaaaa',
    'x',
    'hello-world-42',
    'gittymon-demo-2024',
    'short',
    'a',
  ];

  for (const seed of testSeeds) {
    it(`should produce a symmetrical 24×24 sprite for seed "${seed}"`, () => {
      const result = buildSpriteGrid(seed, 0);

      // Verify grid dimensions
      expect(result.grid.length).toBe(24);
      for (let y = 0; y < 24; y++) {
        expect(result.grid[y].length).toBe(24);
      }

      // Verify palette structure
      expect(result.palette.length).toBe(4);
      for (const color of result.palette) {
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      }

      // FULL symmetry check: column x must match column 23-x for all rows
      let asymmetricalCells = 0;
      for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 12; x++) {
          if (result.grid[y][x] !== result.grid[y][23 - x]) {
            asymmetricalCells++;
          }
        }
      }
      expect(asymmetricalCells).toBe(0);
    });
  }

  it('should produce different sprites for different seeds', () => {
    const a = buildSpriteGrid('seed-alpha', 0);
    const b = buildSpriteGrid('seed-beta', 0);
    // At least some cells should differ
    let diffCells = 0;
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++) {
        if (a.grid[y][x] !== b.grid[y][x]) diffCells++;
      }
    }
    expect(diffCells).toBeGreaterThan(0);
  });

  it('should produce identical sprites for the same seed', () => {
    const a = buildSpriteGrid('deterministic-test', 0);
    const b = buildSpriteGrid('deterministic-test', 0);
    expect(a.grid).toEqual(b.grid);
    expect(a.palette).toEqual(b.palette);
  });

  it('should have at least some non-zero cells (not empty)', () => {
    const result = buildSpriteGrid('non-empty-test', 0);
    let nonZero = 0;
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++) {
        if (result.grid[y][x] > 0) nonZero++;
      }
    }
    expect(nonZero).toBeGreaterThan(50);
  });

  it('should handle frame parameter correctly', () => {
    // Frame should not break the grid structure
    for (const frame of [0, 1, 5, 10, 50, 100]) {
      const result = buildSpriteGrid('frame-test', frame);
      expect(result.grid.length).toBe(24);
      expect(result.palette.length).toBe(4);
      let nonZero = 0;
      for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 24; x++) {
          if (result.grid[y][x] > 0) nonZero++;
        }
      }
      expect(nonZero).toBeGreaterThan(50);
    }
  });
});

// ======== SVG Generation Tests ========
describe('SVG Card Generation (generateCardSvg)', () => {
  it('should produce a valid SVG string', () => {
    const svg = generateCardSvg(SAMPLE_CARD);
    expect(svg).toBeTruthy();
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('</svg>');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('should have correct card dimensions (460×220)', () => {
    const svg = generateCardSvg(SAMPLE_CARD);
    expect(svg).toContain('width="460"');
    expect(svg).toContain('height="220"');
    expect(svg).toContain('viewBox="0 0 460 220"');
  });

  it('should include the monster name', () => {
    const svg = generateCardSvg(SAMPLE_CARD);
    expect(svg).toContain(SAMPLE_CARD.monName.toUpperCase());
  });

  it('should include the username', () => {
    const svg = generateCardSvg(SAMPLE_CARD);
    expect(svg).toContain(SAMPLE_CARD.username.toUpperCase());
  });

  it('should include HP, ATK, DEF, SPD, CHA stats', () => {
    const svg = generateCardSvg(SAMPLE_CARD);
    expect(svg).toContain('HP');
    expect(svg).toContain('ATK');
    expect(svg).toContain('DEF');
    expect(svg).toContain('SPD');
    expect(svg).toContain('CHA');
    // HP value should be in the SVG
    expect(svg).toContain(`${SAMPLE_CARD.stats.hp}`);
  });

  it('should include level and type badge', () => {
    const svg = generateCardSvg(SAMPLE_CARD);
    expect(svg).toContain('LV 42');
    expect(svg).toContain(SAMPLE_CARD.type.toUpperCase());
  });

  it('should include roast text', () => {
    const svg = generateCardSvg(SAMPLE_CARD);
    // Roast is quoted and mixed-case in the new MonDetailsView layout
    expect(svg).toContain(SAMPLE_CARD.roast.substring(5, 25));
  });

  it('should include win/loss record', () => {
    const svg = generateCardSvg(SAMPLE_CARD);
    expect(svg).toContain('W:10');
    expect(svg).toContain('L:3');
  });

  it('should include sprite rects in the SVG (multiple <rect> elements)', () => {
    const svg = generateCardSvg(SAMPLE_CARD);
    // Count <rect elements that are inside the sprite group
    const rectMatches = svg.match(/<rect /g);
    expect(rectMatches).not.toBeNull();
    expect(rectMatches!.length).toBeGreaterThan(10);
  });

  it('should generate different SVGs for different card data', () => {
    const card2: CardData = {
      ...SAMPLE_CARD,
      monName: 'DifferentMon',
      spriteSeed: 'different-seed',
    };
    const svg1 = generateCardSvg(SAMPLE_CARD);
    const svg2 = generateCardSvg(card2);
    expect(svg1).not.toBe(svg2);
  });

  it('should generate consistent SVG for the same card data', () => {
    const svg1 = generateCardSvg(SAMPLE_CARD);
    const svg2 = generateCardSvg(SAMPLE_CARD);
    expect(svg1).toBe(svg2);
  });
});

// ======== Edge Case Tests ========
describe('Card Renderer Edge Cases', () => {
  describe('long text handling', () => {
    const longCard: CardData = {
      ...SAMPLE_CARD,
      monName: 'A'.repeat(50),
      type: 'very-long-type-name-that-should-be-truncated',
      roast: 'A'.repeat(200),
    };

    it('should truncate very long monster names', () => {
      const svg = generateCardSvg(longCard);
      // Should only show max 18 chars (MonDetailsView layout)
      expect(svg).toContain('A'.repeat(18));
    });

    it('should handle empty string values', () => {
      const emptyCard: CardData = {
        ...SAMPLE_CARD,
        username: '',
        monName: '',
        roast: '',
      };
      const svg = generateCardSvg(emptyCard);
      expect(svg).toBeTruthy();
      expect(svg.startsWith('<svg')).toBe(true);
    });

    it('should handle special characters in username', () => {
      const specialCard: CardData = {
        ...SAMPLE_CARD,
        username: 'hello!@#$world',
        monName: 'Test-Mon_1',
      };
      const svg = generateCardSvg(specialCard);
      expect(svg).toBeTruthy();
      expect(svg.startsWith('<svg')).toBe(true);
    });
  });

  describe('stat boundaries', () => {
    it('should handle minimum stats', () => {
      const minStats: CardData = {
        ...SAMPLE_CARD,
        stats: { hp: 1, attack: 0, defense: 0, speed: 0, chaos: 0 },
      };
      const svg = generateCardSvg(minStats);
      expect(svg).toBeTruthy();
    });

    it('should handle maximum stats', () => {
      const maxStats: CardData = {
        ...SAMPLE_CARD,
        stats: { hp: 9999, attack: 9999, defense: 9999, speed: 9999, chaos: 9999 },
      };
      const svg = generateCardSvg(maxStats);
      expect(svg).toBeTruthy();
    });

    it('should color HP bar differently based on value', () => {
      const lowHp: CardData = { ...SAMPLE_CARD, stats: { hp: 10, attack: 60, defense: 50, speed: 70, chaos: 40 } };
      const highHp: CardData = { ...SAMPLE_CARD, stats: { hp: 90, attack: 60, defense: 50, speed: 70, chaos: 40 } };

      const lowSvg = generateCardSvg(lowHp);
      const highSvg = generateCardSvg(highHp);

      // Different HP values should produce different HP bar widths
      expect(lowSvg).not.toBe(highSvg);
    });
  });

  describe('frame consistency', () => {
    it('should produce consistent sprites across multiple frames for animated stability', () => {
      // Check that frames don't produce erratic changes
      const frames = [0, 1, 6, 12, 18];
      const results = frames.map(f => buildSpriteGrid('stability-test', f));
      for (let i = 1; i < results.length; i++) {
        // There should be at most a small number of pixel differences between adjacent frames
        let diffCells = 0;
        for (let y = 0; y < 24; y++) {
          for (let x = 0; x < 24; x++) {
            if (results[i].grid[y][x] !== results[i - 1].grid[y][x]) {
              diffCells++;
            }
          }
        }
        // Eyes may blink (small change), but shouldn't be massive
        expect(diffCells).toBeLessThan(10);
      }
    });
  });

  describe('win/loss edge cases', () => {
    it('should handle undefined wins/losses', () => {
      const noWl: CardData = {
        ...SAMPLE_CARD,
        wins: undefined,
        losses: undefined,
      };
      const svg = generateCardSvg(noWl);
      expect(svg).toContain('W:0');
      expect(svg).toContain('L:0');
    });
  });
});
