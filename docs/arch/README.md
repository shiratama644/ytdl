# docs/arch — 仕様書（正本）

ここは **どう作るか** の正本です。計画は [`../planning/`](../planning/)、進捗は [`../task-list.md`](../task-list.md)。

---

## 実装時に守ること

1. **存在しない API を捏造しない。** 外部ライブラリ等の API は公式ドキュメントで確認する（AGENTS.md §7.5）。
2. **フェーズ順を飛ばさない。** [`milestones.md`](./milestones.md) の完了条件を満たしてから次へ進む。
3. **[`adr.md`](./adr.md) に反する実装をしない。** 変更が必要なら実装せずユーザーに確認する。
4. **ADR に無い未決事項は勝手に決めない。** 判断に迷ったら `ask_user` 等で質問する。
5. **品質基準を遵守する。** [`engineering.md`](./engineering.md) の規則・テスト基準を守る。

---

## 仕様書一覧

| ファイル | 内容 |
| :--- | :--- |
| [product.md](./product.md) | プロダクト定義・ユースケース・要件 |
| [architecture.md](./architecture.md) | 全体アーキテクチャ・モジュール構成・依存規則 |
| [engineering.md](./engineering.md) | エンジニアリング原則・品質基準・テスト方針 |
| [adr.md](./adr.md) | アーキテクチャ意思決定ログ (ADR) |
| [milestones.md](./milestones.md) | マイルストーン定義と完了条件 (DoD) |

新しい設計領域が固まったら `kebab-case.md` を追加し、本一覧と [`../README.md`](../README.md) を更新する。
