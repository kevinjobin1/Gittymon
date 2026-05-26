import React, { useState, useEffect, useRef } from 'react';
import { RoastMon } from '../types';
import { playRetroSound } from '../utils/audio';
import { drawProceduralMon, PALETTE_NAMES } from '../utils/procGen';
import type { PaletteName } from '../utils/procGen';
import { downloadCardAsPng, downloadCardAsSvg, downloadFromUrl, generateCardSvg } from '../utils/cardRenderer';
import type { CardData } from '../utils/cardRenderer';

interface ExportEmbedViewProps {
  mon: RoastMon;
  onBack: () => void;
  registerDirectionHandler: (handler: ((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void) | null) => void;
  registerAHandler: (handler: (() => void) | null) => void;
  registerBHandler: (handler: (() => void) | null) => void;
  registerSelectHandler: (handler: (() => void) | null) => void;
  autoCopy?: boolean;
}

export function ExportEmbedView({
  mon,
  onBack,
  registerDirectionHandler,
  registerAHandler,
  registerBHandler,
  registerSelectHandler,
  autoCopy,
}: ExportEmbedViewProps) {
  const [cursor, setCursor] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'copy' | 'download' } | null>(null);
  const [isExportExpanded, setIsExportExpanded] = useState(false);
  const [paletteOverride, setPaletteOverride] = useState<PaletteName | undefined>(undefined);
  const [paletteIndex, setPaletteIndex] = useState(-1); // -1 = seed default
  const [frame, setFrame] = useState(0);
  const spriteCanvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const exportContentRef = useRef<HTMLDivElement>(null);
  const [exportHeight, setExportHeight] = useState<number | null>(null);

  const origin = window.location.origin || `${window.location.protocol}//${window.location.host}`;
  const cardUrl = `${origin}/card/${mon.username}`;
  const badgeApiUrl = `${origin}/api/badge/${mon.username}`;
  const shieldsBadgeUrl = `https://img.shields.io/endpoint?url=${encodeURIComponent(badgeApiUrl)}&style=for-the-badge`;
  const rawGifUrl = `${origin}/api/embed/${mon.username}.gif${paletteOverride ? `?palette=${paletteOverride}` : ''}`;
  const rawSvgUrl = `${origin}/api/embed/svg/${mon.username}${paletteOverride ? `?palette=${paletteOverride}` : ''}`;
  const markdownBadge = `[![Gittymon Profile Card](${rawGifUrl})](${origin})`;

  const cardData: CardData = {
    username: mon.username,
    monName: mon.name,
    type: mon.type,
    level: mon.level,
    roast: mon.roast,
    stats: mon.stats,
    spriteSeed: mon.spriteSeed,
    wins,
    losses,
    publicRepos: mon.publicRepos,
    followers: mon.followers,
    joinedYear: mon.joinedYear,
    location: mon.location,
    moves: mon.moves,
    paletteOverride,
  };

