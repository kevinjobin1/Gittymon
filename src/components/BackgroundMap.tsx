import React from 'react';
import { useCanvasGame, LogNotifications } from './map';

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface BackgroundMapProps {
  isExpanded?: boolean;
}

export const BackgroundMap = React.memo(function BackgroundMap({
  isExpanded = false,
}: BackgroundMapProps) {
  const { canvasRef, logs, mapFocused, windowSize } = useCanvasGame({ isExpanded });

  /* ------ JSX ------ */
  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-x-0 inset-y-0 w-full h-full object-cover select-none pointer-events-none z-0 transition-all duration-700"
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
      <LogNotifications logs={logs} />
    </>
  );
});
