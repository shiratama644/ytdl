import { ChannelClient } from '@/components/ChannelClient';

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  return <ChannelClient channelId={channelId} />;
}
