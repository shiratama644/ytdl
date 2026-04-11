import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getSegmentPath } from "@/lib/hls";
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

  try {
    const segmentPath = getSegmentPath(videoId, query.data.quality, query.data.file);
    const content = await readFile(segmentPath);
    return new Response(content, {
      headers: {
        "content-type": detectContentType(query.data.file),
        "cache-control": "public, max-age=300",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
