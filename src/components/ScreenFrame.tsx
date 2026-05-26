import React, { useState, useEffect, useRef, useCallback } from 'react';
import GitHubButton from 'react-github-btn';
import { playRetroSound, isAudioEnabled, toggleAudioMute } from '../utils/audio';

interface ScreenFrameProps {
  children: React.ReactNode;
  isSynced: boolean;
  isBooting: boolean;
  isExpanded: boolean;
  focusDone: boolean;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

/**
 * Top half of the GBA SP clamshell: screen bezel, status bar,
 * boot animation, game display area, and the GITTENDO ADVANCED SP logo.
 */
export function ScreenFrame({
  children,
  isSynced,
  isBooting,
  isExpanded,
  focusDone,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: ScreenFrameProps) {
  const [soundOn, setSoundOn] = useState(isAudioEnabled());
  const [showControls, setShowControls] = useState(false);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const rippleIdRef = useRef(0);

  const handleToggleSound = () => {
    const isNowOn = toggleAudioMute();
    setSoundOn(isNowOn);
    playRetroSound('beep');
  };

  const closeControls = useCallback(() => {
    playRetroSound('beep');
    setShowControls(false);
  }, []);

  // Close controls modal on Escape key
  useEffect(() => {
    if (!showControls) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeControls();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showControls, closeControls]);

  return (
    <>
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
                  onClick={onZoomOut}
                  className="cursor-pointer hover:text-white transition-all active:scale-90 text-gray-400 hover:bg-gray-800 rounded px-1 leading-none"
                  title="Zoom out"
                >
                  <span className="text-[7px] sm:text-[8px] font-bold">−</span>
                </button>
                <button
                  onClick={onZoomReset}
                  className="cursor-pointer hover:text-white transition-all active:scale-90 text-gray-500 hover:bg-gray-800 rounded px-1 leading-none font-mono"
                  title={`Reset zoom (${Math.round(zoomLevel * 100)}%)`}
                >
                  <span className="text-[6px] sm:text-[7px] tabular-nums">{Math.round(zoomLevel * 100)}%</span>
                </button>
                <button
                  onClick={onZoomIn}
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

      {/* Keyboard controls modal */}
      <div
        className={`fixed inset-0 z-40 flex items-center justify-center transition-all duration-300 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeControls}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div
          className={`relative bg-[#1a1b20] border-2 border-gray-600 rounded-lg p-5 sm:p-6 shadow-2xl max-w-xs w-full mx-4 transition-all duration-300 ${
            showControls ? 'scale-100' : 'scale-90'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-2">
            <h3 className="text-gray-300 font-bold font-mono text-[10px] sm:text-[11px] tracking-wider uppercase">Controls</h3>
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
    </>
  );
}
