---
name: sandbox-constraints
description: Arena Sandbox の恒常的制約（YouTube 系 egress ブロック / ターン跨ぎ re-clone / Chromium 不可 / ユーザー実行キット運用 / Web UI コミット）と迂回策。環境トラブル時に参照。
---

# Sandbox Constraints — 環境制約と迂回策

> AGENTS.md §6.2/§6.3/§4.1.1 の実態版。「乗り越える」のではなく「迂回する」。制約は修正対象ではない。
> **全て実測済み**（2026-09-12〜16）。

## 恒常的制約

| 制約 | 影響 | 対処 |
| :--- | :--- | :--- |
| **egress ブロック**: `youtube.com` / `googlevideo.com` / `siatube.com` / `script.google.com` への直接通信 = SSL_ERROR_SYSCALL で即失敗（curl/fetch とも） | YouTube 系の検証・ユーザーの GAS デプロイ URL の確認が Sandbox から**できない** | ユーザー実行キットで検証（下表）。`fetch_page` は markdown のみ（script 取得不可）。`raw.githubusercontent.com` は到達可 |
| **ターン跨ぎにリポジトリが再クローンされる**（本プロジェクトで 5 回以上実測。ターン途中にも発生） | ローカル HEAD が起点コミットに巻き戻る | **変更のたびに commit+push** + re-clone 検知時に `.agent/hooks/sandbox-rebuild-recovery.md`（fetch 全 refspec → `reset --soft origin/<branch>` → `add -A` → 差分確認） |
| **Chromium バイナリ install 不可** | Playwright 等のローカル実行不可 | 書くことはできるが実行しない。「実環境検証待ち」として報告 |
| **ユーザーが GitHub Web UI で直接コミットする** | worktree に古いコピーが残る → `git add -A` がユーザーの削除を復活させる | commit 前に fetch + `git checkout origin/<branch> -- <ファイル>` / ユーザーが削除したファイルは worktree 側も削除（AGENTS.md §4.5） |
| `uploads/` 等は同期されない場合がある | ユーザー送付ファイルの喪失 | 貼付が来たら必ずファイル化してコミット（`verification/Verification-Results.md` = 最新の生結果のみ運用） |
| `bun.sh` / `nodejs.org` / `get.pnpm.io` 等は到達不可（registry.npmjs.org は到達可） | ランタイム導入に制限 | pnpm は `npm install -g pnpm`（`.agent/hooks/restore-sandbox-env.sh`） |
| ライブプレビュー(e2b.app)経由のブラウザ | dev server がプレビューホストを拒否すると 403/HMR 切断 | `0.0.0.0` バインド + `allowedDevOrigins`（または `allowedHosts`）許可。host 指定の allowlist にはプレビューホストを含める |

## ユーザー実行キット運用（本プロジェクトの検証の主力手段）

YouTube/GAS/ブラウザ挙動の確認は Sandbox から不可なため、**ユーザーが自分の環境（GAS デプロイ・
Android/iOS/PC Chrome）で実行して結果を貼付・コミット**してくれる。この運用のルール:

| ルール | 根拠（実測） |
| :--- | :--- |
| **数秒で必ずフィードバック**。キット内の長待リトライ禁止 | v1e 試行 2: 30s+60s 内蔵リトライ = 90 秒以上無音 → ユーザーが「どれだけ待っても表示されなかった」と報告 |
| **`?probe=1` の即返り自己チェック**（YouTube fetch 0 回）を必ず内蔵 | デプロイ鮮度確認 + いつでも安全に叩ける |
| **1 回の実行 = 1 回だけ fetch**。リトライは**外部で**（閉じて 10〜30 分待って 1 回だけ開き直す） | YouTube 429 は ~13 回/時で実発生（O9）。リロード 1 回 = fetch 1 回 |
| **新しい GAS プロジェクト**で実行させる + **raw URL + 自己チェック行**を伝える | デプロイは旧版を配信し続ける。旧版コピー混入は実際に 2 回発生 |
| `setMimeType` は **enum のみ**（`ContentService.MimeType.JSON` 等） | String は例外（O7・実測 2 回） |
| GCS の 429 ページ（1648B のレート制限 HTML）は**結果として記録**する（失敗ではない） | v1e 試行 1 |

キット一式 = `verification/`（v1〜v1f = V1 系 / v2・v2b = V2 / v3・v3b = V3）。
実行手順は `verification/README.md`。結果は `verification/Verification-Results.md`（1 ファイル = 最新のみ）。

## ツール癖（Sandbox 内）

- `node --check` は `.gs` 拡張子が通らない → `/tmp/*.js` にコピーして実施。
- GAS .gs の JS 構文チェック = `new Function(code)` でも可。
- `edit_file` の fuzzy 匹配は**バックスラッシュを含むブロックや見た目が近い文字で失敗しやすい**
  → 失敗したら `read_file` で正確なテキストを確認し、python3 の in-file 置換（assert 付き = 不落で安全）か
  `write_file` 全文書き換えを使う。
- **minified JS を 1 行に手書きすると括弧不整合が起きやすい**（実際に 1 回発生）→
  多行配列 `join('\n')` で書く + 構文チェックで必ず検証。
- `git fetch origin <branch>`（refspec なし）は **FETCH_HEAD だけ**を更新する罠 →
  常に `'+refs/heads/*:refs/remotes/origin/*'` を付ける。
- 大出力の grep 結果はページネーションされないが、`head -N` / 特定パス指定で絞る。

## 確認できないこと（断定禁止）

- ブラウザでの実 DL 速度・iOS Safari 挙動・学校のフィルタの具体挙動 = **実環境検証待ち**として報告。
  「〜のはずです」で書き、確定値のように書かない（AGENTS.md §7.3）。
