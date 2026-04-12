import { NextResponse } from "next/server";
import { getAvailableHlsVariants } from "@/lib/hls";
import { hlsMasterQuerySchema } from "@/lib/schemas";
import { parseVideoId } from "@/lib/youtube";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = hlsMasterQuerySchema.safeParse(
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
    const variants = await getAvailableHlsVariants(videoId);
    if (variants.length === 0) {
      return NextResponse.json({ error: "no hls-capable variant available" }, { status: 404 });
    }

    const body = [
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      ...variants.map((variant) => {
        const width = Math.round((variant.height * 16) / 9);
        return [
          `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bandwidth},RESOLUTION=${width}x${variant.height}`,
          `/api/hls/media?id=${encodeURIComponent(videoId)}&quality=${encodeURIComponent(variant.quality)}`,
        ].join("\n");
      }),
    ].join("\n");

    return new Response(body, {
      headers: {
        "content-type": "application/vnd.apple.mpegurl; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
