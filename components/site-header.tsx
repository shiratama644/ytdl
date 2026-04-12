"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const inputClassName = [
  "h-10 min-w-0 w-full rounded-full border border-white/20",
  "bg-black/60 px-4 text-sm outline-none focus:border-blue-400",
].join(" ");

export function SiteHeader() {
  const router = useRouter();
  const [mode, setMode] = useState<"watch" | "search">("search");
  const [videoInput, setVideoInput] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = (mode === "watch" ? videoInput : searchInput).trim();
    if (!value) return;
    if (mode === "watch") {
      router.push(`/watch/${encodeURIComponent(value)}`);
      return;
    }
    router.push(`/search?q=${encodeURIComponent(value)}`);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0f0f0f]/75 px-3 py-3 backdrop-blur-xl sm:px-4">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 md:flex-row md:items-center">
        <Link href="/" className="w-fit rounded bg-red-600 px-2 py-1 text-xs font-bold">
          YTDL
        </Link>
        <form className="flex min-w-0 flex-1 gap-2" onSubmit={onSubmit}>
          <button
            type="button"
            onClick={() => setMode(mode === "watch" ? "search" : "watch")}
            aria-label={mode === "watch" ? "Switch to search mode" : "Switch to URL mode"}
            className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full border border-white/20 bg-white/5 px-3 text-sm font-semibold"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px] leading-none">
              {mode === "watch" ? "link" : "search"}
            </span>
            <span>{mode === "watch" ? "URL" : "Search"}</span>
          </button>
          <input
            value={mode === "watch" ? videoInput : searchInput}
            onChange={(event) =>
              mode === "watch" ? setVideoInput(event.target.value) : setSearchInput(event.target.value)
            }
            placeholder={mode === "watch" ? "YouTube URL / video id" : "Search"}
            className={inputClassName}
          />
          <button
            className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full border border-white/20 px-4 text-sm font-semibold"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px] leading-none">
              {mode === "watch" ? "play_arrow" : "travel_explore"}
            </span>
            <span>{mode === "watch" ? "Watch" : "Find"}</span>
          </button>
        </form>
      </div>
    </header>
  );
}
