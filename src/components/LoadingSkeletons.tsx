import React from 'react';

/**
 * A pulsing skeleton placeholder for loading states.
 * Matches the retro monospace aesthetic.
 */
export function SkeletonBar({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-gray-300 animate-pulse rounded ${className}`}
      style={{ minHeight: '0.5rem' }}
    />
  );
}

/** Skeleton row with avatar + two lines of text */
/** A skeleton row with avatar + two lines of text */
export function SkeletonRow({ dense = false }: { dense?: boolean; key?: React.Key }) {
  return (
    <div className={`flex items-center space-x-1.5 ${dense ? 'py-0.5' : 'py-1'}`}>
      <div className="w-7 h-7 rounded bg-gray-300 animate-pulse shrink-0" />
      <div className="flex-1 space-y-1">
        <SkeletonBar className="h-2 w-3/4" />
        <SkeletonBar className="h-1.5 w-1/2" />
      </div>
    </div>
  );
}

/** Full-page skeleton for leaderboard with N rows */
export function LeaderboardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex-1 flex flex-col p-1 px-1.5 space-y-1.5">
      <div className="flex justify-between border-b-2 border-[#1a1a1a] pb-1">
        <SkeletonBar className="h-2 w-24" />
        <SkeletonBar className="h-2 w-20" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} dense />
      ))}
    </div>
  );
}

/** Compact skeleton for in-flight API calls */
export function LoadingSpinner({ text = 'LOADING...' }: { text?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-2 text-[9px] text-gray-400 font-mono">
      <div className="animate-spin h-3 w-3 border-2 border-[#1a1a1a] border-t-transparent rounded-full" />
      <span className="animate-pulse">{text}</span>
    </div>
  );
}
