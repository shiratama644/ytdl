import { NextRequest } from 'next/server';
import { getInnertube } from '@/lib/innertube';
import { textToString, bestThumbnail, thumbnailsFrom } from '@/lib/serialize';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const videoIdSchema = z.string().regex(/^[A-Za-z0-9_-]{6,20}$/);

/**
 * ライブチャットの SSE 中継。
 * クライアントごとに InnerTube へ個別購読すると負荷が高いため、サーバー側で
 * 1 購読を作り、同一動画を見ている全クライアントへファンアウトする。
 */

interface ChatMessage {
  id: string;
  authorName: string;
  authorAvatar?: string;
  color?: string;
  text: string;
  timestamp?: number;
  timestampText?: string;
  type: 'text' | 'membership' | 'paid' | 'viewer' | 'system';
}

interface EndpointClient {
  controller: ReadableStreamDefaultController<Uint8Array>;
}

type ChatEvent =
  | { kind: 'start'; videoId: string; title?: string; viewers?: number }
  | { kind: 'message'; message: ChatMessage }
  | { kind: 'metadata'; viewers?: number; title?: string }
  | { kind: 'error'; message: string }
  | { kind: 'end' };

class LiveChatHub {
  private clients = new Map<string, Set<EndpointClient>>();
  private active = new Map<string, unknown>(); // livechat instance per video

  subscribe(videoId: string, client: EndpointClient): () => void {
    if (!this.clients.has(videoId)) this.clients.set(videoId, new Set());
    this.clients.get(videoId)!.add(client);
    void this.ensureRunning(videoId);
    return () => {
      this.clients.get(videoId)?.delete(client);
      if (this.clients.get(videoId)?.size === 0) {
        this.stop(videoId);
      }
    };
  }

  private broadcast(videoId: string, event: ChatEvent): void {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(payload);
    this.clients.get(videoId)?.forEach((c) => {
      try {
        c.controller.enqueue(bytes);
      } catch {
        /* client gone */
      }
    });
  }

  async ensureRunning(videoId: string): Promise<void> {
    if (this.active.has(videoId)) return;
    try {
      const yt = await getInnertube();
      const info = await yt.getInfo(videoId);
      const liveChat: any = info.getLiveChat();

      this.active.set(videoId, liveChat);

      if (liveChat && typeof liveChat.on === 'function') {
        liveChat.once?.('start', () => {
          this.broadcast(videoId, { kind: 'start', videoId });
        });
        liveChat.on?.('chat-update', (action: any) => {
          if (action?.type === 'AddChatItemAction' || action?.item) {
            const msg = serializeChatItem(action.item);
            if (msg) this.broadcast(videoId, { kind: 'message', message: msg });
          }
        });
        liveChat.on?.('metadata-update', (metadata: any) => {
          const views = metadata?.views?.viewership?.to_number
            ? metadata.views.viewership.to_number()
            : undefined;
          const title = metadata?.title?.value ? metadata.title.value.toString() : undefined;
          this.broadcast(videoId, { kind: 'metadata', viewers: views, title });
        });
        liveChat.on?.('error', (err: Error) => {
          this.broadcast(videoId, { kind: 'error', message: err.message });
        });
        liveChat.on?.('end', () => this.broadcast(videoId, { kind: 'end' }));
        liveChat.start?.();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.broadcast(videoId, { kind: 'error', message: msg });
    }
  }

  stop(videoId: string): void {
    const liveChat: any = this.active.get(videoId);
    if (liveChat && typeof liveChat.stop === 'function') liveChat.stop();
    this.active.delete(videoId);
  }
}

function serializeChatItem(item: any): ChatMessage | null {
  if (!item) return null;
  const author = item.author;
  const text =
    textToString(item.message ?? item.body ?? item.text ?? item.author_text) ?? '';
  const typeMap: Record<string, ChatMessage['type']> = {
    LiveChatTextMessage: 'text',
    LiveChatMembershipItem: 'membership',
    LiveChatPaidMessage: 'paid',
    LiveChatPaidSticker: 'paid',
    LiveChatViewerEngagementMessage: 'viewer',
    LiveChatModeChangeMessage: 'system',
    LiveChatAutoModMessage: 'system',
  };
  if (!text && !author) return null;
  const avatarUrls =
    author?.thumbnails ??
    (author?.avatar_thumbnail_url ? [{ url: author.avatar_thumbnail_url }] : []);
  const tarr = thumbnailsFrom(avatarUrls);
  return {
    id: item.id ?? item.client_id ?? String(Math.random()),
    authorName: author?.name ?? '',
    authorAvatar: bestThumbnail(tarr),
    text,
    timestamp: typeof item.timestamp === 'number' ? item.timestamp : undefined,
    timestampText: item.timestamp_text,
    type: typeMap[item.type ?? ''] ?? 'text',
  };
}

// シングルトンとしてハブを保持
const hub = new LiveChatHub();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;
  if (!videoIdSchema.safeParse(videoId).success) {
    return new Response('invalid video id', { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const client: EndpointClient = { controller };
      const unsubscribe = hub.subscribe(videoId, client);
      const initial = `data: ${JSON.stringify({ kind: 'connected', videoId })}\n\n`;
      try {
        controller.enqueue(encoder.encode(initial));
      } catch {
        /* noop */
      }
      req.signal.addEventListener('abort', () => {
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* noop */
        }
      });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
