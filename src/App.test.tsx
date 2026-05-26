import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock all lazy-loaded screen components
// ---------------------------------------------------------------------------

vi.mock('./components/SplashView', () => ({
  SplashView: ({ onSummon }: any) => (
    <div data-testid="splash-view">
      <button
        data-testid="summon-btn"
        onClick={() => onSummon?.('testuser')}
      >
        Summon
      </button>
    </div>
  ),
}));

vi.mock('./components/SummoningView', () => ({
  SummoningView: ({ username, onFinished }: any) => (
    <div data-testid="summoning-view">
      <span data-testid="summon-username">{username}</span>
      <button data-testid="finish-summon-btn" onClick={onFinished}>
        Finish
      </button>
    </div>
  ),
}));

vi.mock('./components/HubView', () => ({
  HubView: ({ mon, activeOnlineCount, onSelectOption }: any) => (
    <div data-testid="hub-view">
      <span data-testid="hub-mon-name">{mon?.name}</span>
      <span data-testid="hub-online-count">{activeOnlineCount}</span>
      <button data-testid="hub-stats-btn" onClick={() => onSelectOption?.('STATS')}>STATS</button>
      <button data-testid="hub-battle-btn" onClick={() => onSelectOption?.('SINGLE_FIGHT')}>BATTLE</button>
      <button data-testid="hub-pvp-btn" onClick={() => onSelectOption?.('PVP_LOBBY')}>PVP</button>
      <button data-testid="hub-ai-btn" onClick={() => onSelectOption?.('AI_BOSS')}>AI BOSS</button>
      <button data-testid="hub-leaderboard-btn" onClick={() => onSelectOption?.('LEADERBOARD')}>LEADERBOARD</button>
      <button data-testid="hub-export-btn" onClick={() => onSelectOption?.('EXPORT_EMBED')}>EXPORT</button>
      <button data-testid="hub-history-btn" onClick={() => onSelectOption?.('HISTORY')}>HISTORY</button>
      <button data-testid="hub-reset-btn" onClick={() => onSelectOption?.('RESET')}>RESET</button>
    </div>
  ),
}));

vi.mock('./components/MonDetailsView', () => ({
  MonDetailsView: ({ mon, onBattle, onBack }: any) => (
    <div data-testid="details-view">
      <span data-testid="details-mon-name">{mon?.name}</span>
      <button data-testid="details-battle-btn" onClick={onBattle}>Battle</button>
      <button data-testid="details-back-btn" onClick={onBack}>Back</button>
    </div>
  ),
}));

vi.mock('./components/BattleArenaView', () => ({
  BattleArenaView: ({ playerMon, onExit }: any) => (
    <div data-testid="battle-view">
      <span data-testid="battle-mon-name">{playerMon?.name}</span>
      <button data-testid="battle-exit-btn" onClick={onExit}>Exit</button>
    </div>
  ),
}));

vi.mock('./components/HistoryView', () => ({
  HistoryView: ({ history, onSelect, onClearIndex, onBack }: any) => (
    <div data-testid="history-view">
      <span data-testid="history-count">{history?.length ?? 0}</span>
      <button data-testid="history-back-btn" onClick={onBack}>Back</button>
      <button
        data-testid="history-select-first"
        onClick={() => onSelect?.(history?.[0])}
      >
        Select First
      </button>
    </div>
  ),
}));

vi.mock('./components/LeaderboardView', () => ({
  LeaderboardView: ({ onBack }: any) => (
    <div data-testid="leaderboard-view">
      <button data-testid="leaderboard-back-btn" onClick={onBack}>Back</button>
    </div>
  ),
}));

vi.mock('./components/PvpLobbyView', () => ({
  PvpLobbyView: ({ mon, onlineCount, idlePlayers, isSearching, searchError, onStartSearching, onCancelSearching, onBack }: any) => (
    <div data-testid="pvp-lobby-view">
      <span data-testid="pvp-mon-name">{mon?.name}</span>
      <span data-testid="pvp-online-count">{onlineCount}</span>
      <span data-testid="pvp-idle-players">{idlePlayers?.length}</span>
      <span data-testid="pvp-searching">{isSearching ? 'searching' : 'idle'}</span>
      <span data-testid="pvp-error">{searchError}</span>
      <button data-testid="pvp-start-search" onClick={onStartSearching}>Search</button>
      <button data-testid="pvp-cancel-search" onClick={onCancelSearching}>Cancel</button>
      <button data-testid="pvp-back-btn" onClick={onBack}>Back</button>
    </div>
  ),
}));

