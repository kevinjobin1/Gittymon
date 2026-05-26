import type { Mutation, Rarity } from '../types';

const MUTATION_POOL: Mutation[] = [
  { id: 'chaotic_energy', label: '+ Chaotic Energy', effect: '+10 chaos' },
  { id: 'sleep_instability', label: '- Sleep Stability', effect: '-5 hp' },
  { id: 'meme_awareness', label: '+ Meme Awareness', effect: '+8 attack' },
  { id: 'glitch_corruption', label: 'Glitch Corruption', effect: 'Stats inverted' },
  { id: 'caffeine_overdose', label: 'Caffeine Overdose', effect: '+15 speed, -5 defense' },
  { id: 'legacy_dependency', label: 'Legacy Dependency', effect: '+10 defense, -5 speed' },
  { id: 'production_hotfix', label: 'Production Hotfix', effect: '+15 hp, -10 chaos' },
  { id: 'ai_co_pilot', label: 'AI Co-Pilot', effect: '+12 attack' },
  { id: 'stackoverflow_overflow', label: 'StackOverflow Overflow', effect: '+20 chaos' },
  { id: 'readme_driven_dev', label: 'README-Driven Dev', effect: '+5 all stats' },
  { id: 'npm_dependency_hell', label: 'NPM Dependency Hell', effect: '-8 speed, +15 defense' },
  { id: 'yak_shaving', label: 'Yak Shaving', effect: '+10 all stats, -5 hp' },
  { id: 'deadline_demigod', label: 'Deadline Demigod', effect: '+20 speed, -10 chaos' },
  { id: 'impostor_syndrome', label: 'Impostor Syndrome', effect: '+15 defense, -5 attack' },
  { id: 'rubber_duck_debug', label: 'Rubber Duck Debug', effect: '+8 chaos, +8 hp' },
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

function pickRandomFromPool(pool: Mutation[], count: number, seed: string): Mutation[] {
  const shuffled = [...pool];
  const h = hashString(seed);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (h + i * 31) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Select mutations for a card based on rarity and seed.
 * Common: 0-1 mutations. Rare: 1-2. Epic: 2-3. Legendary: 3. Glitched: 3-5.
 */
export function selectMutations(rarity: Rarity, seed: string): Mutation[] {
  const baseCount =
    rarity === 'common'
      ? 1
      : rarity === 'rare'
        ? 2
        : rarity === 'epic'
          ? 3
          : rarity === 'legendary'
            ? 3
            : 5; // glitched

  const h = hashString(seed);
  const actualCount =
    rarity === 'glitched'
      ? 3 + (h % 3) // 3-5
      : Math.max(1, h % (baseCount + 1)); // 0 to baseCount

  return pickRandomFromPool(MUTATION_POOL, actualCount, seed);
}

export function getAllMutations(): Mutation[] {
  return [...MUTATION_POOL];
}
