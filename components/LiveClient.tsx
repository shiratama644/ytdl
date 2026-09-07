'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { Icon } from '@/components/ui/icons';
import { formatViews } from '@/lib/format';
import type { WatchResponse } from '@/lib/types';

interface ChatMessage {
  id: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  timestampText?: string;
  type: string;
}

export function LiveClient({ videoId }: { videoId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewers, setViewers] = useState<number>();
  const [title, setTitle] = useState<string>();
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery<WatchResponse>({
    queryKey: ['live', videoId],
    queryFn: async () => {
      const res = await fetch(`/api/watch/${videoId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data as WatchResponse;
    },
  });

  const { isConnected } = useLiveChat(videoId, (msg) => {
    setMessages((prev) => (prev.length > 300 ? [...prev.slice(-200), msg] : [...prev, msg]));
  }, (kind, payload) => {
    if (kind === 'connected') setConnected(true);
    if (kind === 'start') setConnected(true);
    if (kind === 'metadata') {
      setViewers(payload.viewers);
      setTitle(payload.title);
    }
    if (kind === 'error') setError(payload.message);
  });

  // 新しいメッセージで下へスクロール（ユーザーが上にいる間は停止）
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages changes drive the auto-scroll, even though the effect body doesn't read it directly.
  useEffect(() => {
    const el = chatRef.current;
    if (!el || paused) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, paused]);

  const handleScroll = () => {
    const el = chatRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setPaused(!nearBottom);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <VideoPlayer manifestUrl={`/api/live/${videoId}`} isLive />
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-m3-full bg-error text-on-error text-label-small font-medium">
              <span className="h-1.5 w-1.5 rounded-m3-full bg-on-error animate-pulse" />
              LIVE
            </span>
            {viewers !== undefined && (
              <span className="text-label-medium text-on-surface-variant">
                視聴者数: {viewers.toLocaleString()}
              </span>
            )}
            {!isConnected && <span className="text-label-small text-on-surface-variant">接続中…</span>}
          </div>
          <h1 className="mt-2 text-headline-small leading-snug">{title ?? data?.title ?? ''}</h1>
          <p className="mt-1 text-body-small text-on-surface-variant">
            {data?.author ?? ''} · {data?.viewCount !== undefined ? `${formatViews(data.viewCount)} 視聴` : ''}
          </p>
        </div>
      </div>

      <aside className="flex flex-col h-[60vh] lg:h-[70vh] rounded-m3-lg bg-surface-container-low overflow-hidden">
        <div className="px-4 py-3 border-b border-outline-variant flex items-center gap-2">
          <Icon name="comment" size={18} />
          <span className="text-title-small">ライブチャット</span>
        </div>
        <div
          ref={chatRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
        >
          {error && <p className="text-body-small text-error">{error}</p>}
          {messages.length === 0 && !error && (
            <p className="text-body-small text-on-surface-variant text-center py-10">
              チャットを読み込み中…
            </p>
          )}
          {messages.map((m) => (
            <div key={m.id} className="flex gap-2 text-body-small">
              {m.authorAvatar && (
                <img src={m.authorAvatar} alt="" className="h-6 w-6 shrink-0 rounded-m3-full object-cover" />
              )}
              <div className="min-w-0">
                <span className="text-label-medium text-primary">{m.authorName}</span>{' '}
                <span className="text-on-surface whitespace-pre-wrap break-words">{m.text}</span>
                {m.timestampText && (
                  <span className="text-label-small text-on-surface-variant ml-1">{m.timestampText}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        {paused && (
          <button type="button"
            onClick={() => {
              const el = chatRef.current;
              if (el) el.scrollTop = el.scrollHeight;
              setPaused(false);
            }}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 mb-2 px-3 py-1 rounded-m3-full bg-primary text-on-primary text-label-small"
          >
            最新へ
          </button>
        )}
      </aside>
    </div>
  );
}

function useLiveChat(
  videoId: string,
  onMessage: (msg: ChatMessage) => void,
  onEvent: (kind: string, payload: any) => void,
) {
  const [connected, setConnected] = useState(false);
  const [active, setActive] = useState(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: onMessage/onEvent are unstable inline callbacks; including them would tear down & reopen the EventSource on every render.
  useEffect(() => {
    const es = new EventSource(`/api/live/${videoId}/chat`);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.kind === 'message') onMessage(data.message);
        else onEvent(data.kind, data);
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return { active, isConnected: connected };
}
