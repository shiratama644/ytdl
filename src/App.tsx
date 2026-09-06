import type React from "react";
import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { HomePage } from "./pages/HomePage";
import { SearchPage } from "./pages/SearchPage";
import { WatchPage } from "./pages/WatchPage";

type PageState =
  | { type: "home" }
  | { type: "search"; query: string }
  | { type: "watch"; videoId: string };

export const App: React.FC = () => {
  const [page, setPage] = useState<PageState>(() => {
    // 初期 URL パラメータの解析
    const params = new URLSearchParams(window.location.search);
    const v = params.get("v");
    const q = params.get("q");

    if (v) return { type: "watch", videoId: v };
    if (q) return { type: "search", query: q };
    return { type: "home" };
  });

  // popstate (戻る/進む) のハンドリング
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const v = params.get("v");
      const q = params.get("q");

      if (v) {
        setPage({ type: "watch", videoId: v });
      } else if (q) {
        setPage({ type: "search", query: q });
      } else {
        setPage({ type: "home" });
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateToHome = () => {
    setPage({ type: "home" });
    window.history.pushState({}, "", "/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateToSearch = (query: string) => {
    setPage({ type: "search", query });
    window.history.pushState({}, "", `/?q=${encodeURIComponent(query)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateToWatch = (videoId: string) => {
    setPage({ type: "watch", videoId });
    window.history.pushState({}, "", `/?v=${encodeURIComponent(videoId)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#F1F1F1] flex flex-col font-sans">
      {/* 共通ヘッダー */}
      <Header
        onSearch={navigateToSearch}
        onHomeClick={navigateToHome}
        currentQuery={page.type === "search" ? page.query : ""}
      />

      {/* メインコンテンツ */}
      <main className="flex-1">
        {page.type === "home" && <HomePage onVideoClick={navigateToWatch} />}
        {page.type === "search" && <SearchPage query={page.query} onVideoClick={navigateToWatch} />}
        {page.type === "watch" && (
          <WatchPage videoId={page.videoId} onVideoClick={navigateToWatch} />
        )}
      </main>

      {/* フッター */}
      <footer className="border-t border-[#222222] py-6 text-center text-xs text-zinc-500">
        <p>ytdl — Lightweight YouTube Proxy Client & API</p>
        <p className="mt-1 text-[11px] text-zinc-600">
          Powered by Vite, React, TypeScript, Hono & Innertube.js
        </p>
      </footer>
    </div>
  );
};

export default App;
