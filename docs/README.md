# ytdl ドキュメント索引

ytdl のドキュメント一式を種類別に整理したものです。ルート [`README.md`](../README.md) からアプリの概要へアクセスできます。
開発規約（コミット手順・検証・Git 運用・コミュニケーション）は [`AGENTS.md`](../AGENTS.md)、
Agent のコードベース知識は [`.agent/`](../.agent/) を参照してください。

---

## 📂 ディレクトリ構造

```
docs/
├── README.md                          ← 本ファイル (全ドキュメントの目次)
├── planning/                          # 計画書 (必要時に _TEMPLATE.md 形式で作成)
│   └── _TEMPLATE.md                   # 計画書テンプレート (新規計画書は必ず本形式)
└── ops/                               # 運用メモ (デプロイ・CI 等、必要時に追加)
```

> 注: dropmod 由来の「フェーズ別計画書 (`PHASE*_PLAN.md`)/完了レポート/監査 (`audit/`)」は
> dropmod 固有の進捗記録であり、ytdl には当てはまらないため**導入していません**。
> ytdl ではタスクを [`AGENTS.md`](../AGENTS.md) §5 の完了条件で管理し、必要な計画書を `planning/` に
> 都度作成する方針です。既存計画書の書式だけ `_TEMPLATE.md` として流用しています。

---

## 目標のドキュメント種別

| 種別 | 場所 | 用途 |
| --- | --- | --- |
| 計画書 | `docs/planning/{TOPIC}_PLAN.md` | 着手前に作成する詳細設計・検討記録。新規は `_TEMPLATE.md` 形式 |
| 運用メモ | `docs/ops/*.md` | デプロイ・CI・本番運用の手順書。実際にデプロイする際に参照 |
| 監査 / 差分 | `docs/audit/*.md` | 実装と計画の齟齬・発見したバグの記録（必要時に作成） |

## 命名規約

- 計画書テンプレート: `_TEMPLATE.md`（固定）
- 計画書: `{TOPIC}_PLAN.md`（例: `DASH_STREAMING_PLAN.md`）
- 運用: 大文字スネークケース（例: `DEPLOY.md`, `CI_SETUP.md`）
- 監査（差分）: `diff-{context}.md`
- 監査（バグ）: `issues-{context}.md`

---

*この索引は 2026-09-07 に dropmod の `docs/README.md` を基に作成・翻案したものです。*
*新規ドキュメントを追加したら本 README を更新してください。*
