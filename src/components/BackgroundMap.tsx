import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// Helper to dynamically shift color brightness for shading and highlights
function adjustColor(hex: string, percent: number): string {
  if (!hex.startsWith('#')) return hex;
  let num = parseInt(hex.slice(1), 16);
  if (isNaN(num)) return hex;
  
  let amt = Math.round(2.55 * percent);
  let R = (num >> 16) + amt;
  let G = (num >> 8 & 0x00FF) + amt;
  let B = (num & 0x0000FF) + amt;
  
  R = Math.max(0, Math.min(255, R));
  G = Math.max(0, Math.min(255, G));
  B = Math.max(0, Math.min(255, B));
  
  return "#" + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
}

// Pixels data matrices for Gittymons (with highlights 'A', shadows 'S', accents 'P', pupil 'E')
const TREX_FRAME_1 = [
  "       AAAAAAA     ",
  "      AAXXAAXXAA   ",
  "     AAXXXXAXXOXA  ",
  "     AAXXXXEAXXAA  ",
  "     AAXXXXXXXXX   ",
  "      AAASSSS      ",
  "SS   AAXXXXXXS     ",
  "SSS AAXPPPPXXSS    ",
  "SSSSAXPPPPPXXS     ",
  " SSSXPPPPPPXSS     ",
  "  SSXXXXXXXXS      ",
  "   SXXXXSXXS       ",
  "   SSS  SSSSS      "
];
const TREX_FRAME_2 = [
  "       AAAAAAA     ",
  "      AAXXAAXXAA   ",
  "     AAXXXXAXXOXA  ",
  "     AAXXXXEAXXAA  ",
  "     AAXXXXXXXXX   ",
  "      AAASSSS      ",
  "SS   AAXXXXXXS     ",
  "SSS AAXPPPPXXSS    ",
  "SSSSAXPPPPPXXS     ",
  " SSSXPPPPPPXSS     ",
  "  SSXXXXXXXXS      ",
  "   SSXS  SXXS      ",
  "         SSSSS     "
];

const SLIME_FRAME_1 = [
  "     AAAAAAA     ",
  "   AAAAXXXXXAAA  ",
  "  AAXXXXAXXXXXXA ",
  " AAXXOXXAXXOXXXXA",
  " AAXEOXXAXXEOXXXA",
  " AAXXXXXAAXXXXSSA",
  " AAXXSSSSXXXXSSSA",
  "  ASSSSSSSSSSSSA ",
  "   SSSSSSSSSSS   "
];
const SLIME_FRAME_2 = [
  "                 ",
  "   AAAAAAA       ",
  "  AAXXXXXXAAA    ",
  " AAXXOXXAXXOXXXXA",
  " AAXEOXXAXXEOXXXA",
  " AAXXSSAAXXSXXSSA",
  "  ASSSSSSSSSSSSA ",
  "   SSSSSSSSSSS   "
];

const OCTO_FRAME_1 = [
  "     AAAAAAA     ",
  "   AAXXXXXXXAAA  ",
  "  AAXXXXAXXXXXXA ",
  " AAXXOXXAXXOXXXXA",
  " AAXEOXXAXXEOXXXA",
  " AAXXXXXAAXXXXXSA",
  "  SSXSSXSSXSSXS  ",
  "  SS SP SP SP S  "
];
const OCTO_FRAME_2 = [
  "     AAAAAAA     ",
  "   AAXXXXXXXAAA  ",
  "  AAXXXXAXXXXXXA ",
  " AAXXOXXAXXOXXXXA",
  " AAXEOXXAXXEOXXXA",
  " AAXXXXXAAXXXXXSA",
  "   SSXSSXSSXSS   ",
  "   SP SP SP SP   "
];

