"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function SiteHeader() {
  const router = useRouter();
  const [videoInput, setVideoInput] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const onWatch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = videoInput.trim();
    if (!value) return;
    router.push(`/watch/${encodeURIComponent(value)}`);
  };

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = searchInput.trim();
    if (!value) return;
    router.push(`/search?q=${encodeURIComponent(value)}`);
  };

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f0f0f]/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
        <Link href="/" className="rounded bg-red-600 px-2 py-1 text-xs font-bold">
          YTDL
        </Link>
        <form className="flex min-w-[250px] flex-1 gap-2" onSubmit={onWatch}>
          <input
            value={videoInput}
            onChange={(event) => setVideoInput(event.target.value)}
            placeholder="YouTube URL / video id"
            className="h-10 w-full rounded-full border border-white/20 bg-black px-4 text-sm outline-none focus:border-blue-400"
          />
          <button className="h-10 rounded-full bg-white px-4 text-sm font-semibold text-black">Watch</button>
        </form>
        <form className="flex min-w-[220px] flex-1 gap-2" onSubmit={onSearch}>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search"
            className="h-10 w-full rounded-full border border-white/20 bg-black px-4 text-sm outline-none focus:border-blue-400"
          />
          <button className="h-10 rounded-full border border-white/20 px-4 text-sm font-semibold">
            Find
          </button>
        </form>
      </div>
    </header>
  );
}
