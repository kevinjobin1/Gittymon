import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameServer } from './multiplayer';
import type { Env } from './types';

// ======== Mock Helpers ========

function createMockWebSocket() {
  const sentMessages: string[] = [];
  const ws = {
    send: vi.fn((msg: string) => { sentMessages.push(msg); }),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: 1,
    _sentMessages: sentMessages,
  } as unknown as WebSocket & { _sentMessages: string[] };
  return ws;
}

function parseLastMessage(ws: WebSocket & { _sentMessages: string[] }) {
  if (ws._sentMessages.length === 0) return null;
  return JSON.parse(ws._sentMessages[ws._sentMessages.length - 1]);
}

function findMessageOfType(ws: WebSocket & { _sentMessages: string[] }, type: string) {
  for (const msg of ws._sentMessages) {
    try {
      const parsed = JSON.parse(msg);
      if (parsed.type === type) return parsed;
    } catch {}
  }
  return null;
}

function createMockStorage() {
  const store = new Map<string, any>();
  let alarmTime: number | null = null;

  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: any) => { store.set(key, value); }),
    delete: vi.fn(async (key: string) => { store.delete(key); }),
    setAlarm: vi.fn(async (time: number) => { alarmTime = time; }),
    deleteAlarm: vi.fn(async () => { alarmTime = null; }),
    getAlarm: vi.fn(async () => alarmTime),
    // Expose for test introspection
    _store: store,
    _alarmTime: alarmTime,
  };
}

function createMockDurableObjectState(storage: ReturnType<typeof createMockStorage>) {
  return {
    storage: storage as any,
    acceptWebSocket: vi.fn(),
    waitUntil: vi.fn(),
    id: { toString: () => 'mock-do-id' },
  } as unknown as DurableObjectState;
}

function createMockEnv(): Env {
  return {
    LEADERBOARD: {} as KVNamespace,
    SUMMON_CACHE: {} as KVNamespace,
    GAME_SERVER: {} as DurableObjectNamespace,
    GROQ_API_KEY: 'mock-key',
  };
}

function createSampleMon(overrides = {}) {
  return {
    username: 'testuser',
    name: 'TestMon',
    avatarUrl: 'https://example.com/avatar.png',
    type: 'Test-Type',
    level: 42,
    bio: 'Test bio',
    roast: 'Test roast',
    stats: { hp: 80, attack: 60, defense: 50, speed: 70, chaos: 40 },
    moves: [
      { name: 'Test Move 1', power: 50, desc: 'A test move' },
      { name: 'Test Move 2', power: 40, desc: 'Another test move' },
      { name: 'Test Move 3', power: 30, desc: 'Yet another test move' },
      { name: 'Test Move 4', power: 20, desc: 'Last test move' },
    ],
    joinedYear: '2020',
    publicRepos: 15,
    followers: 10,
    location: 'Test Location',
    spriteSeed: 'test-seed',
    ...overrides,
  };
}

// ======== Tests ========

