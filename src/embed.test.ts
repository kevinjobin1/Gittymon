import { describe, it, expect } from 'vitest';
import { generateGifCard, generateSvgCard } from '../server/embed';

describe('SVG Card Generation', () => {
  it('should generate a non-empty SVG string', () => {
    const svg = generateSvgCard('testuser');
    expect(svg).toBeTruthy();
    expect(svg.length).toBeGreaterThan(0);
  });

  it('should have a valid SVG element structure', () => {
    const svg = generateSvgCard('testuser');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('</svg>');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('should have correct dimensions 460x220', () => {
    const svg = generateSvgCard('testuser');
    expect(svg).toContain('width="460"');
    expect(svg).toContain('height="220"');
    expect(svg).toContain('viewBox="0 0 460 220"');
  });

  it('should include the username in the output', () => {
    const svg = generateSvgCard('alice42');
    expect(svg).toContain('ALICE42');
  });

  it('should include a monName from the names array', () => {
    const svg = generateSvgCard('testuser');
    const knownNames = ['NodeSlime', 'Forkachu', 'AsyncPod', 'CommitoBat', 'Dockergon', 'GitSlasher', 'JSON_Golem', 'BugMander'];
    const found = knownNames.some(name => svg.includes(name.toUpperCase()));
    expect(found).toBe(true);
  });

  it('should include all five stat values (HP, ATK, DEF, SPD, CHS)', () => {
    const svg = generateSvgCard('testuser');
    expect(svg).toContain('HEALTH LOOP');
    expect(svg).toContain('BUG SUMMONS');
    expect(svg).toContain('CODE SHIELD');
    expect(svg).toContain('CYCLE SPEED');
    expect(svg).toContain('CHAOS FLOW');
  });

  it('should include stat percentage values', () => {
    const svg = generateSvgCard('testuser');
    // Target only text-element percentages (stat values), not gradient stops or opacity
    const statPercentMatches = svg.match(/>\d+%<\/text>/g);
    expect(statPercentMatches).not.toBeNull();
    expect(statPercentMatches!.length).toBe(5);
    // All stats are between 25-99
    statPercentMatches!.forEach(m => {
      const val = parseInt(m.replace(/[^0-9]/g, ''), 10);
      expect(val).toBeGreaterThanOrEqual(25);
      expect(val).toBeLessThanOrEqual(99);
    });
  });

  it('should include a type badge', () => {
    const svg = generateSvgCard('testuser');
    const knownTypes = ['DIRECT-TO-MASTER', 'ANYSCRIPT-TYPE', 'STACKOVERFLOW CLONER', 'MERGE-FEARFUL', 'COFFEE-FUELED', 'INFINITE-LOOP'];
    const found = knownTypes.some(t => svg.includes(t));
    expect(found).toBe(true);
  });

  it('should include the user level', () => {
    const svg = generateSvgCard('testuser');
    expect(svg).toContain('LV');
    // Level should be a number
    const levelMatch = svg.match(/LV (\d+)/);
    expect(levelMatch).not.toBeNull();
    expect(Number(levelMatch![1])).toBeGreaterThanOrEqual(1);
    expect(Number(levelMatch![1])).toBeLessThanOrEqual(99);
  });

  it('should include a roast line', () => {
    const svg = generateSvgCard('testuser');
    const knownRoasts = [
      'ONLY USES BRUTE FORCE PUSH -M',
      'BIO IS STANDARD DEFAULT TEMPLATE',
      'HAS ZERO COMMENTS, USES VAR INSTEAD OF LET',
      'SPENDS 5 HOURS STYLING TINY RETRO BUTTONS',
      'YOUR COMMIT MESSAGES ARE SINGLE LETTERS',
      'WRITES CODE LIKE ITS A TYPING TEST',
      'YOUR PR DESCRIPTIONS ARE THREE WORDS MAX',
      'USES NESTED TERNARIES LIKE RUSSIAN NESTING DOLLS',
    ];
    const found = knownRoasts.some(r => svg.includes(r));
    expect(found).toBe(true);
  });

  it('should generate different SVGs for different usernames', () => {
    const svg1 = generateSvgCard('alice');
    const svg2 = generateSvgCard('bob');
    expect(svg1).not.toBe(svg2);
  });

  it('should generate consistent output for the same username', () => {
    const svg1 = generateSvgCard('consistent-user');
    const svg2 = generateSvgCard('consistent-user');
    expect(svg1).toBe(svg2);
  });

  it('should include win/loss counters', () => {
    const svg = generateSvgCard('testuser');
    expect(svg).toContain('W</text>');
    expect(svg).toContain('L</text>');
  });

  it('should include CSS animation styles', () => {
    const svg = generateSvgCard('testuser');
    expect(svg).toContain('<style>');
    expect(svg).toContain('spriteBob');
    expect(svg).toContain('ledPulse');
    expect(svg).toContain('hpPulse');
  });

  it('should include the @ symbol before the username', () => {
    const svg = generateSvgCard('dev123');
    expect(svg).toContain('@</text>');
    expect(svg).toContain('DEV123');
  });

  describe('SVG edge cases', () => {
    it('should handle empty username gracefully', () => {
      const svg = generateSvgCard('');
      expect(svg).toBeTruthy();
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain('</svg>');
      // Should use fallback 'x'
      expect(svg).toContain('@</text>');
    });

    it('should handle whitespace-only username', () => {
      const svg = generateSvgCard('   ');
      expect(svg).toBeTruthy();
      expect(svg.startsWith('<svg')).toBe(true);
    });

    it('should trim surrounding whitespace', () => {
      const trimmed = generateSvgCard('  testuser  ');
      const unTrimmed = generateSvgCard('testuser');
      expect(trimmed).toBe(unTrimmed);
    });

    it('should sanitize special characters from username', () => {
      const svg = generateSvgCard('hello!@#$world');
      expect(svg).toBe(generateSvgCard('helloworld'));
    });

    it('should handle username with only special characters (becomes x)', () => {
      const svg = generateSvgCard('!@#$%^&*');
      expect(svg).toBeTruthy();
      expect(svg.startsWith('<svg')).toBe(true);
      // Should match the 'x' fallback
      expect(svg).toBe(generateSvgCard(''));
    });

    it('should handle unknown user (no leaderboard match) gracefully', () => {
      const svg = generateSvgCard('nonexistent-user-xyz');
      expect(svg).toBeTruthy();
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain('LV');
      expect(svg).toContain('NONEXISTENT-USER-XYZ');
    });

    it('should handle very long username', () => {
      const longUsername = 'a'.repeat(100);
      const svg = generateSvgCard(longUsername);
      expect(svg).toBeTruthy();
      expect(svg.startsWith('<svg')).toBe(true);
      // Should be truncated somewhere in the SVG
      expect(svg).toContain('AAAAAAAAAA');
    });

    it('should handle username with hyphens', () => {
      const svg = generateSvgCard('kevin-jobin-1');
      expect(svg).toBeTruthy();
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain('KEVIN-JOBIN-1');
    });
  });
});

describe('GIF Card Generation', () => {
  it('should generate a GIF with non-zero bytes', () => {
    const gif = generateGifCard('testuser');
    expect(gif.length).toBeGreaterThan(0);
  });

  it('should generate a GIF with valid GIF89a header', () => {
    const gif = generateGifCard('testuser');
    const header = gif.subarray(0, 6).toString('ascii');
    expect(header).toBe('GIF89a');
  });

  it('should generate different GIFs for different usernames', () => {
    const gif1 = generateGifCard('alice');
    const gif2 = generateGifCard('bob');
    // Different usernames should produce different outputs
    const sameLength = gif1.length === gif2.length;
    const sameContent = sameLength && gif1.every((byte, i) => byte === gif2[i]);
    expect(sameContent).toBe(false);
  });

  it('should contain non-zero color data (not all zeros)', () => {
    const gif = generateGifCard('testuser');
    // Count zero bytes — should not be 100% zero (would mean all black/invalid)
    const zeroCount = gif.reduce((count, byte) => count + (byte === 0 ? 1 : 0), 0);
    // At least some non-zero bytes must exist (palette + pixel data)
    expect(zeroCount).toBeLessThan(gif.length);
    // The ratio of zeros should be reasonable — if >99% are zero, something is wrong
    expect(zeroCount).toBeLessThan(gif.length * 0.99);
  });

  it('should generate consistent output for the same username', () => {
    const gif1 = generateGifCard('consistent-user');
    const gif2 = generateGifCard('consistent-user');
    expect(gif1.length).toBe(gif2.length);
    expect(gif1.every((byte, i) => byte === gif2[i])).toBe(true);
  });

  // ========== Edge Cases ==========

  describe('edge cases', () => {
    it('should handle empty username gracefully', () => {
      const gif = generateGifCard('');
      // Should still produce a valid GIF with defaults
      expect(gif.length).toBeGreaterThan(0);
      expect(gif.subarray(0, 6).toString('ascii')).toBe('GIF89a');
    });

    it('should handle whitespace-only username', () => {
      const gif = generateGifCard('   ');
      expect(gif.length).toBeGreaterThan(0);
      expect(gif.subarray(0, 6).toString('ascii')).toBe('GIF89a');
    });

    it('should trim surrounding whitespace', () => {
      const trimmed = generateGifCard('  testuser  ');
      const unTrimmed = generateGifCard('testuser');
      // After trimming, both should produce the same output
      expect(trimmed.length).toBe(unTrimmed.length);
      expect(trimmed.every((byte, i) => byte === unTrimmed[i])).toBe(true);
    });

    it('should sanitize special characters from username', () => {
      const gif = generateGifCard('hello!@#$world');
      expect(gif.length).toBeGreaterThan(0);
      expect(gif.subarray(0, 6).toString('ascii')).toBe('GIF89a');
      // Should match the sanitized version
      const sanitized = generateGifCard('helloworld');
      expect(gif.length).toBe(sanitized.length);
      expect(gif.every((byte, i) => byte === sanitized[i])).toBe(true);
    });

    it('should handle username with only special characters (becomes empty)', () => {
      const gif = generateGifCard('!@#$%^&*');
      expect(gif.length).toBeGreaterThan(0);
      expect(gif.subarray(0, 6).toString('ascii')).toBe('GIF89a');
      // Should match empty username output (since all chars are stripped)
      const emptyGif = generateGifCard('');
      expect(gif.length).toBe(emptyGif.length);
      expect(gif.every((byte, i) => byte === emptyGif[i])).toBe(true);
    });

    it('should handle unknown user (no leaderboard match) gracefully', () => {
      const gif = generateGifCard('nonexistent-user-xyz');
      expect(gif.length).toBeGreaterThan(0);
      expect(gif.subarray(0, 6).toString('ascii')).toBe('GIF89a');
      // Should contain non-zero color data (not all black)
      const zeroCount = gif.reduce((count, byte) => count + (byte === 0 ? 1 : 0), 0);
      expect(zeroCount).toBeLessThan(gif.length);
    });

    it('should handle very long username', () => {
      const longUsername = 'a'.repeat(100);
      const gif = generateGifCard(longUsername);
      expect(gif.length).toBeGreaterThan(0);
      expect(gif.subarray(0, 6).toString('ascii')).toBe('GIF89a');
    });

    it('should handle username with hyphens', () => {
      const gif = generateGifCard('kevin-jobin-1');
      expect(gif.length).toBeGreaterThan(0);
      expect(gif.subarray(0, 6).toString('ascii')).toBe('GIF89a');
    });
  });
});
