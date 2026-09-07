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

// ビルドキャッシュについて（webpack / turbopack 共通）
// - Webpack: Next.js 標準で .next/cache/webpack に filesystem（永続）キャッシュを持つ。
// - Turbopack: `next build --turbopack` も .next/cache 配下にビルドキャッシュを書く。
//   stable（15.5.25）では canary 専用の experimental.turbopackPersistentCaching は
//   使えないため設定しない（有効化は next build --turbopack 自体が担う）。
// - どちらも .next/cache は scripts/executer.ts が .cache/next-build/next-cache への
//   symlink に差し替えて永続化する（.next の再生成・削除でもキャッシュは残る）。

export default nextConfig;
