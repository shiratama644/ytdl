# Hook: Sandbox Rebuild Recovery（サンドボックス再構築からの復旧）

> **トリガー**: サンドボックス再構築を検知した時。
> **検知ヒント**: `git log --oneline` が起点コミット 1 個のみ / `git status` が大量の削除 + 未追跡 / `node_modules` がない。

## 手順

### 1. 現在のブランチを確認

```bash
git branch --show-current
```

### 2. リモートの最新を fetch してワークツリー全体を復元

```bash
git fetch origin <セッション固定ブランチ>
git reset --hard FETCH_HEAD
```

- `git reset --hard` は AGENT.md §4.3 の厳禁ルールの**例外**で、**サンドボックス再構築後の初回のみ**許可される（未コミット変更は元々存在しない状態のため）。

### 3. 依存を再構築

[`restore-sandbox-env.sh`](./restore-sandbox-env.sh) を実行（corepack + pnpm install）。

```bash
bash .agent/hooks/restore-sandbox-env.sh
```

### 4. 健全性を確認

```bash
git log --oneline -5
pnpm test:unit
```

検証が通ったら作業を再開する。

## 注意

- 再構築後の `git status` で大量の削除が見えても、ファイルは破損していない。`reset --hard FETCH_HEAD` で追跡状態に戻る。
- 新規にファイルを触らない。アーカイブ・ログ等の時点記録に手を出さない（AGENT.md §8.5）。
