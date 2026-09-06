---
name: project-overview
description: プロダクトの全体像（目標・方針・フェーズ進捗）を掴む。新規セッションの最初に読むスキル。
---

# Project Overview — ytdl

> 製品の全体像。新規セッションの最初に読むファイル。
> 仕様の正本は [`../../../docs/arch/product.md`](../../../docs/arch/product.md)。
> 進捗の正本は [`../../../docs/task-list.md`](../../../docs/task-list.md)。

## 製品

**ytdl** は、低スペックサーバーでも軽快に動作する **完全プロキシ型 YouTube Web クライアント & ストリーミング API** です。

- フロントエンド: **Vite + React + TypeScript + Tailwind CSS + Dexie.js (IndexedDB)**（SPA）
- バックエンド: **Hono (`@hono/node-server`) + youtubei.js (Innertube)**
- パッケージ管理 & スクリプト: **pnpm (`pnpm-lock.yaml`) + tsx**
- 機能: 動画検索、サジェスト、ホーム/トレンド動画一覧、完全プロキシストリーミング再生（Range 対応）、サムネイルプロキシ、視聴履歴・お気に入り (IndexedDB)、関連動画

## 技術スタック

| レイヤー | 採用技術 |
| :--- | :--- |
| パッケージ管理 | pnpm (`pnpm-lock.yaml`) |
| ランタイム | Node.js + tsx |
| フロントエンド | React 18, Vite, Tailwind CSS, Lucide React, Dexie.js |
| バックエンド | Hono, @hono/node-server, youtubei.js (Innertube) |
| Lint / Test | Biome, Vitest |

## フェーズ進捗

> 正本は [`../../../docs/task-list.md`](../../../docs/task-list.md)。

| Phase | 内容 | 状態 |
| :--- | :--- | :--- |
| **0** | Agentシステム / Docsシステム基盤の導入 | 完了 |
| **1** | コア基盤＆プロキシサーバー + Web クライアント実装 | 完了 |
| **2** | 完全プロキシ化・IndexedDB・一括起動スクリプト・pnpm 移行 | 完了 |

## 関連ドキュメント

- 開発規約: [`../../../AGENTS.md`](../../../AGENTS.md)
- 仕様入口: [`../../../docs/arch/README.md`](../../../docs/arch/README.md)
- タスク正本: [`../../../docs/task-list.md`](../../../docs/task-list.md)
