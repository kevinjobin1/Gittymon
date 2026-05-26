import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock factories — create fresh Web Audio API objects per test
// ---------------------------------------------------------------------------

function createMockOscillator() {
  return {
    type: '',
    frequency: {
      setValueAtTime: vi.fn().mockReturnThis(),
      linearRampToValueAtTime: vi.fn().mockReturnThis(),
      exponentialRampToValueAtTime: vi.fn().mockReturnThis(),
    },
    connect: vi.fn().mockReturnThis(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function createMockGainNode() {
  return {
    gain: {
      setValueAtTime: vi.fn().mockReturnThis(),
      linearRampToValueAtTime: vi.fn().mockReturnThis(),
      exponentialRampToValueAtTime: vi.fn().mockReturnThis(),
    },
    connect: vi.fn(),
  };
}

let mockOscillator: ReturnType<typeof createMockOscillator>;
let mockGainNode: ReturnType<typeof createMockGainNode>;
let mockAudioContext: {
  currentTime: number;
  state: string;
  createOscillator: ReturnType<typeof vi.fn>;
  createGain: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  destination: string;
};

/** Sets up window.AudioContext as a real constructor function */
function setupAudioContextMock() {
  mockOscillator = createMockOscillator();
  mockGainNode = createMockGainNode();

  mockAudioContext = {
    currentTime: 0,
    state: 'running',
    createOscillator: vi.fn(() => createMockOscillator()),
    createGain: vi.fn(() => createMockGainNode()),
    resume: vi.fn(),
    destination: 'mock-destination',
  };

  // Use a regular function so `new` works correctly in jsdom
  (window as any).AudioContext = function () {
    return mockAudioContext;
  };
  (window as any).webkitAudioContext = undefined;
}

// ---------------------------------------------------------------------------
// Import helper — use vi.resetModules() first so each call gets fresh state
// ---------------------------------------------------------------------------

async function getAudioModule() {
  vi.resetModules();
  return await import('./audio');
}

describe('audio module', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupAudioContextMock();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete (window as any).AudioContext;
    delete (window as any).webkitAudioContext;
  });

  // ===================================================================
  //  toggleAudioMute / isAudioEnabled
  // ===================================================================

  describe('toggleAudioMute / isAudioEnabled', () => {
    it('starts with audio enabled', async () => {
      const { isAudioEnabled } = await getAudioModule();
      expect(isAudioEnabled()).toBe(true);
    });

    it('toggleAudioMute flips the state and returns the new value', async () => {
      const { toggleAudioMute, isAudioEnabled } = await getAudioModule();
      const result1 = toggleAudioMute();
      expect(result1).toBe(false);
      expect(isAudioEnabled()).toBe(false);

      const result2 = toggleAudioMute();
      expect(result2).toBe(true);
      expect(isAudioEnabled()).toBe(true);
    });
  });

  // ===================================================================
  //  playRetroSound
  // ===================================================================

  describe('playRetroSound', () => {
    it('does nothing when AudioContext is not available', async () => {
      delete (window as any).AudioContext;
      const { playRetroSound } = await getAudioModule();
      expect(() => playRetroSound('beep')).not.toThrow();
    });

    it('creates oscillator and gain nodes for beep sound', async () => {
      const { playRetroSound } = await getAudioModule();
      playRetroSound('beep');
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('sets square wave type for beep', async () => {
      const { playRetroSound } = await getAudioModule();
      playRetroSound('beep');
      const osc = mockAudioContext.createOscillator.mock.results[0].value;
      expect(osc.type).toBe('square');
    });

    it('sets frequency 880 (A5) for beep', async () => {
      const { playRetroSound } = await getAudioModule();
      playRetroSound('beep');
      const osc = mockAudioContext.createOscillator.mock.results[0].value;
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(880, 0);
    });

    it('plays select sound with correct frequency sequence', async () => {
      const { playRetroSound } = await getAudioModule();
      playRetroSound('select');
      const osc = mockAudioContext.createOscillator.mock.results[0].value;
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(1046.5, 0);
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(1318.51, 0.04);
    });

    it('plays sweep sound with triangle wave and frequency ramp', async () => {
      const { playRetroSound } = await getAudioModule();
      playRetroSound('sweep');
      const osc = mockAudioContext.createOscillator.mock.results[0].value;
      expect(osc.type).toBe('triangle');
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(150, 0);
      expect(osc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(1200, 0.35);
    });

    it('plays hit sound with sawtooth wave and frequency ramp down', async () => {
      const { playRetroSound } = await getAudioModule();
      playRetroSound('hit');
      const osc = mockAudioContext.createOscillator.mock.results[0].value;
      expect(osc.type).toBe('sawtooth');
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(120, 0);
      expect(osc.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(40, 0.15);
    });

    it('plays summon sound with arpeggio frequency sequence', async () => {
      const { playRetroSound } = await getAudioModule();
      playRetroSound('summon');
      const osc = mockAudioContext.createOscillator.mock.results[0].value;
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(523.25, 0);
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(659.25, 0.08);
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(783.99, 0.16);
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(1046.5, 0.24);
    });

    it('plays defeat sound with descending frequency sequence', async () => {
      const { playRetroSound } = await getAudioModule();
      playRetroSound('defeat');
      const osc = mockAudioContext.createOscillator.mock.results[0].value;
      expect(osc.type).toBe('triangle');
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(392, 0);
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(349.23, 0.15);
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(293.66, 0.3);
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(220, 0.45);
    });

    it('plays boot sound with arpeggio chime', async () => {
      const { playRetroSound } = await getAudioModule();
      playRetroSound('boot');
      const osc = mockAudioContext.createOscillator.mock.results[0].value;
      expect(osc.type).toBe('square');
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(370, 0);
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(740, 0.08);
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(1480, 0.16);
    });

    it('plays accent sound with sine wave sweeping up', async () => {
      const { playRetroSound } = await getAudioModule();
      playRetroSound('accent');
      const osc = mockAudioContext.createOscillator.mock.results[0].value;
      expect(osc.type).toBe('sine');
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(440, 0);
      expect(osc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(880, 0.15);
    });

    it('connects oscillator to gain node and gain to destination', async () => {
      const { playRetroSound } = await getAudioModule();
      playRetroSound('beep');
      const osc = mockAudioContext.createOscillator.mock.results[0].value;
      const gain = mockAudioContext.createGain.mock.results[0].value;
      expect(osc.connect).toHaveBeenCalledWith(gain);
      expect(gain.connect).toHaveBeenCalledWith(mockAudioContext.destination);
    });

    it('starts and stops the oscillator', async () => {
      const { playRetroSound } = await getAudioModule();
      playRetroSound('beep');
      const osc = mockAudioContext.createOscillator.mock.results[0].value;
      expect(osc.start).toHaveBeenCalledWith(0);
      expect(osc.stop).toHaveBeenCalledWith(0.08);
    });
  });

  // ===================================================================
  //  BGM lifecycle
  // ===================================================================

  describe('BGM lifecycle', () => {
    it('startBgm sets up a chiptune interval', async () => {
      const { startBgm } = await getAudioModule();
      expect(vi.getTimerCount()).toBe(0);
      startBgm();
      expect(vi.getTimerCount()).toBe(1);
    });

    it('stopBgm clears the chiptune interval', async () => {
      const { startBgm, stopBgm } = await getAudioModule();
      startBgm();
      expect(vi.getTimerCount()).toBe(1);
      stopBgm();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('calling startBgm twice does not create a second interval', async () => {
      const { startBgm } = await getAudioModule();
      startBgm();
      startBgm();
      expect(vi.getTimerCount()).toBe(1);
    });

    it('playRetroSound calls startBgm, setting up the BGM engine', async () => {
      const { playRetroSound } = await getAudioModule();
      expect(vi.getTimerCount()).toBe(0);
      playRetroSound('beep');
      expect(vi.getTimerCount()).toBe(1);
    });

    it('setBgmIntensity to "battle" retriggers the timer with faster tempo', async () => {
      const { startBgm, setBgmIntensity } = await getAudioModule();
      startBgm();
      expect(vi.getTimerCount()).toBe(1);
      setBgmIntensity('battle');
      // Cleared old interval + created new = still 1 active timer
      expect(vi.getTimerCount()).toBe(1);
    });

    it('setBgmIntensity to same value is a no-op', async () => {
      const { startBgm, setBgmIntensity } = await getAudioModule();
      startBgm();
      const timerCountBefore = vi.getTimerCount();
      setBgmIntensity('normal'); // already 'normal' by default
      expect(vi.getTimerCount()).toBe(timerCountBefore);
    });
  });

  // ===================================================================
  //  AudioContext initialization edge cases
  // ===================================================================

  describe('AudioContext initialization', () => {
    it('uses webkitAudioContext when AudioContext is not available', async () => {
      delete (window as any).AudioContext;
      const mockWebkitCtx = { ...mockAudioContext };
      (window as any).webkitAudioContext = function () {
        return mockWebkitCtx;
      };

      const { playRetroSound } = await getAudioModule();
      playRetroSound('beep');
      expect(mockWebkitCtx.createOscillator).toHaveBeenCalled();
    });

    it('resumes suspended AudioContext', async () => {
      mockAudioContext.state = 'suspended';

      const { playRetroSound } = await getAudioModule();
      playRetroSound('beep');
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });
  });

  // ===================================================================
  //  stopBgm cleanup
  // ===================================================================

  describe('stopBgm', () => {
    it('can be called even if BGM was never started', async () => {
      const { stopBgm } = await getAudioModule();
      expect(() => stopBgm()).not.toThrow();
    });
  });
});
