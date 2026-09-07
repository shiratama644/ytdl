# Skill: Routing & Pages

> App Router のページ・Route Handler 一覧と URL 設計。

## ページ（`app/`）

| ルート | 用途 |
| --- | --- |
| `/` | ホーム。フィード（動画カードグリッド）+ カテゴリフィルタチップ。`useInfiniteQuery` で無限スクロール |
| `/channel/[channelId]` | チャンネル（タブ: home / videos / shorts / live / playlists / community / about） |
| `/watch/[videoId]` | 動画視聴。概要・チャプター・タグ・コメント・関連動画・ダウンロードダイアログ |
| `/live/[videoId]` | ライブ視聴（動画 + チャット）。`LiveClient` が EventSource でライブチャットを購読 |
| `/shorts/[videoId]` | ショート（縦スワイプ）。`ShortsClient` |
| `/search` | 検索（期間/種別/並び替えフィルタ + 無限スクロール） |
| `/downloads` | ダウンロード管理ページ（ジョブ一覧・進捗・削除/キャンセル） |

## Route Handlers（`app/api/`）

| ルート | 用途 |
| --- | --- |
| `GET /api/home` | ホームフィード（`continuation` 対応） |
| `GET /api/watch/[videoId]` | 動画情報 + フォーマット（`streaming_data`） + チャプター/コメント/関連 |
| `GET /api/dash/[videoId]` | DASH セグメント配信（`videojs-contrib-dash` 用） |
| `GET /api/live/[videoId]` | ライブストリーム配信 |
| `GET /api/live/[videoId]/chat` | ライブチャット（SSE / EventSource） |
| `GET /api/channel/[channelId]` | チャンネル情報（タブ別フィード・`continuation` 対応） |
| `GET /api/comments/[videoId]` | コメント一覧（sort / continuation） |
| `GET /api/search` | 検索（duration / type / prioritize / continuation） |
| `GET,POST /api/download` | ダウンロードジョブ一覧・作成 |
| `DELETE /api/download/[jobId]` | ジョブ削除/キャンセル |
| `POST /api/download/concurrency` | 同時実行数変更 |
| `GET /api/proxy` | バイナリ/ストリームプロキシ（SSRF対策の `isAllowed`） |

## URL 設計の注意

- `videoId` / `channelId` / `jobId` は `Promise<{ param: string }>` として `params` から受け取る（Next.js 15 の非同期 params）。
- API レスポンスは `{ error, ... }` を返し、クライアントで `data.error` を throw する慣習。
- 無限スクロールは `continuation` パラメータで行う。
