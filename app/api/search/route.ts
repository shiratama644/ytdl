import { type NextRequest, NextResponse } from 'next/server';
import { getInnertube } from '@/lib/innertube';
import { serializeFeedNode } from '@/lib/serialize';
import { continuationCache } from '@/lib/continuation-cache';
import { z } from 'zod';
import type { SearchResponse, FeedItem, SearchFilters } from '@/lib/types';

export const dynamic = 'force-dynamic';

const searchFiltersSchema = z.object({
  upload_date: z.enum(['all', 'today', 'week', 'month', 'year']).optional(),
  type: z.enum(['all', 'video', 'shorts', 'channel', 'playlist', 'movie']).optional(),
  duration: z.enum(['all', 'over_twenty_mins', 'under_three_mins', 'three_to_twenty_mins']).optional(),
  prioritize: z.enum(['relevance', 'popularity']).optional(),
  features: z.array(z.enum(['hd', 'subtitles', 'creative_commons', '3d', 'live', 'purchased', '4k', '360', 'location', 'hdr', 'vr180'])).optional(),
});

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q || q.trim().length === 0) {
    return NextResponse.json({ error: 'missing query' }, { status: 400 });
  }

  const continuation = req.nextUrl.searchParams.get('continuation');

  // オプションの絞り込みを検証
  const filtersRaw: Record<string, unknown> = {};
  for (const key of ['upload_date', 'type', 'duration', 'prioritize'] as const) {
    const v = req.nextUrl.searchParams.get(key);
    if (v) filtersRaw[key] = v;
  }
  const featuresRaw = req.nextUrl.searchParams.getAll('feature');
  if (featuresRaw.length) filtersRaw.features = featuresRaw;
  const filtersParsed = searchFiltersSchema.safeParse(filtersRaw);
  const filters = (filtersParsed.success ? filtersParsed.data : {}) as SearchFilters;

  try {
    const yt = await getInnertube();

    let search: Awaited<ReturnType<typeof yt.search>>;
    let nextToken: string | undefined;

    if (continuation) {
      const cached = continuationCache.get<Awaited<ReturnType<typeof yt.search>>>(continuation);
      if (!cached) {
        return NextResponse.json({ error: 'continuation expired', expired: true }, { status: 410 });
      }
      search = await cached.getContinuation();
    } else {
      search = await yt.search(q, filters);
    }

    const items: FeedItem[] = [];
    for (const node of (search as unknown as { results?: any[] }).results ?? []) {
      const item = serializeFeedNode(node);
      if (item) items.push(item);
    }

    const hasContinuation = typeof (search as unknown as { has_continuation?: boolean }).has_continuation === 'boolean';
    if (hasContinuation) {
      nextToken = continuationCache.create(search);
    }

    const refinements = (search as unknown as { refinements?: string[] }).refinements ?? [];
    const estimated = (search as unknown as { estimated_results?: number }).estimated_results ?? undefined;

    const payload: SearchResponse = {
      query: q,
      estimatedResults: estimated,
      refinements,
      items,
      continuation: nextToken,
    };
    return NextResponse.json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
