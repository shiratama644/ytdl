"use client";

import { useEffect, useRef } from "react";
import Plyr from "plyr";
import "plyr/dist/plyr.css";

type Props = {
  videoId: string;
  title: string;
};

export function PlyrPlayer({ videoId, title }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<Plyr | null>(null);

  useEffect(() => {
    const iframeElement = iframeRef.current;
    if (!iframeElement) return;

    playerRef.current = new Plyr(iframeElement, {
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
        noCookie: true,
      },
    });

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  return (
    <div className="plyr__video-embed aspect-video w-full">
      <iframe
        ref={iframeRef}
        title={title}
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?iv_load_policy=3&playsinline=1`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
