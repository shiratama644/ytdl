---
name: project-overview
description: ytdl（YouTube プロキシ閲覧サイト）の全体像（目標・2フェーズ運用・設計判断と状態・フェーズ進捗）を掴む。新規セッションの最初に読む 1 スキル。
---

# Project Overview — ytdl

> 製品の全体像。新規セッションの最初に読む 1 ファイル。
> 設計の正本は [`../../../docs/planning/PHASE0_PLAN.md`](../../../docs/planning/PHASE0_PLAN.md)、
> 設計判断 D1〜D9（+ 状態）は [`../../../docs/HANDOVER.md`](../../../docs/HANDOVER.md) §4、
> 進捗の正本は [`../../../docs/task-list.md`](../../../docs/task-list.md)。

## 製品

**ytdl** は **YouTube プロキシサイト**（しあTube と同構成 = 静的フロントエンド + JSON 解決バックエンド）。

- **需要構造**（しあTube と同じ）: 学校のフィルタ回避・アカウント不要・広告なし・高画質視聴
- **再生方式（2026-09-23 改訂）**: **iframe 埋め込み**（`https://www.youtubeeducation.com/embed/{id}` を既定・
  公式 embed に差し替え可能）。しあTube 実コード（`ajgpw/siatube@44ab1599`）で同方式を確認済み
- **差別化**: **Material 3 Design Expressive の UI + GSAP モーション**（~~動画ダウンロード~~ = 2026-09-23 に**保留**）
- **機能範囲**: しあTube 相当フル（トレンド / 検索+サジェスト / 視聴+関連+コメント / チャンネル /
  プレイリスト / 履歴 / 登録 / 設定。DL を除く）
- **法的スタンス**: 個人視聴の私的使用（日本著作権法第 30 条圏）を前提。保存・再配信・再エンコードはしない。
- **前提調査**: しあTube 完全調査（ソース精読 + API 実測）→
  [`research/SHIATUBE_DEEP_RESEARCH.md`](../../../docs/research/SHIATUBE_DEEP_RESEARCH.md) /
  **実コード確認（iframe 方式・2026-09-23）** → [`research/SIATUBE_CODE_VERIFICATION.md`](../../../docs/research/SIATUBE_CODE_VERIFICATION.md)

## 2 フェーズ運用（確定）

| | Phase A（GAS 期・MVP・**現在**） | Phase B（自宅サーバー期・**将来オプション**） |
|---|---|---|
| 配信 | 静的**単一 HTML** + `script.google.com` GAS Web アプリ | Proxmox VE / LXC + Nginx（静的配信 + API） |
| 後端 | GAS `doGet(e)` が 2 役: ① HTML 配信 ② `?api=` JSON ディスパッチ（+ google.script.run RPC） | Bun + Hono API（`fetch` 通常運用 + CORS ヘッダ） |
| メタデータ | **`/watch/` ページ抽出 + O9**（V1 検証で確定・プレーン JS）。検索/トレンド = **V5 で検証** | 同左（キャッシュ・強化） |
| 再生 | **iframe 埋め込み**（`youtubeeducation.com/embed` 既定・公式 embed 差し替え可 = D1 改訂） | 同左（全フェーズ共通・サーバー関与なし） |
| DL | ~~720p 以下 muxed 直リンク~~ = **保留** | ~~方式 A/B/C~~ = **保留** |
| 移行トリガー | GAS クォータ到達 / メタデータ経路の限界 / V5 の結果次第 | - |

## 技術スタック（要点・PHASE0_PLAN §10.4）

| 層 | 採用 |
| :--- | :--- |
| パッケージ管理 | **pnpm (workspaces)**（`apps/` + `packages/`） |
| フロントエンド | **Next.js（App Router、`output:'export'`）+ React** |
| スタイリング / モーション / 永続化 | **Tailwind CSS v4**（`@theme` で M3 トークン）/ **GSAP 3.13** / **Dexie.js 4** |
| 再生 | **iframe 埋め込み**（`youtubeeducation.com/embed` 既定・公式 embed 差し替え可）。直リンク DASH / hls.js = **保留** |
| ~~DL~~ | **保留**（mp4-muxer / webm-muxer / StreamSaver は docs に保存） |
| バックエンド | GAS = **プレーン JS**（npm 不可・メタデータ抽出）/ 自宅 = **Bun + Hono + Nginx**（将来オプション） |
| 品質 | TypeScript / biome / vitest |

## 確定設計（再議論禁止・詳細は HANDOVER §4）

- **D1【改訂 2026-09-23】** 再生 = **iframe 埋め込み**（`youtubeeducation.com/embed` 既定・公式 embed 差し替え可）。直リンク DASH = **保留**
- **D2【改訂 2026-09-23】** バックエンド = **自前実装**（siatube.com API 不使用は継続）。役割 = **メタデータ解決**（`/watch/` 抽出 = V1 実証済み）。decipherer = **保留**
- **D3/D4/D5/D9【保留】** DL 関連（方式 A/B/C・FSA・muxer・StreamSaver）
- **D6【改訂】** 再生経路のサーバー中継をしない（iframe で確定）。DL relay = **保留**
- **D7【保留】** 直リンク/復号の対策ラダー（再開時に再開）
- **D8【継続】** v2b = スキップ（**再提案しない**）
- **4 設計原則**（絶対表現禁止を含む）= AGENTS.md §6.4 / PHASE0_PLAN §10.2（原則 2・3 は DL に紐づく）

## フェーズ進捗

> 正本は [`docs/task-list.md`](../../../docs/task-list.md)。下表は要点のみ。

| フェーズ | 内容 | 状態 |
| :--- | :--- | :--- |
| 検証（P0 着手前） | V1（GAS 抽出）= ✅ 完了（v1f）/ V2（CORS）= ✅ 完了（記録）/ **V5（iframe 到達性 + 検索・トレンド抽出）= 未着手 = 次に実行** | **V5 待ち** |
| **P00** | 基盤構築（B: web / C: shared / D: GAS 後端 = メタデータ / E: 単一 HTML / F: M3 基線） | **未着手 = ユーザー GO 待ち**（推奨順: B→C→F→E→D） |
| P1 | 再生（iframe プレイヤー + ブロック時フォールバック） | 未着手 |
| ~~P2~~ | ~~ダウンロード機能~~ | **保留** |
| P3 | 機能拡張・ポリッシュ（しあTube 相当の閲覧機能） | 未着手 |
| P4/P5 | 自宅サーバー移行 | 未着手（将来オプション） |

## リポジトリ構成（PHASE0_PLAN §10.5）

```
ytdl/
├── AGENTS.md / README.md
├── .agent/                 # 記憶システム（hooks / skills / logs）
├── docs/                   # planning(設計正本) / research(証跡) / task-list(進捗正本) / HANDOVER(入口)
├── verification/           # 検証キット + 生結果（1 ファイル = 最新のみ）
├── apps/web                # (P00-B) Next.js (App Router, output:'export')
├── packages/shared         # (P00-C) API client(双方向輸送) + types + itag/codec 定数
├── backend/gas             # (P00-D) GAS: doGet + resolver/(watch 抽出 = メタデータ)
├── backend/home            # (P5・将来オプション) Bun/Hono + Nginx
└── scripts/                # (P00-E) build-single-file.ts
```

## 関連

- 開発規約: [`../../../AGENTS.md`](../../../AGENTS.md)
- 引き継ぎ入口: [`../../../docs/HANDOVER.md`](../../../docs/HANDOVER.md)（§14 = 新セッション初回プロンプト）
- タスク正本: [`../../../docs/task-list.md`](../../../docs/task-list.md)
