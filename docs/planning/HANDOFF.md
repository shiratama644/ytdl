# 次セッションへの引き継ぎ（HANDOFF）

> 対象: 新しいセッションの AI Agent。
> 進捗の正本: [`docs/task-list.md`](../task-list.md)
> 作業規約: [`AGENTS.md`](../../AGENTS.md)
> 仕様正本: [`docs/arch/`](../arch/README.md)

## 0. 最初にやること（これ以外から始めない）

1. `git status` / `git branch --show-current` / `git log -5 --oneline`
2. ブランチ名は **毎回コマンドで確認**する。過去セッションのブランチ名を鵜呑みにしない（AGENTS.md §4.4）。
3. `git log` が起点 1 件だけ / status が大量削除+未追跡 / 依存関係なし → Sandbox 再構築。`.agent/hooks/sandbox-rebuild-recovery.md` に従い復旧する。
4. 未コミット変更を勝手に捨てない（再構築復旧の `reset --hard FETCH_HEAD` だけ例外）。
5. **進行中タスクは原則 1 件。** `docs/task-list.md` を確認して着手する。

## 1. プロジェクトの現状（事実）

- **AgentシステムおよびDocsシステム基盤（Phase 0）**: 導入完了。
- **プロジェクト方針（Phase 1）**: 現在方針策定中。目的や技術スタックの決定待ち。

## 2. 次のアクション

1. ユーザーからの指示に基づき、プロジェクト方針（何を作るか・言語・ツールチェーン等）を確定する。
2. 確定した方針を `docs/arch/`（`product.md`, `architecture.md`, `adr.md` 等）に反映する。
3. `docs/task-list.md` に具体的な実装タスクを追加し、開発を進める。

## 3. ドキュメント読み順（次セッション）

1. 本ファイル (`docs/planning/HANDOFF.md`)
2. `AGENTS.md`
3. `docs/task-list.md`
4. `docs/arch/` 配下の仕様書
5. `.agent/hooks/pre-task.md` → 必要なスキルのみ（`.agent/skills/index.md`）
