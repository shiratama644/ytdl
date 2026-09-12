# Task List(ytdl)

> 進捗の唯一の正本。各タスクの詳細は `docs/planning/` の計画書。
> 状態: `未着手` / `進行中` / `完了` / `停止(要判断)`

## 検証(Phase 0 着手前)

| ID | タスク | 証跡 | 状態 | 進捗 / 証拠 |
|---|---|---|---|---|
| V1-a | youtubei.js バンドル + Node 初期化(WEB_EMBEDDED_PLAYER 受入) | [VERIFICATION_P0.md](research/VERIFICATION_P0.md) | 完了 | 2026-09-12 / v18.0.0・1.3MB バンドル・create() 到達(通信はサンドボックス遮断) |
| V1-b | GAS 実環境でのストリーム解決(1080p 確認) | 同上 | 進行中 | ユーザー実行待ち: `verification/v1-gas-test.gs` |
| V2 | ブラウザ直接取得(CORS/Range/有効期限/codec) | 同上 | 進行中 | ユーザー実行待ち: `verification/v2-browser-test.html` |
| V3-a | GAS `?_sw=` ディスパッチの HTTP 契約検証 | 同上 | 完了 | 2026-09-12 / ローカル模倣で HTML・JS MIME 同居確認 |
| V3-b | script.google.com での SW 登録(StreamSaver 経路) | 同上 | 進行中 | ユーザー実行待ち(最重要): `verification/v3-gas-test.gs` |
| V4 | iOS Safari 挙動 | 同上 | 進行中 | ユーザー実行待ち(任意): 同一 HTML |

## Phase 0: 基盤構築

| ID | タスク | 計画書 | 状態 | 進捗 / 証拠 |
|---|---|---|---|---|
| P00-A | リポジトリ再編成(cod-web ゲーム文書 `.archive/` 退避、docs 再編成) | [PHASE0_PLAN.md](planning/PHASE0_PLAN.md) | 完了 | 2026-09-12 退避・README/task-list 再編成 |
| P00-B | web スキャフォールド(Next.js + Tailwind v4 + M3 トークン + GSAP) | 同上 | 未着手 | |
| P00-C | packages/shared(API client 双方向輸送 + types) | 同上 | 未着手 | |
| P00-D | GAS 後端(doGet ディスパッチ + youtubei.js embedded client 検証) | 同上 | 未着手 | |
| P00-E | 単一 HTML ビルド + GAS デプロイ手順 | 同上 | 未着手 | |
| P00-F | M3 Expressive 基線(ホーム / watch スケルトン) | 同上 | 未着手 | |

## 以降のフェーズ(要約、詳細計画書は着手前に作成)

| フェーズ | 内容 | 状態 |
|---|---|---|
| P1 | 再生(DASH 2 要素 + muxed フォールバック + hls.js ライブ) | 未着手 |
| P2 | **ダウンロード機能**(Dexie キュー + mp4-muxer/webm-muxer + FSA/StreamSaver + レジューム) | 未着手 |
| P3 | 機能拡張・ポリッシュ(チャンネル/プレイリスト/コメント/登録/履歴、M3 Expressive 全面展開) | 未着手 |
| P4 | 自宅サーバー移行(Bun + Hono + yt-dlp + SW + 任意 relay) | 未着手 |

> 注: 計画書のサブタスク番号(P00-*)とはフェーズ番号(P1〜P4)が独立する。フェーズ計画書の作成時に本表と整合させる。
