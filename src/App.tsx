import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { RoastMon, ScreenID } from './types';
import { ConsoleShell } from './components/ConsoleShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { playRetroSound, setBgmIntensity } from './utils/audio';

// Lazy-loaded screen components — split on async boundaries
const SplashView = lazy(() => import('./components/SplashView').then(m => ({ default: m.SplashView })));
const SummoningView = lazy(() => import('./components/SummoningView').then(m => ({ default: m.SummoningView })));
const MonDetailsView = lazy(() => import('./components/MonDetailsView').then(m => ({ default: m.MonDetailsView })));
const BattleArenaView = lazy(() => import('./components/BattleArenaView').then(m => ({ default: m.BattleArenaView })));
const HistoryView = lazy(() => import('./components/HistoryView').then(m => ({ default: m.HistoryView })));
const HubView = lazy(() => import('./components/HubView').then(m => ({ default: m.HubView })));
const LeaderboardView = lazy(() => import('./components/LeaderboardView').then(m => ({ default: m.LeaderboardView })));
const PvpLobbyView = lazy(() => import('./components/PvpLobbyView').then(m => ({ default: m.PvpLobbyView })));
const PvpBattleView = lazy(() => import('./components/PvpBattleView').then(m => ({ default: m.PvpBattleView })));
const AiBossBattleView = lazy(() => import('./components/AiBossBattleView').then(m => ({ default: m.AiBossBattleView })));
const ExportEmbedView = lazy(() => import('./components/ExportEmbedView').then(m => ({ default: m.ExportEmbedView })));

