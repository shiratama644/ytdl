import { NextRequest, NextResponse } from 'next/server';
import { getInnertube } from '@/lib/innertube';
import {
  serializeFormat,
  serializeCaptions,
  serializeChapters,
  thumbnailsFrom,
  serializeFeedNode,
} from '@/lib/serialize';
import { z } from 'zod';
import type { WatchResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

const videoIdSchema = z.string().regex(/^[A-Za-z0-9_-]{6,20}$/);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;
  if (!videoIdSchema.safeParse(videoId).success) {
    return NextResponse.json({ error: 'invalid video id' }, { status: 400 });
  }

  try {
    const yt = await getInnertube();
    const info: any = await yt.getInfo(videoId);

    const basic = info.basic_info;
    const primary = info.primary_info;
    const secondary = info.secondary_info;

    const channel = basic.channel ?? null;
    const channelAvatar = secondary?.owner?.author?.thumbnails ?? null;

    const chapters = serializeChapters(info);

    const progressive = (info.streaming_data?.formats ?? [])
      .map(serializeFormat)
      .sort((a: any, b: any) => (b.height ?? 0) - (a.height ?? 0));
    const adaptive = (info.streaming_data?.adaptive_formats ?? [])
      .map(serializeFormat)
      .sort((a: any, b: any) => (b.height ?? 0) - (a.height ?? 0) || (b.bitrate ?? 0) - (a.bitrate ?? 0));

    // 関連動画（watch_next_feed）
    const related = (info.watch_next_feed ?? [])
      .map((node: any) => serializeFeedNode(node))
      .filter((x: unknown): x is NonNullable<typeof x> => !!x)
      .map((x: unknown) => x as NonNullable<ReturnType<typeof serializeFeedNode>>);

    const payload: WatchResponse = {
      videoId: basic.id ?? videoId,
      title: basic.title ?? '',
      author: channel?.name ?? basic.author ?? '',
      channelId: channel?.id ?? basic.channel_id,
      channelAvatar: channelAvatar ? thumbnailsFrom(channelAvatar) : [],
      description: basic.short_description ?? '',
      descriptionHtml: primary?.description?.toString() ?? '',
      viewCount: basic.view_count,
      lengthSeconds: basic.duration,
      thumbnail: basic.thumbnail ? thumbnailsFrom(basic.thumbnail) : undefined,
      published: primary?.date?.toString() ?? undefined,
      publishDate: primary?.date?.text ?? undefined,
      likeCount: primary?.like_count_number ?? undefined,
      tags: basic.keywords ?? basic.tags ?? [],
      isLive: !!basic.is_live,
      isUpcoming: !!basic.is_upcoming,
      progressive,
      adaptive,
      captions: serializeCaptions(info.captions),
      chapters,
      related,
    };

    return NextResponse.json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
