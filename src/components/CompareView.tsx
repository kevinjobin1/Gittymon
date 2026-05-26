import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { useIdentity } from '../lib/useIdentity';
import { playRetroSound } from '../utils/audio';
import { RARITY_CONFIGS } from '../lib/rarity';
import { buildSpriteGrid, drawSpriteOnCanvas } from '../utils/procGen';
import { downloadShareCardPng } from '../utils/shareCardRenderer';
import type { GittymonCard, Rarity } from '../types';

interface CompareViewProps {
  card1Id: string;
  card2Id: string;
  onBack: () => void;
  registerBHandler?: (handler: (() => void) | null) => void;
  registerAHandler?: (handler: (() => void) | null) => void;
  registerDirectionHandler?: (handler: ((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void) | null) => void;
}

const RARITY_ORDER: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
  glitched: 4,
};

const STAT_CONFIGS = [
  { key: 'hp' as const, label: 'HP', color: '#ef4444', icon: '❤️' },
  { key: 'attack' as const, label: 'ATK', color: '#f97316', icon: '⚔️' },
  { key: 'defense' as const, label: 'DEF', color: '#22c55e', icon: '🛡️' },
  { key: 'speed' as const, label: 'SPD', color: '#3b82f6', icon: '💨' },
  { key: 'chaos' as const, label: 'CHA', color: '#a855f7', icon: '🌀' },
];

