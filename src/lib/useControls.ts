import { useState, useEffect, useCallback, useRef } from 'react';
import { playRetroSound } from '../utils/audio';
import type { ControlButton } from '../components/FloatingControls';

const INITIAL_DELAY = 200; // ms before rapid D-Pad repeat kicks in
const REPEAT_RATE = 50; // ms between D-Pad repeats (20 Hz)
const PRESS_DURATION = 100; // ms visual pressed state for click-driven presses

interface UseControlsOptions {
  onPressA?: () => void;
  onPressB?: () => void;
  onPressStart?: () => void;
  onPressSelect?: () => void;
  onPressDirection?: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
  /** Called when Escape is pressed. If omitted, Escape is ignored. */
  onEscape?: () => void;
}

export function useControls({
  onPressA,
  onPressB,
  onPressStart,
  onPressSelect,
  onPressDirection,
  onEscape,
}: UseControlsOptions) {
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
    A: false, B: false, START: false, SELECT: false,
    UP: false, DOWN: false, LEFT: false, RIGHT: false,
  });

  // ── Visual press feedback ref (100ms pressed state for click-driven presses) ──
  const pressTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── D-Pad keyboard repeat refs ──
  const directionRepeatRef = useRef<Record<string, { initialTimer: ReturnType<typeof setTimeout>; repeatTimer: ReturnType<typeof setInterval> } | null>>({});

  // ── Cleanup all timers on unmount ──
  useEffect(() => {
    const ptRef = pressTimersRef.current;
    const drRef = directionRepeatRef.current;
    return () => {
      for (const key of Object.keys(ptRef)) {
        clearTimeout(ptRef[key]);
      }
      for (const key of Object.keys(drRef)) {
        const entry = drRef[key];
        if (entry) {
          clearTimeout(entry.initialTimer);
          clearInterval(entry.repeatTimer);
        }
      }
    };
  }, []);

  // ── triggerButton (click-driven presses) ──
  const triggerButton = useCallback(
    (btn: ControlButton, action?: () => void) => {
      const isAction = ['A', 'B', 'START', 'SELECT'].includes(btn);
      const isDirection = ['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(btn);

      // Audio feedback
      if (isAction) {
        playRetroSound('beep');
      } else if (isDirection) {
        playRetroSound('select');
      }

      // Visual press feedback — 100ms pressed state
      if (isAction || isDirection) {
        if (pressTimersRef.current[btn]) {
          clearTimeout(pressTimersRef.current[btn]);
        }
        setPressedKeys((k) => ({ ...k, [btn]: true }));
        pressTimersRef.current[btn] = setTimeout(() => {
          setPressedKeys((k) => ({ ...k, [btn]: false }));
          delete pressTimersRef.current[btn];
        }, PRESS_DURATION);
      }

      action?.();
    },
    [],
  );

  // ── Keyboard input ──
  useEffect(() => {
    // D-Pad repeat helpers (scoped inside this effect to capture latest callbacks)
    const startDirectionRepeat = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      stopDirectionRepeat(dir);
      const initialTimer = setTimeout(() => {
        const repeatTimer = setInterval(() => {
          onPressDirection?.(dir);
        }, REPEAT_RATE);
        if (directionRepeatRef.current[dir]) {
          directionRepeatRef.current[dir]!.repeatTimer = repeatTimer;
        }
      }, INITIAL_DELAY);
      directionRepeatRef.current[dir] = { initialTimer, repeatTimer: undefined as any };
    };

    const stopDirectionRepeat = (dir: string) => {
      const entry = directionRepeatRef.current[dir];
      if (entry) {
        clearTimeout(entry.initialTimer);
        if (entry.repeatTimer) clearInterval(entry.repeatTimer);
        directionRepeatRef.current[dir] = null;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      // D-Pad directions — skip browser-native repeat events
      if (e.key.startsWith('Arrow') && e.repeat) return;

      switch (e.key.toLowerCase()) {
        case 'arrowup':
          playRetroSound('select');
          setPressedKeys((k) => ({ ...k, UP: true }));
          onPressDirection?.('UP');
          startDirectionRepeat('UP');
          break;
        case 'arrowdown':
          playRetroSound('select');
          setPressedKeys((k) => ({ ...k, DOWN: true }));
          onPressDirection?.('DOWN');
          startDirectionRepeat('DOWN');
          break;
        case 'arrowleft':
          playRetroSound('select');
          setPressedKeys((k) => ({ ...k, LEFT: true }));
          onPressDirection?.('LEFT');
          startDirectionRepeat('LEFT');
          break;
        case 'arrowright':
          playRetroSound('select');
          setPressedKeys((k) => ({ ...k, RIGHT: true }));
          onPressDirection?.('RIGHT');
          startDirectionRepeat('RIGHT');
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
          onEscape?.();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'arrowup': setPressedKeys((k) => ({ ...k, UP: false })); stopDirectionRepeat('UP'); break;
        case 'arrowdown': setPressedKeys((k) => ({ ...k, DOWN: false })); stopDirectionRepeat('DOWN'); break;
        case 'arrowleft': setPressedKeys((k) => ({ ...k, LEFT: false })); stopDirectionRepeat('LEFT'); break;
        case 'arrowright': setPressedKeys((k) => ({ ...k, RIGHT: false })); stopDirectionRepeat('RIGHT'); break;
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
      // Clean up any lingering direction repeats
      for (const key of Object.keys(directionRepeatRef.current)) {
        stopDirectionRepeat(key);
      }
      // Clean up press timers
      for (const key of Object.keys(pressTimersRef.current)) {
        clearTimeout(pressTimersRef.current[key]);
      }
    };
  }, [onPressA, onPressB, onPressStart, onPressSelect, onPressDirection, onEscape]);

  return { pressedKeys, triggerButton };
}
