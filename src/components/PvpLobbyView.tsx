import React, { useState, useEffect } from 'react';
import { RoastMon } from '../types';
import { playRetroSound } from '../utils/audio';

interface PvpLobbyViewProps {
  mon: RoastMon;
  onlineCount: number;
  idlePlayers: string[];
  isSearching: boolean;
  searchError: string | null;
  onStartSearching: () => void;
  onCancelSearching: () => void;
  onBack: () => void;
  registerDirectionHandler: (handler: ((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void) | null) => void;
  registerAHandler: (handler: (() => void) | null) => void;
  registerBHandler: (handler: (() => void) | null) => void;
}

export function PvpLobbyView({
  mon,
  onlineCount,
  idlePlayers = [],
  isSearching,
  searchError,
  onStartSearching,
  onCancelSearching,
  onBack,
  registerDirectionHandler,
  registerAHandler,
  registerBHandler,
}: PvpLobbyViewProps) {
  const [dotCount, setDotCount] = useState(0);

  // Searching loading dot animation
  useEffect(() => {
    if (!isSearching) return;

    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 500);

    return () => clearInterval(interval);
  }, [isSearching]);

  // Hook Gameboy inputs to start/cancel or leave
  useEffect(() => {
    const handleA = () => {
      playRetroSound('select');
      if (isSearching) {
        onCancelSearching();
      } else {
        onStartSearching();
      }
    };

    const handleB = () => {
      playRetroSound('beep');
      if (isSearching) {
        onCancelSearching();
      } else {
        onBack();
      }
    };

    registerDirectionHandler(null); // No movement needed
    registerAHandler(handleA);
    registerBHandler(handleB);

    return () => {
      registerDirectionHandler(null);
      registerAHandler(null);
      registerBHandler(null);
    };
  }, [isSearching, onStartSearching, onCancelSearching, onBack]);

  const searchDots = '.'.repeat(dotCount);

  return (
    <div className="flex-1 flex flex-col justify-between p-1 px-1.5 text-[#1a1a1a] select-none font-mono">
      {/* Visual Header */}
      <div className="flex justify-between items-center border-b-2 border-[#1a1a1a] pb-1 font-bold text-[9px]">
        <span>BUGGYMON NET</span>
        <span className="text-emerald-800 animate-pulse">● ARENA LOBBY</span>
      </div>

      <div className="flex-1 flex flex-col justify-center py-2 space-y-2">
        {/* Connection status card */}
        <div className="border border-neutral-300 bg-neutral-100 rounded p-1.5 text-center shadow-[1px_1px_0px_white_inset]">
          <div className="text-[10px] font-extrabold text-neutral-800 tracking-tight">
            ONLINE TRAINERS: {onlineCount}
          </div>
          
          {idlePlayers.length > 0 ? (
            <div className="mt-1 text-[7px] text-gray-400 font-bold max-h-[22px] overflow-hidden truncate">
              IDLE: {idlePlayers.slice(0, 3).join(', ')}
            </div>
          ) : (
            <div className="mt-1 text-[7.5px] text-gray-500">
              No other idle trainers waiting
            </div>
          )}
        </div>

        {/* Searching Status Panel */}
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#1a1a1a] bg-neutral-50 rounded p-2 text-center select-none min-h-[75px]">
          {isSearching ? (
            <div className="space-y-1.5">
              <div className="relative">
                <div className="animate-spin h-5 w-5 border-4 border-[#1a1a1a] border-t-transparent rounded-full mx-auto" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[7px] font-bold">VS</div>
              </div>
              <div className="text-[9px] font-bold text-neutral-800 leading-none">
                FINDING OPPONENT{searchDots}
              </div>
              <div className="text-[6px] text-gray-400 font-bold px-1 uppercase leading-tight">
                Allocating gladiator. Bots standby if alone...
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-[12px] font-black text-[#7f001c] shrink-0 animate-bounce leading-none">READY!</div>
              <div className="text-[8px] text-gray-500 px-1 font-semibold leading-tight">
                Enter matchmaking to battle real owners online!
              </div>

              {searchError && (
                <div className="text-[7px] text-red-500 font-bold px-1 bg-red-50 rounded mt-1 border border-red-200">
                  {searchError.toUpperCase()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Screen Sub-narrative buttons */}
      <div className="space-y-1 font-mono">
        <button
          onClick={() => {
            playRetroSound('select');
            if (isSearching) onCancelSearching();
            else onStartSearching();
          }}
          className={`w-full py-1 border-2 border-[#1a1a1a] rounded text-[8.5px] font-black shadow-[1.5px_1.5px_0px_#1a1a1a] transition-all active:translate-y-0.5 ${
            isSearching
              ? 'bg-red-200 text-red-800'
              : 'bg-emerald-200 text-emerald-800'
          }`}
        >
          {isSearching ? 'B = CANCEL QUEUE' : 'A = ENTER MATCHMAKING'}
        </button>

        {!isSearching && (
          <button
            onClick={onBack}
            className="w-full py-0.5 border border-dashed border-gray-400 rounded text-[7px] font-bold text-gray-600 hover:bg-neutral-200 transition-colors"
          >
            SELECT = BACK TO HUB
          </button>
        )}
      </div>
    </div>
  );
}
