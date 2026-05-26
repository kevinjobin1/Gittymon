import React, { useState, useEffect, useRef } from "react";
import { playRetroSound } from "../utils/audio";
import { drawCardFrame } from "../utils/cardRenderer";
import type { CardData } from "../utils/cardRenderer";
import { parseProviderInput } from "../providers";

interface SplashViewProps {
  onSummon: (username: string, provider?: string) => void;
}

function parseProviderInputString(input: string): { username: string; provider?: string } | null {
  const result = parseProviderInput(input);
  if (!result) return null;
  return { username: result.username, provider: result.provider.provider };
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

export function SplashView({ onSummon }: SplashViewProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const demoCanvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const animRef = useRef<number>(0);

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Parse ?username= and ?provider= query params to auto-summon on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlUsername = params.get('username');
    const urlProvider = params.get('provider');

    if (!urlUsername) return;

    // Validate the provider param if given
    const validProvider = urlProvider === 'gitlab' || urlProvider === 'github' ? urlProvider : undefined;

    // Slight delay to let the splash screen render before auto-summoning
    const timer = setTimeout(() => {
      setUsername(urlUsername);
      const parsed = validProvider
        ? { username: urlUsername.replace(/[^a-zA-Z0-9._-]/g, ''), provider: validProvider }
        : parseProviderInputString(urlUsername);

      if (!parsed || !parsed.username) {
        setError(`Invalid username from URL: "${urlUsername}"`);
        return;
      }

      playRetroSound('sweep');
      onSummon(parsed.username, parsed.provider);
    }, 100);

    return () => clearTimeout(timer);
  }, [onSummon]);

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

    const parsed = parseProviderInputString(username);
    if (!parsed) {
      setError("Enter a valid Git username");
      playRetroSound("accent");
      return;
    }

    playRetroSound("sweep");
    onSummon(parsed.username, parsed.provider);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    setError("");
    playRetroSound("beep");
  };

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
              ENTER GIT USERNAME:
            </label>
            <input
              ref={inputRef}
              type="text"
              value={username}
              onChange={handleInputChange}
              placeholder="git_username"
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

        <p className="font-mono text-[7px] text-gray-400 uppercase text-center leading-tight">
          Accepts GitHub/GitLab URLs, @mentions, or plain usernames
        </p>
      </div>

      {/* Footer */}
      <div className="border-t border-[#1a1a1a] border-dashed pt-1 mt-2 text-center font-mono text-[7px] text-gray-500 shrink-0">
        GITTYMON v2 • CARD GENERATOR
      </div>
    </div>
  );
}
