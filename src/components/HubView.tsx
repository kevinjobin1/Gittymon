import React, { useState, useEffect } from 'react';
import { RoastMon } from '../types';
import { playRetroSound } from '../utils/audio';

interface HubViewProps {
  mon: RoastMon;
  activeOnlineCount: number;
  onSelectOption: (option: string) => void;
  // Let parent pass keypress updates
  registerDirectionHandler: (handler: ((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void) | null) => void;
  registerAHandler: (handler: (() => void) | null) => void;
  registerBHandler: (handler: (() => void) | null) => void;
}

export function HubView({
  mon,
  activeOnlineCount,
  onSelectOption,
  registerDirectionHandler,
  registerAHandler,
  registerBHandler,
}: HubViewProps) {
  const [cursor, setCursor] = useState(0);

  const OPTIONS = [
    { id: 'STATS', label: '1. BUGGYMON STATS', desc: 'Inspect level, moves & stats' },
    { id: 'SINGLE_FIGHT', label: '2. LOCAL GLADIATOR', desc: 'Battle classic offline bugs' },
    { id: 'PVP_LOBBY', label: '3. ONLINE ARENA', desc: `PVP over WebSocket [Live!]` },
    { id: 'AI_BOSS', label: '4. AI GLITCH BOSS', desc: 'Savage live AI Gym Leader' },
    { id: 'LEADERBOARD', label: '5. GLOBAL RANKS', desc: 'Check high scores list' },
    { id: 'EXPORT_EMBED', label: '6. EXPORT BADGE', desc: 'Embed card in websites & Github readmes' },
    { id: 'HISTORY', label: '7. ROASTDEC LOGS', desc: 'Previously summoned beasts' },
    { id: 'RESET', label: '8. DISCARD RECORD', desc: 'Delete data & summon new' },
  ];

  // Dynamic D-Pad movement controls
  useEffect(() => {
    const handleDirection = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      if (dir === 'UP') {
        playRetroSound('beep');
        setCursor((c) => (c === 0 ? OPTIONS.length - 1 : c - 1));
      } else if (dir === 'DOWN') {
        playRetroSound('beep');
        setCursor((c) => (c === OPTIONS.length - 1 ? 0 : c + 1));
      }
    };

    const handleA = () => {
      playRetroSound('select');
      onSelectOption(OPTIONS[cursor].id);
    };

    const handleB = () => {
      // Default to back out to stats
      playRetroSound('beep');
      onSelectOption('STATS');
    };

    registerDirectionHandler(handleDirection);
    registerAHandler(handleA);
    registerBHandler(handleB);

    return () => {
      registerDirectionHandler(null);
      registerAHandler(null);
      registerBHandler(null);
    };
  }, [cursor, OPTIONS, onSelectOption]);

  return (
    <div className="flex-1 flex flex-col justify-between p-1 px-1.5 text-[#1a1a1a] select-none font-mono">
      {/* Visual Header */}
      <div className="flex justify-between items-center border-b-2 border-[#1a1a1a] pb-1.5 font-bold text-[9px] tracking-tight">
        <span>BUGGYMON HUB V2</span>
        <span className="text-emerald-800 animate-pulse text-[8px]">● ONLINE: {activeOnlineCount}</span>
      </div>

      {/* Mini Summon Banner */}
      <div className="flex items-center space-x-2 bg-neutral-100 border border-neutral-300 rounded p-1 my-1 shadow-[1px_1px_0px_rgba(0,0,0,0.1)]">
        <img
          src={mon.avatarUrl}
          referrerPolicy="no-referrer"
          alt={mon.name}
          className="w-8 h-8 rounded border border-[#1a1a1a] pixelated shadow-[1px_1px_0px_#1a1a1a]"
        />
        <div className="flex-1 min-w-0">
          <div className="text-[8px] font-bold text-gray-400 uppercase leading-none">ACTIVE BUGGYMON:</div>
          <div className="text-[9px] font-bold text-[#7f001c] truncate">{mon.name.toUpperCase()}</div>
          <div className="text-[7.5px] text-gray-600 leading-none">LV {mon.level} • {mon.type.toUpperCase()}</div>
        </div>
      </div>

      {/* Retro Menu Core */}
      <div className="flex-1 flex flex-col justify-center py-1 font-mono text-[9px] space-y-1">
        {OPTIONS.map((opt, idx) => {
          const isSelected = cursor === idx;
          return (
            <button
              key={opt.id}
              onClick={() => {
                setCursor(idx);
                playRetroSound('select');
                onSelectOption(opt.id);
              }}
              className={`flex items-start text-left w-full py-0.5 px-1 rounded transition-colors ${
                isSelected
                  ? 'bg-[#1a1a1a] text-white font-bold'
                  : 'hover:bg-neutral-200'
              }`}
            >
              <span className="w-3 text-center mr-1">
                {isSelected ? '▶' : ' '}
              </span>
              <span className="flex-1 truncate">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Screen Sub-narrative dialog footer */}
      <div className="h-[26px] border-2 border-[#1a1a1a] bg-[#e1dfde] rounded p-1 text-[7.5px] leading-tight flex items-center justify-between text-gray-700">
        <span className="truncate pr-1">{OPTIONS[cursor].desc}</span>
        <span className="text-[6.5px] uppercase text-gray-500 font-bold shrink-0 border border-gray-400 px-0.5 rounded">
          A=GO
        </span>
      </div>
    </div>
  );
}
