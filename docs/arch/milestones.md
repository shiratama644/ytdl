# マイルストーン

プロジェクトのロードマップと完了条件（Definition of Done: DoD）です。
各フェーズの完了条件を満たす前に次へ進んではなりません。

---

## Phase 0: エージェント＆ドキュメントシステム基盤（完了）

- **内容**: `AGENTS.md`、`.agent/`、`docs/` の基盤構築
- **DoD**:
  - `AGENTS.md` の配備
  - `.agent/hooks/`, `.agent/skills/`, `.agent/logs/` の配備
  - `docs/arch/`, `docs/planning/`, `docs/task-list.md` の配備
  - ドキュメント間のリンク整合性

---

## Phase 1: プロジェクト方針策定・環境構築（未着手）

- **内容**: プロジェクトの目的確定、技術スタック選定、初期開発環境セットアップ
- **DoD**:
  - `docs/arch/product.md` の要件定義
  - `docs/arch/adr.md` での技術選定記録
  - 初期ビルド・Lint・テスト等の実行環境構築