function generateWinnerText(card1: GittymonCard, card2: GittymonCard): {
  winner: GittymonCard | null;
  isTie: boolean;
  text: string;
  margin: string;
  statHighlights: string[];
} {
  const stats1 = card1.base.stats;
  const stats2 = card2.base.stats;

  let score1 = 0;
  let score2 = 0;
  const highlights: string[] = [];

  for (const stat of STAT_CONFIGS) {
    const v1 = stats1[stat.key];
    const v2 = stats2[stat.key];
    if (v1 > v2) {
      score1++;
      highlights.push(`${stat.label}: ${card1.base.name} wins (${v1} vs ${v2})`);
    } else if (v2 > v1) {
      score2++;
      highlights.push(`${stat.label}: ${card2.base.name} wins (${v2} vs ${v1})`);
    } else {
      highlights.push(`${stat.label}: Tie (${v1})`);
    }
  }

  // Tiebreakers: rarity → evolution tier → mutations → rerolls
  let winner: GittymonCard | null = null;
  let isTie = false;
  let marginText = '';

  if (score1 > score2) {
    winner = card1;
    marginText = `${score1}-${score2}`;
  } else if (score2 > score1) {
    winner = card2;
    marginText = `${score2}-${score1}`;
  } else {
    // Stat tie — use tiebreakers
    const r1 = RARITY_ORDER[card1.rarity];
    const r2 = RARITY_ORDER[card2.rarity];
    if (r1 > r2) {
      winner = card1;
      marginText = `tiebreak: ${card1.rarity.toUpperCase()} > ${card2.rarity.toUpperCase()}`;
    } else if (r2 > r1) {
      winner = card2;
      marginText = `tiebreak: ${card2.rarity.toUpperCase()} > ${card1.rarity.toUpperCase()}`;
    } else if (card1.evolutionTier > card2.evolutionTier) {
      winner = card1;
      marginText = `tiebreak: EVO tier ${card1.evolutionTier} > ${card2.evolutionTier}`;
    } else if (card2.evolutionTier > card1.evolutionTier) {
      winner = card2;
      marginText = `tiebreak: EVO tier ${card2.evolutionTier} > ${card1.evolutionTier}`;
    } else if (card1.mutations.length > card2.mutations.length) {
      winner = card1;
      marginText = `tiebreak: ${card1.mutations.length} mutations > ${card2.mutations.length}`;
    } else if (card2.mutations.length > card1.mutations.length) {
      winner = card2;
      marginText = `tiebreak: ${card2.mutations.length} mutations > ${card1.mutations.length}`;
    } else if (card1.rerollCount > card2.rerollCount) {
      winner = card1;
      marginText = `tiebreak: ${card1.rerollCount} rerolls > ${card2.rerollCount}`;
    } else if (card2.rerollCount > card1.rerollCount) {
      winner = card2;
      marginText = `tiebreak: ${card2.rerollCount} rerolls > ${card1.rerollCount}`;
    } else {
      isTie = true;
      marginText = 'absolutely evenly matched';
    }
  }

  // Humorous victory text
  let text: string;
  if (isTie) {
    const tieTexts = [
      `⚠️ COSMIC BALANCE — ${card1.base.name} and ${card2.base.name} are PERFECT EQUALS! The universe maintains its equilibrium.`,
      `🤝 UNBREAKABLE TIE — Neither ${card1.base.name} nor ${card2.base.name} can claim superiority. They are chaos siblings.`,
      `⚖️ STAT STALEMATE — These two are mirrors of each other. Friendship, not battle, is the true winner today.`,
    ];
    text = tieTexts[Math.floor(Math.random() * tieTexts.length)];
  } else if (winner) {
    const loser = winner === card1 ? card2 : card1;
    const winnerName = winner.base.name.toUpperCase();
    const loserName = loser.base.name.toUpperCase();

    // Find the stat with the biggest gap
    let biggestGap = 0;
    let biggestStat = '';
    for (const stat of STAT_CONFIGS) {
      const gap = Math.abs(stats1[stat.key] - stats2[stat.key]);
      if (gap > biggestGap) {
        biggestGap = gap;
        biggestStat = stat.label;
      }
    }

    const winType = score1 > score2 || score2 > score1 ? 'statistical victory' : 'tiebreak';

    const winTexts = [
      `🏆 WINNER: ${winnerName} (${marginText}) — crushed ${loserName} with a decisive ${winType}!`,
      `🔥 VICTORY: ${winnerName} defeats ${loserName} ${marginText}! The ${winner.form.name} has evolved beyond reason!`,
      `💀 DESTROYED: ${winnerName} obliterates ${loserName} (${marginText}). A ${biggestStat} gap of ${biggestGap} points proves who the alpha is!`,
      `👑 CHAMPION: ${winnerName} reigns supreme over ${loserName}! ${marginText} is the final score — ${winner.form.name} is unstoppable!`,
      `⚡ ANNIHILATION: ${winnerName} humiliates ${loserName} (${marginText}). ${biggestStat} difference: ${biggestGap} — absolutely devastating!`,
    ];
    text = winTexts[Math.floor(Math.random() * winTexts.length)];
  } else {
    text = 'Two cards entered, one leaves... but today nobody wins?';
  }

  return { winner, isTie, text, margin: marginText, statHighlights: highlights };
}

