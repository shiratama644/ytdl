import { AlertCircle, Grid, LayoutList, Loader2, RefreshCw, Search } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
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

  const executeSearch = useCallback(() => {
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
          if (items.length === 0) {
            setError(
              `「${query}」に一致する動画が見つかりませんでした。別のキーワードでお試しください。`,
            );
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Search error:", err);
          setError("検索中にエラーが発生しました。YouTube側のアクセス制限の可能性があります。");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [query]);

  useEffect(() => {
    const cleanup = executeSearch();
    return cleanup;
  }, [executeSearch]);

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
            {loading ? "検索中..." : `${results.length} 件の動画`}
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

      {/* エラー / 結果なし */}
      {error && !loading && (
        <div className="bg-zinc-900/90 border border-zinc-700/60 rounded-2xl p-6 text-center max-w-lg mx-auto my-8">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-zinc-300 font-medium text-sm mb-4 leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={executeSearch}
            className="inline-flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-500 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>再試行</span>
          </button>
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
    </div>
  );
};
