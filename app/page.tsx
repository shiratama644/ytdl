import { SiteHeader } from "@/components/site-header";
import { TopFeedCsr } from "@/components/top-feed-csr";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold">Recommended</h1>
        <TopFeedCsr />
      </main>
    </div>
  );
}
