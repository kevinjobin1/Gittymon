import { loadLeaderboard } from './leaderboard';
import { GIFEncoder } from 'gifenc';
import { Env } from './types';
import type { GitProvider } from '../shared/types';
import { getProvider } from './providers';
import {
  buildServerSpriteGrid,
  getSpriteSvgRects,
  wrapText,
  SERVER_PALETTES,
  SERVER_PALETTE_NAMES,
} from '../shared/sprites';
import type { ServerPaletteName } from '../shared/sprites';
import { BITMAPS, PixelCanvas, wrapTextToLength } from '../shared/pixelFont';

/** Clean a username using the appropriate provider's sanitization rules, falling back to GitHub */
function sanitizeUsername(username: string, provider?: GitProvider): string {
  const p = provider ? getProvider(provider) : getProvider('github');
  return p.sanitizeUsername(username.trim()) || 'x';
}

// ======== SVG Card Generator (MonDetailsView Layout) ========
export async function generateSvgCard(username: string, env: Env, palette?: string, provider?: GitProvider): Promise<string> {
  const cleanUsername = sanitizeUsername(username, provider);
  // Validate palette name
  const paletteOverride = palette && SERVER_PALETTE_NAMES.includes(palette as ServerPaletteName)
    ? (palette as ServerPaletteName) : undefined;
  const leaderboard = await loadLeaderboard(env.LEADERBOARD);
  const entry = leaderboard.find(e => e.username.toLowerCase() === cleanUsername.toLowerCase());

  const publicRepos = cleanUsername.length * 2 || 12;
  const followers = (cleanUsername.charCodeAt(0) % 20) || 4;
  const joinedYear = '2022';
  const codeHash = cleanUsername.length + publicRepos;
  const hp = Math.max(25, Math.min(99, 30 + (followers * 3) % 70));
  const attack = Math.max(25, Math.min(99, 40 + (publicRepos * 2) % 60));
  const defense = Math.max(25, Math.min(99, 50 + (parseInt(joinedYear) % 10) * 5));
  const speed = Math.max(25, Math.min(99, 45 + (cleanUsername.charCodeAt(0) % 50)));
  const chaos = Math.max(25, Math.min(99, 10 + (publicRepos * 5) % 90));

  const names = ['NodeSlime','Forkachu','AsyncPod','CommitoBat','Dockergon','GitSlasher','JSON_Golem','BugMander'];
  const monName = entry?.monName || names[codeHash % names.length];
  const types = ['Direct-to-master','AnyScript-Type','StackOverflow Cloner','Merge-Fearful','Coffee-Fueled','Infinite-Loop'];
  const type = types[cleanUsername.charCodeAt(0) % types.length];
  const level = entry?.level || Math.max(1, Math.min(99, Math.floor(publicRepos * 1.5 + followers)));
  const roasts = [
    'Only uses brute force push -m. Absolute terror to code reviews.',
    'Bio is standard default template. Crawls StackOverflow daily for solutions.',
    'Has zero comments, uses var instead of let. Legacy engine standby.',
    'Spends 5 hours styling tiny retro buttons instead of shipping real core features.',
    'Your commit messages are single letters. Git history looks like a ransom note.',
    'Writes code like its a typing test. Zero regard for the human maintainer.',
    'Your PR descriptions are three words max. Code review is archaeology.',
    'Uses nested ternaries like Russian nesting dolls. Nobody dares touch your files.'
  ];
  const roast = roasts[codeHash % roasts.length];
  const spriteSeed = `${cleanUsername}-${joinedYear}-${publicRepos}`;
  const spriteResult = buildServerSpriteGrid(spriteSeed, undefined, paletteOverride);
  const spriteSvgRects = getSpriteSvgRects(spriteResult.grid, spriteResult.palette);
  const W = 460, H = 220;

  const roastLines = wrapText(`"${roast}"`, 60).slice(0, 2);
  let roastSvg = '';
  roastLines.forEach((line, i) => {
    roastSvg += `<text x="8" y="${175 + i * 9}" fill="#6b7280" font-family="monospace" font-size="6.5" font-style="italic">${line}</text>\n`;
  });

  const typeText = type.length > 20 ? type.slice(0, 20).toUpperCase() : type.toUpperCase();
  const displayName = monName.length > 18 ? monName.slice(0, 18) : monName;

  // Stat bars
  const statEntries: Array<[string, number]> = [
    ['HP', hp], ['ATK', attack], ['DEF', defense], ['SPD', speed], ['CHA', chaos],
  ];
  let statBarsSvg = '';
  const barMaxW = 160, barH = 8, segments = 8, segW = Math.floor(barMaxW / segments);
  statEntries.forEach(([label, val], i) => {
    const y = 82 + i * (barH + 3);
    statBarsSvg += `<text x="114" y="${y + 6}" fill="#6b7280" font-family="monospace" font-size="6" font-weight="bold">${label}</text>\n`;
    statBarsSvg += `<rect x="138" y="${y}" width="${barMaxW}" height="${barH}" fill="#f3f4f6" stroke="#d1d5db" stroke-width="0.5" />\n`;
    for (let s = 0; s < segments; s++) {
      if (val >= (s + 1) * 12.5) {
        const fill = label === 'CHA' ? '#7f001c' : '#1a1a1a';
        statBarsSvg += `<rect x="${138 + s * segW}" y="${y + 1}" width="${segW - 1}" height="${barH - 2}" fill="${fill}" />\n`;
      }
    }
    statBarsSvg += `<text x="${138 + barMaxW + 18}" y="${y + 6}" fill="#1a1a1a" font-family="monospace" font-size="6" font-weight="bold" text-anchor="end">${val}</text>\n`;
  });

  // Mock moves
  const mockMoves = [
    { name: 'Git Commit', power: 75 },
    { name: 'Nuke Deps', power: 55 },
    { name: 'StackOverflow', power: 45 },
    { name: 'Coffee Refill', power: 25 },
  ];
  let movesSvg = '';
  let mx = 114, my = 141;
  const pillH = 8;
  mockMoves.forEach((move) => {
    const moveText = `${move.name.toUpperCase()} P${move.power}`;
    const textW = moveText.length * 3.3 + 8;
    if (mx + textW > W - 8) { mx = 114; my += pillH + 2; }
    movesSvg += `<rect x="${mx}" y="${my}" width="${Math.floor(textW)}" height="${pillH}" fill="#f3f4f6" stroke="#d1d5db" stroke-width="0.5" />\n`;
    movesSvg += `<text x="${mx + 3}" y="${my + pillH / 2 + 1}" fill="#7f001c" font-family="monospace" font-size="5.5" font-weight="bold" dominant-baseline="middle">${move.name.toUpperCase()}</text>\n`;
    const nameW = move.name.length * 3.3;
    movesSvg += `<text x="${mx + 3 + nameW + 2}" y="${my + pillH / 2 + 1}" fill="#9ca3af" font-family="monospace" font-size="5.5" dominant-baseline="middle">P${move.power}</text>\n`;
    mx += Math.floor(textW) + 2;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none">
  <rect width="${W}" height="${H}" fill="#ffffff" />
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" stroke="#1a1a1a" stroke-width="2" fill="none" />
  <rect x="2" y="2" width="${W - 4}" height="26" fill="#fafafa" />
  <text x="10" y="16" fill="#1a1a1a" font-family="monospace" font-size="13" font-weight="bold" dominant-baseline="middle">${displayName.toUpperCase()}</text>
  <text x="${W - 10}" y="16" fill="#7f001c" font-family="monospace" font-size="11" font-weight="bold" text-anchor="end" dominant-baseline="middle">LV ${level}</text>
  <line x1="4" y1="29" x2="${W - 4}" y2="29" stroke="#1a1a1a" stroke-width="1" />
  <rect x="8" y="34" width="96" height="96" fill="#ffffff" stroke="#1a1a1a" stroke-width="1" />
  <g transform="translate(8, 34)">${spriteSvgRects}</g>
  <rect x="80" y="128" width="22" height="8" fill="#ffffff" stroke="#1a1a1a" stroke-width="0.5" />
  <text x="91" y="132" fill="#1a1a1a" font-family="monospace" font-size="5" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${(paletteOverride || 'DMG').toUpperCase()} ◈</text>
  <text x="114" y="40" fill="#6b7280" font-family="monospace" font-size="7" font-weight="bold">TYPE:</text>
  <text x="144" y="40" fill="#7f001c" font-family="monospace" font-size="7" font-weight="bold">${typeText}</text>
  <text x="114" y="53" fill="#6b7280" font-family="monospace" font-size="7" font-weight="bold">REPOS/FOLLOWER:</text>
  <text x="192" y="53" fill="#1a1a1a" font-family="monospace" font-size="7" font-weight="bold">${publicRepos} / ${followers}</text>
  <text x="114" y="66" fill="#6b7280" font-family="monospace" font-size="7" font-weight="bold">BORN IN:</text>
  <text x="158" y="66" fill="#1a1a1a" font-family="monospace" font-size="7" font-weight="bold">${joinedYear} @ GitHub</text>
  ${statBarsSvg}
  ${movesSvg}
  <line x1="8" y1="167" x2="${W - 8}" y2="167" stroke="#d1d5db" stroke-width="0.5" stroke-dasharray="3,3" />
  ${roastSvg}
  <line x1="4" y1="192" x2="${W - 4}" y2="192" stroke="#1a1a1a" stroke-width="1" />
  <rect x="2" y="193" width="${W - 4}" height="${H - 195}" fill="#f5f5f5" />
  <text x="8" y="205" fill="#6b7280" font-family="monospace" font-size="7" font-weight="bold" dominant-baseline="middle">W:${entry?.wins || 0} L:${entry?.losses || 0}</text>
  <text x="${W - 8}" y="205" fill="#7f001c" font-family="monospace" font-size="7" font-weight="bold" text-anchor="end" dominant-baseline="middle">@${cleanUsername.toUpperCase()}</text>
</svg>`;
}

// ======== GIF Card Generator (MonDetailsView Layout, 230×110) ========
export async function generateGifCard(username: string, env: Env, palette?: string, provider?: GitProvider): Promise<Uint8Array> {
  const cleanUsername = sanitizeUsername(username, provider);
  // Validate palette name
  const paletteOverride = palette && SERVER_PALETTE_NAMES.includes(palette as ServerPaletteName)
    ? (palette as ServerPaletteName) : undefined;
  const spritePalette = paletteOverride
    ? SERVER_PALETTES[paletteOverride]
    : SERVER_PALETTES.dmg;
  const paletteLabel = (paletteOverride || 'dmg').toUpperCase();
  const leaderboard = await loadLeaderboard(env.LEADERBOARD);
  const entry = leaderboard.find(e => e.username.toLowerCase() === cleanUsername.toLowerCase());
  const publicRepos = cleanUsername.length * 2 || 12;
  const followers = (cleanUsername.charCodeAt(0) % 20) || 4;
  const joinedYear = '2022';
  const codeHash = cleanUsername.length + publicRepos;
  const hp = Math.max(25, Math.min(99, 30 + (followers * 3) % 70));
  const attack = Math.max(25, Math.min(99, 40 + (publicRepos * 2) % 60));
  const defense = Math.max(25, Math.min(99, 50 + (parseInt(joinedYear) % 10) * 5));
  const speed = Math.max(25, Math.min(99, 45 + (cleanUsername.charCodeAt(0) % 50)));
  const chaos = Math.max(25, Math.min(99, 10 + (publicRepos * 5) % 90));
  const names = ['NodeSlime','Forkachu','AsyncPod','CommitoBat','Dockergon','GitSlasher','JSON_Golem','BugMander'];
  const monName = entry?.monName || names[codeHash % names.length];
  const types = ['Direct-to-master','AnyScript-Type','StackOverflow Cloner','Merge-Fearful','Coffee-Fueled','Infinite-Loop'];
  const type = types[cleanUsername.charCodeAt(0) % types.length];
  const level = entry?.level || Math.max(1, Math.min(99, Math.floor(publicRepos * 1.5 + followers)));
  const roasts = [
    'Only uses brute force push -m. Absolute terror to code reviews.',
    'Bio is standard default template. Crawls StackOverflow daily for solutions.',
    'Has zero comments, uses var instead of let. Legacy engine standby.',
    'Spends 5 hours styling tiny retro buttons instead of shipping real core features.',
    'Your commit messages are single letters. Git history looks like a ransom note.',
    'Writes code like its a typing test. Zero regard for the human maintainer.',
    'Your PR descriptions are three words max. Code review is archaeology.',
    'Uses nested ternaries like Russian nesting dolls. Nobody dares touch your files.'
  ];
  const roast = roasts[codeHash % roasts.length];
  const spriteSeed = `${cleanUsername}-${joinedYear}-${publicRepos}`;
  const spriteResult = buildServerSpriteGrid(spriteSeed, undefined, paletteOverride);
  const spriteGrid = spriteResult.grid;
  const W = 230, H = 110;

  // Hex color to RGB array helper
  const hexToRgb = (hex: string): [number, number, number] => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };

  // Palette for GIF (white card style)
  // Indices 0-19: card chrome (fixed). Indices 20-23: sprite colors (dynamic per palette)
  const PALETTE = [
    [255, 255, 255], // 0: White bg
    [26, 26, 26],    // 1: Dark border / text
    [127, 0, 28],     // 2: Crimson accent
    [250, 250, 250],  // 3: Header bg
    [107, 114, 128],  // 4: Gray label
    [243, 244, 246],  // 5: Light gray (bars bg)
    [209, 213, 219],  // 6: Mid gray (borders)
    [245, 245, 245],  // 7: Footer bg
    [239, 68, 68],    // 8: Red
    [34, 197, 94],    // 9: Green
    [226, 223, 222],  // 10: Light text
    [15, 23, 42],     // 11: Dark navy
    [56, 189, 248],   // 12: Cyan
    [161, 161, 170],  // 13: Silver
    [250, 204, 21],   // 14: Gold
    [113, 113, 122],  // 15: Mid gray
    [39, 39, 42],     // 16: Dark bar
    [148, 163, 184],  // 17: Slate
    [34, 211, 238],   // 18: Bright cyan
    [156, 163, 175],  // 19: Muted gray
    // Dynamic sprite palette slots (filled per-request)
    hexToRgb(spritePalette[0]), // 20: outline
    hexToRgb(spritePalette[1]), // 21: body
    hexToRgb(spritePalette[2]), // 22: light
    hexToRgb(spritePalette[3]), // 23: accent
  ];

  const gif = new GIFEncoder();
  const NUM_FRAMES = 16;
  const bounceCurve = [0,-0.5,-1.5,-2.5,-3,-2.5,-1.5,-0.5,0,-0.5,-1.5,-2,-1.5,-0.5,0,-0.5];

  for (let f = 0; f < NUM_FRAMES; f++) {
    const canvas = new PixelCanvas(W, H);

    // White background
    canvas.fillRect(0, 0, W, H, 0);

    // Card border
    canvas.drawRect(0, 0, W, H, 1);

    // Header background
    canvas.fillRect(1, 1, W - 2, 10, 3);

    // Name (left)
    const trimmedName = monName.toUpperCase().slice(0, 12);
    canvas.drawText(trimmedName, 2, 3, 1);

    // LV (right)
    canvas.drawText(`LV${level}`, W - 4 - (`LV${level}`.length * 6), 3, 2);

    // Header separator
    for (let dx = 2; dx < W - 2; dx += 2) { canvas.setPixel(dx, 11, 1); }

    // Sprite with bounce (48×48 at 2px scale, centered-left)
    const bounceY = Math.floor(bounceCurve[f]);
    const spriteScale = 2;
    const spriteX = 4;
    const spriteY = 14;
    // Sprite border
    canvas.drawRect(spriteX - 1, spriteY - 1, 24 * spriteScale + 2, 24 * spriteScale + 2, 1);

    // Draw sprite
    for (let yGrid = 0; yGrid < 24; yGrid++) {
      for (let xGrid = 0; xGrid < 24; xGrid++) {
        const cell = spriteGrid[yGrid][xGrid];
        if (cell > 0) {
          // Dynamic sprite palette: 20=outline 21=body 22=light 23=accent/glow
          let ci: number;
          switch (cell) {
            case 1: ci = 20; break;        // outline
            case 2: ci = 21; break;        // body
            case 3: ci = 22; break;        // light
            case 4: case 5: ci = 23; break; // accent/glow
            default: ci = 20;              // fallback to outline
          }
          const dy = (yGrid < 17) ? bounceY : 0;
          canvas.setPixel(spriteX + xGrid, spriteY + yGrid + dy, ci);
        }
      }
    }

    // Palette badge on sprite
    canvas.fillRect(spriteX + 36, spriteY + 46, 11, 4, 0);
    canvas.drawRect(spriteX + 36, spriteY + 46, 11, 4, 1);
    canvas.drawText(paletteLabel, spriteX + 37, spriteY + 46, 20);

    // Info panel (right of sprite)
    const infoX = spriteX + 24 * spriteScale + 4;
    // TYPE
    canvas.drawText('TYPE:', infoX, 14, 4);
    const trimmedType = type.length > 10 ? type.substring(0, 10).toUpperCase() : type.toUpperCase();
    canvas.drawText(trimmedType, infoX + 4, 14, 2);

    // REPOS/FOLLOWER (compressed)
    canvas.drawText(`R/F:${publicRepos}/${followers}`, infoX, 20, 1);

    // BORN
    canvas.drawText(`BORN:${joinedYear}`, infoX, 26, 1);

    // Stat bars (compact)
    const statsLabels = [
      { l: 'HP', v: hp, y: 32 },
      { l: 'AT', v: attack, y: 36 },
      { l: 'DF', v: defense, y: 40 },
      { l: 'SD', v: speed, y: 44 },
      { l: 'CH', v: chaos, y: 48 },
    ];
    statsLabels.forEach((s) => {
      canvas.drawText(s.l, infoX, s.y, 4);
      const barY = s.y;
      canvas.fillRect(infoX + 14, barY, 40, 4, 5);
      const pct = Math.min(100, s.v) / 100;
      canvas.fillRect(infoX + 14, barY, Math.max(1, Math.floor(40 * pct)), 4, s.l === 'CH' ? 2 : 1);
      const valStr = `${s.v}`.padStart(2, ' ');
      canvas.drawText(valStr, infoX + 56, barY, 1);
    });

    // Move pills (top-right area, compact)
    const movePills = [
      { n: 'GIT', p: 75 },
      { n: 'NUKE', p: 55 },
    ];
    let mpx = W - 56, mpy = 14;
    movePills.forEach((m) => {
      canvas.fillRect(mpx, mpy, 16, 4, 5);
      canvas.drawRect(mpx, mpy, 16, 4, 6);
      canvas.drawText(m.n, mpx + 1, mpy, 2);
      canvas.drawText(`P${m.p}`, mpx + 1, mpy + 3, 1);
      mpy += 6;
    });

    // Dashed separator
    for (let dx = 2; dx < W - 2; dx += 4) { canvas.setPixel(dx, 62, 6); }

    // Roast
    canvas.fillRect(1, 63, W - 2, 34, 7);
    const roastUpper = roast.toUpperCase();
    const roastLines = wrapTextToLength(roastUpper, 24).slice(0, 4);
    roastLines.forEach((line, li) => {
      canvas.drawText(line, 2, 65 + li * 7, 3);
    });

    // Footer
    canvas.fillRect(1, 98, W - 2, 11, 7);
    canvas.drawText(`W${entry?.wins || 0}L${entry?.losses || 0}`, 2, 100, 4);
    canvas.drawText(`@${cleanUsername.toUpperCase().slice(0, 10)}`, W - 2 - (`@${cleanUsername.toUpperCase().slice(0, 10)}`.length * 6), 100, 2);

    gif.writeFrame(canvas.pixels, W, H, { palette: PALETTE, delay: 100 });
  }
  gif.finish();
  return gif.bytes();
}
