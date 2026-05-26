import React, { useState, useEffect, useCallback, useRef } from 'react';
import { playRetroSound, isAudioEnabled, toggleAudioMute } from '../utils/audio';
import { useControls } from '../lib/useControls';
import { BackgroundMap } from './BackgroundMap';
import { GameScreen } from './GameScreen';
import { FloatingControls } from './FloatingControls';
import type { Gittymon } from './map/types';

interface DesktopLayoutProps {
  children: React.ReactNode;
  isSynced?: boolean;
  onPressA?: () => void;
  onPressB?: () => void;
  onPressStart?: () => void;
  onPressSelect?: () => void;
  onPressDirection?: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
  onBackgroundMonsterClick?: (monster: Gittymon) => void;
}

type Breakpoint = 'desktop' | 'tablet' | 'mobile';

function detectBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w >= 1024) return 'desktop';
  if (w >= 768) return 'tablet';
  return 'mobile';
}

/**
 * DesktopLayout — horizontal GBA-style shell.
 * Features:
 * - A full-viewport game screen area inside an indigo GBA shell
 * - A fixed bottom controls bar (docked) across all breakpoints
 * - Responsive breakpoints (desktop/tablet/mobile)
 */
export function DesktopLayout({
  children,
  isSynced = false,
  onPressA,
  onPressB,
  onPressStart,
  onPressSelect,
  onPressDirection,
  onBackgroundMonsterClick,
}: DesktopLayoutProps) {
  const [isBooting, setIsBooting] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [focusDone, setFocusDone] = useState(false);
  const [soundOn, setSoundOn] = useState(isAudioEnabled());
  const [showControlsModal, setShowControlsModal] = useState(false);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(detectBreakpoint);

  const [dustParticles, setDustParticles] = useState<Array<{
    id: number;
    left: string;
    delay: string;
    duration: string;
    drift: string;
    size: string;
    color: string;
  }>>([]);

  // ── Boot sequence ──
  useEffect(() => {
    const soundTimeout = setTimeout(() => {
      playRetroSound('boot');
    }, 900);
    const bootTimeout = setTimeout(() => {
      setIsBooting(false);
      setTimeout(() => setIsFocused(true), 120);
    }, 2600);
    return () => {
      clearTimeout(soundTimeout);
      clearTimeout(bootTimeout);
    };
  }, []);

  // ── Focus animation completion ──
  useEffect(() => {
    if (isFocused && !focusDone) {
      const timer = setTimeout(() => setFocusDone(true), 850);
      return () => clearTimeout(timer);
    }
  }, [isFocused, focusDone]);

  // ── Dust particles ──
  useEffect(() => {
    const colors = ['#38bdf8', '#fb7185', '#a3e635', '#dbbc7f', '#ffffff'];
    const particles = Array.from({ length: 22 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 8}s`,
      duration: `${6 + Math.random() * 8}s`,
      drift: `${(Math.random() - 0.5) * 80}px`,
      size: `${2 + Math.floor(Math.random() * 3)}px`,
      color: colors[i % colors.length],
    }));
    setDustParticles(particles);
  }, []);

  // ── Responsive breakpoint ──
  useEffect(() => {
    const handleResize = () => setBreakpoint(detectBreakpoint());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Sound toggle ──
  const handleToggleSound = useCallback(() => {
    const isNowOn = toggleAudioMute();
    setSoundOn(isNowOn);
    playRetroSound('beep');
  }, []);

  // ── showControlsModal ref for stable Escape callback ──
  const showControlsModalRef = useRef(showControlsModal);
  showControlsModalRef.current = showControlsModal;

  const { pressedKeys, triggerButton } = useControls({
    onPressA,
    onPressB,
    onPressStart,
    onPressSelect,
    onPressDirection,
    onEscape: () => { if (showControlsModalRef.current) setShowControlsModal(false); },
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh relative w-full p-0">
      {/* Background Map */}
      <BackgroundMap isExpanded onMonsterClick={onBackgroundMonsterClick} />

      {/* Vignette overlay — wider ellipse for horizontal GBA layout */}
      <div
        className="fixed inset-0 pointer-events-none z-[5]"
        style={{
          background:
            'radial-gradient(ellipse 85% 65% at 50% 42%, transparent 0%, rgba(10,8,30,0.5) 100%)',
        }}
      />

      {/* Main Layout */}
      <div
        className={`relative z-10 flex flex-col w-[clamp(340px,85vw,1260px)] h-[clamp(400px,88vh,1000px)] mx-auto overflow-hidden ${
          !focusDone
            ? isFocused
              ? 'animate-camera-focus'
              : 'opacity-30 scale-[0.88] blur-[6px]'
            : ''
        }`}
        style={{
          filter: focusDone
            ? 'drop-shadow(0 4px 24px rgba(0, 0, 0, 0.35)) drop-shadow(0 0 60px rgba(139, 137, 184, 0.18)) drop-shadow(0 0 100px rgba(56, 189, 248, 0.10))'
            : undefined,
          contain: 'layout style',
        }}
        onAnimationEnd={() => {
          if (isFocused && !focusDone) setFocusDone(true);
        }}
      >
        {/* GBA-style shell frame around the screen area */}
        <div className="flex-1 flex flex-col m-2 sm:m-3 min-h-0">
          <div
            className="gba-shell flex-1 min-h-0 flex flex-col rounded-2xl overflow-hidden"
            style={{
              boxShadow:
                'inset -4px -4px 10px rgba(0,0,0,0.12), inset 4px 4px 10px rgba(255,255,255,0.15), 6px 6px 18px rgba(0,0,0,0.4)',
            }}
          >
            {/* Screen Area */}
            <div className="flex-1 flex flex-col p-3 sm:p-4 min-h-0">
              <div className="gba-screen-bezel flex-1 min-h-0 rounded-xl flex flex-col p-2 sm:p-3 relative">
                {/* GBA Cartridge Slot — decorative detail at top of bezel */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-[clamp(80px,18vw,160px)] h-[3px] bg-[#161430] rounded-b-full opacity-60" />
                {/* Power LED — glowing green indicator dot at bottom-left of bezel */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                  {/* Glow ring */}
                  <div className="w-[6px] h-[6px] rounded-full bg-emerald-500 animate-led-pulse" />
                  {/* Embossed label */}
                  <span
                    className="gba-embossed-text text-[5px] font-bold opacity-25 select-none leading-none"
                    style={{ fontFamily: '"Courier Prime", monospace' }}
                  >
                    PWR
                  </span>
                </div>
                <GameScreen
                  isSynced={isSynced}
                  isBooting={isBooting}
                  focusDone={focusDone}
                  soundOn={soundOn}
                  onToggleSound={handleToggleSound}
                  onShowControls={() => setShowControlsModal(true)}
                >
                  {children}
                </GameScreen>

                {/* GBA logo under screen — embossed/molded into the shell */}
                <div
                  className="gba-embossed-text mt-2 text-[10px] sm:text-[11px] font-bold opacity-35 select-none flex items-center justify-center gap-2"
                  style={{ fontFamily: '"Courier Prime", monospace' }}
                >
                  <span className="opacity-50">◆</span>
                  <span>GITTENDO GAME BOY ADVANCE</span>
                  <span className="opacity-50">◆</span>
                </div>
              </div>
            </div>

            {/* Bottom controls bar — all breakpoints */}
            <FloatingControls
              pressedKeys={pressedKeys}
              onPressA={onPressA}
              onPressB={onPressB}
              onPressStart={onPressStart}
              onPressSelect={onPressSelect}
              onPressDirection={onPressDirection}
              triggerButton={triggerButton}
              breakpoint={breakpoint}
            />
          </div>
        </div>
      </div>

      {/* Keyboard Controls Modal */}
      {showControlsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center transition-all duration-300"
          onClick={() => {
            playRetroSound('beep');
            setShowControlsModal(false);
          }}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-[#1e1d3a] border-2 border-[#3a3870] rounded-xl p-5 sm:p-6 shadow-2xl max-w-xs w-full mx-4 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 border-b border-[#3a3870]/50 pb-2">
              <h3 className="text-gray-200 font-bold font-mono text-[10px] sm:text-[11px] tracking-wider uppercase">
                Controls
              </h3>
              <button
                onClick={() => {
                  playRetroSound('beep');
                  setShowControlsModal(false);
                }}
                className="text-[#8b89b8] hover:text-gray-200 cursor-pointer transition-colors text-sm leading-none"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2.5 font-mono text-[8px] sm:text-[9px]">
              <div className="flex justify-between items-center">
                <span className="text-[#8b89b8]">ARROWS</span>
                <kbd className="text-gray-200 bg-[#2d2b55] px-1.5 py-0.5 rounded-[2px] border border-[#3a3870]/50 font-bold">Move</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8b89b8]">[A] / [Z]</span>
                <kbd className="text-gray-200 bg-[#2d2b55] px-1.5 py-0.5 rounded-[2px] border border-[#3a3870]/50 font-bold">Button A</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8b89b8]">[B] / [X]</span>
                <kbd className="text-gray-200 bg-[#2d2b55] px-1.5 py-0.5 rounded-[2px] border border-[#3a3870]/50 font-bold">Button B</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8b89b8]">ENTER</span>
                <kbd className="text-gray-200 bg-[#2d2b55] px-1.5 py-0.5 rounded-[2px] border border-[#3a3870]/50 font-bold">START</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8b89b8]">SPACE</span>
                <kbd className="text-gray-200 bg-[#2d2b55] px-1.5 py-0.5 rounded-[2px] border border-[#3a3870]/50 font-bold">SELECT</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8b89b8]">ESC</span>
                <kbd className="text-gray-200 bg-[#2d2b55] px-1.5 py-0.5 rounded-[2px] border border-[#3a3870]/50 font-bold">Close modals</kbd>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-[#3a3870]/50 text-center">
              <p className="text-[7px] text-[#8b89b8]/60 font-mono">Click outside or press ESC to close</p>
            </div>
          </div>
        </div>
      )}

      {/* Pixel Dust Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {dustParticles.map((p) => (
          <div
            key={p.id}
            className="pixel-dust"
            style={
              {
                '--size': p.size,
                '--color': p.color,
                '--duration': p.duration,
                '--delay': p.delay,
                '--drift': p.drift,
                left: p.left,
                bottom: '-20px',
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
