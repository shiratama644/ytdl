'use client';

import { useEffect, useRef, useState } from 'react';
import 'video.js/dist/video-js.css';

export interface PlayerQualityOption {
  label: string;
  height?: number;
}

interface VideoPlayerProps {
  manifestUrl: string;
  isLive?: boolean;
  poster?: string;
  qualityOptions?: PlayerQualityOption[];
  onPlaying?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  initialVolume?: number;
  initialPlaybackRate?: number;
}

/**
 * video.js ラッパー。
 *
 * videojs-contrib-dash は読み込み時に `window` を参照するため、SSR（Node）での
 * モジュール評価が不可能。そのため video.js 本体と DASH プラグインはブラウザの
 * クライアント実行時（useEffect 内）に動的 import する。
 */
export function VideoPlayer({
  manifestUrl,
  isLive = false,
  poster,
  qualityOptions = [],
  onPlaying,
  onEnded,
  onError,
  initialVolume = 1,
  initialPlaybackRate = 1,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [quality, setQuality] = useState<string>('auto');

  useEffect(() => {
    if (!videoRef.current) return;
    let disposed = false;
    let player: any;

    const init = async () => {
      const [{ default: videojs }] = await Promise.all([
        import('video.js'),
        import('videojs-contrib-dash'),
      ]);
      if (disposed) return;

      player = videojs(videoRef.current!, {
        controls: true,
        autoplay: true,
        preload: 'auto',
        fluid: true,
        liveui: isLive,
        poster,
        html5: {
          nativeCaptions: false,
          vhs: { enableLowInitialPlaylist: false },
        },
      });
      playerRef.current = player;

      player.on('ready', () => {
        player.volume(initialVolume);
        player.playbackRate(initialPlaybackRate);
      });
      player.on('playing', () => onPlaying?.());
      player.on('ended', () => onEnded?.());
      player.on('error', () => {
        const err = player.error();
        onError?.(new Error(err?.message ?? '再生エラー'));
      });

      player.src({
        src: manifestUrl,
        type: isLive ? 'application/x-mpegURL' : 'application/dash+xml',
      });
    };

    void init();

    return () => {
      disposed = true;
      playerRef.current = null;
      try {
        player?.dispose();
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifestUrl, isLive]);

  const applyQuality = (label: string) => {
    setQuality(label);
    const player = playerRef.current;
    if (!player) return;
    if (label === 'auto') {
      try {
        const dash = player.tech?.()?.maybeGetPlayer?.();
        if (dash?.setAutoSwitchQuality) dash.setAutoSwitchQuality(true);
      } catch {
        /* noop */
      }
      return;
    }
    try {
      const dash = player.tech?.()?.maybeGetPlayer?.();
      if (!dash) return;
      dash.setAutoSwitchQuality?.(false);
      const videoRels = dash.getBitrateInfoListFor?.('video') ?? [];
      const targetHeight = Number(label.replace(/\D/g, ''));
      const bitrates = videoRels.filter((r: any) => r.height === targetHeight);
      if (bitrates.length) {
        dash.setQualityFor?.('video', videoRels.indexOf(bitrates[0]));
      }
    } catch {
      /* noop */
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-m3-lg bg-surface-dim">
      <video ref={videoRef} className="video-js vjs-big-play-centered" playsInline />
      {qualityOptions.length > 0 && (
        <div className="absolute top-2 right-2 z-20">
          <select
            value={quality}
            onChange={(e) => applyQuality(e.target.value)}
            className="h-8 px-2 rounded-m3-md bg-black/70 text-white text-label-small outline-none"
            aria-label="画質"
          >
            <option value="auto">Auto</option>
            {qualityOptions.map((q) => (
              <option key={q.label} value={q.label}>
                {q.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {isLive && (
        <div className="absolute top-2 left-2 z-20 grid place-items-center">
          <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-m3-full bg-error text-on-error text-label-small font-medium">
            <span className="h-1.5 w-1.5 rounded-m3-full bg-on-error animate-pulse" />
            LIVE
          </span>
        </div>
      )}
    </div>
  );
}
