# ytdl

youtubei.js を使った YouTube 風ビューワーです。  
Next.js(App Router) + React + zod + zustand + tailwindcss で構成しています。

## 要件対応

- youtubei.js を使ったプロキシ API (`/api/video`, `/api/stream`, `/api/live-chat`)
- 通常動画 / ショート / ライブの表示モード分岐
- 概要欄 / コメント / 高評価数の表示
- ライブチャットの定期取得表示
- `pnpm dev -- --webpack` 相当になるよう `dev` スクリプトを `next dev --webpack` に設定

## 開発

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
pnpm dev
```

ブラウザで `http://localhost:3000` を開き、YouTube の URL または動画IDを入力してください。

## 注意

- YouTube 側仕様変更や動画の権利設定により、再生 URL が取得できない場合があります。
- ライブコメントは取得タイミングにより空になることがあります。