export default function App() {
  const [screen, setScreen] = useState<ScreenID>('SPLASH');
  const [selectedUsername, setSelectedUsername] = useState('');
  const [activeMon, setActiveMon] = useState<RoastMon | null>(null);
  const [historyList, setHistoryList] = useState<RoastMon[]>([]);

  // Refs for tracking async summoning
  const fetchedMonRef = useRef<RoastMon | null>(null);
  const apiLoadCompletedRef = useRef<boolean>(false);

  const [autoCopyBadge, setAutoCopyBadge] = useState(false);

  const BATTLE_SCREENS: ScreenID[] = ['BATTLE', 'AI_BOSS_BATTLE', 'PVP_BATTLE'];
  const isBattleScreen = useCallback((id: ScreenID) => BATTLE_SCREENS.includes(id), []);

  // Screen transition animation state
  const [exitingScreen, setExitingScreen] = useState<ScreenID | null>(null);
  const prevScreenRef = useRef<ScreenID>('SPLASH');
  const transitionTimeoutRef = useRef<number | null>(null);

  // Watch for screen changes and trigger exit/enter animations
  useEffect(() => {
    if (prevScreenRef.current !== screen) {
      setExitingScreen(prevScreenRef.current);
      prevScreenRef.current = screen;

      // Sync battle entrance sound with the battle-enter flash+shake animation
      if (isBattleScreen(screen)) {
        playRetroSound('hit');
      }

      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = window.setTimeout(() => {
        setExitingScreen(null);
        transitionTimeoutRef.current = null;
      }, 200);
    }
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, [screen]);

  // Keyboard routing refs mapping to current screen's handlers
  const lastDirHandlerRef = useRef<((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void) | null>(null);
  const lastAHandlerRef = useRef<(() => void) | null>(null);
  const lastBHandlerRef = useRef<(() => void) | null>(null);
  const lastSelectHandlerRef = useRef<(() => void) | null>(null);

  // WebSocket Core state for real-time multiplayer
  const wsRef = useRef<WebSocket | null>(null);
  const [onlineCount, setOnlineCount] = useState(1);
  const [idlePlayers, setIdlePlayers] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // PVP Battle states
  const [roomId, setRoomId] = useState('');
  const [pNumber, setPNumber] = useState<number>(1);
  const [opponentMon, setOpponentMon] = useState<RoastMon | null>(null);
  const [opponentName, setOpponentName] = useState('');
  const [playerHP, setPlayerHP] = useState(100);
  const [opponentHP, setOpponentHP] = useState(100);
  const [isPvpOver, setIsPvpOver] = useState(false);
  const [winnerNickname, setWinnerNickname] = useState('');
  const [pvpLogs, setPvpLogs] = useState<string[]>([]);
  const [lastActionSent, setLastActionSent] = useState(false);

  // Initialize saved Pokedex history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('roastmon_history_v2');
      if (saved) {
        setHistoryList(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not read history list from local storage:', e);
    }
  }, []);

  // Update background chiptune loop intensity depending on battle vs normal views
  useEffect(() => {
    if (screen === 'BATTLE' || screen === 'PVP_BATTLE' || screen === 'AI_BOSS_BATTLE') {
      setBgmIntensity('battle');
    } else {
      setBgmIntensity('normal');
    }
  }, [screen]);

  // Sync active connection and keep status updated
  useEffect(() => {
    if (!activeMon) return;

    // Connect to WebSocket on boot for background metrics (idle presence)
    connectToNetwork();

    return () => {
      disconnectFromNetwork();
    };
  }, [activeMon]);

  const connectToNetwork = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      console.log('Connecting to online arena server:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Successfully connected to arena server socket.');
        // Register active monster as online
        if (activeMon) {
          ws.send(JSON.stringify({
            type: 'register',
            username: activeMon.username,
            mon: activeMon
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'lobby_update':
              setOnlineCount(data.onlineCount ?? 1);
              setIdlePlayers(data.idlePlayers ?? []);
              break;

            case 'match_found':
              console.log('Arena MATCH FOUND!', data);
              setRoomId(data.roomId);
              setPNumber(data.pNumber);
              setOpponentMon(data.opponent);
              setOpponentName(data.opponentName);
              
              if (activeMon) {
                setPlayerHP(activeMon.stats.hp);
              }
              setOpponentHP(data.opponent.stats.hp);
              setIsPvpOver(false);
              setWinnerNickname('');
              setPvpLogs([`BATTLE COMMENCED VS TRAINER ${data.opponentName}!`],);
              setLastActionSent(false);
              setIsSearching(false);
              
              playRetroSound('summon');
              setScreen('PVP_BATTLE');
              break;

            case 'pvp_turn_result':
              setPvpLogs(data.logs);
              setLastActionSent(false);

              // Update HP maps
              if (data.p1HP !== undefined && data.p2HP !== undefined) {
                const selfHP = data.p1HP;
                const oppHP = data.p2HP;
                setPlayerHP(data.p1HP);
                setOpponentHP(data.p2HP);
              }

              if (data.isOver) {
                setIsPvpOver(true);
                setWinnerNickname(data.winnerNickname);
                if (data.winnerNickname.toLowerCase() === activeMon?.username.toLowerCase()) {
                  playRetroSound('summon');
                } else {
                  playRetroSound('defeat');
                }
              } else {
                playRetroSound('hit');
              }
              break;

            case 'error':
              setSearchError(data.message);
              setIsSearching(false);
              break;
          }
        } catch (err) {
          console.error('Error parsing socket payload:', err);
        }
      };

      ws.onclose = () => {
        console.warn('Disconnected from arena server socket.');
      };
    } catch (err) {
      console.error('Error creating WebSocket connection:', err);
    }
  };

  const disconnectFromNetwork = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  // Matchmaking routines
  const handleStartSearching = () => {
    if (!activeMon) return;
    setSearchError(null);
    setIsSearching(true);
    
    // Ensure socket is alive
    connectToNetwork();

    const triggerSearch = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'start_matchmaking' }));
      } else {
        setTimeout(triggerSearch, 200);
      }
    };
    triggerSearch();
  };

  const handleCancelSearching = () => {
    setIsSearching(false);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cancel_searching' }));
    }
  };

  const handleSendPvpAction = (action: 'MOVE' | 'HEAL' | 'SPIT_ROAST', moveIndex?: number) => {
    setLastActionSent(true);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'submit_pvp_action',
        roomId,
        action,
        moveIndex
      }));
    }
  };

  const handleForfeitPvp = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'forfeit_match',
        roomId
      }));
    }
    setScreen('PVP_LOBBY');
  };

  const saveToHistory = (newMon: RoastMon) => {
    setHistoryList((prev) => {
      const cleaned = prev.filter((m) => m.username.toLowerCase() !== newMon.username.toLowerCase());
      const updated = [newMon, ...cleaned];
      try {
        localStorage.setItem('roastmon_history_v2', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not serialize history list to local storage:', e);
      }
      return updated;
    });
  };

  const handleClearIndex = (index: number) => {
    setHistoryList((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      try {
        localStorage.setItem('roastmon_history_v2', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not serialize history list to local storage:', e);
      }
      return updated;
    });
  };

  // Launch async summon request
  const handleSummonInitiate = async (username: string) => {
    setSelectedUsername(username);
    setScreen('SUMMONING');
    fetchedMonRef.current = null;
    apiLoadCompletedRef.current = false;

    try {
      const res = await fetch('/api/summon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (!res.ok) {
        throw new Error(`API returned failure state: ${res.status}`);
      }

      const rawMon: RoastMon = await res.json();
      fetchedMonRef.current = rawMon;
      apiLoadCompletedRef.current = true;
    } catch (err) {
      console.error('Core summon request failed. Drawing default monster.', err);
      const localMock: RoastMon = {
        username: username,
        name: 'OfflineBeast',
        avatarUrl: `https://github.com/${username}.png`,
        type: 'Offline Code Type',
        level: 1,
        bio: 'Summoned without internet sync.',
        roast: 'No internet access detected, can only build offline mock beasts.',
        stats: { hp: 55, attack: 45, defense: 60, speed: 40, chaos: 10 },
        moves: [
          { name: 'Git Commit Force', power: 30, desc: 'Pushes code anyway.' },
          { name: 'Nuke modules', power: 50, desc: 'Clears directories.' },
          { name: 'StackOverflow', power: 45, desc: 'Copies code.' },
          { name: 'Cry in Terminal', power: 15, desc: 'Mutes errors.' }
        ],
        joinedYear: '2022',
        publicRepos: 1,
        followers: 0,
        location: 'Local Machine Only',
        spriteSeed: `${username}-offline`
      };
      fetchedMonRef.current = localMock;
      apiLoadCompletedRef.current = true;
    }
  };

  // Handles transition on loader finish
  const handleSummonFinished = () => {
    const checkReady = setInterval(() => {
      if (apiLoadCompletedRef.current && fetchedMonRef.current) {
        clearInterval(checkReady);
        const finalMon = fetchedMonRef.current;
        setActiveMon(finalMon);
        saveToHistory(finalMon);
        // Summon complete -> Go directly to Export/Embed view with auto-copy badge
        setAutoCopyBadge(true);
        setScreen('EXPORT_EMBED');
        playRetroSound('summon');
      }
    }, 100);
  };

  // Tactile keypad hardware triggers forwarder mappings
  const handlePhysicalA = () => {
    if (lastAHandlerRef.current) {
      lastAHandlerRef.current();
    } else {
      // Fallback handlers
      if (screen === 'DETAILS') {
        playRetroSound('sweep');
        setScreen('HUB');
      }
    }
  };

  const handlePhysicalB = () => {
    if (lastBHandlerRef.current) {
      lastBHandlerRef.current();
    } else {
      // Fallback handlers
      if (screen === 'DETAILS' || screen === 'HISTORY' || screen === 'HUB') {
        playRetroSound('beep');
        setScreen('SPLASH');
      } else if (screen === 'BATTLE') {
        playRetroSound('beep');
        setScreen('HUB');
      }
    }
  };

  const handlePhysicalSelect = () => {
    if (lastSelectHandlerRef.current) {
      lastSelectHandlerRef.current();
    } else if (screen === 'DETAILS') {
      const selectElement = document.querySelector('[onClick="toggleViewMode()"]') as HTMLElement;
      if (selectElement) {
        selectElement.click();
      }
    } else {
      playRetroSound('select');
    }
  };

  // Maps options clicked inside our centralized game hub
  const handleHubSelect = (option: string) => {
    switch (option) {
      case 'STATS':
        setScreen('DETAILS');
        break;
      case 'SINGLE_FIGHT':
        setScreen('BATTLE');
        break;
      case 'PVP_LOBBY':
        setScreen('PVP_LOBBY');
        break;
      case 'AI_BOSS':
        setScreen('AI_BOSS_BATTLE');
        break;
      case 'LEADERBOARD':
        setScreen('LEADERBOARD');
        break;
      case 'EXPORT_EMBED':
        setAutoCopyBadge(false);
        setScreen('EXPORT_EMBED');
        break;
      case 'HISTORY':
        setScreen('HISTORY');
        break;
      case 'RESET':
        // Deletes active reference to start fresh
        setActiveMon(null);
        setScreen('SPLASH');
        break;
    }
  };

  // View transition wrapper — applies enter/exit animations per screen
  function ScreenView({ id, children, active }: { id: ScreenID; children: React.ReactNode; active?: boolean }) {
    const isCurrent = active !== undefined ? active : id === screen;
    const isExiting = id === exitingScreen;
    if (!isCurrent && !isExiting) return null;

    const isBattle = isBattleScreen(id);
    const enterAnim = isBattle ? 'animate-battle-enter' : 'animate-view-enter';
    const exitAnim = isBattle ? 'animate-battle-exit' : 'animate-view-exit';

    return (
      <div className={`w-full h-full ${isCurrent && !isExiting ? enterAnim : ''} ${isExiting ? `${exitAnim} absolute inset-0 pointer-events-none` : ''}`}>
        {children}
      </div>
    );
  }

  // Memoized handler registrars — stable references for child components
  const registerDir = useCallback((h: ((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void) | null) => {
    lastDirHandlerRef.current = h;
  }, []);
  const registerA = useCallback((h: (() => void) | null) => { lastAHandlerRef.current = h; }, []);
  const registerB = useCallback((h: (() => void) | null) => { lastBHandlerRef.current = h; }, []);
  const registerSelect = useCallback((h: (() => void) | null) => { lastSelectHandlerRef.current = h; }, []);

  // Memoized screen navigation callbacks
  const goToHub = useCallback(() => setScreen('HUB'), []);
  const goToBattle = useCallback(() => setScreen('BATTLE'), []);
  const goToSplashOrHub = useCallback(() => {
    if (activeMon) setScreen('HUB');
    else setScreen('SPLASH');
  }, [activeMon]);
  const goToPvpLobby = useCallback(() => setScreen('PVP_LOBBY'), []);

  // Stable direction callback for ConsoleShell
  const handleDirectionPress = useCallback((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    lastDirHandlerRef.current?.(dir);
  }, []);

  // Memoized onSelect for HistoryView
  const handleHistorySelect = useCallback((mon: RoastMon) => {
    setActiveMon(mon);
    setScreen('HUB');
  }, []);

  return (
    <ConsoleShell
      isSynced={!!activeMon}
      onPressA={handlePhysicalA}
      onPressB={handlePhysicalB}
      onPressSelect={handlePhysicalSelect}
      onPressDirection={handleDirectionPress}
    >
      <Suspense fallback={<div className="w-full h-full bg-[#f5f5f5] animate-pulse" />}>
        <ErrorBoundary>
          <ScreenView id="SPLASH">
            <SplashView onSummon={handleSummonInitiate} />
          </ScreenView>

          <ScreenView id="SUMMONING">
            <SummoningView username={selectedUsername} onFinished={handleSummonFinished} />
          </ScreenView>

          <ScreenView id="HUB" active={screen === 'HUB' && !!activeMon}>
            <HubView
              mon={activeMon!}
              activeOnlineCount={onlineCount}
              onSelectOption={handleHubSelect}
              registerDirectionHandler={registerDir}
              registerAHandler={registerA}
              registerBHandler={registerB}
            />
          </ScreenView>

          <ScreenView id="DETAILS" active={screen === 'DETAILS' && !!activeMon}>
            <MonDetailsView
              mon={activeMon!}
              onBattle={goToBattle}
              onBack={goToHub}
            />
          </ScreenView>

          <ScreenView id="BATTLE" active={screen === 'BATTLE' && !!activeMon}>
            <BattleArenaView
              playerMon={activeMon!}
              onExit={goToHub}
              registerDirectionHandler={registerDir}
              registerAHandler={registerA}
              registerBHandler={registerB}
            />
          </ScreenView>

          <ScreenView id="HISTORY">
            <HistoryView
              history={historyList}
              onSelect={handleHistorySelect}
              onClearIndex={handleClearIndex}
              onBack={goToSplashOrHub}
            />
          </ScreenView>

          <ScreenView id="LEADERBOARD">
            <LeaderboardView
              onBack={goToHub}
              registerDirectionHandler={registerDir}
              registerAHandler={registerA}
              registerBHandler={registerB}
            />
          </ScreenView>

          <ScreenView id="PVP_LOBBY" active={screen === 'PVP_LOBBY' && !!activeMon}>
            <PvpLobbyView
              mon={activeMon!}
              onlineCount={onlineCount}
              idlePlayers={idlePlayers}
              isSearching={isSearching}
              searchError={searchError}
              onStartSearching={handleStartSearching}
              onCancelSearching={handleCancelSearching}
              onBack={goToHub}
              registerDirectionHandler={registerDir}
              registerAHandler={registerA}
              registerBHandler={registerB}
            />
          </ScreenView>

          <ScreenView id="PVP_BATTLE" active={screen === 'PVP_BATTLE' && !!activeMon && !!opponentMon}>
            <PvpBattleView
              playerMon={activeMon!}
              opponentMon={opponentMon!}
              opponentName={opponentName}
              playerHP={playerHP}
              opponentHP={opponentHP}
              isOver={isPvpOver}
              winnerNickname={winnerNickname}
              logs={pvpLogs}
              lastActionSent={lastActionSent}
              onSendAction={handleSendPvpAction}
              onForfeit={handleForfeitPvp}
              onExit={goToPvpLobby}
              registerDirectionHandler={registerDir}
              registerAHandler={registerA}
              registerBHandler={registerB}
            />
          </ScreenView>

          <ScreenView id="AI_BOSS_BATTLE" active={screen === 'AI_BOSS_BATTLE' && !!activeMon}>
            <AiBossBattleView
              playerMon={activeMon!}
              onExit={goToHub}
              registerDirectionHandler={registerDir}
              registerAHandler={registerA}
              registerBHandler={registerB}
            />
          </ScreenView>

          <ScreenView id="EXPORT_EMBED" active={screen === 'EXPORT_EMBED' && !!activeMon}>
            <ExportEmbedView
              mon={activeMon!}
              onBack={goToHub}
              registerDirectionHandler={registerDir}
              registerAHandler={registerA}
              registerBHandler={registerB}
              registerSelectHandler={registerSelect}
              autoCopy={autoCopyBadge}
            />
          </ScreenView>
        </ErrorBoundary>
      </Suspense>
    </ConsoleShell>
  );
}
