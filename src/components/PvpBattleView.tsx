import React, { useState, useEffect, useRef } from 'react';
import { RoastMon } from '../types';
import { drawProceduralMon } from '../utils/procGen';
import { playRetroSound } from '../utils/audio';

interface PvpBattleViewProps {
  playerMon: RoastMon;
  opponentMon: RoastMon;
  opponentName: string;
  playerHP: number;
  opponentHP: number;
  isOver: boolean;
  winnerNickname: string;
  logs: string[];
  lastActionSent: boolean;
  onSendAction: (action: 'MOVE' | 'HEAL' | 'SPIT_ROAST', moveIndex?: number) => void;
  onForfeit: () => void;
  onExit: () => void;
  registerDirectionHandler: (handler: ((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void) | null) => void;
  registerAHandler: (handler: (() => void) | null) => void;
  registerBHandler: (handler: (() => void) | null) => void;
}

export function PvpBattleView({
  playerMon,
  opponentMon,
  opponentName,
  playerHP,
  opponentHP,
  isOver,
  winnerNickname,
  logs = [],
  lastActionSent,
  onSendAction,
  onForfeit,
  onExit,
  registerDirectionHandler,
  registerAHandler,
  registerBHandler,
}: PvpBattleViewProps) {
  const [activeMenu, setActiveMenu] = useState<'MAIN' | 'FIGHT'>('MAIN');
  const [fightCursor, setFightCursor] = useState(0);
  const [mainCursor, setMainCursor] = useState(0);
  const [animFrame, setAnimFrame] = useState(0);

  const playerCanvasRef = useRef<HTMLCanvasElement>(null);
  const enemyCanvasRef = useRef<HTMLCanvasElement>(null);
  const prevPlayerHPRef = useRef<number | null>(null);
  const prevEnemyHPRef = useRef<number | null>(null);
  const [flashTarget, setFlashTarget] = useState<'player' | 'enemy' | null>(null);
  const playerFlashTimeoutRef = useRef<number | null>(null);
  const enemyFlashTimeoutRef = useRef<number | null>(null);

  // HP decrease detection — flash HP bar when damage taken
  useEffect(() => {
    if (prevPlayerHPRef.current !== null && playerHP < prevPlayerHPRef.current) {
      if (playerFlashTimeoutRef.current) clearTimeout(playerFlashTimeoutRef.current);
      setFlashTarget('player');
      playerFlashTimeoutRef.current = window.setTimeout(() => setFlashTarget((prev) => prev === 'player' ? null : prev), 350);
    }
    prevPlayerHPRef.current = playerHP;

    if (prevEnemyHPRef.current !== null && opponentHP < prevEnemyHPRef.current) {
      if (enemyFlashTimeoutRef.current) clearTimeout(enemyFlashTimeoutRef.current);
      setFlashTarget('enemy');
      enemyFlashTimeoutRef.current = window.setTimeout(() => setFlashTarget((prev) => prev === 'enemy' ? null : prev), 350);
    }
    prevEnemyHPRef.current = opponentHP;

    return () => {
      if (playerFlashTimeoutRef.current) clearTimeout(playerFlashTimeoutRef.current);
      if (enemyFlashTimeoutRef.current) clearTimeout(enemyFlashTimeoutRef.current);
    };
  }, [playerHP, opponentHP]);

  // Tick frames for breathing layout
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
      drawProceduralMon(enemyCanvasRef.current, opponentMon.spriteSeed, animFrame + 10, 'pocket');
    }
  }, [playerMon, opponentMon, animFrame]);

  // Hook physical buttons
  useEffect(() => {
    const handleDirection = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      if (isOver || lastActionSent) return;

      playRetroSound('beep');
      if (activeMenu === 'MAIN') {
        if (dir === 'UP') {
          setMainCursor((c) => (c === 0 ? 3 : c - 1));
        } else if (dir === 'DOWN') {
          setMainCursor((c) => (c === 3 ? 0 : c + 1));
        }
      } else {
        // FIGHT moves list (0 to 3)
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

      if (lastActionSent) return;

      playRetroSound('select');
      if (activeMenu === 'MAIN') {
        if (mainCursor === 0) {
          // OPEN FIGHT
          setActiveMenu('FIGHT');
        } else if (mainCursor === 1) {
          // REBUILD CODES (Heal)
          onSendAction('HEAL');
        } else if (mainCursor === 2) {
          // SPIT ROAST
          onSendAction('SPIT_ROAST');
        } else if (mainCursor === 3) {
          // QUIT FORFEIT
          onForfeit();
        }
      } else {
        // Submit FIGHT move index
        onSendAction('MOVE', fightCursor);
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
        // If in main, B triggers forfeit dialog
        onForfeit();
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
  }, [activeMenu, mainCursor, fightCursor, isOver, lastActionSent, onSendAction, onForfeit, onExit]);

  // HP Percentages
  const playerHPPercent = Math.max(0, Math.min(100, (playerHP / playerMon.stats.hp) * 100));
  const enemyHPPercent = Math.max(0, Math.min(100, (opponentHP / opponentMon.stats.hp) * 100));

  // Get last 2 logs to show in the feed
  const recentLogs = logs.slice(-2);

  return (
    <div className="flex-1 flex flex-col justify-between py-1 px-1 text-[#1a1a1a] select-none min-h-full relative font-mono">
      {/* Upper Combat Zone */}
      <div className="flex-1 flex flex-col justify-between space-y-2 py-1 max-h-[195px] sm:max-h-[225px]">
        
        {/* Opponent Status (Top Align) */}
        <div className="flex justify-between items-start border-b border-[#1a1a1a] border-dotted pb-1">
          <canvas
            ref={enemyCanvasRef}
            width={40}
            height={40}
            className="w-[40px] h-[40px] border border-[#1a1a1a] bg-white rounded-sm pixelated"
          />
          <div className="flex-1 ml-2 text-[8px] leading-tight space-y-1">
            <div className="flex justify-between font-bold">
              <span className="truncate max-w-[85px]">{opponentMon.name.toUpperCase()}</span>
              <span className="text-[#7f001c]">LV {opponentMon.level}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-[6.5px] font-bold">HP:</span>
              <div className={`flex-1 bg-gray-200 border border-[#1a1a1a] h-2.5 p-0.5 relative flex ${flashTarget === 'enemy' ? 'animate-hp-flash' : ''}`}>
                <div
                  className={`h-full transition-all duration-200 ${
                    enemyHPPercent < 30 ? 'bg-red-500' : enemyHPPercent < 60 ? 'bg-yellow-400' : 'bg-emerald-600'
                  }`}
                  style={{ width: `${enemyHPPercent}%` }}
                />
              </div>
            </div>
            <div className="text-right text-[7px]" style={{ fontSize: '7px' }}>
              {opponentHP} / {opponentMon.stats.hp}
            </div>
          </div>
        </div>

        {/* Player Status (Bottom Align) */}
        <div className="flex justify-between items-end pt-1">
          <div className="flex-1 mr-2 text-[8px] leading-tight space-y-1">
            <div className="flex justify-between font-bold">
              <span className="truncate max-w-[85px]">{playerMon.name.toUpperCase()}</span>
              <span className="text-[#7f001c]">LV {playerMon.level}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-[6.5px] font-bold">HP:</span>
              <div className={`flex-1 bg-gray-200 border border-[#1a1a1a] h-2.5 p-0.5 relative flex ${flashTarget === 'player' ? 'animate-hp-flash' : ''}`}>
                <div
                  className={`h-full transition-all duration-200 ${
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

      <div className="w-full border-t border-[#1a1a1a] dither-border-b my-1" />

      {/* Screen action interaction zone */}
      <div className="h-[68px] min-h-[68px] bg-white border border-[#1a1a1a] p-1 flex flex-col justify-between text-[8px] leading-tight select-none">
        
        {isOver ? (
          <div className="flex-1 flex flex-col justify-between">
            <div className="text-[#7f001c] font-black text-center text-[9px] animate-pulse">
              {winnerNickname.toLowerCase() === playerMon.username.toLowerCase() ? '* CHAMPION VICTOR *' : '[!] SYSTEM ENGINE DEPRECATED [!]'}
            </div>
            <div className="text-gray-500 text-center text-[7px] max-h-[20px] overflow-hidden truncate">
              {winnerNickname.toUpperCase()} WINS THE GLORY IN PVP!
            </div>
            <button
              onClick={onExit}
              className="w-full bg-[#1a1a1a] text-white py-0.5 mt-1 hover:bg-neutral-800 text-center text-[7.5px] font-bold"
            >
              PRESS A/B TO RETURN LOBBY
            </button>
          </div>
        ) : lastActionSent ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-1 bg-neutral-50 border border-neutral-200 p-1">
            <div className="animate-bounce text-[#7f001c] font-bold uppercase text-[8.5px]">
              SYNCING ENGINE...
            </div>
            <div className="text-[6.5px] text-gray-400 text-center uppercase leading-none">
              Awaiting selection code from trainer {opponentName}!
            </div>
          </div>
        ) : activeMenu === 'MAIN' ? (
          <div className="flex-1 flex space-x-1.5 justify-between">
            {/* Logs left pane */}
            <div className="flex-1 flex flex-col justify-center bg-neutral-100 p-1 rounded border border-neutral-300 max-w-[110px] h-full overflow-hidden shrink-0">
              {recentLogs.length > 0 ? (
                <div className="space-y-0.5 text-[6.5px] text-gray-700 leading-tight">
                  {recentLogs.map((log, i) => (
                    <div key={i} className="truncate select-none font-bold uppercase">{log}</div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-[6.5px] uppercase font-bold text-center">
                  Battle begun vs {opponentName}!
                </div>
              )}
            </div>

            {/* Selection right menu */}
            <div className="flex flex-col justify-between shrink-0 w-[55px] font-bold border-l border-neutral-300 pl-1.5 space-y-0.5">
              {[
                { id: 0, str: 'FIGHT' },
                { id: 1, str: 'HEAL' },
                { id: 2, str: 'ROAST' },
                { id: 3, str: 'CONCEDE' }
              ].map((opt) => {
                const isSelected = mainCursor === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setMainCursor(opt.id);
                      if (opt.id === 0) setActiveMenu('FIGHT');
                      else if (opt.id === 1) onSendAction('HEAL');
                      else if (opt.id === 2) onSendAction('SPIT_ROAST');
                      else if (opt.id === 3) onForfeit();
                    }}
                    className={`text-left block text-[7px] leading-none ${
                      isSelected ? 'text-[#7f001c]' : 'text-neutral-500'
                    }`}
                  >
                    {isSelected ? '▶' : ' '} {opt.str}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between">
            {/* Back to main */}
            <div className="flex justify-between items-center text-[7.5px] bg-neutral-100 border-b border-neutral-300 px-1 font-bold">
              <span>SELECT MOVE:</span>
              <button onClick={() => setActiveMenu('MAIN')} className="text-[#7f001c] hover:underline uppercase text-[6.5px]">
                ◀ CANCEL B
              </button>
            </div>

            {/* 4 Moves selector Grid */}
            <div className="grid grid-cols-2 gap-0.5 pt-1">
              {playerMon.moves.map((move, idx) => {
                const isSelected = fightCursor === idx;
                return (
                  <button
                    key={move.name}
                    onClick={() => {
                      setFightCursor(idx);
                      onSendAction('MOVE', idx);
                      setActiveMenu('MAIN');
                    }}
                    className={`flex items-center text-[7px] leading-tight text-left rounded p-0.5 truncate transition-all ${
                      isSelected ? 'bg-neutral-800 text-white font-bold' : 'hover:bg-neutral-200'
                    }`}
                  >
                    <span className="mr-0.5 shrink-0">{isSelected ? '▶' : '  '}</span>
                    <span className="truncate">{move.name.toUpperCase()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
