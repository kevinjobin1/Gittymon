import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useIdentity } from '../lib/useIdentity';
import { playRetroSound } from '../utils/audio';
import { RARITY_CONFIGS, determineRarity } from '../lib/rarity';
import { buildSpriteGrid, drawSpriteOnCanvas } from '../utils/procGen';
import { getAllMutations, selectMutations } from '../lib/mutations';
import { getFormVariant, applyFormStats } from '../lib/reroll';
import { CollectionCard } from './CollectionCard';
import { downloadShareCardPng, downloadCompositePng } from '../utils/shareCardRenderer';
import { RetroButton } from '../utils/ripple';
import type { GittymonCard, Rarity, RoastMon } from '../types';

type SortMode = 'newest' | 'oldest' | 'rarest' | 'level' | 'name';

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'newest', label: '★ NEW' },
  { id: 'oldest', label: '◁ OLD' },
  { id: 'rarest', label: '▲ RARE' },
  { id: 'level', label: 'LV' },
  { id: 'name', label: 'A-Z' },
];

const RARITY_FILTERS: { id: Rarity | 'all'; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'common', label: 'C' },
  { id: 'rare', label: 'R' },
  { id: 'epic', label: 'E' },
  { id: 'legendary', label: 'L' },
  { id: 'glitched', label: 'G' },
];

const RARITY_ORDER: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
  glitched: 4,
};

