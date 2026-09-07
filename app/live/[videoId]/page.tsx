import { LiveClient } from '@/components/LiveClient';

export default async function LivePage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await params;
  return <LiveClient videoId={videoId} />;
}
