import { NextResponse } from "next/server";
import { liveChatQuerySchema } from "@/lib/schemas";
import type { LiveChatMessage } from "@/lib/types";
import { cacheGetOrSet } from "@/lib/cache";
import { env } from "@/lib/env";
import { getYoutubeClient, parseVideoId } from "@/lib/youtube";

function toText(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "toString" in value) {
    const rendered = String((value as { toString: () => string }).toString());
    return rendered === "[object Object]" ? fallback : rendered;
  }
  return fallback;
}

function normalizeMessage(raw: unknown): LiveChatMessage | null {
  const item = raw as {
    id?: string;
    author?: { name?: unknown };
    message?: unknown;
    purchase_amount?: string;
    timestamp_text?: string;
    timestamp?: number;
  };

  const text = toText(item.message, "").trim();
  if (!text) return null;

  return {
    id:
      item.id ??
      `${toText(item.author?.name, "unknown")}#${item.timestamp_text ?? item.timestamp ?? Date.now()}#${text.slice(0, 40)}`,
    author: toText(item.author?.name, "unknown"),
    text,
    timestamp:
      item.timestamp_text ??
      new Date(Number(item.timestamp ?? Date.now())).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    isPaid: Boolean(item.purchase_amount),
  };
}

export async function GET(request: Request) {
  const query = liveChatQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );

  if (!query.success) {
    return NextResponse.json({ error: query.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const videoId = parseVideoId(query.data.id);
    if (!videoId) {
      return NextResponse.json({ error: "invalid video id" }, { status: 400 });
    }

    const messages = await cacheGetOrSet(
      `live-chat:${videoId}`,
      async () => {
        const yt = await getYoutubeClient();
        const info = await yt.getInfo(videoId);
        const basic = info.basic_info;

        if (!(basic.is_live || basic.is_live_content)) {
          return [] as LiveChatMessage[];
        }

        const liveChat = info.getLiveChat();
        const liveChatEvents = liveChat as {
          on: {
            (event: "start", handler: (initial: { actions?: Array<{ item?: unknown }> }) => void): void;
            (event: "chat-update", handler: (action: { item?: unknown }) => void): void;
          };
          start: () => void;
          stop: () => void;
        };

        const collected: LiveChatMessage[] = [];
        const ids = new Set<string>();

        const append = (entry: LiveChatMessage | null) => {
          if (!entry || ids.has(entry.id)) return;
          ids.add(entry.id);
          collected.push(entry);
        };

        const onAction = (action: { item?: unknown }) => append(normalizeMessage(action.item));
        const onStart = (initial: { actions?: Array<{ item?: unknown }> }) => {
          for (const action of initial.actions ?? []) onAction(action);
        };

        liveChatEvents.on("start", onStart);
        liveChatEvents.on("chat-update", onAction);
        liveChatEvents.start();
        await new Promise((resolve) => setTimeout(resolve, 2500));
        liveChatEvents.stop();

        return collected.slice(-40);
      },
      env.CACHE_LIVE_CHAT_TTL_SECONDS,
    );

    return NextResponse.json({ messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
