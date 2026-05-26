import React, { useState, useEffect, useRef } from "react";
import { playRetroSound } from "../utils/audio";
import { drawCardFrame } from "../utils/cardRenderer";
import type { CardData } from "../utils/cardRenderer";
import type { UserIdentity } from "../types";

interface SplashViewProps {
  onSummon: (username: string) => void;
  identity: UserIdentity | null;
  onGoToCollection: () => void;
}

function parseGitHubUsername(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Strip leading @
  let username = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;

  // Extract from GitHub URL
  const githubMatch = username.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9-]+)/
  );
  if (githubMatch) {
    username = githubMatch[1];
  }

  // Validate: only alphanumeric and hyphens
  if (!/^[a-zA-Z0-9-]+$/.test(username)) return null;

  return username;
}

// Hardcoded demo card data for 'octocat' preview
const DEMO_CARD: CardData = {
  username: "octocat",
  monName: "OctocatBeast",
  type: "beta",
  level: 42,
  roast:
    "Pushes code at the speed of a dial-up modem. Your PRs collect more dust than a server room.",
  stats: { hp: 88, attack: 65, defense: 70, speed: 55, chaos: 30 },
  spriteSeed: "octocat-demo",
  wins: 128,
  losses: 42,
};

export function SplashView({ onSummon, identity, onGoToCollection }: SplashViewProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const demoCanvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const animRef = useRef<number>(0);

  const isReturningUser = identity !== null && identity.username;
  const favoriteCard = identity?.favoriteCardId
    ? identity.cards.find((c) => c.id === identity.favoriteCardId)
    : null;

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current && !isReturningUser) {
      inputRef.current.focus();
    }
  }, [isReturningUser]);

  // Animated demo canvas preview
  useEffect(() => {
    let frame = 0;
    let running = true;

    const animate = () => {
      if (!running) return;
      if (frame % 6 === 0) {
        const canvas = demoCanvasRef.current;
        if (canvas) {
          drawCardFrame(canvas, DEMO_CARD, Math.floor(frame / 6));
        }
      }
      frame++;
      animRef.current = requestAnimationFrame(animate);
    };

    const timeout = setTimeout(() => {
      animRef.current = requestAnimationFrame(animate);
    }, 50);

    return () => {
      running = false;
      clearTimeout(timeout);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");

    const parsed = parseGitHubUsername(username);
    if (!parsed) {
      setError("Enter a valid GitHub username");
      playRetroSound("accent");
      return;
    }

    playRetroSound("sweep");
    onSummon(parsed);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    setError("");
    playRetroSound("beep");
  };

  // Returning user view — show welcome back with quick actions
  if (isReturningUser) {
    return (
      <div className="flex-1 flex flex-col justify-between py-2 px-1 text-[#1a1a1a]">
        {/* Welcome Header */}
        <div className="border-b border-[#1a1a1a] pb-2 border-dashed text-center">
          <h1 className="font-sans font-bold text-lg uppercase tracking-widest">
            WELCOME BACK
          </h1>
          <p className="font-mono text-xs font-bold text-[#7f001c] mt-0.5">
            @{identity!.username.toUpperCase()}
          </p>
        </div>

        {/* Stats row */}
        <div className="flex justify-center gap-4 my-2 shrink-0">
          <div className="text-center">
            <p className="font-mono text-[22px] font-bold leading-none">{identity!.cards.length}</p>
            <p className="font-mono text-[7px] uppercase tracking-wider text-gray-500">Cards</p>
          </div>
          <div className="w-px bg-[#1a1a1a] opacity-20 self-stretch" />
          <div className="text-center">
            <p className="font-mono text-[22px] font-bold leading-none">{identity!.totalRerolls}</p>
            <p className="font-mono text-[7px] uppercase tracking-wider text-gray-500">Rerolls</p>
          </div>
        </div>

        {/* Demo card preview — always shows octocat demo */}
        <div className="flex flex-col items-center mb-1 shrink-0">
          <div className="w-full bg-[#18181b] p-1 border border-[#1a1a1a] rounded flex items-center justify-center overflow-hidden">
            <canvas
              ref={demoCanvasRef}
              width={460}
              height={220}
              className="w-full h-auto max-h-[130px] object-contain"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
          <p className="font-mono text-[7px] text-gray-500 uppercase tracking-normal text-center mt-1">
            {favoriteCard
              ? `⭐ ${favoriteCard.base.name} (${favoriteCard.rarity.toUpperCase()})`
              : 'preview: @octocat'}
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-2">
          <button
            onClick={onGoToCollection}
            className="retro-btn-ingame w-full py-2.5 font-mono font-bold text-[11px] cursor-pointer tracking-wider"
          >
            VIEW COLLECTION ▸
          </button>

          <p className="font-mono text-[8px] text-gray-500 uppercase">— or —</p>

          <form onSubmit={handleSubmit} className="w-full space-y-2">
            <div className="flex flex-col">
              <label className="font-mono text-[9px] font-bold text-[#1a1a1a] uppercase tracking-wider mb-1">
                SUMMON NEW CARD:
              </label>
              <input
                ref={inputRef}
                type="text"
                value={username}
                onChange={handleInputChange}
                placeholder="github_username"
                className="retro-input w-full p-2 text-xs font-mono select-all uppercase placeholder-gray-400"
                autoComplete="off"
                spellCheck="false"
              />
              {error && (
                <p className="font-mono text-[8px] text-[#7f001c] font-bold mt-1">
                  ! {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="retro-btn-ingame w-full py-2.5 font-mono font-bold text-[11px] cursor-pointer tracking-wider"
            >
              GET YOUR BADGE ▸
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-[#1a1a1a] border-dashed pt-1 mt-2 text-center font-mono text-[7px] text-gray-500 shrink-0">
          GITTYMON v2 • IDENTITY CARD SYSTEM
        </div>
      </div>
    );
  }

  // New user view — prompt to create identity via first summon
  return (
    <div className="flex-1 flex flex-col justify-between py-2 px-1 text-[#1a1a1a]">
      {/* Demo Card Preview */}
      <div className="flex flex-col items-center mb-2 shrink-0">
        <div className="w-full bg-[#18181b] p-1 border border-[#1a1a1a] rounded flex items-center justify-center overflow-hidden">
          <canvas
            ref={demoCanvasRef}
            width={460}
            height={220}
            className="w-full h-auto max-h-[130px] object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
        <p className="font-mono text-[7px] text-gray-500 uppercase tracking-normal text-center mt-1">
          preview: @octocat
        </p>
      </div>

      {/* Input + CTA */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-3">
        <form onSubmit={handleSubmit} className="w-full space-y-2">
          <div className="flex flex-col">
            <label className="font-mono text-[9px] font-bold text-[#1a1a1a] uppercase tracking-wider mb-1">
              ENTER GITHUB USERNAME:
            </label>
            <input
              ref={inputRef}
              type="text"
              value={username}
              onChange={handleInputChange}
              placeholder="github_username"
              className="retro-input w-full p-2 text-xs font-mono select-all uppercase placeholder-gray-400"
              autoComplete="off"
              spellCheck="false"
            />
            {error && (
              <p className="font-mono text-[8px] text-[#7f001c] font-bold mt-1">
                ! {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="retro-btn-ingame w-full py-2.5 font-mono font-bold text-[11px] cursor-pointer tracking-wider"
          >
            CREATE YOUR IDENTITY ▸
          </button>
        </form>

        <p className="font-mono text-[7px] text-gray-400 uppercase text-center leading-tight">
          Accepts GitHub URLs, @mentions, or plain usernames
        </p>
      </div>

      {/* Footer */}
      <div className="border-t border-[#1a1a1a] border-dashed pt-1 mt-2 text-center font-mono text-[7px] text-gray-500 shrink-0">
        GITTYMON v2 • IDENTITY CARD SYSTEM
      </div>
    </div>
  );
}
