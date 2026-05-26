/** The four monster types */
export type MonType = 'trex' | 'slime' | 'octo' | 'bat';

/** A roaming pixel-art monster on the background map */
export interface Gittymon {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  type: MonType;
  state: 'walking' | 'idle' | 'panic';
  color: string;
  speed: number;
  frameTimer: number;
  frame: number;
  idleTimer: number;
  lastDir: 'L' | 'R';
  jumpY: number;
  jumpVelocity: number;
  panicTimer: number;
  clickReactionText?: string;
  clickReactionTimer: number;
}

/** A floating code particle or dot on the background */
export interface CosmicParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  text?: string;
  color: string;
}

/** A dev-speak log notification */
export interface LogMessage {
  id: string;
  name: string;
  color: string;
  message: string;
  timestamp: string;
}

/** Sprite frames keyed by monster type + frame index */
export type SpriteFrames = Record<MonType, [string[], string[]]>;
