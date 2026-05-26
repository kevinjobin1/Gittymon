import React, { useState, useEffect, useRef } from 'react';
import { RoastMon } from '../types';
import { drawProceduralMon } from '../utils/procGen';
import { playRetroSound } from '../utils/audio';
import { RetroButton } from '../utils/ripple';

interface AiBossBattleViewProps {
  playerMon: RoastMon;
  onExit: () => void;
  registerDirectionHandler: (handler: ((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void) | null) => void;
  registerAHandler: (handler: (() => void) | null) => void;
  registerBHandler: (handler: (() => void) | null) => void;
}

const BOSS_MON = {
  name: 'CYBER-DRAKE-Y2K',
  level: 99,
  maxHP: 250,
  spriteSeed: 'ai-cyber-drake-boss-y2k-super-glitch-active',
};

const BOSS_ATTACKS = [
  { name: 'Exception Overflow', power: 30, desc: 'Floods terminal buffer with recursive pointers.' },
  { name: 'Force-Inject Null', power: 25, desc: 'Triggers active memory leakage.' },
  { name: 'Deprecated Import', power: 20, desc: 'Bypasses bundler checks securely.' },
  { name: 'WRECK PRODUCTION', power: 35, desc: 'Total database wiping wave.' }
];

export function AiBossBattleView({
  playerMon,
  onExit,
  registerDirectionHandler,
  registerAHandler,
  registerBHandler,
}: AiBossBattleViewProps) {
  const [playerHP, setPlayerHP] = useState(playerMon.stats.hp);
  const [bossHP, setBossHP] = useState(BOSS_MON.maxHP);
  const [activeMenu, setActiveMenu] = useState<'MAIN' | 'FIGHT'>('MAIN');
  const [mainCursor, setMainCursor] = useState(0);
  const [fightCursor, setFightCursor] = useState(0);
  const [isOver, setIsOver] = useState(false);
  const [winner, setWinner] = useState('');
  
  // Custom AI dialogue commentary state
  const [narration, setNarration] = useState('AN EXCEPTION TRIGGERED THE ARCH-GLITCH... PREPARE YOUR LOGS!');
  const [animFrame, setAnimFrame] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);

  const playerCanvasRef = useRef<HTMLCanvasElement>(null);
  const enemyCanvasRef = useRef<HTMLCanvasElement>(null);
  const prevPlayerHPRef = useRef<number | null>(null);
  const prevBossHPRef = useRef<number | null>(null);
  const [flashTarget, setFlashTarget] = useState<'player' | 'boss' | null>(null);
  const playerFlashTimeoutRef = useRef<number | null>(null);
  const bossFlashTimeoutRef = useRef<number | null>(null);

  // HP decrease detection — flash HP bar when damage taken
  useEffect(() => {
    if (prevPlayerHPRef.current !== null && playerHP < prevPlayerHPRef.current) {
      if (playerFlashTimeoutRef.current) clearTimeout(playerFlashTimeoutRef.current);
      setFlashTarget('player');
      playerFlashTimeoutRef.current = window.setTimeout(() => setFlashTarget((prev) => prev === 'player' ? null : prev), 350);
    }
    prevPlayerHPRef.current = playerHP;

    if (prevBossHPRef.current !== null && bossHP < prevBossHPRef.current) {
      if (bossFlashTimeoutRef.current) clearTimeout(bossFlashTimeoutRef.current);
      setFlashTarget('boss');
      bossFlashTimeoutRef.current = window.setTimeout(() => setFlashTarget((prev) => prev === 'boss' ? null : prev), 350);
    }
    prevBossHPRef.current = bossHP;

    return () => {
      if (playerFlashTimeoutRef.current) clearTimeout(playerFlashTimeoutRef.current);
      if (bossFlashTimeoutRef.current) clearTimeout(bossFlashTimeoutRef.current);
    };
  }, [playerHP, bossHP]);

