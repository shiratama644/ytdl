'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Icon } from './ui/icons';
import { useThemeStore } from '@/lib/stores/theme';
import { useDownloadStore } from '@/lib/stores/download';

export function NavBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { mode, toggleMode, dynamic, setDynamic } = useThemeStore();
  const jobs = useDownloadStore((s) => s.jobs);
  const activeCount = Object.values(jobs).filter((j) =>
    ['queued', 'downloading-video', 'downloading-audio', 'muxing'].includes(j.status),
  ).length;
  const doneCount = Object.values(jobs).filter((j) => j.status === 'done').length;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-40 h-14 bg-surface/80 backdrop-blur-md border-b border-outline-variant">
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

        {/* Search */}
        <form onSubmit={onSubmit} className="flex-1 max-w-xl mx-auto">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="検索"
              className="w-full h-10 pl-11 pr-4 rounded-m3-full bg-surface-container-low text-on-surface placeholder:text-on-surface-variant outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
              <Icon name="search" size={20} />
            </span>
          </div>
        </form>

        <div className="flex items-center gap-1 shrink-0">
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
    </header>
  );
}
