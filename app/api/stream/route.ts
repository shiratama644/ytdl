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
  "etag",
  "last-modified",
];

async function proxyStream(request: Request, method: "GET" | "HEAD", returnBody: boolean) {
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
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch) headers.set("if-none-match", ifNoneMatch);
    const ifModifiedSince = request.headers.get("if-modified-since");
    if (ifModifiedSince) headers.set("if-modified-since", ifModifiedSince);

    const upstream = await fetch(sourceUrl, {
      method,
      headers,
      // Avoid serving stale signed media URLs via framework-level fetch caching.
      cache: "no-store",
    });
    const responseHeaders = new Headers();
    for (const key of passthroughHeaders) {
      const value = upstream.headers.get(key);
      if (value) responseHeaders.set(key, value);
    }
    responseHeaders.set("X-Proxied-By", "ytdl-nextjs-proxy");
    // Respect explicit upstream caching policy when provided.
    if (!responseHeaders.has("cache-control")) {
      responseHeaders.set("cache-control", "no-store");
    }

    return new Response(returnBody ? upstream.body : null, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return proxyStream(request, "GET", true);
}

export async function HEAD(request: Request) {
  return proxyStream(request, "HEAD", false);
}
