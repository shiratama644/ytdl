import { NextResponse } from "next/server";
import { videoQuerySchema } from "@/lib/schemas";
import type { VideoPayload } from "@/lib/types";
import { detectMode, getYoutubeClient, parseVideoId } from "@/lib/youtube";

function toText(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "toString" in value) {
    const rendered = String((value as { toString: () => string }).toString());
    return rendered === "[object Object]" ? fallback : rendered;
  }
  return fallback;
}

export async function GET(request: Request) {
  const query = videoQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );

  if (!query.success) {
    return NextResponse.json({ error: query.error.issues[0]?.message }, { status: 400 });
  }

  const videoId = parseVideoId(query.data.q);
  if (!videoId) {
    return NextResponse.json(
      { error: "YouTube URL か 11 文字の動画IDを入力してください。" },
      { status: 400 },
    );
  }

  try {
    const yt = await getYoutubeClient();
    const info = await yt.getInfo(videoId);
    const basic = info.basic_info;
    const isLive = Boolean(basic.is_live || basic.is_live_content);
    const duration = basic.duration ?? 0;

    const commentsData = await yt.getComments(videoId).catch(() => null);
    const comments =
      commentsData?.contents
        ?.slice(0, 20)
        .map((thread) => thread.comment)
        .filter((comment): comment is NonNullable<typeof comment> => Boolean(comment))
        .map((comment) => ({
          id: comment.comment_id,
          author: toText(comment.author?.name, "unknown"),
          text: toText(comment.content, ""),
          publishedTime: comment.published_time ?? "",
          likeCount: comment.like_count,
        })) ?? [];

    const payload: VideoPayload = {
      id: videoId,
      title: basic.title ?? "",
      channelName: basic.channel?.name ?? basic.author ?? "",
      channelId: basic.channel?.id ?? basic.channel_id ?? "",
      description: basic.short_description ?? "",
      viewCount: basic.view_count ?? 0,
      likeCount: basic.like_count ?? 0,
      duration,
      isLive,
      mode: detectMode(query.data.q, isLive, duration),
      thumbnail: basic.thumbnail?.at(-1)?.url ?? "",
      embedUrl: basic.embed?.iframe_url ?? `https://www.youtube.com/embed/${videoId}`,
      streamUrl: `/api/stream?id=${videoId}`,
      comments,
      hasLiveChat: isLive && Boolean(info.livechat),
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
