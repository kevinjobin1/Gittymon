import React, { useState, useEffect, useRef } from 'react';
import { RoastMon } from '../types';
import { drawProceduralMon } from '../utils/procGen';
import { playRetroSound } from '../utils/audio';

interface HistoryViewProps {
  history: RoastMon[];
  onSelect: (mon: RoastMon) => void;
  onClearIndex: (index: number) => void;
  onBack: () => void;
}

export function HistoryView({ history, onSelect, onClearIndex, onBack }: HistoryViewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [frame, setFrame] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Auto animation loop for selected preview sprite
  useEffect(() => {
    let animId: number;
    const tick = () => {
      setFrame((f) => (f + 1) % 100);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  const activeMon = history[selectedIndex] || null;

  // Redraw preview canvas immediately
  useEffect(() => {
    if (!activeMon || !canvasRef.current) return;
    drawProceduralMon(canvasRef.current, activeMon.spriteSeed, frame, 'dmg');
  }, [activeMon, frame]);

  const handleSelectIndex = (idx: number) => {
    playRetroSound('beep');
    setSelectedIndex(idx);
  };

  const handleConfirmSelect = () => {
    if (activeMon) {
      playRetroSound('select');
      onSelect(activeMon);
    }
  };

  const handleDeleteIndex = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    playRetroSound('hit');
    onClearIndex(idx);
    setSelectedIndex((prev) => Math.max(0, Math.min(history.length - 2, prev)));
  };

  return (
    <div className="flex-1 flex flex-col justify-between py-1 px-1 text-[#1a1a1a] min-h-full select-none">
      
      {/* Header index panel */}
      <div className="border-b border-[#1a1a1a] pb-1 dither-border-b text-center">
        <h2 className="font-sans font-bold text-xs uppercase tracking-wider">
          ROAST-DEX REGISTRY
        </h2>
      </div>

      {history.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-3 text-center font-mono text-[9px]">
          <p className="italic text-gray-500">REGISTRY IS EMPTY.</p>
          <p className="mt-2 text-[7.5px] text-gray-400">SUMMON YOUR FIRST TARGET TO POPULATE THE ARCHIVES!</p>
          <button
            onClick={onBack}
            className="retro-btn-ingame py-1.5 px-3 mt-4 text-[9px] font-bold cursor-pointer"
          >
            A-BACK
          </button>
        </div>
      ) : (
        <div className="flex-1 flex my-2 space-x-1.5 h-[160px] overflow-hidden">
          
          {/* Scrollable list of profiles on the Left */}
          <div className="flex-1 border-2 border-[#1a1a1a] bg-white h-full overflow-y-auto">
            {history.map((mon, idx) => {
              const active = idx === selectedIndex;
              return (
                <div
                  key={idx}
                  onClick={() => handleSelectIndex(idx)}
                  className={`flex justify-between items-center px-1.5 py-1.5 border-b border-gray-100 last:border-0 font-mono text-[8.5px] cursor-pointer ${
                    active ? 'bg-[#7f001c] text-white font-bold' : 'hover:bg-gray-100 text-[#1a1a1a]'
                  }`}
                >
                  <span className="truncate max-w-[70px] uppercase">
                    {idx + 1}. {mon.username}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[7px]" style={{ fontSize: '7px' }}>LV{mon.level}</span>
                    <button
                      onClick={(e) => handleDeleteIndex(idx, e)}
                      className={`h-4 w-4 text-[8px] flex items-center justify-center border hover:bg-gray-200 hover:text-red-500 rounded-sm leading-none font-bold ${
                        active ? 'border-white text-white bg-transparent' : 'border-[#1a1a1a] text-gray-400 bg-white'
                      }`}
                      title="Release user"
                    >
                      X
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dynamic Pokedex Preview card on the Right */}
          {activeMon && (
            <div className="w-[100px] border-2 border-[#1a1a1a] bg-[#e2dfde] p-1 flex flex-col items-center justify-between font-mono text-[8px] leading-tight select-none">
              <div className="text-center font-bold text-center w-full truncate border-b border-gray-400 pb-0.5" style={{ fontSize: '7.5px' }}>
                {activeMon.name.toUpperCase()}
              </div>

              {/* Animated sprite view */}
              <canvas
                ref={canvasRef}
                width={48}
                height={48}
                className="w-12 h-12 border border-[#1a1a1a] bg-white rounded-sm pixelated my-1"
              />

              {/* Quick statistics layout */}
              <div className="w-full space-y-0.5">
                <div className="flex justify-between">
                  <span>HP:</span>
                  <span className="font-bold">{activeMon.stats.hp}</span>
                </div>
                <div className="flex justify-between">
                  <span>ATK:</span>
                  <span className="font-bold">{activeMon.stats.attack}</span>
                </div>
                <div className="flex justify-between flex-nowrap overflow-hidden">
                  <span className="truncate">{activeMon.type.substring(0, 5)}</span>
                </div>
              </div>

              <button
                onClick={handleConfirmSelect}
                className="w-full text-center py-1 mt-1 font-bold text-[7.5px] bg-[#1a1a1a] text-white rounded-sm hover:invert cursor-pointer"
              >
                A-INSPECT
              </button>
            </div>
          )}
        </div>
      )}

      {/* Navigation shortcuts footer */}
      {history.length > 0 && (
        <div className="border-t border-dashed border-[#1a1a1a] pt-1 flex justify-between font-mono text-[8px]">
          <button
            onClick={() => {
              playRetroSound('beep');
              onBack();
            }}
            className="text-gray-500 hover:text-[#1a1a1a] cursor-pointer"
          >
            &lt; B-BACK
          </button>
          <span className="text-gray-400 uppercase">A-CONFIRM</span>
        </div>
      )}
    </div>
  );
}
