# Skill: Project Overview

> 製品概要・技術スタック・ディレクトリ構成。最初に読む。

## 製品概要

`ytdl` は YouTube の代替視聴・ダウンロードサイトです。プロキシ経由で動画・ライブ配信・チャンネル・コメント・
検索を閲覧でき、ffmpeg によるダウンロード（映像/音声/多重化）にも対応します。UI は Material 3 Expressive
準拠のダーク/ライトテーマ（動的カラー対応）です。

## 技術スタック

| 層 | 使用技術 |
| --- | --- |
| フレームワーク | Next.js 15.5（App Router / Route Handlers / Server Components + Client Components） |
| UI | React 19.2, Tailwind CSS 3.4, video.js 8 (`videojs-contrib-dash` 5) / dashjs 5 |
| 型 | TypeScript 5.9（strict） |
| YouTube 取得 | `youtubei.js` 18（Innertube、`lib/innertube.ts` の `getInnertube()`） |
| 状態管理 | Zustand 5（`lib/stores/`）。Context API は不使用 |
| データ取得 | TanStack Query 5（`useQuery` / `useInfiniteQuery`） |
| 動画変換 | `ffmpeg-static` + `fluent-ffmpeg`（`lib/ffmpeg.ts` / `lib/download-queue.ts`） |
| 検証 | TypeScript（`tsc --noEmit`、main + test の 2 config） |
| Lint | Biome 2.5（ESLint は不使用） |
| テスト | Vitest 5 + jsdom 30 + @testing-library/react 16 + fake-indexeddb |
| パッケージマネージャ | pnpm（`packageManager: pnpm@12.3.4`。Node `>= 24`） |

## ディレクトリ構成

```
app/                    # Next.js App Router
├── page.tsx            # ホーム（フィード / フィルタチップ）
├── channel/[channelId] # チャンネル（タブ切替）
├── live/[videoId]      # ライブ視聴（チャット付き）
├── search/             # 検索
├── shorts/[videoId]    # ショート（縦スワイプ）
├── watch/[videoId]     # 動画視聴（ダウンロード / コメント / 関連）
├── downloads/          # ダウンロード管理ページ
└── api/                # Route Handlers (channel / comments / dash / download / home / live / proxy / search / watch)
components/
├── ui/                 # Button / Chip / icons 等の共通 UI
├── player/             # VideoPlayer (video.js ラッパー)
├── comments/           # CommentsSection
└── download-queue/     # DownloadDialog / DownloadTray
lib/
├── innertube.ts        # getInnertube() (youtubei.js シングルトン)
├── serialize.ts        # Innertube 結果 → アプリ型への変換
├── format.ts           # 表示用フォーマッタ
├── continuation-cache.ts  # 無限スクロール用継続トークンキャッシュ
├── download-queue.ts   # ダウンロードジョブキュー（p-queue）
├── ffmpeg.ts           # ffmpeg 処理ユーティリティ
├── theme.ts            # M3 動的カラートークン算出
├── types.ts            # 共有型定義
└── stores/             # Zustand stores（theme / player / download）
scripts/executer.ts     # 環境判定ビルド/起動スクリプト（`import.meta.main` ガード / `pnpm launch` で実行 / ビルドキャッシュ永続化）
.cache/                 # ビルドキャッシュ永続先（.next/cache の symlink 先、gitignore 済み）
__tests__/              # ソースと同階層の単体テスト
types/                  # 追加の型定義（videojs-contrib-dash 等）
```

## 主なエントリポイント

- `scripts/executer.ts` — Termux / Proot-Distro か通常 OS かを判定し、`pnpm install → build → start` を実行。**Termux / Proot-Distro では Turbopack が使えないため常に webpack を使用**（通常 OS も既定 webpack。Turbopack は明示指定時のみ）。実行は `pnpm launch`（`package.json` の `launch` スクリプト経由、`--experimental-strip-types` 付き）。ビルド時に `.next/cache` を `.cache/next-build/next-cache` への symlink へ差し替えてキャッシュを永続化する。
- `app/api/watch/[videoId]/route.ts` — 動画情報（視聴・ダウンロード用フォーマット・チャプター・コメント・関連動画）を返す。
