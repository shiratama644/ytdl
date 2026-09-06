import { Download, Music, RefreshCw, Settings, Video } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { StreamFormat } from "../../shared/types";
import { api } from "../services/api";

interface VideoPlayerProps {
  videoId: string;
  formats?: StreamFormat[];
  title?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoId, formats = [] }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedItag, setSelectedItag] = useState<number | undefined>(undefined);
  const [isAudioOnly, setIsAudioOnly] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 利用可能な画質/フォーマットの整理
  const videoAudioFormats = formats.filter((f) => f.hasVideo && f.hasAudio);

  // 現在のストリーム URL
  const streamUrl = api.getStreamUrl(videoId, {
    itag: selectedItag,
    type: isAudioOnly ? "audio" : selectedItag ? undefined : "videoandaudio",
    quality: isAudioOnly ? undefined : "best",
  });

  const downloadUrl = api.getStreamUrl(videoId, {
    itag: selectedItag,
    type: isAudioOnly ? "audio" : "videoandaudio",
    download: true,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reload video element when stream URL dependencies change
  useEffect(() => {
    setError(null);
    setIsLoading(true);
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [videoId, selectedItag, isAudioOnly]);

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSettings(false);
  };

  const handleFormatChange = (itag: number | undefined) => {
    setSelectedItag(itag);
    setIsAudioOnly(false);
    setShowSettings(false);
  };

  return (
    <div className="flex flex-col bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800">
      {/* プレイヤーエリア */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center group">
        <video
          ref={videoRef}
          src={streamUrl}
          controls
          autoPlay
          playsInline
          onLoadedData={() => setIsLoading(false)}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setError(
              "動画ストリームの読み込みに失敗しました。再試行するか別の画質をお試しください。",
            );
          }}
          className="w-full h-full object-contain"
        >
          <track kind="captions" />
        </video>

        {/* ローディングスピナー */}
        {isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center z-20">
            <p className="text-sm sm:text-base text-red-400 font-medium mb-3">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setIsLoading(true);
                if (videoRef.current) videoRef.current.load();
              }}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs sm:text-sm px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>ストリームを再読み込み</span>
            </button>
          </div>
        )}
      </div>

      {/* プレイヤー下部コントロールバー */}
      <div className="bg-[#141414] px-4 py-2.5 flex items-center justify-between border-t border-zinc-800 text-xs sm:text-sm">
        {/* 左側: モード切替 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsAudioOnly(false);
              setSelectedItag(undefined);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              !isAudioOnly
                ? "bg-red-600/20 text-red-400 border border-red-600/30"
                : "text-zinc-400 hover:text-white bg-zinc-800/60"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>動画モード</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAudioOnly(true);
              setSelectedItag(undefined);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              isAudioOnly
                ? "bg-purple-600/20 text-purple-400 border border-purple-600/30"
                : "text-zinc-400 hover:text-white bg-zinc-800/60"
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>音声のみ (軽量)</span>
          </button>
        </div>

        {/* 右側: 設定 & ダウンロード */}
        <div className="relative flex items-center gap-2">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white px-3 py-1.5 rounded-lg transition-colors text-xs font-medium"
            title="プロキシ経由でダウンロード"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ダウンロード</span>
          </a>

          {/* 設定メニューボタン */}
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            title="設定"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* 設定ポップオーバー */}
          {showSettings && (
            <div className="absolute right-0 bottom-full mb-2 w-64 bg-[#1f1f1f] border border-zinc-700 rounded-xl shadow-2xl p-3 z-30 text-xs">
              <div className="font-semibold text-zinc-200 pb-2 border-b border-zinc-700 mb-2">
                再生設定
              </div>

              {/* 再生速度 */}
              <div className="mb-3">
                <p className="text-zinc-400 mb-1.5 font-medium">再生速度:</p>
                <div className="grid grid-cols-4 gap-1">
                  {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSpeedChange(s)}
                      className={`py-1 rounded text-center transition-colors ${
                        playbackSpeed === s
                          ? "bg-red-600 text-white font-bold"
                          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* 画質選択 */}
              {!isAudioOnly && formats.length > 0 && (
                <div>
                  <p className="text-zinc-400 mb-1.5 font-medium">画質 / フォーマット:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    <button
                      type="button"
                      onClick={() => handleFormatChange(undefined)}
                      className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                        selectedItag === undefined
                          ? "bg-red-600/20 text-red-400 font-bold"
                          : "hover:bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      自動 (最適フォーマット)
                    </button>
                    {videoAudioFormats.map((f) => (
                      <button
                        key={f.itag}
                        type="button"
                        onClick={() => handleFormatChange(f.itag)}
                        className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between transition-colors ${
                          selectedItag === f.itag
                            ? "bg-red-600/20 text-red-400 font-bold"
                            : "hover:bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        <span>{f.qualityLabel || f.quality || "標準"}</span>
                        <span className="text-[10px] text-zinc-500">{f.container}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
