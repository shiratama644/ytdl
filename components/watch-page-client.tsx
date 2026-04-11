"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { PlyrPlayer } from "@/components/plyr-player";
import { VideoCard } from "@/components/video-card";
import type { LiveChatMessage, VideoPayload } from "@/lib/types";

const numberFormatter = new Intl.NumberFormat("ja-JP");

type Props = {
  initialVideo: VideoPayload;
};

export function WatchPageClient({ initialVideo }: Props) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const video = initialVideo;

  useEffect(() => {
    if (!video.hasLiveChat) return;
    let active = true;

    const fetchChat = async () => {
      const response = await fetch(`/api/live-chat?id=${encodeURIComponent(video.id)}`);
      const json = (await response.json()) as { messages?: LiveChatMessage[] };
      if (!active) return;
      setMessages(json.messages ?? []);
    };

    void fetchChat();
    const timer = setInterval(() => void fetchChat(), 8000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [video.hasLiveChat, video.id]);

  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:px-4 sm:py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/70 shadow-2xl backdrop-blur">
          <PlyrPlayer videoId={video.id} title={video.title} />
        </div>
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur-sm">
          <h1 className="text-lg font-bold sm:text-xl">{video.title}</h1>
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            {video.channelIcon ? (
              <span className="relative h-7 w-7 overflow-hidden rounded-full border border-white/20">
                <Image src={video.channelIcon} alt={video.channelName} fill className="object-cover" sizes="28px" />
              </span>
            ) : (
              <span className="h-7 w-7 rounded-full border border-white/20 bg-white/10" />
            )}
            <p className="truncate">{video.channelName}</p>
          </div>
          <p className="text-sm text-zinc-400">
            {numberFormatter.format(video.viewCount)} views • 👍 {numberFormatter.format(video.likeCount)}
          </p>
        </div>

        <details className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm shadow-lg backdrop-blur-sm">
          <summary className="cursor-pointer font-semibold">Description</summary>
          <p className="mt-2 whitespace-pre-wrap text-zinc-300">{video.description || "No description."}</p>
        </details>

        {video.hasLiveChat && (
          <details
            open
            className="rounded-2xl border border-emerald-400/30 bg-emerald-950/20 p-4 text-sm shadow-lg backdrop-blur-sm"
          >
            <summary className="cursor-pointer font-semibold text-emerald-200">Live Chat</summary>
            <div className="mt-3 max-h-[45vh] space-y-2 overflow-auto pr-1">
              {messages.map((message) => (
                <div key={message.id} className="rounded-lg border border-white/10 bg-black/40 p-2 text-xs">
                  <p className="font-semibold text-zinc-100">
                    {message.author}
                    {message.isPaid && <span className="ml-2 rounded bg-fuchsia-600 px-1">SUPER</span>}
                  </p>
                  <p className="mt-1 text-zinc-300">{message.text}</p>
                  <p className="mt-1 text-zinc-500">{message.timestamp}</p>
                </div>
              ))}
              {messages.length === 0 && <p className="text-zinc-400">No live messages yet.</p>}
            </div>
          </details>
        )}

        <details
          open
          className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm shadow-lg backdrop-blur-sm"
        >
          <summary className="cursor-pointer text-base font-semibold">Comments ({video.comments.length})</summary>
          <div className="mt-3 space-y-3">
            {video.comments.map((comment) => (
              <article key={comment.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold">{comment.author}</p>
                <p className="mt-1 text-sm text-zinc-300">{comment.text}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {comment.publishedTime} {comment.likeCount ? `• 👍 ${comment.likeCount}` : ""}
                </p>
              </article>
            ))}
            {video.comments.length === 0 && <p className="text-sm text-zinc-400">No comments available.</p>}
          </div>
        </details>
      </section>

      <aside className="space-y-4">
        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur-sm">
          <h2 className="text-base font-semibold">Related</h2>
          <div className="space-y-3">
            {video.related.slice(0, 10).map((item) => (
              <VideoCard key={item.id} video={item} />
            ))}
          </div>
        </section>
      </aside>
    </main>
  );
}
