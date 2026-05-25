import React, { useState, useEffect } from 'react';
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
  const [dustParticles, setDustParticles] = useState<Array<{
    id: number;
    left: string;
    delay: string;
    duration: string;
    drift: string;
    size: string;
    color: string;
  }>>([]);

  // Tactile button-pressed animation flags mapped from keyboard
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
    // Play boot sound chime at 0.9s
    const soundTimeout = setTimeout(() => {
      playRetroSound('boot');
    }, 900);

    // Boot finish loading after 2.6s
    const bootTimeout = setTimeout(() => {
      setIsBooting(false);
    }, 2600);

    return () => {
      clearTimeout(soundTimeout);
      clearTimeout(bootTimeout);
    };
  }, []);

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

  // Attach global keyboard listeners for complete immersive tactile emulation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling defaults on arrows and space to keep the emulator stable
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
        case ' ': // spacebar as SELECT
          setPressedKeys((k) => ({ ...k, SELECT: true }));
          onPressSelect?.();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'arrowup':
          setPressedKeys((k) => ({ ...k, UP: false }));
          break;
        case 'arrowdown':
          setPressedKeys((k) => ({ ...k, DOWN: false }));
          break;
        case 'arrowleft':
          setPressedKeys((k) => ({ ...k, LEFT: false }));
          break;
        case 'arrowright':
          setPressedKeys((k) => ({ ...k, RIGHT: false }));
          break;
        case 'z':
        case 'a':
          setPressedKeys((k) => ({ ...k, A: false }));
          break;
        case 'x':
        case 'b':
          setPressedKeys((k) => ({ ...k, B: false }));
          break;
        case 'enter':
          setPressedKeys((k) => ({ ...k, START: false }));
          break;
        case 'shift':
        case ' ':
          setPressedKeys((k) => ({ ...k, SELECT: false }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onPressA, onPressB, onPressStart, onPressSelect, onPressDirection]);

  // Touch triggers
  const triggerButton = (btn: 'A' | 'B' | 'START' | 'SELECT' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', action?: () => void) => {
    // Play button press sound
    if (['A', 'B', 'START', 'SELECT'].includes(btn)) {
      playRetroSound('beep');
    }
    action?.();
  };

  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-5 min-h-screen relative overflow-hidden w-full">
      {/* Animated roaming pixel background */}
      <BackgroundMap />

      {/* Outer physical console chassis shell */}
      <div className="console-shell w-[350px] sm:w-[395px] h-[670px] sm:h-[735px] p-4 sm:p-5 flex flex-col relative select-none z-10">
        
        {/* Top visual detail notches */}
        <div className="absolute top-4 left-4 right-4 flex justify-between px-2">
          <div className="w-16 sm:w-20 h-1 bg-gray-400 opacity-40 rounded-full" />
          <div className="w-16 sm:w-20 h-1 bg-gray-400 opacity-40 rounded-full" />
        </div>

        {/* Gray screen lens border bezel */}
        <div className="screen-lens w-full h-[330px] sm:h-[370px] mt-4 sm:mt-5 p-3 sm:p-4 flex flex-col items-center justify-center relative">
          
          {/* Lens horizontal structural details */}
          <div className="w-full h-5 flex justify-between items-center mb-1.5 px-1 sm:px-2">
            <div className="text-[7.5px] sm:text-[9.5px] text-gray-300 tracking-tighter font-mono uppercase truncate max-w-[150px] sm:max-w-[190px] 
              flex items-center gap-1 font-semi-bold
            " style={{ fontFamily: '"Courier Prime", monospace' }}>
              <GitHubButton className="flex items-center gap-1 opacity-85 hover:opacity-100 cursor-pointer hover:text-white transition-all bg-[#1a1b20] hover:bg-gray-800 px-2 py-0.5 rounded border border-gray-700 active:scale-95 text-[6.5px] sm:text-[8px] text-gray-300 font-bold" href="https://github.com/kevinjobin1/Gittymon" data-color-scheme="no-preference: dark_dimmed; light: dark_dimmed; dark: dark_dimmed;" data-icon="octicon-star" data-show-count="true" aria-label="Star kevinjobin1/Gittymon on GitHub">Star</GitHubButton>
            </div>
            {/* Top Right Bezel Status Widgets Area */}
            <div className="flex items-center gap-2 text-gray-400 text-[6.5px] sm:text-[8px] font-mono select-none" style={{ fontFamily: '"Courier Prime", monospace' }}>
              {/* Interactive Sound indicator */}
              <button 
                onClick={handleToggleSound}
                className="flex items-center gap-1 opacity-85 hover:opacity-100 cursor-pointer hover:text-white transition-all bg-[#1a1b20] hover:bg-gray-800 px-2 py-0.5 rounded border border-gray-700 active:scale-95 text-[6.5px] sm:text-[8px] text-gray-300 font-bold"
                title="Toggle 8-bit Sound Loop"
              >
                <span>AUDIO: {soundOn ? 'ON' : 'OFF'}</span>
              </button>
              
              {/* Git Sync dynamic LED status indicator */}
              <div className="flex items-center gap-1 bg-[#1a1b20] px-1 sm:px-1.5 py-0.5 rounded-sm border border-gray-700 select-none" title={isSynced ? 'GitHub Profile Synced Successfully' : 'No Active GitHub Profile Summoned'}>
                <div className={`w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full transition-all duration-500 ${
                  isSynced 
                    ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' 
                    : 'bg-red-500 shadow-[0_0_5px_#ef4444] animate-pulse'
                }`} />
                <span className="text-[6px] sm:text-[7.5px] font-bold text-gray-300 tracking-normal font-mono" style={{ fontFamily: '"Courier Prime", monospace' }}>
                  {isSynced ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>

        </div>
          </div>

          {/* Active Liquid Crystal Screen */}
          <div className="game-screen w-full h-[260px] sm:h-[295px] border-4 border-[#1a1a1a] relative overflow-hidden flex flex-col p-2 bg-[#f5f5f5]">
            {/* Ambient scanlines simulation overlays if desired */}
            <div className="lcd-grid" />
            
            {/* Inside React content node */}
            {isBooting ? (
              <div className="flex-1 flex flex-col items-center justify-between py-8 font-mono select-none bg-[#e2dfde] text-[#1a1a1a] relative overflow-hidden">
                {/* Micro LCD matrix lines texture */}
                <div className="absolute inset-0 bg-[#e2dfde] opacity-5 pointer-events-none" 
                     style={{ backgroundImage: 'repeating-linear-gradient(0deg, #1a1a1a, #1a1a1a 2px, transparent 2px, transparent 4px)' }} />
                
                <div className="flex-1 flex flex-col items-center justify-center w-full">
                  {/* Sliding classic logo */}
                  <div className="animate-logo-slide-down font-bold italic tracking-widest text-lg text-center flex flex-col items-center">
                    <span className="text-[#1a1a1a] text-xl font-black drop-shadow-[1px_1px_0px_#ffffff]" style={{ fontFamily: '"Courier Prime", monospace' }}>
                      Gittendo
                    </span>
                    <div className="h-[2.5px] w-14 bg-[#1a1a1a] mt-1" />
                  </div>
                </div>

                {/* Developer / License footer */}
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
        </div>

        {/* Gittendo Embossed logo branding */}
        <div className="w-full mt-3 sm:mt-4 flex items-center justify-center text-gray-500 text-[10px] sm:text-[11px] tracking-wider italic font-bold select-none opacity-80" style={{ fontFamily: '"Courier Prime", monospace' }}>
          Gittendo <span className="not-italic font-bold ml-1">®</span>
        </div>

        {/* Dynamic Buttons Interface */}
        <div className="flex-1 flex flex-col justify-start pt-3 sm:pt-4 px-1 relative">
          
          {/* Diagonal retro plastic speaker grill lines in the bottom right corner */}
          <div className="absolute bottom-6 right-3 sm:right-4 flex gap-1 -rotate-25 opacity-70">
            <div className="w-[5px] h-12 bg-gray-400 rounded-full shadow-inner" />
            <div className="w-[5px] h-12 bg-gray-400 rounded-full shadow-inner" />
            <div className="w-[5px] h-12 bg-gray-400 rounded-full shadow-inner" />
            <div className="w-[5px] h-12 bg-gray-400 rounded-full shadow-inner" />
            <div className="w-[5px] h-12 bg-gray-400 rounded-full shadow-inner" />
          </div>

          <div className="flex justify-between items-center w-full mb-3 sm:mb-4">
            
            {/* Authentic Nintendo Gameboy D-PAD */}
            <div className="relative w-24 h-24 sm:w-26 sm:h-26 ml-1 bg-gray-350 rounded-full border-2 border-gray-400 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.35),_1px_1px_1px_rgba(255,255,255,0.7)] flex items-center justify-center select-none">
              {/* Outer cross container holding the 4 buttons */}
              <div className="relative w-20 h-20 sm:w-21 sm:h-21">
                {/* Vertical Bar Base (visual silhouette) */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 w-7.5 h-20 sm:h-21 bg-neutral-900 rounded-[3px] shadow-[2px_2px_4px_rgba(0,0,0,0.4)] pointer-events-none" />
                
                {/* Horizontal Bar Base (visual silhouette) */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 w-20 sm:w-21 h-7.5 bg-neutral-900 rounded-[3px] shadow-[2px_2px_4px_rgba(0,0,0,0.4)] pointer-events-none" />

                {/* UP Directional Button */}
                <button
                  onClick={() => triggerButton('UP', () => onPressDirection?.('UP'))}
                  className={`absolute top-0 left-1/2 -translate-x-1/2 w-7.5 h-7 rounded-t-[3px] cursor-pointer flex flex-col justify-end items-center pb-1 transition-all ${
                    pressedKeys.UP 
                      ? 'bg-neutral-950 shadow-inner translate-y-[1px]' 
                      : 'bg-neutral-900 hover:bg-neutral-850 active:brightness-110'
                  }`}
                  aria-label="D-pad Up"
                >
                  {/* Ribbed lines: 3 thin horizontal lines */}
                  <div className="flex flex-col gap-[1.5px] mb-1 opacity-70">
                    <div className="w-3.5 h-[1.5px] bg-neutral-700" />
                    <div className="w-3.5 h-[1.5px] bg-neutral-700" />
                    <div className="w-3.5 h-[1.5px] bg-neutral-700" />
                  </div>
                </button>

                {/* DOWN Directional Button */}
                <button
                  onClick={() => triggerButton('DOWN', () => onPressDirection?.('DOWN'))}
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-7.5 h-7 rounded-b-[3px] cursor-pointer flex flex-col justify-start items-center pt-1 transition-all ${
                    pressedKeys.DOWN 
                      ? 'bg-neutral-950 shadow-inner -translate-y-[1px]' 
                      : 'bg-neutral-900 hover:bg-neutral-850 active:brightness-110'
                  }`}
                  aria-label="D-pad Down"
                >
                  {/* Ribbed lines */}
                  <div className="flex flex-col gap-[1.5px] mt-1 opacity-70">
                    <div className="w-3.5 h-[1.5px] bg-neutral-700" />
                    <div className="w-3.5 h-[1.5px] bg-neutral-700" />
                    <div className="w-3.5 h-[1.5px] bg-neutral-700" />
                  </div>
                </button>

                {/* LEFT Directional Button */}
                <button
                  onClick={() => triggerButton('LEFT', () => onPressDirection?.('LEFT'))}
                  className={`absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7.5 rounded-l-[3px] cursor-pointer flex justify-end items-center pr-1 transition-all ${
                    pressedKeys.LEFT 
                      ? 'bg-neutral-950 shadow-inner translate-x-[1px]' 
                      : 'bg-neutral-900 hover:bg-neutral-850 active:brightness-110'
                  }`}
                  aria-label="D-pad Left"
                >
                  {/* Ribbed lines: 3 thin vertical lines */}
                  <div className="flex gap-[1.5px] mr-1 opacity-70">
                    <div className="w-[1.5px] h-3.5 bg-neutral-700" />
                    <div className="w-[1.5px] h-3.5 bg-neutral-700" />
                    <div className="w-[1.5px] h-3.5 bg-neutral-700" />
                  </div>
                </button>

                {/* RIGHT Directional Button */}
                <button
                  onClick={() => triggerButton('RIGHT', () => onPressDirection?.('RIGHT'))}
                  className={`absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7.5 rounded-r-[3px] cursor-pointer flex justify-start items-center pl-1 transition-all ${
                    pressedKeys.RIGHT 
                      ? 'bg-neutral-950 shadow-inner -translate-x-[1px]' 
                      : 'bg-neutral-900 hover:bg-neutral-850 active:brightness-110'
                  }`}
                  aria-label="D-pad Right"
                >
                  {/* Ribbed lines */}
                  <div className="flex gap-[1.5px] ml-1 opacity-70">
                    <div className="w-[1.5px] h-3.5 bg-neutral-700" />
                    <div className="w-[1.5px] h-3.5 bg-neutral-700" />
                    <div className="w-[1.5px] h-3.5 bg-neutral-700" />
                  </div>
                </button>

                {/* Center Core Cap (with original Gameboy circular indent) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7.5 h-7.5 bg-neutral-900 pointer-events-none flex items-center justify-center">
                  <div className="w-5.5 h-5.5 rounded-full bg-neutral-950 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8),_0.5px_0.5px_0px_rgba(255,255,255,0.15)]" />
                </div>
              </div>
            </div>

            {/* Right Hand slanted plastic Pink action buttons (A & B) */}
            <div className="flex gap-3 sm:gap-4 -rotate-25 mr-3 sm:mr-4">
              
              {/* BUTTON B */}
              <div className="flex flex-col items-center gap-1.5 mt-4">
                <button
                  onClick={() => triggerButton('B', onPressB)}
                  className={`action-button w-9 h-9 sm:w-10 sm:h-10 rounded-full cursor-pointer relative shadow-md outline-none border ${
                    pressedKeys.B ? 'pressed scale-95 shadow-inner' : ''
                  }`}
                  aria-label="Button B"
                />
                <span className="text-gray-600 text-[10px] sm:text-[11px] font-bold tracking-tighter" style={{ fontFamily: '"Courier Prime", monospace' }}>
                  B
                </span>
              </div>

              {/* BUTTON A */}
              <div className="flex flex-col items-center gap-1.5 -mt-3">
                <button
                  onClick={() => triggerButton('A', onPressA)}
                  className={`action-button w-9 h-9 sm:w-10 sm:h-10 rounded-full cursor-pointer relative shadow-md outline-none border ${
                    pressedKeys.A ? 'pressed scale-95 shadow-inner' : ''
                  }`}
                  aria-label="Button A"
                />
                <span className="text-gray-600 text-[10px] sm:text-[11px] font-bold tracking-tighter" style={{ fontFamily: '"Courier Prime", monospace' }}>
                  A
                </span>
              </div>
            </div>
          </div>

          {/* SELECT and START rubber horizontal capsules pills at the bottom center */}
          <div className="flex justify-center gap-6 sm:gap-8 mt-1.5 z-10 w-full pr-12">
            
            {/* SELECT pill */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => triggerButton('SELECT', onPressSelect)}
                className={`pill-button w-10 sm:w-11 h-3 sm:h-3.5 outline-none cursor-pointer ${
                  pressedKeys.SELECT ? 'pressed shadow-inner' : ''
                }`}
                aria-label="Select button"
              />
              <span className="text-gray-600 text-[9px] font-extrabold tracking-tight mt-1.5" style={{ fontFamily: '"Courier Prime", monospace' }}>
                SELECT
              </span>
            </div>

            {/* START pill */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => triggerButton('START', onPressStart)}
                className={`pill-button w-10 sm:w-11 h-3 sm:h-3.5 outline-none cursor-pointer ${
                  pressedKeys.START ? 'pressed shadow-inner' : ''
                }`}
                aria-label="Start button"
              />
              <span className="text-gray-600 text-[9px] font-extrabold tracking-tight mt-1.5" style={{ fontFamily: '"Courier Prime", monospace' }}>
                START
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Magical retro Pixel Dust particles floating behind the console */}
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

      {/* Retro keyboard hint guide helper under Gameboy */}
      <div className="mt-4 text-center text-slate-500 font-mono text-[9px] leading-relaxed max-w-[280px] z-10">
        <p className="font-bold uppercase text-slate-700 tracking-wider mb-0.5">KEYBOARD CONTROLS:</p>
        <p>ARROWS = Move  |  [A] or [Z] = Button A</p>
        <p>[B] or [X] = Button B  |  ENTER = START  |  SPACE = SELECT</p>
      </div>
    </div>
  );
}