const BAT_FRAME_1 = [
  "A           A",
  "AA   AAA   AA",
  "AXAAXAXAXAAXA",
  "SXXXXXXXXXXXS",
  " SSXXOEXOXXS ",
  "  PXXXXXXXP  ",
  " P  SSSSS  P ",
  "     SSS     "
];
const BAT_FRAME_2 = [
  "  PXXXXXXXP  ",
  " P  SSSSS  P ",
  "     SSS     ",
  "A           A",
  "AA   AAA   AA",
  "AXAAXAXAXAAXA",
  "SXXXXXXXXXXXS",
  " SSXXOEXOXXS "
];

interface Gittymon {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  type: 'trex' | 'slime' | 'octo' | 'bat';
  state: 'walking' | 'idle' | 'panic';
  color: string;
  speed: number;
  frameTimer: number;
  frame: number;
  idleTimer: number;
  lastDir: 'L' | 'R';
  // Interactive additions
  jumpY: number;
  jumpVelocity: number;
  panicTimer: number;
  clickReactionText?: string;
  clickReactionTimer: number;
}

interface CosmicParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  text?: string;
  color: string;
}

const getColorName = (hex: string) => {
  const map: Record<string, string> = {
    '#7ba4b5': 'DevOps Sky',
    '#c98286': 'Hotfix Ruby',
    '#8ca376': 'Clean Green',
    '#e8ece9': 'JSON Ghost',
    '#dbbc7f': 'Vanilla JS',
    '#9e8fa3': 'Syntactic Violet'
  };
  return map[hex] || 'Legacy Code';
};

const getTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    trex: 'Repo-Rex',
    slime: 'Bug-Slime',
    octo: 'Octo-Branch',
    bat: 'Beta-Bat'
  };
  return map[type] || 'Buggymon';
};

interface LogMessage {
  id: string;
  name: string;
  color: string;
  message: string;
  timestamp: string;
}