// ── Mini card sprite for comparison ──
function CompareMiniCard({ card, label }: { card: GittymonCard; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const frameRef = useRef(0);
  const config = RARITY_CONFIGS[card.rarity];

  useEffect(() => {
    let running = true;
    const animate = () => {
      if (!running) return;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 80, 80);
          const sprite = buildSpriteGrid(card.base.spriteSeed, frameRef.current);
          drawSpriteOnCanvas(ctx, sprite, 0, 0, 3, frameRef.current);
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
    <div className="flex flex-col items-center bg-white border border-neutral-300 rounded p-1.5 w-[clamp(120px,25vw,160px)]">
      <div className="text-[6px] sm:text-[7px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</div>
      <div
        className="w-[18px] h-[2px] rounded-full mb-1.5"
        style={{ backgroundColor: config.color }}
      />
      <canvas
        ref={canvasRef}
        width={80}
        height={80}
        className="w-[clamp(50px,12vw,80px)] h-[clamp(50px,12vw,80px)] pixelated"
        style={{ imageRendering: 'pixelated' }}
      />
      <div className="mt-1 text-[8px] sm:text-[9px] font-extrabold text-[#1a1a1a] text-center leading-tight truncate w-full">
        {card.base.name.toUpperCase()}
      </div>
      <div className="text-[5.5px] sm:text-[6px] text-gray-500 text-center leading-tight truncate w-full">
        LV{card.base.level} · {card.form.name.toUpperCase()}
      </div>
      <div className="text-[5px] text-gray-400 text-center leading-tight truncate w-full">
        @{card.base.username}
      </div>
      <div
        className="mt-1 px-1.5 py-[1px] rounded-full text-[5px] font-black uppercase tracking-wider"
        style={{ backgroundColor: config.color, color: config.textColor }}
      >
        {config.label}
      </div>
    </div>
  );
}

// ── Single Stat Row ──
function StatCompareRow({
  label,
  icon,
  value1,
  value2,
  color,
  card1Name,
  card2Name,
}: {
  label: string;
  icon: string;
  value1: number;
  value2: number;
  color: string;
  card1Name: string;
  card2Name: string;
} & { key?: React.Key }) {
  const maxStat = 150;
  const pct1 = Math.min(100, (value1 / maxStat) * 100);
  const pct2 = Math.min(100, (value2 / maxStat) * 100);
  const winner1 = value1 > value2;
  const winner2 = value2 > value1;
  const tie = value1 === value2;

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[6px] font-bold text-gray-500 mb-0.5">
        <span>{icon} {label}</span>
        <span className="text-[5.5px] text-gray-400">
          {winner1 ? '🔺 ' : tie ? '⚖️ ' : ''}{value1} vs {value2}{winner2 ? ' 🔺' : tie ? ' ⚖️' : ''}
        </span>
      </div>

      {/* Card 1 bar — right-aligned */}
      <div className="flex items-center gap-1.5">
        <span className={`w-8 text-right text-[5px] font-bold truncate leading-tight ${winner1 ? 'text-[#1a1a1a]' : 'text-gray-400'}`}>
          {card1Name.length > 8 ? card1Name.slice(0, 7) + '…' : card1Name}
        </span>
        <div className="flex-1 flex gap-[1px]">
          <div className="flex-1 h-3 flex items-center justify-end">
            <div
              className="h-2 rounded-l-full transition-all duration-300"
              style={{
                width: `${pct1}%`,
                backgroundColor: winner1 ? color : tie ? '#a1a1aa' : '#d4d4d8',
              }}
            />
          </div>
          <div className="w-[1px] bg-neutral-300 h-full" />
          <div className="flex-1 h-3 flex items-center">
            <div
              className="h-2 rounded-r-full transition-all duration-300"
              style={{
                width: `${pct2}%`,
                backgroundColor: winner2 ? color : tie ? '#a1a1aa' : '#d4d4d8',
              }}
            />
          </div>
        </div>
        <span className={`w-8 text-left text-[5px] font-bold truncate leading-tight ${winner2 ? 'text-[#1a1a1a]' : 'text-gray-400'}`}>
          {card2Name.length > 8 ? card2Name.slice(0, 7) + '…' : card2Name}
        </span>
      </div>
    </div>
  );
}

export function CompareView({
  card1Id,
  card2Id,
  onBack,
  registerBHandler,
  registerAHandler,
}: CompareViewProps) {
  const { identity } = useIdentity();
  const declaredRef = useRef(false);

  // Look up both cards from identity
  const card1 = useMemo(
    () => identity?.cards.find((c) => c.id === card1Id) ?? null,
    [identity, card1Id]
  );
  const card2 = useMemo(
    () => identity?.cards.find((c) => c.id === card2Id) ?? null,
    [identity, card2Id]
  );

  // Winner declaration
  const result = useMemo(() => {
    if (!card1 || !card2) return null;
    return generateWinnerText(card1, card2);
  }, [card1, card2]);

  // Play victory sound once
  useEffect(() => {
    if (result && !declaredRef.current) {
      declaredRef.current = true;
      if (result.isTie) {
        playRetroSound('beep');
      } else {
        playRetroSound('summon');
      }
    }
  }, [result]);

  // Register B handler
  useEffect(() => {
    if (!registerBHandler) return;
    registerBHandler(() => {
      playRetroSound('beep');
      onBack();
    });
    return () => registerBHandler(null);
  }, [registerBHandler, onBack]);

  // Register A handler (no-op for this screen)
  useEffect(() => {
    if (!registerAHandler) return;
    registerAHandler(null);
  }, [registerAHandler]);

  // Share comparison result
  const handleShare = useCallback(() => {
    if (!card1) return;
    playRetroSound('summon');
    downloadShareCardPng({
      name: card1.base.name + ' vs ' + (card2?.base.name ?? '?'),
      username: card1.base.username,
      type: 'COMPARISON',
      level: card1.base.level,
      rarity: card1.rarity,
      form: card1.form.name,
      stats: card1.base.stats,
      spriteSeed: card1.base.spriteSeed,
      roast: result?.text ?? 'Card comparison',
      mutations: card1.mutations.map((m) => m.label),
    });
  }, [card1, card2, result]);

  if (!card1 || !card2) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[9px] text-gray-500 font-mono p-4">
        <span>⚠️ COULD NOT FIND CARDS</span>
        <button onClick={onBack} className="mt-4 text-[7px] font-bold text-[#7f001c] underline">
          ◀ BACK TO COLLECTION
        </button>
      </div>
    );
  }

  const config1 = RARITY_CONFIGS[card1.rarity];
  const config2 = RARITY_CONFIGS[card2.rarity];
  const mutations1 = card1.mutations.map((m) => m.label);
  const mutations2 = card2.mutations.map((m) => m.label);

  return (
    <div className="flex-1 flex flex-col justify-between p-1 px-1.5 md:px-2.5 md:py-1.5 text-[#1a1a1a] select-none font-mono min-h-full">
      {/* ── Header ── */}
      <div className="flex justify-between items-center border-b-2 border-[#1a1a1a] pb-1 font-bold text-[9px] sm:text-[10px] tracking-tight shrink-0">
        <span className="text-[#7f001c]">▲ CARD COMPARE</span>
        <button onClick={onBack} className="hover:underline text-[7.5px] sm:text-[8.5px] uppercase font-bold text-gray-500">
          ◀ BACK (B)
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 mt-1 space-y-2 scrollbar-thin">
        {/* ── Two Card Display ── */}
        <div className="flex justify-center items-start gap-3 md:gap-4">
          <CompareMiniCard card={card1} label="CARD 1" />
          <div className="flex flex-col items-center justify-center mt-6">
            <span className="text-[clamp(14px,3.5vw,20px)] font-black text-gray-400">VS</span>
            <div className="text-[6px] sm:text-[7px] text-gray-500 mt-1 uppercase text-center leading-tight">
              Stat<br/>Battle
            </div>
          </div>
          <CompareMiniCard card={card2} label="CARD 2" />
        </div>

        {/* ── Stat Comparison ── */}
        <div className="bg-white border border-neutral-300 rounded p-1.5 space-y-1.5">
          <div className="text-[7px] sm:text-[8px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            📊 STAT COMPARISON
          </div>
          {STAT_CONFIGS.map((stat, si) => (
            <StatCompareRow
              key={si}
              label={stat.label}
              icon={stat.icon}
              value1={card1.base.stats[stat.key] as number}
              value2={card2.base.stats[stat.key] as number}
              color={stat.color}
              card1Name={card1.base.name}
              card2Name={card2.base.name}
            />
          ))}
        </div>

        {/* ── Summary Row ── */}
        <div className="flex justify-between items-center gap-2 bg-neutral-50 border border-neutral-200 rounded p-1">
          <div className="flex flex-col items-center flex-1">
            <span className="text-[6px] sm:text-[7px] text-gray-400 uppercase">Rarity</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: config1.color }}
              />
              <span className="text-[7px] sm:text-[8px] font-bold">{config1.label}</span>
            </div>
          </div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-[6px] sm:text-[7px] text-gray-400 uppercase">Evo Tier</span>
            <span className="text-[7px] sm:text-[8px] font-bold">{card1.evolutionTier} ⚡ {card2.evolutionTier}</span>
          </div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-[6px] sm:text-[7px] text-gray-400 uppercase">Mutations</span>
            <span className="text-[7px] sm:text-[8px] font-bold">{card1.mutations.length} ✦ {card2.mutations.length}</span>
          </div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-[6px] sm:text-[7px] text-gray-400 uppercase">Rerolls</span>
            <span className="text-[7px] sm:text-[8px] font-bold">{card1.rerollCount} ♻️ {card2.rerollCount}</span>
          </div>
        </div>

        {/* ── Mutations Detail ── */}
        {(mutations1.length > 0 || mutations2.length > 0) && (
          <div className="bg-white border border-neutral-300 rounded p-1.5">
            <div className="text-[7px] sm:text-[8px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              🧬 ACTIVE MUTATIONS
            </div>
            <div className="flex gap-3">
              <div className="flex-1 space-y-0.5">
                {mutations1.length > 0 ? (
                  mutations1.map((m, i) => (
                    <span
                      key={i}
                      className="inline-block mr-0.5 mb-0.5 px-1 py-[0.5px] bg-neutral-100 border border-neutral-300 rounded-sm text-[5.5px] text-[#1a1a1a] font-medium"
                    >
                      {m}
                    </span>
                  ))
                ) : (
                  <span className="text-[5.5px] text-gray-400 italic">None</span>
                )}
              </div>
              <div className="flex-1 space-y-0.5">
                {mutations2.length > 0 ? (
                  mutations2.map((m, i) => (
                    <span
                      key={i}
                      className="inline-block mr-0.5 mb-0.5 px-1 py-[0.5px] bg-neutral-100 border border-neutral-300 rounded-sm text-[5.5px] text-[#1a1a1a] font-medium"
                    >
                      {m}
                    </span>
                  ))
                ) : (
                  <span className="text-[5.5px] text-gray-400 italic">None</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Winner Declaration ── */}
        {result && (
          <div
            className={`p-1.5 rounded border text-center transition-all duration-500 ${
              result.isTie
                ? 'bg-purple-50 border-purple-300'
                : result.winner === card1
                  ? 'bg-emerald-50 border-emerald-400'
                  : 'bg-amber-50 border-amber-400'
            }`}
          >
            <div className="text-[8px] sm:text-[9px] font-bold leading-tight text-[#1a1a1a]">
              {result.text}
            </div>
          </div>
        )}

        {/* ── Battle Highlights ── */}
        {result && result.statHighlights.length > 0 && (
          <div className="bg-white border border-neutral-300 rounded p-1.5">
            <div className="text-[7px] sm:text-[8px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              ⚡ BATTLE HIGHLIGHTS
            </div>
            <div className="space-y-0.5">
              {result.statHighlights.map((h, i) => (
                <div key={i} className="text-[6px] sm:text-[7px] text-gray-600 leading-tight flex items-center gap-1">
                  <span className="text-[5px]">▸</span>
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-dashed border-[#1a1a1a] pt-1 flex justify-between items-center font-mono text-[8px] sm:text-[9px] mt-1 shrink-0">
        <button onClick={onBack} className="text-gray-500 hover:text-[#1a1a1a] cursor-pointer">
          &lt; B-BACK
        </button>
        <button
          onClick={handleShare}
          className="px-2 py-0.5 rounded text-[7px] font-bold border border-purple-300 bg-white text-purple-700 hover:bg-purple-50 cursor-pointer transition-colors"
        >
          ⭐ SHARE RESULT
        </button>
        <span className="text-gray-400">STAT BATTLE</span>
      </div>
    </div>
  );
}
