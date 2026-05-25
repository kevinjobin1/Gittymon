let audioCtx: AudioContext | null = null;
let chiptuneInterval: any = null;
let currentStep = 0;
let currentIntensity: 'normal' | 'battle' = 'normal';
let isPlayingBgm = false;
let audioEnabled = true;

const normalPattern = [
  { bass: 220.00, melody: 440.00 }, // A3, A4
  { bass: null,   melody: 523.25 }, // C5
  { bass: 220.00, melody: 659.25 }, // E5
  { bass: null,   melody: 523.25 },
  { bass: 261.63, melody: 523.25 }, // C3, C5
  { bass: null,   melody: 587.33 }, // D5
  { bass: 261.63, melody: 659.25 }, // E5
  { bass: null,   melody: 783.99 }, // G5
  { bass: 293.66, melody: 587.33 }, // D3, D5
  { bass: null,   melody: 698.46 }, // F5
  { bass: 293.66, melody: 783.99 }, // G5
  { bass: null,   melody: 698.46 },
  { bass: 329.63, melody: 659.25 }, // E3, E5
  { bass: null,   melody: 783.99 }, // G5
  { bass: 329.63, melody: 880.00 }, // A5
  { bass: null,   melody: 987.77 }, // B5
];

const battlePattern = [
  { bass: 110.00, melody: 440.00 }, // A2, A4
  { bass: 110.00, melody: 587.33 }, // D5
  { bass: 165.00, melody: 523.25 }, // E3, C5
  { bass: 165.00, melody: 493.88 }, // B4
  { bass: 110.00, melody: 440.00 },
  { bass: 110.00, melody: 587.33 },
  { bass: 165.00, melody: 523.25 },
  { bass: 165.00, melody: 659.25 }, // E5
  { bass: 146.83, melody: 587.33 }, // D3, D5
  { bass: 146.83, melody: 698.46 }, // F5
  { bass: 196.00, melody: 783.99 }, // G3, G5
  { bass: 196.00, melody: 880.00 }, // A5
  { bass: 130.81, melody: 523.25 }, // C3, C5
  { bass: 130.81, melody: 587.33 }, // D5
  { bass: 165.00, melody: 659.25 }, // E3, E5
  { bass: 220.00, melody: 880.00 }, // A3, A5
];

function triggerLoopTimer() {
  if (chiptuneInterval) {
    clearInterval(chiptuneInterval);
  }
  const stepTime = currentIntensity === 'battle' ? 125 : 170;
  chiptuneInterval = setInterval(() => {
    playChiptuneStep();
  }, stepTime);
}

function startBgmEngine() {
  if (isPlayingBgm) return;
  isPlayingBgm = true;
  currentStep = 0;
  triggerLoopTimer();
}

function playChiptuneStep() {
  const ctx = getAudioContext();
  if (!ctx || ctx.state === 'suspended' || !isPlayingBgm) return;

  const pattern = currentIntensity === 'battle' ? battlePattern : normalPattern;
  const step = currentStep % pattern.length;
  const note = pattern[step];
  const now = ctx.currentTime;

  if (note.melody !== null && audioEnabled) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = currentIntensity === 'battle' ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(note.melody, now);
    
    const volume = currentIntensity === 'battle' ? 0.022 : 0.013;
    gainNode.gain.setValueAtTime(volume, now);
    
    const stepDuration = currentIntensity === 'battle' ? 0.125 : 0.170;
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + stepDuration - 0.01);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + stepDuration);
  }

  if (note.bass !== null && audioEnabled) {
    const oscBass = ctx.createOscillator();
    const gainBass = ctx.createGain();
    
    oscBass.type = 'triangle';
    oscBass.frequency.setValueAtTime(note.bass, now);
    
    const bassVolume = currentIntensity === 'battle' ? 0.035 : 0.022;
    gainBass.gain.setValueAtTime(bassVolume, now);
    
    const stepDuration = currentIntensity === 'battle' ? 0.125 : 0.170;
    gainBass.gain.exponentialRampToValueAtTime(0.0001, now + stepDuration * 1.5);
    
    oscBass.connect(gainBass);
    gainBass.connect(ctx.destination);
    
    oscBass.start(now);
    oscBass.stop(now + stepDuration * 1.5);
  }

  if (audioEnabled) {
    const isBeatOfFour = step % 4 === 0;
    const isSnareBeat = step % 4 === 2;

    if (isBeatOfFour) {
      const kickOsc = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kickOsc.type = 'triangle';
      kickOsc.frequency.setValueAtTime(110, now);
      kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.06);
      
      kickGain.gain.setValueAtTime(currentIntensity === 'battle' ? 0.04 : 0.025, now);
      kickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
      
      kickOsc.connect(kickGain);
      kickGain.connect(ctx.destination);
      kickOsc.start(now);
      kickOsc.stop(now + 0.07);
    } else if (isSnareBeat) {
      const snareOsc = ctx.createOscillator();
      const snareGain = ctx.createGain();
      snareOsc.type = 'triangle';
      snareOsc.frequency.setValueAtTime(330, now);
      snareOsc.frequency.linearRampToValueAtTime(120, now + 0.05);
      
      snareGain.gain.setValueAtTime(currentIntensity === 'battle' ? 0.02 : 0.01, now);
      snareGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.057);
      
      snareOsc.connect(snareGain);
      snareGain.connect(ctx.destination);
      snareOsc.start(now);
      snareOsc.stop(now + 0.06);
    }
  }

  currentStep++;
}

