# Skill: Architecture & Data Flow

> Server (Route Handler) → Innertube → serialize → Client props、および Zustand / TanStack Query のデータフロー。

## 全体レイヤ

```
Browser (Client Component)
  ├── TanStack Query (useQuery / useInfiniteQuery) → /api/* Route Handler
  ├── Zustand store (lib/stores/*) — theme / player / download のローカル状態
  └── VideoPlayer / DownloadDialog / CommentsSection 等の UI

Next.js Route Handler (app/api/*)
  ├── getInnertube() (lib/innertube.ts) で youtubei.js を取得
  ├── 必要に応じて continuationCache で無限スクロールの継続トークンを保持
  └── lib/serialize.ts で Innertube 生データ → アプリ型 (VideoItem 等) へ変換して JSON 返却

SSR / 初期ページ
  └── app/*/page.tsx · layout.tsx が Server Component → 必要なら Client Component へ props を渡す
```

## 重要な変換ライブラリ `lib/serialize.ts`

Innertube の生ノード（`any`）をアプリ型へ変換する。

| 関数 | 用途 |
| --- | --- |
| `serializeVideo(node)` | 動画ノード → `VideoItem` |
| `serializePlaylist(node)` | プレイリストノード → `PlaylistItem` |
| `serializeFeedNode(node)` | フィード/検索の単一ノード → `FeedItem`（video/playlist/channel を判別） |
| `collectFeedItems(root)` | ルートノードから `FeedItem[]` を収集 |
| `serializeCommentThread(thread)` | コメントスレッド → `CommentData` |
| `serializeComments(rt)` | コメント一覧 → `CommentData[]` |
| `serializeFormat(f)` | ストリーミングフォーマット → `FormatData` |
| `serializeChapters(info)` | チャプター → `ChapterData[]` |
| `bestThumbnail(thumbnails)` / `thumbnailsFrom(value)` | サムネイル選択 |
| `parseDuration / countFromString / textToString / containerFromMime / codecFromMime` | 表示/マッピング用の小さなヘルパー |

> **既知の制約**: `serializeFeedNode` / `collectFeedItems` はプレイリストノードを誤って video として扱う
> 既存ロジックを含む。これはテストインフラの任務では変更せず、video 経路のみテストして既知の挙動として文書化する。

## 状態管理（Zustand `lib/stores/`)

| Store | 用途 |
| --- | --- |
| `theme.ts` | テーマ（light/dark/system）、動的カラー（off/seed/thumbnail）、seed 色。`initTheme()` で初期化 |
| `player.ts` | プレイヤー設定（音量/再生速度/自動再生等） |
| `download.ts` | ダウンロードジョブの一覧・同時実行数・ジョブ更新（サーバーが `/api/download` で返すものを同期） |

## データフローの要点

- API レスポンスはクライアントで `if (data.error) throw new Error(...)` を確認してからアプリ型にキャストする慣習。
- 無限スクロールは `useInfiniteQuery` + `continuationCache`。`continuation` はサーバー側で生成・キャッシュされ、`expired: true` ならクライアントで再取得を促す。
- `useQuery` の `queryKey` は `['watch', videoId]` 等、URL/エンティティの一意キーを使う。
- VideoPlayer は video.js 本体と DASH プラグインを**ブラウザ実行時（useEffect 内）に動的 import** する（SSR では `window` 参照不可のため）。`manifestUrl` を変えるとプレイヤーを再初期化する。