describe('GameServer Matchmaking Queue & Alarm', () => {
  let storage: ReturnType<typeof createMockStorage>;
  let state: DurableObjectState;
  let env: Env;
  let gameServer: GameServer;
  let ws: WebSocket & { _sentMessages: string[] };

  beforeEach(() => {
    vi.useFakeTimers();
    storage = createMockStorage();
    state = createMockDurableObjectState(storage);
    env = createMockEnv();
    gameServer = new GameServer(state as any, env);
    ws = createMockWebSocket();

    // Simulate WebSocket accept + register that the DO normally does in fetch()
    // We need to register the session manually since we're testing webSocketMessage directly
    const sessionData = { username: '', mon: null, status: 'idle' as const, roomId: null, pNumber: 1 };
    (gameServer as any).sessions.set(ws, sessionData);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ========== Queue Management ==========

  describe('queue management', () => {
    it('should persist queue to storage when no match found', async () => {
      const mon = createSampleMon();
      await (gameServer as any).webSocketMessage(ws, JSON.stringify({
        type: 'register',
        username: 'testuser',
        mon,
      }));

      await (gameServer as any).webSocketMessage(ws, JSON.stringify({
        type: 'start_matchmaking',
      }));

      // Verify storage was written
      expect(storage.put).toHaveBeenCalledWith('matchmaking_queue', [
        { username: 'testuser', startTime: expect.any(Number) },
      ]);

      // Verify alarm was set for ~4500ms from now
      expect(storage.setAlarm).toHaveBeenCalledWith(expect.any(Number));
      const alarmTime = storage.setAlarm.mock.calls[0][0];
      const now = Date.now();
      expect(alarmTime).toBeGreaterThanOrEqual(now + 4400);
      expect(alarmTime).toBeLessThanOrEqual(now + 4600);
    });

    it('should remove player from queue on cancel', async () => {
      // Register and start matchmaking
      const mon = createSampleMon();
      await (gameServer as any).webSocketMessage(ws, JSON.stringify({ type: 'register', username: 'testuser', mon }));
      await (gameServer as any).webSocketMessage(ws, JSON.stringify({ type: 'start_matchmaking' }));

      // Verify we're in the queue
      expect((gameServer as any).pendingMatchmaking).toHaveLength(1);

      // Cancel
      await (gameServer as any).webSocketMessage(ws, JSON.stringify({ type: 'cancel_searching' }));

      // Verify removed from queue
      expect((gameServer as any).pendingMatchmaking).toHaveLength(0);
      // Verify storage was cleaned up
      expect(storage.delete).toHaveBeenCalledWith('matchmaking_queue');
      expect(storage.deleteAlarm).toHaveBeenCalled();
    });

    it('should remove player from queue on disconnect', async () => {
      const mon = createSampleMon();
      await (gameServer as any).webSocketMessage(ws, JSON.stringify({ type: 'register', username: 'testuser', mon }));
      await (gameServer as any).webSocketMessage(ws, JSON.stringify({ type: 'start_matchmaking' }));

      expect((gameServer as any).pendingMatchmaking).toHaveLength(1);

      await (gameServer as any).webSocketClose(ws);

      expect((gameServer as any).pendingMatchmaking).toHaveLength(0);
      expect(storage.delete).toHaveBeenCalledWith('matchmaking_queue');
    });

    it('should be no-op when removing a player not in queue', async () => {
      // Remove without ever adding
      await (gameServer as any).removeFromMatchmakingQueue('unknown-user');

      expect((gameServer as any).pendingMatchmaking).toHaveLength(0);
      expect(storage.delete).not.toHaveBeenCalled();
      expect(storage.deleteAlarm).not.toHaveBeenCalled();
    });
  });

  // ========== Alarm Handler ==========

  describe('alarm handler', () => {
    it('should spawn AI bot for a still-searching player on alarm fire', async () => {
      // Register & search
      const mon = createSampleMon();
      await (gameServer as any).webSocketMessage(ws, JSON.stringify({ type: 'register', username: 'testuser', mon }));
      await (gameServer as any).webSocketMessage(ws, JSON.stringify({ type: 'start_matchmaking' }));

      // Simulate 4.5s passing
      vi.advanceTimersByTime(4500);

      // Fire the alarm
      await (gameServer as any).alarm();

      // Verify a match_found message was sent (AI bot spawned)
      expect(ws._sentMessages.length).toBeGreaterThan(0);

      // The last message is lobby_update, so search for match_found in all messages
      const matchMsg = findMessageOfType(ws, 'match_found');
      expect(matchMsg).not.toBeNull();
      expect(matchMsg.type).toBe('match_found');
      expect(matchMsg.isAi).toBe(true);
      expect(matchMsg.pNumber).toBe(1);

      // Verify queue is empty after processing
      expect((gameServer as any).pendingMatchmaking).toHaveLength(0);
      expect(storage.delete).toHaveBeenCalledWith('matchmaking_queue');
    });

    it('should NOT spawn bot if player already matched/cancelled before alarm', async () => {
      const mon = createSampleMon();
      await (gameServer as any).webSocketMessage(ws, JSON.stringify({ type: 'register', username: 'testuser', mon }));
      await (gameServer as any).webSocketMessage(ws, JSON.stringify({ type: 'start_matchmaking' }));

      // Cancel before alarm fires
      await (gameServer as any).webSocketMessage(ws, JSON.stringify({ type: 'cancel_searching' }));

      // Track sent messages count before alarm
      const msgCountBefore = ws._sentMessages.length;

      // Advance time and fire alarm
      vi.advanceTimersByTime(4500);
      await (gameServer as any).alarm();

      // No new messages should be sent (bot not spawned)
      expect(ws._sentMessages.length).toBe(msgCountBefore);
    });

    it('should not spawn bot if player disconnected before alarm fires', async () => {
      const mon = createSampleMon();
      await (gameServer as any).webSocketMessage(ws, JSON.stringify({ type: 'register', username: 'testuser', mon }));
      await (gameServer as any).webSocketMessage(ws, JSON.stringify({ type: 'start_matchmaking' }));

      // Disconnect
      await (gameServer as any).webSocketClose(ws);

      vi.advanceTimersByTime(4500);
      await (gameServer as any).alarm();

      // No messages sent (no sessions to spawn bot for)
      // The alarm should just clean up the queue
      expect(storage.delete).toHaveBeenCalledWith('matchmaking_queue');
    });

    it('should process multiple players with staggered start times', async () => {
      // Pre-populate queue with 3 players at staggered startTimes via storage.
      // This avoids PvP matching interference and race conditions with fake timers.
      const now = Date.now();
      await storage.put('matchmaking_queue', [
        { username: 'early', startTime: now },
        { username: 'middle', startTime: now + 1000 },
        { username: 'late', startTime: now + 2000 },
      ]);
      (gameServer as any).pendingMatchmaking = [
        { username: 'early', startTime: now },
        { username: 'middle', startTime: now + 1000 },
        { username: 'late', startTime: now + 2000 },
      ];

      // Register sessions so alarm can find and spawn bots for expired players
      const wsEarly = createMockWebSocket();
      const wsMiddle = createMockWebSocket();
      const wsLate = createMockWebSocket();
      (gameServer as any).sessions.set(wsEarly, { username: 'early', mon: createSampleMon({ username: 'early' }), status: 'searching', roomId: null, pNumber: 1 });
      (gameServer as any).sessions.set(wsMiddle, { username: 'middle', mon: createSampleMon({ username: 'middle' }), status: 'searching', roomId: null, pNumber: 1 });
      (gameServer as any).sessions.set(wsLate, { username: 'late', mon: createSampleMon({ username: 'late' }), status: 'searching', roomId: null, pNumber: 1 });

      // Advance 4500ms — only 'early' has expired (4500ms elapsed from startTime).
      // 'middle' has 3500ms elapsed, 'late' has 2500ms elapsed.
      vi.advanceTimersByTime(4500);
      await (gameServer as any).alarm();

      // Only 'early' should have received a match_found
      const earlyMsg = findMessageOfType(wsEarly, 'match_found');
      expect(earlyMsg).not.toBeNull();
      expect(earlyMsg.type).toBe('match_found');
      expect(earlyMsg.isAi).toBe(true);

      // Queue should now have 'middle' and 'late'
      let remaining = await storage._store.get('matchmaking_queue');
      expect(remaining).toHaveLength(2);
      expect(remaining[0].username).toBe('middle');
      expect(remaining[1].username).toBe('late');

      // Advance another 1000ms — now 'middle' has 4500ms elapsed, 'late' has 3500ms
      vi.advanceTimersByTime(1000);
      await (gameServer as any).alarm();

      // 'middle' should have a bot now
      const middleMsg = findMessageOfType(wsMiddle, 'match_found');
      expect(middleMsg).not.toBeNull();
      expect(middleMsg.type).toBe('match_found');
      expect(middleMsg.isAi).toBe(true);

      // Only 'late' should remain
      remaining = await storage._store.get('matchmaking_queue');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].username).toBe('late');

      // Advance another 1000ms — 'late' has 4500ms elapsed
      vi.advanceTimersByTime(1000);
      await (gameServer as any).alarm();

      // 'late' should have a bot
      const lateMsg = findMessageOfType(wsLate, 'match_found');
      expect(lateMsg).not.toBeNull();
      expect(lateMsg.type).toBe('match_found');
      expect(lateMsg.isAi).toBe(true);

      // Queue should be empty
      expect((gameServer as any).pendingMatchmaking).toHaveLength(0);
      expect(storage.delete).toHaveBeenCalledWith('matchmaking_queue');
    });

    it('should do nothing when queue is empty', async () => {
      // Clear any pending storage actions from setup
      storage.put.mockClear();
      storage.delete.mockClear();
      storage.setAlarm.mockClear();

      await (gameServer as any).alarm();

      // No storage operations should have happened
      expect(storage.put).not.toHaveBeenCalled();
      expect(storage.delete).not.toHaveBeenCalled();
      expect(storage.setAlarm).not.toHaveBeenCalled();
    });
  });

  // ========== Match Found ==========

  describe('match found before alarm', () => {
    it('should remove both players from queue when matched', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      (gameServer as any).sessions.set(ws1, { username: '', mon: null, status: 'idle' as const, roomId: null, pNumber: 1 });
      (gameServer as any).sessions.set(ws2, { username: '', mon: null, status: 'idle' as const, roomId: null, pNumber: 1 });

      const mon = createSampleMon();

      // Register & start searching for both
      await (gameServer as any).webSocketMessage(ws1, JSON.stringify({ type: 'register', username: 'player1', mon }));
      await (gameServer as any).webSocketMessage(ws2, JSON.stringify({ type: 'register', username: 'player2', mon }));

      // Player 1 starts searching (goes into queue since no one else is searching)
      await (gameServer as any).webSocketMessage(ws1, JSON.stringify({ type: 'start_matchmaking' }));
      expect((gameServer as any).pendingMatchmaking).toHaveLength(1);

      // Player 2 starts searching (should match with player 1)
      await (gameServer as any).webSocketMessage(ws2, JSON.stringify({ type: 'start_matchmaking' }));

      // Both should be removed from queue
      expect((gameServer as any).pendingMatchmaking).toHaveLength(0);

      // Both should receive match_found with isAi: false (search all messages — broadcastLobbyUpdate may send after)
      const ws1Msg = findMessageOfType(ws1, 'match_found');
      const ws2Msg = findMessageOfType(ws2, 'match_found');
      expect(ws1Msg).not.toBeNull();
      expect(ws1Msg.type).toBe('match_found');
      expect(ws1Msg.isAi).toBe(false);
      expect(ws2Msg).not.toBeNull();
      expect(ws2Msg.type).toBe('match_found');
      expect(ws2Msg.isAi).toBe(false);

      // Verify storage was cleaned up
      expect(storage.delete).toHaveBeenCalledWith('matchmaking_queue');
    });
  });

  // ========== DO Eviction Simulation ==========

  describe('DO eviction simulation', () => {
    it('should clean up stale queue when DO restarts with no sessions', async () => {
      // Simulate the scenario where a queue was persisted before eviction:
      // Both entries are more than 4500ms old — both will expire
      const now = Date.now();
      await storage.put('matchmaking_queue', [
        { username: 'ghost-player', startTime: now - 5000 },
        { username: 'another-ghost', startTime: now - 5000 },
      ]);

      // Clear sessions to simulate DO restart with no active connections
      (gameServer as any).sessions.clear();

      // Fire the alarm (DO restarted, alarm fires)
      await (gameServer as any).alarm();

      // Both entries expired; since no sessions exist, no bots spawned.
      // Queue should be cleaned up entirely.
      const remaining = await storage._store.get('matchmaking_queue');
      expect(remaining).toBeUndefined();
      expect(storage.delete).toHaveBeenCalledWith('matchmaking_queue');
    });
  });

  // ========== Room Creation on Match ==========

  describe('room creation on match', () => {
    it('should create a room with both players when matched', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      const mon1 = createSampleMon({ username: 'player1', name: 'MonOne', stats: { hp: 100, attack: 60, defense: 50, speed: 70, chaos: 40 } });
      const mon2 = createSampleMon({ username: 'player2', name: 'MonTwo', stats: { hp: 90, attack: 70, defense: 60, speed: 50, chaos: 30 } });

      (gameServer as any).sessions.set(ws1, { username: '', mon: null, status: 'idle' as const, roomId: null, pNumber: 1 });
      (gameServer as any).sessions.set(ws2, { username: '', mon: null, status: 'idle' as const, roomId: null, pNumber: 1 });

      await (gameServer as any).webSocketMessage(ws1, JSON.stringify({ type: 'register', username: 'player1', mon: mon1 }));
      await (gameServer as any).webSocketMessage(ws2, JSON.stringify({ type: 'register', username: 'player2', mon: mon2 }));

      await (gameServer as any).webSocketMessage(ws1, JSON.stringify({ type: 'start_matchmaking' }));
      await (gameServer as any).webSocketMessage(ws2, JSON.stringify({ type: 'start_matchmaking' }));

      // Verify room was created
      expect((gameServer as any).rooms.size).toBe(1);
      const rooms = (gameServer as any).rooms;
      const room = rooms.values().next().value;
      expect(room.isAiMatch).toBe(false);
      // p1 is the player who found the match (player2's start_matchmaking matched with player1)
      expect(room.p1.username).toBe('player2');
      expect(room.p2.username).toBe('player1');
      expect(room.p1.ws).toBe(ws2);
      expect(room.p2.ws).toBe(ws1);
    });

    it('should require mon to be registered before matchmaking', async () => {
      // Register without mon (simulating incomplete registration)
      (gameServer as any).sessions.get(ws)!.mon = null;
      (gameServer as any).sessions.get(ws)!.username = 'testuser';

      await (gameServer as any).webSocketMessage(ws, JSON.stringify({ type: 'start_matchmaking' }));

      const lastMsg = parseLastMessage(ws);
      expect(lastMsg.type).toBe('error');
      expect(lastMsg.message).toContain('register');
    });
  });

  // ========== AI Bot Match ==========

  describe('AI bot match on timeout', () => {
    it('should create a proper room structure for AI bot matches', async () => {
      const mon = createSampleMon();
      await (gameServer as any).webSocketMessage(ws, JSON.stringify({ type: 'register', username: 'testuser', mon }));
      await (gameServer as any).webSocketMessage(ws, JSON.stringify({ type: 'start_matchmaking' }));

      vi.advanceTimersByTime(4500);
      await (gameServer as any).alarm();

      // Verify room was created with AI structure
      expect((gameServer as any).rooms.size).toBe(1);
      const rooms = (gameServer as any).rooms;
      const room = rooms.values().next().value;
      expect(room.isAiMatch).toBe(true);
      expect(room.p1.ws).toBe(ws);
      expect(room.p2.ws).toBeNull(); // AI bot has no WebSocket

      // Verify the match_found message (search all sent messages — broadcastLobbyUpdate may send after)
      const matchMsg = findMessageOfType(ws, 'match_found');
      expect(matchMsg).not.toBeNull();
      expect(matchMsg.isAi).toBe(true);
      expect(matchMsg.opponent).toBeDefined();
      expect(matchMsg.opponentName).toBeDefined();
      expect(matchMsg.opponent.stats).toBeDefined();
      expect(matchMsg.opponent.moves).toHaveLength(4);
    });
  });

  // ========== Schedule Edge Cases ==========

  describe('alarm scheduling edge cases', () => {
    it('should reschedule alarm when only some players expire', async () => {
      // Pre-populate queue via storage to avoid PvP matching (two searching players match)
      // Early player searches at epoch 0, late player at epoch 2000
      const now = Date.now();
      const earlyStart = now;          // started now
      const lateStart = now + 2000;    // starts 2000ms from now (simulated)
      await storage.put('matchmaking_queue', [
        { username: 'early', startTime: earlyStart },
        { username: 'late', startTime: lateStart },
      ]);
      // Sync in-memory cache
      (gameServer as any).pendingMatchmaking = [
        { username: 'early', startTime: earlyStart },
        { username: 'late', startTime: lateStart },
      ];

      // Register a session for 'early' and 'late' so the alarm can find them
      const ws1 = createMockWebSocket();
      (gameServer as any).sessions.set(ws1, { username: 'early', mon: createSampleMon({ username: 'early' }), status: 'searching', roomId: null, pNumber: 1 });
      (gameServer as any).sessions.get(ws)!.username = 'late';
      (gameServer as any).sessions.get(ws)!.mon = createSampleMon({ username: 'late' });
      (gameServer as any).sessions.get(ws)!.status = 'searching';

      // Advance 4500ms from now — early player expired (4500ms elapsed), late player only 2500ms elapsed
      vi.advanceTimersByTime(4500);
      await (gameServer as any).alarm();

      // Early player expired and is searching — should get AI bot
      const ws1Msg = findMessageOfType(ws1, 'match_found');
      expect(ws1Msg).not.toBeNull();
      expect(ws1Msg.type).toBe('match_found');
      expect(ws1Msg.isAi).toBe(true);

      // Late player should remain in queue (only 2500ms elapsed, not 4500)
      const remaining = await storage._store.get('matchmaking_queue');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].username).toBe('late');

      // Verify alarm was rescheduled for late player's timeout
      // Late's startTime + 4500 = (now+2000) + 4500 = now + 6500
      // Current fake time is now + 4500, so alarm is ~2000ms from now
      const alarmCall = storage.setAlarm.mock.lastCall;
      expect(alarmCall).toBeDefined();
      expect(alarmCall![0]).toBeGreaterThanOrEqual(Date.now() + 1900);
      expect(alarmCall![0]).toBeLessThanOrEqual(Date.now() + 2100);
    });

    it('should not set alarm when queue is empty after scheduleNextAlarm', async () => {
      storage.setAlarm.mockClear();
      await (gameServer as any).scheduleNextAlarm();
      expect(storage.setAlarm).not.toHaveBeenCalled();
    });
  });
});
