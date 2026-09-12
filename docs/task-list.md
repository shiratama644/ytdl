# Task List(ytdl)

> 進捗の唯一の正本。各タスクの詳細は `docs/planning/` の計画書。
> 状態: `未着手` / `進行中` / `完了` / `停止(要判断)`

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
