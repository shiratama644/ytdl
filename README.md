# ytdl

youtubei.js を使った YouTube 風ビューワーです。  
Next.js(App Router) + React + zod + zustand + tailwindcss + Redis キャッシュで構成しています。

## 要件対応

- youtubei.js を使ったプロキシ API (`/api/top`, `/api/video`, `/api/stream`, `/api/live-chat`, `/api/search`, `/api/channel`)
- 通常動画 / ショート / ライブの表示モード分岐
- 概要欄 / コメント / 高評価数の表示
- ライブチャットの定期取得表示
- Termux / Alpine 環境では `dev` / `build` で `--webpack` を自動付与（その他OSでは付与しない）
- Redis URL があれば Redis を優先し、なければメモリキャッシュへフォールバック

## レンダリング戦略

- トップ（おすすめ動画）: CSR (`/`)
- 動画視聴ページ: SSR + CSR (`/watch/[id]`)
- チャンネルページ: ISR (`/channel/[id]`)
- 検索結果: SSR (`/search?q=...`)

## 開発

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
pnpm dev
```

ブラウザで `http://localhost:3000` を開いて利用します。

### 環境変数（任意）

```bash
# Redisを使う場合
REDIS_URL=redis://localhost:6379

# キャッシュ設定
CACHE_ENABLED=true
CACHE_PREFIX=ytdl
CACHE_DEFAULT_TTL_SECONDS=180
CACHE_HOME_TTL_SECONDS=120
CACHE_VIDEO_TTL_SECONDS=120
CACHE_CHANNEL_TTL_SECONDS=600
CACHE_SEARCH_TTL_SECONDS=90
CACHE_LIVE_CHAT_TTL_SECONDS=8
CACHE_STREAM_URL_TTL_SECONDS=60
```

## 注意

- YouTube 側仕様変更や動画の権利設定により、再生 URL が取得できない場合があります。
- ライブコメントは取得タイミングにより空になることがあります。
