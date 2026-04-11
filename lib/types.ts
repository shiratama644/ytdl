export type ViewerMode = "watch" | "short" | "live";

export type VideoCard = {
  id: string;
  title: string;
  channelName: string;
  channelId: string;
  viewCountText: string;
  publishedText: string;
  durationText: string;
  thumbnail: string;
};

export type VideoComment = {
  id: string;
  author: string;
  text: string;
  publishedTime: string;
  likeCount?: string;
};

export type LiveChatMessage = {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  isPaid: boolean;
};

export type VideoPayload = {
  id: string;
  title: string;
  channelName: string;
  channelId: string;
  description: string;
  viewCount: number;
  likeCount: number;
  duration: number;
  isLive: boolean;
  mode: ViewerMode;
  thumbnail: string;
  embedUrl: string;
  streamUrl: string;
  comments: VideoComment[];
  hasLiveChat: boolean;
  related: VideoCard[];
};

export type ChannelPayload = {
  id: string;
  name: string;
  description: string;
  avatar: string;
  subscriberText: string;
  videos: VideoCard[];
};
