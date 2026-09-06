import { Hono } from "hono";
import type { Innertube } from "youtubei.js";
import { getInnertube } from "../yt";

type DownloadOptions = NonNullable<Parameters<Innertube["download"]>[1]>;
type FormatOptions = NonNullable<
  Parameters<Awaited<ReturnType<Innertube["getInfo"]>>["chooseFormat"]>[0]
>;

export const streamRouter = new Hono();

streamRouter.get("/stream/:id", async (c) => {
  const videoId = c.req.param("id");
  if (!videoId) {
    return c.text("Video ID is required", 400);
  }

  const itagQuery = c.req.query("itag");
  const qualityQuery = c.req.query("quality") || "best";
  const typeQuery = (c.req.query("type") as "video" | "audio" | "videoandaudio") || "videoandaudio";
  const isDownload = c.req.query("download") === "true";

  const rangeHeader = c.req.header("range");

  try {
    const yt = await getInnertube();
    const info = await yt.getInfo(videoId);

    // 指定された itag または条件に合うフォーマットを選択
    let selectedFormat = null;
    const allFormats = [
      ...(info.streaming_data?.formats || []),
      ...(info.streaming_data?.adaptive_formats || []),
    ];

    if (itagQuery) {
      const itagNum = Number.parseInt(itagQuery, 10);
      selectedFormat = allFormats.find(
        (f) => Number((f as unknown as Record<string, unknown>).itag) === itagNum,
      );
    }

    if (!selectedFormat) {
      const formatType: FormatOptions["type"] =
        typeQuery === "videoandaudio" ? "video+audio" : typeQuery;

      try {
        selectedFormat = info.chooseFormat({
          type: formatType,
          quality: qualityQuery,
          format: "mp4",
        });
      } catch {
        // フォールバック: 最初に見つかったフォーマット
        selectedFormat =
          allFormats.find((f) => {
            const raw = f as unknown as Record<string, unknown>;
            if (typeQuery === "audio") return Boolean(raw.has_audio && !raw.has_video);
            if (typeQuery === "video") return Boolean(raw.has_video);
            return Boolean(raw.has_video && raw.has_audio);
          }) || allFormats[0];
      }
    }

    if (!selectedFormat) {
      return c.text("No suitable format found for video", 404);
    }

    const rawFormat = selectedFormat as unknown as Record<string, unknown>;
    const mimeType = String(rawFormat.mime_type || "video/mp4");
    const contentLengthStr = rawFormat.content_length;
    const totalSize = contentLengthStr ? Number.parseInt(String(contentLengthStr), 10) : undefined;

    // Range の解析
    let start = 0;
    let end: number | undefined;

    if (rangeHeader) {
      const matches = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
      if (matches) {
        start = Number.parseInt(matches[1], 10);
        if (matches[2]) {
          end = Number.parseInt(matches[2], 10);
        } else if (totalSize) {
          end = totalSize - 1;
        }
      }
    }

    const downloadOptions: DownloadOptions = {
      itag: Number(rawFormat.itag) || undefined,
      range: rangeHeader && end !== undefined ? { start, end } : undefined,
    };

    const stream = await yt.download(videoId, downloadOptions);

    const headers: Record<string, string> = {
      "Content-Type": mimeType.split(";")[0],
      "Accept-Ranges": "bytes",
      "Access-Control-Allow-Origin": "*",
    };

    if (isDownload) {
      const ext = mimeType.includes("audio") ? "mp3" : "mp4";
      const filename = `${info.basic_info.title || videoId}.${ext}`.replace(/[^\w\s.-]/gi, "_");
      headers["Content-Disposition"] = `attachment; filename="${encodeURIComponent(filename)}"`;
    }

    if (rangeHeader && totalSize) {
      const chunkEnd = end ?? totalSize - 1;
      const chunkSize = chunkEnd - start + 1;
      headers["Content-Range"] = `bytes ${start}-${chunkEnd}/${totalSize}`;
      headers["Content-Length"] = chunkSize.toString();

      return new Response(stream as unknown as BodyInit, {
        status: 206,
        headers,
      });
    }

    if (totalSize && !rangeHeader) {
      headers["Content-Length"] = totalSize.toString();
    }

    return new Response(stream as unknown as BodyInit, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error(`[Stream] Error streaming video ${videoId}:`, error);
    return c.text("Error streaming video", 500);
  }
});
