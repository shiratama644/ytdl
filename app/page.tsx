import { TopFeedCsr } from "@/components/top-feed-csr";

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 w-full flex-1">
      <h1 className="mb-4 text-xl font-bold">Recommended</h1>
      <TopFeedCsr />
    </main>
  );
}
