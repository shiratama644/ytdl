import { NextResponse } from "next/server";
import { getAvailableHlsVariants, getRewrittenMediaPlaylist, isSupportedHlsQuality } from "@/lib/hls";
import { hlsMediaQuerySchema } from "@/lib/schemas";
import { parseVideoId } from "@/lib/youtube";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = hlsMediaQuerySchema.safeParse(
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
    const variants = await getAvailableHlsVariants(videoId);
    if (!variants.some((variant) => variant.quality === query.data.quality)) {
      return NextResponse.json({ error: "quality not available for this video" }, { status: 404 });
    }

    const origin = new URL(request.url).origin;
    const body = await getRewrittenMediaPlaylist(videoId, query.data.quality, origin);
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
