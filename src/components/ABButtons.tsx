import React from 'react';

interface ABButtonsProps {
  pressedKeys: { A: boolean; B: boolean };
  onPressA?: () => void;
  onPressB?: () => void;
  triggerButton: (btn: 'A' | 'B', action?: () => void) => void;
}

/**
 * Game Boy Advanced SP-style A and B action buttons.
 * Angled layout with crimson concave buttons.
 */
export function ABButtons({ pressedKeys, onPressA, onPressB, triggerButton }: ABButtonsProps) {
  return (
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
  );
}
