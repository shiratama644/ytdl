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
| パッケージ管理 | pnpm (`pnpm-lock.yaml`) | `pnpm install`, `pnpm run` |
| ランタイム | Node.js (v22/v24) + `tsx` | サーバーサイド TypeScript 実行 |
| フロントエンド | React 18/19 + Vite + Tailwind CSS + Lucide React + Dexie.js | SPA 構成 |
| バックエンド | Hono (`hono`) + `@hono/node-server` | 軽量 Web 標準準拠 API |
| YouTube クライアント | `youtubei.js` (Innertube) | 検索、メタデータ、ストリーム中継 |
| Lint / フォーマッタ | Biome | `pnpm run lint` |
| テストランナー | Vitest | `pnpm run test:unit` |

## 開発のポイント & ハマりどころ

### 1. `pnpm` のビルドスクリプト設定
- pnpm 12 では `onlyBuiltDependencies`（`pnpm-workspace.yaml` または `pnpm approve-builds`）により、esbuild などのネイティブバイナリのビルドを許可する。

### 2. `scripts/execute.ts`（一括起動）
- Node.js 標準の `child_process.spawn` を使用して、`pnpm install` → `pnpm run build` → サーバー (`tsx server/index.ts`) & クライアント (`vite preview`) を色分けタグ付きで並列起動する。

### 3. 完全プロキシ (Full Proxy)
- サムネイルやアバター画像も `/api/proxy/image` / `/api/thumbnail/:id` を介して配信し、ブラウザから Google/YouTube ドメインへの直接通信を完全に遮断。
