import React, { useState, useRef, useCallback, useEffect } from 'react';
import GitHubButton from 'react-github-btn';
import { playRetroSound } from '../utils/audio';

interface GameScreenProps {
  children: React.ReactNode;
  isSynced: boolean;
  isBooting: boolean;
  focusDone: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
  onShowControls: () => void;
}

/**
 * Adaptive game screen area that fills available space.
 * Replaces the old SP clamshell ScreenFrame with a flexible,
 * container-filling approach. Boot animation plays within the
 * screen area at a scaled-down size.
 */
export function GameScreen({
  children,
  isSynced,
  isBooting,
  focusDone,
  soundOn,
  onToggleSound,
  onShowControls,
}: GameScreenProps) {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const rippleIdRef = useRef(0);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  // ── Scroll overflow detection ──
  const checkScrollOverflow = useCallback(() => {
    const el = scrollContentRef.current;
    if (!el) return;
    const hasOverflow = el.scrollHeight > el.clientHeight;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    setShowScrollHint(hasOverflow && !atBottom);
  }, []);

  useEffect(() => {
    const el = scrollContentRef.current;
    if (!el) return;

    // Initial check
    checkScrollOverflow();

    // Scroll listener
    el.addEventListener('scroll', checkScrollOverflow, { passive: true });

    // ResizeObserver to re-check when content changes
    const ro = new ResizeObserver(() => checkScrollOverflow());
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', checkScrollOverflow);
      ro.disconnect();
    };
  }, [checkScrollOverflow]);

  // Render the boot animation
  if (isBooting) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center relative overflow-hidden bg-[#e2dfde] rounded-lg">
        {/* Scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-15"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, #1a1a1a, #1a1a1a 2px, transparent 2px, transparent 4px)',
          }}
        />

        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <div className="animate-logo-slide-down font-bold italic tracking-widest text-center flex flex-col items-center">
            <span
              className="text-[#1a1a1a] font-black drop-shadow-[1px_1px_0px_#ffffff]"
              style={{ fontFamily: '"Courier Prime", monospace', fontSize: 'clamp(16px, 4vw, 28px)' }}
            >
              GITTENDO
            </span>
            <div className="h-[2.5px] w-14 bg-[#1a1a1a] mt-1" />
          </div>
        </div>
        <div
          className="text-[8px] sm:text-[9px] uppercase tracking-wider text-center opacity-0 animate-fade-in-delayed font-bold leading-normal mb-4"
          style={{ fontFamily: '"Courier Prime", monospace' }}
        >
          © 2026 POWERED BY GROQ AI <br />
          GIT SUMMONED BY @KEVINJOBIN1
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden rounded-lg">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-b from-[#1e1d3a]/95 via-[#1e1d3a]/70 to-transparent select-none shrink-0">
        <div className="flex items-center gap-2">
          {/* GitHub Star Button */}
          <GitHubButton
            className="flex items-center gap-1 opacity-85 hover:opacity-100 transition-all bg-[#2d2b55]/70 hover:bg-[#3a3870]/70 px-2.5 py-1 rounded border border-[#4a4880]/40 active:scale-95 text-[8px] sm:text-[9px] text-gray-200 font-bold backdrop-blur-sm"
            href="https://github.com/kevinjobin1/Gittymon"
            data-color-scheme="no-preference: dark_dimmed; light: dark_dimmed; dark: dark_dimmed;"
            data-icon="octicon-star"
            data-show-count="true"
            aria-label="Star kevinjobin1/Gittymon on GitHub"
          >
            Star
          </GitHubButton>
        </div>

        <div className="flex items-center gap-2 text-[8px] sm:text-[9px] font-mono">
          {/* Audio Toggle */}
          <button
            onClick={onToggleSound}
            className="flex items-center gap-1 opacity-85 hover:opacity-100 transition-all bg-[#2d2b55]/70 hover:bg-[#3a3870]/70 px-2 py-1 rounded border border-[#4a4880]/40 active:scale-95 text-gray-200 font-bold backdrop-blur-sm"
            title="Toggle 8-bit Sound Loop"
          >
            <span>AUDIO: {soundOn ? 'ON' : 'OFF'}</span>
          </button>

          {/* Keyboard Controls Button */}
          <button
            onClick={(e) => {
              playRetroSound('select');
              onShowControls();
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              const id = ++rippleIdRef.current;
              setRipples((prev) => [...prev, { id, x, y }]);
              setTimeout(() => {
                setRipples((prev) => prev.filter((r) => r.id !== id));
              }, 500);
            }}
            className="relative flex items-center justify-center opacity-85 hover:opacity-100 transition-all bg-[#2d2b55]/70 hover:bg-[#3a3870]/70 w-6 h-6 rounded border border-[#4a4880]/40 active:scale-95 text-gray-200 font-bold backdrop-blur-sm overflow-hidden"
            title="Keyboard controls"
          >
            {ripples.map((r) => (
              <span key={r.id} className="ripple" style={{ left: r.x - 10, top: r.y - 10 }} />
            ))}
            <span className="relative z-[1] text-[9px]">?</span>
          </button>

          {/* Sync Indicator */}
          <div
            className="flex items-center gap-1 bg-[#2d2b55]/70 px-2 py-1 rounded border border-[#4a4880]/40 backdrop-blur-sm"
            title={isSynced ? 'GitHub Profile Synced' : 'No Active GitHub Profile'}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                isSynced
                  ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]'
                  : 'bg-red-500 shadow-[0_0_5px_#ef4444] animate-pulse'
              }`}
            />
            <span className="text-[7px] sm:text-[8px] font-bold text-gray-200 tracking-normal">
              {isSynced ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* Game Screen Content Area */}
      <div className="game-screen-sp flex-1 min-h-0 rounded-[3px] overflow-hidden flex flex-col bg-[#f5f5f5] relative mx-2 mb-2">
        <div className="lcd-grid" />
        <div
          ref={scrollContentRef}
          className="flex-1 min-h-0 flex flex-col relative z-10 w-full overflow-y-auto overflow-x-hidden pr-0.5"
        >
          {children}
        </div>
        {/* Scroll overflow hint — subtle glow when content extends below the fold */}
        <div
          className="scroll-hint-overlay"
          style={{ opacity: showScrollHint ? 1 : 0 }}
        />
      </div>
    </div>
  );
}