export function BackgroundMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [windowSize, setWindowSize] = useState({ width: 800, height: 600 });
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [mapFocused, setMapFocused] = useState(false);
  const gittymonsRef = useRef<Gittymon[]>([]);
  const particlesRef = useRef<CosmicParticle[]>([]);
  
  // Ref to track mouse position directly in canvas event loop avoiding trigger rerender
  const mouseRef = useRef({ x: -1000, y: -1000, active: false, idleTicks: 120 });

  // Update size
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen to mousemove and click globally to support roaming Gittymon interactions
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
      mouseRef.current.idleTicks = 0; // reset idle

      const target = e.target as HTMLElement;
      const isOverConsole = !!(target && target.closest('.console-shell'));
      setMapFocused(!isOverConsole);
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
      setMapFocused(false);
    };

    const handleGlobalClick = (e: MouseEvent) => {
      // Ignore click if it happened inside the console chassis / game controller
      const target = e.target as HTMLElement;
      if (target && target.closest('.console-shell')) {
        return;
      }

      // Find canvas coordinates
      const clickX = e.clientX;
      const clickY = e.clientY;

      // Check proximity to Gittymons to see if we clicked directly on one
      let clickedGittymon: Gittymon | null = null;
      let minDistance = 35; // Selection radius of 35px
      gittymonsRef.current.forEach((mon) => {
        const dx = mon.x - clickX;
        const dy = (mon.y + mon.jumpY) - clickY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistance) {
          minDistance = dist;
          clickedGittymon = mon;
        }
      });

      if (clickedGittymon) {
        const mon = clickedGittymon as Gittymon;
        const colorName = getColorName(mon.color);
        const typeLabel = getTypeLabel(mon.type);
        const devPhrases = [
          "Works on my machine!",
          "It's not a bug, it's an undocumented feature.",
          "LGTM! Merging to production right now.",
          "Have you tried turning it off and on again?",
          "Let's do a quick hotfix in production. What could go wrong?",
          "Oh wait, I forgot to pull the latest changes...",
          "This code is self-documenting. Definitely.",
          "Wait, who deleted package-lock.json?!",
          "Just force push it with --force. It'll be fine.",
          "I wrote this code at 3 AM. Don't look at it.",
          "No test coverage is the best coverage.",
          "Docker container running locally but failing on cloud...",
          "StackOverflow said this solution is highly optimized!",
          "Another day, another console.log('here').",
          "Converting everything to TypeScript to feel secure.",
          "Let's skip code review, we need this feature live today!",
          "That's a legacy service, we don't change that line.",
          "My local dev environment is fully isolated.",
          "The test suite failed, but it passed when I ran it again.",
          "It's compile-time safe, meaning nothing can break.",
          "Let's rewrite the entire module over the weekend!",
          "It was a merge conflict nightmare, but I just chose mine."
        ];
        
        const logId = Math.random().toString(36).substring(2, 9);
        const newLog = {
          id: logId,
          name: `${colorName} ${typeLabel}`,
          color: mon.color,
          message: devPhrases[Math.floor(Math.random() * devPhrases.length)],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };

        setLogs(prev => {
          const updated = [...prev, newLog];
          if (updated.length > 5) {
            updated.shift();
          }
          return updated;
        });

        setTimeout(() => {
          setLogs(prev => prev.filter(l => l.id !== logId));
        }, 5000);
      }

      // Trigger spark particles at click point
      const colors = ['#7ba4b5', '#c98286', '#8ca376', '#dbbc7f', '#9e8fa3'];
      const clickOutputs = [
        '+1 COMMIT',
        'PULL REQUEST APPLIED',
        'BUG SQUASHED!',
        'MERGED TO MAIN',
        'GIT UPDATE SUCCESS',
        'CLEAN DEPLOYED',
        'CHANCE OF BUG: 0%',
        'RE-BUILT ok',
        'GIT PUSH COMPLETE'
      ];

      // Spawn 8 star particles at click point
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + (Math.random() * 0.4 - 0.2);
        const speed = 1.5 + Math.random() * 2.5;
        particlesRef.current.push({
          x: clickX,
          y: clickY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 1.5 + Math.random() * 2,
          alpha: 1.0,
          color: colors[i % colors.length]
        });
      }

      // Spawn one large coding phrase floating up
      particlesRef.current.push({
        x: clickX,
        y: clickY - 10,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -1.0 - Math.random() * 0.6,
        size: 9 + Math.random() * 3,
        alpha: 1.0,
        text: clickOutputs[Math.floor(Math.random() * clickOutputs.length)],
        color: '#a3e635' // Success neon green
      });

      // Scatter Gittymons that are within 240 pixels of the click
      const reactPhrases = [
        'YEET!', 'OOF!', 'GIT DETECTED', 'COMMIT!', 'CODE REFACTOR!', 'MERGING OUT!', 'BUG SHIELD!', 'BZZZ!'
      ];

      gittymonsRef.current.forEach((mon) => {
        const dx = mon.x - clickX;
        const dy = mon.y - clickY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 240) {
          // Send running away rapidly
          mon.state = 'panic';
          mon.panicTimer = 180; // 3 seconds panic mode
          
          // Scatter opposite directions
          const scaleDir = dist === 0 ? 1 : dist;
          mon.targetX = mon.x + (dx / scaleDir) * 200 + (Math.random() - 0.5) * 80;
          mon.targetY = mon.y + (dy / scaleDir) * 200 + (Math.random() - 0.5) * 80;

          // Push speed multiplier in walk step
          mon.speed = 1.8 + Math.random() * 1.5;

          // Dynamic jumping/hopping physics triggered
          mon.jumpVelocity = -7 - Math.random() * 5; // upward kick
          
          // Tiny dialogue react bubble
          mon.clickReactionText = reactPhrases[Math.floor(Math.random() * reactPhrases.length)];
          mon.clickReactionTimer = 90; // 1.5s visual limit
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleGlobalClick);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Initialize Gittymons and Code Particles on resize/mount
  useEffect(() => {
    // Spawn 14 Gittymons roaming around
    if (gittymonsRef.current.length === 0) {
      const types: ('trex' | 'slime' | 'octo' | 'bat')[] = ['trex', 'slime', 'octo', 'bat'];
      const colors = ['#7ba4b5', '#c98286', '#8ca376', '#e8ece9', '#dbbc7f', '#9e8fa3'];
      const list: Gittymon[] = [];
      for (let i = 0; i < 14; i++) {
        const startX = Math.random() * windowSize.width;
        const startY = Math.random() * windowSize.height;
        list.push({
          id: i,
          x: startX,
          y: startY,
          targetX: startX,
          targetY: startY,
          type: types[i % types.length],
          state: Math.random() > 0.4 ? 'walking' : 'idle',
          color: colors[i % colors.length],
          speed: 0.35 + Math.random() * 0.4,
          frameTimer: 0,
          frame: 0,
          idleTimer: Math.random() * 120,
          lastDir: Math.random() > 0.5 ? 'L' : 'R',
          jumpY: 0,
          jumpVelocity: 0,
          panicTimer: 0,
          clickReactionTimer: 0
        });
      }
      gittymonsRef.current = list;
    }

    // Populate particles if list is short
    if (particlesRef.current.length < 50) {
      const gitHints = [
        'git commit -m "fix bug"',
        'git push origin main',
        'git checkout -b feature',
        'git merge upstream',
        'git rebase',
        'git clone',
        'npm run dev',
        '<div className="gittymon">',
        'await fetch("/api/summon")',
        'const root = createRoot()',
        'import React from "react"',
        'git init',
        'git diff',
        '{ monState: "ROAMING" }',
        '() => summon()',
        'export default App',
        'docker-compose up',
        'eslint --fix'
      ];

      const list: CosmicParticle[] = [...particlesRef.current];
      // Dot particles
      while (list.length < 40) {
        list.push({
          x: Math.random() * windowSize.width,
          y: Math.random() * windowSize.height,
          vx: (Math.random() - 0.5) * 0.2,
          vy: -0.1 - Math.random() * 0.3,
          size: 1 + Math.random() * 2,
          alpha: 0.2 + Math.random() * 0.5,
          color: Math.random() > 0.5 ? 'rgba(123, 164, 181, 0.35)' : 'rgba(201, 130, 134, 0.35)'
        });
      }
      // Code/Git text particles
      while (list.length < 55) {
        list.push({
          x: Math.random() * windowSize.width,
          y: Math.random() * windowSize.height,
          vx: (Math.random() - 0.5) * 0.1,
          vy: -0.05 - Math.random() * 0.15,
          size: 7 + Math.random() * 3,
          alpha: 0.12 + Math.random() * 0.3,
          text: gitHints[Math.floor(Math.random() * gitHints.length)],
          color: Math.random() > 0.5 ? '#7ba4b5' : '#cbd5e1'
        });
      }
      particlesRef.current = list;
    }
  }, [windowSize]);

  // Infinite Animation Frame loop for map rendering + movements
  useEffect(() => {
    let animId: number;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawSprite = (
      ctx: CanvasRenderingContext2D,
      sprite: string[],
      x: number,
      y: number,
      scale: number,
      color: string,
      facingL: boolean
    ) => {
      const h = sprite.length;
      const w = sprite[0].length;
      const outlineColor = 'rgba(10, 11, 16, 0.85)';

      const shadowColor = adjustColor(color, -25);
      const highlightColor = adjustColor(color, 20);
      const accentColor = '#fbebcd'; // a light cream retro color for belly/secondary features
      const pupilColor = '#12131a'; // dark eye/accessory color

      // Outline Base render for depth and contrast
      ctx.fillStyle = outlineColor;
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          const char = sprite[r][c];
          if (char && char !== ' ') {
            const drawCol = facingL ? c : (w - 1 - c);
            const px = x + drawCol * scale;
            const py = y + r * scale;
            ctx.fillRect(px - scale, py, scale * 3, scale);
            ctx.fillRect(px, py - scale, scale, scale * 3);
          }
        }
      }

      // Main color fill in
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          const char = sprite[r][c];
          if (!char || char === ' ') continue;

          const drawCol = facingL ? c : (w - 1 - c);
          const px = x + drawCol * scale;
          const py = y + r * scale;

          if (char === 'X') {
            ctx.fillStyle = color;
          } else if (char === 'O') {
            ctx.fillStyle = '#ffffff';
          } else if (char === 'A') {
            ctx.fillStyle = highlightColor;
          } else if (char === 'S') {
            ctx.fillStyle = shadowColor;
          } else if (char === 'P') {
            ctx.fillStyle = accentColor;
          } else if (char === 'E') {
            ctx.fillStyle = pupilColor;
          } else {
            continue;
          }
          ctx.fillRect(px, py, scale, scale);
        }
      }
    };

    const render = () => {
      const gittymons = gittymonsRef.current;
      const particles = particlesRef.current;
      const m = mouseRef.current;

      m.idleTicks++;

      // 1. CLEAR & DRAW COSMIC GRID BACKGROUND
      ctx.fillStyle = '#0a0d16'; // Dark sci-fi cosmic void / grid blueprint
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw dynamic subtle blue graph-paper grid lines
      const gridSize = 64;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.lineWidth = 1;

      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw glowing background radar circles in the console's screen corners
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.03)';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 380, 0, Math.PI * 2);
      ctx.stroke();

      // Draw crosshair scanlines target tracker around user mouse cursor
      if (m.x >= 0 && m.y >= 0 && m.idleTicks < 300) {
        // Compute scan line alpha fading based on idle ticks
        const lineAlpha = Math.max(0, 1 - m.idleTicks / 300);
        
        ctx.strokeStyle = `rgba(56, 189, 248, ${lineAlpha * 0.15})`;
        ctx.setLineDash([4, 4]); // cool digital dash lines
        ctx.lineWidth = 1;

        // Horiz scan line
        ctx.beginPath();
        ctx.moveTo(0, m.y);
        ctx.lineTo(canvas.width, m.y);
        ctx.stroke();

        // Vert scan line
        ctx.beginPath();
        ctx.moveTo(m.x, 0);
        ctx.lineTo(m.x, canvas.height);
        ctx.stroke();

        ctx.setLineDash([]); // reset

        // Draw HUD digital cursor tag overlay near intersection
        ctx.fillStyle = `rgba(56, 189, 248, ${lineAlpha * 0.6})`;
        ctx.font = '8px "JetBrains Mono", monospace';
        const hexX = `0x${Math.floor(m.x).toString(16).toUpperCase().padStart(3, '0')}`;
        const hexY = `0x${Math.floor(m.y).toString(16).toUpperCase().padStart(3, '0')}`;
        ctx.fillText(`[G-LOC: ${hexX}, ${hexY}]`, m.x + 12, m.y - 8);

        // Radar target cursor ring
        ctx.strokeStyle = `rgba(244, 63, 94, ${lineAlpha * 0.3})`;
        ctx.beginPath();
        const pulseRadius = 6 + (Math.sin(Date.now() / 150) * 2);
        ctx.arc(m.x, m.y, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 2. RENDER & UPDATE PARTICLES (COSMIC HINTS)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // If it is regular floating background background dots / comments:
        if (!p.text) {
          // Wrap borders for infinite looping
          if (p.y < -30) {
            p.y = canvas.height + 10;
            p.x = Math.random() * canvas.width;
          }
          if (p.x < -100) p.x = canvas.width + 100;
          if (p.x > canvas.width + 100) p.x = -100;

          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // If it is dynamic code floating texts from code action:
          p.alpha -= 0.01; // Fade away
          if (p.alpha <= 0) {
            particles.splice(i, 1);
            continue;
          }

          ctx.font = `bold ${p.size}px "JetBrains Mono", monospace`;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          // Apply elegant pixel outline/shadow manually
          ctx.fillStyle = '#0a0d16';
          ctx.fillText(p.text, p.x + 1, p.y + 1);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, p.x, p.y);
          ctx.globalAlpha = 1.0;
        }
      }

      // 3. MOVE & DRAW ROAMING GITTYMONS WITH INTERACTION PHYSICS
      gittymons.forEach((mon) => {
        // Frame ticks for walking animation
        mon.frameTimer++;
        if (mon.frameTimer > 18) {
          mon.frame = mon.frame === 0 ? 1 : 0;
          mon.frameTimer = 0;
        }

        // Apply visual gravity physics jump offset if any values exist
        mon.jumpY += mon.jumpVelocity;
        mon.jumpVelocity += 0.45; // Gravity pull

        if (mon.jumpY >= 0) {
          mon.jumpY = 0;
          mon.jumpVelocity = 0;
        }

        const devCenterY = canvas.height / 2;
        const devCenterX = canvas.width / 2;

        if (mon.state === 'panic') {
          mon.panicTimer--;
          
          // Step towards target faster
          const dx = mon.targetX - mon.x;
          const dy = mon.targetY - mon.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 5) {
            const dirX = dx / distance;
            const dirY = dy / distance;
            mon.x += dirX * mon.speed;
            mon.y += dirY * mon.speed;
            mon.lastDir = dirX > 0 ? 'R' : 'L';
          }

          // Give funny infinite hopping effect while panicked
          if (mon.jumpY === 0 && Math.random() < 0.15) {
            mon.jumpVelocity = -4 - Math.random() * 3;
          }

          if (mon.panicTimer <= 0) {
            mon.state = 'idle';
            mon.speed = 0.35 + Math.random() * 0.4;
            mon.idleTimer = 60 + Math.random() * 100;
          }
        } else if (mon.state === 'idle') {
          mon.idleTimer--;
          if (mon.idleTimer <= 0) {
            mon.state = 'walking';
            mon.targetX = Math.random() * canvas.width;
            mon.targetY = Math.random() * canvas.height;

            // Avoid console middle frame zone
            if (Math.abs(mon.targetX - devCenterX) < 220 && Math.abs(mon.targetY - devCenterY) < 330) {
              if (mon.targetX < devCenterX) mon.targetX -= 190;
              else mon.targetX += 190;
            }
          }
        } else {
          // walking state normal
          const dx = mon.targetX - mon.x;
          const dy = mon.targetY - mon.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 5) {
            mon.state = 'idle';
            mon.idleTimer = 40 + Math.random() * 120;
          } else {
            const dirX = dx / distance;
            const dirY = dy / distance;

            mon.x += dirX * mon.speed;
            mon.y += dirY * mon.speed;
            mon.lastDir = dirX > 0 ? 'R' : 'L';
          }
        }

        // Clamp inside window space safely
        mon.x = Math.max(10, Math.min(canvas.width - 40, mon.x));
        mon.y = Math.max(10, Math.min(canvas.height - 45, mon.y));

        let activeSprite = TREX_FRAME_1;
        let scale = 2.0;
        if (mon.type === 'trex') {
          activeSprite = mon.frame === 0 ? TREX_FRAME_1 : TREX_FRAME_2;
          scale = 2.2;
        } else if (mon.type === 'slime') {
          activeSprite = mon.frame === 0 ? SLIME_FRAME_1 : SLIME_FRAME_2;
          scale = 2.4;
        } else if (mon.type === 'octo') {
          activeSprite = mon.frame === 0 ? OCTO_FRAME_1 : OCTO_FRAME_2;
          scale = 2.3;
        } else if (mon.type === 'bat') {
          activeSprite = mon.frame === 0 ? BAT_FRAME_1 : BAT_FRAME_2;
          scale = 2.2;
        }

        // Apply physical jump offset rendering adjustment
        const drawY = mon.y + mon.jumpY;
        const h = activeSprite.length;
        const w = activeSprite[0].length;
        const spriteWidth = w * scale;
        const spriteHeight = h * scale;

        // Shadow & Glow center coordinates
        const shadowX = mon.x + spriteWidth / 2;
        const shadowY = mon.y + spriteHeight - 2;

        // 1. Ambient holographic color glow reflecting on the floor
        const glowRadius = spriteWidth * 1.3;
        const floorGlow = ctx.createRadialGradient(
          shadowX, shadowY, 2,
          shadowX, shadowY, glowRadius
        );
        floorGlow.addColorStop(0, `${mon.color}25`); // Low-opacity theme color glow
        floorGlow.addColorStop(1, 'transparent');

        ctx.fillStyle = floorGlow;
        ctx.beginPath();
        ctx.arc(shadowX, shadowY, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // 2. Dynamic tactile ground shadow (shrinks & fades as they jump)
        const jumpFactor = Math.max(0, 1 - Math.abs(mon.jumpY) / 50);
        const rx = (spriteWidth * 0.45) * jumpFactor;
        const ry = (scale * 1.8) * jumpFactor;
        const shadowAlpha = 0.35 * jumpFactor;

        ctx.fillStyle = `rgba(10, 13, 22, ${shadowAlpha})`;
        ctx.beginPath();
        ctx.ellipse(shadowX, shadowY, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3. Trail sparks generated under panicking sprint states
        if (mon.state === 'panic' && Math.random() < 0.15) {
          particles.push({
            x: mon.x + spriteWidth / 2 + (Math.random() - 0.5) * 16,
            y: drawY + spriteHeight / 2 + (Math.random() - 0.5) * 16,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -0.4 - Math.random() * 0.6,
            size: 1 + Math.random() * 2,
            alpha: 0.9,
            color: mon.color
          });
        }

        // 4. Render main pixel-art character sprite
        drawSprite(ctx, activeSprite, mon.x, drawY, scale, mon.color, mon.lastDir === 'L');

        // Render reactive word popup bubbled bubble above their head
        if (mon.clickReactionTimer > 0 && mon.clickReactionText) {
          mon.clickReactionTimer--;
          
          ctx.font = 'bold 7px "Space Mono", Monaco, monospace';
          // Label frame bubble
          const txtWidth = ctx.measureText(mon.clickReactionText).width;
          const labelX = mon.x - txtWidth/2 + 8;
          const labelY = drawY - 14;

          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(labelX - 3, labelY - 8, txtWidth + 6, 11);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(labelX - 2, labelY - 7, txtWidth + 4, 9);
          ctx.fillStyle = '#7f001c';
          ctx.fillText(mon.clickReactionText, labelX, labelY);
        }
      });
    };

    const tick = () => {
      render();
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animId);
  }, [windowSize]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-x-0 inset-y-0 w-full h-full object-cover select-none pointer-events-none z-0 transition-all duration-700"
        width={windowSize.width}
        height={windowSize.height}
        style={{ 
          imageRendering: 'pixelated',
          filter: mapFocused 
            ? 'none' 
            : 'blur(1.5px) opacity(0.85)'
        }}
      />

      {/* Top-Left Notification Log Area */}
      <div 
        id="dev-speak-logs-overlay"
        className="fixed top-4 left-4 z-50 pointer-events-none flex flex-col gap-2 max-w-[280px] sm:max-w-xs"
      >
        <AnimatePresence>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              id={`dev-log-${log.id}`}
              initial={{ opacity: 0, x: -30, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95, transition: { duration: 0.2 } }}
              className="flex items-start gap-2 bg-[#1a1a1a]/95 text-white border-2 border-[#1a1a1a] p-2 sm:p-2.5 rounded shadow-lg pointer-events-auto font-mono text-[9px] sm:text-[10px] leading-tight"
              style={{ borderLeftColor: log.color, borderLeftWidth: '5px' }}
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-1 border-b border-white/10 pb-1">
                  <span className="font-bold tracking-tight flex items-center gap-1" style={{ color: log.color }}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ backgroundColor: log.color }} />
                    {log.name}
                  </span>
                  <span className="text-white/45 text-[8px] whitespace-nowrap">{log.timestamp}</span>
                </div>
                <p className="text-white/95 italic">"{log.message}"</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
