import React from 'react';

interface DPadProps {
  pressedKeys: Record<'UP' | 'DOWN' | 'LEFT' | 'RIGHT', boolean>;
  triggerButton: (btn: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', action?: () => void) => void;
  onPressDirection?: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
}

/**
 * Game Boy Advanced SP-style D-Pad cross controller.
 * 4 directional buttons with ribbed texture and center indent.
 */
export function DPad({ pressedKeys, triggerButton, onPressDirection }: DPadProps) {
  return (
    <div className="w-24 h-24 sm:w-28 sm:h-28">
      {/* Vertical bar (visual silhouette) */}
      <div className="absolute top-1/3 left-0 w-full h-1/3 bg-neutral-900 rounded-[3px] shadow-[inset_-2px_-2px_4px_rgba(255,255,255,0.1),_2px_2px_4px_rgba(0,0,0,0.4)] pointer-events-none" />
      {/* Horizontal bar (visual silhouette) */}
      <div className="absolute left-1/3 top-0 w-1/3 h-full bg-neutral-900 rounded-[3px] shadow-[inset_-2px_-2px_4px_rgba(255,255,255,0.1),_2px_2px_4px_rgba(0,0,0,0.4)] pointer-events-none" />
      {/* Center circular indent */}
      <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-neutral-950 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8)] pointer-events-none" />

      {/* UP */}
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

      {/* DOWN */}
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

      {/* LEFT */}
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

      {/* RIGHT */}
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
  );
}
