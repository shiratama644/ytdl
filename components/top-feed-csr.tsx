"use client";

import { useEffect } from "react";
import { VideoCard } from "@/components/video-card";
import { useTopFeedStore } from "@/stores/top-feed-store";

export function TopFeedCsr() {
  const { videos, loading, error, fetchTopVideos } = useTopFeedStore();

  useEffect(() => {
    void fetchTopVideos();
  }, [fetchTopVideos]);

  if (loading) return <p className="text-sm text-zinc-400">Loading recommended videos...</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}
