import { Clock, Play, Trash2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { dbService, type HistoryItem } from "../db";

interface HistoryPageProps {
  onVideoClick: (videoId: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onVideoClick }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    dbService.getHistory().then((items) => {
      if (isMounted) {
        setHistory(items);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDeleteItem = async (e: React.MouseEvent, id?: number) => {
    e.stopPropagation();
    if (id !== undefined) {
      await dbService.deleteHistoryItem(id);
      setHistory(history.filter((h) => h.id !== id));
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("視聴履歴をすべて削除しますか？")) {
      await dbService.clearHistory();
      setHistory([]);
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-red-500" />
          <h1 className="text-lg sm:text-xl font-bold text-zinc-100">視聴履歴 (IndexedDB)</h1>
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/50 border border-red-800/40 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>履歴を全消去</span>
          </button>
        )}
      </div>

      {loading && (
        <div className="text-center py-20 text-zinc-500 text-sm">履歴を読み込み中...</div>
      )}

      {!loading && history.length === 0 && (
        <div className="text-center py-24 bg-zinc-900/30 rounded-2xl border border-zinc-800/60 p-6">
          <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-300 font-medium">視聴履歴はありません</p>
          <p className="text-zinc-500 text-xs mt-1">
            動画を視聴すると、ブラウザの IndexedDB に自動で保存されます。
          </p>
        </div>
      )}

      {!loading && history.length > 0 && (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 p-2.5 rounded-xl hover:bg-[#1f1f1f] bg-zinc-900/40 border border-zinc-800/50 transition-all group"
            >
              <button
                type="button"
                onClick={() => onVideoClick(item.videoId)}
                className="flex items-center gap-3 sm:gap-4 min-w-0 text-left flex-1 focus:outline-none"
              >
                <div className="relative aspect-video w-32 sm:w-44 shrink-0 bg-zinc-900 rounded-lg overflow-hidden">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  {item.duration && (
                    <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-medium px-1 py-0.5 rounded">
                      {item.duration}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-100 line-clamp-2 leading-snug group-hover:text-white mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate">{item.authorName}</p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    視聴: {formatDate(item.watchedAt)}
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onVideoClick(item.videoId)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  title="再生"
                >
                  <Play className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteItem(e, item.id)}
                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                  title="履歴から削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
