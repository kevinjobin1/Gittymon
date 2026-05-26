import React from 'react';

interface StartSelectButtonsProps {
  pressedKeys: { START: boolean; SELECT: boolean };
  onPressStart?: () => void;
  onPressSelect?: () => void;
  triggerButton: (btn: 'START' | 'SELECT', action?: () => void) => void;
}

/**
 * Game Boy Advanced SP-style START and SELECT pill-shaped buttons.
 * Centered below the speaker grill with inline labels.
 */
export function StartSelectButtons({
  pressedKeys,
  onPressStart,
  onPressSelect,
  triggerButton,
}: StartSelectButtonsProps) {
  return (
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
  );
}
