import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YTDL - YouTube-like Viewer",
  description: "youtubei.js + proxy で YouTube 風に動画を表示する Next.js アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#0f0f0f] text-white flex flex-col">{children}</body>
    </html>
  );
}
