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

  // 1. メタデータとフォーマット情報の取得（WEB / MWEB）
  let yt = await getInnertube("WEB");
  let info: Record<string, unknown> | null = null;

  try {
    info = (await yt.getInfo(videoId)) as unknown as Record<string, unknown>;
  } catch {
    try {
      yt = await getInnertube("MWEB");
      info = (await yt.getInfo(videoId)) as unknown as Record<string, unknown>;
    } catch {
      try {
        yt = await getInnertube("WEB");
        info = (await yt.getBasicInfo(videoId)) as unknown as Record<string, unknown>;
      } catch (err) {
        console.error(`[Stream] Failed to get info for ${videoId}:`, err);
      }
    }
  }

  if (!info) {
    return c.text("Failed to load video information", 502);
  }

  const streamingData = (info.streaming_data || {}) as Record<string, unknown>;
  const allFormats = [
    ...(Array.isArray(streamingData.formats) ? streamingData.formats : []),
    ...(Array.isArray(streamingData.adaptive_formats) ? streamingData.adaptive_formats : []),
  ];

  // 指定された itag または条件に合うフォーマットを選択
  let selectedFormat: Record<string, unknown> | null = null;

  if (itagQuery) {
    const itagNum = Number.parseInt(itagQuery, 10);
    selectedFormat =
      (allFormats.find(
        (f) => Number((f as unknown as Record<string, unknown>).itag) === itagNum,
      ) as Record<string, unknown>) || null;
  }

  if (!selectedFormat) {
    const formatType: FormatOptions["type"] =
      typeQuery === "videoandaudio" ? "video+audio" : typeQuery;

    try {
      const infoWithMethod = info as unknown as {
        chooseFormat?: (opt: Record<string, unknown>) => unknown;
      };
      if (typeof infoWithMethod.chooseFormat === "function") {
        selectedFormat = infoWithMethod.chooseFormat({
          type: formatType,
          quality: qualityQuery,
          format: "mp4",
        }) as Record<string, unknown>;
      }
    } catch {
      // フォールバック: 最初に見つかったフォーマット
      selectedFormat =
        (allFormats.find((f) => {
          const raw = f as unknown as Record<string, unknown>;
          if (typeQuery === "audio") return Boolean(raw.has_audio && !raw.has_video);
          if (typeQuery === "video") return Boolean(raw.has_video);
          return Boolean(raw.has_video && raw.has_audio);
        }) as Record<string, unknown>) || (allFormats[0] as Record<string, unknown>);
    }
  }

  if (!selectedFormat) {
    return c.text("No suitable format found for video", 404);
  }

  const rawFormat = selectedFormat;
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

  // 2. ストリームの取得
  let stream: ReadableStream<Uint8Array> | null = null;

  try {
    stream = await yt.download(videoId, downloadOptions);
  } catch {
    try {
      const ytMweb = await getInnertube("MWEB");
      stream = await ytMweb.download(videoId, downloadOptions);
    } catch (err) {
      console.error(`[Stream] Download attempt failed for ${videoId}:`, err);
    }
  }

  if (!stream) {
    // 最終手段: format.url があれば直接 fetch して中継
    const directUrl = String(rawFormat.url || "");
    if (directUrl) {
      try {
        const fetchHeaders: HeadersInit = {};
        if (rangeHeader) fetchHeaders.Range = rangeHeader;
        const res = await fetch(directUrl, { headers: fetchHeaders });
        if (res.ok && res.body) {
          const responseHeaders = new Headers(res.headers);
          responseHeaders.set("Access-Control-Allow-Origin", "*");
          return new Response(res.body, {
            status: res.status,
            headers: responseHeaders,
          });
        }
      } catch (fetchErr) {
        console.error(`[Stream] Direct URL proxy failed:`, fetchErr);
      }
    }

    return c.text("Error streaming video", 502);
  }

  const headers: Record<string, string> = {
    "Content-Type": mimeType.split(";")[0],
    "Accept-Ranges": "bytes",
    "Access-Control-Allow-Origin": "*",
  };

  if (isDownload) {
    const basicInfo = (info.basic_info || {}) as Record<string, unknown>;
    const ext = mimeType.includes("audio") ? "mp3" : "mp4";
    const filename = `${String(basicInfo.title || videoId)}.${ext}`.replace(/[^\w\s.-]/gi, "_");
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
});
