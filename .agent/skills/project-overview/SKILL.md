---
name: project-overview
description: ytdl（YouTube プロキシサイト）の全体像（目標・2フェーズ運用・確定設計・フェーズ進捗）を掴む。新規セッションの最初に読む 1 スキル。
---

# Project Overview — ytdl

> 製品の全体像。新規セッションの最初に読む 1 ファイル。
> 設計の正本は [`../../../docs/planning/PHASE0_PLAN.md`](../../../docs/planning/PHASE0_PLAN.md)、
> 確定設計 D1〜D9 は [`../../../docs/HANDOVER.md`](../../../docs/HANDOVER.md) §4、
> 進捗の正本は [`../../../docs/task-list.md`](../../../docs/task-list.md)。

## 製品

**ytdl** は **YouTube プロキシサイト**（しあTube と同構成 = 静的フロントエンド + JSON 解決バックエンド）。

- **需要構造**（しあTube と同じ）: 学校のフィルタ回避・アカウント不要・広告なし・高画質視聴
- **差別化 2 点**:
  1. **動画ダウンロード機能**（拡張子 mp4/webm × 画質 144p〜4K × キュー管理。しあTube に無い）
  2. **Material 3 Design Expressive の UI + GSAP モーション**
- **法的スタンス**: 個人視聴の私的使用（日本著作権法第 30 条圏）を前提。保存・再配信・再エンコードはしない。
- **前提調査**: しあTube 完全調査（ソース精読 + API 実測）完了 →
  [`research/SHIATUBE_DEEP_RESEARCH.md`](../../../docs/research/SHIATUBE_DEEP_RESEARCH.md)

## 2 フェーズ運用（確定）

| | Phase A（GAS 期・MVP・**現在**） | Phase B（自宅サーバー期・移行後） |
|---|---|---|
| 配信 | 静的**単一 HTML** + `script.google.com` GAS Web アプリ | Proxmox VE / LXC + Nginx（静的配信 + API） |
| 後端 | GAS `doGet(e)` が 2 役: ① HTML 配信 ② `?api=` JSON ディスパッチ（+ google.script.run RPC） | Bun + Hono API（`fetch` 通常運用 + CORS ヘッダ） |
| リゾラ | **`/watch/` ページ抽出 + signature decipherer + O9**（V1 検証で確定・プレーン JS） | yt-dlp（組込み済み・PO token 対応） |
| 再生 | **googlevideo 直読み**（`<video>`+`<audio>` 2 要素 DASH、muxed 360p 既定 / m3u8 ライブのみ hls.js） | 同左（全フェーズ共通・サーバー関与ゼロ） |
| DL | **720p 以下 muxed 直リンクのみ**（itag 22/37 なし実測 → itag 18 = 360p が対象） | **方式 A 主**（/dl DL 専用 relay → Worker mux → StreamSaver → 進捗UI）+ **B 補完**（yt-dlp バッチ）+ **C**（iOS/FF 直リンク） |
| 移行トリガー | GAS クォータ到達 / googlevideo ブロック / PO token 必須化 / decipherer 破損（R1） / DL 本格利用 | - |

## 技術スタック（要点・PHASE0_PLAN §10.4）

| 層 | 採用 |
| :--- | :--- |
| パッケージ管理 | **pnpm (workspaces)**（`apps/` + `packages/`） |
| フロントエンド | **Next.js（App Router、`output:'export'`）+ React** |
| スタイリング / モーション / 永続化 | **Tailwind CSS v4**（`@theme` で M3 トークン）/ **GSAP 3.13** / **Dexie.js 4** |
| 再生 / DL | ネイティブ DASH + hls.js / mp4-muxer・webm-muxer（Worker・再エンコードなし）+ StreamSaver.js（Phase B 主経路・**Chromium 系のみ**） |
| バックエンド | GAS = **プレーン JS**（npm 不可）/ 自宅 = **Bun + Hono + yt-dlp + Nginx** |
| 品質 | TypeScript / biome / vitest |

## 確定設計（再議論禁止・詳細は HANDOVER §4）

- **D1** 再生 = DASH 2 要素 + **全フェーズで googlevideo 直読み**
- **D2** リゾラ = **自前実装**（siatube.com API **不使用**）。Phase A = watch 抽出 + decipherer + O9
- **D3/D4/D5** DL = Phase B で A 主 + B 補完 / GAS 期 = 720p 以下直リンク / iOS・FF = 直リンク
- **D6** **relay は DL のときのみ・再生には一切使用しない**（常設制約）
- **D7** 対策ラダー（client / version / PO token / watch 抽出）。R1 = decipherer churn
- **D8** v2b = スキップ（**再提案しない**）/ **D9** FSA は主経路にしない
- **4 設計原則**（絶対表現禁止を含む）= AGENTS.md §6.4 / PHASE0_PLAN §10.2

## フェーズ進捗

> 正本は [`docs/task-list.md`](../../../docs/task-list.md)。下表は要点のみ。

| フェーズ | 内容 | 状態 |
| :--- | :--- | :--- |
| 検証（P0 着手前） | V1（GAS 解決）= ✅ 完了（6 ラウンド・v1f）/ V2（CORS）= ✅ 部分判定で確定 / V3-b・V4 = 任意 | **完了**（2026-09-15） |
| **P00** | 基盤構築（B: web スキャフォールド / C: shared / D: GAS 後端 / E: 単一 HTML / F: M3 基線） | **未着手 = ユーザー GO 待ち**（順: B→C→F→E→D。D 冒頭 = 復号済み URL fetch スパイク） |
| P1 | 再生（DASH + フォールバック + hls.js ライブ） | 未着手 |
| P2 | **ダウンロード機能**（キュー + muxer + StreamSaver + 進捗UI + レジューム） | 未着手 |
| P3 | 機能拡張・ポリッシュ | 未着手 |
| P4/P5 | 自宅サーバー移行（Phase B） | 未着手 |

## リポジトリ構成（PHASE0_PLAN §10.5）

```
ytdl/
├── AGENTS.md / README.md
├── .agent/                 # 記憶システム（hooks / skills / logs ※ logs に cod-web 由来の過去ログ = 参照のみ）
├── .archive/cod-web-docs/  # cod-web（別プロジェクト）由来文書 = 参照のみ・変更禁止
├── docs/                   # planning(設計正本) / research(証跡) / task-list(進捗正本) / HANDOVER(入口)
├── verification/           # 検証キット + 生結果（1 ファイル = 最新のみ）
├── apps/web                # (P00-B) Next.js (App Router, output:'export')
├── packages/shared         # (P00-C) API client(双方向輸送) + types + itag/codec 定数
├── backend/gas             # (P00-D) GAS: doGet + resolver/(watch 抽出 + decipherer)
├── backend/home            # (P5) Bun/Hono + yt-dlp + /dl relay + sw/
└── scripts/                # (P00-E) build-single-file.ts
```

## 関連

- 開発規約: [`../../../AGENTS.md`](../../../AGENTS.md)
- 引き継ぎ入口: [`../../../docs/HANDOVER.md`](../../../docs/HANDOVER.md)（§14 = 新セッション初回プロンプト）
- タスク正本: [`../../../docs/task-list.md`](../../../docs/task-list.md)
