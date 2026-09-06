import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // youtubei.js / ffmpeg-static / fluent-ffmpeg はサーバーサイドの外部パッケージとして
  // バンドルせずにネイティブ（node_modules）から解決する。
  serverExternalPackages: ['youtubei.js', 'ffmpeg-static', 'fluent-ffmpeg'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'yt3.ggpht.com' },
      { protocol: 'https', hostname: 'yt3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googlevideo.com' },
    ],
  },
};

export default nextConfig;
