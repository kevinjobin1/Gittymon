import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { IdentityProvider } from './IdentityContext';
import type { UserIdentity, GittymonCard } from '../types';

// ---------------------------------------------------------------------------
// Helper component that consumes the hook
// ---------------------------------------------------------------------------

import { useIdentity } from './useIdentity';

function TestConsumer({ onError }: { onError?: (err: Error) => void }) {
  try {
    const ctx = useIdentity();
    return (
      <div>
        <span data-testid="identity-present">{ctx.identity ? 'yes' : 'no'}</span>
        <span data-testid="is-new-user">{ctx.isNewUser ? 'true' : 'false'}</span>
        <span data-testid="username">{ctx.identity?.username ?? ''}</span>
        <span data-testid="card-count">{ctx.identity?.cards.length ?? 0}</span>
        <button
          data-testid="create-identity"
          onClick={() => ctx.createIdentity('newuser')}
        >
          Create
        </button>
        <button
          data-testid="add-card"
          onClick={() =>
            ctx.addCard({
              id: 'card-1',
              base: {} as any,
              rarity: 'common',
              form: { name: 'Base Form', variant: 'base' },
              mutations: [],
              rerollCount: 0,
              evolutionTier: 0,
              isFavorite: false,
              createdAt: Date.now(),
            })
          }
        >
          Add Card
        </button>
        <button
          data-testid="remove-card"
          onClick={() => ctx.removeCard('card-1')}
        >
          Remove Card
        </button>
        <button
          data-testid="set-favorite"
          onClick={() => ctx.setFavorite('card-1')}
        >
          Set Favorite
        </button>
        <button data-testid="refresh-identity" onClick={() => ctx.refreshIdentity()}>
          Refresh
        </button>
      </div>
    );
  } catch (err) {
    onError?.(err as Error);
    return <div data-testid="error">{(err as Error).message}</div>;
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createMockIdentity(overrides: Partial<UserIdentity> = {}): UserIdentity {
  return {
    username: 'testuser',
    cards: [],
    favoriteCardId: null,
    totalRerolls: 0,
    createdAt: 1000,
    lastVisitedAt: 1000,
    ...overrides,
  };
}

function createMockCard(overrides: Partial<GittymonCard> = {}): GittymonCard {
  return {
    id: 'card-1',
    base: {
      username: 'testuser',
      name: 'TestMon',
      avatarUrl: '',
      type: 'Test',
      level: 5,
      bio: '',
      roast: '',
      stats: { hp: 100, attack: 50, defense: 50, speed: 50, chaos: 10 },
      moves: [],
      joinedYear: '',
      publicRepos: 0,
      followers: 0,
      location: '',
      spriteSeed: 'seed',
    },
    rarity: 'common',
    form: { name: 'Base Form', variant: 'base' },
    mutations: [],
    rerollCount: 0,
    evolutionTier: 0,
    isFavorite: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useIdentity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('throws when used outside IdentityProvider', () => {
    const errorSpy = vi.fn();
    render(<TestConsumer onError={errorSpy} />);

    expect(screen.getByTestId('error')).toBeInTheDocument();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'useIdentity must be used within an IdentityProvider',
      }),
    );
  });

  it('returns identity when used inside IdentityProvider', () => {
    render(
      <IdentityProvider>
        <TestConsumer />
      </IdentityProvider>,
    );

    expect(screen.getByTestId('identity-present')).toHaveTextContent('no');
    expect(screen.getByTestId('is-new-user')).toHaveTextContent('true');
  });

  it('loads an existing identity from localStorage', () => {
    const identity = createMockIdentity({ username: 'existing-user' });
    localStorage.setItem('gittymon_identity_v2', JSON.stringify(identity));

    render(
      <IdentityProvider>
        <TestConsumer />
      </IdentityProvider>,
    );

    expect(screen.getByTestId('identity-present')).toHaveTextContent('yes');
    expect(screen.getByTestId('is-new-user')).toHaveTextContent('false');
    expect(screen.getByTestId('username')).toHaveTextContent('existing-user');
  });

  it('creates a new identity via createIdentity', () => {
    render(
      <IdentityProvider>
        <TestConsumer />
      </IdentityProvider>,
    );

    act(() => {
      screen.getByTestId('create-identity').click();
    });

    expect(screen.getByTestId('identity-present')).toHaveTextContent('yes');
    expect(screen.getByTestId('username')).toHaveTextContent('newuser');
  });

  it('persists identity to localStorage on create', () => {
    render(
      <IdentityProvider>
        <TestConsumer />
      </IdentityProvider>,
    );

    act(() => {
      screen.getByTestId('create-identity').click();
    });

    const stored = JSON.parse(
      localStorage.getItem('gittymon_identity_v2') ?? 'null',
    );
    expect(stored).not.toBeNull();
    expect(stored.username).toBe('newuser');
  });

  it('adds a card to the identity', () => {
    const identity = createMockIdentity();
    localStorage.setItem('gittymon_identity_v2', JSON.stringify(identity));

    render(
      <IdentityProvider>
        <TestConsumer />
      </IdentityProvider>,
    );

    act(() => {
      screen.getByTestId('add-card').click();
    });

    expect(screen.getByTestId('card-count')).toHaveTextContent('1');
  });

  it('removes a card from the identity', () => {
    const card = createMockCard();
    const identity = createMockIdentity({
      cards: [card, createMockCard({ id: 'card-2' })],
    });
    localStorage.setItem('gittymon_identity_v2', JSON.stringify(identity));

    render(
      <IdentityProvider>
        <TestConsumer />
      </IdentityProvider>,
    );

    expect(screen.getByTestId('card-count')).toHaveTextContent('2');

    act(() => {
      screen.getByTestId('remove-card').click();
    });

    expect(screen.getByTestId('card-count')).toHaveTextContent('1');
  });

  it('sets a favorite card', () => {
    const card = createMockCard();
    const identity = createMockIdentity({ cards: [card] });
    localStorage.setItem('gittymon_identity_v2', JSON.stringify(identity));

    render(
      <IdentityProvider>
        <TestConsumer />
      </IdentityProvider>,
    );

    act(() => {
      screen.getByTestId('set-favorite').click();
    });

    const stored = JSON.parse(
      localStorage.getItem('gittymon_identity_v2') ?? 'null',
    );
    expect(stored.favoriteCardId).toBe('card-1');
  });

  it('refreshes identity from localStorage after external change', () => {
    // Start with no identity
    render(
      <IdentityProvider>
        <TestConsumer />
      </IdentityProvider>,
    );

    expect(screen.getByTestId('identity-present')).toHaveTextContent('no');

    // Externally write an identity to localStorage
    const identity = createMockIdentity({ username: 'external-user' });
    localStorage.setItem('gittymon_identity_v2', JSON.stringify(identity));

    // Refresh identity
    act(() => {
      screen.getByTestId('refresh-identity').click();
    });

    expect(screen.getByTestId('identity-present')).toHaveTextContent('yes');
    expect(screen.getByTestId('username')).toHaveTextContent('external-user');
    expect(screen.getByTestId('is-new-user')).toHaveTextContent('false');
  });
});
