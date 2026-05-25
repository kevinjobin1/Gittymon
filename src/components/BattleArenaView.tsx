import React, { useState, useEffect, useRef } from 'react';
import { RoastMon, BattleState } from '../types';
import { drawProceduralMon } from '../utils/procGen';
import { playRetroSound } from '../utils/audio';

interface BattleArenaViewProps {
  playerMon: RoastMon;
  onExit: () => void;
  registerDirectionHandler?: (handler: ((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void) | null) => void;
  registerAHandler?: (handler: (() => void) | null) => void;
  registerBHandler?: (handler: (() => void) | null) => void;
}

const ENEMY_TEMPLATES = [
  { name: 'INDEX_OUT_OF_BOUNDS', lv: 88, type: 'Array Bug', maxHP: 110, spriteSeed: 'index-bounds-3.5', hp: 110 },
  { name: 'MERGE_CONFLICT', lv: 45, type: 'Git Disaster', maxHP: 80, spriteSeed: 'merge-struggle-1', hp: 80 },
  { name: 'NULL_POINTER_EXC', lv: 99, type: 'Memory Ghost', maxHP: 150, spriteSeed: 'null-pointer-00', hp: 150 },
  { name: 'TYPE_ANY_ASSIGN', lv: 52, type: 'Strict Lint Error', maxHP: 90, spriteSeed: 'lint-strictly-any', hp: 90 },
  { name: 'OUT_OF_MEM_LEAK', lv: 72, type: 'Node Killer', maxHP: 100, spriteSeed: 'leaky-node-stream', hp: 100 }
];

const ENEMY_ATTACKS = [
  { name: 'STACK OVERFLOW', power: 25, desc: 'Floods application thread with recursive chaos.' },
  { name: 'FORCE INJECT ANY', power: 30, desc: 'Bypasses compiler assertions.' },
  { name: 'OVERWRITE STAGING', power: 15, desc: 'Erases all uncommitted clean scripts.' },
  { name: 'INFINITY THREAD LOOP', power: 35, desc: 'Siphons processing speed.' }
];

export function BattleArenaView({ 
  playerMon, 
  onExit,
  registerDirectionHandler,
  registerAHandler,
  registerBHandler
}: BattleArenaViewProps) {
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [activeMenu, setActiveMenu] = useState<'MAIN' | 'FIGHT'>('MAIN');
  const [mainCursor, setMainCursor] = useState(0);
  const [fightCursor, setFightCursor] = useState(0);
  const [activeMessageIndex, setActiveMessageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [textQueue, setTextQueue] = useState<string[]>([]);
  const [isEnemyTurn, setIsEnemyTurn] = useState(false);
  const [animFrame, setAnimFrame] = useState(0);

  const playerCanvasRef = useRef<HTMLCanvasElement>(null);
  const enemyCanvasRef = useRef<HTMLCanvasElement>(null);
  const prevPlayerHPRef = useRef<number | null>(null);
  const prevEnemyHPRef = useRef<number | null>(null);
  const [flashTarget, setFlashTarget] = useState<'player' | 'enemy' | null>(null);
  const playerFlashTimeoutRef = useRef<number | null>(null);
  const enemyFlashTimeoutRef = useRef<number | null>(null);

  // Initialize Battle parameters
  useEffect(() => {
    const randomEnemy = ENEMY_TEMPLATES[Math.floor(Math.random() * ENEMY_TEMPLATES.length)];

    setBattleState({
      playerHP: playerMon.stats.hp,
      playerMaxHP: playerMon.stats.hp,
      enemyName: randomEnemy.name,
      enemyHP: randomEnemy.hp,
      enemyMaxHP: randomEnemy.maxHP,
      enemyLevel: randomEnemy.lv,
      enemySpriteSeed: randomEnemy.spriteSeed,
      logs: [],
      isOver: false
    });

    // Intro narration queue
    setTextQueue([
      `WILD ${randomEnemy.name} APPEARED!`,
      `GO! ${playerMon.name.toUpperCase()}!`
    ]);
  }, [playerMon]);

  // Handle typing effect for narration logs
  useEffect(() => {
    if (activeMessageIndex >= textQueue.length) {
      setDisplayedText('');
      return;
    }

    const message = textQueue[activeMessageIndex];
    let index = 0;
    setDisplayedText('');

    const interval = setInterval(() => {
      index++;
      setDisplayedText(message.slice(0, index));
      if (index % 3 === 0) playRetroSound('beep');
      if (index >= message.length) {
        clearInterval(interval);
        const timer = setTimeout(() => {
          setActiveMessageIndex((prev) => prev + 1);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [textQueue, activeMessageIndex]);

  // HP decrease detection — flash HP bar when damage taken
  useEffect(() => {
    if (!battleState) return;

    const hpPlayer = battleState.playerHP;
    const hpEnemy = battleState.enemyHP;

    if (prevPlayerHPRef.current !== null && hpPlayer < prevPlayerHPRef.current) {
      if (playerFlashTimeoutRef.current) clearTimeout(playerFlashTimeoutRef.current);
      setFlashTarget('player');
      playerFlashTimeoutRef.current = window.setTimeout(() => setFlashTarget((prev) => prev === 'player' ? null : prev), 350);
    }
    prevPlayerHPRef.current = hpPlayer;

    if (prevEnemyHPRef.current !== null && hpEnemy < prevEnemyHPRef.current) {
      if (enemyFlashTimeoutRef.current) clearTimeout(enemyFlashTimeoutRef.current);
      setFlashTarget('enemy');
      enemyFlashTimeoutRef.current = window.setTimeout(() => setFlashTarget((prev) => prev === 'enemy' ? null : prev), 350);
    }
    prevEnemyHPRef.current = hpEnemy;

    return () => {
      if (playerFlashTimeoutRef.current) clearTimeout(playerFlashTimeoutRef.current);
      if (enemyFlashTimeoutRef.current) clearTimeout(enemyFlashTimeoutRef.current);
    };
  }, [battleState?.playerHP ?? 0, battleState?.enemyHP ?? 0]);

  // Frame tick animation for dual procedurals
  useEffect(() => {
    let animId: number;
    const tick = () => {
      setFrameTicker();
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  const setFrameTicker = () => {
    setAnimFrame((f) => (f + 1) % 100);
  };

  // Redraw canvases on state change
  useEffect(() => {
    if (!battleState) return;

    if (playerCanvasRef.current) {
      drawProceduralMon(playerCanvasRef.current, playerMon.spriteSeed, animFrame, 'dmg');
    }
    if (enemyCanvasRef.current) {
      drawProceduralMon(enemyCanvasRef.current, battleState.enemySpriteSeed, animFrame + 10, 'pocket');
    }
  }, [battleState, animFrame, playerMon]);

  // Trigger opponent execution turn
  useEffect(() => {
    const isTyping = activeMessageIndex < textQueue.length;
    if (isEnemyTurn && battleState && !battleState.isOver && !isTyping) {
      const triggerEnemyTurn = setTimeout(() => {
        handleEnemyTurn();
      }, 600);
      return () => clearTimeout(triggerEnemyTurn);
    }
  }, [isEnemyTurn, battleState, textQueue, activeMessageIndex]);

  const addNarration = (text: string) => {
    setTextQueue((prev) => [...prev, text]);
  };

  // Actions of Player
  const handleAttack = (moveIndex: number) => {
    const isTyping = activeMessageIndex < textQueue.length;
    if (!battleState || battleState.isOver || isTyping || isEnemyTurn) return;

    const move = playerMon.moves[moveIndex];
    playRetroSound('sweep');
    addNarration(`${playerMon.name.toUpperCase()} USED ${move.name.toUpperCase()}!`);

    // Calculate base damage: move power modified by stat scaling
    const dmgFactor = 1 + (playerMon.stats.attack / 100);
    const damage = Math.floor(move.power * dmgFactor * (0.85 + Math.random() * 0.3));

    setTimeout(() => {
      playRetroSound('hit');
    }, 400);

    setBattleState((prev) => {
      if (!prev) return null;
      const nextEnemyHP = Math.max(0, prev.enemyHP - damage);
      const enemyDied = nextEnemyHP <= 0;

      if (enemyDied) {
        addNarration(`IT REVEALED AN ASTOUNDING IMPACT!`);
        addNarration(`WILD ${prev.enemyName} CRASHED DEFEATED!`);
        addNarration(`${playerMon.name.toUpperCase()} SAVED PROD ENV!`);

        setTimeout(() => {
          playRetroSound('summon'); // Fanfare
        }, 800);

        return {
          ...prev,
          enemyHP: 0,
          isOver: true,
          result: 'WIN'
        };
      } else {
        addNarration(`DEALT ${damage} DEV DAMAGE TO EXCEPTION!`);
        return {
          ...prev,
          enemyHP: nextEnemyHP
        };
      }
    });

    setActiveMenu('MAIN');

    // Trigger enemy transition
    setBattleState((prev) => {
      if (prev && prev.enemyHP > 0) {
        setIsEnemyTurn(true);
      }
      return prev;
    });
  };

  const handleRoastAttack = () => {
    const isTyping = activeMessageIndex < textQueue.length;
    if (!battleState || battleState.isOver || isTyping || isEnemyTurn) return;

    playRetroSound('accent');
    addNarration(`${playerMon.name.toUpperCase()} SLAMMED A SAVAGE ROAST!`);
    addNarration(`"${playerMon.roast.substring(0, 40)}..."`);

    // Psychological damage is highly effective
    const damage = Math.floor(35 + Math.random() * 20);

    setTimeout(() => {
      playRetroSound('hit');
    }, 450);

    setBattleState((prev) => {
      if (!prev) return null;
      const nextEnemyHP = Math.max(0, prev.enemyHP - damage);
      const enemyDied = nextEnemyHP <= 0;

      if (enemyDied) {
        addNarration(`THE BUG COULD NOT ACCEPT THE TRUTH!`);
        addNarration(`WILD ${prev.enemyName} UNINSTALLED!`);
        return {
          ...prev,
          enemyHP: 0,
          isOver: true,
          result: 'WIN'
        };
      } else {
        addNarration(`BUG HP FELL BY ${damage} REDUCED VALUE!`);
        return {
          ...prev,
          enemyHP: nextEnemyHP
        };
      }
    });

    setBattleState((prev) => {
      if (prev && prev.enemyHP > 0) {
        setIsEnemyTurn(true);
      }
      return prev;
    });
  };

  const handleHeal = () => {
    const isTyping = activeMessageIndex < textQueue.length;
    if (!battleState || battleState.isOver || isTyping || isEnemyTurn) return;

    playRetroSound('sweep');
    addNarration(`${playerMon.name.toUpperCase()} DEPLOYED REPAIR PATCH!`);

    const healPower = Math.floor(35 + (playerMon.stats.defense / 2));

    setBattleState((prev) => {
      if (!prev) return null;
      const nextPlayerHP = Math.min(prev.playerMaxHP, prev.playerHP + healPower);
      addNarration(`RECOVERED ${nextPlayerHP - prev.playerHP} HP SYNTAX UNITS!`);

      return {
        ...prev,
        playerHP: nextPlayerHP
      };
    });

    setIsEnemyTurn(true);
  };

  const handleRun = () => {
    const isTyping = activeMessageIndex < textQueue.length;
    if (!battleState || battleState.isOver || isTyping || isEnemyTurn) return;

    playRetroSound('beep');
    addNarration(`ATTEMPTING TO FORCE QUIT TERMINAL (--FORCE)...`);

    if (Math.random() > 0.35) {
      addNarration(`ESCAPE SUCCESSFUL! SHELTER IN LOCALHOST.`);
      setBattleState((prev) => (prev ? { ...prev, isOver: true, result: 'RUN' } : null));
    } else {
      addNarration(`QUITTING FAILED! PORT 3000 IS OCCUPIED.`);
      setIsEnemyTurn(true);
    }
  };

  const handleEnemyTurn = () => {
    if (!battleState || battleState.isOver) {
      setIsEnemyTurn(false);
      return;
    }

    const attack = ENEMY_ATTACKS[Math.floor(Math.random() * ENEMY_ATTACKS.length)];
    addNarration(`${battleState.enemyName} USED ${attack.name}!`);

    // Enemy attack damage
    const damage = Math.max(5, Math.floor(attack.power * (1 - (playerMon.stats.defense / 150)) * (0.85 + Math.random() * 0.3)));

    setTimeout(() => {
      playRetroSound('hit');
    }, 400);

    setBattleState((prev) => {
      if (!prev) return null;
      const nextPlayerHP = Math.max(0, prev.playerHP - damage);
      const playerDied = nextPlayerHP <= 0;

      if (playerDied) {
        addNarration(`${playerMon.name.toUpperCase()} CRITICAL OVERFLOW COLD MEM CRASH!`);
        addNarration(`REBOOT HOST AND RE-FACTOR CLEAN SCHEMAS.`);

        setTimeout(() => {
          playRetroSound('defeat');
        }, 800);

        return {
          ...prev,
          playerHP: 0,
          isOver: true,
          result: 'LOSE'
        };
      } else {
        addNarration(`DEALT ${damage} COMPILER DMG TO MONSTER.`);
        return {
          ...prev,
          playerHP: nextPlayerHP
        };
      }
    });

    setIsEnemyTurn(false);
  };

  // Hook physical buttons of Console Shell
  useEffect(() => {
    if (!registerDirectionHandler || !registerAHandler || !registerBHandler) return;

    const handleDirection = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      const isTyping = activeMessageIndex < textQueue.length;
      if (!battleState || battleState.isOver || isTyping || isEnemyTurn) return;

      playRetroSound('beep');
      if (activeMenu === 'MAIN') {
        if (dir === 'UP') {
          setMainCursor((c) => (c < 2 ? c + 2 : c - 2));
        } else if (dir === 'DOWN') {
          setMainCursor((c) => (c >= 2 ? c + 2 : c - 2));
        } else if (dir === 'LEFT' || dir === 'RIGHT') {
          setMainCursor((c) => (c % 2 === 0 ? c + 1 : c - 1));
        }
      } else {
        if (dir === 'UP') {
          setFightCursor((c) => (c < 2 ? c + 2 : c - 2));
        } else if (dir === 'DOWN') {
          setFightCursor((c) => (c >= 2 ? c + 2 : c - 2));
        } else if (dir === 'LEFT' || dir === 'RIGHT') {
          setFightCursor((c) => (c % 2 === 0 ? c + 1 : c - 1));
        }
      }
    };

    const handleA = () => {
      if (!battleState) return;
      if (battleState.isOver) {
        playRetroSound('beep');
        onExit();
        return;
      }
      const isTyping = activeMessageIndex < textQueue.length;
      if (isTyping || isEnemyTurn) return;

      playRetroSound('select');
      if (activeMenu === 'MAIN') {
        if (mainCursor === 0) {
          setActiveMenu('FIGHT');
        } else if (mainCursor === 1) {
          handleHeal();
        } else if (mainCursor === 2) {
          handleRoastAttack();
        } else if (mainCursor === 3) {
          handleRun();
        }
      } else {
        handleAttack(fightCursor);
        setActiveMenu('MAIN');
      }
    };

    const handleB = () => {
      if (!battleState) return;
      playRetroSound('beep');
      if (battleState.isOver) {
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
  }, [
    registerDirectionHandler,
    registerAHandler,
    registerBHandler,
    battleState,
    activeMenu,
    mainCursor,
    fightCursor,
    isEnemyTurn,
    textQueue,
    activeMessageIndex
  ]);

  if (!battleState) {
    return (
      <div className="flex-1 flex items-center justify-center font-mono text-[9px]">
        BOOTING ARENA CORE...
      </div>
    );
  }

  // HP percentage trackers
  const enemyHPPercent = Math.max(0, Math.min(100, (battleState.enemyHP / battleState.enemyMaxHP) * 100));
  const playerHPPercent = Math.max(0, Math.min(100, (battleState.playerHP / battleState.playerMaxHP) * 100));

  return (
    <div className="flex-1 flex flex-col justify-between py-1 px-1 text-[#1a1a1a] select-none min-h-full relative">
      
      {/* Upper Combat Zone (Pokemon Arena Layout) */}
      <div className="flex-1 flex flex-col justify-between space-y-2 py-1 max-h-[195px] sm:max-h-[225px]">
        {/* Opponent Status (Top Align) */}
        <div className="flex justify-between items-start border-b border-[#1a1a1a] border-dotted pb-1">
          <canvas
            ref={enemyCanvasRef}
            width={40}
            height={40}
            className="w-[40px] h-[40px] border border-[#1a1a1a] bg-[#ffffff] rounded-sm pixelated"
          />
          <div className="flex-1 ml-2 font-mono text-[8px] leading-tight space-y-1">
            <div className="flex justify-between font-bold">
              <span className="truncate max-w-[90px]">{battleState.enemyName}</span>
              <span className="text-[#7f001c]">LV {battleState.enemyLevel}</span>
            </div>
            {/* Health Meter HUD */}              <div className="flex items-center space-x-1">
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
              {battleState.enemyHP} / {battleState.enemyMaxHP}
            </div>
          </div>
        </div>

        {/* Player Status (Bottom Align) */}
        <div className="flex justify-between items-end pt-1">
          <div className="flex-1 mr-2 font-mono text-[8px] leading-tight space-y-1">
            <div className="flex justify-between font-bold">
              <span>{playerMon.name.toUpperCase()}</span>
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
              {battleState.playerHP} / {battleState.playerMaxHP}
            </div>
          </div>
          <canvas
            ref={playerCanvasRef}
            width={40}
            height={40}
            className="w-[40px] h-[40px] border border-[#1a1a1a] bg-[#ffffff] rounded-sm pixelated"
          />
        </div>
      </div>

      {/* Screen Division Border */}
      <div className="w-full border-t border-[#1a1a1a] dither-border-b my-1" />

      {/* Lower interaction action panel */}
      <div className="h-[68px] min-h-[68px] bg-white border border-[#1a1a1a] p-1 flex flex-col justify-between font-mono text-[8.5px] leading-tight select-none">
        {/* Narration typewriter block takes precedence if active */}
        {displayedText ? (
          <div className="flex-1 p-0.5 flex items-start space-x-1 uppercase italic font-bold">
            <span className="text-[#7f001c]">&gt;</span>
            <p className="flex-1 pr-1">{displayedText}</p>
          </div>
        ) : battleState.isOver ? (
          // End state display
          <div className="flex-1 flex flex-col justify-between p-0.5">
            <div className="font-bold text-[#7f001c] uppercase text-center py-1">
              {battleState.result === 'WIN' ? '* VICTORY OVER EXCEPTION *' : battleState.result === 'RUN' ? '* RETREAT SUCCESSFUL *' : '* CRITICAL STACKS OVERFLOW *'}
            </div>
            <button
              onClick={() => {
                playRetroSound('beep');
                onExit();
              }}
              className="w-full text-center py-1 bg-[#1a1a1a] text-white font-bold cursor-pointer rounded-sm hover:invert"
            >
              PRESS TARGET [A] TO RESET
            </button>
          </div>
        ) : (
          // Menu selection
          <div className="flex-1 flex">
            {activeMenu === 'MAIN' ? (
              // Main Grid Option list
              <div className="flex-1 grid grid-cols-2 gap-1 p-0.5 font-bold">
                <button
                  onClick={() => {
                    playRetroSound('beep');
                    setActiveMenu('FIGHT');
                    setMainCursor(0);
                  }}
                  onMouseEnter={() => setMainCursor(0)}
                  className={`flex items-center select-none text-left cursor-pointer transition-colors ${mainCursor === 0 ? 'text-[#7f001c] font-black' : 'text-[#1a1a1a] hover:text-[#7f001c]'}`}
                >
                  <span className="mr-1">{mainCursor === 0 ? '▶' : '▷'}</span>FIGHT
                </button>
                <button
                  onClick={handleHeal}
                  onMouseEnter={() => setMainCursor(1)}
                  className={`flex items-center select-none text-left cursor-pointer transition-colors ${mainCursor === 1 ? 'text-[#7f001c] font-black' : 'text-[#1a1a1a] hover:text-[#7f001c]'}`}
                >
                  <span className="mr-1">{mainCursor === 1 ? '▶' : '▷'}</span>REPAIR CODES
                </button>
                <button
                  onClick={handleRoastAttack}
                  onMouseEnter={() => setMainCursor(2)}
                  className={`flex items-center select-none text-left cursor-pointer transition-colors ${mainCursor === 2 ? 'text-[#7f001c] font-black' : 'text-[#1a1a1a] hover:text-[#7f001c]'}`}
                >
                  <span className="mr-1">{mainCursor === 2 ? '▶' : '▷'}</span>SPIT ROAST
                </button>
                <button
                  onClick={handleRun}
                  onMouseEnter={() => setMainCursor(3)}
                  className={`flex items-center select-none text-left cursor-pointer transition-colors ${mainCursor === 3 ? 'text-[#7f001c] font-black' : 'text-[#1a1a1a] hover:text-[#7f001c]'}`}
                >
                  <span className="mr-1">{mainCursor === 3 ? '▶' : '▷'}</span>QUIT (-9)
                </button>
              </div>
            ) : (
              // Attack options panel listing moves
              <div className="flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-0.5 p-0.5 font-bold">
                  {playerMon.moves.map((move, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAttack(idx)}
                      onMouseEnter={() => setFightCursor(idx)}
                      className={`text-left py-0.5 select-none truncate cursor-pointer transition-colors ${fightCursor === idx ? 'text-[#7f001c] font-black' : 'text-gray-750 hover:text-[#7f001c]'}`}
                      title={move.desc}
                    >
                      <span className="mr-0.5">{fightCursor === idx ? '▶' : '▷'}</span>
                      {move.name.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    playRetroSound('beep');
                    setActiveMenu('MAIN');
                  }}
                  className="text-center font-bold text-[7px] text-gray-500 hover:text-[#1a1a1a] border-t border-dashed border-gray-200 mt-1 cursor-pointer"
                >
                  [B] CANCEL (BACK TO MENU)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
