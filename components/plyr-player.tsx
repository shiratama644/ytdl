"use client";

import { useEffect, useRef } from "react";
import Plyr from "plyr";
import "plyr/dist/plyr.css";

type Props = {
  videoId: string;
  title: string;
};

export function PlyrPlayer({ videoId, title }: Props) {
  const playerElementRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<Plyr | null>(null);

  useEffect(() => {
    const playerElement = playerElementRef.current;
    if (!playerElement) return;

    playerRef.current = new Plyr(playerElement, {
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
    <div
      ref={playerElementRef}
      className="aspect-video w-full"
      data-plyr-provider="youtube"
      data-plyr-embed-id={videoId}
      aria-label={title}
    />
  );
}
