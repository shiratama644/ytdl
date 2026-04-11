"use client";

import { useEffect, useRef } from "react";
import Plyr from "plyr";
import "plyr/dist/plyr.css";

type Props = {
  videoId: string;
  title: string;
};

export function PlyrPlayer({ videoId, title }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<Plyr | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    playerRef.current?.destroy();
    playerRef.current = new Plyr(container, {
      controls: [
        "play-large",
        "play",
        "progress",
        "current-time",
        "mute",
        "volume",
        "captions",
        "settings",
        "pip",
        "fullscreen",
      ],
      youtube: {
        rel: 0,
        modestbranding: 1,
        noCookie: true,
      },
    });

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  return (
    <div ref={containerRef} className="plyr__video-embed aspect-video w-full">
      <iframe
        title={title}
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?iv_load_policy=3&modestbranding=1&playsinline=1&rel=0`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
