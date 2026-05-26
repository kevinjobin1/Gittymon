import React, { useState, useEffect, useCallback, useRef } from 'react';
import { playRetroSound } from '../utils/audio';
import { useControls } from '../lib/useControls';
import { BackgroundMap } from './BackgroundMap';
import { ScreenFrame } from './ScreenFrame';
import { DPadCluster, ABDiagonalCluster, StartSelectCluster } from './FloatingControls';

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
  const [zoomLevel, setZoomLevel] = useState(1);
  const hasEverExpandedRef = useRef(false);

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

  const ZOOM_STEP = 0.1;

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

  useEffect(() => {
    if (isExpanded) recalcScale();
  }, [isExpanded, recalcScale]);

  useEffect(() => {
    if (isExpanded) {
      window.addEventListener('resize', recalcScale);
      return () => window.removeEventListener('resize', recalcScale);
    }
  }, [isExpanded, recalcScale]);

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

  const { pressedKeys, triggerButton } = useControls({
    onPressA,
    onPressB,
    onPressStart,
    onPressSelect,
    onPressDirection,
    onEscape: () => setIsExpanded(false),
  });

  const handleConsoleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    if (target.closest('button, .game-screen-sp, [role="button"], a, select, input')) return;
    setIsExpanded(true);
  }, []);

  const handleOutsideClick = useCallback(() => {
    setIsExpanded(false);
  }, []);

  return (
    <div
      className={`flex flex-col items-center justify-center p-3 sm:p-5 min-h-screen relative w-full ${!isExpanded ? 'overflow-hidden' : ''}`}
      onClick={focusDone && isExpanded ? handleOutsideClick : undefined}
    >
      <BackgroundMap isExpanded={isExpanded} />

      {/* Vignette overlay */}
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
        {/* ====== TOP HALF (Screen) — extracted ====== */}
        <ScreenFrame
          isBooting={isBooting}
          isSynced={isSynced}
          isExpanded={isExpanded}
          focusDone={focusDone}
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
        >
          {children}
        </ScreenFrame>

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
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-3 sm:h-4 bg-gray-400 rounded-full shadow-inner border border-gray-500" />

          <div className="relative w-full h-full mt-2 sm:mt-4">
            {/* D-Pad (left side) */}
            <div className="absolute top-6 sm:top-8 left-2 sm:left-4">
              <DPadCluster
                size="mobile"
                pressedKeys={pressedKeys}
                triggerButton={triggerButton}
                onPressDirection={onPressDirection}
              />
            </div>

            {/* A & B Buttons (right side) */}
            <div className="absolute top-6 sm:top-8 right-2 sm:right-4">
              <ABDiagonalCluster
                size="mobile"
                pressedKeys={pressedKeys}
                onPressA={onPressA}
                onPressB={onPressB}
                triggerButton={triggerButton}
              />
            </div>

            {/* Speaker Grill (center) */}
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

            {/* START and SELECT buttons */}
            <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2">
              <StartSelectCluster
                size="mobile"
                pressedKeys={pressedKeys}
                onPressStart={onPressStart}
                onPressSelect={onPressSelect}
                triggerButton={triggerButton}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ESC shortcut toast */}
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
    </div>
  );
}
