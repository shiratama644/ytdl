import { Grid, LayoutList, Loader2, Search } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import type { VideoItem } from "../../shared/types";
import { VideoCard } from "../components/VideoCard";
import { api } from "../services/api";

interface SearchPageProps {
  query: string;
  onVideoClick: (videoId: string) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({ query, onVideoClick }) => {
  const [results, setResults] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState<"list" | "grid">("list");

  useEffect(() => {
    if (!query) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    api
      .search(query)
      .then((items) => {
        if (isMounted) {
          setResults(items);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Search error:", err);
          setError("検索中にエラーが発生しました。");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [query]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* 検索ヘッダー */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-zinc-800">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Search className="w-5 h-5 text-red-500" />
            <span>「{query}」の検索結果</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {loading ? "検索中..." : `${results.length} 件の動画が見つかりました`}
          </p>
        </div>

        {/* 表示切替 */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setLayout("list")}
            className={`p-1.5 rounded transition-colors ${
              layout === "list" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
            title="リスト表示"
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setLayout("grid")}
            className={`p-1.5 rounded transition-colors ${
              layout === "grid" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
            title="グリッド表示"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ローディング */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          <p className="text-sm text-zinc-400">「{query}」を検索中...</p>
        </div>
      )}

      {/* エラー */}
      {error && !loading && (
        <div className="bg-red-950/30 border border-red-800/50 rounded-2xl p-6 text-center max-w-lg mx-auto">
          <p className="text-red-400 font-medium text-sm mb-3">{error}</p>
        </div>
      )}

      {/* 結果一覧 */}
      {!loading && !error && results.length > 0 && (
        <div
          className={
            layout === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              : "space-y-3"
          }
        >
          {results.map((video) => (
            <VideoCard key={video.id} video={video} onClick={onVideoClick} layout={layout} />
          ))}
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <div className="text-center py-20 text-zinc-500 text-sm">
          該当する動画が見つかりませんでした。別のキーワードをお試しください。
        </div>
      )}
    </div>
  );
};
