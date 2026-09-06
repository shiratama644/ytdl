/**
 * youtubei.js のパーサーが返す各ノードを、クライアントへ渡せる素の JSON（Wire 型）へ
 * シリアライズするユーティリティ群。
 *
 * YouTube はしばしばレンダラー（ノード種別）を差し替えるため、特定のクラスに
 * 強く依存せず「共通フィールドを鴨判定で読む」方針をとっている。型定義は
 * `youtubei.js` のものと乖離し得るが、実行時フィールド名は安定している。
 */
import type {
  FeedItem,
  VideoItem,
  PlaylistItem,
  ThumbnailData,
  ChannelData,
  FormatData,
  CaptionTrackData,
  ChapterData,
  CommentData,
} from './types';

/* ---------------------------------------------------------------------------
 * Text / Thumbnail ヘルパ
 * ------------------------------------------------------------------------- */

export function textToString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  // youtubei.js の Text は .toString() を備える
  if (typeof (value as any).toString === 'function') {
    const s = (value as any).toString();
    return typeof s === 'string' ? s : undefined;
  }
  return undefined;
}

export function thumbnailsFrom(value: unknown): ThumbnailData[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .filter((t: any) => t && typeof t.url === 'string')
      .map((t: any) => ({
        url: t.url,
        width: typeof t.width === 'number' ? t.width : undefined,
        height: typeof t.height === 'number' ? t.height : undefined,
      }));
  }
  return [];
}

export function bestThumbnail(thumbnails: ThumbnailData[]): string | undefined {
  if (!thumbnails.length) return undefined;
  // 幅が大きい順に並べ、一番大きいものを返す（i.ytimg.com の取得しやすい URL）
  const sorted = [...thumbnails].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return sorted[0]?.url;
}

export function countFromString(s?: string): number | undefined {
  if (!s) return undefined;
  const m = s.replace(/,/g, '').match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return undefined;
  let n = parseFloat(m[1]);
  const suffix = (m[2] || '').toUpperCase();
  if (suffix === 'K') n *= 1e3;
  else if (suffix === 'M') n *= 1e6;
  else if (suffix === 'B') n *= 1e9;
  return Math.round(n);
}

export function parseDuration(text?: string): number | undefined {
  if (!text) return undefined;
  const parts = text.trim().split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return undefined;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return undefined;
}

/* ---------------------------------------------------------------------------
 * ノードの共通フィールド取得（鴨判定）
 * ------------------------------------------------------------------------- */

