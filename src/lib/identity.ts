import type { UserIdentity, GittymonCard, RoastMon } from '../types';

const STORAGE_KEY = 'gittymon_identity_v2';
const HISTORY_KEY = 'roastmon_history_v2';

export function loadIdentity(): UserIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserIdentity;
  } catch (e) {
    console.warn('Could not load identity from localStorage:', e);
    return null;
  }
}

export function saveIdentity(identity: UserIdentity): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch (e) {
    console.warn('Could not save identity to localStorage:', e);
  }
}

function clearIdentity(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Could not clear identity from localStorage:', e);
  }
}

export function createIdentity(username: string): UserIdentity {
  return {
    username,
    cards: [],
    favoriteCardId: null,
    totalRerolls: 0,
    createdAt: Date.now(),
    lastVisitedAt: Date.now(),
  };
}

export function addCardToIdentity(identity: UserIdentity, card: GittymonCard): UserIdentity {
  return {
    ...identity,
    cards: [card, ...identity.cards].slice(0, 100),
    lastVisitedAt: Date.now(),
  };
}

export function removeCardFromIdentity(identity: UserIdentity, cardId: string): UserIdentity {
  return {
    ...identity,
    cards: identity.cards.filter(c => c.id !== cardId),
    favoriteCardId: identity.favoriteCardId === cardId ? null : identity.favoriteCardId,
    lastVisitedAt: Date.now(),
  };
}

export function setFavoriteCard(identity: UserIdentity, cardId: string | null): UserIdentity {
  return {
    ...identity,
    favoriteCardId: cardId,
    lastVisitedAt: Date.now(),
  };
}

export function updateLastVisited(identity: UserIdentity): UserIdentity {
  return {
    ...identity,
    lastVisitedAt: Date.now(),
  };
}

/**
 * Migrate existing v1 history entries to GittymonCard format.
 * Reads from roastmon_history_v2 localStorage key.
 */
export function migrateFromV1(): GittymonCard[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const history: RoastMon[] = JSON.parse(raw);
    if (!Array.isArray(history)) return [];

    return history.map((entry) => ({
      id: crypto.randomUUID(),
      base: entry,
      rarity: 'common' as const,
      form: { name: 'Base Form', variant: 'base' },
      mutations: [],
      rerollCount: 0,
      evolutionTier: 0,
      isFavorite: false,
      createdAt: Date.now(),
    }));
  } catch (e) {
    console.warn('Could not migrate v1 history:', e);
    return [];
  }
}
