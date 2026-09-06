import { Flame, PlaySquare, Search, X } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";

interface HeaderProps {
  onSearch: (query: string) => void;
  onHomeClick: () => void;
  currentQuery?: string;
}

export const Header: React.FC<HeaderProps> = ({ onSearch, onHomeClick, currentQuery = "" }) => {
  const [query, setQuery] = useState(currentQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    if (!query.trim() || !showSuggestions) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const list = await api.getSuggestions(query);
      setSuggestions(list);
    }, 200);

    return () => clearTimeout(timer);
  }, [query, showSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setShowSuggestions(false);
      onSearch(query.trim());
    }
  };

  const handleSelectSuggestion = (suggestedText: string) => {
    setQuery(suggestedText);
    setShowSuggestions(false);
    onSearch(suggestedText);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0F0F0F] bg-opacity-95 backdrop-blur-md border-b border-[#272727] px-4 py-2.5 flex items-center justify-between gap-4">
      {/* ロゴ */}
      <button
        type="button"
        onClick={onHomeClick}
        className="flex items-center gap-2 text-white font-bold text-xl tracking-tight hover:opacity-90 transition-opacity focus:outline-none"
      >
        <div className="bg-red-600 rounded-lg p-1.5 flex items-center justify-center shadow-md shadow-red-600/20">
          <PlaySquare className="w-5 h-5 text-white" />
        </div>
        <span className="hidden sm:inline">ytdl</span>
        <span className="text-xs font-normal text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded ml-1">
          Proxy
        </span>
      </button>

      {/* 検索バー */}
      <div ref={searchContainerRef} className="relative flex-1 max-w-xl">
        <form onSubmit={handleSubmit} className="flex items-center">
          <div className="relative w-full flex items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="動画を検索..."
              className="w-full bg-[#121212] border border-[#303030] focus:border-blue-500 rounded-l-full py-2 px-4 pl-4 pr-10 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSuggestions([]);
                }}
                className="absolute right-3 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="bg-[#222222] hover:bg-[#272727] border border-l-0 border-[#303030] rounded-r-full py-2 px-5 text-zinc-300 hover:text-white transition-colors"
            title="検索"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>

        {/* サジェストドロップダウン */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#212121] border border-[#303030] rounded-xl shadow-2xl overflow-hidden z-50 py-1.5">
            {suggestions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="w-full text-left px-4 py-2 text-sm text-zinc-200 hover:bg-[#383838] flex items-center gap-3 transition-colors"
              >
                <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="truncate">{item}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 右側アクション */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onHomeClick}
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-[#222222] hover:bg-[#2e2e2e] border border-[#303030] px-3 py-1.5 rounded-full transition-colors"
        >
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="hidden sm:inline">トレンド</span>
        </button>
      </div>
    </header>
  );
};
