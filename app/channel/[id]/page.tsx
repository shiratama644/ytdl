import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { VideoCard } from "@/components/video-card";
import { getChannelPayload } from "@/lib/data";

export const revalidate = 300;
export const dynamic = "force-static";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const channelId = decodeURIComponent(id);
  let message: string | null = null;
  let channel = null;

  try {
    channel = await getChannelPayload(channelId);
  } catch (error) {
    message = error instanceof Error ? error.message : "Failed to load channel";
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <SiteHeader />
      {channel ? (
        <main className="mx-auto max-w-7xl px-4 py-6">
          <section className="mb-6 flex items-center gap-4 rounded-2xl bg-white/5 p-4">
            {channel.avatar ? (
              <div className="relative h-16 w-16 overflow-hidden rounded-full">
                <Image src={channel.avatar} alt={channel.name} fill className="object-cover" sizes="64px" />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-full bg-white/10" />
            )}
            <div>
              <h1 className="text-2xl font-bold">{channel.name}</h1>
              <p className="text-sm text-zinc-400">{channel.subscriberText || "Subscribers hidden"}</p>
            </div>
          </section>
          {channel.description && (
            <section className="mb-6 rounded-xl bg-white/5 p-4 text-sm text-zinc-300">
              <p className="whitespace-pre-wrap">{channel.description}</p>
            </section>
          )}
          <section>
            <h2 className="mb-4 text-lg font-semibold">Videos</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {channel.videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </section>
        </main>
      ) : (
        <main className="mx-auto max-w-3xl px-4 py-12">
          <p className="rounded-xl bg-red-500/20 p-4 text-sm text-red-200">{message}</p>
        </main>
      )}
    </div>
  );
}
