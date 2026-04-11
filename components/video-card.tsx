import Image from "next/image";
import Link from "next/link";
import type { VideoCard as VideoCardType } from "@/lib/types";

type Props = {
  video: VideoCardType;
};

export function VideoCard({ video }: Props) {
  const channelHref = video.channelId ? `/channel/${encodeURIComponent(video.channelId)}` : undefined;

  return (
    <article className="overflow-hidden rounded-xl bg-white/5">
      <Link href={`/watch/${encodeURIComponent(video.id)}`} className="block">
        <div className="relative aspect-video w-full bg-black">
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
        {channelHref ? (
          <Link href={channelHref} className="text-xs text-zinc-400">
            {video.channelName}
          </Link>
        ) : (
          <p className="text-xs text-zinc-400">{video.channelName}</p>
        )}
        <p className="text-xs text-zinc-500">
          {[video.viewCountText, video.publishedText, video.durationText].filter(Boolean).join(" • ")}
        </p>
      </div>
    </article>
  );
}
