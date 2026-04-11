"use client";

import { create } from "zustand";
import type { LiveChatMessage, VideoPayload } from "@/lib/types";

type PlayerState = {
  query: string;
  video: VideoPayload | null;
  messages: LiveChatMessage[];
  loadingVideo: boolean;
  loadingChat: boolean;
  error: string | null;
  setQuery: (query: string) => void;
  fetchVideo: (query: string) => Promise<void>;
  fetchLiveChat: () => Promise<void>;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  query: "",
  video: null,
  messages: [],
  loadingVideo: false,
  loadingChat: false,
  error: null,
  setQuery: (query) => set({ query }),
  fetchVideo: async (query) => {
    const target = query.trim();
    if (!target) return;

    set({ loadingVideo: true, error: null });

    try {
      const response = await fetch(`/api/video?q=${encodeURIComponent(target)}`);
      const json = (await response.json()) as VideoPayload | { error: string };
      if (!response.ok) throw new Error("error" in json ? json.error : "Failed to load video");

      set({
        query: target,
        video: json as VideoPayload,
        messages: [],
      });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "動画の取得に失敗しました。入力を確認してください。",
      });
    } finally {
      set({ loadingVideo: false });
    }
  },
  fetchLiveChat: async () => {
    const { video } = get();
    if (!video?.hasLiveChat) return;

    set({ loadingChat: true });

    try {
      const response = await fetch(`/api/live-chat?id=${encodeURIComponent(video.id)}`);
      const json = (await response.json()) as { messages?: LiveChatMessage[]; error?: string };
      if (!response.ok) throw new Error(json.error ?? "Failed to load chat");
      set({ messages: json.messages ?? [] });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "ライブチャットの取得に失敗しました。" });
    } finally {
      set({ loadingChat: false });
    }
  },
}));
