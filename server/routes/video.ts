import { Hono } from "hono";
import type { StreamFormat, VideoDetail, VideoItem, VideoThumbnail } from "../../shared/types";
import { toProxyImageUrl } from "../utils/proxyUrl";
import { getInnertube } from "../yt";

export const videoRouter = new Hono();

videoRouter.get("/video/:id", async (c) => {
  const videoId = c.req.param("id");
  if (!videoId) {
    return c.json({ error: "Video ID is required" }, 400);
  }

  try {
    const yt = await getInnertube();
    const info = await yt.getInfo(videoId);

    const basic = info.basic_info;

    // フォーマット一覧の抽出
    const formats: StreamFormat[] = [];
    const allFormats = [
      ...(info.streaming_data?.formats || []),
      ...(info.streaming_data?.adaptive_formats || []),
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
    const watchNextFeed = info.watch_next_feed || [];

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

    const thumbnails: VideoThumbnail[] = (basic.thumbnail || []).map((t) => ({
      url: toProxyImageUrl(t.url),
      width: t.width,
      height: t.height,
    }));

    if (thumbnails.length === 0) {
      thumbnails.push({
        url: `/api/thumbnail/${videoId}`,
        width: undefined,
        height: undefined,
      });
    }

    const detail: VideoDetail = {
      id: videoId,
      title: basic.title || "Untitled Video",
      description: basic.short_description || "",
      author: {
        id: basic.channel_id || "",
        name: basic.author || "Unknown Channel",
        url: basic.channel?.url,
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

    return c.json<VideoDetail>(detail);
  } catch (error) {
    console.error(`[Video] Error getting info for ${videoId}:`, error);
    return c.json({ error: "Failed to retrieve video information" }, 500);
  }
});

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
