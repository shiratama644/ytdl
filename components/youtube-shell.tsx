"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlayerStore } from "@/stores/player-store";

const numberFormatter = new Intl.NumberFormat("ja-JP");

export function YoutubeShell() {
  const { query, video, messages, loadingVideo, loadingChat, error, setQuery, fetchVideo, fetchLiveChat } =
    usePlayerStore();
  const [input, setInput] = useState(query);

  useEffect(() => {
    if (!video?.hasLiveChat) return;
    fetchLiveChat();
    const timer = setInterval(fetchLiveChat, 8000);
    return () => clearInterval(timer);
  }, [video?.id, video?.hasLiveChat, fetchLiveChat]);

  const playerClassName = useMemo(() => {
    if (!video) return "aspect-video";
    if (video.mode === "short") return "aspect-[9/16] max-h-[70vh] w-full sm:max-w-[400px]";
    return "aspect-video";
  }, [video]);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f0f0f]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <span className="rounded bg-red-600 px-2 py-1 text-xs font-bold">YTDL</span>
          <form
            className="flex flex-1 gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void fetchVideo(input);
            }}
          >
            <input
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setQuery(event.target.value);
              }}
              placeholder="YouTube URL または動画ID"
              className="h-10 w-full rounded-full border border-white/20 bg-black px-4 text-sm outline-none focus:border-blue-400"
            />
            <button
              type="submit"
              disabled={loadingVideo}
              className="h-10 rounded-full bg-white px-4 text-sm font-semibold text-black disabled:opacity-50"
            >
              {loadingVideo ? "読み込み中" : "再生"}
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          <div className="overflow-hidden rounded-xl bg-black">
            {video ? (
              <div className="mx-auto flex items-center justify-center">
                <video key={video.streamUrl} src={video.streamUrl} controls className={playerClassName} poster={video.thumbnail} />
              </div>
            ) : (
              <div className="aspect-video grid place-items-center text-sm text-zinc-400">
                URLまたは動画IDを入力して再生します
              </div>
            )}
          </div>

          {video && (
            <>
              <div className="space-y-2">
                <h1 className="text-xl font-bold">{video.title}</h1>
                <p className="text-sm text-zinc-400">
                  {video.channelName} • {numberFormatter.format(video.viewCount)} 回視聴 • 👍{" "}
                  {numberFormatter.format(video.likeCount)}
                </p>
              </div>

              <details open className="rounded-xl bg-white/5 p-4 text-sm">
                <summary className="cursor-pointer font-semibold">概要欄</summary>
                <p className="mt-2 whitespace-pre-wrap text-zinc-300">{video.description || "概要欄はありません。"}</p>
              </details>

              <section className="rounded-xl bg-white/5 p-4">
                <h2 className="mb-3 text-base font-semibold">コメント ({video.comments.length})</h2>
                <div className="space-y-3">
                  {video.comments.length === 0 && (
                    <p className="text-sm text-zinc-400">コメントを取得できませんでした。</p>
                  )}
                  {video.comments.map((comment) => (
                    <article key={comment.id} className="rounded-lg bg-white/5 p-3">
                      <p className="text-sm font-semibold">{comment.author}</p>
                      <p className="mt-1 text-sm text-zinc-300">{comment.text}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {comment.publishedTime} {comment.likeCount ? `• 👍 ${comment.likeCount}` : ""}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl bg-white/5 p-4">
            <h2 className="mb-3 text-base font-semibold">ライブコメント</h2>
            {!video?.hasLiveChat && <p className="text-sm text-zinc-400">この動画はライブチャット未対応です。</p>}
            {video?.hasLiveChat && (
              <>
                <button
                  type="button"
                  onClick={() => void fetchLiveChat()}
                  className="mb-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-black"
                >
                  {loadingChat ? "更新中..." : "更新"}
                </button>
                <div className="max-h-[60vh] space-y-2 overflow-auto">
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
              </>
            )}
          </section>

          {video && (
            <section className="rounded-xl bg-white/5 p-4 text-xs text-zinc-400">
              <p>モード: {video.mode}</p>
              <p>ライブ: {video.isLive ? "はい" : "いいえ"}</p>
              <p>ID: {video.id}</p>
            </section>
          )}
        </aside>
      </main>

      {error && (
        <div className="fixed right-4 bottom-4 rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
