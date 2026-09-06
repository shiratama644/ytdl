import type React from "react";
import type { VideoItem } from "../../shared/types";

interface VideoCardProps {
  video: VideoItem;
  onClick: (videoId: string) => void;
  layout?: "grid" | "list";
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, onClick, layout = "grid" }) => {
  const thumbUrl =
    video.thumbnails && video.thumbnails.length > 0
      ? video.thumbnails[video.thumbnails.length - 1].url
      : `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;

  if (layout === "list") {
    return (
      <button
        type="button"
        onClick={() => onClick(video.id)}
        className="w-full text-left flex flex-col sm:flex-row gap-3 sm:gap-4 p-2 rounded-xl hover:bg-[#1f1f1f] transition-all cursor-pointer group focus:outline-none focus:ring-1 focus:ring-zinc-700"
      >
        {/* サムネイル */}
        <div className="relative aspect-video w-full sm:w-60 shrink-0 bg-zinc-900 rounded-lg overflow-hidden">
          <img
            src={thumbUrl}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {video.duration && (
            <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[11px] font-medium px-1.5 py-0.5 rounded">
              {video.duration}
            </span>
          )}
        </div>

        {/* 動画情報 */}
        <div className="flex-1 min-w-0 py-0.5">
          <h3 className="text-sm sm:text-base font-semibold text-zinc-100 line-clamp-2 leading-snug group-hover:text-white mb-1.5">
            {video.title}
          </h3>
          <div className="text-xs text-zinc-400 space-y-1">
            <p className="hover:text-zinc-200 truncate">{video.author.name}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {video.views && <span>{video.views}</span>}
              {video.views && video.publishedTime && <span>•</span>}
              {video.publishedTime && <span>{video.publishedTime}</span>}
            </div>
            {video.descriptionSnippet && (
              <p className="text-zinc-500 line-clamp-2 text-xs pt-1">{video.descriptionSnippet}</p>
            )}
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick(video.id)}
      className="w-full text-left flex flex-col gap-2.5 rounded-xl p-2 hover:bg-[#1f1f1f] transition-all cursor-pointer group focus:outline-none focus:ring-1 focus:ring-zinc-700"
    >
      {/* サムネイル */}
      <div className="relative aspect-video w-full bg-zinc-900 rounded-xl overflow-hidden shadow-sm">
        <img
          src={thumbUrl}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {video.duration && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
            {video.duration}
          </span>
        )}
      </div>

      {/* 動画情報 */}
      <div className="flex gap-3 px-0.5">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 line-clamp-2 leading-tight group-hover:text-white mb-1">
            {video.title}
          </h3>
          <p className="text-xs text-zinc-400 truncate hover:text-zinc-200">{video.author.name}</p>
          <div className="flex items-center gap-1 text-[11px] text-zinc-500 mt-0.5">
            {video.views && <span>{video.views}</span>}
            {video.views && video.publishedTime && <span>•</span>}
            {video.publishedTime && <span>{video.publishedTime}</span>}
          </div>
        </div>
      </div>
    </button>
  );
};
