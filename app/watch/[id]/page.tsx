import { WatchPageClient } from "@/components/watch-page-client";
import { getVideoByInput } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const target = decodeURIComponent(id);
  let message: string | null = null;
  let video = null;

  try {
    video = await getVideoByInput(target);
  } catch (error) {
    message = error instanceof Error ? error.message : "Failed to load video";
  }

  if (video) {
    return <WatchPageClient initialVideo={video} />;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 w-full flex-1">
      <p className="rounded-xl bg-red-500/20 p-4 text-sm text-red-200">
        {message}
      </p>
    </main>
  );
}
