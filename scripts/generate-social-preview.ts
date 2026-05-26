/**
 * Generate social-preview.png for Open Graph / Twitter card sharing.
 *
 * Usage: npx tsx scripts/generate-social-preview.ts
 * Output: social-preview.png (1280×640) in the project root.
 */

import { generateSvgCard } from '../server/embed.js';
import sharp from 'sharp';

const W = 1280;
const H = 640;
const CARD_W = 460;
const CARD_H = 220;
const SCALE = 2.4; // card scaled to ~1104×528, leaving margins

const scaledCardW = Math.round(CARD_W * SCALE);
const scaledCardH = Math.round(CARD_H * SCALE);
const cardX = Math.round((W - scaledCardW) / 2);
const cardY = Math.round((H - scaledCardH) / 2) + 10; // slight nudge down for title

// Generate the card SVG using the same renderer as the embed endpoint
// Use "gittymon" as the demo username to show off the card style
const cardSvg = generateSvgCard('gittymon', 'ember');

// Build the composite social preview SVG
const compositeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none">
  <defs>
    <!-- Subtle grid pattern for the background -->
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <rect width="20" height="20" fill="#0f172a" />
      <rect width="1" height="1" x="0" y="0" fill="#1e293b" />
    </pattern>
    <!-- Drop shadow for the card -->
    <filter id="cardShadow" x="-5%" y="-5%" width="115%" height="115%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- Dark navy background with grid -->
  <rect width="${W}" height="${H}" fill="url(#grid)" />

  <!-- Decorative corner pixels (top-left) -->
  <g fill="#7f001c" opacity="0.4">
    <rect x="40" y="40" width="4" height="4" />
    <rect x="48" y="40" width="4" height="4" />
    <rect x="40" y="48" width="4" height="4" />
    <rect x="56" y="40" width="4" height="4" />
    <rect x="40" y="56" width="4" height="4" />
  </g>
  <!-- Decorative corner pixels (top-right) -->
  <g fill="#7f001c" opacity="0.4">
    <rect x="${W - 40}" y="40" width="4" height="4" />
    <rect x="${W - 48}" y="40" width="4" height="4" />
    <rect x="${W - 40}" y="48" width="4" height="4" />
    <rect x="${W - 56}" y="40" width="4" height="4" />
    <rect x="${W - 40}" y="56" width="4" height="4" />
  </g>
  <!-- Decorative corner pixels (bottom-left) -->
  <g fill="#7f001c" opacity="0.4">
    <rect x="40" y="${H - 40}" width="4" height="4" />
    <rect x="48" y="${H - 40}" width="4" height="4" />
    <rect x="40" y="${H - 48}" width="4" height="4" />
    <rect x="56" y="${H - 40}" width="4" height="4" />
    <rect x="40" y="${H - 56}" width="4" height="4" />
  </g>
  <!-- Decorative corner pixels (bottom-right) -->
  <g fill="#7f001c" opacity="0.4">
    <rect x="${W - 40}" y="${H - 40}" width="4" height="4" />
    <rect x="${W - 48}" y="${H - 40}" width="4" height="4" />
    <rect x="${W - 40}" y="${H - 48}" width="4" height="4" />
    <rect x="${W - 56}" y="${H - 40}" width="4" height="4" />
    <rect x="${W - 40}" y="${H - 56}" width="4" height="4" />
  </g>

  <!-- Title: Gittymon -->
  <text x="${W / 2}" y="${cardY - 48}" fill="#e2dfde" font-family="monospace" font-size="28" font-weight="bold" text-anchor="middle" letter-spacing="4">GITTYMON</text>

  <!-- Subtitle tagline -->
  <text x="${W / 2}" y="${cardY - 24}" fill="#6b7280" font-family="monospace" font-size="12" text-anchor="middle" letter-spacing="2">YOUR GITHUB PROFILE — MONSTER-FIED</text>

  <!-- Card (scaled and positioned) -->
  <g transform="translate(${cardX}, ${cardY}) scale(${SCALE})" filter="url(#cardShadow)">
    ${cardSvg.replace(/<\/?svg[^>]*>/g, '')}
  </g>

  <!-- Bottom hint text -->
  <text x="${W / 2}" y="${cardY + scaledCardH + 40}" fill="#475569" font-family="monospace" font-size="11" text-anchor="middle" letter-spacing="2">gittymon.dev</text>
</svg>`;

// Convert SVG to PNG using sharp
async function generate() {
  console.log('Generating social preview...');

  // sharp can render SVG to PNG
  const pngBuffer = await sharp(Buffer.from(compositeSvg, 'utf-8'), { density: 72 })
    .png()
    .toBuffer();

  // Write to project root
  const fs = await import('fs');
  fs.writeFileSync('social-preview.png', pngBuffer);
  console.log(`✅ social-preview.png generated (${pngBuffer.length} bytes, ${W}×${H})`);
}

generate().catch((err) => {
  console.error('❌ Failed to generate social preview:', err);
  process.exit(1);
});
