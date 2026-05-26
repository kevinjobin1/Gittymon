import React from 'react';
import type { GitProvider } from '../../shared/types';

/**
 * Tiny 10×10 pixel-art provider icons matching the retro GBA aesthetic.
 * GitHub = dark cat silhouette. GitLab = orange tanuki face.
 */

// GitHub octocat face — 10×10 grid
// dark: #1a1a1a, transparent: empty
const GITHUB_PIXELS = `
··████████··
·██······██·
██·██████·██
██·██████·██
██········██
██··████··██
██·██··██·██
·██······██·
··██····██··
····████····
`.trim();

// GitLab tanuki face — 10×10 grid
// orange: #e24329, transparent: empty
const GITLAB_PIXELS = `
··████████··
·██·████·██·
██··████··██
██········██
██·██··██·██
██·████··██·
·██··██··██·
··██······██·
···██····██··
····████····
`.trim();

function parsePixelGrid(
  ascii: string,
  fillColor: string,
): { x: number; y: number }[] {
  const pixels: { x: number; y: number }[] = [];
  const rows = ascii.split('\n');
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] === '█') {
        pixels.push({ x, y });
      }
    }
  }
  return pixels;
}

interface ProviderIconProps {
  provider: GitProvider;
  size?: number; // pixel size (default 10)
  className?: string;
}

export function ProviderIcon({
  provider,
  size = 10,
  className = '',
}: ProviderIconProps) {
  const isGitHub = provider === 'github';
  const pixels = parsePixelGrid(
    isGitHub ? GITHUB_PIXELS : GITLAB_PIXELS,
    isGitHub ? '#1a1a1a' : '#e24329',
  );
  const maxX = Math.max(...pixels.map((p) => p.x)) + 1;
  const maxY = Math.max(...pixels.map((p) => p.y)) + 1;

  // Scale so the icon fits within 'size' pixels (height-based)
  const ps = Math.max(1, Math.round(size / maxY));
  const w = maxX * ps;
  const h = maxY * ps;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      className={`inline-block shrink-0 ${className}`}
      style={{ imageRendering: 'pixelated' }}
      aria-label={isGitHub ? 'GitHub' : 'GitLab'}
    >
      {pixels.map((p, i) => (
        <rect
          key={i}
          x={p.x * ps}
          y={p.y * ps}
          width={ps}
          height={ps}
          fill={isGitHub ? '#1a1a1a' : '#e24329'}
        />
      ))}
    </svg>
  );
}
