export interface VideoThumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface VideoAuthor {
  id?: string;
  name: string;
  url?: string;
  thumbnails?: VideoThumbnail[];
}

export interface VideoItem {
  id: string;
  title: string;
  author: VideoAuthor;
  duration?: string;
  durationSeconds?: number;
  views?: string;
  viewCount?: number;
  publishedTime?: string;
  thumbnails: VideoThumbnail[];
  descriptionSnippet?: string;
}

export interface SearchResponse {
  query: string;
  results: VideoItem[];
  estimatedResults?: number;
}

export interface StreamFormat {
  itag: number;
  mimeType: string;
  quality?: string;
  qualityLabel?: string;
  bitrate?: number;
  contentLength?: string;
  width?: number;
  height?: number;
  hasVideo: boolean;
  hasAudio: boolean;
  container: string;
  codecs?: string;
}

export interface VideoDetail {
  id: string;
  title: string;
  description: string;
  author: VideoAuthor;
  durationSeconds: number;
  durationText: string;
  views: string;
  viewCount: number;
  likes?: string;
  publishedDate?: string;
  thumbnails: VideoThumbnail[];
  formats: StreamFormat[];
  relatedVideos: VideoItem[];
}

export interface SuggestionResponse {
  query: string;
  suggestions: string[];
}
