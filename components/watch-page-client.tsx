"use client";

import { useEffect, useState } from "react";
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

  const videoClass = video.mode === "short" ? "aspect-[9/16] max-h-[70vh] w-full sm:max-w-[420px]" : "aspect-video";

  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <div className="overflow-hidden rounded-xl bg-black">
          <div className="mx-auto flex items-center justify-center">
            <video key={video.streamUrl} src={video.streamUrl} controls className={videoClass} poster={video.thumbnail} />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold">{video.title}</h1>
          <p className="text-sm text-zinc-400">
            {video.channelName} • {numberFormatter.format(video.viewCount)} views • 👍{" "}
            {numberFormatter.format(video.likeCount)}
          </p>
        </div>
        <details open className="rounded-xl bg-white/5 p-4 text-sm">
          <summary className="cursor-pointer font-semibold">Description</summary>
          <p className="mt-2 whitespace-pre-wrap text-zinc-300">{video.description || "No description."}</p>
        </details>
        <section className="rounded-xl bg-white/5 p-4">
          <h2 className="mb-3 text-base font-semibold">Comments ({video.comments.length})</h2>
          <div className="space-y-3">
            {video.comments.map((comment) => (
              <article key={comment.id} className="rounded-lg bg-white/5 p-3">
                <p className="text-sm font-semibold">{comment.author}</p>
                <p className="mt-1 text-sm text-zinc-300">{comment.text}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {comment.publishedTime} {comment.likeCount ? `• 👍 ${comment.likeCount}` : ""}
                </p>
              </article>
            ))}
            {video.comments.length === 0 && <p className="text-sm text-zinc-400">No comments available.</p>}
          </div>
        </section>
      </section>

      <aside className="space-y-4">
        <section className="rounded-xl bg-white/5 p-4">
          <h2 className="mb-3 text-base font-semibold">Live Chat</h2>
          {!video.hasLiveChat && <p className="text-sm text-zinc-400">This video has no live chat.</p>}
          {video.hasLiveChat && (
            <div className="max-h-[50vh] space-y-2 overflow-auto">
              {messages.map((message) => (
                <div key={message.id} className="rounded-lg bg-black/40 p-2 text-xs">
                  <p className="font-semibold">
                    {message.author}
                    {message.isPaid && <span className="ml-2 rounded bg-fuchsia-600 px-1">SUPER</span>}
                  </p>
                  <p className="mt-1 text-zinc-300">{message.text}</p>
                  <p className="mt-1 text-zinc-500">{message.timestamp}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-xl bg-white/5 p-4">
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
