---
name: tech-stack
description: 技術スタックの使いどころ・ハマりどころ・ベストプラクティス。実装時に参照。
---

# Tech Stack Skill — 技術構成を使いこなす

> **スキル**: 「どのライブラリ・ツールをどこでどう使うか」と、開発で踏みやすい地雷の回避策。
> 設計の正本は [`../../../docs/arch/README.md`](../../../docs/arch/README.md)。

## ツールチェーン

| 用途 | 技術 | 備考 |
| :--- | :--- | :--- |
| 言語 / ランタイム | TypeScript (strict) / Bun / Node.js | バックエンドは Bun ネイティブ実行 |
| フロントエンド | React 18/19 + Vite + Tailwind CSS + Lucide React | SPA 構成 |
| バックエンド | Hono (`hono`) + `@hono/node-server` | 軽量 Web 標準準拠 API |
| YouTube クライアント | `youtubei.js` (Innertube) | 検索、メタデータ、ストリーム中継 |
| Lint / フォーマッタ | Biome | `bunx biome check .` |
| テストランナー | Vitest | `bun run test:unit` |
| パッケージ管理 | bun (`bun.lock`) | `bun install` |

## 開発のポイント & ハマりどころ

### 1. `youtubei.js` (Innertube) の扱い
- `Innertube.create()` は非同期初期化。サーバー起動時にシングルトンインスタンスを生成・保持する。
- ストリーミングは `yt.download(videoId, { type, quality, range })` または `info.decipher(format)` から URL を取得して Range ヘッダー付きで fetch & pipe 中継する。
- サーバー側で ReadableStream をチャンク単位でパイプし、メモリ枯渇を防ぐ。

### 2. Vite 開発サーバーと Hono バックエンドの連携
- 開発時: Vite の `vite.config.ts` で `/api` プレフィックスを Hono サーバー（例: `http://localhost:3000`）へ proxy 設定。
- 本番時: Hono サーバーが `dist/` 配下の静的ファイルを配信、またはリバースプロキシで連携。

### 3. Biome の設定
- `biome.json` で recommended ルールを適用。
- Vite / React の JSX 構文に対応。
