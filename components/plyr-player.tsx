"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Hls, { type Level } from "hls.js";
import Plyr from "plyr";
import "plyr/dist/plyr.css";

type Props = {
  videoId: string;
  title: string;
  hlsManifestUrl: string;
  streamUrl: string;
};

const controls: Plyr.Options["controls"] = [
  "play-large",
  "play",
  "progress",
  "current-time",
  "mute",
  "volume",
  "settings",
  "pip",
  "fullscreen",
];

function normalizeQualityOptions(levels: Level[]) {
  const uniqueHeights = Array.from(
    new Set(
      levels
        .map((level) => level.height)
        .filter((height): height is number => typeof height === "number" && height > 0),
    ),
  ).sort((a, b) => b - a);

  return [0, ...uniqueHeights];
}

export function PlyrPlayer({ videoId, title, hlsManifestUrl, streamUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<Plyr | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const hlsSourceUrl = useMemo(() => {
    const url = new URL(hlsManifestUrl, "http://localhost");
    url.searchParams.set("r", `${videoId}-${retryToken}`);
    return `${url.pathname}${url.search}`;
  }, [hlsManifestUrl, retryToken, videoId]);
  const streamSourceUrl = useMemo(() => {
    const url = new URL(streamUrl, "http://localhost");
    url.searchParams.set("r", `${videoId}-${retryToken}`);
    return `${url.pathname}${url.search}`;
  }, [retryToken, streamUrl, videoId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let removeNativeHlsErrorHandler = () => {};

    const onLoadStart = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);
    const onError = () => {
      setIsLoading(false);
      setErrorMessage("再生に失敗しました。しばらくしてから再試行してください。");
    };

    video.addEventListener("loadstart", onLoadStart);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", onError);

    const setupProgressivePlayer = () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      playerRef.current?.destroy();
      playerRef.current = null;
      setErrorMessage(null);
      setIsLoading(true);
      video.src = streamSourceUrl;
      playerRef.current = new Plyr(video, { controls, settings: ["speed", "loop"] });
    };

    const teardown = () => {
      removeNativeHlsErrorHandler();
      hlsRef.current?.destroy();
      hlsRef.current = null;
      playerRef.current?.destroy();
      playerRef.current = null;
      video.removeAttribute("src");
      video.load();
      video.removeEventListener("loadstart", onLoadStart);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", onError);
    };

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
      });
      hlsRef.current = hls;
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        setIsLoading(true);
        setErrorMessage(null);
        hls.loadSource(hlsSourceUrl);
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const qualityOptions = normalizeQualityOptions(hls.levels);
        playerRef.current?.destroy();
        playerRef.current = new Plyr(video, {
          controls,
          settings: ["quality", "speed", "loop"],
          quality: {
            default: 0,
            options: qualityOptions,
            forced: true,
            onChange: (value) => {
              const selected = Number(value);
              if (selected === 0) {
                hls.currentLevel = -1;
                return;
              }
              const levelIndex = hls.levels.findIndex((level) => level.height === selected);
              if (levelIndex >= 0) {
                hls.currentLevel = levelIndex;
              }
            },
          },
          i18n: {
            qualityLabel: {
              0: "Auto",
            },
          },
        });
        setIsLoading(false);
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (data.details?.includes("manifest")) {
            setupProgressivePlayer();
            return;
          }
          hls.startLoad();
          return;
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
          return;
        }

        setIsLoading(false);
        setupProgressivePlayer();
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      const nativeErrorHandler = () => setupProgressivePlayer();
      video.addEventListener("error", nativeErrorHandler, { once: true });
      removeNativeHlsErrorHandler = () => video.removeEventListener("error", nativeErrorHandler);
      video.src = hlsSourceUrl;
      playerRef.current = new Plyr(video, { controls, settings: ["speed", "loop"] });
    } else {
      setupProgressivePlayer();
    }

    return teardown;
  }, [hlsSourceUrl, streamSourceUrl]);

  return (
    <div className="relative aspect-video w-full bg-black">
      <video ref={videoRef} className="h-full w-full" controls playsInline preload="metadata" title={title} />
      {isLoading && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/50 text-sm text-zinc-200">
          Loading stream...
        </div>
      )}
      {errorMessage && (
        <div className="absolute inset-x-3 bottom-3 rounded-lg border border-red-500/50 bg-red-900/70 p-3 text-xs text-red-100">
          <p>{errorMessage}</p>
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setIsLoading(true);
              setRetryToken((token) => token + 1);
            }}
            className="mt-2 rounded bg-red-500 px-2 py-1 font-semibold text-white hover:bg-red-400"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
