import React, { useCallback, useEffect, useRef } from 'react';
import type { GittymonCard } from '../types';
import { RARITY_CONFIGS } from '../lib/rarity';
import { buildSpriteGrid, drawSpriteOnCanvas } from '../utils/procGen';

interface CollectionCardProps {
  card: GittymonCard;
  isFavorite: boolean;
  isSelected: boolean;
  onClick: () => void;
  onFavoriteClick: (e: React.MouseEvent) => void;
  bulkSelected?: boolean;
  onBulkToggle?: () => void;
}

export function CollectionCard({
  card,
  isFavorite,
  isSelected,
  onClick,
  onFavoriteClick,
  bulkSelected,
  onBulkToggle,
}: CollectionCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const frameRef = useRef(0);
  const config = RARITY_CONFIGS[card.rarity];
  const cardRef = useRef<HTMLDivElement>(null);
  const tiltFrameRef = useRef<number>(0);
  const isBulk = onBulkToggle !== undefined;

  // 3D tilt on hover
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el || isBulk) return;
    cancelAnimationFrame(tiltFrameRef.current);
    tiltFrameRef.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;
      el.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03,1.03,1.03)`;
    });
  }, [isBulk]);

  const handleMouseLeave = useCallback(() => {
    cancelAnimationFrame(tiltFrameRef.current);
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
  }, []);

  // Animated sprite loop
  useEffect(() => {
    let running = true;
    const animate = () => {
      if (!running) return;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 48, 48);
          const sprite = buildSpriteGrid(card.base.spriteSeed, frameRef.current);
          drawSpriteOnCanvas(ctx, sprite, 0, 0, 2, frameRef.current);
        }
      }
      frameRef.current++;
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [card.base.spriteSeed]);

  return (
    <div
      ref={cardRef}
      onClick={isBulk ? onBulkToggle : onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`
        perspective-card relative flex flex-col items-center select-none
        w-[82px] rounded overflow-hidden
        transition-all duration-150 ease-out
        border
        ${isSelected
          ? 'ring-2 ring-[#7f001c] border-[#7f001c] shadow-md'
          : 'border-neutral-300 hover:border-neutral-400 hover:shadow-sm'
        }
        bg-white
        ${isBulk ? 'cursor-bulk' : 'tilt-card cursor-inspect'}
      `}
    >
      {/* Bulk checkbox overlay */}
      {isBulk && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onBulkToggle?.();
          }}
          className={`absolute top-1 left-1 z-10 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer cursor-hand-amber ${
            bulkSelected
              ? 'bg-[#7f001c] border-[#7f001c]'
              : 'bg-white/80 border-gray-400 hover:border-[#7f001c]'
          }`}
        >
          {bulkSelected && (
            <span className="text-white text-[8px] font-bold leading-none">✓</span>
          )}
        </div>
      )}

      {/* Rarity top bar */}
      <div
        className="w-full h-[3px] shrink-0"
        style={{ backgroundColor: config.color }}
      />

      {/* Glow ring (subtle) */}
      <div
        className="absolute inset-0 rounded pointer-events-none opacity-20"
        style={{ boxShadow: isSelected ? `inset 0 0 8px ${config.glowColor}` : 'none' }}
      />

      {/* Sprite */}
      <div className="w-full flex justify-center py-1 bg-neutral-50">
        <canvas
          ref={canvasRef}
          width={48}
          height={48}
          className="w-12 h-12 pixelated"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Name */}
      <div className="w-full px-1 truncate text-[6.5px] font-bold text-center text-[#1a1a1a] leading-tight">
        {card.base.name.length > 12
          ? card.base.name.slice(0, 11) + '…'
          : card.base.name.toUpperCase()}
      </div>

      {/* Level & Form */}
      <div className="w-full px-1 text-[5.5px] text-gray-500 text-center leading-tight truncate">
        LV{card.base.level} · {card.form.name.length > 10 ? card.form.variant.toUpperCase() : card.form.name.toUpperCase()}
      </div>

      {/* Rarity badge */}
      <div
        className="mt-0.5 mb-1 px-1.5 py-[1px] rounded-full text-[5.5px] font-black uppercase tracking-wider"
        style={{
          backgroundColor: config.color,
          color: config.textColor,
        }}
      >
        {config.label}
      </div>

      {/* Mutations indicator */}
      {card.mutations.length > 0 && (
        <div className="absolute top-1 right-1 flex items-center gap-0.5">
          <div
            className="w-3 h-3 rounded-full flex items-center justify-center text-[5px] font-bold text-white"
            style={{ backgroundColor: config.color }}
            title={card.mutations.map(m => m.label).join(', ')}
          >
            {card.mutations.length}
          </div>
        </div>
      )}

      {/* Favorite star */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onFavoriteClick(e);
        }}
        className="absolute top-1 left-1 w-3 h-3 flex items-center justify-center text-[8px] leading-none hover:scale-110 transition-transform cursor-hand-amber"
        title={isFavorite ? 'Remove from favorites' : 'Set as favorite'}
      >
        {isFavorite ? (
          <span className="text-amber-400 drop-shadow-[0_0_2px_rgba(250,204,21,0.6)]">★</span>
        ) : (
          <span className="text-neutral-300 hover:text-neutral-400">☆</span>
        )}
      </button>

      {/* Reroll count */}
      {card.rerollCount > 0 && (
        <div className="absolute bottom-1 right-1 text-[4.5px] text-gray-400 font-bold">
          +{card.rerollCount}
        </div>
      )}
    </div>
  );
}
