import type {
  SearchResponse,
  SuggestionResponse,
  VideoDetail,
  VideoItem,
} from "../../shared/types";

const API_BASE = "/api";

export const api = {
  async getTrending(): Promise<VideoItem[]> {
    const res = await fetch(`${API_BASE}/trending`);
    if (!res.ok) {
      throw new Error(`Failed to fetch trending videos: ${res.statusText}`);
    }
    const data = (await res.json()) as { results: VideoItem[] };
    return data.results || [];
  },

  async search(query: string): Promise<VideoItem[]> {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) {
      throw new Error(`Failed to search videos: ${res.statusText}`);
    }
    const data = (await res.json()) as SearchResponse;
    return data.results || [];
  },

  async getSuggestions(query: string): Promise<string[]> {
    if (!query.trim()) return [];
    try {
      const res = await fetch(`${API_BASE}/suggest?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      const data = (await res.json()) as SuggestionResponse;
      return data.suggestions || [];
    } catch {
      return [];
    }
  },

  async getVideoDetail(videoId: string): Promise<VideoDetail> {
    const res = await fetch(`${API_BASE}/video/${encodeURIComponent(videoId)}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch video detail: ${res.statusText}`);
    }
    return (await res.json()) as VideoDetail;
  },

  getStreamUrl(
    videoId: string,
    options?: {
      itag?: number;
      quality?: string;
      type?: "video" | "audio" | "videoandaudio";
      download?: boolean;
    },
  ): string {
    const params = new URLSearchParams();
    if (options?.itag) params.set("itag", options.itag.toString());
    if (options?.quality) params.set("quality", options.quality);
    if (options?.type) params.set("type", options.type);
    if (options?.download) params.set("download", "true");

    const qs = params.toString();
    return `${API_BASE}/stream/${encodeURIComponent(videoId)}${qs ? `?${qs}` : ""}`;
  },
};