function hasNumberField(node: any, ...keys: string[]): number | undefined {
  for (const k of keys) {
    if (typeof node?.[k] === 'number') return node[k];
    const parsed = parseDuration(textToString(node?.[k]));
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

/** ノードから videoId を推測する。ノード種別によってフィールド名が異なる。 */
export function getId(node: any): string | undefined {
  if (!node) return undefined;
  return (
    node.video_id ??
    node.id ??
    node.entity_id ??
    node.content_id ??
    node.playlist_id ??
    node.videoId ??
    undefined
  );
}

function getThumbnails(node: any): ThumbnailData[] {
  if (!node) return [];
  // 新しい LockupView
  if (node.content_image?.image) return thumbnailsFrom(node.content_image.image);
  if (node.thumbnail && Array.isArray(node.thumbnail)) return thumbnailsFrom(node.thumbnail);
  if (node.thumbnails && Array.isArray(node.thumbnails)) return thumbnailsFrom(node.thumbnails);
  // サムネイルがオブジェクト（ThumbnailView）の場合
  if (node.image && Array.isArray(node.image)) return thumbnailsFrom(node.image);
  return thumbnailsFrom(node.best_thumbnail);
}

function getChannelId(node: any): string | undefined {
  const endpoint = node.endpoint ?? node.on_tap_endpoint;
  const payload = endpoint?.payload;
  if (typeof payload?.browseId === 'string') return payload.browseId;
  if (typeof payload?.channelId === 'string') return payload.channelId;
  if (typeof payload?.forHandle === 'string') return payload.forHandle;
  // 著者（Author）から
  return node.author?.id;
}

function getChannelFromNode(node: any): ChannelData {
  const author = node.author;
  if (author) {
    return {
      id: author.id ?? '',
      name: author.name ?? '',
      avatar: thumbnailsFrom(author.thumbnails ?? author.avatar_thumbnail_url ? [author.avatar_thumbnail_url ? { url: author.avatar_thumbnail_url } : null] : []),
      endpoint: author.url,
      verified: author.is_verified,
    };
  }
  // フォールバック：endpoint から handle / channelId を拾う
  const endpoint = node.endpoint ?? node.on_tap_endpoint;
  const payload = endpoint?.payload;
  const id = getChannelId(node) ?? '';
  return {
    id,
    name: textToString(node.long_byline_text ?? node.short_byline_text ?? node.byline_text) ?? '',
    avatar: [],
    endpoint: endpoint?.metadata?.url,
  };
}

function viewCount(node: any): number | undefined {
  if (typeof node.viewCount === 'number') return node.viewCount;
  if (node.view_count) {
    const n = countFromString(textToString(node.view_count));
    if (n !== undefined) return n;
  }
  if (node.short_view_count) {
    const n = countFromString(textToString(node.short_view_count));
    if (n !== undefined) return n;
  }
  if (node.views) {
    const n = countFromString(textToString(node.views));
    if (n !== undefined) return n;
  }
  return undefined;
}

function viewCountText(node: any): string | undefined {
  return textToString(node.view_count ?? node.short_view_count ?? node.views);
}

function length(node: any): { seconds?: number; text?: string } {
  const text = textToString(node.length_text ?? node.duration);
  return { seconds: parseDuration(text), text };
}

function isLiveNode(node: any): boolean {
  const badges = node.badges ?? [];
  return (
    Array.isArray(badges) &&
    badges.some((b: any) => {
      const label = textToString(b.label ?? b.text) ?? '';
      return /live|生放送|配信中/i.test(label);
    })
  );
}

/* ---------------------------------------------------------------------------
 * Video / Playlist / 汎用ノード
 * ------------------------------------------------------------------------- */

export function serializeVideo(node: any): VideoItem | null {
  const id = getId(node);
  const title = textToString(node.title);
  if (!id || !title) return null;

  const thumbs = getThumbnails(node);
  const channel = getChannelFromNode(node);
  const len = length(node);

  return {
    type: 'video',
    videoId: id,
    title,
    thumbnails: thumbs,
    bestThumbnail: bestThumbnail(thumbs),
    channel,
    published: textToString(node.published ?? node.published_time_text),
    viewCount: viewCount(node),
    viewCountText: viewCountText(node),
    lengthSeconds: len.seconds,
    lengthText: len.text,
    isLive: isLiveNode(node),
    isShort: node.content_type === 'SHORT' || node.is_short === true,
    badges: (node.badges ?? [])
      .map((b: any) => textToString(b.label ?? b.text))
      .filter((x: string | undefined): x is string => !!x),
  };
}

export function serializePlaylist(node: any): PlaylistItem | null {
  const id = getId(node);
  const title = textToString(node.title);
  if (!id || !title) return null;

  const thumbs = getThumbnails(node);
  const countText = textToString(node.video_count ?? node.video_count_short);
  return {
    type: 'playlist',
    playlistId: id,
    title,
    thumbnails: thumbs,
    bestThumbnail: bestThumbnail(thumbs),
    owner: getChannelFromNode(node),
    videoCount: countFromString(countText),
  };
}

/**
 * フィードに登場する任意のノードを共通 FeedItem に変換する。
 * 変換できない場合は null（呼び出し側でフィルタする）。
 */
export function serializeFeedNode(node: any): FeedItem | null {
  if (!node) return null;
  const type = node.type ?? node.content_type;
  const title = textToString(node.title);
  const id = getId(node);

  // マニフェスト上で動画系かプレイリスト系かを判定
  const looksLikePlaylist =
    type === 'PLAYLIST' ||
    type === 'playlist' ||
    type === 'GridPlaylist' ||
    type === 'Playlist' ||
    !!node.video_count;

  if (looksLikePlaylist && !/^UC/.test(id ?? '') && !(/^PL|^UU|^LL|^RD|^OLAK/.test(id ?? ''))) {
    const pl = serializePlaylist(node);
    if (pl && id && /^PL|^PU|^OLAK|^RD|^UU|^LL/.test(id)) return pl;
  }

  if (id && title) {
    const v = serializeVideo(node);
    if (v) return v;
  }
  return null;
}

/** RichGrid / Shelf / ReelShelf 等から items を再帰的に収集する。 */
export function collectFeedItems(root: any): FeedItem[] {
  const out: FeedItem[] = [];
  const visit = (node: any) => {
    if (!node) return;
    // 配列ならそれぞれ巡回
    if (Array.isArray(node)) {
      for (const n of node) visit(n);
      return;
    }
    // コンテナ系
    if (node.contents && Array.isArray(node.contents)) {
      for (const c of node.contents) visit(c);
      // contents を集めたらコンテナ自体は動画判定しない
      const contained = node.contents?.length;
      if (contained) return;
    }
    if (node.items && Array.isArray(node.items)) {
      for (const c of node.items) visit(c);
      return;
    }
    if (node.content && typeof node.content === 'object' && !Array.isArray(node.content)) {
      visit(node.content);
      if (node.content?.type) return;
    }
    const item = serializeFeedNode(node);
    if (item) out.push(item);
  };
  visit(root);
  return out;
}

/* ---------------------------------------------------------------------------
 * ストリームフォーマット解析（itag をハードコードせず動的に列挙）
 * ------------------------------------------------------------------------- */

const CONTAINER_BY_MIME: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/opus': 'opus',
  'video/3gpp': '3gp',
};
const CODEC_BY_MIME: Record<string, string> = {
  avc1: 'avc1',
  avc3: 'avc1',
  vp9: 'vp9',
  vp09: 'vp9',
  av01: 'av01',
  mp4a: 'mp4a',
  opus: 'opus',
  'ac-3': 'ac3',
  'ec-3': 'ec3',
};

export function containerFromMime(mime: string): string {
  const key = mime.split(';')[0];
  return CONTAINER_BY_MIME[key] ?? key.split('/')[1] ?? 'unknown';
}

export function codecFromMime(mime: string): string | undefined {
  const codecPart = mime.split('codecs="')[1]?.split('"')[0] ?? '';
  if (!codecPart) return undefined;
  const first = codecPart.split('.')[0];
  return CODEC_BY_MIME[first] ?? first;
}

export function serializeFormat(f: any): FormatData {
  const mime = f.mime_type ?? '';
  return {
    itag: f.itag,
    mimeType: mime,
    container: containerFromMime(mime),
    codec: codecFromMime(mime),
    width: typeof f.width === 'number' ? f.width : undefined,
    height: typeof f.height === 'number' ? f.height : undefined,
    qualityLabel: f.quality_label ?? f.quality ?? undefined,
    fps: typeof f.fps === 'number' ? f.fps : undefined,
    bitrate: f.bitrate ?? 0,
    contentLength: typeof f.content_length === 'number' ? f.content_length : undefined,
    hasAudio: !!f.has_audio,
    hasVideo: !!f.has_video,
    url: typeof f.url === 'string' ? f.url : undefined,
  };
}

/* ---------------------------------------------------------------------------
 * 動画メタデータ / 字幕 / チャプター
 * ------------------------------------------------------------------------- */

export function serializeCaptions(captions: any): CaptionTrackData[] {
  const tracks = captions?.caption_tracks ?? captions?.captions ?? captions?.caption_track;
  if (!Array.isArray(tracks)) return [];
  return tracks
    .map((t: any) => ({
      languageCode: t.language_code ?? t.languageCode ?? '',
      name: textToString(t.name) ?? '',
      kind: t.kind ?? 'asr',
      url: t.base_url ?? t.url,
    }))
    .filter((c: CaptionTrackData) => c.languageCode || c.url);
}

export function serializeChapters(info: any): ChapterData[] {
  const macro = info?.player_overlays?.decorated_player_bar_renderer?.player_bar?.markers ?? [];
  const chapters = Array.isArray(macro)
    ? macro
        .map((m: any) => ({
          title: textToString(m.marker?.title) ?? '',
          start: Math.round(((m.marker?.start_time_millis ?? m.start_time_millis ?? 0) as number) / 1000),
        }))
        .filter((c: ChapterData) => c.title && c.start !== undefined)
    : [];
  return chapters;
}

/* ---------------------------------------------------------------------------
 * コメント
 * ------------------------------------------------------------------------- */

export function serializeCommentThread(thread: any): CommentData | null {
  const c = thread?.comment ?? thread;
  if (!c) return null;
  const content = textToString(c.content);
  if (!content) return null;
  const author = c.author;
  return {
    commentId: c.comment_id ?? c.commentId ?? '',
    authorName: author?.name ?? '',
    authorAvatar: author?.avatar_thumbnail_url ?? author?.thumbnails?.[0]?.url,
    contentText: content,
    publishedTime: c.published_time ?? c.publishedTime,
    likeCount: countFromString(c.like_count ?? c.like_count_text),
    likeCountText: c.like_count,
    replyCount: c.reply_count ? Number(c.reply_count) || undefined : undefined,
    isPinned: c.is_pinned ?? c.isPinned,
    isOwner: c.author_is_channel_owner ?? c.author_is_channel_owner,
    isChannelOwner: c.author_is_channel_owner,
    isHeart: false,
    isMember: !!c.is_member,
    memberBadge: c.member_badge?.url,
    replies: Array.isArray(thread?.replies)
      ? thread.replies.map((r: any) => serializeCommentThread({ comment: r })).filter(Boolean) as CommentData[]
      : undefined,
  };
}

export function serializeComments(rt: any): CommentData[] {
  return (rt ?? [])
    .map((thread: any) => serializeCommentThread(thread))
    .filter((c: CommentData | null): c is CommentData => !!c);
}
