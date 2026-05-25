import React, { useState, useEffect, useRef } from 'react';
import { RoastMon } from '../types';
import { playRetroSound } from '../utils/audio';
import { drawCardFrame, downloadCardAsPng, downloadFromUrl, generateCardSvg } from '../utils/cardRenderer';
import type { CardData } from '../utils/cardRenderer';

interface ExportEmbedViewProps {
  mon: RoastMon;
  onBack: () => void;
  registerDirectionHandler: (handler: ((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void) | null) => void;
  registerAHandler: (handler: (() => void) | null) => void;
  registerBHandler: (handler: (() => void) | null) => void;
  autoCopy?: boolean;
}

export function ExportEmbedView({
  mon,
  onBack,
  registerDirectionHandler,
  registerAHandler,
  registerBHandler,
  autoCopy,
}: ExportEmbedViewProps) {
  const [cursor, setCursor] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'copy' | 'download' } | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const origin = window.location.origin || `${window.location.protocol}//${window.location.host}`;
  const cardUrl = `${origin}/card/${mon.username}`;
  const badgeApiUrl = `${origin}/api/badge/${mon.username}`;
  const shieldsBadgeUrl = `https://img.shields.io/endpoint?url=${encodeURIComponent(badgeApiUrl)}&style=for-the-badge`;
  const rawGifUrl = `${origin}/api/embed/${mon.username}.gif`;
  const rawSvgUrl = `${origin}/api/embed/svg/${mon.username}`;
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

  // Animated canvas preview (throttled to ~10fps via frame counter)
  useEffect(() => {
    let running = true;
    let frame = 0;

    const animate = () => {
      if (!running) return;
      if (frame % 6 === 0) {
        const canvas = previewCanvasRef.current;
        if (canvas) {
          drawCardFrame(canvas, cardData, Math.floor(frame / 6));
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
  }, [mon.username, wins, losses]);

  useEffect(() => {
    const handleDirection = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
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
      const item = EXPORTS[cursor];
      if (item.action) {
        item.action();
      } else if ('code' in item && item.code) {
        handleCopy(cursor);
      }
    };

    const handleB = () => {
      playRetroSound('beep');
      onBack();
    };

    registerDirectionHandler(handleDirection);
    registerAHandler(handleA);
    registerBHandler(handleB);

    return () => {
      registerDirectionHandler(null);
      registerAHandler(null);
      registerBHandler(null);
    };
  }, [cursor, onBack, wins, losses]);

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

      {/* Canvas Preview */}
      <div className="my-1 flex flex-col items-center bg-gray-100 border border-neutral-300 rounded p-1 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.1)]">
        <div className="w-full flex justify-between items-center mb-0.5 text-[7px] text-zinc-500 font-bold uppercase leading-none px-1">
          <span>LIVE CARD PREVIEW:</span>
          <span className="text-[6.5px] text-emerald-700">● FREE CLIENT-SIDE RENDER</span>
        </div>
        <div className="w-full bg-[#18181b] p-1 border border-[#1a1a1a] rounded flex items-center justify-center overflow-hidden">
          <canvas
            ref={previewCanvasRef}
            width={460}
            height={220}
            className="w-full h-auto max-h-[130px] object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      </div>

      {/* Export Options */}
      <div className="flex-1 flex flex-col justify-start space-y-1 overflow-y-auto max-h-[140px] pt-0.5 scrollbar-thin">
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

      {/* Footer */}
      <div className="h-[25px] border-2 border-[#1a1a1a] bg-[#e1dfde] rounded p-1 text-[7px] leading-tight flex items-center justify-between text-gray-700 shrink-0">
        <span className="truncate pr-1">
          PRESS UP/DOWN TO NAVIGATE • PRESS A TO SAVE/COPY • PRESS B TO EXIT
        </span>
        <span className="text-[6.5px] uppercase text-zinc-500 font-bold shrink-0 border border-zinc-400 px-0.5 rounded">
          FREE EXPORT
        </span>
      </div>
    </div>
  );
}
