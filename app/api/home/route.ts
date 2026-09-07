import { type NextRequest, NextResponse } from 'next/server';
import { getInnertube } from '@/lib/innertube';
import { serializeFeedNode, collectFeedItems } from '@/lib/serialize';
import { continuationCache } from '@/lib/continuation-cache';
import { z } from 'zod';
import type { FeedItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

const filterSchema = z.string().optional();

export async function GET(req: NextRequest) {
  const continuation = req.nextUrl.searchParams.get('continuation');
  const filter = filterSchema.parse(req.nextUrl.searchParams.get('filter') ?? undefined);

  try {
    const yt = await getInnertube();

    let home: any;
    if (continuation) {
      const cached = continuationCache.get<Awaited<ReturnType<typeof yt.getHomeFeed>>>(continuation);
      if (!cached) {
        return NextResponse.json({ error: 'continuation expired', expired: true }, { status: 410 });
      }
      home = await cached.getContinuation();
    } else {
      home = await yt.getHomeFeed();
      if (filter && home.applyFilter) {
        try {
          home = await home.applyFilter(filter);
        } catch {
          /* ignore */
        }
      }
    }

    const items: FeedItem[] = [];
    for (const node of (home as unknown as { videos?: any[] }).videos ?? []) {
      const item = serializeFeedNode(node);
      if (item) items.push(item);
    }
    // コンテナ（RichGrid 等）からも収集
    if (items.length === 0) {
      items.push(...collectFeedItems((home as unknown as { contents?: any }).contents));
    }

    const hasContinuation = !!(home as any)?.has_continuation;
    let nextToken: string | undefined;
    if (hasContinuation) {
      nextToken = continuationCache.create(home);
    }

    const refinements = (home as any)?.refinements ?? [];
    return NextResponse.json({ items, refinements, continuation: nextToken });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
