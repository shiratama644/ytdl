import { env } from "@/lib/env";
import { cacheGetOrSet } from "@/lib/cache";
import type { ChannelPayload, VideoCard, VideoPayload } from "@/lib/types";
import { detectMode, getYoutubeClient, parseVideoId } from "@/lib/youtube";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" ? (value as UnknownRecord) : null;
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  const record = asRecord(value);
  if (!record) return fallback;
  if (typeof record.text === "string") return record.text;
  if (Array.isArray(record.runs)) {
    return record.runs
      .map((run) => asRecord(run))
      .map((run) => (run && typeof run.text === "string" ? run.text : ""))
      .join("")
      .trim();
  }
  return typeof record.toString === "function" ? String(record.toString()) : fallback;
}

function pickThumbnail(value: unknown) {
  const record = asRecord(value);
  if (!record) return "";
  const thumbs = Array.isArray(record.thumbnails) ? record.thumbnails : [];
  if (!Array.isArray(thumbs)) return "";
  const last = thumbs.at(-1);
  const lastRecord = asRecord(last);
  return typeof lastRecord?.url === "string" ? lastRecord.url : "";
}

function normalizeVideoCard(record: UnknownRecord): VideoCard | null {
  const idCandidate =
    (typeof record.id === "string" ? record.id : null) ??
    (typeof record.video_id === "string" ? record.video_id : null) ??
    (typeof record.videoId === "string" ? record.videoId : null);

  if (!idCandidate || !/^[a-zA-Z0-9_-]{11}$/.test(idCandidate)) return null;

  const title = toText(record.title, "");
  if (!title) return null;

  const channel =
    toText(record.author, "") ||
    toText(record.owner, "") ||
    toText(record.short_byline_text, "") ||
    toText(record.long_byline_text, "");

  const channelId =
    (asRecord(record.author)?.id as string | undefined) ??
    (asRecord(record.owner)?.id as string | undefined) ??
    "";

  return {
    id: idCandidate,
    title,
    channelName: channel || "unknown",
    channelId,
    viewCountText: toText(record.view_count_text, toText(record.short_view_count_text, "")),
    publishedText: toText(record.published, toText(record.published_time_text, "")),
    durationText: toText(record.length_text, toText(record.duration, "")),
    thumbnail: pickThumbnail(record.thumbnail) || pickThumbnail(record.thumbnails),
  };
}

function collectVideoCards(root: unknown, limit = 24) {
  const found = new Map<string, VideoCard>();
  const stack: unknown[] = [root];

  while (stack.length > 0 && found.size < limit) {
    const current = stack.pop();
    if (!current) continue;

    if (Array.isArray(current)) {
      for (const item of current) stack.push(item);
      continue;
    }

    const record = asRecord(current);
    if (!record) continue;

    const card = normalizeVideoCard(record);
    if (card && !found.has(card.id)) found.set(card.id, card);

    for (const value of Object.values(record)) {
      if (typeof value === "object" && value) stack.push(value);
    }
  }

  return Array.from(found.values());
}

export async function getTopVideos() {
  return cacheGetOrSet(
    "top",
    async () => {
      const yt = await getYoutubeClient();
      try {
        const home = await yt.getHomeFeed();
        const cards = collectVideoCards(home, 24);
        if (cards.length > 0) return cards;
      } catch (error) {
        console.warn("Failed to load home feed, falling back to search:", error);
        // fallback below
      }

      const fallback = await yt.search("おすすめ 人気動画");
      return collectVideoCards(fallback, 24);
    },
    env.CACHE_HOME_TTL_SECONDS,
  );
}

export async function getSearchVideos(query: string) {
  return cacheGetOrSet(
    `search:${query}`,
    async () => {
      const yt = await getYoutubeClient();
      const search = await yt.search(query);
      return collectVideoCards(search, 40);
    },
    env.CACHE_SEARCH_TTL_SECONDS,
  );
}

export async function getVideoByInput(input: string): Promise<VideoPayload> {
  const videoId = parseVideoId(input);
  if (!videoId) {
    throw new Error("YouTube URL or 11-char video id is required.");
  }

  return cacheGetOrSet(
    `video:${videoId}`,
    async () => {
      const yt = await getYoutubeClient();
      const info = await yt.getInfo(videoId);
      const basic = info.basic_info;
      const isLive = Boolean(basic.is_live || basic.is_live_content);
      const duration = basic.duration ?? 0;

      const commentsData = await yt.getComments(videoId).catch(() => null);
      const comments =
        commentsData?.contents
          ?.slice(0, 20)
          .map((thread) => thread.comment)
          .filter((comment): comment is NonNullable<typeof comment> => Boolean(comment))
          .map((comment) => ({
            id: comment.comment_id,
            author: toText(comment.author?.name, "unknown"),
            text: toText(comment.content, ""),
            publishedTime: comment.published_time ?? "",
            likeCount: comment.like_count,
          })) ?? [];

      const related = collectVideoCards(info.watch_next_feed ?? [], 20).filter(
        (card) => card.id !== videoId,
      );

      return {
        id: videoId,
        title: basic.title ?? "",
        channelName: basic.channel?.name ?? basic.author ?? "",
        channelId: basic.channel?.id ?? basic.channel_id ?? "",
        description: basic.short_description ?? "",
        viewCount: basic.view_count ?? 0,
        likeCount: basic.like_count ?? 0,
        duration,
        isLive,
        mode: detectMode(input, isLive, duration),
        thumbnail: basic.thumbnail?.at(-1)?.url ?? "",
        embedUrl: basic.embed?.iframe_url ?? `https://www.youtube.com/embed/${videoId}`,
        streamUrl: `/api/stream?id=${videoId}`,
        comments,
        hasLiveChat: isLive && Boolean(info.livechat),
        related,
      } as VideoPayload;
    },
    env.CACHE_VIDEO_TTL_SECONDS,
  );
}

export async function getChannelPayload(channelId: string): Promise<ChannelPayload> {
  return cacheGetOrSet(
    `channel:${channelId}`,
    async () => {
      const yt = await getYoutubeClient();
      const channel = await yt.getChannel(channelId);
      const channelRecord = channel as unknown as UnknownRecord;

      const metadata = asRecord(channelRecord.metadata) ?? {};
      const videos = collectVideoCards(channel, 30);

      return {
        id: channelId,
        name: toText(metadata.title, toText(channelRecord.title, "Channel")),
        description: toText(metadata.description, ""),
        avatar: pickThumbnail(metadata.avatar),
        subscriberText: toText(metadata.subscriber_count, ""),
        videos,
      };
    },
    env.CACHE_CHANNEL_TTL_SECONDS,
  );
}

export async function getStreamUrl(videoId: string, quality = "best") {
  return cacheGetOrSet(
    `stream:${videoId}:${quality}`,
    async () => {
      const yt = await getYoutubeClient();
      const format = await yt.getStreamingData(videoId, {
        type: "video+audio",
        quality,
        format: "mp4",
      });
      return format.url ?? (await format.decipher());
    },
    env.CACHE_STREAM_URL_TTL_SECONDS,
  );
}
