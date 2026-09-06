# Hook: Sandbox Rebuild Recovery（サンドボックス再構築時の復旧手順）

> **トリガー**: Sandbox 再構築を検知した時。AGENTS.md §4.1.1 の手順実体版。
> **検知ヒント**: `git log --oneline` が起点コミット 1 件のみ / `git status` が「大量の削除 + 大量の未追跡」/ 依存関係（`node_modules` 等）が無い。

## 背景

Arena の Sandbox は再構築されることがあり、その場合ワークツリーは
「起点コミットのファイル」＋「push 済みコミットで追加されたファイルの未追跡バージョン」が混在した状態で立ち上がる。
ファイルは破損していないので、以下で確実に復旧する。

## 手順

```bash
# 1. リモートの最新を fetch（※ ブランチ名は git branch --show-current で確認）
git fetch origin <session-branch>

# 2. FETCH_HEAD にワークツリーごとリセット（※ 再構築後の初回のみ例外的に許可）
git reset --hard FETCH_HEAD

# 3. 環境復旧スクリプトを実行して依存を再構築
bash .agent/hooks/restore-sandbox-env.sh
```

## 健全性確認

復旧後は必ず以下を実行し、プロジェクトが正常な状態に戻っていることを確認する。

```bash
git log -5 --oneline
git status
# プロジェクトに定義されている検証コマンドを実行（例: npm test / bun test:unit 等）
```

- `git status` が clean であること。
- 直近の push 済みコミットが `git log` に反映されていること。
- 検証コマンドが PASS すること。

## 完了後

健全性を確認できたら、通常のタスク開始手順（[`pre-task.md`](./pre-task.md)）へ移行する。
