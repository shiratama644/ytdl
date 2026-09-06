import type React from "react";
import type { VideoItem } from "../../shared/types";

interface RelatedVideosProps {
  videos: VideoItem[];
  onVideoClick: (videoId: string) => void;
}

export const RelatedVideos: React.FC<RelatedVideosProps> = ({ videos, onVideoClick }) => {
  if (!videos || videos.length === 0) {
    return (
      <div className="text-xs text-zinc-500 py-4 text-center bg-zinc-900/40 rounded-xl">
        関連動画がありません
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-zinc-200 px-1">関連動画</h3>
      <div className="space-y-2">
        {videos.map((video) => {
          const thumbUrl =
            video.thumbnails && video.thumbnails.length > 0
              ? video.thumbnails[video.thumbnails.length - 1].url
              : `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;

          return (
            <button
              key={video.id}
              type="button"
              onClick={() => onVideoClick(video.id)}
              className="w-full text-left flex gap-2.5 p-1.5 rounded-xl hover:bg-[#1f1f1f] transition-all cursor-pointer group focus:outline-none focus:ring-1 focus:ring-zinc-700"
            >
              {/* サムネイル */}
              <div className="relative aspect-video w-36 sm:w-40 shrink-0 bg-zinc-900 rounded-lg overflow-hidden">
                <img
                  src={thumbUrl}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {video.duration && (
                  <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-medium px-1 py-0.5 rounded">
                    {video.duration}
                  </span>
                )}
              </div>

              {/* 動画情報 */}
              <div className="flex-1 min-w-0 py-0.5">
                <h4 className="text-xs font-semibold text-zinc-200 line-clamp-2 leading-tight group-hover:text-white mb-1">
                  {video.title}
                </h4>
                <p className="text-[11px] text-zinc-400 truncate">{video.author.name}</p>
                <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-0.5">
                  {video.views && <span>{video.views}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
