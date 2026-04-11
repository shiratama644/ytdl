import { SiteHeader } from "@/components/site-header";
import { VideoCard } from "@/components/video-card";
import { getSearchVideos } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const videos = query ? await getSearchVideos(query) : [];

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold">Search Results {query ? `for "${query}"` : ""}</h1>
        {!query && <p className="text-sm text-zinc-400">Type a keyword in the search box.</p>}
        {query && videos.length === 0 && <p className="text-sm text-zinc-400">No videos found.</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      </main>
    </div>
  );
}
