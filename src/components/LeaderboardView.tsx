import React, { useState, useEffect } from 'react';
import { LeaderboardEntry } from '../types';
import type { GitProvider } from '../../shared/types';
import { playRetroSound } from '../utils/audio';
import { LeaderboardSkeleton } from './LoadingSkeletons';
import { ProviderIcon } from './ProviderIcon';

const ENTRIES_PER_PAGE = 20;
const VISIBLE_SLICE = 4; // Rows visible on screen at once

interface LeaderboardViewProps {
  onBack: () => void;
  registerDirectionHandler: (handler: ((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void) | null) => void;
  registerAHandler: (handler: (() => void) | null) => void;
  registerBHandler: (handler: (() => void) | null) => void;
}

export function LeaderboardView({
  onBack,
  registerDirectionHandler,
  registerAHandler,
  registerBHandler,
}: LeaderboardViewProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [scrollIndex, setScrollIndex] = useState(0);
  const [providerFilter, setProviderFilter] = useState<'all' | 'github' | 'gitlab'>('all');

  const filteredEntries = entries.filter((e) =>
    providerFilter === 'all' ? true : e.provider === providerFilter,
  );

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / ENTRIES_PER_PAGE));
  const pageEntries = filteredEntries.slice(page * ENTRIES_PER_PAGE, (page + 1) * ENTRIES_PER_PAGE);
  const maxScroll = Math.max(0, pageEntries.length - VISIBLE_SLICE);
  const visibleEntries = pageEntries.slice(scrollIndex, scrollIndex + VISIBLE_SLICE);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/leaderboard');
        if (res.ok) {
          const data = await res.json();
          setEntries(data);
        }
      } catch (err) {
        console.error('Failed to query leaderboard endpoint:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  // Reset page/scroll when filter changes
  useEffect(() => {
    setPage(0);
    setScrollIndex(0);
  }, [providerFilter]);

  useEffect(() => {
    const handleDirection = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      if (dir === 'UP') {
        playRetroSound('beep');
        setScrollIndex((prev) => Math.max(0, prev - 1));
      } else if (dir === 'DOWN') {
        playRetroSound('beep');
        setScrollIndex((prev) => Math.min(maxScroll, prev + 1));
      } else if (dir === 'LEFT') {
        // Previous page
        if (page > 0) {
          playRetroSound('select');
          setPage((p) => p - 1);
          setScrollIndex(0);
        }
      } else if (dir === 'RIGHT') {
        // Next page
        if (page + 1 < totalPages) {
          playRetroSound('select');
          setPage((p) => p + 1);
          setScrollIndex(0);
        }
      }
    };

    const handleBack = () => {
      playRetroSound('beep');
      onBack();
    };

    registerDirectionHandler(handleDirection);
    registerAHandler(handleBack);
    registerBHandler(handleBack);

    return () => {
      registerDirectionHandler(null);
      registerAHandler(null);
      registerBHandler(null);
    };
  }, [filteredEntries.length, page, totalPages, maxScroll, pageEntries.length, onBack]);

  return (
    <div className="flex-1 flex flex-col justify-between p-1 px-1.5 text-[#1a1a1a] select-none font-mono">
      {/* Visual Header */}
      <div className="flex flex-col border-b-2 border-[#1a1a1a] pb-1 gap-0.5">
        <div className="flex justify-between items-center font-bold text-[9px]">
          <span>HALL OF CODES</span>
          <span className="text-[#7f001c]">TOP {filteredEntries.length} SUMMONS</span>
        </div>
        {/* Provider Filter */}
        <div className="flex gap-1 text-[7px]">
          {(['all', 'github', 'gitlab'] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                playRetroSound('select');
                setProviderFilter(f);
              }}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide transition-all
                ${providerFilter === f
                  ? 'bg-[#1a1a1a] text-white shadow-[1px_1px_0px_rgba(0,0,0,0.3)]'
                  : 'bg-neutral-100 text-gray-500 border border-neutral-300 hover:bg-neutral-200'
                }`}
            >
              {f === 'all' ? (
                'ALL'
              ) : (
                <>
                  <ProviderIcon provider={f} size={7} className="-mt-0.5" />
                  {f.toUpperCase()}
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center py-1">
        {loading ? (
          <LeaderboardSkeleton rows={4} />
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-4 text-[9px] text-gray-500">
            {entries.length === 0
              ? 'NO HIGH SCORES RECORDED. BE THE FIRST!'
              : `NO ${providerFilter.toUpperCase()} SUMMONS FOUND`}
          </div>
        ) : (
          <div className="space-y-1.5 flex-1 flex flex-col justify-start pt-1">
            {visibleEntries.map((entity, relativeIdx) => {
              const actualIdx = page * ENTRIES_PER_PAGE + scrollIndex + relativeIdx;
              const isFirst = actualIdx === 0;
              const isSecond = actualIdx === 1;
              const isThird = actualIdx === 2;

              const rankColor = isFirst
                ? 'text-amber-600 font-extrabold'
                : isSecond
                ? 'text-slate-500 font-bold'
                : isThird
                ? 'text-amber-800'
                : 'text-neutral-500';

              return (
                <div
                  key={entity.username + actualIdx}
                  className="flex items-center space-x-1.5 border border-neutral-300 bg-neutral-50 rounded p-1 text-[8.5px] leading-tight shadow-[1px_1px_0px_rgba(0,0,0,0.05)]"
                >
                  <img
                    src={entity.avatarUrl}
                    alt={entity.username}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded border border-neutral-400 pixelated shrink-0 shadow-[1px_1px_0px_rgba(0,0,0,0.15)]"
                  />
                  <div className="flex-1 min-w-0 font-mono">
                    <div className="flex justify-between items-baseline">
                      <span className="truncate font-bold text-gray-800 text-[8.5px] flex items-center gap-1">
                        #{actualIdx + 1}
                        <ProviderIcon provider={entity.provider ?? 'github'} size={9} className="-mt-0.5" />
                        {entity.username.toUpperCase().slice(0, 10)}
                      </span>
                      <span className={`shrink-0 ${rankColor} text-[8px]`}>
                        {entity.wins}W - {entity.losses}L
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-500 text-[7px] leading-none mt-0.5">
                      <span className="truncate">{entity.monName.toUpperCase()}</span>
                      <span className="text-[#7f001c] font-bold">LV {entity.level}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Scroll / Page Indicator */}
            <div className="text-center text-[7px] text-gray-400 font-bold pt-0.5 space-x-2">
              {totalPages > 1 && (
                <span className={page > 0 ? 'text-gray-600' : 'text-gray-300'}>
                  ◄ PAGE {page + 1}/{totalPages} ►
                </span>
              )}
              {pageEntries.length > VISIBLE_SLICE && (
                <span className="animate-pulse">
                  {scrollIndex + VISIBLE_SLICE < pageEntries.length ? '▼ SCROLL ▼' : '▲ END ▲'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <button
        onClick={onBack}
        className="w-full h-6 border-2 border-[#1a1a1a] bg-[#e1dfde] hover:bg-neutral-300 rounded font-mono text-[8px] font-bold flex items-center justify-center shadow-[1px_1px_0px_#1a1a1a] transition-all active:translate-y-0.5"
      >
        ◀ PRESS B TO RETURN TO HUB
      </button>
    </div>
  );
}
