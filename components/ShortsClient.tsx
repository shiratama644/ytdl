'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { Icon } from '@/components/ui/icons';
import type { WatchResponse } from '@/lib/types';

export function ShortsClient({ videoId }: { videoId: string }) {
  const { data } = useQuery<WatchResponse>({
    queryKey: ['shorts', videoId],
    queryFn: async () => {
      const res = await fetch(`/api/watch/${videoId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data as WatchResponse;
    },
  });

  // 縦スワイプ対象：現在のショート＋関連動画（ショートとして扱う）
  const shorts = useMemo(() => {
    const related = (data?.related ?? [])
      .filter((r) => r.type === 'video')
      .map((r) => (r as any).videoId as string)
      .slice(0, 8);
    return [videoId, ...related];
  }, [videoId, data]);

  return (
    <div className="fixed inset-0 top-0 bg-black snap-y snap-mandatory overflow-y-auto">
      {shorts.map((id, i) => (
        <div key={id} className="snap-start h-screen w-full relative flex items-center justify-center">
          <div className="w-full max-w-md h-full">
            <VideoPlayer manifestUrl={`/api/dash/${id}`} />
          </div>
          {/* 左のアクションバー */}
          <div className="absolute right-2 bottom-24 flex flex-col gap-4 text-white">
            <button className="grid place-items-center h-11 w-11 rounded-m3-full bg-black/50" aria-label="いいね">
              <Icon name="thumb-up" size={22} />
            </button>
            <button className="grid place-items-center h-11 w-11 rounded-m3-full bg-black/50" aria-label="コメント">
              <Icon name="comment" size={22} />
            </button>
            <button className="grid place-items-center h-11 w-11 rounded-m3-full bg-black/50" aria-label="共有">
              <Icon name="share" size={22} />
            </button>
            <button className="grid place-items-center h-11 w-11 rounded-m3-full bg-black/50" aria-label="その他">
              <Icon name="more" size={22} />
            </button>
          </div>
          {/* メタ情報 */}
          <div className="absolute left-3 bottom-5 right-20 text-white">
            <h2 className="text-title-medium line-clamp-3">{data?.title ?? ''}</h2>
            <p className="mt-1 text-body-small opacity-90">{data?.author ?? ''}</p>
          </div>
          {i > 0 && (
            <Link
              href={`/shorts/${id}`}
              className="absolute top-4 right-4 grid place-items-center h-11 w-11 rounded-m3-full bg-black/50 text-white z-20"
              aria-label="次のショート"
            >
              <Icon name="arrow-down" size={22} />
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
