'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { VideoCard } from '@/components/VideoCard';
import { Icon } from '@/components/ui/icons';
import type { ChannelResponse, ChannelTab } from '@/lib/types';

const tabLabels: Record<ChannelTab, string> = {
  home: 'ホーム',
  videos: '動画',
  shorts: 'ショート',
  live: 'ライブ',
  playlists: 'プレイリスト',
  community: 'コミュニティ',
  about: '概要',
};

export function ChannelClient({ channelId }: { channelId: string }) {
  const [tab, setTab] = useState<ChannelTab>('home');

  const { data, status, error } = useQuery<ChannelResponse>({
    queryKey: ['channel', channelId, tab],
    queryFn: async () => {
      const res = await fetch(`/api/channel/${channelId}?tab=${tab}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data as ChannelResponse;
    },
  });

  if (status === 'pending') {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-40 rounded-m3-lg bg-surface-container-high" />
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-m3-full bg-surface-container-high" />
          <div className="h-6 w-40 rounded-m3-sm bg-surface-container-high" />
        </div>
      </div>
    );
  }
  if (status === 'error' || !data) {
    return (
      <div className="grid place-items-center py-24 text-center">
        <Icon name="channel" size={40} className="text-on-surface-variant" />
        <p className="mt-3 text-body-medium text-on-surface-variant">
          {error instanceof Error ? error.message : 'チャンネルを取得できません。'}
        </p>
      </div>
    );
  }

  const availableTabs = (data.tabs?.length ? data.tabs : ['videos', 'about']) as ChannelTab[];
  const feed = data.feed?.[tab] ?? [];

  return (
    <div className="space-y-6">
      {/* バナー */}
      <div className="relative h-40 md:h-56 rounded-m3-lg overflow-hidden bg-surface-container-high">
        {data.banner?.[0] && (
          <Image
            src={data.banner[0].url}
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="h-20 w-20 rounded-m3-full overflow-hidden bg-surface-container-high border-4 border-surface">
          {data.avatar?.[0] && (
            <Image
              src={data.avatar[0].url}
              alt=""
              width={80}
              height={80}
              className="object-cover"
              unoptimized
            />
          )}
        </div>
        <div>
          <h1 className="text-headline-small">{data.title}</h1>
          <p className="text-body-small text-on-surface-variant">
            {data.subscriberCount}{' '}
            {data.videoCount ? `· ${data.videoCount}` : ''}
          </p>
          {data.description && (
            <p className="mt-1 text-body-small text-on-surface-variant line-clamp-2 max-w-lg">
              {data.description}
            </p>
          )}
        </div>
      </div>

      {/* タブ切替 */}
      <div className="flex gap-1 overflow-x-auto border-b border-outline-variant pb-0">
        {availableTabs.map((t) => (
          <button type="button"
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-4 h-11 text-label-large whitespace-nowrap ${
              tab === t ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tabLabels[t] ?? t}
            {tab === t && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-m3-full bg-primary" />}
          </button>
        ))}
      </div>

      {tab === 'about' ? (
        <div className="rounded-m3-lg bg-surface-container-low p-6 space-y-2 text-body-medium">
          {data.about?.joined && (
            <p><span className="text-on-surface-variant">登録日: </span>{data.about.joined}</p>
          )}
          {data.about?.totalViews && (
            <p><span className="text-on-surface-variant">総再生回数: </span>{data.about.totalViews}</p>
          )}
          {data.about?.country && (
            <p><span className="text-on-surface-variant">国: </span>{data.about.country}</p>
          )}
          {data.about?.links?.length ? (
            <div className="pt-2 space-y-1">
              {data.about.links.map((l) => (
                <a key={l.url} href={l.url} className="block text-primary hover:underline">
                  {l.title}
                </a>
              ))}
            </div>
          ) : null}
          {!data.about && <p className="text-on-surface-variant">概要情報がありません。</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
          {feed.map((item) =>
            item.type === 'video' ? <VideoCard key={(item as any).videoId} video={item as any} /> : null,
          )}
          {feed.length === 0 && (
            <p className="col-span-full text-body-medium text-on-surface-variant text-center py-16">
              このタブにはコンテンツがありません。
            </p>
          )}
        </div>
      )}
    </div>
  );
}
