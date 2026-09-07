'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from './ui/icons';
import { useThemeStore } from '@/lib/stores/theme';
import { useDownloadStore } from '@/lib/stores/download';
import {
  TONE_PRESETS,
  type ToneId,
} from '@/lib/theme';
import {
  addSearchHistory,
  recentSearchHistory,
  clearSearchHistory,
} from '@/lib/search-history';

/** サジェストを取得する API（3 文字以上で呼ぶ）。 */
async function fetchSuggestions(q: string): Promise<string[]> {
  try {
    const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { suggestions?: string[] };
    return data.suggestions ?? [];
  } catch {
    return [];
  }
}

export function NavBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { mode, toggleMode, dynamic, setDynamic, tone, setTone } = useThemeStore();
  const jobs = useDownloadStore((s) => s.jobs);
  const activeCount = Object.values(jobs).filter((j) =>
    ['queued', 'downloading-video', 'downloading-audio', 'muxing'].includes(j.status),
  ).length;
  const doneCount = Object.values(jobs).filter((j) => j.status === 'done').length;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ---- 検索履歴 + サジェスト（予測変換） ----
  const [history, setHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 入力中に履歴を読み込む（マウント時 + 実行時に更新）。
  const loadHistory = useCallback(async () => {
    const h = await recentSearchHistory();
    setHistory(h);
  }, []);

  useEffect(() => {
    if (mounted) void loadHistory();
  }, [mounted, loadHistory]);

  const onQueryChange = (value: string) => {
    setQuery(value);
    setActiveIndex(-1);
    setOpen(value.length > 0);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 3) {
      debounceRef.current = setTimeout(async () => {
        const s = await fetchSuggestions(value.trim());
        setSuggestions(s);
      }, 250);
    } else {
      setSuggestions([]);
    }
  };

  // 履歴 + サジェストを結合した候補リスト（履歴は先頭、重複除去）。
  const results = Array.from(new Set([...history, ...suggestions]));
  const visibleResults = query.trim() ? results : history;

  const runSearch = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      setOpen(false);
      setSuggestions([]);
      void addSearchHistory(trimmed).then(() => loadHistory());
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [router, loadHistory],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && visibleResults[activeIndex]) {
      runSearch(visibleResults[activeIndex]);
    } else {
      runSearch(query);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, visibleResults.length - 1));
      setOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    } else if (e.key === 'Enter') {
      onSubmit(e as unknown as React.FormEvent);
    }
  };

  const onFocus = () => {
    if (query.trim() || history.length) setOpen(true);
  };

  const clearHistory = () => {
    void clearSearchHistory().then(() => {
      setHistory([]);
      setSuggestions([]);
      setOpen(false);
    });
  };

  // テーマシート: 外側クリック / ESC で閉じる（スタティック要素への a11y インタラクションを避けるため document リスナーで処理）。
  const themeSheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!themeSheetOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (themeSheetRef.current && !themeSheetRef.current.contains(e.target as Node)) {
        setThemeSheetOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setThemeSheetOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [themeSheetOpen]);

  return (
    <header className="glass fixed top-0 inset-x-0 z-40 h-16 border-b border-outline-variant">
      <div className="mx-auto max-w-[1600px] h-full px-3 md:px-6 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <span className="grid place-items-center h-9 w-9 rounded-m3-lg bg-primary text-on-primary group-hover:brightness-95">
            <Icon name="play" size={18} fill />
          </span>
          <span className="font-title-small md:font-title-medium hidden md:inline">ytdl</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-2">
          <Link href="/" className="flex items-center gap-1.5 h-9 px-3 rounded-m3-full hover:bg-surface-container-high text-on-surface-variant">
            <Icon name="home" size={18} />
            <span className="text-label-large">ホーム</span>
          </Link>
        </nav>

        {/* Search (予測変換付き) */}
        <form onSubmit={onSubmit} className="flex-1 max-w-xl mx-auto relative">
          <div className="relative">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={onFocus}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder="検索"
              className="w-full h-11 pl-11 pr-4 rounded-m3-full bg-surface-container-low text-on-surface placeholder:text-on-surface-variant outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
              <Icon name="search" size={20} />
            </span>
          </div>

          {open && visibleResults.length > 0 && (
            <div className="glass-strong absolute top-full left-0 right-0 mt-2 rounded-m3-md shadow-soft-lg overflow-hidden z-50">
              <ul className="py-1 max-h-80 overflow-y-auto">
                {visibleResults.slice(0, 10).map((r, i) => (
                  <li key={r}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        runSearch(r);
                      }}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-body-medium transition-colors ${
                        activeIndex === i ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant'
                      }`}
                    >
                      <Icon name="search" size={16} className="shrink-0 text-on-surface-variant" />
                      <span className="truncate">{r}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {history.length > 0 && (
                <div className="border-t border-outline-variant px-4 py-1.5 flex justify-between items-center">
                  <span className="text-label-small text-on-surface-variant">検索履歴</span>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      clearHistory();
                    }}
                    className="text-label-small text-primary hover:underline"
                  >
                    履歴を消去
                  </button>
                </div>
              )}
            </div>
          )}
        </form>

        <div className="flex items-center gap-1 shrink-0">
          <button type="button"
            onClick={() => setThemeSheetOpen((v) => !v)}
            aria-label="テーマカラー"
            className="grid place-items-center h-10 w-10 rounded-m3-full hover:bg-surface-container-high text-on-surface-variant"
          >
            <Icon name="settings" size={20} />
          </button>
          <button type="button"
            onClick={toggleMode}
            aria-label="テーマ切替"
            className="grid place-items-center h-10 w-10 rounded-m3-full hover:bg-surface-container-high text-on-surface-variant"
          >
            <Icon name={mounted && mode === 'light' ? 'sun' : 'moon'} size={20} />
          </button>
          <button type="button"
            onClick={() => setDynamic(dynamic === 'off' ? 'seed' : 'off')}
            aria-label="ダイナミックカラー"
            className={`grid place-items-center h-10 w-10 rounded-m3-full hover:bg-surface-container-high text-on-surface-variant ${
              dynamic !== 'off' ? 'text-primary' : ''
            }`}
          >
            <Icon name="sparkle" size={20} />
          </button>
          <Link
            href="/downloads"
            aria-label="ダウンロード"
            className="relative grid place-items-center h-10 w-10 rounded-m3-full hover:bg-surface-container-high text-on-surface-variant"
          >
            <Icon name="download" size={20} />
            {mounted && activeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid place-items-center min-w-[18px] h-[18px] px-1 rounded-m3-full bg-primary text-on-primary text-label-small font-bold">
                {activeCount}
              </span>
            )}
            {mounted && doneCount > 0 && activeCount === 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid place-items-center min-w-[18px] h-[18px] px-1 rounded-m3-full bg-tertiary text-on-tertiary text-label-small font-bold">
                {doneCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* テーマカラー切替シート */}
      {themeSheetOpen && (
        <div className="fixed inset-0 z-50">
          <div
            ref={themeSheetRef}
            className="absolute right-4 top-[72px] w-72 glass-strong rounded-m3-lg shadow-soft-lg p-4 z-10"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-title-medium">カラートーン</h3>
              <button
                type="button"
                onClick={() => setThemeSheetOpen(false)}
                aria-label="閉じる"
                className="grid place-items-center h-7 w-7 rounded-m3-full hover:bg-surface-container-high text-on-surface-variant"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="space-y-1.5">
              {TONE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setTone(preset.id as ToneId);
                  }}
                  className={`flex w-full items-center gap-3 rounded-m3-sm px-3 py-2 text-left transition-colors ${
                    tone === preset.id ? 'bg-surface-container-high' : 'hover:bg-surface-container-high/60'
                  }`}
                >
                  <span
                    className="inline-block h-6 w-6 rounded-m3-sm shrink-0"
                    style={{ background: preset.colors.dark.accent }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-label-large text-on-surface">{preset.label}</span>
                    <span className="block text-label-small text-on-surface-variant truncate">{preset.description}</span>
                  </span>
                  {tone === preset.id && <Icon name="check" size={18} className="text-primary" />}
                </button>
              ))}
            </div>
            <div className="mt-3 border-t border-outline-variant pt-3">
              <p className="text-label-small text-on-surface-variant mb-2">
                動的カラー {dynamic === 'off' ? 'オフ' : 'オン'}
              </p>
              <button
                type="button"
                onClick={() => setDynamic(dynamic === 'off' ? 'seed' : 'off')}
                className="text-label-large text-primary hover:underline"
              >
                {dynamic === 'off' ? '動的カラーを有効化' : '動的カラーを無効化'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
