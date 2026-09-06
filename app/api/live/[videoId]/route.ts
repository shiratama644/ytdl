import { NextRequest } from 'next/server';
import { getInnertube } from '@/lib/innertube';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const videoIdSchema = z.string().regex(/^[A-Za-z0-9_-]{6,20}$/);

const HLS_CONTENT_TYPE = 'application/vnd.apple.mpegurl';

/**
 * HLS マニフェストを取得し、内部のすべての URL を `/api/proxy` 経由に書き換える。
 *
 * - マスタープレイリスト（#EXT-X-STREAM-INF を持つ）のバリアントは本ルートを再帰参照する。
 * - メディアプレイリストのセグメント（.ts / .m4s 等）は `/api/proxy` へ。
 * - 必要に応じて `?url=<m3u8>` で任意のマニフェストを取り直せる（SSRF 対策済み）。
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;
  if (!videoIdSchema.safeParse(videoId).success) {
    return new Response('invalid video id', { status: 400 });
  }

  const directUrl = req.nextUrl.searchParams.get('url');
  const reqBase = req.nextUrl.origin;

  try {
    let manifestUrl: string;
    if (directUrl) {
      const parsed = new URL(directUrl);
      if (!isAllowed(parsed)) return new Response('Forbidden host', { status: 403 });
      manifestUrl = parsed.toString();
    } else {
      const yt = await getInnertube();
      const info = await yt.getInfo(videoId);
      const hls = info.streaming_data?.hls_manifest_url;
      if (!hls) return new Response('HLS manifest not available', { status: 404 });
      manifestUrl = hls;
    }

    const res = await fetch(manifestUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      return new Response(`manifest fetch failed: ${res.status}`, { status: 502 });
    }
    const text = await res.text();
    const rewritten = rewriteManifest(text, manifestUrl, reqBase, videoId);

    return new Response(rewritten, {
      status: 200,
      headers: {
        'Content-Type': HLS_CONTENT_TYPE,
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

const HOST_SUFFIXES = ['.googlevideo.com', '.googleapis.com', '.youtube.com', '.googleusercontent.com', '.ytimg.com', '.ggpht.com'];

function isAllowed(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return HOST_SUFFIXES.some((s) => host === s.slice(1) || host.endsWith(s));
}

function rewriteUri(uri: string, base: string, reqBase: string, videoId: string): string {
  let abs: URL;
  try {
    abs = new URL(uri, base);
  } catch {
    return uri;
  }
  if (!isAllowed(abs)) return uri;

  const isPlaylist = /\.m3u8(\?.*)?$/i.test(abs.pathname) || abs.pathname.endsWith('.m3u8');
  if (isPlaylist) {
    const proxied = new URL(`/api/live/${encodeURIComponent(videoId)}`, reqBase);
    proxied.searchParams.set('url', abs.toString());
    return proxied.toString();
  }
  const proxied = new URL('/api/proxy', reqBase);
  proxied.searchParams.set('url', abs.toString());
  return proxied.toString();
}

/**
 * テキストベースで HLS マニフェストを書き換える。
 * `#` コメント内の URI 属性（URI="...", #EXT-X-KEY, #EXT-X-MEDIA）と
 * バリアント/セグメント行それぞれを対象にする。
 */
function rewriteManifest(text: string, base: string, reqBase: string, videoId: string): string {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith('#')) {
        // URI="..." 属性
        if (/URI="/.test(trimmed)) {
          return trimmed.replace(
            /URI="([^"]+)"/g,
            (_m, uri: string) => `URI="${rewriteUri(uri, base, reqBase, videoId)}"`,
          );
        }
        return line;
      }
      // セグメント or バリアント行（素の URL）
      const asUrl = trimmed.startsWith('http') ? trimmed : base;
      return rewriteUri(trimmed, asUrl, reqBase, videoId);
    })
    .join('\n');
}
