/**
 * Color manipulation helpers and display-name lookups for the map monsters.
 */

/** Shift a hex color by a percentage (positive = lighter, negative = darker) */
export function adjustColor(hex: string, percent: number): string {
  if (!hex.startsWith('#')) return hex;
  let num = parseInt(hex.slice(1), 16);
  if (isNaN(num)) return hex;

  const amt = Math.round(2.55 * percent);
  let R = (num >> 16) + amt;
  let G = ((num >> 8) & 0x00ff) + amt;
  let B = (num & 0x0000ff) + amt;

  R = Math.max(0, Math.min(255, R));
  G = Math.max(0, Math.min(255, G));
  B = Math.max(0, Math.min(255, B));

  return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
}

const COLOR_NAMES: Record<string, string> = {
  '#7ba4b5': 'DevOps Sky',
  '#c98286': 'Hotfix Ruby',
  '#8ca376': 'Clean Green',
  '#e8ece9': 'JSON Ghost',
  '#dbbc7f': 'Vanilla JS',
  '#9e8fa3': 'Syntactic Violet',
};

export function getColorName(hex: string): string {
  return COLOR_NAMES[hex] || 'Legacy Code';
}

const TYPE_LABELS: Record<string, string> = {
  trex: 'Repo-Rex',
  slime: 'Bug-Slime',
  octo: 'Octo-Branch',
  bat: 'Beta-Bat',
};

export function getTypeLabel(type: string): string {
  return TYPE_LABELS[type] || 'Gittymon';
}
