---
name: sandbox-constraints
description: Sandbox / ブラウザ・ネットワーク / GitHub App の恒常的制約と迂回策。環境トラブル時に参照。
---

# Sandbox Constraints — 環境制約と迂回策

> AGENTS.md §6.2 の実態版。「乗り越える」のではなく「迂回する」。制約は修正対象ではない。

## 恒常的制約

| 制約 | 影響 | 対処 |
| :--- | :--- | :--- |
| **GUI / ヘッドレスブラウザの制約** | ブラウザバイナリ依存のテストがローカルで実行不可の場合がある | E2E（Playwright 等）は書けるがローカル実行しない。CI 上で実行 |
| **外部ネットワークの接続制約** | 外部実 API への常時接続が困難な場合がある | 純粋関数・モックを活用してユニットテスト。実結合は「**実環境検証待ち**」 |
| **`.github/workflows/` 書き込み不可** | CI 定義を GitHub リポジトリへ直接 push できない場合がある | YAML ファイルは `docs/ops/` に保管し、ユーザーによる配置を依頼（AGENTS.md §6.2） |

## 復旧手順

- Sandbox 再構築時（`git log` が起点 1 件のみ / 大量削除+未追跡 / 依存関係無し）は [`.agent/hooks/sandbox-rebuild-recovery.md`](../../hooks/sandbox-rebuild-recovery.md) ＋ [`restore-sandbox-env.sh`](../../hooks/restore-sandbox-env.sh) に従って復旧する。
