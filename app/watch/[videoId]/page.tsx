import { WatchClient } from '@/components/WatchClient';

export default async function WatchPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await params;
  return <WatchClient videoId={videoId} />;
}
