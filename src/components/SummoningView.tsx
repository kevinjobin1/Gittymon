import React, { useState, useEffect } from 'react';
import { playRetroSound } from '../utils/audio';
import { ProviderIcon } from './ProviderIcon';

interface SummoningViewProps {
  username: string;
  provider?: string;
  fallbackWarning?: string | null;
  onFinished: () => void;
}

export function SummoningView({ username, provider, fallbackWarning, onFinished }: SummoningViewProps) {
  const [percent, setPercent] = useState(0);
  const [currentAction, setCurrentAction] = useState('DIALING SATELLITES...');
  const [logs, setLogs] = useState<string[]>([]);
  const [showFallbackBanner, setShowFallbackBanner] = useState(false);

  const isGitLab = provider === 'gitlab';
  const providerLabel = isGitLab ? 'GITLAB' : 'GITHUB';

  // Provider-aware process steps
  const processSteps = [
    { threshold: 0, text: `PINGING ${providerLabel}...`, action: 'LOCATING TARGET...' },
    { threshold: 18, text: 'TARGET REVEALED!', action: 'FETCHING RAW DATA...' },
    { threshold: 35, text: 'PARSING REPO METRICS...', action: 'COMPILING COMMITS...' },
    { threshold: 52, text: 'SPLICING DNA SEQUENCES...', action: 'DITHERING PHOTO...' },
    { threshold: 70, text: 'ROAST CORE ACTIVATING...', action: 'COOKING SAVAGE BURNS...' },
    { threshold: 88, text: 'CHAOS SUMMON ACHIEVED!', action: 'BREEDING PIXEL MONSTER...' }
  ];

  useEffect(() => {
    // Start initial sound
    playRetroSound('sweep');
    setLogs(['SUMMONING INITIALIZED...']);

    // If there's a fallback warning, show it on the next tick
    if (fallbackWarning) {
      const fwTimer = setTimeout(() => {
        setLogs((l) => [...l, `⚠️ ${fallbackWarning}`]);
        setShowFallbackBanner(true);
      }, 200);
      return () => clearTimeout(fwTimer);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPercent((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }

        const nextPrg = prev + Math.floor(Math.random() * 8) + 4;
        const cappedPrg = Math.min(100, nextPrg);

        // Check if we hit any status thresholds
        processSteps.forEach((step) => {
          if (cappedPrg >= step.threshold && prev < step.threshold) {
            setLogs((l) => [...l, step.text]);
            setCurrentAction(step.action);
            playRetroSound('beep');
          }
        });

        return cappedPrg;
      });
    }, 280);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (percent === 100) {
      const waitTimer = setTimeout(() => {
        playRetroSound('summon');
        onFinished();
      }, 700);
      return () => clearTimeout(waitTimer);
    }
  }, [percent, onFinished]);

  return (
    <div className="flex-1 flex flex-col justify-between p-1 text-[#1a1a1a]">
      {/* Upper header with provider indicator */}
      <div className="border-b border-[#1a1a1a] pb-1 dither-border-b text-center">
        <h2 className="font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5">
          {provider && (
            <ProviderIcon provider={provider as 'github' | 'gitlab'} size={11} />
          )}
          SUMMONING BEAST
        </h2>
        {provider && (
          <div className={`inline-flex items-center gap-1 mt-0.5 font-mono text-[7px] font-bold px-1.5 py-0.5 rounded-sm border ${
            isGitLab
              ? 'bg-[#e24329]/10 text-[#e24329] border-[#e24329]/30'
              : 'bg-[#1a1a1a]/10 text-[#1a1a1a] border-[#1a1a1a]/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              showFallbackBanner || fallbackWarning
                ? 'bg-amber-500 animate-pulse'
                : 'bg-emerald-500'
            }`} />
            {showFallbackBanner || fallbackWarning ? (
              <span className="text-amber-600">FALLBACK MODE</span>
            ) : (
              <span>{providerLabel} API: LIVE</span>
            )}
          </div>
        )}
      </div>

      {/* Fallback warning banner */}
      {showFallbackBanner && (
        <div className="bg-amber-50 border border-amber-400 rounded px-1.5 py-1 mx-0.5 mt-1 font-mono text-[7.5px] text-amber-800 leading-tight">
          ⚠️ <span className="font-bold">PROFILE FETCH WARNING:</span>{' '}
          {fallbackWarning || 'API unavailable, using estimated data.'}
        </div>
      )}

      {/* Center scrolling logs */}
      <div className="flex-1 flex flex-col justify-center my-2 space-y-4 px-1">
        <div className="border border-[#1a1a1a] bg-white p-2 h-[120px] flex flex-col font-mono text-[9px] leading-tight overflow-y-auto space-y-1">
          {logs.map((log, index) => (
            <div key={index} className="flex">
              <span className="text-[#7f001c] mr-1">&gt;</span>
              <span className={`uppercase ${log.startsWith('⚠️') ? 'text-amber-700 font-bold' : ''}`}>{log}</span>
            </div>
          ))}
          {percent < 100 && (
            <div className="flex items-center text-[#1a1a1a] font-bold">
              <span className="text-[#1a1a1a] mr-1 blink border-r border-[#1a1a1a] h-2.5"></span>
              <span className="animate-pulse font-bold">{currentAction}</span>
            </div>
          )}
        </div>

        {/* Stepped Progress Bar (Divide into 10 block segments) */}
        <div className="space-y-1">
          <div className="flex justify-between items-center font-mono text-[9px] font-bold text-[#1a1a1a]">
            <span>STABILITY_METER:</span>
            <div className="flex items-center gap-1.5">
              {showFallbackBanner && (
                <span className="text-amber-600 text-[7px]">(REDUCED ACCURACY)</span>
              )}
              <span>{percent}%</span>
            </div>
          </div>

          <div className="flex space-x-1.5 border-2 border-[#1a1a1a] bg-white p-1 h-7">
            {Array.from({ length: 10 }).map((_, i) => {
              const active = percent >= (i + 1) * 10;
              return (
                <div
                  key={i}
                  className={`flex-1 h-full border border-gray-300 transition-colors duration-150 ${
                    active
                      ? showFallbackBanner
                        ? 'bg-amber-500'
                        : 'bg-[#7f001c]'
                      : 'bg-transparent'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Small informative prompt line at the bottom */}
      <div className="border-t border-[#1a1a1a] border-dashed pt-1 text-center font-mono text-[8px] font-bold">
        {showFallbackBanner
          ? 'ESTIMATED SUMMON — REAL DATA UNAVAILABLE'
          : `STAND BY FOR ${username.toUpperCase()} CHAOS`}
      </div>
    </div>
  );
}
