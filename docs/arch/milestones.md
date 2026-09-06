# マイルストーン

プロジェクトのロードマップと完了条件（Definition of Done: DoD）です。

---

## Phase 0: エージェント＆ドキュメントシステム基盤（完了）

- **内容**: `AGENTS.md`、`.agent/`、`docs/` の基盤構築
- **DoD**:
  - `AGENTS.md` の配備
  - `.agent/hooks/`, `.agent/skills/`, `.agent/logs/` の配備
  - `docs/arch/`, `docs/planning/`, `docs/task-list.md` の配備
  - ドキュメント間のリンク整合性

---

## Phase 1: コア基盤＆プロキシサーバー + Web クライアント実装（現在）

- **内容**:
  - Bun + Vite + React + TypeScript + Tailwind CSS プロジェクトのセットアップ
  - Hono + `youtubei.js` によるバックエンド API / プロキシストリーミング機能の実装
  - フロントエンド UI（動画検索、ホーム/トレンド表示、プレイヤー画面、関連動画、画質選択）の実装
  - 検証（型チェック、Lint、ユニットテスト、ビルド）
- **DoD**:
  - `bun run typecheck` 全 PASS (0 errors)
  - `bunx biome check .` 全 PASS (0 errors)
  - `bun run test:unit` 全 PASS
  - `bun run build` が正常に完了
  - 検索から動画再生までがプロキシ経由でシームレスに動作すること

---

## Phase 2: 拡張機能（後続）

- **内容**:
  - 音声専用バックグラウンド再生・ダウンロード機能
  - プレイリスト / チャンネルページ表示
  - コメント表示・チャプター表示
- **DoD**: 各機能のユニットテストとUI実装
