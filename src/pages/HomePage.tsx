import { Flame, Loader2, Sparkles } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    api
      .getTrending()
      .then((items) => {
        if (isMounted) {
          setVideos(items);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Error loading home videos:", err);
          setError("動画一覧の読み込みに失敗しました。");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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

      {/* エラー */}
      {error && !loading && (
        <div className="bg-red-950/30 border border-red-800/50 rounded-2xl p-6 text-center max-w-lg mx-auto">
          <p className="text-red-400 font-medium text-sm mb-3">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-xs bg-red-600 hover:bg-red-500 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            再読み込み
          </button>
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

      {!loading && !error && videos.length === 0 && (
        <div className="text-center py-20 text-zinc-500 text-sm">
          表示できる動画がありません。上の検索バーから検索してください。
        </div>
      )}
    </div>
  );
};
