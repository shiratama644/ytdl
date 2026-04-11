import Image from "next/image";
import Link from "next/link";
import type { VideoCard as VideoCardType } from "@/lib/types";

type Props = {
  video: VideoCardType;
};

function isShortFormVideo(durationText: string) {
  const durationParts = durationText.split(":").map((part) => Number(part));
  if (durationParts.some((part) => Number.isNaN(part))) return false;
  const totalSeconds =
    durationParts.length === 2
      ? durationParts[0] * 60 + durationParts[1]
      : durationParts.length === 3
        ? durationParts[0] * 3600 + durationParts[1] * 60 + durationParts[2]
        : Infinity;
  return totalSeconds <= 90;
}

export function VideoCard({ video }: Props) {
  const channelHref = video.channelId ? `/channel/${encodeURIComponent(video.channelId)}` : undefined;
  const thumbnailClass = isShortFormVideo(video.durationText) ? "aspect-[9/16] sm:aspect-video" : "aspect-video";

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg backdrop-blur-sm">
      <Link href={`/watch/${encodeURIComponent(video.id)}`} className="block">
        <div className={`relative w-full bg-black ${thumbnailClass}`}>
          <Image
            src={video.thumbnail || "/window.svg"}
            alt={video.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 25vw"
          />
        </div>
      </Link>
      <div className="space-y-1 p-3">
        <Link href={`/watch/${encodeURIComponent(video.id)}`} className="line-clamp-2 text-sm font-semibold">
          {video.title}
        </Link>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          {video.channelIcon ? (
            <span className="relative h-5 w-5 overflow-hidden rounded-full border border-white/20">
              <Image src={video.channelIcon} alt={video.channelName} fill className="object-cover" sizes="20px" />
            </span>
          ) : (
            <span className="h-5 w-5 rounded-full border border-white/20 bg-white/10" />
          )}
          {channelHref ? (
            <Link href={channelHref} className="truncate hover:text-zinc-200">
              {video.channelName}
            </Link>
          ) : (
            <p className="truncate">{video.channelName}</p>
          )}
        </div>
        <p className="text-xs text-zinc-500">
          {[video.viewCountText, video.publishedText, video.durationText].filter(Boolean).join(" • ")}
        </p>
      </div>
    </article>
  );
}
