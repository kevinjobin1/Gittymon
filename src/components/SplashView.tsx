import React, { useState, useEffect, useRef } from 'react';
import { playRetroSound } from '../utils/audio';

interface SplashViewProps {
  onSummon: (username: string) => void;
  onViewHistory: () => void;
  hasHistory: boolean;
}

export function SplashView({ onSummon, onViewHistory, hasHistory }: SplashViewProps) {
  const [username, setUsername] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Automatically focus the input for instant gameboy tactile keyboard input on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!username.trim()) {
      playRetroSound('accent');
      return;
    }
    playRetroSound('sweep');
    onSummon(username.trim());
  };

  return (
    <div className="flex-1 flex flex-col justify-between py-2 px-1 text-[#1a1a1a]">
      {/* Game Headings */}
      <div className="text-center w-full border-b border-[#1a1a1a] pb-1 dither-border-b">
        <h1 className="font-sans font-black text-lg leading-none tracking-tight text-center uppercase">
          BUGGYMON
        </h1>
        <p className="font-mono text-[7px] text-gray-500 uppercase tracking-normal text-center mt-0.5">
          "Catch' em all, Buggymon!"
        </p>
      </div>

      {/* Main visual core */}
      <div className="flex-1 flex flex-col items-center justify-center py-2 space-y-3">
        <div className="text-center space-y-1">
          <h2 className="font-sans font-bold text-md leading-tight uppercase tracking-tighter">
            SUMMON YOUR
          </h2>
          <h3 className="font-sans font-extrabold text-xl leading-none tracking-tight text-[#7f001c] uppercase italic">
            BUGGYMON
          </h3>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="w-full space-y-2 mt-1">
          <div className="flex flex-col">
            <label className="font-mono text-[9px] font-bold text-[#1a1a1a] uppercase tracking-wider mb-1">
              ENTER TARGET:
            </label>
            <input
              ref={inputRef}
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''));
                playRetroSound('beep');
              }}
              placeholder="github_username"
              className="retro-input w-full p-2 text-xs font-mono select-all uppercase placeholder-gray-400"
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          <button
            type="submit"
            className="retro-btn-ingame w-full py-2 font-mono font-bold text-[11px] cursor-pointer"
          >
            PRESS START
          </button>
        </form>
      </div>

      {/* Footer view selection links */}
      {hasHistory && (
        <button
          onClick={() => {
            playRetroSound('select');
            onViewHistory();
          }}
          className="w-full py-1 text-center font-mono text-[8.5px] font-bold border-t border-[#1a1a1a] border-dashed hover:text-[#7f001c] cursor-pointer mt-1"
        >
          SELECT &gt; VIEW HALL OF FAME
        </button>
      )}
    </div>
  );
}
