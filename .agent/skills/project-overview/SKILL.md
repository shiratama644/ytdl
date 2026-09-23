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

## 構成（確定・2026-09-23 = サーバー一本）

| 要素 | 採用（D10〜D12） |
|---|---|
| 配備 | **自宅 Proxmox(LXC/VM)** + **Docker Compose**（`nginx` + `api`）。**GAS 期は設けない**（GAS は実装しない） |
| 配信 | **Nginx** が静的配信（Next.js `output:'export'`）+ `/api/*` を api へ転送 + TLS |
| API | **Bun + Hono**（`apps/api`）= **メタデータ解決のみ**（再生バイトは中継しない） |
| メタデータ | **yt-dlp 主**(`--dump-single-json` を子プロセス)+ **ページ抽出フォールバック**(V1-d のアルゴリズム)+ **O9** |
| 再生 | **iframe 埋め込み**(`youtubeeducation.com/embed` 既定・公式 embed 差し替え可 = D1)。サーバー関与なし |
| DL | ~~720p 以下 muxed 直リンク / 方式 A・B・C~~ = **保留**(実装対象外) |
| 未検証 | **V5**(ブラウザ側 iframe 到達性)/ **V6**(サーバー側メタデータ取得)= 実行待ち |

## 技術スタック（要点・PHASE0_PLAN §10.4）

| 層 | 採用 |
| :--- | :--- |
| パッケージ管理 | **pnpm (workspaces)**（`apps/` + `packages/`） |
| フロントエンド | **Next.js（App Router、`output:'export'`）+ React** |
| スタイリング / モーション / 永続化 | **Tailwind CSS v4**（`@theme` で M3 トークン）/ **GSAP 3.13** / **Dexie.js 4** |
| 再生 | **iframe 埋め込み**（`youtubeeducation.com/embed` 既定・公式 embed 差し替え可）。直リンク DASH / hls.js = **保留** |
| ~~DL~~ | **保留**（mp4-muxer / webm-muxer / StreamSaver は docs に保存） |
| サーバー | **Bun + Hono**（API・`apps/api`）/ **Nginx**（TLS・静的配信・転送）/ **Docker Compose** + **Proxmox(LXC/VM)** / **yt-dlp**（メタデータの主経路） |
| 品質 | TypeScript / biome / vitest |

## 確定設計（再議論禁止・詳細は HANDOVER §4）

- **D1【改訂 2026-09-23】** 再生 = **iframe 埋め込み**（`youtubeeducation.com/embed` 既定・公式 embed 差し替え可）。直リンク DASH = **保留**
- **D2【改訂 2026-09-23】** バックエンド = **自前実装**（siatube.com API 不使用は継続）。役割 = **メタデータ解決**（**yt-dlp 主 + ページ抽出フォールバック** = D11）。decipherer = **保留**
- **D3/D4/D5/D9【保留】** DL 関連（方式 A/B/C・FSA・muxer・StreamSaver）
- **D6【改訂】** 再生経路のサーバー中継をしない（iframe で確定）。サーバーの役割 = メタデータ解決とキャッシュ。DL relay = **保留**
- **D10【新規 2026-09-23】** **サーバー一本**（自宅 Proxmox + Docker Compose = Nginx + Bun/Hono）。**GAS 期を設けず、GAS 版は実装しない**
- **D11【新規 2026-09-23】** メタデータ = **yt-dlp 主 + ページ抽出フォールバック**（第三者 API 不使用）
- **D12【新規 2026-09-23】** クライアント配信 = **Nginx の静的配信**（単一 HTML 化は任意 = ミラー用）
- **D7【保留】** 直リンク/復号の対策ラダー（再開時に再開）
- **D8【継続】** v2b = スキップ（**再提案しない**）
- **4 設計原則**（絶対表現禁止を含む）= AGENTS.md §6.4 / PHASE0_PLAN §10.2（原則 2・3 は DL に紐づく）

## フェーズ進捗

> 正本は [`docs/task-list.md`](../../../docs/task-list.md)。下表は要点のみ。

| フェーズ | 内容 | 状態 |
| :--- | :--- | :--- |
| 検証（P0 着手前） | V1〜V4（旧 GAS 期）= ✅ 完了（記録。抽出アルゴリズムは継承）/ **V5（ブラウザ側 iframe 到達性）・V6（サーバー側メタデータ取得）= 未着手 = 次に実行** | **V5 / V6 待ち** |
| **P00** | 基盤構築（B: サーバー骨格 = Bun/Hono + Compose / C: web + shared / D: メタデータ解決 / E: 配備 / F: M3 基線） | **未着手 = ユーザー GO 待ち**（推奨順: B→C→D→E→F） |
| P1 | 再生（iframe プレイヤー + ブロック時フォールバック）+ 閲覧機能の接続 | 未着手 |
| ~~P2~~ | ~~ダウンロード機能~~ | **保留** |
| P3 | 機能拡張・ポリッシュ（しあTube 相当の閲覧機能） | 未着手 |

## リポジトリ構成（PHASE0_PLAN §10.5）

```
ytdl/
├── AGENTS.md / README.md
├── .agent/                 # 記憶システム（hooks / skills / logs）
├── docs/                   # planning(設計正本) / research(証跡) / task-list(進捗正本) / HANDOVER(入口)
├── verification/           # 検証キット + 生結果（1 ファイル = 最新のみ。V5 = ブラウザ / V6 = サーバー）
├── apps/api                # (P00-B) Bun + Hono = メタデータ API（yt-dlp 主 + ページ抽出フォールバック + O9）
├── apps/web                # (P00-C) Next.js (App Router, output:'export')
├── packages/shared         # (P00-C) API client + types + 定数
├── deploy/                 # (P00-E) docker-compose.yml / nginx.conf / proxmox 手順
└── scripts/                # 任意: build-single-file.ts（ミラー配布用）
```

## 関連

- 開発規約: [`../../../AGENTS.md`](../../../AGENTS.md)
- 引き継ぎ入口: [`../../../docs/HANDOVER.md`](../../../docs/HANDOVER.md)（§14 = 新セッション初回プロンプト）
- タスク正本: [`../../../docs/task-list.md`](../../../docs/task-list.md)