  // Fetch leaderboard data for wins/losses
  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then((entries: Array<{username: string; wins: number; losses: number}>) => {
        const entry = entries.find(
          e => e.username.toLowerCase() === mon.username.toLowerCase()
        );
        if (entry) {
          setWins(entry.wins);
          setLosses(entry.losses);
        }
      })
      .catch(() => {});
  }, [mon.username]);

  // Auto-copy markdown badge on mount (from splash generate flow)
  useEffect(() => {
    if (autoCopy) {
      navigator.clipboard.writeText(markdownBadge).catch(() => {});
      showToast('Markdown badge copied! Paste it into your README.', 'copy');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sprite animation loop
  useEffect(() => {
    let running = true;

    const tick = () => {
      if (!running) return;
      setFrame((f) => (f + 1) % 100);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Draw sprite on canvas whenever frame or mon or palette changes
  useEffect(() => {
    const canvas = spriteCanvasRef.current;
    if (!canvas) return;
    drawProceduralMon(canvas, mon.spriteSeed, frame, paletteOverride);
  }, [frame, mon.spriteSeed, paletteOverride]);

  const showToast = (message: string, type: 'copy' | 'download') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const EXPORTS = [
    {
      label: 'DOWNLOAD PNG (FREE / INSTANT)',
      action: () => {
        playRetroSound('summon');
        downloadCardAsPng(cardData);
        showToast('PNG card saved to your device!', 'download');
      },
      desc: 'Save a high-quality static PNG card to your device. No server needed.',
      hint: 'Press A to save instantly',
    },
    {
      label: 'DOWNLOAD SVG (FREE / INSTANT)',
      action: () => {
        playRetroSound('summon');
        downloadCardAsSvg(cardData);
        showToast('SVG card saved to your device!', 'download');
      },
      desc: 'Save a vector SVG card to your device. Crisp at any size, no server needed.',
      hint: 'Press A to save instantly',
    },
    {
      label: 'DOWNLOAD ANIMATED GIF',
      action: () => {
        playRetroSound('summon');
        downloadFromUrl(rawGifUrl, `${mon.username}-gittymon-card.gif`);
        showToast('Animated GIF download started!', 'download');
      },
      desc: 'Download the animated looping GIF card to share anywhere.',
      hint: 'Press A to download',
    },
    {
      label: 'RAW DYNAMIC GIF URL',
      code: rawGifUrl,
      desc: 'Direct API endpoint URL. Embed in your README or website.',
    },
    {
      label: 'MARKDOWN BADGE (CLEAN)',
      code: `![Gittymon Profile Card](${rawGifUrl})`,
      desc: 'Clean inline markdown badge. Perfect for Notion, Obsidian, or any markdown doc.',
    },
    {
      label: 'GITHUB README (LINKED)',
      code: markdownBadge,
      desc: 'Clickable markdown badge for your GitHub README.md. Links back to Gittymon.',
    },
    {
      label: 'WEBSITE EMBED (HTML IMG)',
      code: `<img src="${rawGifUrl}" width="460" height="220" alt="${mon.username}'s Gittymon Card" style="image-rendering: pixelated;" />`,
      desc: 'Embed a live-updating retro card in any HTML page.',
    },
    {
      label: 'COMPACT BADGE (HTML)',
      code: `<img src="${rawGifUrl}" width="80" height="38" alt="Gittymon" style="image-rendering: pixelated;" />`,
      desc: 'Tiny inline badge for forum signatures, sidebars, or footer credits. Crisp at small sizes.',
    },
    {
      label: 'SHIELDS.IO DYNAMIC BADGE',
      code: `[![Gittymon](${shieldsBadgeUrl})](${cardUrl})`,
      desc: 'Live shields.io badge showing rank & level from the leaderboard. Gold/green/orange by rank.',
    },
    {
      label: 'FORUM SIGNATURE (BBCODE)',
      code: `[url=${origin}][img]${rawGifUrl}[/img][/url]`,
      desc: 'Paste into any phpBB, vBulletin, or MyBB forum signature with BBCode support.',
    },
    {
      label: 'DIRECT IMAGE LINK (URL)',
      code: rawGifUrl,
      desc: 'Bare image URL. Use as avatar, signature, or drop anywhere that accepts image links.',
    },
    {
      label: 'SHARE PAGE LINK (URL)',
      code: cardUrl,
      desc: 'Full share page with OG meta tags. Paste into Discord, Slack, Twitter, or anywhere for an auto-generated rich preview with title, image & roast.',
    },
    {
      label: 'INLINE SVG CODE',
      code: generateCardSvg(cardData),
      desc: 'Full inline SVG string matching the PNG card. No server needed — embed directly in HTML. 24KB self-contained.',
    },
    {
      label: 'RAW SVG URL (VECTOR)',
      code: rawSvgUrl,
      desc: 'Direct API URL for the static SVG version. Crisp at any size.',
    },
  ];

  useEffect(() => {
    const handleDirection = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      if (!isExportExpanded) return;
      if (dir === 'UP') {
        playRetroSound('beep');
        setCursor((c) => (c === 0 ? EXPORTS.length - 1 : c - 1));
        setCopiedIndex(null);
      } else if (dir === 'DOWN') {
        playRetroSound('beep');
        setCursor((c) => (c === EXPORTS.length - 1 ? 0 : c + 1));
        setCopiedIndex(null);
      }
    };

    const handleA = () => {
      if (!isExportExpanded) {
        // When collapsed, A expands the export options
        playRetroSound('select');
        setIsExportExpanded(true);
        return;
      }
      const item = EXPORTS[cursor];
      if (item.action) {
        item.action();
      } else if ('code' in item && item.code) {
        handleCopy(cursor);
      }
    };

    const handleB = () => {
      if (isExportExpanded) {
        // When expanded, B collapses back
        playRetroSound('beep');
        setIsExportExpanded(false);
        return;
      }
      playRetroSound('beep');
      onBack();
    };

    const handleSelect = () => {
      cyclePalette();
    };

    registerDirectionHandler(isExportExpanded ? handleDirection : null);
    registerAHandler(handleA);
    registerBHandler(handleB);
    registerSelectHandler(handleSelect);

    return () => {
      registerDirectionHandler(null);
      registerAHandler(null);
      registerBHandler(null);
      registerSelectHandler(null);
    };
  }, [cursor, isExportExpanded, onBack, wins, losses]);

  const handleCopy = (index: number) => {
    const item = EXPORTS[index];
    if (!('code' in item) || !item.code) return;
    try {
      navigator.clipboard.writeText(item.code);
      playRetroSound('summon');
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2500);
      showToast('Copied to clipboard!', 'copy');
    } catch (e) {
      console.warn('Could not copy to clipboard:', e);
    }
  };

  const cyclePalette = () => {
    playRetroSound('beep');
    const idx = paletteIndex === -1 ? 1 : (paletteIndex + 1) % PALETTE_NAMES.length;
    setPaletteIndex(idx);
    setPaletteOverride(PALETTE_NAMES[idx]);
  };

  const toggleExport = () => {
    playRetroSound('select');
    setIsExportExpanded((prev) => !prev);
    setCopiedIndex(null);
  };

  // Smooth slide-down/up animation for export section using measured height
  useEffect(() => {
    const el = exportContentRef.current;
    if (!el) return;

    if (isExportExpanded) {
      // Measure full height, then animate from 0 → full
      const scrollH = el.scrollHeight;
      setExportHeight(0);
      const raf = requestAnimationFrame(() => {
        setExportHeight(scrollH);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      // Animate from current height → 0
      const currentH = el.scrollHeight;
      setExportHeight(currentH);
      const raf = requestAnimationFrame(() => {
        setExportHeight(0);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isExportExpanded]);

  return (
    <div className="flex-1 flex flex-col justify-between p-1 px-1.5 text-[#1a1a1a] select-none font-mono min-h-full">
      {/* Title */}
      <div className="flex justify-between items-center border-b-2 border-[#1a1a1a] pb-1.5 font-bold text-[9px] tracking-tight shrink-0">
        <span className="text-[#7f001c]">▲ CARD EXPORTER ENGINE</span>
        <button onClick={onBack} className="hover:underline text-[7.5px] uppercase font-bold text-gray-500">
          ◀ BACK (B)
        </button>
      </div>

      {/* Toast Notification */}
      <div
        className={`transition-all duration-300 ease-out overflow-hidden ${
          toast ? 'max-h-8 opacity-100 my-1' : 'max-h-0 opacity-0 my-0'
        }`}
      >
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[7px] font-bold uppercase ${
            toast?.type === 'download'
              ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
              : 'bg-amber-100 border-amber-400 text-amber-900'
          }`}
        >
          <span className="text-[9px]">{toast?.type === 'download' ? '💾' : '📋'}</span>
          <span>{toast?.message}</span>
        </div>
      </div>

      {/* ── MON DETAILS STYLE CARD ── */}
      <div className={`flex-1 flex flex-col ${
        isExportExpanded ? 'min-h-0 max-h-[60%]' : ''
      }`}>
        {/* Card body */}
        <div className={`flex-1 flex flex-col border-2 border-[#1a1a1a] bg-white rounded-sm overflow-hidden ${
          isExportExpanded ? '' : 'shadow-[2px_2px_0px_#1a1a1a]'
        }`}>
          {/* Top Header: Name + Level */}
          <div className="flex justify-between items-center border-b border-[#1a1a1a] px-2 py-1 font-bold text-[9px] sm:text-[10px] bg-[#fafafa]">
            <span className="truncate">{mon.name.toUpperCase()}</span>
            <span className="text-[#7f001c] shrink-0">LV {mon.level}</span>
          </div>

          {/* Main card content */}
          <div className="flex-1 flex p-1.5 gap-1.5 min-h-0">
            {/* Left: Sprite */}
            <div className="relative flex flex-col items-center shrink-0">
              <canvas
                ref={spriteCanvasRef}
                width={96}
                height={96}
                className={`border-2 border-[#1a1a1a] bg-white rounded-sm pixelated ${
                  isExportExpanded
                    ? 'w-[64px] h-[64px] sm:w-[72px] sm:h-[72px]'
                    : 'w-[80px] h-[80px] sm:w-[96px] sm:h-[96px]'
                }`}
                style={{ imageRendering: 'pixelated' }}
              />
              {/* Palette badge — click to cycle */}
              <button
                onClick={(e) => { e.stopPropagation(); cyclePalette(); }}
                className="absolute -bottom-1 -right-1 bg-white border border-[#1a1a1a] px-0.5 py-0 text-[6px] uppercase font-mono font-bold leading-none cursor-pointer hover:text-[#7f001c] transition-colors"
                title="Click to cycle color palette"
              >
                {paletteOverride ? PALETTE_NAMES[paletteIndex] : 'DMG'} ◈
              </button>
              {/* Hint text */}
              <span className="text-[5px] sm:text-[5.5px] text-gray-400 uppercase leading-none mt-0.5 text-center">
                CLICK ◈ OR SELECT TO CHANGE
              </span>
            </div>

            {/* Right: Info + Compact Stats + Compact Moves */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto">
              {/* Basic Info */}
              <div className={`space-y-0.5 font-bold ${
                isExportExpanded ? 'text-[7.5px]' : 'text-[8px] sm:text-[9px]'
              } leading-tight`}>
                <div className="flex">
                  <span className="text-gray-500 uppercase shrink-0">TYPE:&nbsp;</span>
                  <span className="text-[#7f001c] truncate">{mon.type.toUpperCase()}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-500 uppercase shrink-0">REPOS/FOLLOWER:&nbsp;</span>
                  <span className="truncate">{mon.publicRepos} / {mon.followers}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-500 uppercase shrink-0">BORN IN:&nbsp;</span>
                  <span className="truncate">{mon.joinedYear} @ {mon.location.split(',')[0].slice(0, 10)}</span>
                </div>
              </div>

              {/* Compact Stats inline */}
              <div className={`mt-1 space-y-0.5 ${
                isExportExpanded ? 'text-[6px]' : 'text-[6.5px] sm:text-[7px]'
              }`}>
                {Object.entries(mon.stats).map(([statName, val]) => (
                  <div key={statName} className="flex items-center gap-1">
                    <span className="w-5 sm:w-6 uppercase text-gray-500 font-bold shrink-0">{statName.slice(0, 3)}</span>
                    <div className="flex-1 flex space-x-px bg-gray-100 p-px border border-gray-300 h-2 sm:h-2.5 items-center max-w-[120px] sm:max-w-[160px]">
                      {Array.from({ length: 8 }).map((_, i) => {
                        const blockMax = (i + 1) * 12.5;
                        const filled = val >= blockMax;
                        return (
                          <div
                            key={i}
                            className={`flex-1 h-full ${
                              filled ? (statName === 'chaos' ? 'bg-[#7f001c]' : 'bg-[#1a1a1a]') : 'bg-transparent'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <span className="w-5 text-right font-bold">{val}</span>
                  </div>
                ))}
              </div>

              {/* Compact Moves */}
              <div className={`mt-1 flex flex-wrap gap-x-1.5 gap-y-0.5 ${
                isExportExpanded ? 'text-[6px]' : 'text-[6.5px] sm:text-[7px]'
              }`}>
                {mon.moves.map((move, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-0.5 bg-gray-100 border border-gray-300 rounded px-1 py-0 leading-none font-bold"
                  >
                    <span className="text-[#7f001c]">{move.name.toUpperCase()}</span>
                    <span className="text-gray-400">P{move.power}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Roast */}
          <div className="border-t border-dashed border-gray-300 px-2 py-1 text-[7px] sm:text-[7.5px] italic text-gray-600 bg-[#fafafa]">
            "<span className="truncate">{mon.roast}</span>"
          </div>

          {/* Footer: W/L + username */}
          <div className="flex justify-between items-center border-t border-[#1a1a1a] px-2 py-0.5 text-[6.5px] sm:text-[7px] font-bold bg-[#f5f5f5]">
            <span className="text-gray-500">W:{wins} L:{losses}</span>
            <span className="text-[#7f001c]">@{mon.username.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* ── EXPORT TOGGLE ── */}
      <div className="shrink-0 mt-1">
        <button
          onClick={toggleExport}
          className={`w-full flex items-center justify-between px-2 py-1 border-2 text-[7px] sm:text-[8px] font-bold uppercase transition-colors ${
            isExportExpanded
              ? 'border-[#7f001c] bg-[#fffcf5] text-[#7f001c]'
              : 'border-[#1a1a1a] bg-[#e2dfde] text-[#1a1a1a] hover:bg-[#d5d2d0]'
          }`}
        >
          <span>{isExportExpanded ? '▼ HIDE EXPORT OPTIONS' : '▶ EXPORT OPTIONS (A)'}</span>
          {!isExportExpanded && (
            <span className="text-[5.5px] sm:text-[6px] text-emerald-700 font-bold">
              FREE PNG • GIF • SVG • EMBEDS
            </span>
          )}
        </button>
      </div>

      {/* ── EXPORT OPTIONS (slide-down) ── */}
      <div
        className={`overflow-hidden duration-300 ease-out ${
          isExportExpanded ? 'mt-1' : 'mt-0'
        }`}
        style={{
          height: exportHeight !== null ? `${exportHeight}px` : '0px',
          opacity: exportHeight !== null && exportHeight > 0 ? 1 : 0,
          transitionProperty: 'height, opacity',
        }}
      >
        <div
          ref={exportContentRef}
          className="flex-1 flex flex-col justify-start space-y-1 overflow-y-auto max-h-[180px] pt-0.5 scrollbar-thin"
        >
          {EXPORTS.map((item, idx) => {
            const isSelected = cursor === idx;
            const isCopied = copiedIndex === idx;
            const isDownload = !!item.action;

            return (
              <div
                key={item.label}
                onClick={() => {
                  setCursor(idx);
                  playRetroSound('select');
                }}
                className={`p-1 rounded border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#7f001c] bg-[#fffcf5] ring-1 ring-[#7f001c]'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50'
                }`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className={`text-[7px] font-black flex items-center gap-1 ${
                    isSelected ? 'text-[#7f001c]' : 'text-zinc-600'
                  }`}>
                    {isSelected ? '▶ ' : '  '}
                    {isDownload && (
                      <span className="text-[5.5px] px-1 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold uppercase">
                        FREE
                      </span>
                    )}
                    {item.label}
                  </span>
                  {isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.action) {
                          item.action();
                        } else if ('code' in item && item.code) {
                          handleCopy(idx);
                        }
                      }}
                      className={`text-[6px] px-1 py-0.5 rounded font-bold uppercase shrink-0 ${
                        isCopied
                          ? 'bg-emerald-800 text-white'
                          : isDownload
                          ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                          : 'bg-[#1a1a1a] text-white hover:bg-[#333333]'
                      }`}
                    >
                      {isCopied ? 'COPIED!' : isDownload ? 'SAVE [A]' : 'COPY [A]'}
                    </button>
                  )}
                </div>

                <p className={`text-[5.5px] leading-none mb-1 uppercase ${
                  isSelected ? 'text-neutral-600' : 'text-neutral-400'
                }`}>
                  {item.desc}
                  {item.hint && (
                    <span className="ml-1 text-emerald-700 font-bold">— {item.hint}</span>
                  )}
                </p>

                {'code' in item && item.code && (
                  <div className="bg-neutral-900 text-emerald-400 p-1 rounded font-mono text-[5.5px] leading-tight select-all truncate border border-neutral-950">
                    {item.code}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="h-[25px] border-2 border-[#1a1a1a] bg-[#e1dfde] rounded p-1 text-[7px] leading-tight flex items-center justify-between text-gray-700 shrink-0 mt-1">
        <span className="truncate pr-1">
          {isExportExpanded
            ? 'PRESS UP/DOWN TO NAVIGATE • PRESS A TO SAVE/COPY • PRESS B TO COLLAPSE'
            : 'PRESS A TO EXPAND EXPORT OPTIONS • PRESS B TO EXIT • SELECT TO CYCLE PALETTE'}
        </span>
        <span className="text-[6.5px] uppercase text-zinc-500 font-bold shrink-0 border border-zinc-400 px-0.5 rounded">
          FREE EXPORT
        </span>
      </div>
    </div>
  );
}
