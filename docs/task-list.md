# ytdl タスク管理表

> **ルール**:
> - タスクの追加・変更・完了は必ずこのファイルに記録する。
> - 各タスクの状態: `[ ]` 未着手 / `[/]` 進行中 / `[x]` 完了 / `[-]` スキップ・廃止

---

## Phase 0: プロジェクト基盤と規約策定
- [x] **0.1** `.agent` ディレクトリと `docs` ディレクトリの初期化
- [x] **0.2** `AGENTS.md` の作成（開発規約・品質基準の明文化）
- [x] **0.3** パッケージ構成とビルド・検証スクリプトの設定

---

## Phase 1: コアストリーミング API & Web クライアント実装
- [x] **1.1** Hono バックエンドサーバーの設計・実装（動画メタデータ、検索、トレンド API）
- [x] **1.2** Innertube (`youtubei.js`) を用いた Range リクエスト対応プロキシストリーミング API 実装
- [x] **1.3** React + Vite + Tailwind CSS による Web クライアント実装（ホーム、検索、再生画面）
- [x] **1.4** コア機能の単体テスト & Lint 設定（Vitest, Biome）

---

## Phase 2: 完全プロキシ化・IndexedDB・一括起動スクリプト・pnpm 移行
- [x] **2.1** 完全プロキシ化（サムネイル画像・アバター画像の `/api/proxy/image` / `/api/thumbnail/:id` 経由中継）
- [x] **2.2** クライアント側ローカル永続化（IndexedDB via Dexie.js: 視聴履歴、お気に入り、設定）
- [x] **2.3** 履歴ページ (`/history`) およびお気に入りページ (`/favorites`) の実装とナビゲーション統合
- [x] **2.4** TS2688 型定義参照エラーの解決（`tsconfig.json` と `tsconfig.test.json` の分離・最適化）
- [x] **2.5** 一括自動起動スクリプト `scripts/execute.ts` 実装（色分けログ、graceful shutdown）
- [x] **2.6** パッケージマネージャーの `pnpm` への移行（`pnpm-workspace.yaml`, `pnpm-lock.yaml`, tsx）