  // Tick frames
  useEffect(() => {
    let animId: number;
    const tick = () => {
      setAnimFrame((f) => (f + 1) % 100);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Sync canvases
  useEffect(() => {
    if (playerCanvasRef.current) {
      drawProceduralMon(playerCanvasRef.current, playerMon.spriteSeed, animFrame, 'dmg');
    }
    if (enemyCanvasRef.current) {
      drawProceduralMon(enemyCanvasRef.current, BOSS_MON.spriteSeed, animFrame + 15, 'pocket');
    }
  }, [playerMon, animFrame]);

  // Handle battle turns with live AI commentator integration
  const executeTurn = async (actionType: 'MOVE' | 'HEAL' | 'SPIT_ROAST', moveIdx?: number) => {
    if (isOver || aiLoading) return;

    setAiLoading(true);
    setNarration('EVALUATING ACTION ENGINES...');

    let actionLabel = '';
    let dmgToBoss = 0;
    let healAmount = 0;

    if (actionType === 'HEAL') {
      actionLabel = 'HEAL CODES';
      healAmount = 25 + Math.floor(Math.random() * 15);
    } else if (actionType === 'SPIT_ROAST') {
      actionLabel = 'SPIT-ROAST TAUNT';
      dmgToBoss = 15 + Math.floor(Math.random() * 10);
    } else {
      const move = playerMon.moves[moveIdx ?? 0];
      actionLabel = `FIGHT: ${move.name}`;
      // Calculate damage scaled to stats
      dmgToBoss = Math.floor((move.power * playerMon.stats.attack) / (65 * 1.3)) + Math.floor(Math.random() * 8);
      dmgToBoss = Math.max(10, dmgToBoss);
    }

    try {
      // Trigger the magic server-side AI commentator endpoint!
      const res = await fetch('/api/ai-boss-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: playerMon.username,
          monName: playerMon.name,
          stats: playerMon.stats,
          action: actionLabel,
          bossHP: bossHP - dmgToBoss
        })
      });

      if (res.ok) {
        const data = await res.json() as { comment?: string };
        // Remove quotes around the comments returned from API if needed
        const cleanComment = data.comment ? data.comment.replace(/^"|"$/g, '') : '';
        setNarration(cleanComment || `Your simple codes fail to challenge the Y2K Engine!`);
      } else {
        setNarration(`Your code action ${actionType} was rejected by my syntax parser!`);
      }
    } catch (e) {
      console.warn('AI Boss comment fetch exception:', e);
      setNarration(`Exception raised! System crash in progress.`);
    } finally {
      setAiLoading(false);
    }

    // Process damage/heal effects after comment displays
    let nextBossHP = bossHP;
    let nextPlayerHP = playerHP;

    if (healAmount > 0) {
      nextPlayerHP = Math.min(playerMon.stats.hp, playerHP + healAmount);
      setPlayerHP(nextPlayerHP);
    }

    if (dmgToBoss > 0) {
      nextBossHP = Math.max(0, bossHP - dmgToBoss);
      setBossHP(nextBossHP);
    }

    // Check boss defeat first
    if (nextBossHP <= 0) {
      setIsOver(true);
      setWinner(playerMon.username);
      setNarration('CRITICAL CORE ABENDED! CYBER-DRAKE CRASHED! YOU ARE A LEGEND!');
      playRetroSound('summon');
      return;
    }

    // Else Boss lashes back inside turn
    const botMove = BOSS_ATTACKS[Math.floor(Math.random() * BOSS_ATTACKS.length)];
    let bossDmg = Math.floor((botMove.power * 80) / (playerMon.stats.defense * 1.2)) + Math.floor(Math.random() * 6);
    bossDmg = Math.max(8, bossDmg);

    const afterBossPlayerHP = Math.max(0, nextPlayerHP - bossDmg);
    
    // Slide animation delay simulation
    setTimeout(() => {
      setPlayerHP(afterBossPlayerHP);
      playRetroSound('hit');
      
      if (afterBossPlayerHP <= 0) {
        setIsOver(true);
        setWinner(BOSS_MON.name);
        setNarration('DEPRECATED OUT OF LOGS. SHUTTING DOWN ENGINE...');
        playRetroSound('defeat');
      }
    }, 1500);
  };

