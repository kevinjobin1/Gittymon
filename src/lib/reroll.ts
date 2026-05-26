import type { CardForm } from '../types';

interface FormVariant {
  name: string;
  variant: string;
  description: string;
}

const FORM_VARIANTS: FormVariant[] = [
  { name: 'Base Form', variant: 'base', description: 'Default configuration' },
  {
    name: 'Sleep-Deprived Form',
    variant: 'sleep_deprived',
    description: 'Low focus, high chaos',
  },
  {
    name: 'Chaos Form',
    variant: 'chaos',
    description: 'All stats randomized ±40%',
  },
  {
    name: 'Focused Form',
    variant: 'focused',
    description: 'High attack/speed, low hp',
  },
  {
    name: 'Glitched Form',
    variant: 'glitched',
    description: 'Inverted stats, visual glitch',
  },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Get a deterministic form variant based on reroll count and seed.
 * Reroll count 0 = base form. Higher rerolls cycle through variants.
 */
export function getFormVariant(rerollCount: number, seed: string): CardForm {
  if (rerollCount === 0) {
    return { name: 'Base Form', variant: 'base' };
  }

  const h = hashString(seed + rerollCount.toString());
  // Skip base form for rerolls (start at index 1)
  const index = 1 + (h % (FORM_VARIANTS.length - 1));
  const variant = FORM_VARIANTS[index];
  return { name: variant.name, variant: variant.variant };
}

/**
 * Get all available form variants for display purposes.
 */
function getAllFormVariants(): FormVariant[] {
  return [...FORM_VARIANTS];
}

/**
 * Apply form variant stat modifications to base stats.
 * Each variant has distinct stat modification logic.
 * If seed is provided, the chaos variant uses deterministic randomness.
 */
export function applyFormStats(
  variant: string,
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    chaos: number;
  },
  seed?: string
): {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  chaos: number;
} {
  // Use seeded fraction for deterministic results
  const frac = seed ? (hashString(seed + 'chaos') % 1000) / 1000 : Math.random();

  switch (variant) {
    case 'sleep_deprived':
      return {
        hp: Math.max(10, Math.floor(baseStats.hp * 0.8)),
        attack: baseStats.attack,
        defense: baseStats.defense,
        speed: Math.floor(baseStats.speed * 1.2),
        chaos: Math.min(100, Math.floor(baseStats.chaos * 1.4)),
      };
    case 'chaos':
      return {
        hp: Math.floor(baseStats.hp * (0.6 + frac * 0.8)),
        attack: Math.floor(baseStats.attack * (0.6 + frac * 0.8)),
        defense: Math.floor(baseStats.defense * (0.6 + frac * 0.8)),
        speed: Math.floor(baseStats.speed * (0.6 + frac * 0.8)),
        chaos: 100,
      };
    case 'focused':
      return {
        hp: Math.max(10, Math.floor(baseStats.hp * 0.7)),
        attack: Math.floor(baseStats.attack * 1.3),
        defense: baseStats.defense,
        speed: Math.floor(baseStats.speed * 1.3),
        chaos: Math.floor(baseStats.chaos * 0.6),
      };
    case 'glitched':
      return {
        hp: baseStats.chaos,
        attack: baseStats.defense,
        defense: baseStats.attack,
        speed: Math.floor(baseStats.speed * 0.5),
        chaos: Math.min(100, Math.floor(baseStats.hp * 1.5)),
      };
    default:
      return { ...baseStats };
  }
}
