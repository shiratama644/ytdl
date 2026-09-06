import { Hono } from "hono";
import type { VideoItem, VideoThumbnail } from "../../shared/types";
import { getInnertube } from "../yt";

export const trendingRouter = new Hono();

trendingRouter.get("/trending", async (c) => {
  try {
    const yt = await getInnertube();
    let feedItems: unknown[] = [];

    try {
      const feed = await yt.getHomeFeed();
      feedItems = feed.videos || [];
    } catch {
      try {
        const trending = await yt.getTrending();
        feedItems = trending.videos || [];
      } catch {
        const search = await yt.search("trending", { type: "video" });
        feedItems = search.videos || [];
      }
    }

    const results: VideoItem[] = [];

    for (const item of feedItems) {
      if (!item || typeof item !== "object") continue;

      const raw = item as unknown as Record<string, unknown>;
      const id = String(raw.id || raw.video_id || "");
      if (!id) continue;

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

      const publishedTime =
        typeof raw.published === "object" && raw.published !== null
          ? String((raw.published as { text?: string }).text || "")
          : typeof raw.published_time === "string"
            ? raw.published_time
            : "";

      const rawThumbs = Array.isArray(raw.thumbnails)
        ? raw.thumbnails
        : typeof raw.thumbnail === "object" && raw.thumbnail !== null
          ? (raw.thumbnail as { thumbnails?: unknown[] }).thumbnails || []
          : [];

      const thumbnails: VideoThumbnail[] = rawThumbs.map((t: unknown) => {
        const thumb = t as Record<string, unknown>;
        return {
          url: String(thumb.url || ""),
          width: typeof thumb.width === "number" ? thumb.width : undefined,
          height: typeof thumb.height === "number" ? thumb.height : undefined,
        };
      });

      if (thumbnails.length === 0) {
        thumbnails.push({
          url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          width: undefined,
          height: undefined,
        });
      }

      results.push({
        id,
        title,
        author: {
          id: authorId,
          name: authorName,
        },
        duration: durationText,
        durationSeconds: durationSec,
        views: viewsText,
        publishedTime,
        thumbnails,
        descriptionSnippet:
          typeof raw.description_snippet === "object" && raw.description_snippet !== null
            ? String((raw.description_snippet as { text?: string }).text || "")
            : typeof raw.description === "string"
              ? raw.description
              : undefined,
      });
    }

    return c.json<{ results: VideoItem[] }>({ results });
  } catch (error) {
    console.error("[Trending] Error:", error);
    return c.json<{ results: VideoItem[] }>({ results: [] }, 500);
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
