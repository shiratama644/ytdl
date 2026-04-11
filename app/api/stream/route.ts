import { NextResponse } from "next/server";
import { z } from "zod";
import { getStreamUrl } from "@/lib/data";
import { parseVideoId } from "@/lib/youtube";

const streamQuerySchema = z.object({
  id: z.string().trim().min(1, "id is required"),
  quality: z.string().trim().optional(),
});

const passthroughHeaders = [
  "accept-ranges",
  "cache-control",
  "content-length",
  "content-range",
  "content-type",
  "date",
  "expires",
];

export async function GET(request: Request) {
  const query = streamQuerySchema.safeParse(
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
    const sourceUrl = await getStreamUrl(videoId, query.data.quality ?? "best");

    if (!sourceUrl) {
      return NextResponse.json({ error: "stream URL not found" }, { status: 404 });
    }

    const headers = new Headers();
    const range = request.headers.get("range");
    if (range) headers.set("range", range);

    const upstream = await fetch(sourceUrl, { headers });
    const responseHeaders = new Headers();
    for (const key of passthroughHeaders) {
      const value = upstream.headers.get(key);
      if (value) responseHeaders.set(key, value);
    }
    responseHeaders.set("X-Proxied-By", "ytdl-nextjs-proxy");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
