import React, { useState, useEffect } from 'react';
import { RoastMon } from '../types';
import { playRetroSound } from '../utils/audio';

interface ExportEmbedViewProps {
  mon: RoastMon;
  onBack: () => void;
  registerDirectionHandler: (handler: ((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void) | null) => void;
  registerAHandler: (handler: (() => void) | null) => void;
  registerBHandler: (handler: (() => void) | null) => void;
}

export function ExportEmbedView({
  mon,
  onBack,
  registerDirectionHandler,
  registerAHandler,
  registerBHandler,
}: ExportEmbedViewProps) {
  const [cursor, setCursor] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Dynamic origin detection
  const origin = window.location.origin || `${window.location.protocol}//${window.location.host}`;
  const rawGifUrl = `${origin}/api/embed/${mon.username}.gif`;
  
  const EXPORTS = [
    {
      label: 'GITHUB README (MARKDOWN GIF)',
      code: `[![Roastmon Profile Card](${rawGifUrl})](${origin})`,
      desc: 'Insert this fully animated, live-updating badge directly into your GitHub repository profile README.',
    },
    {
      label: 'WEBSITE EMBED (HTML IMAGE)',
      code: `<img src="${rawGifUrl}" width="460" height="220" alt="${mon.username}'s Roastmon Profile" style="image-rendering: pixelated;" />`,
      desc: 'Embed a crisp, real-time looping animated retro card onto your HTML portfolio website or blog.',
    },
    {
      label: 'RAW DYNAMIC GIF URL',
      code: rawGifUrl,
      desc: 'The direct API endpoint serving the looping, optimized animated GIF resource.',
    }
  ];

  useEffect(() => {
    const handleDirection = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      if (dir === 'UP') {
        playRetroSound('beep');
        setCursor((c) => (c === 0 ? EXPORTS.length - 1 : c - 1));
        setCopiedIndex(null);
      } else if (dir === 'DOWN') {
        playRetroSound('beep');
        setCursor((c) => (c === EXPORTS.length - 1 ? 0 : c + 1));
        setCopiedIndex(null);
      }
    };

    const handleA = () => {
      // Copy current highlighted index to clipboard
      handleCopy(cursor);
    };

    const handleB = () => {
      playRetroSound('beep');
      onBack();
    };

    registerDirectionHandler(handleDirection);
    registerAHandler(handleA);
    registerBHandler(handleB);

    return () => {
      registerDirectionHandler(null);
      registerAHandler(null);
      registerBHandler(null);
    };
  }, [cursor, onBack]);

  const handleCopy = (index: number) => {
    try {
      navigator.clipboard.writeText(EXPORTS[index].code);
      playRetroSound('summon');
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2500);
    } catch (e) {
      console.warn('Could not copy string securely to clipboard:', e);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-1 px-1.5 text-[#1a1a1a] select-none font-mono min-h-full">
      {/* Title */}
      <div className="flex justify-between items-center border-b-2 border-[#1a1a1a] pb-1.5 font-bold text-[9px] tracking-tight shrink-0">
        <span className="text-[#7f001c]">▲ CARD EXPORTER ENGINE</span>
        <button onClick={onBack} className="hover:underline text-[7.5px] uppercase font-bold text-gray-500">
          ◀ BACK (B)
        </button>
      </div>

      {/* Embedded Live Retro GIF Sandbox Preview */}
      <div className="my-1.5 flex flex-col items-center bg-gray-100 border border-neutral-300 rounded p-1 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.1)]">
        <div className="w-full flex justify-between items-center mb-0.5 text-[7px] text-zinc-500 font-bold uppercase leading-none px-1">
          <span>LIVE BADGE PREVIEW:</span>
          <span className="text-[6.5px] text-[#7f001c] animate-pulse">● LOADED FROM LOCAL API</span>
        </div>
        
        {/* Container with exact aspect ratio to fit Gameboy screen frame mockup beautifully */}
        <div className="w-full bg-[#18181b] p-1 border border-[#1a1a1a] rounded flex items-center justify-center max-h-[160px] overflow-hidden">
          <img
            src={rawGifUrl}
            alt={`${mon.name} embed preview`}
            className="w-full h-auto max-h-[150px] object-contain rounded pixelated"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Export Options selections */}
      <div className="flex-1 flex flex-col justify-start space-y-1 overflow-y-auto max-h-[125px] pt-0.5 scrollbar-thin">
        {EXPORTS.map((exp, idx) => {
          const isSelected = cursor === idx;
          const isCopied = copiedIndex === idx;

          return (
            <div
              key={exp.label}
              onClick={() => {
                setCursor(idx);
                playRetroSound('select');
              }}
              className={`p-1 rounded border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#7f001c] bg-[#fffcf5] ring-1 ring-[#7f001c]'
                  : 'border-neutral-200 bg-white hover:bg-neutral-50'
              }`}
            >
              {/* Box Header */}
              <div className="flex justify-between items-center mb-0.5">
                <span className={`text-[7.5px] font-black ${isSelected ? 'text-[#7f001c]' : 'text-zinc-600'}`}>
                  {isSelected ? '▶ ' : '  '}{exp.label}
                </span>
                {isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(idx);
                    }}
                    className={`text-[6.5px] px-1 py-0.5 rounded font-bold uppercase shrink-0 ${
                      isCopied ? 'bg-emerald-800 text-white' : 'bg-[#1a1a1a] text-white hover:bg-[#333333]'
                    }`}
                  >
                    {isCopied ? 'COPIED!' : 'COPY [A]'}
                  </button>
                )}
              </div>

              {/* Subtitle desc */}
              <p className="text-[6px] text-neutral-500 leading-none mb-1 uppercase">
                {exp.desc}
              </p>

              {/* Code line */}
              <div className="bg-neutral-900 text-emerald-400 p-1 rounded font-mono text-[5.8px] leading-tight select-all truncate border border-neutral-950">
                {exp.code}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialogue Footer Instructions */}
      <div className="h-[25px] border-2 border-[#1a1a1a] bg-[#e1dfde] rounded p-1 text-[7px] leading-tight flex items-center justify-between text-gray-700 shrink-0">
        <span className="truncate pr-1">PRESS UP/DOWN TO CHOOSE STYLES • PRESS A TO AUTO-COPY CODE</span>
        <span className="text-[6.5px] uppercase text-zinc-500 font-bold shrink-0 border border-zinc-400 px-0.5 rounded">
          B=EXIT
        </span>
      </div>
    </div>
  );
}
