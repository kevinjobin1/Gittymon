import React, { useState, useEffect, useCallback, useRef } from 'react';
import { playRetroSound, isAudioEnabled, toggleAudioMute } from '../utils/audio';
import { BackgroundMap } from './BackgroundMap';
import GitHubButton from 'react-github-btn'

interface ConsoleShellProps {
  children: React.ReactNode;
  isSynced?: boolean;
  onPressA?: () => void;
  onPressB?: () => void;
  onPressStart?: () => void;
  onPressSelect?: () => void;
  onPressDirection?: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
}

export function ConsoleShell({
  children,
  isSynced = false,
  onPressA,
  onPressB,
  onPressStart,
  onPressSelect,
  onPressDirection
}: ConsoleShellProps) {
  const [isBooting, setIsBooting] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [focusDone, setFocusDone] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [dynamicScale, setDynamicScale] = useState(1);
  const [dustParticles, setDustParticles] = useState<Array<{
    id: number;
    left: string;
    delay: string;
    duration: string;
    drift: string;
    size: string;
    color: string;
  }>>([]);

  const [showEscToast, setShowEscToast] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const hasEverExpandedRef = useRef(false);
  const rippleIdRef = useRef(0);

  const [pressedKeys, setPressedKeys] = useState<{
    A: boolean;
    B: boolean;
    START: boolean;
    SELECT: boolean;
    UP: boolean;
    DOWN: boolean;
    LEFT: boolean;
    RIGHT: boolean;
  }>({
    A: false,
    B: false,
    START: false,
    SELECT: false,
    UP: false,
    DOWN: false,
    LEFT: false,
    RIGHT: false
  });

  useEffect(() => {
    const soundTimeout = setTimeout(() => {
      playRetroSound('boot');
    }, 900);
    const bootTimeout = setTimeout(() => {
      setIsBooting(false);
      // Trigger camera rack-focus zoom after boot completes
      setTimeout(() => setIsFocused(true), 120);
    }, 2600);
    return () => {
      clearTimeout(soundTimeout);
      clearTimeout(bootTimeout);
    };
  }, []);  const ZOOM_STEP = 0.1;

  const handleZoomIn = () => {
    playRetroSound('select');
    setZoomLevel((z) => Math.min(3, +(z + ZOOM_STEP).toFixed(1)));
  };
  const handleZoomOut = () => {
    playRetroSound('select');
    setZoomLevel((z) => Math.max(0.5, +(z - ZOOM_STEP).toFixed(1)));
  };
  const handleZoomReset = () => {
    playRetroSound('beep');
    setZoomLevel(1);
  };

  // Calculate zoom scale to fit console at ~70-90% viewport width
  const recalcScale = useCallback(() => {
    const vw = window.innerWidth;
    let baseWidth: number;
    let targetPct: number;
    if (vw >= 1024) {
      baseWidth = 520;
      targetPct = 0.72;
    } else if (vw >= 640) {
      baseWidth = 520;
      targetPct = 0.82;
    } else {
      baseWidth = 420;
      targetPct = 0.90;
    }
    const targetW = vw * targetPct;
    const s = Math.max(1, Math.min(targetW / baseWidth, 3));
    setDynamicScale(s);
  }, []);

  // Recalculate scale when expanded state changes
  useEffect(() => {
    if (isExpanded) recalcScale();
  }, [isExpanded, recalcScale]);

  // Listen for resize while expanded
  useEffect(() => {
    if (isExpanded) {
      window.addEventListener('resize', recalcScale);
      return () => window.removeEventListener('resize', recalcScale);
    }
  }, [isExpanded, recalcScale]);

  // Show ESC shortcut toast on first expansion
  useEffect(() => {
    if (isExpanded && !hasEverExpandedRef.current) {
      hasEverExpandedRef.current = true;
      setShowEscToast(true);
      const timer = setTimeout(() => setShowEscToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  useEffect(() => {
    const colors = ['#38bdf8', '#fb7185', '#a3e635', '#dbbc7f', '#ffffff'];
    const particles = Array.from({ length: 22 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 8}s`,
      duration: `${6 + Math.random() * 8}s`,
      drift: `${(Math.random() - 0.5) * 80}px`,
      size: `${2 + Math.floor(Math.random() * 3)}px`,
      color: colors[i % colors.length]
    }));
    setDustParticles(particles);
  }, []);

  const [soundOn, setSoundOn] = useState(isAudioEnabled());

  const handleToggleSound = () => {
    const isNowOn = toggleAudioMute();
    setSoundOn(isNowOn);
    playRetroSound('beep');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      switch (e.key.toLowerCase()) {
        case 'arrowup':
          setPressedKeys((k) => ({ ...k, UP: true }));
          onPressDirection?.('UP');
          break;
        case 'arrowdown':
          setPressedKeys((k) => ({ ...k, DOWN: true }));
          onPressDirection?.('DOWN');
          break;
        case 'arrowleft':
          setPressedKeys((k) => ({ ...k, LEFT: true }));
          onPressDirection?.('LEFT');
          break;
        case 'arrowright':
          setPressedKeys((k) => ({ ...k, RIGHT: true }));
          onPressDirection?.('RIGHT');
          break;
        case 'z':
        case 'a':
          setPressedKeys((k) => ({ ...k, A: true }));
          onPressA?.();
          break;
        case 'x':
        case 'b':
          setPressedKeys((k) => ({ ...k, B: true }));
          onPressB?.();
          break;
        case 'enter':
          setPressedKeys((k) => ({ ...k, START: true }));
          onPressStart?.();
          break;
        case 'shift':
        case ' ':
          setPressedKeys((k) => ({ ...k, SELECT: true }));
          onPressSelect?.();
          break;
        case 'escape':
          if (showControls) {
            playRetroSound('beep');
            setShowControls(false);
          } else {
            setIsExpanded(false);
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'arrowup': setPressedKeys((k) => ({ ...k, UP: false })); break;
        case 'arrowdown': setPressedKeys((k) => ({ ...k, DOWN: false })); break;
        case 'arrowleft': setPressedKeys((k) => ({ ...k, LEFT: false })); break;
        case 'arrowright': setPressedKeys((k) => ({ ...k, RIGHT: false })); break;
        case 'z': case 'a': setPressedKeys((k) => ({ ...k, A: false })); break;
        case 'x': case 'b': setPressedKeys((k) => ({ ...k, B: false })); break;
        case 'enter': setPressedKeys((k) => ({ ...k, START: false })); break;
        case 'shift': case ' ': setPressedKeys((k) => ({ ...k, SELECT: false })); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onPressA, onPressB, onPressStart, onPressSelect, onPressDirection, showControls]);

  // Click/tap on console shell to expand; click outside to collapse
  const handleConsoleClick = useCallback((e: React.MouseEvent) => {
    // Always stop propagation so clicks inside the console never reach the outside handler
    e.stopPropagation();
    const target = e.target as HTMLElement;
    // Don't expand when clicking inside the game screen or on buttons/interactive elements
    if (target.closest('button, .game-screen-sp, [role="button"], a, select, input')) return;
    setIsExpanded(true);
  }, []);

  const handleOutsideClick = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const triggerButton = (btn: 'A' | 'B' | 'START' | 'SELECT' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', action?: () => void) => {
    if (['A', 'B', 'START', 'SELECT'].includes(btn)) {
      playRetroSound('beep');
    }
    action?.();
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-3 sm:p-5 min-h-screen relative w-full ${!isExpanded ? 'overflow-hidden' : ''}`}
      onClick={focusDone && isExpanded ? handleOutsideClick : undefined}
    >
      <BackgroundMap isExpanded={isExpanded} />

      {/* Vignette overlay — darkens background when console is expanded */}
      <div
        className={`fixed inset-0 pointer-events-none z-[5] transition-opacity duration-500 ease-in-out ${
          isExpanded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 40%, transparent 0%, rgba(0,0,0,0.65) 100%)',
        }}
      />

      {/* GITTENDO ADVANCED SP — Clamshell Console */}
      <div
        className={`flex flex-col items-center relative z-10 ${
          !focusDone
            ? isFocused
              ? 'animate-camera-focus'
              : 'opacity-30 scale-[0.88] blur-[6px]'
            : focusDone && !isExpanded
              ? 'console-zoomable'
              : ''
        }`}
        style={{
          transform: focusDone ? `scale(${isExpanded ? dynamicScale * zoomLevel : 1})` : undefined,
          transformOrigin: 'center top',
          transition: focusDone ? 'transform 0.5s cubic-bezier(0.22, 0.61, 0.36, 1)' : undefined,
        }}
        onClick={focusDone ? handleConsoleClick : undefined}
        onAnimationEnd={() => {
          if (isFocused && !focusDone) setFocusDone(true);
        }}
      >

        {/* ====== TOP HALF (Screen) ====== */}
        <div className="sp-top-half w-[420px] sm:w-[520px] h-[420px] sm:h-[510px] rounded-t-2xl rounded-b-md flex flex-col items-center justify-center p-4 sm:p-5 relative">

          {/* Rubber bumpers (top corners) */}
          <div className="absolute top-2 left-2 w-2 h-2 bg-gray-400 rounded-full shadow-inner" />
          <div className="absolute top-2 right-2 w-2 h-2 bg-gray-400 rounded-full shadow-inner" />

          {/* Screen Bezel */}
          <div className="screen-bezel w-full h-full rounded-xl flex flex-col items-center p-3 sm:p-4">

            {/* Status bar inside bezel */}
            <div className="w-full flex justify-between items-center mb-1.5 px-0.5">
              <div className="flex items-center gap-1">
                <GitHubButton
                  className="flex items-center gap-1 opacity-85 hover:opacity-100 cursor-pointer hover:text-white transition-all bg-[#1a1b20] hover:bg-gray-800 px-2 py-0.5 rounded border border-gray-700 active:scale-95 text-[6.5px] sm:text-[8px] text-gray-300 font-bold"
                  href="https://github.com/kevinjobin1/Gittymon"
                  data-color-scheme="no-preference: dark_dimmed; light: dark_dimmed; dark: dark_dimmed;"
                  data-icon="octicon-star"
                  data-show-count="true"
                  aria-label="Star kevinjobin1/Gittymon on GitHub"
                >
                  Star
                </GitHubButton>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-[6.5px] sm:text-[8px] font-mono select-none">
                {/* Zoom controls */}
                <div className="flex items-center gap-0.5 bg-[#1a1b20] rounded border border-gray-700 px-1 py-0.5 select-none">
                  <button
                    onClick={handleZoomOut}
                    className="cursor-pointer hover:text-white transition-all active:scale-90 text-gray-400 hover:bg-gray-800 rounded px-1 leading-none"
                    title="Zoom out"
                  >
                    <span className="text-[7px] sm:text-[8px] font-bold">−</span>
                  </button>
                  <button
                    onClick={handleZoomReset}
                    className="cursor-pointer hover:text-white transition-all active:scale-90 text-gray-500 hover:bg-gray-800 rounded px-1 leading-none font-mono"
                    title={`Reset zoom (${Math.round(zoomLevel * 100)}%)`}
                  >
                    <span className="text-[6px] sm:text-[7px] tabular-nums">{Math.round(zoomLevel * 100)}%</span>
                  </button>
                  <button
                    onClick={handleZoomIn}
                    className="cursor-pointer hover:text-white transition-all active:scale-90 text-gray-400 hover:bg-gray-800 rounded px-1 leading-none"
                    title="Zoom in"
                  >
                    <span className="text-[7px] sm:text-[8px] font-bold">+</span>
                  </button>
                </div>

                <button
                  onClick={(e) => {
                    playRetroSound('select');
                    setShowControls(true);
                    // Spawn ripple at click position relative to the button
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const id = ++rippleIdRef.current;
                    setRipples((prev) => [...prev, { id, x, y }]);
                    setTimeout(() => {
                      setRipples((prev) => prev.filter((r) => r.id !== id));
                    }, 500);
                  }}
                  className="relative flex items-center justify-center opacity-85 hover:opacity-100 cursor-pointer hover:text-white transition-all bg-[#1a1b20] hover:bg-gray-800 px-2 py-0.5 rounded border border-gray-700 active:scale-95 text-gray-300 font-bold leading-none overflow-hidden"
                  title="Keyboard controls"
                >
                  {ripples.map((r) => (
                    <span
                      key={r.id}
                      className="ripple"
                      style={{ left: r.x - 10, top: r.y - 10 }}
                    />
                  ))}
                  <span className="relative z-[1] text-[8px] sm:text-[9px]">?</span>
                </button>
                <button
                  onClick={handleToggleSound}
                  className="flex items-center gap-1 opacity-85 hover:opacity-100 cursor-pointer hover:text-white transition-all bg-[#1a1b20] hover:bg-gray-800 px-2 py-0.5 rounded border border-gray-700 active:scale-95 text-[6.5px] sm:text-[8px] text-gray-300 font-bold"
                  title="Toggle 8-bit Sound Loop"
                >
                  <span>AUDIO: {soundOn ? 'ON' : 'OFF'}</span>
                </button>
                <div className="flex items-center gap-1 bg-[#1a1b20] px-1 sm:px-1.5 py-0.5 rounded-sm border border-gray-700 select-none" title={isSynced ? 'GitHub Profile Synced Successfully' : 'No Active GitHub Profile Summoned'}>
                  <div className={`w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full transition-all duration-500 ${
                    isSynced
                      ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]'
                      : 'bg-red-500 shadow-[0_0_5px_#ef4444] animate-pulse'
                  }`} />
                  <span className="text-[6px] sm:text-[7.5px] font-bold text-gray-300 tracking-normal font-mono">
                    {isSynced ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Display Area — The Game Screen */}
            <div className="game-screen-sp w-full flex-1 rounded-[3px] overflow-hidden flex flex-col bg-[#f5f5f5] relative">
              <div className="lcd-grid" />

              {isBooting ? (
                <div className="flex-1 flex flex-col items-center justify-between py-8 font-mono select-none bg-[#e2dfde] text-[#1a1a1a] relative overflow-hidden">
                  <div className="absolute inset-0 bg-[#e2dfde] opacity-5 pointer-events-none"
                       style={{ backgroundImage: 'repeating-linear-gradient(0deg, #1a1a1a, #1a1a1a 2px, transparent 2px, transparent 4px)' }} />
                  <div className="flex-1 flex flex-col items-center justify-center w-full">
                    <div className="animate-logo-slide-down font-bold italic tracking-widest text-lg text-center flex flex-col items-center">
                      <span className="text-[#1a1a1a] text-xl font-black drop-shadow-[1px_1px_0px_#ffffff]" style={{ fontFamily: '"Courier Prime", monospace' }}>
                        Gittendo
                      </span>
                      <div className="h-[2.5px] w-14 bg-[#1a1a1a] mt-1" />
                    </div>
                  </div>
                  <div className="text-[7px] uppercase tracking-wider text-center opacity-0 animate-fade-in-delayed font-bold leading-normal" style={{ fontFamily: '"Courier Prime", monospace' }}>
                    © 2026 POWERED BY GROQ AI <br/>
                    GIT SUMMONED BY @KEVINJOBIN1
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col relative z-10 w-full overflow-y-auto overflow-x-hidden pr-0.5">
                  {children}
                </div>
              )}
            </div>

            {/* Logo under screen */}
            <div className="mt-2 sm:mt-2.5 text-gray-400 text-[9px] sm:text-[10px] font-bold tracking-[0.2em] opacity-70 select-none flex items-center justify-center gap-2" style={{ fontFamily: '"Courier Prime", monospace' }}>
              <span>GITTENDO ADVANCED SP</span>
              {focusDone && (
                <span
                  className={`inline-block text-[8px] sm:text-[9px] transition-all duration-300 ${isExpanded ? 'text-emerald-500' : 'text-gray-500 animate-pulse'}`}
                  title={isExpanded ? 'Click outside to collapse' : 'Click console to expand'}
                >
                  {isExpanded ? '⛶' : '⊞'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ====== HINGE ====== */}
        <div className="sp-hinge w-[360px] sm:w-[460px] h-6 sm:h-7 -my-3 sm:-my-3.5 z-20 flex justify-between px-8 sm:px-10">
          <div className="w-1 h-full bg-gray-500 opacity-40 rounded-full" />
          <div className="w-1 h-full bg-gray-500 opacity-40 rounded-full" />
        </div>

        {/* ====== BOTTOM HALF (Controls) ====== */}
        <div className="sp-bottom-half w-[420px] sm:w-[520px] h-[380px] sm:h-[450px] rounded-b-2xl rounded-t-md p-4 sm:p-5 relative">

          {/* L and R shoulder button illusions */}
          <div className="absolute -top-1 left-5 sm:left-8 w-10 sm:w-14 h-2 sm:h-2.5 bg-gray-300 rounded-t-md shadow-inner border border-gray-400" />
          <div className="absolute -top-1 right-5 sm:right-8 w-10 sm:w-14 h-2 sm:h-2.5 bg-gray-300 rounded-t-md shadow-inner border border-gray-400" />

          {/* Brightness button (below hinge, centered) */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-3 sm:h-4 bg-gray-400 rounded-full shadow-inner border border-gray-500" />

          {/* Controls Layout */}
          <div className="relative w-full h-full mt-2 sm:mt-4">

            {/* D-Pad (left side) — SP-style cross */}
            <div className="absolute top-6 sm:top-8 left-2 sm:left-4 w-24 h-24 sm:w-28 sm:h-28">
              {/* Vertical bar */}
              <div className="absolute top-1/3 left-0 w-full h-1/3 bg-neutral-900 rounded-[3px] shadow-[inset_-2px_-2px_4px_rgba(255,255,255,0.1),_2px_2px_4px_rgba(0,0,0,0.4)]" />
              {/* Horizontal bar */}
              <div className="absolute left-1/3 top-0 w-1/3 h-full bg-neutral-900 rounded-[3px] shadow-[inset_-2px_-2px_4px_rgba(255,255,255,0.1),_2px_2px_4px_rgba(0,0,0,0.4)]" />
              {/* Center circular indent */}
              <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-neutral-950 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8)]" />

              {/* Interactive D-pad overlays */}
              <button
                onClick={() => triggerButton('UP', () => onPressDirection?.('UP'))}
                className={`absolute top-0 left-1/2 -translate-x-1/2 w-7.5 h-7 rounded-t-[3px] cursor-pointer transition-all ${
                  pressedKeys.UP
                    ? 'bg-neutral-950/70 shadow-inner'
                    : 'hover:bg-neutral-800/40 active:bg-neutral-900/60'
                }`}
                aria-label="D-pad Up"
              >
                <div className="flex flex-col gap-[1.5px] items-center justify-center h-full mb-1 opacity-70">
                  <div className="w-3.5 h-[1.5px] bg-neutral-600" />
                  <div className="w-3.5 h-[1.5px] bg-neutral-600" />
                  <div className="w-3.5 h-[1.5px] bg-neutral-600" />
                </div>
              </button>

              <button
                onClick={() => triggerButton('DOWN', () => onPressDirection?.('DOWN'))}
                className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-7.5 h-7 rounded-b-[3px] cursor-pointer transition-all ${
                  pressedKeys.DOWN
                    ? 'bg-neutral-950/70 shadow-inner'
                    : 'hover:bg-neutral-800/40 active:bg-neutral-900/60'
                }`}
                aria-label="D-pad Down"
              >
                <div className="flex flex-col gap-[1.5px] items-center justify-center h-full mt-1 opacity-70">
                  <div className="w-3.5 h-[1.5px] bg-neutral-600" />
                  <div className="w-3.5 h-[1.5px] bg-neutral-600" />
                  <div className="w-3.5 h-[1.5px] bg-neutral-600" />
                </div>
              </button>

              <button
                onClick={() => triggerButton('LEFT', () => onPressDirection?.('LEFT'))}
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7.5 rounded-l-[3px] cursor-pointer transition-all ${
                  pressedKeys.LEFT
                    ? 'bg-neutral-950/70 shadow-inner'
                    : 'hover:bg-neutral-800/40 active:bg-neutral-900/60'
                }`}
                aria-label="D-pad Left"
              >
                <div className="flex gap-[1.5px] items-center justify-center h-full mr-1 opacity-70">
                  <div className="w-[1.5px] h-3.5 bg-neutral-600" />
                  <div className="w-[1.5px] h-3.5 bg-neutral-600" />
                  <div className="w-[1.5px] h-3.5 bg-neutral-600" />
                </div>
              </button>

              <button
                onClick={() => triggerButton('RIGHT', () => onPressDirection?.('RIGHT'))}
                className={`absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7.5 rounded-r-[3px] cursor-pointer transition-all ${
                  pressedKeys.RIGHT
                    ? 'bg-neutral-950/70 shadow-inner'
                    : 'hover:bg-neutral-800/40 active:bg-neutral-900/60'
                }`}
                aria-label="D-pad Right"
              >
                <div className="flex gap-[1.5px] items-center justify-center h-full ml-1 opacity-70">
                  <div className="w-[1.5px] h-3.5 bg-neutral-600" />
                  <div className="w-[1.5px] h-3.5 bg-neutral-600" />
                  <div className="w-[1.5px] h-3.5 bg-neutral-600" />
                </div>
              </button>
            </div>

            {/* Action Buttons (A & B) — right side, angled */}
            <div className="absolute top-7 sm:top-9 right-2 sm:right-4 w-24 sm:w-28 h-20 sm:h-24">
              <button
                onClick={() => triggerButton('B', onPressB)}
                className={`absolute bottom-0 left-0 w-9 h-9 sm:w-10 sm:h-10 bg-[#7f001c] rounded-full shadow-[inset_-2px_-2px_4px_rgba(255,255,255,0.2),_2px_2px_5px_rgba(0,0,0,0.4)] flex items-center justify-center text-gray-300 text-xs font-bold cursor-pointer border border-[#4a041c] transition-all duration-75 ${
                  pressedKeys.B
                    ? 'scale-90 shadow-inner translate-y-[1px] translate-x-[1px]'
                    : 'hover:brightness-110 active:scale-95'
                }`}
                aria-label="Button B"
              >
                B
              </button>
              <button
                onClick={() => triggerButton('A', onPressA)}
                className={`absolute top-0 right-0 w-9 h-9 sm:w-10 sm:h-10 bg-[#7f001c] rounded-full shadow-[inset_-2px_-2px_4px_rgba(255,255,255,0.2),_2px_2px_5px_rgba(0,0,0,0.4)] flex items-center justify-center text-gray-300 text-xs font-bold cursor-pointer border border-[#4a041c] transition-all duration-75 ${
                  pressedKeys.A
                    ? 'scale-90 shadow-inner translate-y-[1px] translate-x-[1px]'
                    : 'hover:brightness-110 active:scale-95'
                }`}
                aria-label="Button A"
              >
                A
              </button>
            </div>

            {/* Speaker Grill (center) — SP-style dot pattern */}
            <div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 flex flex-col gap-1.5 items-center">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-800 rounded-full shadow-inner opacity-80" />
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-800 rounded-full shadow-inner opacity-80" />
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-800 rounded-full shadow-inner opacity-80" />
              </div>
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-800 rounded-full shadow-inner opacity-80" />
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-800 rounded-full shadow-inner opacity-80" />
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-800 rounded-full shadow-inner opacity-80" />
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-800 rounded-full shadow-inner opacity-80" />
              </div>
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-800 rounded-full shadow-inner opacity-80" />
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-800 rounded-full shadow-inner opacity-80" />
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-800 rounded-full shadow-inner opacity-80" />
              </div>
            </div>

            {/* START and SELECT pills centered below speaker */}
            <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-6 sm:gap-8">
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => triggerButton('SELECT', onPressSelect)}
                  className={`w-10 sm:w-11 h-2.5 sm:h-3 bg-gray-800 rounded-full shadow-[inset_-1px_-1px_2px_rgba(255,255,255,0.2),_1px_1px_3px_rgba(0,0,0,0.4)] cursor-pointer outline-none transition-all duration-75 ${
                    pressedKeys.SELECT ? 'shadow-inner translate-y-[0.5px]' : ''
                  }`}
                  aria-label="Select button"
                />
                <span className="text-[8px] sm:text-[9px] text-gray-500 font-bold tracking-tighter select-none">SELECT</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => triggerButton('START', onPressStart)}
                  className={`w-10 sm:w-11 h-2.5 sm:h-3 bg-gray-800 rounded-full shadow-[inset_-1px_-1px_2px_rgba(255,255,255,0.2),_1px_1px_3px_rgba(0,0,0,0.4)] cursor-pointer outline-none transition-all duration-75 ${
                    pressedKeys.START ? 'shadow-inner translate-y-[0.5px]' : ''
                  }`}
                  aria-label="Start button"
                />
                <span className="text-[8px] sm:text-[9px] text-gray-500 font-bold tracking-tighter select-none">START</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* First-expansion ESC shortcut toast — centered, auto-dismisses */}
      <div
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-500 ease-out ${
          showEscToast
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-6'
        }`}
      >
        <div className="bg-[#1a1b20]/80 border border-gray-600/60 backdrop-blur-sm rounded-lg px-4 py-2 shadow-2xl flex items-center gap-2.5 font-mono">
          <kbd className="text-[8px] font-bold text-gray-300 bg-gray-700/80 px-1.5 py-0.5 rounded-[2px] border border-gray-500/40">
            ESC
          </kbd>
          <span className="text-[9px] text-gray-400 whitespace-nowrap">to collapse the console</span>
        </div>
      </div>

      {/* Pixel Dust particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {dustParticles.map((p) => (
          <div
            key={p.id}
            className="pixel-dust"
            style={{
              '--size': p.size,
              '--color': p.color,
              '--duration': p.duration,
              '--delay': p.delay,
              '--drift': p.drift,
              left: p.left,
              bottom: '-20px',
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Keyboard controls modal */}
      <div
        className={`fixed inset-0 z-40 flex items-center justify-center transition-all duration-300 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => {
          playRetroSound('beep');
          setShowControls(false);
        }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Modal card */}
        <div
          className={`relative bg-[#1a1b20] border-2 border-gray-600 rounded-lg p-5 sm:p-6 shadow-2xl max-w-xs w-full mx-4 transition-all duration-300 ${
            showControls ? 'scale-100' : 'scale-90'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-2">
            <h3 className="text-gray-300 font-bold font-mono text-[10px] sm:text-[11px] tracking-wider uppercase">
              Controls
            </h3>
            <button
              onClick={() => {
                playRetroSound('beep');
                setShowControls(false);
              }}
              className="text-gray-500 hover:text-gray-300 cursor-pointer transition-colors text-sm leading-none"
              title="Close"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2.5 font-mono text-[8px] sm:text-[9px]">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">ARROWS</span>
              <kbd className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded-[2px] border border-gray-600/50 font-bold">Move</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">[A] / [Z]</span>
              <kbd className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded-[2px] border border-gray-600/50 font-bold">Button A</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">[B] / [X]</span>
              <kbd className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded-[2px] border border-gray-600/50 font-bold">Button B</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">ENTER</span>
              <kbd className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded-[2px] border border-gray-600/50 font-bold">START</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">SPACE</span>
              <kbd className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded-[2px] border border-gray-600/50 font-bold">SELECT</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">ESC</span>
              <kbd className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded-[2px] border border-gray-600/50 font-bold">Collapse console</kbd>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-gray-700 text-center">
            <p className="text-[7px] text-gray-500 font-mono">Click outside or press ESC to close</p>
          </div>
        </div>
      </div>

    </div>
  );
}
