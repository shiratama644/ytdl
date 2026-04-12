import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getSegmentPath, isSupportedHlsQuality } from "@/lib/hls";
import { hlsSegmentQuerySchema } from "@/lib/schemas";
import { parseVideoId } from "@/lib/youtube";

export const runtime = "nodejs";

function detectContentType(file: string) {
  if (file.endsWith(".m4s")) return "video/iso.segment";
  if (file.endsWith(".mp4")) return "video/mp4";
  return "video/mp2t";
}

export async function GET(request: Request) {
  const query = hlsSegmentQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );

  if (!query.success) {
    return NextResponse.json({ error: query.error.issues[0]?.message }, { status: 400 });
  }

  const videoId = parseVideoId(query.data.id);
  if (!videoId) {
    return NextResponse.json({ error: "invalid video id" }, { status: 400 });
  }
  if (!isSupportedHlsQuality(query.data.quality)) {
    return NextResponse.json({ error: "unsupported quality" }, { status: 400 });
  }

  try {
    const segmentPath = getSegmentPath(videoId, query.data.quality, query.data.file);
    const fileInfo = await stat(segmentPath);
    const stream = Readable.toWeb(createReadStream(segmentPath));
    return new Response(stream as BodyInit, {
      headers: {
        "content-type": detectContentType(query.data.file),
        "content-length": String(fileInfo.size),
        "cache-control": "public, max-age=300",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
