import type { NextRequest } from 'next/server';
import { getInnertube } from '@/lib/innertube';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const videoIdSchema = z.string().regex(/^[A-Za-z0-9_-]{6,20}$/);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;
  if (!videoIdSchema.safeParse(videoId).success) {
    return new Response('invalid video id', { status: 400 });
  }

  try {
    const yt = await getInnertube();
    const info = await yt.getInfo(videoId);

    const manifest = await info.toDash({
      url_transformer: (url) => {
        const proxied = new URL('/api/proxy', req.url);
        proxied.searchParams.set('url', url.toString());
        return proxied;
      },
      manifest_options: {
        captions_format: 'vtt',
      },
    });

    return new Response(manifest, {
      status: 200,
      headers: {
        'Content-Type': 'application/dash+xml; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
