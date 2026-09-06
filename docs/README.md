# ytdl ドキュメント索引

本リポジトリのドキュメント索引です。

---

## ディレクトリ構成

```
docs/
├── README.md            ← 本ファイル（ドキュメント索引）
├── task-list.md         ★ 進捗の唯一の正本
├── arch/                ★ 仕様書（どう作るかの正本）
│   ├── README.md        # 仕様書目次・実装時の遵守事項
│   ├── product.md       # プロダクト定義・要件
│   ├── architecture.md  # 全体アーキテクチャ・モジュール構造
│   ├── engineering.md   # 品質基準・テスト基準
│   ├── adr.md           # アーキテクチャ意思決定ログ (ADR)
│   └── milestones.md    # マイルストーン・フェーズ定義
└── planning/            # 計画書（着手前に _TEMPLATE.md で作成）
    ├── _TEMPLATE.md     # 計画書テンプレート
    └── HANDOFF.md       # 次セッションへの引き継ぎ書
```

- **仕様書 (`arch/`)**: どう作るかの正本。
- **計画書 (`planning/`)**: 何をどの順で進めるか。
- **進捗 (`task-list.md`)**: タスクの状態と証拠の唯一の正本。

---

## ドキュメントの読む順

| 順 | 文書 | 内容 |
|---:|---|---|
| 0 | [`planning/HANDOFF.md`](planning/HANDOFF.md) | 次セッションへの引き継ぎ・直近の状況確認 |
| 1 | [`../README.md`](../README.md) | プロジェクト概要・セットアップ |
| 2 | [`arch/product.md`](arch/product.md) | プロダクト定義・要件 |
| 3 | [`arch/architecture.md`](arch/architecture.md) | 全体アーキテクチャ・構成 |
| 4 | [`arch/adr.md`](arch/adr.md) | 意思決定ログ |
| 5 | [`task-list.md`](task-list.md) | 次に着手するタスク・進捗確認 |
| 6 | [`arch/milestones.md`](arch/milestones.md) | マイルストーンと完了条件 (DoD) |

作業規約については [`../AGENTS.md`](../AGENTS.md) を参照してください。
