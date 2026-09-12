# Research Index

競合・参照技術の調査結果を保存するディレクトリです。

## 位置づけ

| 種別 | 役割 | 注意 |
|---|---|---|
| `*DEEP_RESEARCH.md` | 個別調査の詳細証跡 | URL / clone SHA / source 種別 / 読んだファイル一覧を確認する |

調査文書は設計の正本ではありません。採用判断は `docs/arch/` と計画書へ反映してから実装します。

## 文書一覧

| 文書 | 内容 |
|---|---|
| [`SHIATUBE_DEEP_RESEARCH.md`](./SHIATUBE_DEEP_RESEARCH.md) | しあTube (SiaTube) 完全調査(2026-09-12)。公開リポジトリ2件のフルクローンによるソース精読 + プロダクション API ライブ実測。アーキテクチャ(静的 SPA + 中央 API、yt-dlp/InnerTube)、API 形状実測、運営・コミュニティ、法的性質、競合エコシステム、本プロジェクトへの採用候補 10 パターン |

## ソース信頼度ルール

| 優先 | 種別 | 扱い |
|---:|---|---|
| 1 | 公式ドキュメント / 公式 metadata | 一次情報。仕様へ反映しやすい |
| 2 | clone 済み public GitHub repo | clone path、remote、HEAD、license、読んだファイルが記録されている場合のみ根拠にする |
| 3 | 公式ブログ / changelog | version 差に注意して使う |
| 4 | 技術記事 / forum / Reddit / SNS | 二次情報。単独では断定しない |
| 5 | live service 観測 | 読み取り専用 GET の範囲で。通信キャプチャ等はしない |
