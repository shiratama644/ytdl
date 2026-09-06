import { AlertCircle, Flame, Loader2, RefreshCw, Sparkles } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import type { VideoItem } from "../../shared/types";
import { VideoCard } from "../components/VideoCard";
import { api } from "../services/api";

interface HomePageProps {
  onVideoClick: (videoId: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onVideoClick }) => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    api
      .getTrending()
      .then((items) => {
        if (isMounted) {
          setVideos(items);
          setLoading(false);
          if (items.length === 0) {
            setError(
              "YouTube からの動画取得が一時的に制限されているか、動画が見つかりませんでした。上の検索バーからキーワード検索をお試しください。",
            );
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Error loading home videos:", err);
          setError(
            "動画一覧の取得に失敗しました。YouTube側のアクセス制限またはネットワークエラーの可能性があります。",
          );
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const cleanup = fetchVideos();
    return cleanup;
  }, [fetchVideos]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* ヒーローヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-red-500" />
          <h1 className="text-lg sm:text-xl font-bold text-zinc-100">おすすめ・トレンド</h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-800/60 px-3 py-1 rounded-full border border-zinc-700/50">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>YouTube Proxy 高速再生</span>
        </div>
      </div>

      {/* ローディング */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          <p className="text-sm text-zinc-400">おすすめ動画を取得中...</p>
        </div>
      )}

      {/* エラー / 制限通知 */}
      {error && !loading && (
        <div className="bg-zinc-900/90 border border-zinc-700/60 rounded-2xl p-6 text-center max-w-lg mx-auto my-8 shadow-xl">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-zinc-300 font-medium text-sm mb-4 leading-relaxed">{error}</p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={fetchVideos}
              className="inline-flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-500 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>再試行</span>
            </button>
          </div>
        </div>
      )}

      {/* 動画グリッド */}
      {!loading && !error && videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} onClick={onVideoClick} layout="grid" />
          ))}
        </div>
      )}
    </div>
  );
};
