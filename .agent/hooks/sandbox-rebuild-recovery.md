# Hook: Sandbox Rebuild Recovery

> **トリガー**: Sandbox 再構築（re-clone）を検知した時。AGENTS.md §4.1.1 の手順実体版。
> **検知ヒント**: `git log --oneline` が起点コミット 1 件のみ / `git status` が「大量の削除 + 大量の未追跡」。
> （作業ツリーのファイル自体は残ることが多い = 破壊的な復旧は不要）

## 背景

Arena の Sandbox はターン跨ぎに再構築され、ローカル HEAD/ブランチが起点コミットに巻き戻る
（**本プロジェクトで 5 回以上実測**）。その場合ワークツリーは「起点コミットのファイル」＋
「push 済みコミットで追加されたファイルの未追跡バージョン」が混在した状態で立ち上がる。

## 手順（2026-09-16 実施検証済み・soft ベース = 破壊的操作なし）

```bash
# 1. リモートを全ブランチ fetch
#    ※ refspec を必ず付ける（付けないと FETCH_HEAD だけ更新される罠）
git fetch origin '+refs/heads/*:refs/remotes/origin/*'

# 2. リモート先端を確認（自分の前回の push が届いているか / ユーザーの Web UI コミットが無いか）
git log --oneline -3 origin/<現在のセッションブランチ>

# 3. HEAD/ブランチをリモート先端へ（--soft = 作業ツリーと index は触らない = 安全）
git reset --soft origin/<現在のセッションブランチ>

# 4. 作業ツリーをステージし、差分を確認
git add -A
git diff --cached --stat
#   - 差分 0（= ディスクがリモート先端と一致）        → 復旧完了・そのまま作業再開
#   - 自分の未コミット変更のみ                          → commit + push して再開
#   - 想定外の差分（ユーザーの Web UI 変更等）          → AGENTS.md §4.5 の同期手順 → 再確認
```

### 依存再構築（コードが存在し始めた後）

```bash
bash .agent/hooks/restore-sandbox-env.sh
```

## 復旧後の健全性確認

```bash
git log --oneline -5    # push 済みコミットが見えること
git status --short      # 復旧作業後は clean（または自分の未コミット変更のみ）
```
→ 問題なければ作業再開。

## 注意

- **`git reset --hard` は使わない**（上記 soft 手順で十分であり、AGENTS.md §4.3 で厳禁）。
  （旧手順は `reset --hard FETCH_HEAD` を例外許可していたが、それは廃止済み。
  soft + `add -A` + 差分確認 は 2026-09-16 に再検証済みで十分安全。）
- ファイルが「未追跡」に見える場合も、`reset --soft` + `add -A` で追跡状態に戻る。
  タスク範囲外のファイルは触らないこと。
- **push が rejected になったら**: fetch 後に同じ手順（差分が自分のものであった場合のみ commit → push）。
