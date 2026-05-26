/* ------------------------------------------------------------------ */
/*  Barrel exports for map modules                                     */
/* ------------------------------------------------------------------ */

// Types
export type {
  MonType,
  Gittymon,
  CosmicParticle,
  LogMessage,
  SpriteFrames,
} from './types';

// Color utilities
export {
  adjustColor,
  getColorName,
  getTypeLabel,
} from './colorUtils';

// Sprite data
export {
  SPRITES,
  getSpriteFrames,
} from './spriteData';

// Sprite rendering
export {
  drawSprite,
  drawGlow,
  drawShadow,
  drawReactionBubble,
  getMonsterDisplay,
} from './spriteRenderer';

// Monster AI
export {
  spawnInitialMonsters,
  updateMonsters,
  scatterMonstersFromClick,
} from './monsterAI';

// Particle system
export {
  spawnBackgroundParticles,
  spawnClickParticles,
  spawnTrailSpark,
  updateAndRenderParticles,
} from './particleSystem';

// Background renderer
export type { RenderContext } from './backgroundRenderer';
export { renderFrame } from './backgroundRenderer';

// React components
export { LogNotifications } from './LogNotifications';

// Canvas game hook
export type {
  UseCanvasGameOptions,
  UseCanvasGameReturn,
} from './useCanvasGame';
export { useCanvasGame } from './useCanvasGame';
