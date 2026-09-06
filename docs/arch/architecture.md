# 全体アーキテクチャ — YouTube Proxy

> システム構成、モジュール分割、データフロー、依存規則を定義する。

## 1. 全体構造

```
[ ブラウザ (Client SPA) ]
  ├── Vite + React + TypeScript + Tailwind CSS + Lucide
  ├── State: React Hooks / 軽量 Context
  └── Media: HTML5 Video / Audio + カスタムコントロール
        │
        │ HTTP REST / Stream API (`/api/*`)
        ▼
[ プロキシサーバー (Backend API) ]
  ├── Hono / Node.js (または Bun)
  ├── Route: `/api/search`, `/api/trending`, `/api/video/:id`, `/api/stream/:id`, `/api/suggest`
  ├── Proxy Engine: Range Request, Chunk Stream Forwarding, MIME ヘッダー中継
  └── YouTube Interface: `youtubei.js` (Innertube)
        │
        │ HTTPS
        ▼
[ YouTube (InnerTube API / Googlevideo CDN) ]
```

## 2. モジュール分割・責務

### 2.1 Backend (`server/`)
- `server/index.ts`: サーバー初期化・ルーティング・静的ファイル配信
- `server/yt.ts`: `youtubei.js` (Innertube) のシングルトン初期化・セッション管理
- `server/routes/search.ts`: 検索・サジェスト処理
- `server/routes/video.ts`: 動画詳細・関連動画取得
- `server/routes/stream.ts`: Range リクエスト対応ストリーミングプロキシ（動画・音声・サムネイル）

### 2.2 Frontend (`src/`)
- `src/components/`: UIコンポーネント（ヘッダー、検索バー、動画カード、プレイヤー、サイドバー等）
- `src/pages/`: 画面（Home/Trending, Search, Watch）
- `src/services/api.ts`: バックエンドAPI呼び出しクライアント
- `src/types/`: フロントエンド・API共通の型定義

### 2.3 Shared (`shared/`)
- APIレスポンス・リクエスト・動画メタデータの型定義

## 3. ストリーミング・プロキシの仕組み

1. クライアントが `/api/stream/:videoId?quality=...&type=...` をリクエスト。
2. ブラウザの `<video>` / `<audio>` タグから送られる `Range: bytes=start-end` ヘッダーをバックエンドが解析。
3. `Innertube` で動画の decipher 済みストリームURLを取得、または `yt.download` を Range 指定でストリームパイプ。
4. `206 Partial Content` と `Content-Range`, `Content-Length`, `Content-Type` を付与してブラウザへ直接パイプ。
5. メモリ上に動画全体をバッファせず、チャンク単位で中継（低メモリ稼働）。

## 4. ポート・ホスト構成
- 開発時:
  - バックエンド: ポート `3000` (または設定値)
  - Vite 開発サーバー: ポート `5173`（`/api` をバックエンドへプロキシ）
- 本番時:
  - バックエンドサーバーがビルド済み `dist/` を配信、またはリバースプロキシで構成
