---
name: project-overview
description: プロダクトの全体像（目標・方針・フェーズ進捗）を掴む。新規セッションの最初に読むスキル。
---

# Project Overview — ytdl

> 製品の全体像。新規セッションの最初に読むファイル。
> 仕様の正本は [`../../../docs/arch/product.md`](../../../docs/arch/product.md)。
> 進捗の正本は [`../../../docs/task-list.md`](../../../docs/task-list.md)。

## 製品

**ytdl** は、低スペックサーバーでも軽快に動作する **YouTube Proxy Web クライアント & ストリーミング API** です。

- フロントエンド: **Vite + React + TypeScript + Tailwind CSS**（SPA）
- バックエンド: **Hono + youtubei.js (Innertube)**
- パッケージ管理 & ランタイム: **bun**
- 機能: 動画検索、サジェスト、ホーム/トレンド動画一覧、プロキシストリーミング再生（Range 対応）、関連動画、画質切り替え

## 技術スタック

| レイヤー | 採用技術 |
| :--- | :--- |
| パッケージ管理 / ランタイム | Bun (`bun.lock`) |
| フロントエンド | React 18/19, Vite, Tailwind CSS, Lucide React |
| バックエンド | Hono, youtubei.js (Innertube) |
| Lint / Test | Biome, Vitest |

## フェーズ進捗

> 正本は [`../../../docs/task-list.md`](../../../docs/task-list.md)。

| Phase | 内容 | 状態 |
| :--- | :--- | :--- |
| **0** | Agentシステム / Docsシステム基盤の導入 | 完了 |
| **1** | コア基盤＆プロキシサーバー + Web クライアント実装 | 実装中 |
| **2** | 拡張機能（ダウンロード、音声専用、プレイリスト等） | 未着手 |

## 関連ドキュメント

- 開発規約: [`../../../AGENTS.md`](../../../AGENTS.md)
- 仕様入口: [`../../../docs/arch/README.md`](../../../docs/arch/README.md)
- タスク正本: [`../../../docs/task-list.md`](../../../docs/task-list.md)
