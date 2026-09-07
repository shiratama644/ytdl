import { type NextRequest, NextResponse } from 'next/server';

/**
 * 汎用バイナリプロキシ（Range 対応）。
 * YouTube の実ストリーム（googlevideo.com 等）は発行元 IP と紐付きがあり、
 * ブラウザから直接取得できない（CORS 制限）。この Route Handler を経由して
 * 映像・音声・マニフェストを配信する。
 *
 * ## SSRF 対策
 * 任意 URL を許可すると SSRF になるため、許可ドメインのサフィックスだけに制限する。
 */

const ALLOW_HOST_SUFFIXES = [
  '.googlevideo.com',
  '.googleusercontent.com',
  '.googleapis.com',
  '.ytimg.com',
  '.ggpht.com',
  '.youtube.com',
  '.youtube-nocookie.com',
];

const HOP_BY_HOP = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
];

function isAllowed(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return ALLOW_HOST_SUFFIXES.some((suffix) => host === suffix.slice(1) || host.endsWith(suffix));
}

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url');
  if (!target) return new NextResponse('Missing url', { status: 400 });

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  if (!isAllowed(url)) {
    return new NextResponse('Forbidden host', { status: 403 });
  }

  const range = req.headers.get('range');
  const upstream = await fetch(url.toString(), {
    headers: {
      ...(range ? { Range: range } : {}),
      // YouTube 側は UA を要求する
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    },
    cache: 'no-store',
  });

  const upstreamHeaders = upstream.headers;
  const headers = new Headers();
  for (const [key, value] of upstreamHeaders.entries()) {
    if (HOP_BY_HOP.includes(key.toLowerCase())) continue;
    headers.set(key, value);
  }
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Headers', 'Range, Content-Type');
  headers.set('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
