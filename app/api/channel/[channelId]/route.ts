import { NextRequest, NextResponse } from 'next/server';
import { getInnertube } from '@/lib/innertube';
import { serializeFeedNode, thumbnailsFrom, textToString } from '@/lib/serialize';
import { continuationCache } from '@/lib/continuation-cache';
import { z } from 'zod';
import type { ChannelResponse, ChannelTab, FeedItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

const channelIdSchema = z.string().regex(/^[@A-Za-z0-9_-]{3,80}$/);
const tabSchema = z.enum(['home', 'videos', 'shorts', 'live', 'playlists', 'community', 'about']);

type ChannelFeedObj = {
  videos?: any[];
  playlists?: any[];
  posts?: any[];
  has_continuation?: boolean;
  getContinuation?: () => Promise<ChannelFeedObj>;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const { channelId } = await params;
  if (!channelIdSchema.safeParse(channelId).success) {
    return NextResponse.json({ error: 'invalid channel id' }, { status: 400 });
  }

  const tabRaw = req.nextUrl.searchParams.get('tab') ?? 'home';
  const tab: ChannelTab = tabSchema.safeParse(tabRaw).success ? (tabRaw as ChannelTab) : 'home';
  const continuation = req.nextUrl.searchParams.get('continuation');

  try {
    const yt = await getInnertube();

    let channel: any;
    let feedObj: ChannelFeedObj | undefined;

    if (continuation) {
      const cached = continuationCache.get<ChannelFeedObj>(continuation);
      if (!cached) {
        return NextResponse.json({ error: 'continuation expired', expired: true }, { status: 410 });
      }
      try {
        feedObj = (await cached.getContinuation?.()) ?? cached;
      } catch {
        feedObj = cached;
      }
      channel = feedObj;
    } else {
      channel = await yt.getChannel(channelId);
      feedObj = (await getTabFeed(channel, tab)) as ChannelFeedObj;
    }

    const header = channel.header ?? {};
    const metadata = channel.metadata ?? {};
    const author = header.author ?? {};
    const avatar =
      thumbnailsFrom(header.avatar ?? author.thumbnails ?? metadata.avatar ?? []);
    const banner = thumbnailsFrom(header.banner ?? header.tv_banner ?? header.mobile_banner ?? []);
    const title = textToString(header.author?.name ?? metadata.title) ?? ''; 

    const tabs = buildTabs(channel);

    const feed: Record<string, FeedItem[]> = {};
    const feedItems: FeedItem[] = serializeChannelFeed(feedObj ?? channel);

    // about タブのメタデータ
    let about: ChannelResponse['about'];
    if (tab === 'about') {
      try {
        const aboutResult: any = await channel.getAbout?.();
        const primary = (aboutResult as any)?.primary_links ?? [];
        about = {
          country: textToString((aboutResult as any)?.country),
          joined: textToString((aboutResult as any)?.joined_date),
          totalViews: textToString((aboutResult as any)?.view_count),
          links: primary.map((l: any) => ({
            title: textToString(l.title) ?? '',
            url: l.endpoint?.metadata?.url ?? '',
          })),
        };
      } catch {
        about = undefined;
      }
    }

    const hasContinuation = !!(feedObj && (feedObj as any).has_continuation);
    feed[tab] = feedItems;

    // 継続トークン（about タブ以外）
    let nextToken: string | undefined;
    if (tab !== 'about' && feedObj && hasContinuation) {
      nextToken = continuationCache.create(feedObj);
    }

    const payload: ChannelResponse = {
      channelId: author.id ?? channelId,
      title,
      description: textToString(metadata.description) ?? '',
      avatar,
      banner,
      subscriberCount: textToString(header.subscribers),
      videoCount: textToString(header.videos_count),
      tabs,
      feed,
      about,
    };
    return NextResponse.json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

function buildTabs(channel: any): ChannelTab[] {
  const has: ChannelTab[] = [];
  if (channel.has_videos || channel.has_home !== undefined) {
    has.push('home');
  }
  if (channel.has_videos) has.push('videos');
  if (channel.has_shorts) has.push('shorts');
  if (channel.has_live_streams) has.push('live');
  if (channel.has_playlists) has.push('playlists');
  if (channel.has_community) has.push('community');
  has.push('about');
  const order: ChannelTab[] = ['home', 'videos', 'shorts', 'live', 'playlists', 'community', 'about'];
  return order.filter((t) => has.includes(t));
}

async function getTabFeed(channel: any, tab: ChannelTab): Promise<unknown> {
  switch (tab) {
    case 'videos':
      return (await channel.getVideos?.()) ?? channel;
    case 'shorts':
      return (await channel.getShorts?.()) ?? channel;
    case 'live':
      return (await channel.getLiveStreams?.()) ?? channel;
    case 'playlists':
      return (await channel.getPlaylists?.()) ?? channel;
    case 'community':
      return (await channel.getCommunity?.()) ?? channel;
    case 'about':
      return channel;
    case 'home':
    default:
      return (await channel.getHome?.()) ?? channel;
  }
}

function serializeChannelFeed(channel: any): FeedItem[] {
  const items: FeedItem[] = [];

  const videos = channel?.videos ?? [];
  if (Array.isArray(videos)) {
    for (const v of videos) {
      const item = serializeFeedNode(v);
      if (item) items.push(item);
    }
  }
  const playlists = channel?.playlists ?? [];
  if (Array.isArray(playlists)) {
    for (const p of playlists) {
      const item = serializeFeedNode(p);
      if (item) items.push(item);
    }
  }
  const posts = channel?.posts ?? [];
  if (Array.isArray(posts)) {
    for (const p of posts) {
      const item = serializeFeedNode(p);
      if (item) items.push(item);
    }
  }
  return items;
}
