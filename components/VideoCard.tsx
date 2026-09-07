'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { VideoItem } from '@/lib/types';
import { formatViews, formatDuration } from '@/lib/format';
import { Icon } from './ui/icons';

export function VideoCard({ video }: { video: VideoItem }) {
  const href = video.isShort ? `/shorts/${video.videoId}` : `/watch/${video.videoId}`;

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-m3-md bg-surface-container-low/40 border border-outline-variant/60 shadow-soft transition-all duration-300 hover:scale-[1.02] hover:shadow-soft-lg hover:border-outline focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="relative aspect-video overflow-hidden rounded-m3-md bg-surface-container-low">
        {video.bestThumbnail ? (
          <Image
            src={video.bestThumbnail}
            alt={video.title}
            fill
            sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="grid place-items-center h-full text-on-surface-variant">
            <Icon name="play" size={40} />
          </div>
        )}
        {video.lengthText && !video.isLive && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-m3-xs bg-black/75 text-white text-label-small font-medium backdrop-blur-sm">
            {formatDuration(video.lengthText)}
          </span>
        )}
        {video.isLive && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-m3-xs bg-error text-on-error text-label-small font-medium">
            ライブ
          </span>
        )}
      </div>
      <div className="p-3 flex gap-2.5">
        <div className="h-9 w-9 shrink-0 rounded-m3-sm bg-surface-container-high overflow-hidden">
          {video.channel.avatar?.[0] && (
            <Image
              src={video.channel.avatar[0].url}
              alt=""
              width={36}
              height={36}
              className="object-cover"
              unoptimized
            />
          )}
        </div>
        <div className="min-w-0">
          {/* 準主役: 16px Medium / 2行まで */}
          <h3 className="line-clamp-2 text-title-small font-medium leading-snug text-on-surface group-hover:text-primary">
            {video.title}
          </h3>
          {/* 脇役: 13px 淡色 */}
          <p className="mt-1 text-body-small text-on-surface-variant truncate">
            {video.channel.name}
          </p>
          <p className="text-body-small text-on-surface-variant">
            {video.viewCountText ?? (video.viewCount !== undefined ? formatViews(video.viewCount) : '')}
            {video.published ? ` · ${video.published}` : ''}
          </p>
        </div>
      </div>
    </Link>
  );
}
