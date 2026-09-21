# Hook: Pre-Task（タスク開始時）

> **トリガー**: ユーザーから指示を受け、作業を開始する直前。
> **目的**: 現状を把握し、必要な知識だけを読み込み、スコープ違い・履歴破壊・環境巻き戻しを防ぐ。

## 手順

### 1. 現状把握（AGENTS.md §4.1）

```bash
git status
git branch --show-current
git log -5 --oneline
```
- ブランチ名は**セッションごとに変わる**。AGENTS.md §4.4 の記載値を鵜呑みにせず、
 必ず `git branch --show-current` で確認する。過去セッションのブランチ名は文書に残さない方針。
- 未コミット変更があれば勝手に破棄・混入しない。
- **re-clone 検出**: `git log` が起点 1 件のみ / `git status` が「大量の削除 + 大量の未追跡」
  → **Sandbox 再構築**。→ [`sandbox-rebuild-recovery.md`](./sandbox-rebuild-recovery.md) を実行してから続ける。
  （このプロジェクトではターン跨ぎに複数回発生する実測事象。）

### 2. 知識のピンポイント読込（本 hook の核心）

[`../skills/index.md`](../skills/index.md) の「読み方ガイド」で**該当スキルだけ**を読む。
- 全スキルを常に読まない（コンテキスト浪費）。
- 初回/全体把握が必要な時だけ `project-overview/SKILL.md` + `tech-stack/SKILL.md`。
- **設計の正本** = [`../../docs/planning/PHASE0_PLAN.md`](../../docs/planning/PHASE0_PLAN.md)
  （確定設計 D1〜D9 は [`../../docs/HANDOVER.md`](../../docs/HANDOVER.md) §4）。
  `docs/arch/` は**まだ存在しない**（P1 以降に作成予定）= 現存物として参照しない。
- 検証証跡 → [`../../docs/research/VERIFICATION_P0.md`](../../docs/research/VERIFICATION_P0.md)。
  環境制約 → `sandbox-constraints/SKILL.md`。
- 進捗は [`../../docs/task-list.md`](../../docs/task-list.md)。

### 3. 優先順位（AGENTS.md §6.7）

- 計画書（`docs/planning/*PLAN.md`）/ 確定設計（HANDOVER §4）と AGENTS.md/skills が矛盾 → **計画書・確定設計が正**。
- 計画書に無い事項 → AGENTS.md（特に §6）→ skills の順。
- **確定した設計判断（再生=DASH 直読み / リゾラ=watch 抽出+decipherer / DL 方式 / relay=DL のみ）は
  再議論・再提案しない**（ユーザー承認済み）。

### 4. タスク粒度の確認（AGENTS.md §1.2）

1 タスク = 1 つの意味のある論理的単位。「ついでに」スコープを広げない。
- 新しい問題を見つけたら現在のタスクに混ぜず、`docs/task-list.md` に新タスクとして登録（AGENTS.md §6.8）。

### 5. ytdl 固有の心構え

- **Sandbox は YouTube 系に直接接続できない**（egress ブロック）→ YouTube/GAS/ブラウザ挙動の確認は
  **ユーザー実行キット**（`verification/`）で実施。キットは AGENTS.md §6.3 の UX ルール（数秒フィードバック /
  `?probe=1` / 1 fetch / 外部リトライ）を**必ず**満たす。
- **4 設計原則の禁止表現**（「完全にゼロ」「直接書き出す」等）を文書・コード・報告に使わない（AGENTS.md §6.4）。
- ユーザーは**検証キットを自分で実行して結果を貼付・コミット**してくれる。手順は
  `verification/README.md` に書いてあるので「README を見て実行」で足りる。
- YouTube / GAS / ブラウザ API の仕様は**記憶で断定せず**、実測証跡（VERIFICATION_P0.md）または web_search で確認。

## 完了後

→ 実装 → [`verify-before-commit.md`](./verify-before-commit.md) で検証 → commit/push → [`log-task.md`](./log-task.md) でログ記録。
