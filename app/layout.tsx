import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "YTDL - YouTube-like Viewer",
  description:
    "youtubei.js + proxy で YouTube 風に動画を表示する Next.js アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:FILL,GRAD,opsz,wght@0,0,24,400&display=optional"
        />
      </head>
      <body className="min-h-full bg-[#0f0f0f] text-white flex flex-col">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
