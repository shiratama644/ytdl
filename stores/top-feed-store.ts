"use client";

import { create } from "zustand";
import type { VideoCard } from "@/lib/types";

type TopFeedState = {
  videos: VideoCard[];
  loading: boolean;
  error: string | null;
  fetchTopVideos: () => Promise<void>;
};

export const useTopFeedStore = create<TopFeedState>((set) => ({
  videos: [],
  loading: true,
  error: null,
  fetchTopVideos: async () => {
    try {
      set({ loading: true, error: null });
      const response = await fetch("/api/top");
      const json = (await response.json()) as { videos?: VideoCard[]; error?: string };
      if (!response.ok) throw new Error(json.error ?? "Failed to load top videos");
      set({ videos: json.videos ?? [], loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load top videos",
      });
    }
  },
}));
