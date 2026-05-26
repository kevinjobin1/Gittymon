import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RoastMon } from '../types';
import type { GittymonCard } from '../types';
import { drawProceduralMon, drawDitheredAvatar, PALETTE_NAMES } from '../utils/procGen';
import type { PaletteName } from '../utils/procGen';
import { playRetroSound } from '../utils/audio';
import { RetroButton } from '../utils/ripple';
import { useIdentity } from '../lib/useIdentity';
import { RARITY_CONFIGS } from '../lib/rarity';

interface MonDetailsViewProps {
  mon: RoastMon;
  onBattle: () => void;
  onBack: () => void;
}

export function MonDetailsView({ mon, onBattle, onBack }: MonDetailsViewProps) {
  const { identity } = useIdentity();

  // Find the GittymonCard matching this active mon (most recent by username)
  const matchingCard: GittymonCard | undefined = useMemo(() => {
    if (!identity) return undefined;
    const matches = identity.cards.filter((c) => c.base.username === mon.username);
    if (matches.length === 0) return undefined;
    return matches.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
  }, [identity, mon.username]);

  const rarityConfig = matchingCard ? RARITY_CONFIGS[matchingCard.rarity] : null;

  const [activeTab, setActiveTab] = useState<'ROAST' | 'STATS' | 'MOVES'>('ROAST');
  const [viewMode, setViewMode] = useState<'MONSTER' | 'AVATAR'>('MONSTER');
  const [paletteOverride, setPaletteOverride] = useState<PaletteName | undefined>(undefined);
  const [paletteIndex, setPaletteIndex] = useState(-1); // -1 = seed default
  const [frame, setFrame] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Redraw loop for breathing animation (when in MONSTER view mode)
  useEffect(() => {
    let animId: number;

    const tick = () => {
      setFrame((f) => (f + 1) % 100);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animId);
  }, []);

  const cyclePalette = () => {
    playRetroSound('beep');
    const idx = paletteIndex === -1 ? 1 : (paletteIndex + 1) % PALETTE_NAMES.length;
    setPaletteIndex(idx);
    setPaletteOverride(PALETTE_NAMES[idx]);
  };

  // Whenever frame, viewMode, or mon changes, update the visual on the Canvas!
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (viewMode === 'MONSTER') {
      drawProceduralMon(canvas, mon.spriteSeed, frame, paletteOverride);
    } else {
      // Dither profile pic
      drawDitheredAvatar(canvas, mon.avatarUrl);
    }
  }, [viewMode, frame, mon, paletteOverride]);

  const toggleViewMode = () => {
    playRetroSound('beep');
    setViewMode((v) => (v === 'MONSTER' ? 'AVATAR' : 'MONSTER'));
  };

  const handleTabChange = (tab: 'ROAST' | 'STATS' | 'MOVES') => {
    playRetroSound('beep');
    setActiveTab(tab);
  };

  return (
    <div className="flex-1 flex flex-col justify-between py-1 px-1 md:py-1.5 md:px-2 text-[#1a1a1a] select-none">
      {/* Top Header details */}
      <div className="flex justify-between items-center border-b border-[#1a1a1a] pb-1 dither-border-b font-mono text-[9px] font-bold">
        <span className="truncate">{mon.name.toUpperCase()}</span>
        <div className="flex items-center gap-1 shrink-0">
          {rarityConfig && (
            <span
              className="px-1 py-[1px] rounded-full text-[5.5px] font-black uppercase tracking-wider leading-none"
              style={{
                backgroundColor: rarityConfig.color,
                color: rarityConfig.textColor,
              }}
            >
              {rarityConfig.label}
            </span>
          )}
          <span className="text-[#7f001c]">LV {mon.level}</span>
        </div>
      </div>

      {/* Visual Canvas Panel and Character Overview */}
      <div className="flex items-start space-x-2 my-1.5">
        <div className="relative group" onClick={toggleViewMode}>
          <canvas
            ref={canvasRef}
            width={72}
            height={72}
            className="w-[clamp(56px,12vw,96px)] h-[clamp(56px,12vw,96px)] border-2 border-[#1a1a1a] bg-white rounded-sm pixelated shadow-[2px_2px_0px_#1a1a1a]"
          />
          {/* Palette badge — click to cycle */}
          <button
            onClick={(e) => { e.stopPropagation(); cyclePalette(); }}
            className="absolute -bottom-1 -right-1 bg-white border border-[#1a1a1a] px-0.5 py-0 text-[6.5px] uppercase font-mono font-bold leading-none cursor-pointer hover:text-[#7f001c] transition-colors"
            title="Click to cycle color palette"
          >
            {paletteOverride ? PALETTE_NAMES[paletteIndex] : 'DMG'} ◈
          </button>
        </div>

        {/* Character profile basic types */}
        <div className="flex-1 min-w-0 space-y-0.5 font-mono text-[9px] leading-tight">
          <div className="flex flex-col">
            <span className="text-gray-500 text-[8px] uppercase font-bold leading-none">TYPE:</span>
            <span className="font-bold text-[#7f001c] truncate">{mon.type.toUpperCase()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500 text-[8px] uppercase font-bold leading-none">REPOS/FOLLOWER:</span>
            <span className="font-bold">{mon.publicRepos} / {mon.followers}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500 text-[8px] uppercase font-bold leading-none">BORN IN:</span>
            <span className="font-bold">{mon.joinedYear} @ {mon.location.split(',')[0].slice(0, 10)}</span>
          </div>
          {matchingCard && (
            <>
              <div className="flex flex-col">
                <span className="text-gray-500 text-[8px] uppercase font-bold leading-none">FORM:</span>
                <span className="font-bold truncate">{matchingCard.form.name.toUpperCase()}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500 text-[8px] uppercase font-bold leading-none">TIER:</span>
                <span className="font-bold">{matchingCard.evolutionTier}/5</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sub tabs navigation */}
      <div className="flex justify-between border-2 border-[#1a1a1a] bg-[#e2dfde] p-0.5 font-mono text-[8px] font-bold">
        {(['ROAST', 'STATS', 'MOVES'] as const).map((tab) => {
          const active = activeTab === tab;
          return (
            <RetroButton
              key={tab}
              variant="bare"
              press="none"
              onClick={() => handleTabChange(tab)}
              className={`flex-1 py-1 text-center border outline-none uppercase transition-colors ${
                active
                  ? 'bg-white border-[#1a1a1a] text-[#7f001c]'
                  : 'border-transparent text-[#1a1a1a] hover:bg-white/40'
              }`}
            >
              {tab}
            </RetroButton>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 my-1.5 md:my-2 border-2 border-[#1a1a1a] bg-white p-1.5 md:p-2 overflow-y-auto leading-tight">
        {activeTab === 'ROAST' && (
          <div className="space-y-1 font-mono text-[9px] text-[#1a1a1a]">
            <p className="italic">" {mon.roast} "</p>
            {mon.bio && (
              <p className="text-[7.5px] text-gray-400 border-t border-dashed border-gray-300 pt-1 truncate">
                BIO: {mon.bio}
              </p>
            )}
            {matchingCard && matchingCard.mutations.length > 0 && (
              <div className="border-t border-dashed border-gray-300 pt-1 mt-1">
                <span className="text-[7px] font-bold text-gray-400 uppercase">MUTATIONS:</span>
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {matchingCard.mutations.map((m) => {
                    const cfg = RARITY_CONFIGS[matchingCard.rarity];
                    return (
                      <span
                        key={m.id}
                        className="px-1 py-[1px] rounded text-[6px] font-bold uppercase leading-tight"
                        style={{
                          backgroundColor: cfg.color + '22',
                          color: cfg.color,
                          border: `1px solid ${cfg.color}44`,
                        }}
                        title={m.effect}
                      >
                        {m.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {matchingCard && matchingCard.mutations.length === 0 && (
              <p className="text-[7px] text-gray-400 border-t border-dashed border-gray-300 pt-1 mt-1">
                No mutations — pure stock code.
              </p>
            )}
          </div>
        )}

        {activeTab === 'STATS' && (
          <div className="space-y-1 font-mono text-[8px]">
            {Object.entries(mon.stats).map(([statName, val]) => (
              <div key={statName} className="flex items-center">
                <span className="w-10 uppercase text-gray-500 font-bold">{statName.slice(0, 3)}:</span>
                <div className="flex-1 flex space-x-0.5 bg-gray-100 p-0.5 border border-gray-300 h-2.5 items-center">
                  {/* Filled notches up to stat val out of 100 */}
                  {Array.from({ length: 8 }).map((_, i) => {
                    const blockMax = (i + 1) * 12.5;
                    const filled = val >= blockMax;
                    return (
                      <div
                        key={i}
                        className={`flex-1 h-full ${
                          filled ? (statName === 'chaos' ? 'bg-[#7f001c]' : 'bg-[#1a1a1a]') : 'bg-transparent'
                        }`}
                      />
                    );
                  })}
                </div>
                <span className="w-6 text-right font-bold ml-1">{val}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'MOVES' && (
          <div className="space-y-1 font-mono text-[8px]">
            {mon.moves.map((move, i) => (
              <div key={i} className="flex flex-col border-b border-gray-100 pb-0.5 last:border-0 last:pb-0">
                <div className="flex justify-between font-bold text-[8.5px]">
                  <span className="text-[#7f001c]">{move.name.toUpperCase()}</span>
                  <span>PWR {move.power}</span>
                </div>
                <p className="text-gray-500 text-[7px] truncate leading-none mt-0.5">{move.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom control shortcuts bar */}
      <div className="flex justify-between items-center border-t border-dashed border-[#1a1a1a] pt-1">
        <RetroButton
          variant="bare"
          press="none"
          onClick={(e) => {
            playRetroSound('beep');
            onBack();
          }}
          className="font-mono text-[8.5px] font-bold text-gray-500 hover:text-[#1a1a1a]"
        >
          &lt; B-BACK
        </RetroButton>

        <RetroButton
          variant="default"
          press="press"
          onClick={(e) => {
            playRetroSound('sweep');
            onBattle();
          }}
          className="px-3 py-1 text-[8.5px] font-bold transition-transform"
        >
          A-BATTLE BUG!
        </RetroButton>
      </div>
    </div>
  );
}