// ── Detail panel component (inline) ──
function CardDetailPanel({
  card,
  config,
  isFavorite,
  onToggleFavorite,
  onDelete,
  onGoToCard,
  onShare,
  onReroll,
  onCompare,
  onClose,
  allMutations,
}: {
  card: GittymonCard;
  config: (typeof RARITY_CONFIGS)[Rarity];
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onGoToCard: () => void;
  onShare: () => void;
  onReroll: () => void;
  onCompare: () => void;
  onClose: () => void;
  allMutations: string[];
}) {
  const detailCanvasRef = useRef<HTMLCanvasElement>(null);
  const detailAnimRef = useRef<number>(0);
  const detailFrameRef = useRef(0);

  useEffect(() => {
    let running = true;
    const animate = () => {
      if (!running) return;
      const canvas = detailCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 96, 96);
              const sprite = buildSpriteGrid(card.base.spriteSeed, detailFrameRef.current);
          drawSpriteOnCanvas(ctx, sprite, 0, 0, 4, detailFrameRef.current);
        }
      }
      detailFrameRef.current++;
      detailAnimRef.current = requestAnimationFrame(animate);
    };
    detailAnimRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(detailAnimRef.current);
    };
  }, [card.base.spriteSeed]);

  const stats = card.base.stats;
  const maxStat = 150;
  const statEntries: { label: string; value: number; color: string }[] = [
    { label: 'HP', value: stats.hp, color: '#ef4444' },
    { label: 'ATK', value: stats.attack, color: '#f97316' },
    { label: 'DEF', value: stats.defense, color: '#22c55e' },
    { label: 'SPD', value: stats.speed, color: '#3b82f6' },
    { label: 'CHA', value: stats.chaos, color: '#a855f7' },
  ];

  return (
    <div className="animate-slide-up border-2 border-[#1a1a1a] bg-white rounded mt-1 overflow-hidden">
      {/* Detail header */}
      <div
        className="flex items-center justify-between px-2 py-1 text-[7px] font-bold text-white"
        style={{ backgroundColor: config.color }}
      >
        <span className="uppercase tracking-wider">{config.label} — DETAILS</span>
        <RetroButton
          onClick={(e) => { onClose(); }}
          variant="bare"
          press="none"
          className="text-white/80 hover:text-white text-[8px]"
        >
          ✕ CLOSE
        </RetroButton>
      </div>

      <div className="p-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[7px] md:text-[8px]">
        {/* Animated sprite (left) */}
        <div className="row-span-3 flex flex-col items-center justify-center bg-neutral-50 border border-neutral-200 rounded p-1">
          <canvas
            ref={detailCanvasRef}
            width={96}
            height={96}
            className="w-[clamp(56px,12vw,96px)] h-[clamp(56px,12vw,96px)] pixelated"
            style={{ imageRendering: 'pixelated' }}
          />
          <div
            className="mt-0.5 px-1.5 py-[1px] rounded-full text-[5px] font-black uppercase tracking-wider"
            style={{ backgroundColor: config.color, color: config.textColor }}
          >
            {config.label}
          </div>
        </div>

        {/* Name & type */}
        <div className="min-w-0">
          <div className="text-[9px] font-extrabold text-[#1a1a1a] leading-tight truncate">
            {card.base.name.toUpperCase()}
          </div>
          <div className="text-[6px] text-gray-500 leading-tight">
            LV{card.base.level} · {card.base.type.toUpperCase()} · {card.form.name.toUpperCase()}
          </div>
          <div className="text-[6px] text-gray-400 leading-tight">
            @{card.base.username} · REROLLS: {card.rerollCount} · TIER: {card.evolutionTier}
          </div>
        </div>

        {/* Rarity badge + level */}
        <div className="flex items-start gap-1 justify-self-end">
          <div className="flex flex-col items-end text-[5.5px] text-gray-500 leading-tight">
            <span className="font-bold text-[#1a1a1a] text-[8px]">
              {new Date(card.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Stats bars */}
        <div className="col-span-2 mt-0.5 space-y-[2px]">
          {statEntries.map((s) => {
            const pct = Math.min(100, (s.value / maxStat) * 100);
            return (
              <div key={s.label} className="flex items-center gap-1">
                <span className="w-5 text-right font-bold text-[6px] text-gray-500">{s.label}</span>
                <div className="flex-1 h-[6px] bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: s.color }}
                  />
                </div>
                <span className="w-6 text-left font-bold text-[6px] text-[#1a1a1a]">{s.value}</span>
              </div>
            );
          })}
        </div>

        {/* Mutations */}
        {card.mutations.length > 0 && (
          <div className="col-span-2 mt-0.5">
            <div className="text-[6px] font-bold text-gray-500 uppercase mb-0.5">⚡ Mutations</div>
            <div className="flex flex-wrap gap-0.5">
              {card.mutations.map((m) => (
                <span
                  key={m.id}
                  className="px-1 py-[0.5px] bg-neutral-100 border border-neutral-300 rounded-sm text-[5.5px] text-[#1a1a1a] font-medium"
                  title={m.effect}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* All available mutations pool */}
        {allMutations.length > 0 && (
          <div className="col-span-2 mt-0.5">
            <div className="text-[6px] font-bold text-gray-500 uppercase mb-0.5">🧬 MUTATION POOL</div>
            <div className="flex flex-wrap gap-0.5 max-h-8 overflow-y-auto">
              {allMutations.map((m, i) => (
                <span
                  key={i}
                  className="px-1 py-[0.5px] bg-gray-50 border border-gray-200 rounded-sm text-[5px] text-gray-400"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 px-1.5 pb-1.5">
        <RetroButton
          onClick={(e) => { onToggleFavorite(); }}
          variant="bare"
          press="none"
          className={`flex-1 py-1 rounded text-[7px] font-bold border transition-colors ${
            isFavorite
              ? 'bg-amber-100 border-amber-400 text-amber-800'
              : 'bg-white border-neutral-300 text-gray-600 hover:bg-amber-50 hover:border-amber-300'
          }`}
        >
          {isFavorite ? '★ FAVORITED' : '☆ SET FAVORITE'}
        </RetroButton>
        <RetroButton
          onClick={(e) => { onShare(); }}
          variant="bare"
          press="none"
          className="flex-1 py-1 rounded text-[7px] font-bold border border-purple-300 bg-white text-purple-700 hover:bg-purple-50 transition-colors"
        >
          ⭐ SHARE
        </RetroButton>
        <RetroButton
          onClick={(e) => { onReroll(); }}
          variant="bare"
          press="none"
          className="flex-1 py-1 rounded text-[7px] font-bold border border-amber-500 bg-gradient-to-r from-amber-400 to-orange-400 text-white hover:from-amber-500 hover:to-orange-500 shadow-sm transition-all"
        >
          ♻️ EVOLVE +1
        </RetroButton>
        <RetroButton
          onClick={(e) => { onCompare(); }}
          variant="bare"
          press="none"
          className="flex-1 py-1 rounded text-[7px] font-bold border border-cyan-400 bg-white text-cyan-700 hover:bg-cyan-50 transition-colors"
        >
          ⚡ COMPARE
        </RetroButton>
        <RetroButton
          onClick={(e) => { onGoToCard(); }}
          variant="bare"
          press="none"
          className="flex-1 py-1 rounded text-[7px] font-bold border border-[#7f001c] bg-[#7f001c] text-white hover:bg-[#a30024] transition-colors"
        >
          ▶ GO TO CARD
        </RetroButton>
        <RetroButton
          onClick={(e) => { onDelete(); }}
          variant="bare"
          press="none"
          className="flex-1 py-1 rounded text-[7px] font-bold border border-red-300 bg-white text-red-600 hover:bg-red-50 transition-colors"
        >
          ✕ DELETE
        </RetroButton>
      </div>
    </div>
  );
}

// ── Main CollectionView ──
interface CollectionViewProps {
  onBack: () => void;
  registerBHandler?: (handler: (() => void) | null) => void;
  registerAHandler?: (handler: (() => void) | null) => void;
  registerDirectionHandler?: (handler: ((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void) | null) => void;
  onNavigateToUsername?: (username: string) => void;
  onCompare?: (card1Id: string, card2Id: string) => void;
}

export function CollectionView({
  onBack,
  registerBHandler,
  registerAHandler,
  registerDirectionHandler,
  onNavigateToUsername,
  onCompare,
}: CollectionViewProps) {
  const { identity, isNewUser, setFavorite, removeCard, addCard } = useIdentity();

  const [sortBy, setSortBy] = useState<SortMode>('newest');
  const [filterRarity, setFilterRarity] = useState<Rarity | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [compareCard1Id, setCompareCard1Id] = useState<string | null>(null);
  const [columns, setColumns] = useState(4);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info'>('success');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    setToastType(type);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 2500);
  }, []);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Drag-to-select state (refs to avoid stale closures in mouseenter)
  const dragStateRef = useRef<{
    isDragging: boolean;
    dragOriginIndex: number;
    lastEnteredIndex: number;
  }>({ isDragging: false, dragOriginIndex: -1, lastEnteredIndex: -1 });

  // Global mouseup — ends drag regardless of where mouse goes
  useEffect(() => {
    const handleMouseUp = () => {
      if (dragStateRef.current.isDragging) {
        dragStateRef.current.isDragging = false;
        playRetroSound('beep');
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Card mouseenter during drag — select range from origin to this card
  const handleCardMouseEnter = useCallback((index: number) => {
    if (!dragStateRef.current.isDragging) return;

    const { dragOriginIndex } = dragStateRef.current;
    if (index === dragOriginIndex) return;

    const start = Math.min(dragOriginIndex, index);
    const end = Math.max(dragOriginIndex, index);

    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      const cards = processedCardsRef.current;
      for (let i = start; i <= end; i++) {
        const card = cards[i];
        if (card) next.add(card.id);
      }
      return next;
    });

    dragStateRef.current.lastEnteredIndex = index;
  }, []);

  // Bulk mode callbacks (defined early because they're referenced in keyboard/B handlers)
  const toggleBulkSelect = useCallback((cardId: string) => {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  const exitBulkMode = useCallback(() => {
    setBulkMode(false);
    setBulkSelectedIds(new Set());
  }, []);

  // Derive filtered + sorted cards
  const processedCards = useMemo(() => {
    if (!identity || isNewUser) return [];

    let cards = [...identity.cards];

    // Filter by rarity
    if (filterRarity !== 'all') {
      cards = cards.filter((c) => c.rarity === filterRarity);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      cards = cards.filter(
        (c) =>
          c.base.name.toLowerCase().includes(q) ||
          c.base.username.toLowerCase().includes(q) ||
          c.base.type.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        cards.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'oldest':
        cards.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'rarest':
        cards.sort((a, b) => {
          const rarityDiff = RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
          if (rarityDiff !== 0) return rarityDiff;
          return b.base.level - a.base.level;
        });
        break;
      case 'level':
        cards.sort((a, b) => b.base.level - a.base.level);
        break;
      case 'name':
        cards.sort((a, b) => a.base.name.localeCompare(b.base.name));
        break;
    }

    return cards;
  }, [identity, isNewUser, sortBy, filterRarity, searchQuery]);

  // Ref to access processedCards inside functional setState callbacks (drag range select)
  const processedCardsRef = useRef(processedCards);
  processedCardsRef.current = processedCards;

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filterRarity, sortBy, searchQuery]);

  // Track grid columns for keyboard navigation
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const observer = new ResizeObserver(() => {
      const cardWidth = 82 + 4; // card + gap
      const containerWidth = grid.offsetWidth;
      const cols = Math.max(1, Math.floor(containerWidth / cardWidth));
      setColumns(cols);
    });
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  // Keyboard / D-pad navigation
  useEffect(() => {
    if (!registerDirectionHandler && !registerAHandler) return;

    const handleDirection = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      if (processedCards.length === 0) return;
      playRetroSound('beep');

      let newIndex = selectedIndex;
      switch (dir) {
        case 'LEFT':
          newIndex = selectedIndex <= 0 ? processedCards.length - 1 : selectedIndex - 1;
          break;
        case 'RIGHT':
          newIndex = selectedIndex >= processedCards.length - 1 ? 0 : selectedIndex + 1;
          break;
        case 'UP':
          newIndex = selectedIndex - columns;
          if (newIndex < 0) {
            // Wrap to bottom row
            const remainder = selectedIndex % columns;
            const rows = Math.ceil(processedCards.length / columns);
            newIndex = (rows - 1) * columns + remainder;
            if (newIndex >= processedCards.length) newIndex = processedCards.length - 1;
          }
          break;
        case 'DOWN':
          newIndex = selectedIndex + columns;
          if (newIndex >= processedCards.length) {
            // Wrap to top
            newIndex = selectedIndex % columns;
          }
          break;
      }
      setSelectedIndex(newIndex);
      setSelectedCardId(processedCards[newIndex]?.id ?? null);
    };

    const handleA = () => {
      const card = processedCards[selectedIndex];
      if (!card) return;
      playRetroSound('select');
      if (bulkMode) {
        // In bulk mode, toggle selection
        toggleBulkSelect(card.id);
      } else {
        // Toggle detail panel on the selected card
        setSelectedCardId((prev) => (prev === card.id ? null : card.id));
      }
    };

    registerDirectionHandler?.(handleDirection);
    registerAHandler?.(handleA);

    return () => {
      registerDirectionHandler?.(null);
      registerAHandler?.(null);
    };
  }, [
    selectedIndex,
    processedCards,
    columns,
    registerDirectionHandler,
    registerAHandler,
    bulkMode,
    toggleBulkSelect,
  ]);

  // Register B handler
  useEffect(() => {
    if (!registerBHandler) return;
    registerBHandler(() => {
      if (bulkMode) {
        // Cancel bulk mode first
        exitBulkMode();
        playRetroSound('beep');
      } else if (compareMode) {
        // Cancel compare mode first
        setCompareMode(false);
        setCompareCard1Id(null);
        playRetroSound('beep');
      } else if (selectedCardId) {
        // Close detail panel first
        setSelectedCardId(null);
        playRetroSound('beep');
      } else {
        onBack();
      }
    });
    return () => registerBHandler(null);
  }, [registerBHandler, bulkMode, exitBulkMode, compareMode, selectedCardId, onBack]);

  // Scroll selected card into view
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || processedCards.length === 0) return;
    const cards = grid.querySelectorAll('[data-card-index]');
    const el = cards[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedIndex, processedCards.length]);

  const cards = !identity || isNewUser ? [] : identity.cards;

  const selectedCard = processedCards[selectedIndex] ?? null;
  const selectedConfig = selectedCard ? RARITY_CONFIGS[selectedCard.rarity] : RARITY_CONFIGS.common;
  const isFavoriteCard = selectedCard ? identity?.favoriteCardId === selectedCard.id : false;

  const handleDelete = useCallback(() => {
    if (!selectedCard) return;
    if (window.confirm(`Delete ${selectedCard.base.name} from your collection?`)) {
      removeCard(selectedCard.id);
      setSelectedCardId(null);
      playRetroSound('hit');
    }
  }, [selectedCard, removeCard]);

  const handleGoToCard = useCallback(() => {
    if (!selectedCard || !onNavigateToUsername) return;
    onNavigateToUsername(selectedCard.base.username);
  }, [selectedCard, onNavigateToUsername]);

  const handleToggleFavorite = useCallback(() => {
    if (!selectedCard) return;
    const favId = identity?.favoriteCardId === selectedCard.id ? null : selectedCard.id;
    setFavorite(favId);
    playRetroSound('select');
  }, [selectedCard, identity, setFavorite]);

  const handleShareCard = useCallback(() => {
    if (!selectedCard) return;
    playRetroSound('summon');
    downloadShareCardPng({
      name: selectedCard.base.name,
      username: selectedCard.base.username,
      type: selectedCard.base.type,
      level: selectedCard.base.level,
      rarity: selectedCard.rarity,
      form: selectedCard.form.name,
      stats: selectedCard.base.stats,
      spriteSeed: selectedCard.base.spriteSeed,
      roast: selectedCard.base.roast,
      mutations: selectedCard.mutations.map((m) => m.label),
    });
  }, [selectedCard]);

  const handleCompare = useCallback(() => {
    if (!selectedCard) return;
    playRetroSound('select');
    setCompareMode(true);
    setCompareCard1Id(selectedCard.id);
    setSelectedCardId(null);
  }, [selectedCard]);

  const handleRerollCard = useCallback(() => {
    if (!selectedCard || !identity) return;

    const newRerollCount = selectedCard.rerollCount + 1;
    const newRarity = determineRarity(selectedCard.base.username, newRerollCount);
    const newForm = getFormVariant(newRerollCount, selectedCard.base.username);
    const newMutations = selectMutations(newRarity, `${selectedCard.base.username}-${newRerollCount}-${Date.now()}`);

    // Apply form stat modifications to create variant-specific stats
    const newStats = applyFormStats(newForm.variant, selectedCard.base.stats, `${selectedCard.base.username}-${newRerollCount}`);
    const modifiedBase: RoastMon = { ...selectedCard.base, stats: newStats };

    const newCard: GittymonCard = {
      id: crypto.randomUUID(),
      base: modifiedBase,
      rarity: newRarity,
      form: newForm,
      mutations: newMutations,
      rerollCount: newRerollCount,
      evolutionTier: Math.min(5, selectedCard.evolutionTier + 1),
      isFavorite: false,
      createdAt: Date.now(),
    };

    addCard(newCard);
    playRetroSound('summon');

    // Select the new card immediately (React 18 automatic batching groups this with addCard)
    // New cards are sorted to index 0 by newest, so selectedIndex=0 matches
    setSelectedIndex(0);
    setSelectedCardId(newCard.id);
  }, [selectedCard, identity, addCard]);

  // Collect all available mutation labels from the global pool
  const allMutationLabels = useMemo(() => getAllMutations().map((m) => m.label), []);

  // Bulk action handlers (defined here — used in JSX, not in early effects)
  const selectedCount = bulkSelectedIds.size;

  const handleBulkDelete = useCallback(() => {
    if (selectedCount === 0) return;
    if (!window.confirm(`Delete ${selectedCount} card${selectedCount !== 1 ? 's' : ''} from your collection?`)) return;
    const ids = [...bulkSelectedIds];
    ids.forEach((id) => removeCard(id));
    playRetroSound('hit');
    const count = selectedCount;
    setBulkSelectedIds(new Set());
    setBulkMode(false);
    showToast(`✕ Deleted ${count} card${count !== 1 ? 's' : ''}`, 'success');
  }, [selectedCount, bulkSelectedIds, removeCard, showToast]);

  const handleSelectAll = useCallback(() => {
    setBulkSelectedIds(new Set(processedCards.map((c) => c.id)));
    playRetroSound('beep');
  }, [processedCards]);

  const handleBulkExport = useCallback(() => {
    if (selectedCount === 0) return;
    const ids = [...bulkSelectedIds];
    const cardsToExport = (identity?.cards ?? []).filter((c) => ids.includes(c.id));
    // Export with a staggered delay so multiple download dialogs don't overlap
    cardsToExport.forEach((card, i) => {
      setTimeout(() => {
        downloadShareCardPng({
          name: card.base.name,
          username: card.base.username,
          type: card.base.type,
          level: card.base.level,
          rarity: card.rarity,
          form: card.form.name,
          stats: card.base.stats,
          spriteSeed: card.base.spriteSeed,
          roast: card.base.roast,
          mutations: card.mutations.map((m) => m.label),
        }, `${card.base.username}-${card.base.name}-gittymon.png`);
      }, i * 400);
    });
    const count = cardsToExport.length;
    showToast(`⭐ Exported ${count} card${count !== 1 ? 's' : ''}`, 'success');
  }, [selectedCount, bulkSelectedIds, identity, showToast]);

  const handleCompositeExport = useCallback(() => {
    if (selectedCount === 0) return;
    const ids = [...bulkSelectedIds];
    const cardsToExport = (identity?.cards ?? []).filter((c) => ids.includes(c.id));
    const shareData = cardsToExport.map((card) => ({
      name: card.base.name,
      username: card.base.username,
      type: card.base.type,
      level: card.base.level,
      rarity: card.rarity,
      form: card.form.name,
      stats: card.base.stats,
      spriteSeed: card.base.spriteSeed,
      roast: card.base.roast,
      mutations: card.mutations.map((m) => m.label),
    }));
    const username = cardsToExport[0]?.base.username;
    downloadCompositePng(shareData, username);
    playRetroSound('summon');
    const count = cardsToExport.length;
    showToast(`🖼 Collage exported — ${count} card${count !== 1 ? 's' : ''}`, 'info');
  }, [selectedCount, bulkSelectedIds, identity, showToast]);

  // Summary stats for the toolbar
  const summaryStats = useMemo(() => {
    if (!identity || isNewUser || identity.cards.length === 0) {
      return { total: 0, avgTier: 0, rarityCounts: {} as Record<Rarity, number>, highestRarity: null as Rarity | null, highestCount: 0 };
    }
    const total = identity.cards.length;
    const rarityCounts: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0, glitched: 0 };
    let tierSum = 0;
    for (const c of identity.cards) {
      rarityCounts[c.rarity]++;
      tierSum += c.evolutionTier;
    }
    const avgTier = Math.round((tierSum / total) * 10) / 10;
    // Find the highest rarity with at least one card
    const rarities: Rarity[] = ['glitched', 'legendary', 'epic', 'rare', 'common'];
    let highestRarity: Rarity | null = null;
    let highestCount = 0;
    for (const r of rarities) {
      if (rarityCounts[r] > 0) {
        highestRarity = r;
        highestCount = rarityCounts[r];
        break;
      }
    }
    return { total, avgTier, rarityCounts, highestRarity, highestCount };
  }, [identity, isNewUser]);

  // Rarity distribution of currently selected cards (for bulk toolbar)
  const selectedRarityCounts = useMemo((): Record<Rarity, number> => {
    if (!identity || bulkSelectedIds.size === 0) {
      return { common: 0, rare: 0, epic: 0, legendary: 0, glitched: 0 };
    }
    const counts: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0, glitched: 0 };
    for (const c of identity.cards) {
      if (bulkSelectedIds.has(c.id)) {
        counts[c.rarity]++;
      }
    }
    return counts;
  }, [identity, bulkSelectedIds]);

  return (
    <div className="flex-1 flex flex-col justify-between p-1 px-1.5 md:px-2.5 md:py-1.5 text-[#1a1a1a] select-none font-mono">
      {/* ── Header ── */}
      <div className="flex justify-between items-center border-b-2 border-[#1a1a1a] pb-1.5 font-bold text-[9px] tracking-tight shrink-0">
        <span className="text-[#7f001c]">▼ CARD COLLECTION</span>
        <div className="flex items-center gap-2">
          <span className="text-[7.5px] text-gray-500">
            {cards.length} CARD{cards.length !== 1 ? 'S' : ''}
          </span>
          <button
            onClick={onBack}
            className="hover:underline text-[7.5px] uppercase font-bold text-gray-500"
          >
            ◀ BACK (B)
          </button>
        </div>
      </div>

      {/* ── Empty state ── */}
      {cards.length === 0 || isNewUser ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center font-mono text-[9px]">
          <div className="text-2xl mb-2">📭</div>
          <p className="italic text-gray-500">YOUR REGISTRY IS EMPTY.</p>
          <p className="mt-2 text-[7.5px] text-gray-400">
            SUMMON YOUR FIRST GITTYMON TO START YOUR COLLECTION!
          </p>
          <button
            onClick={() => {
              playRetroSound('beep');
              onBack();
            }}
            className="retro-btn-ingame py-1.5 px-3 mt-4 text-[9px] font-bold cursor-pointer"
          >
            ◀ GO BACK (B)
          </button>
        </div>
      ) : (
        <>
              {/* ── Summary toolbar ── */}
          <div className="flex items-center gap-2 mt-1 mb-0.5 text-[6.5px] font-bold text-gray-600 bg-neutral-50 border border-neutral-200 rounded px-1.5 py-1">
            <span className="text-gray-400 uppercase tracking-wider">Summary</span>
            <button
              onClick={() => {
                if (bulkMode) {
                  exitBulkMode();
                } else {
                  playRetroSound('beep');
                  setBulkMode(true);
                }
              }}
              className={`magnetic-press px-1 py-[1px] rounded-sm text-[6px] font-bold border cursor-pointer transition-colors ${
                bulkMode
                  ? 'bg-[#7f001c] text-white border-[#7f001c]'
                  : 'bg-white text-gray-500 border-neutral-300 hover:bg-neutral-100'
              }`}
            >
              {bulkMode ? '✕ EXIT SELECT' : '☐ SELECT'}
            </button>
            <span className="text-[#1a1a1a]">
              {summaryStats.total} CARD{summaryStats.total !== 1 ? 'S' : ''}
            </span>
            <span className="text-gray-300">|</span>
            <span>
              BEST:{' '}
              {summaryStats.highestRarity ? (
                <span
                  className="px-1 py-[0.5px] rounded-sm text-[5.5px] font-black uppercase"
                  style={{
                    backgroundColor: RARITY_CONFIGS[summaryStats.highestRarity].color,
                    color: RARITY_CONFIGS[summaryStats.highestRarity].textColor,
                  }}
                >
                  {summaryStats.highestCount}x {RARITY_CONFIGS[summaryStats.highestRarity].label}
                </span>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </span>
            <span className="text-gray-300">|</span>
            <span>
              AVG TIER:{' '}
              <span className="text-[#1a1a1a]">
                {summaryStats.avgTier > 0 ? summaryStats.avgTier : '—'}
              </span>
            </span>
            {identity && !isNewUser && (
              <>
                <span className="text-gray-300">|</span>
                <span className="flex items-center gap-1">
                  {(['glitched', 'legendary', 'epic', 'rare', 'common'] as Rarity[]).map((r) => (
                    <span
                      key={r}
                      className={`px-0.5 text-[5px] font-bold ${
                        summaryStats.rarityCounts[r] > 0
                          ? ''
                          : 'text-gray-300'
                      }`}
                      style={
                        summaryStats.rarityCounts[r] > 0
                          ? { color: RARITY_CONFIGS[r].color }
                          : undefined
                      }
                    >
                      {RARITY_CONFIGS[r].label[0]}{summaryStats.rarityCounts[r]}
                    </span>
                  ))}
                </span>
              </>
            )}
          </div>

          {/* ── Search bar ── */}
          <div className="flex items-center gap-1 mt-1 mb-0.5">
            <span className="text-[7px] font-bold text-gray-500 shrink-0">🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH BY NAME..."
              className="flex-1 bg-neutral-100 border border-neutral-300 rounded px-1.5 py-0.5 text-[7px] font-mono font-bold text-[#1a1a1a] placeholder:text-gray-400 outline-none focus:border-[#7f001c]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[8px] text-gray-400 hover:text-[#1a1a1a]"
              >
                ✕
              </button>
            )}
          </div>

          {/* ── Sort bar ── */}
          <div className="flex items-center gap-0.5 mt-0.5 flex-wrap">
            <span className="text-[6px] font-bold text-gray-400 uppercase mr-0.5">Sort:</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setSortBy(opt.id);
                  playRetroSound('beep');
                }}
                className={`magnetic-press px-1 py-[1px] rounded-sm text-[6px] font-bold border cursor-pointer transition-colors ${
                  sortBy === opt.id
                    ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                    : 'bg-white text-gray-500 border-neutral-300 hover:bg-neutral-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* ── Filter bar (rarity chips) ── */}
          <div className="flex items-center gap-0.5 mt-0.5 flex-wrap">
            <span className="text-[6px] font-bold text-gray-400 uppercase mr-0.5">Rarity:</span>
            {RARITY_FILTERS.map((f) => {
              const isActive = filterRarity === f.id;
              const cfg = f.id === 'all' ? null : RARITY_CONFIGS[f.id];
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setFilterRarity(f.id);
                    playRetroSound('beep');
                  }}
                  className={`magnetic-press px-1 py-[1px] rounded-sm text-[6px] font-bold border cursor-pointer transition-colors ${
                    isActive
                      ? 'text-white border-transparent'
                      : 'bg-white text-gray-500 border-neutral-300 hover:bg-neutral-100'
                  }`}
                  style={
                    isActive && cfg
                      ? { backgroundColor: cfg.color }
                      : isActive && !cfg
                        ? { backgroundColor: '#1a1a1a' }
                        : undefined
                  }
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* ── Results count ── */}
          {searchQuery && (
            <div className="text-[6px] text-gray-400 mt-0.5">
              {processedCards.length} RESULT{processedCards.length !== 1 ? 'S' : ''}
              {processedCards.length === 0 && ' — TRY A DIFFERENT SEARCH'}
            </div>
          )}

          {/* ── Grid ── */}
          <div className="flex-1 overflow-y-auto min-h-0 mt-1 scrollbar-thin">
            {processedCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[8px] text-gray-400 italic">
                <span>NO CARDS MATCH YOUR FILTERS</span>
                <button
                  onClick={() => {
                    setFilterRarity('all');
                    setSearchQuery('');
                    setSortBy('newest');
                  }}
                  className="mt-2 text-[7px] font-bold text-[#7f001c] underline hover:no-underline"
                >
                  RESET FILTERS
                </button>
              </div>
            ) : (
              <div
                ref={gridRef}
                className={`flex flex-wrap gap-1 justify-start content-start select-none ${bulkMode ? 'cursor-bulk' : ''}`}
                onMouseDown={(e) => {
                  if (!bulkMode) return;
                  // Prevent double-fire: inner wrapper's onMouseDown already handled this
                  if (dragStateRef.current.isDragging) return;
                  // Don't start drag on buttons/inputs
                  const target = e.target as HTMLElement;
                  if (target.closest('button, input')) return;
                  e.preventDefault();

                  // Find the closest card element
                  const cardEl = target.closest('[data-card-index]');
                  if (cardEl) {
                    const index = parseInt(cardEl.getAttribute('data-card-index') || '-1', 10);
                    if (index >= 0 && index < processedCards.length) {
                      dragStateRef.current = {
                        isDragging: true,
                        dragOriginIndex: index,
                        lastEnteredIndex: index,
                      };
                      // Immediately select the origin card
                      toggleBulkSelect(processedCards[index].id);
                    }
                  }
                }}
              >
                {processedCards.map((card, idx) => {
                  const isSelected = selectedCardId === card.id;
                  const isFav = identity?.favoriteCardId === card.id;

                  return (
                    <div
                      key={card.id}
                      data-card-index={idx}
                      className={`animate-stagger-pop transition-all duration-200 ${
                        idx === selectedIndex ? 'scale-[1.04] z-10' : ''
                      }`}
                      style={{
                        animationDelay: `${(idx % 12) * 30}ms`,
                      }}
                    >
                      <div
                        onMouseEnter={() => handleCardMouseEnter(idx)}
                        onMouseDown={(e) => {
                          // If a drag isn't starting from this card (e.g. dragging started from
                          // the grid background), still let it enter the drag flow
                          if (!bulkMode || dragStateRef.current.isDragging) return;
                          // Click-drag starts from here — init drag state
                          const cardEl = e.currentTarget.closest('[data-card-index]');
                          if (cardEl) {
                            const index = parseInt(cardEl.getAttribute('data-card-index') || '-1', 10);
                            if (index >= 0 && index < processedCards.length) {
                              dragStateRef.current = {
                                isDragging: true,
                                dragOriginIndex: index,
                                lastEnteredIndex: index,
                              };
                              toggleBulkSelect(processedCards[index].id);
                            }
                          }
                        }}
                      >
                        <CollectionCard
                          card={card}
                          isFavorite={isFav}
                          isSelected={isSelected || idx === selectedIndex}
                          onClick={() => {
                            if (dragStateRef.current.isDragging) return;
                            if (compareMode && compareCard1Id) {
                              // Second card selected — trigger compare
                              playRetroSound('select');
                              onCompare?.(compareCard1Id, card.id);
                              setCompareMode(false);
                              setCompareCard1Id(null);
                              return;
                            }
                            setSelectedIndex(idx);
                            setSelectedCardId((prev) =>
                              prev === card.id ? null : card.id
                            );
                            playRetroSound('select');
                          }}
                          onFavoriteClick={() => {
                            const favId = identity?.favoriteCardId === card.id ? null : card.id;
                            setFavorite(favId);
                            playRetroSound('beep');
                          }}
                          bulkSelected={bulkMode ? bulkSelectedIds.has(card.id) : undefined}
                          onBulkToggle={bulkMode ? () => toggleBulkSelect(card.id) : undefined}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Bulk Action Toolbar ── */}
          {bulkMode && (
            <div className="mt-1 p-1.5 bg-[#1a1a1a] border-2 border-[#7f001c] rounded flex items-center justify-between animate-slide-up">
              <div className="flex items-center gap-2 text-[7px] font-bold flex-wrap">
                <span className="text-white">
                  ☐ {selectedCount} SELECTED
                </span>
                <span className="text-gray-500">|</span>
                <button
                  onClick={handleSelectAll}
                  disabled={selectedCount === processedCards.length}
                  className={`magnetic-press px-1.5 py-0.5 rounded text-[6px] font-bold border cursor-pointer transition-colors ${
                    selectedCount === processedCards.length
                      ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed'
                      : 'bg-white text-gray-800 border-gray-500 hover:bg-gray-200'
                  }`}
                >
                  ☐ ALL
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedCount === 0}
                  className={`magnetic-press px-1.5 py-0.5 rounded text-[6px] font-bold border cursor-pointer transition-colors ${
                    selectedCount === 0
                      ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed'
                      : 'bg-red-600 text-white border-red-500 hover:bg-red-500'
                  }`}
                >
                  ✕ DELETE
                </button>
                <button
                  onClick={handleBulkExport}
                  disabled={selectedCount === 0}
                  className={`magnetic-press px-1.5 py-0.5 rounded text-[6px] font-bold border cursor-pointer transition-colors ${
                    selectedCount === 0
                      ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed'
                      : 'bg-purple-600 text-white border-purple-500 hover:bg-purple-500'
                  }`}
                >
                  ⭐ EXPORT
                </button>
                <button
                  onClick={handleCompositeExport}
                  disabled={selectedCount === 0}
                  className={`magnetic-press px-1.5 py-0.5 rounded text-[6px] font-bold border cursor-pointer transition-colors ${
                    selectedCount === 0
                      ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed'
                      : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500'
                  }`}
                >
                  🖼 COLLAGE
                </button>
                {selectedCount > 0 && (
                  <button
                    onClick={() => setBulkSelectedIds(new Set())}
                    className="magnetic-press px-1.5 py-0.5 rounded text-[6px] font-bold border border-gray-600 bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white cursor-pointer"
                  >
                    ✕ CLEAR
                  </button>
                )}
                <span className="text-gray-600">|</span>
                <span className="text-gray-500 text-[5.5px]">ALL:</span>
                <span className="flex items-center gap-1">
                  {(['glitched', 'legendary', 'epic', 'rare', 'common'] as Rarity[]).map((r) => (
                    <span
                      key={r}
                      className={`px-0.5 text-[5px] font-bold ${
                        summaryStats.rarityCounts[r] > 0
                          ? ''
                          : 'text-gray-600'
                      }`}
                      style={
                        summaryStats.rarityCounts[r] > 0
                          ? { color: RARITY_CONFIGS[r].color }
                          : undefined
                      }
                    >
                      {RARITY_CONFIGS[r].label[0]}{summaryStats.rarityCounts[r]}
                    </span>
                  ))}
                </span>
                <span className="text-gray-600">|</span>
                <span className="text-amber-400 text-[5.5px]">SEL:</span>
                <span className="flex items-center gap-1">
                  {(['glitched', 'legendary', 'epic', 'rare', 'common'] as Rarity[]).map((r) => (
                    <span
                      key={r}
                      className={`px-0.5 text-[5px] font-bold ${
                        selectedRarityCounts[r] > 0
                          ? ''
                          : 'text-gray-600'
                      }`}
                      style={
                        selectedRarityCounts[r] > 0
                          ? { color: RARITY_CONFIGS[r].color }
                          : undefined
                      }
                    >
                      {RARITY_CONFIGS[r].label[0]}{selectedRarityCounts[r]}
                    </span>
                  ))}
                </span>
              </div>
              <button
                onClick={exitBulkMode}
                className="magnetic-press px-1.5 py-0.5 rounded text-[6px] font-bold border border-gray-600 bg-transparent text-gray-400 hover:bg-gray-700 hover:text-white cursor-pointer"
              >
                ✕ CANCEL
              </button>
            </div>
          )}

          {/* ── Toast notification ── */}
          <div
            className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ease-out ${
              toastMessage
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
          >
            <div
              className={`px-2.5 py-1.5 rounded shadow-lg border text-[7px] font-bold flex items-center gap-1.5 ${
                toastType === 'success'
                  ? 'bg-emerald-800 text-white border-emerald-600'
                  : 'bg-blue-800 text-white border-blue-600'
              }`}
            >
              <span>{toastMessage}</span>
            </div>
          </div>

          {/* ── Compare Mode Banner ── */}
          {compareMode && (
            <div className="mt-1 p-1.5 bg-cyan-50 border-2 border-cyan-400 rounded flex items-center justify-between animate-slide-up">
              <div className="flex items-center gap-1 text-[7px] font-bold text-cyan-800">
                <span>⚡ COMPARE MODE — SELECT ANOTHER CARD</span>
              </div>
              <button
                onClick={() => {
                  setCompareMode(false);
                  setCompareCard1Id(null);
                  playRetroSound('beep');
                }}
                className="px-1.5 py-0.5 rounded text-[6px] font-bold border border-cyan-300 bg-white text-cyan-700 hover:bg-cyan-50 cursor-pointer"
              >
                ✕ CANCEL
              </button>
            </div>
          )}

          {/* ── Detail Panel ── */}
          {selectedCard && selectedCardId && (
            <CardDetailPanel
              card={selectedCard}
              config={selectedConfig}
              isFavorite={isFavoriteCard}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDelete}
              onGoToCard={handleGoToCard}
              onShare={handleShareCard}
              onReroll={handleRerollCard}
              onCompare={handleCompare}
              onClose={() => setSelectedCardId(null)}
              allMutations={allMutationLabels}
            />
          )}
        </>
      )}

      {/* ── Footer ── */}
      <div className="border-t border-dashed border-[#1a1a1a] pt-1 flex justify-between font-mono text-[8px] sm:text-[9px] mt-1 shrink-0">
        <button
          onClick={() => {
            playRetroSound('beep');
            if (selectedCardId) {
              setSelectedCardId(null);
            } else {
              onBack();
            }
          }}
          className="text-gray-500 hover:text-[#1a1a1a] cursor-pointer"
        >
          &lt; B-BACK
        </button>
        <span className="text-gray-400 uppercase">
          {selectedCard ? 'A-DETAILS' : 'V.NAV IGATE'}
        </span>
        <span className="text-gray-500">
          ↑↓←→ MOVE
        </span>
      </div>
    </div>
  );
}