vi.mock('./components/PvpBattleView', () => ({
  PvpBattleView: ({ playerMon, opponentMon, opponentName, playerHP, opponentHP, isOver, winnerNickname, lastActionSent, onSendAction, onForfeit, onExit }: any) => (
    <div data-testid="pvp-battle-view">
      <span data-testid="pvp-player-name">{playerMon?.name}</span>
      <span data-testid="pvp-opponent-name">{opponentName}</span>
      <span data-testid="pvp-player-hp">{playerHP}</span>
      <span data-testid="pvp-opponent-hp">{opponentHP}</span>
      <span data-testid="pvp-is-over">{isOver ? 'over' : 'active'}</span>
      <span data-testid="pvp-winner">{winnerNickname}</span>
      <span data-testid="pvp-last-action-sent">{lastActionSent ? 'yes' : 'no'}</span>
      <button data-testid="pvp-attack-btn" onClick={() => onSendAction?.('MOVE', 0)}>Attack</button>
      <button data-testid="pvp-forfeit-btn" onClick={onForfeit}>Forfeit</button>
      <button data-testid="pvp-exit-btn" onClick={onExit}>Exit</button>
    </div>
  ),
}));

vi.mock('./components/AiBossBattleView', () => ({
  AiBossBattleView: ({ playerMon, onExit }: any) => (
    <div data-testid="ai-boss-view">
      <span data-testid="ai-boss-mon-name">{playerMon?.name}</span>
      <button data-testid="ai-boss-exit-btn" onClick={onExit}>Exit</button>
    </div>
  ),
}));

