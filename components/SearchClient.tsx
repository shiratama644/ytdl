'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { VideoCard } from '@/components/VideoCard';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/icons';
import type { SearchResponse, FeedItem } from '@/lib/types';

const durationOptions = [
  { id: '', label: 'すべて' },
  { id: 'under_three_mins', label: '3分未満' },
  { id: 'three_to_twenty_mins', label: '3〜20分' },
  { id: 'over_twenty_mins', label: '20分以上' },
];

const typeOptions = [
  { id: '', label: 'すべて' },
  { id: 'video', label: '動画' },
  { id: 'shorts', label: 'ショート' },
  { id: 'channel', label: 'チャンネル' },
  { id: 'playlist', label: 'プレイリスト' },
];

async function fetchSearch(
  pageParam: string | undefined,
  q: string,
  duration: string,
  type: string,
  sort: string,
): Promise<SearchResponse> {
  const params = new URLSearchParams();
  params.set('q', q);
  if (duration) params.set('duration', duration);
  if (type) params.set('type', type);
  if (sort) params.set('prioritize', sort === 'popularity' ? 'popularity' : 'relevance');
  if (pageParam) params.set('continuation', pageParam);
  const res = await fetch(`/api/search?${params.toString()}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as SearchResponse;
}

export function SearchClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [duration, setDuration] = useState('');
  const [type, setType] = useState('');
  const [sort, setSort] = useState('relevance');

  const q = searchParams.get('q') ?? '';

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    error,
  } = useInfiniteQuery<SearchResponse>({
    queryKey: ['search', q, duration, type, sort],
    enabled: !!q,
    queryFn: ({ pageParam }) => fetchSearch(pageParam as string | undefined, q, duration, type, sort),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.continuation,
  });

  useEffect(() => {
    if (!q) router.replace('/');
  }, [q, router]);

  const items: FeedItem[] = data?.pages.flatMap((p) => p.items) ?? [];
  const refinements = data?.pages[0]?.refinements ?? [];

  return (
    <div className="space-y-6">
      {/* フィルタチップ列（常時可視化） */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-label-medium text-on-surface-variant">期間なし</span>
        {durationOptions.map((d) => (
          <Chip key={d.id} selected={duration === d.id} onClick={() => setDuration(d.id)}>
            {d.label}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-label-medium text-on-surface-variant">種別</span>
        {typeOptions.map((t) => (
          <Chip key={t.id} selected={type === t.id} onClick={() => setType(t.id)}>
            {t.label}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-label-medium text-on-surface-variant">並び替え</span>
        <Chip selected={sort === 'relevance'} onClick={() => setSort('relevance')}>関連度</Chip>
        <Chip selected={sort === 'popularity'} onClick={() => setSort('popularity')}>人気順</Chip>
      </div>

      <p className="text-body-small text-on-surface-variant">
        {data?.pages[0]?.estimatedResults
          ? `約 ${data.pages[0].estimatedResults.toLocaleString()} 件`
          : `「${q}」の検索結果`}
      </p>

      {refinements.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {refinements.slice(0, 12).map((r) => (
            <span key={r} className="text-label-small text-primary bg-primary/10 px-2 py-1 rounded-m3-xs">
              {r}
            </span>
          ))}
        </div>
      )}

      {status === 'pending' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
          {Array.from({ length: 9 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static loading skeleton has no stable unique identity.
            <div key={i} className="animate-pulse">
              <div className="aspect-video rounded-m3-md bg-surface-container-high" />
              <div className="mt-3 h-4 w-3/4 rounded-m3-xs bg-surface-container-high" />
              <div className="mt-2 h-3 w-1/2 rounded-m3-xs bg-surface-container-high" />
            </div>
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="grid place-items-center py-24 text-center">
          <Icon name="search" size={40} className="text-on-surface-variant" />
          <p className="mt-3 text-body-medium text-on-surface-variant">
            {error instanceof Error ? error.message : '検索に失敗しました。'}
          </p>
        </div>
      )}

      {status === 'success' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
            {items.map((item) =>
              item.type === 'video' ? <VideoCard key={(item as any).videoId} video={item as any} /> : null,
            )}
          </div>
          {items.length === 0 && (
            <p className="text-body-medium text-on-surface-variant text-center py-24">
              結果が見つかりません。
            </p>
          )}
          {hasNextPage && (
            <div className="flex justify-center py-8">
              <Button variant="tonal" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? '読み込み中…' : 'さらに読み込む'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
