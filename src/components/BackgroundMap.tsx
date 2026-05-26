import React from 'react';
import { useCanvasGame, LogNotifications } from './map';
import { getColorName, getTypeLabel } from './map/colorUtils';
import type { Gittymon } from './map/types';

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface BackgroundMapProps {
  isExpanded?: boolean;
  onMonsterClick?: (monster: Gittymon) => void;
}

export const BackgroundMap = React.memo(function BackgroundMap({
  isExpanded = false,
  onMonsterClick,
}: BackgroundMapProps) {
  const { canvasRef, logs, mapFocused, windowSize, hoveredMonster, mousePos } = useCanvasGame({ isExpanded, onMonsterClick });

  /* ------ Tooltip position ------ */
  const tooltipStyle: React.CSSProperties | undefined = hoveredMonster
    ? {
        position: 'fixed',
        left: mousePos.x + 18,
        top: mousePos.y - 48,
        zIndex: 20,
        pointerEvents: 'none',
      }
    : undefined;

  /* ------ JSX ------ */
  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-x-0 inset-y-0 w-full h-full object-cover select-none z-0 transition-all duration-700"
        width={windowSize.width}
        height={windowSize.height}
        style={{
          imageRendering: 'pixelated',
          transform: isExpanded
            ? 'scale(0.92) translateY(-8px)'
            : 'scale(1) translateY(0)',
          filter: mapFocused
            ? 'none'
            : isExpanded
              ? 'blur(3px) opacity(0.6) brightness(0.7)'
              : 'blur(1.5px) opacity(0.85)',
        }}
      />

      {/* Hover tooltip for background monsters */}
      {hoveredMonster && tooltipStyle && (
        <div style={tooltipStyle} className="animate-slide-up">
          <div className="bg-[#1e1d3a]/95 border border-[#3a3870] rounded-lg px-2.5 py-1.5 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-[8px] font-mono">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: hoveredMonster.color, boxShadow: `0 0 4px ${hoveredMonster.color}` }}
              />
              <span className="text-[#8b89b8]">
                {getColorName(hoveredMonster.color)} {getTypeLabel(hoveredMonster.type)}
              </span>
            </div>
            <div className="text-[7px] text-[#8b89b8]/60 mt-0.5 font-mono tracking-tight">
              Click to summon!
            </div>
            {/* Tail arrow */}
            <div
              className="absolute -bottom-1 left-3 w-2 h-2 bg-[#1e1d3a] border-r border-b border-[#3a3870] rotate-45"
            />
          </div>
        </div>
      )}

      <LogNotifications logs={logs} />
    </>
  );
});
