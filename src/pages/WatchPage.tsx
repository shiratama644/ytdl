import { ChevronDown, ChevronUp, Eye, Heart, Loader2, Share2, User } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import type { VideoDetail } from "../../shared/types";
import { RelatedVideos } from "../components/RelatedVideos";
import { VideoPlayer } from "../components/VideoPlayer";
import { api } from "../services/api";

interface WatchPageProps {
  videoId: string;
  onVideoClick: (videoId: string) => void;
}

export const WatchPage: React.FC<WatchPageProps> = ({ videoId, onVideoClick }) => {
  const [detail, setDetail] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandDesc, setExpandDesc] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setExpandDesc(false);

    api
      .getVideoDetail(videoId)
      .then((data) => {
        if (isMounted) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Error fetching video detail:", err);
          setError("動画情報の取得に失敗しました。");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [videoId]);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
        <p className="text-sm text-zinc-400">動画情報を読み込み中...</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-red-950/30 border border-red-800/50 rounded-2xl p-6">
          <p className="text-red-400 font-medium mb-3">{error || "動画が見つかりませんでした"}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-xs bg-red-600 hover:bg-red-500 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* メインエリア (プレイヤー + メタデータ) */}
        <div className="flex-1 min-w-0">
          {/* プレイヤー */}
          <VideoPlayer videoId={videoId} formats={detail.formats} title={detail.title} />

          {/* タイトル */}
          <h1 className="text-lg sm:text-xl font-bold text-zinc-100 mt-4 leading-snug">
            {detail.title}
          </h1>

          {/* チャンネル & アクションバー */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-zinc-800">
            {/* チャンネル情報 */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-200 leading-tight">
                  {detail.author.name}
                </h2>
                <span className="text-[11px] text-zinc-500">YouTube Channel</span>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex items-center gap-2">
              {detail.likes && (
                <div className="flex items-center gap-1.5 bg-zinc-800 text-zinc-200 text-xs px-3 py-1.5 rounded-full border border-zinc-700/60">
                  <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400/20" />
                  <span>{detail.likes}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs px-3 py-1.5 rounded-full transition-colors border border-zinc-700/60"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copied ? "コピー完了!" : "共有"}</span>
              </button>
            </div>
          </div>

          {/* 概要欄 */}
          <div className="mt-4 bg-[#1a1a1a] border border-zinc-800 rounded-2xl p-4 text-xs sm:text-sm">
            <div className="flex items-center gap-3 text-zinc-400 font-semibold mb-2 text-xs">
              {detail.views && (
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {detail.views}
                </span>
              )}
              {detail.publishedDate && <span>{detail.publishedDate}</span>}
            </div>

            <div
              className={`text-zinc-300 whitespace-pre-line leading-relaxed font-sans ${
                !expandDesc ? "line-clamp-3" : ""
              }`}
            >
              {detail.description || "概要はありません"}
            </div>

            {detail.description && detail.description.length > 100 && (
              <button
                type="button"
                onClick={() => setExpandDesc(!expandDesc)}
                className="mt-2 text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1"
              >
                <span>{expandDesc ? "一部を表示" : "もっと見る"}</span>
                {expandDesc ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* サイドバー: 関連動画 */}
        <div className="w-full lg:w-96 shrink-0">
          <RelatedVideos videos={detail.relatedVideos} onVideoClick={onVideoClick} />
        </div>
      </div>
    </div>
  );
};
