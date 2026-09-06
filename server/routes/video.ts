import { Hono } from "hono";
import type { StreamFormat, VideoDetail, VideoItem, VideoThumbnail } from "../../shared/types";
import { SimpleCache } from "../utils/cache";
import { toProxyImageUrl } from "../utils/proxyUrl";
import { getInnertube } from "../yt";

export const videoRouter = new Hono();

const videoCache = new SimpleCache<VideoDetail>(600); // 10分キャッシュ

videoRouter.get("/video/:id", async (c) => {
  const videoId = c.req.param("id");
  if (!videoId) {
    return c.json({ error: "Video ID is required" }, 400);
  }

  const cached = videoCache.get(`video:${videoId}`);
  if (cached) {
    return c.json<VideoDetail>(cached);
  }

  // 1. デフォルト (WEB) での試行
  let info: Record<string, unknown> | null = null;
  let lastError: unknown = null;

  try {
    const yt = await getInnertube("WEB");
    info = (await yt.getInfo(videoId)) as unknown as Record<string, unknown>;
  } catch (err) {
    lastError = err;
  }

  // 2. MWEB クライアントでのフォールバック
  if (!info) {
    try {
      const ytMweb = await getInnertube("MWEB");
      info = (await ytMweb.getInfo(videoId)) as unknown as Record<string, unknown>;
    } catch (err) {
      lastError = err;
    }
  }

  // 3. getBasicInfo でのフォールバック
  if (!info) {
    try {
      const yt = await getInnertube("WEB");
      info = (await yt.getBasicInfo(videoId)) as unknown as Record<string, unknown>;
    } catch (err) {
      lastError = err;
    }
  }

  if (!info) {
    console.error(`[Video] Error getting info for ${videoId}:`, lastError);
    return c.json({ error: "Failed to retrieve video information" }, 502);
  }

  const basic = (info.basic_info || {}) as Record<string, unknown>;
  const streamingData = (info.streaming_data || {}) as Record<string, unknown>;

  // フォーマット一覧の抽出
  const formats: StreamFormat[] = [];
  const allFormats = [
    ...(Array.isArray(streamingData.formats) ? streamingData.formats : []),
    ...(Array.isArray(streamingData.adaptive_formats) ? streamingData.adaptive_formats : []),
  ];

  for (const fmt of allFormats) {
    if (!fmt) continue;
    const rawFmt = fmt as unknown as Record<string, unknown>;

    const hasVideo = Boolean(rawFmt.has_video ?? (rawFmt.width && Number(rawFmt.width) > 0));
    const hasAudio = Boolean(rawFmt.has_audio ?? rawFmt.audio_quality);
    const mimeType = String(rawFmt.mime_type || "");
    const container = mimeType.split(";")[0].split("/")[1] || "mp4";
    const codecsMatch = mimeType.match(/codecs="([^"]+)"/);
    const codecs = codecsMatch ? codecsMatch[1] : undefined;

    formats.push({
      itag: Number(rawFmt.itag || 0),
      mimeType,
      quality: String(rawFmt.quality || ""),
      qualityLabel: rawFmt.quality_label ? String(rawFmt.quality_label) : undefined,
      bitrate: typeof rawFmt.bitrate === "number" ? rawFmt.bitrate : undefined,
      contentLength: rawFmt.content_length ? String(rawFmt.content_length) : undefined,
      width: typeof rawFmt.width === "number" ? rawFmt.width : undefined,
      height: typeof rawFmt.height === "number" ? rawFmt.height : undefined,
      hasVideo,
      hasAudio,
      container,
      codecs,
    });
  }

  // 関連動画の抽出
  const relatedVideos: VideoItem[] = [];
  const watchNextFeed = Array.isArray(info.watch_next_feed) ? info.watch_next_feed : [];

  for (const item of watchNextFeed) {
    if (!item || typeof item !== "object") continue;
    const raw = item as unknown as Record<string, unknown>;
    const relId = String(raw.id || raw.video_id || "");
    if (!relId || relId === videoId) continue;

    const title =
      typeof raw.title === "object" && raw.title !== null
        ? String((raw.title as { text?: string }).text || "")
        : String(raw.title || "");

    const authorObj = (raw.author || raw.channel || {}) as Record<string, unknown>;
    const authorName =
      typeof authorObj.name === "string"
        ? authorObj.name
        : typeof authorObj.text === "string"
          ? authorObj.text
          : typeof authorObj.title === "string"
            ? authorObj.title
            : "Unknown Channel";

    const authorId = String(authorObj.id || "");

    const durationText =
      typeof raw.duration === "object" && raw.duration !== null
        ? String((raw.duration as { text?: string }).text || "")
        : typeof raw.duration === "string"
          ? raw.duration
          : typeof raw.length_seconds === "number" || typeof raw.length_seconds === "string"
            ? formatSeconds(Number(raw.length_seconds))
            : "";

    const durationSec =
      typeof raw.duration === "object" && raw.duration !== null
        ? Number((raw.duration as { seconds?: number }).seconds || 0)
        : typeof raw.length_seconds === "number" || typeof raw.length_seconds === "string"
          ? Number(raw.length_seconds)
          : 0;

    const viewsText =
      typeof raw.short_view_count === "object" && raw.short_view_count !== null
        ? String((raw.short_view_count as { text?: string }).text || "")
        : typeof raw.view_count === "object" && raw.view_count !== null
          ? String((raw.view_count as { text?: string }).text || "")
          : typeof raw.views === "string"
            ? raw.views
            : "";

    const rawThumbs = Array.isArray(raw.thumbnails)
      ? raw.thumbnails
      : typeof raw.thumbnail === "object" && raw.thumbnail !== null
        ? (raw.thumbnail as { thumbnails?: unknown[] }).thumbnails || []
        : [];

    const thumbnails: VideoThumbnail[] = rawThumbs.map((t: unknown) => {
      const thumb = t as Record<string, unknown>;
      return {
        url: toProxyImageUrl(String(thumb.url || "")),
        width: typeof thumb.width === "number" ? thumb.width : undefined,
        height: typeof thumb.height === "number" ? thumb.height : undefined,
      };
    });

    if (thumbnails.length === 0) {
      thumbnails.push({
        url: `/api/thumbnail/${relId}`,
        width: undefined,
        height: undefined,
      });
    }

    relatedVideos.push({
      id: relId,
      title,
      author: {
        id: authorId,
        name: authorName,
      },
      duration: durationText,
      durationSeconds: durationSec,
      views: viewsText,
      thumbnails,
    });
  }

  const durationSeconds = Number(basic.duration || 0);

  const basicThumbs = Array.isArray(basic.thumbnail) ? basic.thumbnail : [];
  const thumbnails: VideoThumbnail[] = basicThumbs.map((t: unknown) => {
    const rawThumb = t as Record<string, unknown>;
    return {
      url: toProxyImageUrl(String(rawThumb.url || "")),
      width: typeof rawThumb.width === "number" ? thumbNumber(rawThumb.width) : undefined,
      height: typeof rawThumb.height === "number" ? thumbNumber(rawThumb.height) : undefined,
    };
  });

  if (thumbnails.length === 0) {
    thumbnails.push({
      url: `/api/thumbnail/${videoId}`,
      width: undefined,
      height: undefined,
    });
  }

  const authorChannel = (basic.channel || {}) as Record<string, unknown>;
  const detail: VideoDetail = {
    id: videoId,
    title: String(basic.title || "Untitled Video"),
    description: String(basic.short_description || ""),
    author: {
      id: String(basic.channel_id || ""),
      name: String(basic.author || "Unknown Channel"),
      url: typeof authorChannel.url === "string" ? authorChannel.url : undefined,
    },
    durationSeconds,
    durationText: formatSeconds(durationSeconds),
    views: basic.view_count ? `${Number(basic.view_count).toLocaleString()} views` : "",
    viewCount: Number(basic.view_count || 0),
    likes: basic.like_count ? Number(basic.like_count).toLocaleString() : undefined,
    thumbnails,
    formats,
    relatedVideos,
  };

  videoCache.set(`video:${videoId}`, detail);

  return c.json<VideoDetail>(detail);
});

function thumbNumber(val: unknown): number | undefined {
  if (typeof val === "number") return val;
  if (typeof val === "string" && !Number.isNaN(Number(val))) return Number(val);
  return undefined;
}

function formatSeconds(seconds: number): string {
  if (Number.isNaN(seconds) || seconds <= 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}
