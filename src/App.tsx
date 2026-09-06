import type React from "react";
import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { FavoritesPage } from "./pages/FavoritesPage";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { SearchPage } from "./pages/SearchPage";
import { WatchPage } from "./pages/WatchPage";

type PageState =
  | { type: "home" }
  | { type: "search"; query: string }
  | { type: "watch"; videoId: string }
  | { type: "history" }
  | { type: "favorites" };

export const App: React.FC = () => {
  const [page, setPage] = useState<PageState>(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("v");
    const q = params.get("q");
    const tab = params.get("tab");

    if (v) return { type: "watch", videoId: v };
    if (q) return { type: "search", query: q };
    if (tab === "history") return { type: "history" };
    if (tab === "favorites") return { type: "favorites" };
    return { type: "home" };
  });

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const v = params.get("v");
      const q = params.get("q");
      const tab = params.get("tab");

      if (v) {
        setPage({ type: "watch", videoId: v });
      } else if (q) {
        setPage({ type: "search", query: q });
      } else if (tab === "history") {
        setPage({ type: "history" });
      } else if (tab === "favorites") {
        setPage({ type: "favorites" });
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

  const navigateToHistory = () => {
    setPage({ type: "history" });
    window.history.pushState({}, "", "/?tab=history");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateToFavorites = () => {
    setPage({ type: "favorites" });
    window.history.pushState({}, "", "/?tab=favorites");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#F1F1F1] flex flex-col font-sans">
      {/* 共通ヘッダー */}
      <Header
        onSearch={navigateToSearch}
        onHomeClick={navigateToHome}
        onHistoryClick={navigateToHistory}
        onFavoritesClick={navigateToFavorites}
        currentQuery={page.type === "search" ? page.query : ""}
      />

      {/* メインコンテンツ */}
      <main className="flex-1">
        {page.type === "home" && <HomePage onVideoClick={navigateToWatch} />}
        {page.type === "search" && <SearchPage query={page.query} onVideoClick={navigateToWatch} />}
        {page.type === "watch" && (
          <WatchPage videoId={page.videoId} onVideoClick={navigateToWatch} />
        )}
        {page.type === "history" && <HistoryPage onVideoClick={navigateToWatch} />}
        {page.type === "favorites" && <FavoritesPage onVideoClick={navigateToWatch} />}
      </main>

      {/* フッター */}
      <footer className="border-t border-[#222222] py-6 text-center text-xs text-zinc-500">
        <p>ytdl — 100% Proxied YouTube Client & API (IndexedDB Enabled)</p>
        <p className="mt-1 text-[11px] text-zinc-600">
          Powered by Bun, Vite, React, TypeScript, Hono, Dexie.js & Innertube
        </p>
      </footer>
    </div>
  );
};

export default App;
