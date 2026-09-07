import { ShortsClient } from '@/components/ShortsClient';

export default async function ShortsPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await params;
  return <ShortsClient videoId={videoId} />;
}
