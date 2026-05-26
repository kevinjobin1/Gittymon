import React from 'react';

export type ControlButton = 'A' | 'B' | 'START' | 'SELECT' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface FloatingControlsProps {
  pressedKeys: Record<string, boolean>;
  onPressA?: () => void;
  onPressB?: () => void;
  onPressStart?: () => void;
  onPressSelect?: () => void;
  onPressDirection?: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
  triggerButton: (btn: ControlButton, action?: () => void) => void;
  /** Responsive sizing hint — desktop gets larger controls, mobile/tablet use compact */
  breakpoint: 'desktop' | 'tablet' | 'mobile';
}

/**
 * Fixed bottom controls bar — docked across all breakpoints.
 * Replaces the old floating/draggable desktop widget with a unified
 * bottom-bar design matching the mobile layout concept.
 */
export function FloatingControls({
  pressedKeys,
  onPressA,
  onPressB,
  onPressStart,
  onPressSelect,
  onPressDirection,
  triggerButton,
  breakpoint,
}: FloatingControlsProps) {
  const size = breakpoint === 'desktop' ? 'desktop' : 'mobile';
  const maxW = breakpoint === 'desktop' ? 'max-w-sm' : 'max-w-md';

  return (
    <div className="gba-controls-bar">
      <div className={`flex items-center justify-between px-4 py-2 ${maxW} mx-auto`}>
        {/* D-Pad (left) */}
        <DPadCluster
          size={size}
          pressedKeys={pressedKeys}
          triggerButton={triggerButton}
          onPressDirection={onPressDirection}
        />

        {/* Start/Select (center) */}
        <StartSelectCluster
          size={size}
          pressedKeys={pressedKeys}
          triggerButton={triggerButton}
          onPressStart={onPressStart}
          onPressSelect={onPressSelect}
        />

        {/* A/B Buttons (right) — diagonal like original GameBoy */}
        <ABDiagonalCluster
          size={size}
          pressedKeys={pressedKeys}
          triggerButton={triggerButton}
          onPressA={onPressA}
          onPressB={onPressB}
        />
      </div>
    </div>
  );
}

// ── Shared sub-components ──

