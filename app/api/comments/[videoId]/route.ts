import { type NextRequest, NextResponse } from 'next/server';
import { getInnertube } from '@/lib/innertube';
import { serializeComments } from '@/lib/serialize';
import { continuationCache } from '@/lib/continuation-cache';
import { z } from 'zod';
import type { CommentsResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

const videoIdSchema = z.string().regex(/^[A-Za-z0-9_-]{6,20}$/);
const sortSchema = z.enum(['TOP_COMMENTS', 'NEWEST_FIRST']);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;
  if (!videoIdSchema.safeParse(videoId).success) {
    return NextResponse.json({ error: 'invalid video id' }, { status: 400 });
  }

  const sortRaw = req.nextUrl.searchParams.get('sort') ?? 'TOP_COMMENTS';
  const sort: 'TOP_COMMENTS' | 'NEWEST_FIRST' =
    sortSchema.safeParse(sortRaw).success ? (sortRaw as 'TOP_COMMENTS' | 'NEWEST_FIRST') : 'TOP_COMMENTS';
  const continuation = req.nextUrl.searchParams.get('continuation');
  const changeSort = req.nextUrl.searchParams.get('changeSort') === '1';

  try {
    const yt = await getInnertube();

    let comments: Awaited<ReturnType<typeof yt.getComments>>;
    let nextToken: string | undefined;

    if (continuation && !changeSort) {
      const cached = continuationCache.get<Awaited<ReturnType<typeof yt.getComments>>>(continuation);
      if (!cached) {
        return NextResponse.json({ error: 'continuation expired', expired: true }, { status: 410 });
      }
      comments = await cached.getContinuation();
    } else {
      comments = await yt.getComments(videoId, sort);
    }

    const hasContinuation = (comments as unknown as { has_continuation?: boolean }).has_continuation;

    const serialized = serializeComments((comments as unknown as { contents?: any[] }).contents ?? []);
    const total = (
      comments as unknown as { header?: { formatted_title?: any; title?: any } }
    ).header?.formatted_title?.text;

    if (hasContinuation) {
      nextToken = continuationCache.create(comments);
    }

    const payload: CommentsResponse = {
      videoId,
      totalComments: total,
      sortBy: sort,
      comments: serialized,
      continuation: nextToken,
    };
    return NextResponse.json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
