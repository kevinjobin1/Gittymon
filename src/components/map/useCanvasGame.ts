import React, { useEffect, useRef, useState } from 'react';
import { renderFrame } from './backgroundRenderer';
import {
  spawnInitialMonsters,
  scatterMonstersFromClick,
} from './monsterAI';
import { spawnBackgroundParticles, spawnClickParticles } from './particleSystem';
import { getColorName, getTypeLabel } from './colorUtils';
import type { Gittymon, CosmicParticle, LogMessage } from './types';

/* ------------------------------------------------------------------ */
/*  Dev phrases for click-reactions                                    */
/* ------------------------------------------------------------------ */

const DEV_PHRASES = [
  'Works on my machine!',
  "It's not a bug, it's an undocumented feature.",
  'LGTM! Merging to production right now.',
  'Have you tried turning it off and on again?',
  "Let's do a quick hotfix in production. What could go wrong?",
  'Oh wait, I forgot to pull the latest changes...',
  'This code is self-documenting. Definitely.',
  'Wait, who deleted package-lock.json?!',
  "Just force push it with --force. It'll be fine.",
  "I wrote this code at 3 AM. Don't look at it.",
  'No test coverage is the best coverage.',
  'Docker container running locally but failing on cloud...',
  'StackOverflow said this solution is highly optimized!',
  "Another day, another console.log('here').",
  'Converting everything to TypeScript to feel secure.',
  "Let's skip code review, we need this feature live today!",
  "That's a legacy service, we don't change that line.",
  'My local dev environment is fully isolated.',
  'The test suite failed, but it passed when I ran it again.',
  "It's compile-time safe, meaning nothing can break.",
  "Let's rewrite the entire module over the weekend!",
  'It was a merge conflict nightmare, but I just chose mine.',
];

const CLICK_REACT_RADIUS = 35;
const SCATTER_RADIUS = 240;

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export interface UseCanvasGameOptions {
  isExpanded: boolean;
  onMonsterClick?: (monster: Gittymon) => void;
}

export interface UseCanvasGameReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  logs: LogMessage[];
  mapFocused: boolean;
  windowSize: { width: number; height: number };
  hoveredMonster: Gittymon | null;
  mousePos: { x: number; y: number };
}

export function useCanvasGame({ isExpanded, onMonsterClick }: UseCanvasGameOptions): UseCanvasGameReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 800, height: 600 });
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [mapFocused, setMapFocused] = useState(false);

  // Hover state (throttled via ref to avoid render storms)
  const hoveredRef = useRef<Gittymon | null>(null);
  const [hoveredMonster, setHoveredMonster] = useState<Gittymon | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Mutable refs for the animation loop
  const monRefs = useRef<Gittymon[]>([]);
  const particleRefs = useRef<CosmicParticle[]>([]);
  const expandedRef = useRef(isExpanded);
  expandedRef.current = isExpanded;

  // Mouse tracking (in ref to avoid re-render storms)
  const mouseRef = useRef({
    x: -1000,
    y: -1000,
    active: false,
    idleTicks: 120,
  });

  /* ------ Window resize ------ */
  useEffect(() => {
    const handleResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* ------ Mouse & click handlers ------ */
  useEffect(() => {
    const m = mouseRef.current;

    const onMove = (e: MouseEvent) => {
      m.x = e.clientX;
      m.y = e.clientY;
      m.active = true;
      m.idleTicks = 0;
      const target = e.target as HTMLElement;
      setMapFocused(!(target && target.closest('.console-shell')));
    };

    const onLeave = () => {
      m.active = false;
      setMapFocused(false);
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.closest('.console-shell')) return;

      const { clientX: cx, clientY: cy } = e;
      const monsters = monRefs.current;
      const particles = particleRefs.current;

      // Direct click on a monster?
      let clicked: Gittymon | null = null;
      let minDist = CLICK_REACT_RADIUS;
      for (let i = 0; i < monsters.length; i++) {
        const dx = monsters[i].x - cx;
        const dy = monsters[i].y + monsters[i].jumpY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) { minDist = dist; clicked = monsters[i]; }
      }

      if (clicked) {
        const logId = Math.random().toString(36).substring(2, 9);
        const newLog: LogMessage = {
          id: logId,
          name: `${getColorName(clicked.color)} ${getTypeLabel(clicked.type)}`,
          color: clicked.color,
          message: DEV_PHRASES[Math.floor(Math.random() * DEV_PHRASES.length)],
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
          }),
        };
        setLogs((prev) => {
          const next = [...prev, newLog];
          if (next.length > 5) next.shift();
          return next;
        });
        setTimeout(() => setLogs((prev) => prev.filter((l) => l.id !== logId)), 5000);

        // Fire summon callback
        onMonsterClick?.(clicked);
      }

      // Spark particles at click point
      spawnClickParticles(particles, cx, cy);

      // Scatter nearby monsters
      scatterMonstersFromClick(monsters, cx, cy, SCATTER_RADIUS);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('click', onClick);
    document.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('click', onClick);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  /* ------ Initialise monsters & particles ------ */
  useEffect(() => {
    if (monRefs.current.length === 0) {
      monRefs.current = spawnInitialMonsters(windowSize.width, windowSize.height);
    }
    if (particleRefs.current.length < 50) {
      particleRefs.current = spawnBackgroundParticles(
        particleRefs.current,
        windowSize.width,
        windowSize.height,
      );
    }
  }, [windowSize]);

  /* ------ Animation loop ------ */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const tick = () => {
      const m = mouseRef.current;
      m.idleTicks++;



      // Hover detection — check which monster is closest to the mouse
      const mx = m.x;
      const my = m.y;
      const monsters = monRefs.current;
      let hovered: Gittymon | null = null;
      let hoverDist = CLICK_REACT_RADIUS * 1.5; // slightly larger than click radius
      for (let i = 0; i < monsters.length; i++) {
        const dx = monsters[i].x - mx;
        const dy = monsters[i].y + monsters[i].jumpY - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < hoverDist) { hoverDist = dist; hovered = monsters[i]; }
      }

      // Only update React state when hover changes (avoids re-render storms)
      if (hovered?.id !== hoveredRef.current?.id) {
        hoveredRef.current = hovered;
        setHoveredMonster(hovered);
      }
      if (mx !== mousePos.x || my !== mousePos.y) {
        setMousePos({ x: mx, y: my });
      }      renderFrame({
        ctx,
        canvasW: canvas.width,
        canvasH: canvas.height,
        monRefs: monRefs.current,
        particleRefs: particleRefs.current,
        mouse: m,
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [windowSize]);

  return { canvasRef, logs, mapFocused, windowSize, hoveredMonster, mousePos };
}
