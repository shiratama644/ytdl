import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/Providers';
import { NavBar } from '@/components/NavBar';
import { DownloadTray } from '@/components/download-queue/DownloadTray';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'ytdl — YouTube 代替視聴',
    template: '%s | ytdl',
  },
  description:
    'YouTube の動画・ショート・ライブ・チャンネル・コメントをプロキシ経由で視聴し、画質・音質指定でダウンロードできる非公式フロントエンド。',
  applicationName: 'ytdl',
  appleWebApp: {
    capable: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fcf7f8' },
    { media: '(prefers-color-scheme: dark)', color: '#181112' },
  ],
  colorScheme: 'dark light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" data-theme="dark" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="min-h-screen bg-surface text-on-surface">
            <NavBar />
            <main className="mx-auto w-full max-w-[1600px] px-4 md:px-6 pt-20 pb-28">{children}</main>
          </div>
          <DownloadTray />
        </Providers>
      </body>
    </html>
  );
}