  // Hook physical buttons
  useEffect(() => {
    const handleDirection = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      if (isOver || aiLoading) return;

      playRetroSound('beep');
      if (activeMenu === 'MAIN') {
        if (dir === 'UP') {
          setMainCursor((c) => (c === 0 ? 3 : c - 1));
        } else if (dir === 'DOWN') {
          setMainCursor((c) => (c === 3 ? 0 : c + 1));
        }
      } else {
        if (dir === 'UP') {
          setFightCursor((c) => (c === 0 ? 3 : c - 1));
        } else if (dir === 'DOWN') {
          setFightCursor((c) => (c === 3 ? 0 : c + 1));
        }
      }
    };

    const handleA = () => {
      if (isOver) {
        playRetroSound('beep');
        onExit();
        return;
      }

      if (aiLoading) return;

      playRetroSound('select');
      if (activeMenu === 'MAIN') {
        if (mainCursor === 0) {
          setActiveMenu('FIGHT');
        } else if (mainCursor === 1) {
          executeTurn('HEAL');
        } else if (mainCursor === 2) {
          executeTurn('SPIT_ROAST');
        } else if (mainCursor === 3) {
          onExit();
        }
      } else {
        executeTurn('MOVE', fightCursor);
        setActiveMenu('MAIN');
      }
    };

    const handleB = () => {
      playRetroSound('beep');
      if (isOver) {
        onExit();
        return;
      }

      if (activeMenu === 'FIGHT') {
        setActiveMenu('MAIN');
      } else {
        onExit();
      }
    };

    registerDirectionHandler(handleDirection);
    registerAHandler(handleA);
    registerBHandler(handleB);

    return () => {
      registerDirectionHandler(null);
      registerAHandler(null);
      registerBHandler(null);
    };
  }, [activeMenu, mainCursor, fightCursor, isOver, aiLoading, playerHP, bossHP]);

  // Percentage bars
  const playerHPPercent = Math.max(0, Math.min(100, (playerHP / playerMon.stats.hp) * 100));
  const bossHPPercent = Math.max(0, Math.min(100, (bossHP / BOSS_MON.maxHP) * 100));

  return (
    <div className="flex-1 flex flex-col justify-between py-1 px-1 text-[#1a1a1a] select-none min-h-full relative font-mono">
      {/* Upper Combat Zone */}
      <div className="flex-1 flex flex-col justify-between space-y-2 py-1 max-h-[195px] sm:max-h-[225px]">
        {/* Opponent Status (Top Align) */}
        <div className="flex justify-between items-start border-b border-[#1a1a1a] border-dotted pb-1">
          <canvas
            ref={enemyCanvasRef}
            width={45}
            height={45}
            className="w-[45px] h-[45px] border border-[#1a1a1a] bg-[#fffcf5] rounded-sm pixelated"
          />
          <div className="flex-1 ml-2 text-[8px] leading-tight space-y-1">
            <div className="flex justify-between font-bold">
              <span className="truncate max-w-[90px] text-red-800 font-extrabold">{BOSS_MON.name}</span>
              <span className="text-[#7f001c] animate-pulse">LV {BOSS_MON.level}</span>
            </div>
            {/* Health Meter HUD */}
            <div className="flex items-center space-x-1">
              <span className="text-[6.5px] font-bold">HP:</span>
              <div className={`flex-1 bg-gray-200 border border-[#1a1a1a] h-2.5 p-0.5 relative flex ${flashTarget === 'boss' ? 'animate-hp-flash' : ''}`}>
                <div
                  className={`h-full transition-all duration-200 ${
                    bossHPPercent < 30 ? 'bg-red-500 animate-pulse' : bossHPPercent < 60 ? 'bg-yellow-400' : 'bg-[#1a1a1a]'
                  }`}
                  style={{ width: `${bossHPPercent}%` }}
                />
              </div>
            </div>
            <div className="text-right text-[7.2px]">
              {bossHP} / {BOSS_MON.maxHP}
            </div>
          </div>
        </div>

        {/* Player Status (Bottom Align) */}
        <div className="flex justify-between items-end pt-1">
          <div className="flex-1 mr-2 text-[8px] leading-tight space-y-1">
            <div className="flex justify-between font-bold">
              <span>{playerMon.name.toUpperCase()}</span>
              <span className="text-[#7f001c]">LV {playerMon.level}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-[6.5px] font-bold">HP:</span>
              <div className={`flex-1 bg-gray-200 border border-[#1a1a1a] h-2.5 p-0.5 relative flex ${flashTarget === 'player' ? 'animate-hp-flash' : ''}`}>
                <div
                  className={`h-full transition-all duration-300 ${
                    playerHPPercent < 30 ? 'bg-[#7f001c]' : playerHPPercent < 60 ? 'bg-yellow-500' : 'bg-[#1a1a1a]'
                  }`}
                  style={{ width: `${playerHPPercent}%` }}
                />
              </div>
            </div>
            <div className="text-[7px]">
              {playerHP} / {playerMon.stats.hp}
            </div>
          </div>
          <canvas
            ref={playerCanvasRef}
            width={40}
            height={40}
            className="w-[40px] h-[40px] border border-[#1a1a1a] bg-white rounded-sm pixelated"
          />
        </div>
      </div>

      <div className="w-full border-t border-[#1a1a1a] dither-border-b my-0.5" />

      {/* Screen action interaction zone */}
      <div className="h-[68px] min-h-[68px] bg-white border border-[#1a1a1a] p-1 flex flex-col justify-between text-[8px] leading-tight select-none">
        
        {isOver ? (
          <div className="flex-1 flex flex-col justify-between">
            <div className="text-[#7f001c] font-black text-center text-[9px] animate-pulse">
              {winner === playerMon.username ? '* BOSS SLAYER CONQUEROR *' : '[!] SYSTEM CPU DEPRECATED [!]'}
            </div>
            <div className="text-gray-500 text-center text-[7px] max-h-[18px] overflow-hidden truncate">
              {winner === playerMon.username ? 'CYBER-DRAKE CRASHED IN GLORY!' : 'AI ENGINE OVERROLD THE SYSTEM PROFILE.'}
            </div>
            <RetroButton
              variant="bare"
              press="light"
              onClick={(e) => { onExit(); }}
              className="w-full bg-[#1a1a1a] text-white py-0.5 mt-1 text-center text-[7.5px] font-bold shadow-[1px_1px_0px_#1a1a1a]"
            >
              PRESS ANY BUTTON TO EXIT
            </RetroButton>
          </div>
        ) : aiLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-1 bg-dashed bg-neutral-50 border border-neutral-200 p-1">
            <div className="animate-pulse text-[#7f001c] font-bold uppercase text-[8.5px]">
              AI ROAST ENGINE GENERATIVE IN PROCESS...
            </div>
            <div className="text-[6.5px] text-gray-400 text-center uppercase leading-none">
              AI roast engine is crafting savage critiques...
            </div>
          </div>
        ) : activeMenu === 'MAIN' ? (
          <div className="flex-1 flex space-x-1.5 justify-between">
            {/* Live narrative logs */}
            <div className="flex-1 flex flex-col justify-center bg-[#fffcf2] border border-[#7f001c]/20 p-1 text-[6.5px] text-gray-800 leading-tight h-full overflow-hidden shrink-0">
              <span className="font-bold text-red-900 leading-none mb-0.5 uppercase shrink-0">DRAKE:</span>
              <p className="line-clamp-3 select-none uppercase blink-fast">"{narration}"</p>
            </div>

            {/* Selection right menu */}
            <div className="flex flex-col justify-between shrink-0 w-[55px] font-bold border-l border-neutral-300 pl-1.5 space-y-0.5">
              {[
                { id: 0, str: 'FIGHT' },
                { id: 1, str: 'HEAL' },
                { id: 2, str: 'ROAST' },
                { id: 3, str: 'ESCAPE' }
              ].map((opt) => {
                const isSelected = mainCursor === opt.id;
                return (
                  <RetroButton
                    key={opt.id}
                    variant="bare"
                    press="light"
                    onClick={(e) => { setMainCursor(opt.id); if (opt.id === 0) setActiveMenu('FIGHT'); else if (opt.id === 1) executeTurn('HEAL'); else if (opt.id === 2) executeTurn('SPIT_ROAST'); else if (opt.id === 3) onExit(); }}
                    className={`text-left block text-[7px] leading-none ${
                      isSelected ? 'text-[#7f001c]' : 'text-neutral-500'
                    }`}
                  >
                    {isSelected ? '▶' : ' '} {opt.str}
                  </RetroButton>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[7.5px] bg-neutral-100 border-b border-neutral-300 px-1 font-bold">
              <span>CHOOSE LOG ATTACKS:</span>
              <RetroButton variant="bare" press="light" onClick={(e) => { setActiveMenu('MAIN'); }} className="text-[#7f001c] hover:underline uppercase text-[6.5px]">
                ◀ CANCEL B
              </RetroButton>
            </div>

            {/* 4 Moves selector Grid */}
            <div className="grid grid-cols-2 gap-0.5 pt-1">
              {playerMon.moves.map((move, idx) => {
                const isSelected = fightCursor === idx;
                return (
                  <RetroButton
                    key={move.name}
                    variant="bare"
                    press="light"
                    onClick={(e) => { setFightCursor(idx); executeTurn('MOVE', idx); setActiveMenu('MAIN'); }}
                    className={`flex items-center text-[7px] leading-tight text-left rounded p-0.5 truncate transition-all ${
                      isSelected ? 'bg-neutral-800 text-white font-bold' : 'hover:bg-neutral-200'
                    }`}
                  >
                    <span className="mr-0.5 shrink-0">{isSelected ? '▶' : '  '}</span>
                    <span className="truncate">{move.name.toUpperCase()}</span>
                  </RetroButton>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
