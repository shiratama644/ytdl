# Hooks Index — 定型ワークフロー & トリガー

> このファイルは `.agent/hooks/` の**入口**。特定トリガー時に本ファイルで該当フックを特定し、
> 手順（`.md`）やスクリプト（`.sh`）を実行する。作業規約の本体は `AGENTS.md`（§2/§3/§4）。
> ここは「いつ・どのフック」の索引と、再利用可能な具体手順。
>
> ディレクトリ構造は Claude Code 準拠: 実行スクリプトを `.sh` で置き、トリガー登録は
> [`settings.json`](./settings.json)（Claude Code の `hooks.events` と同型）で行う。

## トリガー → フック 対応表

| トリガー（いつ） | フック | 形式 |
| :--- | :--- | :--- |
| **タスク開始時**（ユーザー指示を受けた直後） | [`pre-task.md`](./pre-task.md) | 手順 |
| **commit 直前**（§3.1 検証） | [`verify-before-commit.md`](./verify-before-commit.md) | 手順 |
| **タスク完了時**（ユーザー指示を完了した直後） | [`log-task.md`](./log-task.md) | 手順 |
| **Sandbox 再構築を検知**（`git log` が起点 1 件のみ / 大量削除+未追跡） | [`sandbox-rebuild-recovery.md`](./sandbox-rebuild-recovery.md) + [`restore-sandbox-env.sh`](./restore-sandbox-env.sh) | 手順 + スクリプト |
| **ユーザーに実行させる検証キットを書く時** | AGENTS.md §6.3 のキット UX ルール（`?probe=1` / 1 fetch / 外部リトライ / raw URL + 自己チェック行） | 規約 |

## フック一覧

| ファイル | 実行トリガー | 対象 / 内容 |
| :--- | :--- | :--- |
| [pre-task.md](./pre-task.md) | タスク開始時 | 現状把握（git status/branch/log）→ re-clone 検知 → `.agent/skills/index.md` から必要スキルをピンポイント読込 → 確定設計（HANDOVER §4）・4 設計原則の意識 |
| [verify-before-commit.md](./verify-before-commit.md) | commit 直前 | コード有 = package.json 定義スクリプトの全検証（pnpm 系）/ コード無（docs 期）= リンク整合・旧表現残存 grep + `.archive/` 未変更確認 |
| [log-task.md](./log-task.md) | タスク完了時 | `.agent/logs/YYYY-MM-DD_<summary>.md` 作成（4 セクション）→ 重要知見を `.agent/skills/` へ同期 → `skills/index.md` + 本 index の「最終更新」更新 |
| [sandbox-rebuild-recovery.md](./sandbox-rebuild-recovery.md) | Sandbox 再構築検知時 | `git fetch`（全 refspec）→ `reset --soft origin/<branch>` → `add -A` → 差分確認 →（必要なら commit）push → 健全性確認 |
| [restore-sandbox-env.sh](./restore-sandbox-env.sh) | 上記から呼出（任意） | pnpm 導入（npm 経由）・必要なら依存インストール |
| [settings.json](./settings.json) | — （Claude Code 準拠の登録マニフェスト） | `hooks.<event>` にトリガー → コマンドを登録。本表の手順/スクリプトと対応。 |

## 運用ルール

- フックは**必須実行**ではなく「該当トリガー時に**必ず参照すべき**手順」。迷ったら該当フックを読む。
- 新フック追加時は本 index の「対応表」「一覧」の両方、および [`settings.json`](./settings.json) へ登録する。
- 実行スクリプト（`.sh`/`.py`）は `kebab-case` + 拡張子。手順は `kebab-case.md`。
- フック内のコマンドは `package.json` script or 既知コマンドのみ（捏造禁止、AGENTS.md §3.1）。
- 最終更新: 2026-09-16（ytdl への全面置換。cod-web 由来の bun/Vite 系フックを pnpm/Next 系に更新）
