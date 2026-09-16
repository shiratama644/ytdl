# Research Index

競合・参照技術の調査結果を保存するディレクトリです。

## 位置づけ

| 種別 | 役割 | 注意 |
|---|---|---|
| `*DEEP_RESEARCH.md` | 個別調査の詳細証跡 | URL / clone SHA / source 種別 / 読んだファイル一覧を確認する |

調査文書は設計の正本ではありません。採用判断は計画書（`docs/arch/` が存在する場合はそれ）へ反映してから実装します。

## 文書一覧

| 文書 | 内容 |
|---|---|
| [`SHIATUBE_DEEP_RESEARCH.md`](./SHIATUBE_DEEP_RESEARCH.md) | しあTube (SiaTube) 完全調査(2026-09-12)。公開リポジトリ2件のフルクローンによるソース精読 + プロダクション API ライブ実測。アーキテクチャ(静的 SPA + 中央 API、yt-dlp/InnerTube)、API 形状実測、運営・コミュニティ、法的性質、競合エコシステム、本プロジェクトへの採用候補 10 パターン |
| [`VERIFICATION_P0.md`](./VERIFICATION_P0.md) | P0 検証証跡(2026-09-12〜)。V1〜V4 の実施記録(サンドボックス + ユーザー実行)。再生経路 OK / ブラウザ fetch は CORS 不可(最有力)/ GAS 実環境の複数制約(setMimeType は enum のみ等) |
| [`DOWNLOAD_MECHANISM_RESEARCH.md`](./DOWNLOAD_MECHANISM_RESEARCH.md) | DL 機構調査(2026-09-13)。StreamSaver.js の機構要件(SW+fetch+ReadableStream、Chromium 系のみ)、googlevideo の CORS 実態(本検証 + Invidious/Piped 実務証拠)、直リンクの制約(クロスオリジン download 属性無効・進捗UI 不可)、実現可能方式 A(relay+クライアントmux)/ B(サーバーmuxバッチ)/ C(直リンク) の比較とフェーズ別提案 |

## ソース信頼度ルール

| 優先 | 種別 | 扱い |
|---:|---|---|
| 1 | 公式ドキュメント / 公式 metadata | 一次情報。仕様へ反映しやすい |
| 2 | clone 済み public GitHub repo | clone path、remote、HEAD、license、読んだファイルが記録されている場合のみ根拠にする |
| 3 | 公式ブログ / changelog | version 差に注意して使う |
| 4 | 技術記事 / forum / Reddit / SNS | 二次情報。単独では断定しない |
| 5 | live service 観測 | 読み取り専用 GET の範囲で。通信キャプチャ等はしない |
