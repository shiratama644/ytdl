'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { VideoCard } from '@/components/VideoCard';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { DownloadDialog } from '@/components/download-queue/DownloadDialog';
import { Icon } from '@/components/ui/icons';
import { formatViews, formatDurationSeconds } from '@/lib/format';
import { bestThumbnail } from '@/lib/serialize';
import { seedColorFromImage } from '@/lib/theme';
import { useThemeStore } from '@/lib/stores/theme';
import type { WatchResponse } from '@/lib/types';

export function WatchClient({ videoId }: { videoId: string }) {
  const [showDesc, setShowDesc] = useState(false);
  const [openDownload, setOpenDownload] = useState(false);

  const { data, status, error } = useQuery<WatchResponse>({
    queryKey: ['watch', videoId],
    queryFn: async () => {
      const res = await fetch(`/api/watch/${videoId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data as WatchResponse;
    },
  });

  const manifestUrl = useMemo(() => {
    if (!data) return '';
    return data.isLive ? `/api/live/${videoId}` : `/api/dash/${videoId}`;
  }, [data, videoId]);

  const qualityOptions = useMemo(() => {
    if (!data) return [];
    const heights = Array.from(
      new Set(data.adaptive.map((f) => f.height).filter((h): h is number => !!h)),
    ).sort((a, b) => b - a);
    return heights.map((h) => ({ label: `${h}p`, height: h }));
  }, [data]);

  // サムネイル連動ダイナミックカラー: dynamic が 'thumbnail' のとき動画サムネイルからシードを抽出
  const dynamic = useThemeStore((s) => s.dynamic);
  useEffect(() => {
    if (dynamic !== 'thumbnail' || !data?.thumbnail?.length) return;
    const url = bestThumbnail(data.thumbnail);
    if (!url) return;
    let cancelled = false;
    void seedColorFromImage(url).then((color) => {
      if (!cancelled && color) useThemeStore.getState().setSeed(color);
    });
    return () => {
      cancelled = true;
    };
  }, [dynamic, data]);

  if (status === 'pending') {
    return (
      <div className="animate-pulse space-y-6">
        <div className="aspect-video rounded-m3-lg bg-surface-container-high" />
        <div className="h-6 w-2/3 rounded-m3-sm bg-surface-container-high" />
        <div className="h-4 w-1/2 rounded-m3-sm bg-surface-container-high" />
      </div>
    );
  }

  if (status === 'error' || !data) {
    return (
      <div className="grid place-items-center py-24 text-center">
        <div className="grid place-items-center h-16 w-16 rounded-m3-xl bg-error-container text-on-error-container mb-4">
          <Icon name="close" size={32} />
        </div>
        <h2 className="text-title-large">動画情報を取得できません</h2>
        <p className="mt-2 max-w-md text-body-medium text-on-surface-variant">
          {error instanceof Error ? error.message : 'YouTube API にアクセスできません。'}
        </p>
      </div>
    );
  }

  const adaptiveVideos = data.adaptive.filter((f) => f.hasVideo && !f.hasAudio);
  const adaptiveAudio = data.adaptive.filter((f) => f.hasAudio && !f.hasVideo);
  const progressive = data.progressive;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <VideoPlayer
          manifestUrl={manifestUrl}
          isLive={data.isLive}
          qualityOptions={qualityOptions}
        />

        <div>
          <h1 className="text-headline-small leading-snug">{data.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {data.channelAvatar?.[0] && (
                <Image
                  src={data.channelAvatar[0].url}
                  alt=""
                  width={40}
                  height={40}
                  className="rounded-m3-full object-cover"
                  unoptimized
                />
              )}
              <div className="min-w-0">
                <Link
                  href={data.channelId ? `/channel/${data.channelId}` : '#'}
                  className="text-title-medium hover:text-primary truncate block"
                >
                  {data.author}
                </Link>
              </div>
            </div>
            <div className="flex-1" />
            <button
              onClick={() => setOpenDownload(true)}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-m3-full bg-primary text-on-primary hover:brightness-95 text-label-large"
            >
              <Icon name="download" size={20} />
              ダウンロード
            </button>
          </div>
          <p className="mt-2 text-body-small text-on-surface-variant">
            {data.viewCount !== undefined ? `${formatViews(data.viewCount)} 回視聴` : ''}
            {data.published ? ` · ${data.published}` : ''}
            {data.lengthSeconds !== undefined ? ` · ${formatDurationSeconds(data.lengthSeconds)}` : ''}
          </p>

          {/* 概要欄 */}
          <details
            className="mt-4 rounded-m3-lg bg-surface-container-low px-4 py-3 text-body-medium"
            open={showDesc}
            onToggle={(e) => setShowDesc((e.target as HTMLDetailsElement).open)}
          >
            <summary className="cursor-pointer list-none text-title-small flex items-center gap-1">
              <Icon name={showDesc ? 'arrow-up' : 'arrow-down'} size={18} />
              概要欄
            </summary>
            <div className="mt-2 whitespace-pre-wrap text-on-surface-variant">
              {data.description || '概要はありません。'}
            </div>
            {(data.chapters ?? []).length > 0 && (
              <div className="mt-3 pt-3 border-t border-outline-variant">
                <h3 className="text-label-large mb-2">チャプター</h3>
                <ul className="space-y-1">
                  {(data.chapters ?? []).map((c, i) => (
                    <li key={i} className="text-body-small text-on-surface-variant">
                      <span className="text-primary font-medium">{formatDurationSeconds(c.start)}</span>{' '}
                      {c.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(data.tags ?? []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(data.tags ?? []).map((t, i) => (
                  <span key={`${t}-${i}`} className="text-label-small text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-m3-xs">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </details>
        </div>

        <CommentsSection videoId={videoId} />
      </div>

      {/* 関連動画 */}
      <aside className="space-y-4">
        <h2 className="text-title-medium">関連動画</h2>
        {(data.related ?? []).filter((r) => r.type === 'video').map((item, i) => (
          <VideoCard key={`${(item as any).videoId}-${i}`} video={item as any} />
        ))}
        {(data.related ?? []).length === 0 && (
          <p className="text-body-small text-on-surface-variant">
            関連動画を取得できませんでした。
          </p>
        )}
      </aside>

      <DownloadDialog
        open={openDownload}
        onClose={() => setOpenDownload(false)}
        videoId={videoId}
        title={data.title}
        videoFormats={[...adaptiveVideos, ...progressive]}
        audioFormats={adaptiveAudio}
      />
    </div>
  );
}