vi.mock('./components/ExportEmbedView', () => ({
  ExportEmbedView: ({ mon, onBack, autoCopy }: any) => (
    <div data-testid="export-embed-view">
      <span data-testid="export-mon-name">{mon?.name}</span>
      <span data-testid="export-auto-copy">{autoCopy ? 'auto' : 'manual'}</span>
      <button data-testid="export-back-btn" onClick={onBack}>Back</button>
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Mock ConsoleShell — renders children + physical button triggers
// ---------------------------------------------------------------------------

vi.mock('./components/ConsoleShell', () => ({
  ConsoleShell: ({ children, onPressA, onPressB, onPressSelect, onPressDirection }: any) => (
    <div data-testid="console-shell">
      <button data-testid="physical-a-btn" onClick={onPressA}>A</button>
      <button data-testid="physical-b-btn" onClick={onPressB}>B</button>
      <button data-testid="physical-select-btn" onClick={onPressSelect}>SELECT</button>
      <button data-testid="physical-up-btn" onClick={() => onPressDirection?.('UP')}>UP</button>
      {children}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Mock audio
// ---------------------------------------------------------------------------

const mockPlayRetroSound = vi.fn();
const mockSetBgmIntensity = vi.fn();
vi.mock('./utils/audio', () => ({
  playRetroSound: (...args: any[]) => mockPlayRetroSound(...args),
  setBgmIntensity: (...args: any[]) => mockSetBgmIntensity(...args),
}));

// ---------------------------------------------------------------------------
// Mock WebSocket
// ---------------------------------------------------------------------------

type MockWebSocketInstance = {
  readyState: number;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  onopen: ((this: WebSocket, ev: Event) => any) | null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null;
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null;
};

let mockWsInstance: MockWebSocketInstance;

function createMockWebSocket() {
  mockWsInstance = {
    readyState: 1, // WebSocket.OPEN
    send: vi.fn(),
    close: vi.fn(),
    onopen: null,
    onmessage: null,
    onclose: null,
  };
  return mockWsInstance;
}

/** Helper to dispatch a WebSocket message through the mock */
function dispatchWsMessage(data: Record<string, unknown>) {
  const handler = mockWsInstance.onmessage;
  if (handler) {
    handler.call(mockWsInstance as unknown as WebSocket, new MessageEvent('message', { data: JSON.stringify(data) }));
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockSummonResponse = {
  username: 'testuser',
  name: 'TestMon',
  avatarUrl: 'https://github.com/testuser.png',
  type: 'Test Type',
  level: 5,
  bio: 'Test bio',
  roast: 'Test roast',
  stats: { hp: 100, attack: 50, defense: 50, speed: 50, chaos: 10 },
  moves: [
    { name: 'Move 1', power: 30, desc: 'Desc 1' },
    { name: 'Move 2', power: 40, desc: 'Desc 2' },
    { name: 'Move 3', power: 50, desc: 'Desc 3' },
    { name: 'Move 4', power: 20, desc: 'Desc 4' },
  ],
  joinedYear: '2022',
  publicRepos: 10,
  followers: 5,
  location: 'Test Location',
  spriteSeed: 'testuser-seed',
};

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

async function renderApp() {
  let container!: HTMLElement;

  await act(async () => {
    const Module = await import('./App');
    const result = render(<Module.default />);
    container = result.container;
  });

  return container;
}

// Inject mock WebSocket into the global scope
vi.stubGlobal('WebSocket', vi.fn(createMockWebSocket));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (window as any).WebSocket = vi.fn(createMockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // ===================================================================
  //  Initial render
  // ===================================================================

  describe('initial render', () => {
    it('renders within ConsoleShell', async () => {
      const container = await renderApp();
      expect(container.querySelector('[data-testid="console-shell"]')).toBeInTheDocument();
    });

    it('shows the splash screen by default', async () => {
      const container = await renderApp();
      await waitFor(() => {
        expect(container.querySelector('[data-testid="splash-view"]')).toBeInTheDocument();
      });
    });

    it('does not show other screens on initial load', async () => {
      const container = await renderApp();
      expect(container.querySelector('[data-testid="hub-view"]')).not.toBeInTheDocument();
      expect(container.querySelector('[data-testid="summoning-view"]')).not.toBeInTheDocument();
      expect(container.querySelector('[data-testid="battle-view"]')).not.toBeInTheDocument();
    });
  });

  // ===================================================================
  //  localStorage initialization
  // ===================================================================

  describe('localStorage', () => {
    it('loads existing history from localStorage on mount', async () => {
      const existingHistory = [
        { ...mockSummonResponse, username: 'existing1' },
      ];
      localStorage.setItem('roastmon_history_v2', JSON.stringify(existingHistory));
      // The history is loaded into state but not directly visible in the DOM
      // until we navigate to history view. We verify it loads without errors.
      const container = await renderApp();
      expect(container.querySelector('[data-testid="splash-view"]')).toBeInTheDocument();
    });

    it('handles corrupted localStorage gracefully', async () => {
      localStorage.setItem('roastmon_history_v2', 'not-valid-json');
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await renderApp();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  // ===================================================================
  //  Summon flow
  // ===================================================================

  describe('summon flow', () => {
    it('transitions to SUMMONING screen when summon is initiated', async () => {
      const container = await renderApp();

      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="summon-btn"]')!);
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="summoning-view"]')).toBeInTheDocument();
      });
    });

    it('calls fetch with the correct username', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSummonResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      const container = await renderApp();

      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="summon-btn"]')!);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/summon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'testuser' }),
        });
      });
    });

    it('navigates to EXPORT_EMBED after successful summon', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSummonResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      const container = await renderApp();

      // Click Summon
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="summon-btn"]')!);
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="summoning-view"]')).toBeInTheDocument();
      });

      // Click "Finish" — triggers handleSummonFinished which polls and navigates
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="finish-summon-btn"]')!);
      });

      await waitFor(
        () => {
          expect(container.querySelector('[data-testid="export-embed-view"]')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Auto-copy should be true (first summon)
      const autoCopySpan = container.querySelector('[data-testid="export-auto-copy"]');
      expect(autoCopySpan?.textContent).toBe('auto');

      expect(mockPlayRetroSound).toHaveBeenCalledWith('summon');
    });

    it('falls back to offline monster when fetch fails', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.stubGlobal('fetch', mockFetch);

      const container = await renderApp();

      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="summon-btn"]')!);
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="summoning-view"]')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="finish-summon-btn"]')!);
      });

      await waitFor(
        () => {
          expect(container.querySelector('[data-testid="export-embed-view"]')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Offline monster name should be 'OfflineBeast'
      const monNameSpan = container.querySelector('[data-testid="export-mon-name"]');
      expect(monNameSpan?.textContent).toBe('OfflineBeast');
    });
  });

  // ===================================================================
  //  Hub navigation (handleHubSelect)
  // ===================================================================

  describe('hub navigation', () => {
    /** Helper: summon a monster then navigate to hub */
    async function setupSummonAndNavigateToHub() {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSummonResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      const container = await renderApp();

      // Summon
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="summon-btn"]')!);
      });

      // Finish summon
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="finish-summon-btn"]')!);
      });

      // Wait for export view
      await waitFor(
        () => {
          expect(container.querySelector('[data-testid="export-embed-view"]')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Go back to hub
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="export-back-btn"]')!);
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="hub-view"]')).toBeInTheDocument();
      });

      return container;
    }

    it('navigates to DETAILS when STATS is selected', async () => {
      const container = await setupSummonAndNavigateToHub();

      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="hub-stats-btn"]')!);
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="details-view"]')).toBeInTheDocument();
      });
    });

    it('navigates to BATTLE when SINGLE_FIGHT is selected', async () => {
      const container = await setupSummonAndNavigateToHub();

      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="hub-battle-btn"]')!);
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="battle-view"]')).toBeInTheDocument();
      });
    });

    it('navigates to PVP_LOBBY when PVP is selected', async () => {
      const container = await setupSummonAndNavigateToHub();

      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="hub-pvp-btn"]')!);
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="pvp-lobby-view"]')).toBeInTheDocument();
      });
    });

    it('navigates to AI_BOSS_BATTLE when AI_BOSS is selected', async () => {
      const container = await setupSummonAndNavigateToHub();

      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="hub-ai-btn"]')!);
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="ai-boss-view"]')).toBeInTheDocument();
      });
    });

    it('navigates to LEADERBOARD when leaderboard is selected', async () => {
      const container = await setupSummonAndNavigateToHub();

      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="hub-leaderboard-btn"]')!);
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="leaderboard-view"]')).toBeInTheDocument();
      });
    });

    it('navigates to EXPORT_EMBED with autoCopy=false from hub', async () => {
      const container = await setupSummonAndNavigateToHub();

      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="hub-export-btn"]')!);
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="export-embed-view"]')).toBeInTheDocument();
      });

      const autoCopySpan = container.querySelector('[data-testid="export-auto-copy"]');
      expect(autoCopySpan?.textContent).toBe('manual');
    });

    it('navigates to HISTORY when history is selected', async () => {
      const container = await setupSummonAndNavigateToHub();

      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="hub-history-btn"]')!);
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="history-view"]')).toBeInTheDocument();
      });
    });

    it('RESET clears activeMon and returns to SPLASH', async () => {
      const container = await setupSummonAndNavigateToHub();

      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="hub-reset-btn"]')!);
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="splash-view"]')).toBeInTheDocument();
      });
    });
  });

  // ===================================================================
  //  Physical button handlers
  // ===================================================================

  describe('physical button handlers', () => {
    it('navigates back to SPLASH from HUB when B is pressed (fallback)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSummonResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      const container = await renderApp();

      // Summon
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="summon-btn"]')!);
      });

      // Finish
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="finish-summon-btn"]')!);
      });

      // Navigate to hub
      await waitFor(
        () => {
          expect(container.querySelector('[data-testid="export-embed-view"]')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="export-back-btn"]')!);
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="hub-view"]')).toBeInTheDocument();
      });

      // Press B — fallback should navigate to SPLASH
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="physical-b-btn"]')!);
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="splash-view"]')).toBeInTheDocument();
      });

      expect(mockPlayRetroSound).toHaveBeenCalledWith('beep');
    });

    it('select button plays select sound when no handler is registered', async () => {
      const container = await renderApp();

      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="physical-select-btn"]')!);
      });

      expect(mockPlayRetroSound).toHaveBeenCalledWith('select');
    });
  });

  // ===================================================================
  //  WebSocket message handling
  // ===================================================================

  describe('WebSocket message handling', () => {
    async function setupSummonAndNavigateToPvpLobby() {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSummonResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      const container = await renderApp();

      // Summon
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="summon-btn"]')!);
      });

      // Finish
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="finish-summon-btn"]')!);
      });

      await waitFor(
        () => {
          expect(container.querySelector('[data-testid="export-embed-view"]')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Go to hub
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="export-back-btn"]')!);
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="hub-view"]')).toBeInTheDocument();
      });

      // Go to PVP lobby
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="hub-pvp-btn"]')!);
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="pvp-lobby-view"]')).toBeInTheDocument();
      });

      return container;
    }

    it('processes lobby_update message', async () => {
      const container = await setupSummonAndNavigateToPvpLobby();

      await act(async () => {
        dispatchWsMessage({
          type: 'lobby_update',
          onlineCount: 5,
          idlePlayers: ['player1', 'player2'],
        });
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="pvp-online-count"]')?.textContent).toBe('5');
      });
      expect(container.querySelector('[data-testid="pvp-idle-players"]')?.textContent).toBe('2');
    });

    it('processes match_found message and transitions to battle', async () => {
      const container = await setupSummonAndNavigateToPvpLobby();

      // Start searching
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="pvp-start-search"]')!);
      });

      await act(async () => {
        dispatchWsMessage({
          type: 'match_found',
          roomId: 'room-123',
          pNumber: 1,
          opponent: { ...mockSummonResponse, username: 'opponent' },
          opponentName: 'Opponent',
        });
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="pvp-battle-view"]')).toBeInTheDocument();
      });

      expect(mockPlayRetroSound).toHaveBeenCalledWith('summon');
    });

    it('processes pvp_turn_result message and updates HP', async () => {
      const container = await setupSummonAndNavigateToPvpLobby();

      // Start searching → match found
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="pvp-start-search"]')!);
      });

      await act(async () => {
        dispatchWsMessage({
          type: 'match_found',
          roomId: 'room-123',
          pNumber: 1,
          opponent: { ...mockSummonResponse, username: 'opponent' },
          opponentName: 'Opponent',
        });
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="pvp-battle-view"]')).toBeInTheDocument();
      });

      // Send an action
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="pvp-attack-btn"]')!);
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="pvp-last-action-sent"]')?.textContent).toBe('yes');
      });

      // Simulate turn result
      await act(async () => {
        dispatchWsMessage({
          type: 'pvp_turn_result',
          logs: ['Player used MOVE!', 'Opponent took damage!'],
          p1HP: 80,
          p2HP: 70,
          isOver: false,
          winnerNickname: '',
        });
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="pvp-last-action-sent"]')?.textContent).toBe('no');
        expect(container.querySelector('[data-testid="pvp-player-hp"]')?.textContent).toBe('80');
      });
    });

    it('handles battle over in pvp_turn_result', async () => {
      const container = await setupSummonAndNavigateToPvpLobby();

      // Start searching
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="pvp-start-search"]')!);
      });

      // Match found
      await act(async () => {
        dispatchWsMessage({
          type: 'match_found',
          roomId: 'room-123',
          pNumber: 1,
          opponent: { ...mockSummonResponse, username: 'opponent' },
          opponentName: 'Opponent',
        });
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="pvp-battle-view"]')).toBeInTheDocument();
      });

      // Simulate defeat
      await act(async () => {
        dispatchWsMessage({
          type: 'pvp_turn_result',
          logs: ['Battle over!'],
          p1HP: 0,
          p2HP: 100,
          isOver: true,
          winnerNickname: 'Opponent',
        });
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="pvp-is-over"]')?.textContent).toBe('over');
        expect(container.querySelector('[data-testid="pvp-winner"]')?.textContent).toBe('Opponent');
      });

      expect(mockPlayRetroSound).toHaveBeenCalledWith('defeat');
    });

    it('processes error message', async () => {
      const container = await setupSummonAndNavigateToPvpLobby();

      await act(async () => {
        dispatchWsMessage({
          type: 'error',
          message: 'Matchmaking failed: no opponents found',
        });
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="pvp-error"]')?.textContent).toBe(
          'Matchmaking failed: no opponents found',
        );
      });
    });
  });

  // ===================================================================
  //  BGM intensity via useEffect
  // ===================================================================

  describe('BGM intensity', () => {
    it('sets BGM intensity to battle when on battle screen', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSummonResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      const container = await renderApp();

      // Summon → finish → export view
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="summon-btn"]')!);
      });
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="finish-summon-btn"]')!);
      });

      await waitFor(
        () => {
          expect(container.querySelector('[data-testid="export-embed-view"]')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Go to hub
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="export-back-btn"]')!);
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="hub-view"]')).toBeInTheDocument();
      });

      mockSetBgmIntensity.mockClear();

      // Navigate to battle
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="hub-battle-btn"]')!);
      });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="battle-view"]')).toBeInTheDocument();
      });

      expect(mockSetBgmIntensity).toHaveBeenCalledWith('battle');
    });

    it('sets BGM intensity to normal on non-battle screens', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSummonResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      const container = await renderApp();

      // Summon → finish → export view (non-battle screen)
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="summon-btn"]')!);
      });
      await act(async () => {
        fireEvent.click(container.querySelector('[data-testid="finish-summon-btn"]')!);
      });

      await waitFor(
        () => {
          expect(container.querySelector('[data-testid="export-embed-view"]')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      expect(mockSetBgmIntensity).toHaveBeenCalledWith('normal');
    });
  });
});
