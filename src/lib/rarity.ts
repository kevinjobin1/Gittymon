import type { Rarity } from '../types';

interface RarityConfig {
  label: string;
  color: string;
  glowColor: string;
  badgeColor: string;
  textColor: string;
  statMultiplier: number;
}

export const RARITY_CONFIGS: Record<Rarity, RarityConfig> = {
  common: {
    label: 'COMMON',
    color: '#a1a1aa',
    glowColor: 'rgba(161, 161, 170, 0.3)',
    badgeColor: '#a1a1aa',
    textColor: '#ffffff',
    statMultiplier: 1.0,
  },
  rare: {
    label: 'RARE',
    color: '#22c55e',
    glowColor: 'rgba(34, 197, 94, 0.4)',
    badgeColor: '#22c55e',
    textColor: '#ffffff',
    statMultiplier: 1.05,
  },
  epic: {
    label: 'EPIC',
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    badgeColor: '#a855f7',
    textColor: '#ffffff',
    statMultiplier: 1.1,
  },
  legendary: {
    label: 'LEGENDARY',
    color: '#facc15',
    glowColor: 'rgba(250, 204, 21, 0.5)',
    badgeColor: '#facc15',
    textColor: '#1a1a1a',
    statMultiplier: 1.2,
  },
  glitched: {
    label: 'GLITCHED',
    color: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.5)',
    badgeColor: '#ec4899',
    textColor: '#ffffff',
    statMultiplier: 1.3,
  },
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: string): number {
  const h = hashString(seed);
  return (h % 10000) / 10000;
}

interface RarityWeights {
  common: number;
  rare: number;
  epic: number;
  legendary: number;
  glitched: number;
}

const BASE_WEIGHTS: RarityWeights = {
  common: 60,
  rare: 25,
  epic: 10,
  legendary: 4,
  glitched: 1,
};

/**
 * Determine rarity for a card based on username, reroll count, and date.
 * Each reroll shifts +5% probability mass from common toward higher rarities.
 */
export function determineRarity(
  username: string,
  rerollCount: number,
  dateStr?: string
): Rarity {
  const base = dateStr || new Date().toISOString().split('T')[0];
  const seed = `${username}-${rerollCount}-${base}`;
  const rand = seededRandom(seed);

  // Shift weights based on reroll count — each reroll moves 5% from common to higher tiers
  const shift = Math.min(rerollCount * 5, 55);
  const weights: RarityWeights = {
    common: Math.max(5, BASE_WEIGHTS.common - shift),
    rare: BASE_WEIGHTS.rare + shift * 0.3,
    epic: BASE_WEIGHTS.epic + shift * 0.3,
    legendary: BASE_WEIGHTS.legendary + shift * 0.25,
    glitched: BASE_WEIGHTS.glitched + shift * 0.15,
  };

  const total =
    weights.common +
    weights.rare +
    weights.epic +
    weights.legendary +
    weights.glitched;
  const roll = rand * total;

  let cumulative = 0;
  cumulative += weights.common;
  if (roll < cumulative) return 'common';
  cumulative += weights.rare;
  if (roll < cumulative) return 'rare';
  cumulative += weights.epic;
  if (roll < cumulative) return 'epic';
  cumulative += weights.legendary;
  if (roll < cumulative) return 'legendary';
  return 'glitched';
}

function getRarityConfig(rarity: Rarity): RarityConfig {
  return RARITY_CONFIGS[rarity];
}
