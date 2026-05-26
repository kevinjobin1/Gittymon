import { loadLeaderboard } from './leaderboard';
import { GIFEncoder } from 'gifenc';
import { Env } from './types';
import {
  buildServerSpriteGrid,
  getSpriteSvgRects,
  wrapText,
} from '../shared/sprites';
import { BITMAPS, PixelCanvas, wrapTextToLength } from '../shared/pixelFont';

// ======== SVG Card Generator (Pokémon TCG Layout) ========
export async function generateSvgCard(username: string, env: Env): Promise<string> {
  const cleanUsername = (username.trim().replace(/[^a-zA-Z0-9-]/g, '')) || 'x';
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
  const spriteResult = buildServerSpriteGrid(spriteSeed);
  const spriteSvgRects = getSpriteSvgRects(spriteResult.grid, spriteResult.palette);
  const W = 460, H = 220;

  const roastLines = wrapText(roast.toUpperCase(), 48).slice(0, 2);
  let roastSvg = '';
  roastLines.forEach((line, i) => {
    roastSvg += `<text x="230" y="${194 + i * 8}" fill="#a1a1aa" font-family="monospace" font-size="7.5" font-style="italic" text-anchor="middle">${line}</text>\n`;
  });

  const typeLabel = type.length > 16 ? type.slice(0, 16).toUpperCase() : type.toUpperCase();
  const typeW = Math.max(40, typeLabel.length * 4.5 + 16);
  const typeX = (W - typeW) / 2;
  const hpColor = hp > 50 ? '#22c55e' : hp > 25 ? '#eab308' : '#ef4444';
  const hpW = Math.max(4, Math.floor(80 * (Math.min(100, hp) / 100)));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#0a0d16" />
      <stop offset="100%" stop-color="#05080f" />
    </linearGradient>
    <radialGradient id="cardShine" cx="50%" cy="18%" r="50%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.04)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0)" />
    </radialGradient>

  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" rx="10" fill="url(#bgGrad)" />
  <rect width="${W}" height="${H}" rx="10" fill="url(#cardShine)" />

  <!-- Card Border -->
  <rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="10" stroke="#27272a" stroke-width="2" fill="none" />

  <!-- Top Accent Bar -->
  <rect x="4" y="4" width="${W - 8}" height="3" fill="#7f001c" />

  <!-- Monster Name (big, left) -->
  <text x="16" y="24" fill="#ffffff" font-family="monospace" font-size="18" font-weight="bold">${monName.toUpperCase().slice(0, 16)}</text>

  <!-- HP / LV Badge (right) -->
  <rect x="${W - 120}" y="8" width="108" height="18" rx="5" fill="#1a1a1a" />
  <text x="${W - 112}" y="22" fill="#ef4444" font-family="monospace" font-size="11" font-weight="bold">&#9829;</text>
  <text x="${W - 98}" y="22" fill="#ffffff" font-family="monospace" font-size="11" font-weight="bold">${hp}</text>
  <text x="${W - 76}" y="22" fill="#52525b" font-family="monospace" font-size="11" font-weight="bold">|</text>
  <text x="${W - 58}" y="22" fill="#e2dfde" font-family="monospace" font-size="11" font-weight="bold">LV${level}</text>

  <!-- Separator -->
  <line x1="12" y1="34" x2="${W - 12}" y2="34" stroke="#1e293b" stroke-width="1" />

  <!-- Artwork Panel -->
  <rect x="140" y="34" width="180" height="108" rx="8" fill="#475569" />

  <!-- Procedural Sprite -->
  <g transform="translate(${(W - 96) / 2}, 40)">
    ${spriteSvgRects}
  </g>

  <!-- Type Badge -->
  <rect x="${typeX}" y="142" width="${typeW}" height="14" rx="7" fill="rgba(127,0,28,0.15)" stroke="#7f001c" stroke-width="0.5" />
  <text x="${W / 2}" y="153" fill="#7f001c" font-family="monospace" font-size="7" font-weight="bold" text-anchor="middle">${typeLabel}</text>

  <!-- HP Bar -->
  <text x="16" y="170" fill="#a1a1aa" font-family="monospace" font-size="7" font-weight="bold">HP</text>
  <rect x="34" y="164" width="80" height="10" rx="4" fill="#27272a" />
  <rect x="34" y="164" width="${hpW}" height="10" rx="4" fill="${hpColor}" />
  <text x="40" y="172" fill="#ffffff" font-family="monospace" font-size="7" font-weight="bold">${hp}</text>

  <!-- ATK / DEF / SPD / CHA Stats -->
  <text x="140" y="170" fill="#71717a" font-family="monospace" font-size="6.5" font-weight="bold">ATK</text>
  <text x="166" y="170" fill="#e2dfde" font-family="monospace" font-size="8" font-weight="bold">${attack}</text>

  <text x="210" y="170" fill="#71717a" font-family="monospace" font-size="6.5" font-weight="bold">DEF</text>
  <text x="236" y="170" fill="#e2dfde" font-family="monospace" font-size="8" font-weight="bold">${defense}</text>

  <text x="280" y="170" fill="#71717a" font-family="monospace" font-size="6.5" font-weight="bold">SPD</text>
  <text x="306" y="170" fill="#e2dfde" font-family="monospace" font-size="8" font-weight="bold">${speed}</text>

  <text x="350" y="170" fill="#71717a" font-family="monospace" font-size="6.5" font-weight="bold">CHA</text>
  <text x="376" y="170" fill="#e2dfde" font-family="monospace" font-size="8" font-weight="bold">${chaos}</text>

  <!-- W/L Record -->
  <text x="${W - 16}" y="170" fill="#52525b" font-family="monospace" font-size="7" font-weight="bold" text-anchor="end">W:${entry?.wins || 0} L:${entry?.losses || 0}</text>

  <!-- Roast / Description Box -->
  <rect x="16" y="180" width="${W - 32}" height="24" rx="4" fill="#1e1e24" stroke="#334155" stroke-width="0.5" />
  ${roastSvg}

  <!-- Footer -->
  <text x="16" y="214" fill="#52525b" font-family="monospace" font-size="6.5" font-weight="bold">@${cleanUsername.toUpperCase()}</text>
  <text x="${W - 16}" y="214" fill="#7f001c" font-family="monospace" font-size="7" font-weight="bold" text-anchor="end">&#9889; GITTYMON</text>
</svg>`;
}

// ======== GIF Card Generator ========
export async function generateGifCard(username: string, env: Env): Promise<Uint8Array> {
  const cleanUsername = (username.trim().replace(/[^a-zA-Z0-9-]/g, '')) || 'x';
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
  const spriteResult = buildServerSpriteGrid(spriteSeed);
  const spriteGrid = spriteResult.grid;
  const W = 230, H = 110;
  const PALETTE = [
    [10,13,22],[24,24,27],[127,0,28],[255,255,255],[30,41,59],[20,26,38],
    [26,26,26],[63,63,70],[226,223,222],[239,68,68],[250,204,21],[39,39,42],
    [161,161,170],[56,189,248],[113,113,122],[15,23,42],[34,197,94],[168,85,247],
    [34,211,238],[250,204,21],
  ];
  const gif = new GIFEncoder();
  const NUM_FRAMES = 16;
  const bounceCurve = [0,-0.5,-1.5,-2.5,-3,-2.5,-1.5,-0.5,0,-0.5,-1.5,-2,-1.5,-0.5,0,-0.5];

  for (let f = 0; f < NUM_FRAMES; f++) {
    const canvas = new PixelCanvas(W, H);
    canvas.fillRect(0, 0, W, H, 0);
    // Background dots
    for (let gy = 0; gy < H; gy += 8) {
      for (let gx = 0; gx < W; gx += 8) { if ((gx + gy + f * 3) % 24 < 12) canvas.setPixel(gx, gy, 15); }
    }
    // Outer frame
    canvas.fillRect(2, 2, W - 4, H - 4, 1);
    canvas.drawRect(2, 2, W - 4, H - 4, 7);
    // Top accent bar
    canvas.fillRect(3, 3, W - 6, 2, 2);

    // Name
    const trimmedName = monName.toUpperCase().slice(0, 14);
    canvas.drawText(trimmedName, 6, 8, 3);
    // HP/LV badge
    const hpStr = `${hp}`;
    canvas.drawText(`LV${level}`, W - 14 - hpStr.length * 6, 8, 12);
    canvas.drawText(`HP${hpStr}`, W - 14 - hpStr.length * 6 - 6 - 8, 8, 9);

    // Separator
    for (let dx = 4; dx < W - 4; dx += 2) canvas.setPixel(dx, 16, 11);

    // Sprite with bounce
    const bounceY = Math.floor(bounceCurve[f]);
    const shadowSquish = (bounceY < -2) ? 5 : 3;
    canvas.fillRect(79, 70 - shadowSquish, 14, 4, 15);
    canvas.setPixel(83, 70 - shadowSquish, 6);

    const spriteScale = 2;
    const spriteX = Math.floor((W - 24 * spriteScale) / 2);
    const spriteY = 22;
    for (let yGrid = 0; yGrid < 24; yGrid++) {
      for (let xGrid = 0; xGrid < 24; xGrid++) {
        const cell = spriteGrid[yGrid][xGrid];
        if (cell > 0) { let ci = 6; if (cell === 2) ci = 2; else if (cell === 3) ci = 3; const dy = (yGrid < 17) ? bounceY : 0; canvas.setPixel(spriteX + xGrid, spriteY + yGrid + dy, ci); }
      }
    }

    // Type below sprite
    const trimmedType = type.length > 10 ? type.substring(0, 10) : type;
    canvas.drawText(trimmedType.toUpperCase(), Math.floor((W - trimmedType.length * 6) / 2), 78, 2);

    // Stats row
    canvas.fillRect(4, 83, 70, 5, 11);
    const hpPct = Math.min(100, hp) / 100;
    const hpColor = hpPct > 0.5 ? 16 : hpPct > 0.25 ? 10 : 9;
    canvas.fillRect(4, 83, Math.max(2, Math.floor(70 * hpPct)), 5, hpColor);
    canvas.drawText(`HP${hp}`, 6, 84, 3);

    canvas.drawText(`ATK${attack}`, 82, 84, 3);
    canvas.drawText(`DEF${defense}`, 82, 90, 3);
    canvas.drawText(`SPD${speed}`, 147, 84, 3);
    canvas.drawText(`CHA${chaos}`, 147, 90, 3);

    const wlStr = `W${entry?.wins || 0}L${entry?.losses || 0}`;
    canvas.drawText(wlStr, W - 6 - wlStr.length * 6, 84, 14);

    // Roast
    canvas.fillRect(3, 96, W - 6, 11, 11);
    const fullRoastUpper = roast.toUpperCase();
    let visibleCount = fullRoastUpper.length;
    if (f < 12) visibleCount = Math.floor(fullRoastUpper.length * (f + 1) / 12);
    const visibleText = fullRoastUpper.substring(0, visibleCount);
    const wrapLines = wrapTextToLength(visibleText, 18).slice(0, 1);
    if (f % 3 < 2 && wrapLines.length > 0) {
      wrapLines[0] = wrapLines[0].padEnd(19, '_');
    }
    wrapLines.forEach((line, li) => canvas.drawText(line, 6, 98 + li * 6, 8));

    gif.writeFrame(canvas.pixels, W, H, { palette: PALETTE, delay: 100 });
  }
  gif.finish();
  return gif.bytes();
}
