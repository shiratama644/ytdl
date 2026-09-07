# Logs — タスク実行記録

> このディレクトリは **タスク完了毎の実行記録** を追加専用で蓄積する場所です。
> 作業規約は [`AGENTS.md`](../../AGENTS.md) §8、作成手順は [`.agent/hooks/log-task.md`](../hooks/log-task.md) を参照してください。

## 命名規則

```
YYYY-MM-DD_<kebab-case-summary>.md
```

- 日付 = 今日（ハイフン区切り）。時系列ソート用に先頭に置く。
- summary = タスク内容の kebab-case（例: `introduce-vitest-and-biome.md`）。

## 記述テンプレート（4 セクション）

```markdown
# <Task Title>

> Date: YYYY-MM-DD(JST) / Commit: <hash> / Branch: <branch>

## 1. 指示内容 (Task Summary)
## 2. 実行内容 (Executed Actions)
## 3. 気づいたこと・知見 (Insights & Lessons Learned)
## 4. 次にすべきこと (Next Actions)
```

## 運用ルール

- ログは**追加のみ**。過去ログを書き換えたり、履歴改変系の指示に対して過去ログを置換対象に含めたりしない。
- 一括置換の射程は**現用ドキュメント**（`AGENT.md` / `.agent/skills/` / `.agent/hooks/` / `docs/` の現用ファイル）に限定する。
- 当時の事実（旧ブランチ名・旧数値・旧パス）を残す必要がある場合は、過去ログを書き換えず**当日の新規ログに記録**する。
