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

- **プロジェクト名**: ytdl (YouTube Proxy Web & API)
- **現在のステータス**: フェーズ 1 実装完了
- **スタック**: Bun, Vite, React, TypeScript, Tailwind CSS, Hono, youtubei.js
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

### Phase 2: 拡張機能（未着手）

| ID | タスク内容 | 状態 | 完了条件 / 証拠 |
|---|---|---|---|
| **P2-A** | プレイリスト・チャンネル画面の実装 | 未着手 | チャンネル詳細・動画一覧 API & UI |
| **P2-B** | コメント一覧・チャプター表示の実装 | 未着手 | コメント取得 API & チャプターUI |
| **P2-C** | お気に入り・履歴のローカル保存（LocalStorage） | 未着手 | 履歴・ブックマーク機能 |
