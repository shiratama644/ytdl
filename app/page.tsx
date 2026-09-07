'use client';

import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { VideoCard } from '@/components/VideoCard';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/icons';
import type { FeedItem } from '@/lib/types';

const filters = [
  'すべて',
  '音楽',
  'ゲーム',
  'ニュース',
  'スポーツ',
  '料理',
  'テクノロジー',
  '旅行',
  'アニメ',
];

interface HomeResponse {
  items: FeedItem[];
  continuation?: string;
}

async function fetchHome(pageParam: string | undefined): Promise<HomeResponse> {
  const url = pageParam
    ? `/api/home?continuation=${encodeURIComponent(pageParam)}`
    : '/api/home';
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as HomeResponse;
}

export default function HomePage() {
  const [filter, setFilter] = useState('すべて');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    error,
  } = useInfiniteQuery<HomeResponse>({
    queryKey: ['home'],
    queryFn: ({ pageParam }) => fetchHome(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.continuation,
  });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-6">
      {/* 主役: ホーム */}
      <header className="space-y-1">
        <h1 className="text-title-large font-bold tracking-tight">ホーム</h1>
        <p className="text-body-small text-on-surface-variant">おすすめの動画</p>
      </header>

      {/* カテゴリフィルタ（チップ列） */}
      <div className="glass rounded-m3-md border border-outline-variant/60 shadow-soft p-3">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {filters.map((f) => (
            <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </div>
      </div>

      {status === 'pending' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static loading skeleton has no stable unique identity.
            <div key={i} className="animate-pulse rounded-m3-md border border-outline-variant/60 overflow-hidden">
              <div className="aspect-video bg-surface-container-high" />
              <div className="p-3 flex gap-2.5">
                <div className="h-9 w-9 rounded-m3-sm bg-surface-container-high" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded-m3-xs bg-surface-container-high" />
                  <div className="h-3 w-1/2 rounded-m3-xs bg-surface-container-high" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="grid place-items-center py-24 text-center">
          <div className="grid place-items-center h-16 w-16 rounded-m3-xl bg-error-container text-on-error-container mb-4">
            <Icon name="close" size={32} />
          </div>
          <h2 className="text-title-large">ホームフィードを取得できません</h2>
          <p className="mt-2 max-w-md text-body-medium text-on-surface-variant">
            {error instanceof Error ? error.message : 'YouTube API へのアクセスに失敗しました。'}
          </p>
        </div>
      )}

      {status === 'success' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) =>
              item.type === 'video' ? <VideoCard key={item.videoId} video={item} /> : null,
            )}
          </div>
          {items.length === 0 && (
            <p className="text-body-medium text-on-surface-variant text-center py-24">
              表示できる動画がありません。
            </p>
          )}
          {hasNextPage && (
            <div className="flex justify-center py-8">
              <Button
                variant="tonal"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? '読み込み中…' : 'さらに読み込む'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