export interface DPadClusterProps {
  size: 'desktop' | 'mobile';
  pressedKeys: Record<string, boolean>;
  triggerButton: (btn: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', action?: () => void) => void;
  onPressDirection?: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
}

export function DPadCluster({ size, pressedKeys, triggerButton, onPressDirection }: DPadClusterProps) {
  const containerDims = size === 'mobile' ? 'w-[72px] h-[72px]' : 'w-[80px] h-[80px]';
  const btnSize = size === 'mobile' ? 'w-6 h-6' : 'w-7 h-7';
  const labelOffset = size === 'mobile' ? '-12px' : '-10px';
  const labelSize = size === 'mobile' ? 'text-[8px]' : 'text-[7px]';
  const gripLineClass = size === 'mobile' ? 'w-3.5 h-[1.5px]' : 'w-3.5 h-[1.5px]';
  const gripGapClass = size === 'mobile' ? 'gap-[1.5px]' : 'gap-[1.5px]';
  const gripBarClass = size === 'mobile' ? 'w-[1.5px] h-3.5' : 'w-[1.5px] h-3.5';

  // ── 3D cross bar tilt toward pressed direction ──
  const tiltX = (pressedKeys.UP ? 2.5 : 0) + (pressedKeys.DOWN ? -2.5 : 0);
  const tiltY = (pressedKeys.LEFT ? 2.5 : 0) + (pressedKeys.RIGHT ? -2.5 : 0);

  return (
    <div className={`relative ${containerDims} shrink-0`} style={{ perspective: '250px' }}>
      {/* Embossed direction labels — molded into the plastic around the D-Pad */}
      <span
        className={`gba-embossed-text absolute ${labelSize} font-bold opacity-30 select-none pointer-events-none`}
        style={{ top: labelOffset, left: '50%', transform: 'translateX(-50%)', fontFamily: '"Courier Prime", monospace' }}
      >
        ▲
      </span>
      <span
        className={`gba-embossed-text absolute ${labelSize} font-bold opacity-30 select-none pointer-events-none`}
        style={{ bottom: labelOffset, left: '50%', transform: 'translateX(-50%)', fontFamily: '"Courier Prime", monospace' }}
      >
        ▼
      </span>
      <span
        className={`gba-embossed-text absolute ${labelSize} font-bold opacity-30 select-none pointer-events-none`}
        style={{ left: labelOffset, top: '50%', transform: 'translateY(-50%)', fontFamily: '"Courier Prime", monospace' }}
      >
        ◀
      </span>
      <span
        className={`gba-embossed-text absolute ${labelSize} font-bold opacity-30 select-none pointer-events-none`}
        style={{ right: labelOffset, top: '50%', transform: 'translateY(-50%)', fontFamily: '"Courier Prime", monospace' }}
      >
        ▶
      </span>

      {/* D-Pad well — recessed molded plastic indentation */}
      <div className="absolute inset-0 rounded-lg bg-[#1a1930] shadow-[inset_2px_2px_6px_rgba(0,0,0,0.55),inset_-1px_-1px_3px_rgba(255,255,255,0.04)] pointer-events-none" />
      {/* Raised outer rim around the D-Pad well */}
      <div className="absolute -inset-[3px] rounded-lg border border-[#3a3870]/25 shadow-[0_1px_2px_rgba(255,255,255,0.04),0_2px_3px_rgba(0,0,0,0.35)] pointer-events-none" />

      {/* Cross bars — 3D tilt rocks toward the pressed direction like a real D-Pad */}
      <div
        className="absolute inset-0 pointer-events-none transition-[transform] duration-75"
        style={{
          transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
          transformOrigin: 'center',
        }}
      >
        <div
          className="absolute top-1/3 left-0 w-full h-1/3 rounded-[2px]"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(28,27,50,0.85) 30%, rgba(28,27,50,0.85) 70%, rgba(0,0,0,0.25) 100%)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 1px 1px rgba(0,0,0,0.3)',
          }}
        />
        <div
          className="absolute left-1/3 top-0 w-1/3 h-full rounded-[2px]"
          style={{
            background: 'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(28,27,50,0.85) 30%, rgba(28,27,50,0.85) 70%, rgba(0,0,0,0.25) 100%)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 1px 1px rgba(0,0,0,0.3)',
          }}
        />
      </div>

      {/* Center circular indent — molded pivot point */}
      <div
        className="absolute top-1/2 left-1/2 w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 40% 40%, rgba(0,0,0,0.5), rgba(28,27,50,0.95))',
          boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.7), 0 0 1px rgba(255,255,255,0.06)',
        }}
      />

      {/* Direction buttons with ribbed grip texture */}
      {(['UP', 'DOWN', 'LEFT', 'RIGHT'] as const).map((dir) => {
        const isVertical = dir === 'UP' || dir === 'DOWN';
        // Positioning + haptic depression on press (direction-aware push-in)
        const baseTransform = isVertical ? 'translateX(-50%)' : 'translateY(-50%)';
        const pressedTransform =
          dir === 'UP'
            ? `${baseTransform} translateY(1px) scale(0.9)`
            : dir === 'DOWN'
              ? `${baseTransform} translateY(-1px) scale(0.9)`
              : dir === 'LEFT'
                ? `${baseTransform} translateX(1px) scale(0.9)`
                : `${baseTransform} translateX(-1px) scale(0.9)`;
        const positionStyle: React.CSSProperties =
          dir === 'UP'
            ? { top: 0, left: '50%' }
            : dir === 'DOWN'
              ? { bottom: 0, left: '50%' }
              : dir === 'LEFT'
                ? { left: 0, top: '50%' }
                : { right: 0, top: '50%' };
        return (
          <button
            key={dir}
            onClick={() => triggerButton(dir, () => onPressDirection?.(dir))}
            className={`absolute ${btnSize} transition-[transform] duration-75 animate-btn-pulse dpad-btn ${
              pressedKeys[dir]
                ? 'bg-neutral-900/60 shadow-inner'
                : 'hover:bg-neutral-700/30 active:bg-neutral-800/50'
            } ${dir === 'UP' ? 'rounded-t-[3px]' : dir === 'DOWN' ? 'rounded-b-[3px]' : dir === 'LEFT' ? 'rounded-l-[3px]' : 'rounded-r-[3px]'}`}
            aria-label={`D-pad ${dir}`}
            style={{
              ...positionStyle,
              ...{ '--dpad-base': baseTransform } as React.CSSProperties,
              transform: pressedKeys[dir] ? pressedTransform : baseTransform,
              background: pressedKeys[dir]
                ? undefined
                : 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 50%, rgba(0,0,0,0.1) 100%)',
            }}
          >
            {/* Ribbed grip texture lines */}
            {isVertical ? (
              <div className={`flex flex-col ${gripGapClass} items-center justify-center h-full ${dir === 'UP' ? 'mb-0.5' : 'mt-0.5'} opacity-60`}>
                <div className={`${gripLineClass} bg-neutral-500/60 rounded-full`} />
                <div className={`${gripLineClass} bg-neutral-500/60 rounded-full`} />
                <div className={`${gripLineClass} bg-neutral-500/60 rounded-full`} />
              </div>
            ) : (
              <div className={`flex ${gripGapClass} items-center justify-center h-full ${dir === 'LEFT' ? 'mr-0.5' : 'ml-0.5'} opacity-60`}>
                <div className={`${gripBarClass} bg-neutral-500/60 rounded-full`} />
                <div className={`${gripBarClass} bg-neutral-500/60 rounded-full`} />
                <div className={`${gripBarClass} bg-neutral-500/60 rounded-full`} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface ABDiagonalClusterProps {
  size: 'desktop' | 'mobile';
  pressedKeys: Record<string, boolean>;
  triggerButton: (btn: 'A' | 'B', action?: () => void) => void;
  onPressA?: () => void;
  onPressB?: () => void;
}

/**
 * A/B buttons in diagonal layout matching the original GameBoy.
 * A is top-right, B is bottom-left, overlapping slightly.
 */
export function ABDiagonalCluster({ size, pressedKeys, triggerButton, onPressA, onPressB }: ABDiagonalClusterProps) {
  const btnDims = size === 'mobile' ? 'w-10 h-10' : 'w-9 h-9';
  const textSize = size === 'mobile' ? 'text-xs' : 'text-[10px]';
  // Container needs to be large enough for the two overlapping circles
  const containerDims = size === 'mobile' ? 'w-[76px] h-[76px]' : 'w-[68px] h-[68px]';

  const ridgeW = size === 'mobile' ? '54px' : '46px';
  const ridgeH = size === 'mobile' ? '8px' : '7px';
  const labelOffset = size === 'mobile' ? '-14px' : '-10px';
  const labelInset = size === 'mobile' ? '4px' : '2px';
  const labelSize = size === 'mobile' ? 'text-[9px]' : 'text-[7px]';

  return (
    <div className={`relative ${containerDims} shrink-0`}>
      {/* Embossed "A" label — molded into the plastic above the A button */}
      <span
        className={`gba-embossed-text absolute ${labelSize} font-bold opacity-30 select-none pointer-events-none`}
        style={{ top: labelOffset, right: labelInset, fontFamily: '"Courier Prime", monospace' }}
      >
        A
      </span>
      {/* Embossed "B" label — molded into the plastic below the B button */}
      <span
        className={`gba-embossed-text absolute ${labelSize} font-bold opacity-30 select-none pointer-events-none`}
        style={{ bottom: labelOffset, left: labelInset, fontFamily: '"Courier Prime", monospace' }}
      >
        B
      </span>
      {/* Connecting ridge/groove between A and B — molded plastic detail */}
      <div
        className="absolute top-1/2 left-1/2 rounded-full bg-[#2a2848] shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),0_2px_3px_rgba(0,0,0,0.25)] z-[1] pointer-events-none"
        style={{
          width: ridgeW,
          height: ridgeH,
          transform: 'translate(-50%, -50%) rotate(-45deg)',
        }}
      />
      {/* B button — bottom-left */}
      <button
        onClick={() => triggerButton('B', onPressB)}
        className={`absolute bottom-0 left-0 ${btnDims} bg-[#7f001c] rounded-full shadow-[inset_-2px_-2px_4px_rgba(255,255,255,0.2),_2px_2px_5px_rgba(0,0,0,0.4)] flex items-center justify-center text-white ${textSize} font-bold border border-[#4a041c] transition-all duration-75 animate-btn-pulse ${
          pressedKeys.B ? 'scale-90 shadow-inner translate-y-[1px] translate-x-[1px]' : 'hover:brightness-110 active:scale-95'
        } z-[2]`}
        aria-label="Button B"
      >
        B
      </button>
      {/* A button — top-right */}
      <button
        onClick={() => triggerButton('A', onPressA)}
        className={`absolute top-0 right-0 ${btnDims} bg-[#7f001c] rounded-full shadow-[inset_-2px_-2px_4px_rgba(255,255,255,0.2),_2px_2px_5px_rgba(0,0,0,0.4)] flex items-center justify-center text-white ${textSize} font-bold border border-[#4a041c] transition-all duration-75 animate-btn-pulse ${
          pressedKeys.A ? 'scale-90 shadow-inner translate-y-[1px] translate-x-[1px]' : 'hover:brightness-110 active:scale-95'
        } z-10`}
        aria-label="Button A"
      >
        A
      </button>
    </div>
  );
}

export interface StartSelectClusterProps {
  size: 'desktop' | 'mobile';
  pressedKeys: Record<string, boolean>;
  triggerButton: (btn: 'START' | 'SELECT', action?: () => void) => void;
  onPressStart?: () => void;
  onPressSelect?: () => void;
}

export function StartSelectCluster({ size, pressedKeys, triggerButton, onPressStart, onPressSelect }: StartSelectClusterProps) {
  const gap = size === 'mobile' ? 'gap-4' : 'gap-6';
  const shadowClass =
    size === 'mobile'
      ? 'shadow-inner'
      : 'shadow-[inset_-1px_-1px_2px_rgba(255,255,255,0.2),_1px_1px_3px_rgba(0,0,0,0.4)]';
  const wellDims = size === 'mobile' ? 'w-[54px] h-4' : 'w-[52px] h-3.5';
  const labelOffset = size === 'mobile' ? '-18px' : '-14px';
  const labelSize = size === 'mobile' ? 'text-[7px]' : 'text-[7px]';

  return (
    <div className="relative shrink-0">
      {/* Embossed "SELECT" label — molded into the plastic above the well, left side */}
      <span
        className={`gba-embossed-text absolute ${labelSize} font-bold opacity-30 select-none pointer-events-none`}
        style={{ top: labelOffset, left: '0%', fontFamily: '"Courier Prime", monospace' }}
      >
        SELECT
      </span>
      {/* Embossed "START" label — molded into the plastic above the well, right side */}
      <span
        className={`gba-embossed-text absolute ${labelSize} font-bold opacity-30 select-none pointer-events-none`}
        style={{ top: labelOffset, right: '0%', fontFamily: '"Courier Prime", monospace' }}
      >
        START
      </span>
      {/* Recessed well — molded plastic indentation for Start/Select pill buttons */}
      <div className={`absolute ${wellDims} top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1a1930] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.55),inset_-1px_-1px_2px_rgba(255,255,255,0.04)] pointer-events-none`} />
      {/* Raised outer rim around the Start/Select well */}
      <div className={`absolute ${wellDims} top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full -inset-x-[3px] -inset-y-[2px] border border-[#3a3870]/25 shadow-[0_1px_2px_rgba(255,255,255,0.04),0_2px_3px_rgba(0,0,0,0.35)] pointer-events-none`} />
      <div className={`relative flex items-center ${gap}`}>
        {(['SELECT', 'START'] as const).map((btn) => (
          <button
            key={btn}
            onClick={() => triggerButton(btn, btn === 'START' ? onPressStart : onPressSelect)}
            className={`relative w-8 h-2 bg-gray-700 rounded-full ${shadowClass} transition-all duration-75 animate-btn-pulse ${
              pressedKeys[btn] ? 'shadow-inner scale-95 translate-y-[0.5px]' : 'hover:brightness-110 active:scale-95'
            }`}
            aria-label={`${btn} button`}
          />
        ))}
      </div>
    </div>
  );
}
