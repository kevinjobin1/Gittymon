/**
 * Regenerate example-card.svg and example-card.gif with the
 * MonDetailsView card style and palette cycling support.
 *
 * Usage: npx tsx scripts/generate-example-cards.ts
 */

import { generateSvgCard, generateGifCard } from '../server/embed.js';
import * as fs from 'fs';

const USERNAME = 'kevinjobin1';
const PALETTE = 'ember';

// ── SVG ──
console.log(`Generating example-card.svg for @${USERNAME} (palette: ${PALETTE})...`);
const svg = generateSvgCard(USERNAME, PALETTE);
fs.writeFileSync('example-card.svg', svg, 'utf-8');
console.log(`  ✅ example-card.svg (${Buffer.byteLength(svg, 'utf-8')} bytes)`);

// ── GIF ──
console.log(`Generating example-card.gif for @${USERNAME} (palette: ${PALETTE})...`);
const gifBuffer = generateGifCard(USERNAME, PALETTE);
fs.writeFileSync('example-card.gif', gifBuffer);
console.log(`  ✅ example-card.gif (${gifBuffer.length} bytes)`);

console.log('\nDone! Both example cards regenerated with MonDetailsView style.');
