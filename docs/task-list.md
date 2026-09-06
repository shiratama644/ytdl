# タスクリスト（唯一の正本）

> 1. 本ファイルが進捗の正本。矛盾時は本ファイルが優先。
> 2. 進行中タスクは原則 1 件。
> 3. タスク ID は再利用しない。中止は「対象外」＋理由を明記。
> 4. 新たに発見した問題は現在のタスクに混ぜず、新タスクとして登録。
> 5. 完了は自己申告ではなく「証拠（コミットSHA・テスト結果等）」で判定。
> 6. 個別フェーズ計画は `docs/planning/*_PLAN.md`（`_TEMPLATE.md` 準拠）。
> 7. 仕様の正本は `docs/arch/`。作業規約は `AGENTS.md`。

**状態定義**: `未着手` / `調査中` / `実装中` / `ローカル検証済み` / `実環境検証待ち` / `完了` / `保留` / `対象外`

---

## プロジェクト概要

- **プロジェクト名**: ytdl (100% Proxied YouTube Client & API)
- **現在のステータス**: フェーズ 1 & 2 実装・検証完了
- **スタック**: Bun, Vite, React, TypeScript, Tailwind CSS, Hono, Dexie.js (IndexedDB), youtubei.js
- **ライセンス**: MIT（[`LICENSE`](../LICENSE) 参照）

---

## ロードマップ（マイルストーン別タスク）

### Phase 0: エージェント＆ドキュメントシステム基盤（完了）

| ID | タスク内容 | 状態 | 完了条件 / 証拠 |
|---|---|---|---|
| **P0-A** | `AGENTS.md` および `.agent/` 記憶システムの構築 | 完了 | `deeb79b` (hooks/skills/logs 構造を配置) |
| **P0-B** | `docs/` ドキュメント体系（arch/planning/task-list）の構築 | 完了 | `deeb79b` (テンプレートおよび索引を配置) |

---

### Phase 1: コア基盤＆プロキシサーバー + Web クライアント実装（完了）

| ID | タスク内容 | 状態 | 完了条件 / 証拠 |
|---|---|---|---|
| **P1-A** | プロジェクト初期化 & ツールチェーン構築（Bun / Vite / React / TS / Biome / Vitest） | 完了 | `28ebd30` (`package.json`, `bun.lock`, 設定ファイル群整備) |
| **P1-B** | バックエンド YouTube プロキシ API 実装（Hono + `youtubei.js` + Range ストリーミング） | 完了 | `28ebd30` (`/api/search`, `/api/trending`, `/api/video/:id`, `/api/stream/:id`) |
| **P1-C** | フロントエンド Web クライアント実装（Home, Search, Watch, Player, 関連動画） | 完了 | `28ebd30` (SPA UI コンポーネントおよび画面) |
| **P1-D** | テストスイート構築 & 4検証（typecheck / biome / test / build） | 完了 | `28ebd30` (6 tests passed, build 成功 177 kB) |
| **P1-E** | 結合確認・ドキュメント更新・コミット・プッシュ | 完了 | `28ebd30` (サーバー起動確認 & git push) |

---

### Phase 2: 完全プロキシ化・IndexedDB・一括起動スクリプト & ビルド分離（完了）

| ID | タスク内容 | 状態 | 完了条件 / 証拠 |
|---|---|---|---|
| **P2-A** | TS2688 型エラーの根本解消（`tsconfig.json` の `compilerOptions.types` 設定） | 完了 | `d1e5af3` (`tsc --noEmit` 0 error) |
| **P2-B** | 完全プロキシ（サムネイル・画像・ストリームの全量自サーバー中継） | 完了 | `d1e5af3` (`/api/proxy/image`, `/api/thumbnail/:id` 実装 & テスト) |
| **P2-C** | IndexedDB (Dexie.js) による視聴履歴・お気に入り機能の実装 | 完了 | `d1e5af3` (`src/db/index.ts`, `HistoryPage.tsx`, `FavoritesPage.tsx`) |
| **P2-D** | `scripts/execute.ts`（色分けログ、bun install → build → 並列起動）の実装 | 完了 | `d1e5af3` (`bun run start` 正常起動確認 :3000 & :4173) |
| **P2-E** | 本番ビルド分離（`tsconfig.json` から `_tests_` を除外、`tsconfig.test.json` 新設） | 完了 | `bun start` でのエラーなし起動確認 |
