import React, { createContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { UserIdentity, GittymonCard } from '../types';
import {
  loadIdentity,
  saveIdentity,
  createIdentity as createIdentityFn,
  addCardToIdentity,
  removeCardFromIdentity,
  setFavoriteCard as setFavoriteCardFn,
  updateLastVisited,
  migrateFromV1,
} from './identity';

export interface IdentityContextValue {
  identity: UserIdentity | null;
  isNewUser: boolean;
  createIdentity: (username: string) => void;
  addCard: (card: GittymonCard) => void;
  removeCard: (cardId: string) => void;
  setFavorite: (cardId: string | null) => void;
  refreshIdentity: () => void;
}

export const IdentityContext = createContext<IdentityContextValue | null>(null);

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [isNewUser, setIsNewUser] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const pendingCardsRef = useRef<GittymonCard[]>([]);

  useEffect(() => {
    const loaded = loadIdentity();

    if (!loaded) {
      // Try migrating from v1 history entries
      const migratedCards = migrateFromV1();
      if (migratedCards.length > 0) {
        // Preserve migrated cards so they aren't lost when createIdentity is called later
        pendingCardsRef.current = migratedCards;
      }
    }

    if (loaded) {
      setIdentity(loaded);
      setIsNewUser(false);
      const updated = updateLastVisited(loaded);
      setIdentity(updated);
      saveIdentity(updated);
    }

    setInitialized(true);
  }, []);

  const handleCreateIdentity = useCallback((username: string) => {
    const newIdentity = createIdentityFn(username);
    // Inject any pending v1 migrated cards into the new identity
    const pendingCards = pendingCardsRef.current;
    pendingCardsRef.current = [];
    const finalIdentity = pendingCards.length > 0
      ? { ...newIdentity, cards: [...pendingCards, ...newIdentity.cards].slice(0, 100) }
      : newIdentity;
    setIdentity(finalIdentity);
    setIsNewUser(false);
    saveIdentity(finalIdentity);
  }, []);

  const addCard = useCallback((card: GittymonCard) => {
    setIdentity((prev) => {
      if (!prev) return prev;
      const updated = addCardToIdentity(prev, card);
      saveIdentity(updated);
      return updated;
    });
  }, []);

  const removeCard = useCallback((cardId: string) => {
    setIdentity((prev) => {
      if (!prev) return prev;
      const updated = removeCardFromIdentity(prev, cardId);
      saveIdentity(updated);
      return updated;
    });
  }, []);

  const setFavorite = useCallback((cardId: string | null) => {
    setIdentity((prev) => {
      if (!prev) return prev;
      const updated = setFavoriteCardFn(prev, cardId);
      saveIdentity(updated);
      return updated;
    });
  }, []);

  const refreshIdentity = useCallback(() => {
    const loaded = loadIdentity();
    if (loaded) {
      setIdentity(loaded);
      setIsNewUser(false);
    }
  }, []);

  if (!initialized) {
    return null;
  }

  return (
    <IdentityContext.Provider
      value={{
        identity,
        isNewUser: isNewUser && !identity,
        createIdentity: handleCreateIdentity,
        addCard,
        removeCard,
        setFavorite,
        refreshIdentity,
      }}
    >
      {children}
    </IdentityContext.Provider>
  );
}


