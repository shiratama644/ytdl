/**
 * ytdl — 共有型定義
 * youtubei.js のパーサーはクラスインスタンスを返すため、API 経由でクライアントへ渡す際は
 * Playwright/Node に依存しない素の JSON にシリアライズする。ここではその「ワイヤー型」を定義する。
 */

export interface ThumbnailData {
  url: string;
  width?: number;
  height?: number;
}

export interface ChannelData {
  id: string;
  name: string;
  /** アバター等のサムネイル */
  avatar?: ThumbnailData[];
  /**
   * チャンネルページ URL (`/@handle` や `/channel/...`)。動画カードからの遷移に使う。
   * フロントでは `channel/:id` への正規化を行う。
   */
  endpoint?: string;
  subscriber_count?: string;
  verified?: boolean;
}

export interface VideoItem {
  /** 種別識別子（レンダリング側での判定用） */
  type: 'video';
  videoId: string;
  title: string;
  thumbnails: ThumbnailData[];
  /** 代表サムネイル */
  bestThumbnail?: string;
  channel: ChannelData;
  published?: string;
  viewCount?: number;
  viewCountText?: string;
  lengthSeconds?: number;
  lengthText?: string;
  isLive?: boolean;
  isUpcoming?: boolean;
  isShort?: boolean;
  badges?: string[];
}

export interface PlaylistItem {
  type: 'playlist';
  playlistId: string;
  title: string;
  thumbnails: ThumbnailData[];
  bestThumbnail?: string;
  owner?: ChannelData;
  videoCount?: number;
}

export type FeedItem = VideoItem | PlaylistItem;

/**
 * 利用可能なストリーム（フォーマット）をフロントへ提示するための正規化フォーマット。
 */
export interface FormatData {
  itag: number;
  /** `video/audio`。デバイスで再生可能か、ダウンロード時の多重化可否の判定に使う。 */
  mimeType: string;
  /** 映像コンテナ/コーデックの識別用（例: `mp4`, `webm`） */
  container: string;
  /** コーデックの短縮識別子（例: `avc1`, `vp9`, `av01`, `mp4a`, `opus`） */
  codec?: string;
  width?: number;
  height?: number;
  /** 例: `720p` */
  qualityLabel?: string;
  fps?: number;
  bitrate: number;
  contentLength?: number;
  hasAudio: boolean;
  hasVideo: boolean;
  /** ダウンロード用の直URL（署名済み）。視聴には /api/proxy 経由で使う。 */
  url?: string;
}

/** /api/watch のレスポンス */
export interface WatchResponse {
  videoId: string;
  title: string;
  author: string;
  channelId?: string;
  channelAvatar?: ThumbnailData[];
  description?: string;
  descriptionHtml?: string;
  viewCount?: number;
  lengthSeconds?: number;
  published?: string;
  /** 動画のサムネイル（ダイナミックカラーのシード抽出に使用） */
  thumbnail?: ThumbnailData[];
  publishDate?: string;
  likeCount?: number;
  tags?: string[];
  isLive: boolean;
  isUpcoming: boolean;
  /** 映像・音声で使えるダウンロード元（Direct 形式） */
  progressive: FormatData[];
  /** DASH（映像/音声分離）形式 */
  adaptive: FormatData[];
  /** 字幕トラック */
  captions?: CaptionTrackData[];
  /** チャプター */
  chapters?: ChapterData[];
  /** 関連動画 */
  related?: FeedItem[];
}

export interface CaptionTrackData {
  languageCode: string;
  name: string;
  kind?: string;
  url?: string;
}

export interface ChapterData {
  title: string;
  /** 開始秒 */
  start: number;
  /** デフォルトサムネイル（章ごと） */
  thumbnails?: ThumbnailData[];
}

/** youtubei.js の検索フィルタ（API リクエスト間で受け取る形） */
export interface SearchFilters {
  upload_date?: 'all' | 'today' | 'week' | 'month' | 'year';
  type?: 'all' | 'video' | 'shorts' | 'channel' | 'playlist' | 'movie';
  duration?: 'all' | 'over_twenty_mins' | 'under_three_mins' | 'three_to_twenty_mins';
  prioritize?: 'relevance' | 'popularity';
  features?: (
    | 'hd'
    | 'subtitles'
    | 'creative_commons'
    | '3d'
    | 'live'
    | 'purchased'
    | '4k'
    | '360'
    | 'location'
    | 'hdr'
    | 'vr180'
  )[];
}

/** 検索結果のレスポンス */
export interface SearchResponse {
  query: string;
  estimatedResults?: number;
  refinements?: string[];
  items: FeedItem[];
  continuation?: string;
}

/** コメントのレスポンス（続きの `continuation` トークン付き） */
export interface CommentData {
  commentId: string;
  authorName: string;
  authorAvatar?: string;
  contentText: string;
  contentHtml?: string;
  publishedTime?: string;
  likeCount?: number;
  likeCountText?: string;
  replyCount?: number;
  isPinned?: boolean;
  isOwner?: boolean;
  isChannelOwner?: boolean;
  isHeart?: boolean;
  isMember?: boolean;
  memberBadge?: string;
  replies?: CommentData[];
}

export interface CommentsResponse {
  videoId: string;
  totalComments?: string;
  sortBy: 'TOP_COMMENTS' | 'NEWEST_FIRST';
  comments: CommentData[];
  continuation?: string;
}

/** チャンネルタブ（フィード種別） */
export type ChannelTab = 'home' | 'videos' | 'shorts' | 'live' | 'playlists' | 'community' | 'about';

export interface ChannelResponse {
  channelId: string;
  title: string;
  description?: string;
  avatar?: ThumbnailData[];
  banner?: ThumbnailData[];
  subscriberCount?: string;
  videoCount?: string;
  tabs: ChannelTab[];
  /** タブごとのフィードアイテム。`tab` に対応する結果を `tab` キーで格納 */
  feed: Record<string, FeedItem[]>;
  /** 概要（about）タブのメタデータ */
  about?: {
    country?: string;
    joined?: string;
    totalViews?: string;
    links?: { title: string; url: string }[];
  };
}

/**
 * ダウンロードジョブ
 */
export type DownloadStatus =
  | 'queued'
  | 'downloading-video'
  | 'downloading-audio'
  | 'muxing'
  | 'done'
  | 'error'
  | 'cancelled';

export interface DownloadJob {
  id: string;
  videoId: string;
  title: string;
  /** YTDL 形式の選択 */
  videoItag?: number;
  audioItag?: number;
  /** 出力コンテナ。mp4 / webm / mkv / mp3 / m4a / ogg */
  container: string;
  videoOnly: boolean;
  audioOnly: boolean;
  status: DownloadStatus;
  progress: number;
  /** バイト単位の進捗 */
  downloadedBytes: number;
  totalBytes?: number;
  /** 予想残り時間（秒） */
  etaSeconds?: number;
  speedBytesPerSec?: number;
  error?: string;
  /** 完成後の一時ファイル URL。`/api/download/:id/file` で取得 */
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
}