export function startBgm() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
  startBgmEngine();
}

export function stopBgm() {
  isPlayingBgm = false;
  if (chiptuneInterval) {
    clearInterval(chiptuneInterval);
    chiptuneInterval = null;
  }
}

export function setBgmIntensity(intensity: 'normal' | 'battle') {
  if (currentIntensity === intensity) return;
  currentIntensity = intensity;
  if (isPlayingBgm) {
    triggerLoopTimer();
  }
}

export function toggleAudioMute(): boolean {
  audioEnabled = !audioEnabled;
  return audioEnabled;
}

export function isAudioEnabled(): boolean {
  return audioEnabled;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Classic retro arcade square wave synth sound
 */
export function playRetroSound(type: 'beep' | 'select' | 'accent' | 'hit' | 'summon' | 'sweep' | 'defeat' | 'boot') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Proactively back-fill background music starting on play retro sounds to guarantee permission authorization
    startBgm();

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'boot':
        // Classic Gameboy "ba-ding!" arpeggio chime
        osc.type = 'square';
        osc.frequency.setValueAtTime(370, now); // F#4
        osc.frequency.setValueAtTime(740, now + 0.08); // F#5
        osc.frequency.setValueAtTime(1480, now + 0.16); // F#6
        gainNode.gain.setValueAtTime(0.03, now);
        gainNode.gain.setValueAtTime(0.04, now + 0.08);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;

      case 'beep':
        // Short, clean keypress dot-matrix buzz
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now); // A5 note
        gainNode.gain.setValueAtTime(0.04, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
        break;

      case 'select':
        // Double pitch blip for confirmations
        osc.type = 'square';
        osc.frequency.setValueAtTime(1046.50, now); // C6
        osc.frequency.setValueAtTime(1318.51, now + 0.04); // E6
        gainNode.gain.setValueAtTime(0.04, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
        break;

      case 'accent':
        // Higher warning/alert accent note
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gainNode.gain.setValueAtTime(0.06, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;

      case 'sweep':
        // Standard upward attack sweep (used for summoning initialization or select start)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.35);
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
        break;

      case 'hit':
        // Low triangle crunch sound (battle hit impact)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.15);
        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
        break;

      case 'summon':
        // Heroic 8-bit arpeggio fanfare for monster loading success
        // Play three sequential notes
        osc.type = 'square';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.linearRampToValueAtTime(0.05, now + 0.24);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
        break;

      case 'defeat':
        // Downturn sad tune
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(392.00, now); // G4
        osc.frequency.setValueAtTime(349.23, now + 0.15); // F4
        osc.frequency.setValueAtTime(293.66, now + 0.3); // D4
        osc.frequency.setValueAtTime(220.00, now + 0.45); // A3
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.linearRampToValueAtTime(0.08, now + 0.45);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
        osc.start(now);
        osc.stop(now + 0.7);
        break;
    }
  } catch (e) {
    // Fail silently in case browser flags prevent AudioContext creation on locked sandboxes
    console.warn('Web Audio playback failed in this container:', e);
  }
}
