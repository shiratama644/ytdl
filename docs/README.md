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
│   ├── _TEMPLATE.md                   # 計画書テンプレート (新規計画書は必ず本形式)
│   └── SEARCH_UI_REDESIGN_PLAN.md     # 検索UIリファクタリング & 次世代デザイン刷新
└── ops/                               # 運用メモ (デプロイ・CI 等、必要時に追加)
```

ytdl ではタスクを [`AGENTS.md`](../AGENTS.md) §5 の完了条件で管理します。個別の設計検討（視聴・ダウンロード・
プレイヤー・プロキシ等）が必要になったときだけ、`planning/` に計画書を都度作成します。

---

## 📋 ドキュメント種別

| 種別 | 場所 | 用途 |
| --- | --- | --- |
| 計画書 | `docs/planning/{TOPIC}_PLAN.md` | 着手前に作成する詳細設計・検討記録。新規は `_TEMPLATE.md` 形式 |
| 運用メモ | `docs/ops/*.md` | デプロイ・CI・本番運用の手順書。実際にデプロイする際に参照 |

現在の計画書:

- [`docs/planning/SEARCH_UI_REDESIGN_PLAN.md`](./planning/SEARCH_UI_REDESIGN_PLAN.md) — 検索UIリファクタリング & 次世代デザイン刷新

## 命名規約

- 計画書テンプレート: `_TEMPLATE.md`（固定）
- 計画書: `{TOPIC}_PLAN.md`（例: `DASH_STREAMING_PLAN.md`, `DOWNLOAD_QUEUE_PLAN.md`）
- 運用: 大文字スネークケース（例: `DEPLOY.md`, `CI_SETUP.md`）

---

*新規ドキュメントを追加したら本 README を更新してください。*
