# Task List(ytdl)

> 進捗の唯一の正本。各タスクの詳細は `docs/planning/` の計画書。
> 状態: `未着手` / `進行中` / `完了` / `停止(要判断)`

## 検証(Phase 0 着手前)

| ID | タスク | 証跡 | 状態 | 進捗 / 証拠 |
|---|---|---|---|---|
| V1-a | youtubei.js バンドル + Node 初期化(WEB_EMBEDDED_PLAYER 受入) | [VERIFICATION_P0.md](research/VERIFICATION_P0.md) | 完了 | 2026-09-12 / v18.0.0・1.3MB バンドル・create() 到達(通信はサンドボックス遮断) |
| V1-b | GAS 実環境でのストリーム解決(1080p 確認) | 同上 | 進行中 | **第 1 回(2026-09-13)失敗**: /embed/ に `ytInitialPlayerResponse` マーカーなし + player POST `playability ERROR`(reason 未記録)。→ **第 2 回待ち(ユーザー: あとで実行)**: `verification/v1b-gas-test.gs`(マーカー級联 + 4 client 比較 + reason 記録、setMimeType は enum 修正済み) |
| V2 | ブラウザ直接取得(CORS/Range/有効期限/codec) | 同上 | 進行中 | **第 1 回(2026-09-13・ユーザーの Android 実行)**: `<video>` 再生 **OK** / fetch(B・C・D)全て **Failed to fetch** → **CORS(ACAO 欠如)が最有力**。expire ≈5.9h 確認 / O3(他 IP 再生)解決。**第 2 回(v2b)はユーザー判断でスキップ**(DL をサーバー側パイプラインとするため; v2b ファイルは任意の残置物) |
| V3-a | GAS `?_sw=` ディスパッチの HTTP 契約検証 | 同上 | 完了 | 2026-09-12 / ローカル模倣で HTML・JS MIME 同居確認 |
| V3-b | script.google.com での SW 登録 | 同上 | 進行中 | **第 1 回**: ページが **text/plain として配信**され描画されず(リモートヘッダ確認済み) / **第 2 回**: v3b の `setMimeType(String)` が例外 — **GAS は `MimeType` 列挙型のみ受け付け**(O7)。enum 修正済み。→ **第 3 回待ち(参考)**: DL 設計確定で **GAS 期は StreamSaver 不使用(直リンク)** になったため「最重要」から**降格** = PWA/オフライン機能の判断材料。実行は任意・タイミングはユーザー次第(修正版 `verification/v3b-gas-test.gs` を新しいプロジェクトで、まず `?probe=1`) |
| V4 | iOS Safari 挙動 | 同上 | 進行中 | ユーザー実行待ち(任意): `verification/v2b-browser-test.html`(iOS の DL fallback = 直リンク設計の裏取り) |

> **設計判断の現状(2026-09-13)**: **DL 設計は確定済み(ユーザー承認)** — 自宅サーバーは siatube 型の動画全面プロキシにはしない(高負荷のため)、**再生経路は googlevideo 直(サーバー負荷ゼロ)**、DL のときだけサーバーが関与。「直リンク + StreamSaver + 進捗」の同時成立は技術的に不可能と調査で判明([DOWNLOAD_MECHANISM_RESEARCH.md](research/DOWNLOAD_MECHANISM_RESEARCH.md): StreamSaver は fetch 必須 = googlevideo 直 fetch は CORS 不可)。→ **GAS 期 = C(720p 以下直リンク)/ 自宅サーバー期 = A(DL 専用 relay + クライアント mux + StreamSaver + 進捗UI)主 + B(yt-dlp バッチ + 完成ファイル)補完 + C(iOS/FF fallback)**。計画書 §10.2/10.8/10.10 に反映済み。**残る未確定**: (1) v1b 後の GAS 期リゾラ戦略(siatube.com 依存 vs セルフ解決) (2) v3b 後の GAS からの SW 配信(**参考** = PWA/オフライン判断用)。**P00-D/P2/P4 の残りは (1)(2) で確定する**。詳細: [VERIFICATION_P0.md §設計への影響](research/VERIFICATION_P0.md)

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
| P2 | **ダウンロード機能**(Dexie キュー + mp4-muxer/webm-muxer(Worker)+ StreamSaver + 進捗UI + レジューム。フェーズ別: GAS 期=720p 以下直リンク / Phase B=方式 A 主 + B 補完 / iOS・FF=直リンク) | 未着手 |
| P3 | 機能拡張・ポリッシュ(チャンネル/プレイリスト/コメント/登録/履歴、M3 Expressive 全面展開) | 未着手 |
| P4 | 自宅サーバー移行(Bun + Hono + yt-dlp + SW + **`/dl` DL 専用 relay(方式 A・主) + `/jobs` バッチ(方式 B・補完)**) | 未着手 |

> 注: 計画書のサブタスク番号(P00-*)とはフェーズ番号(P1〜P4)が独立する。フェーズ計画書の作成時に本表と整合させる。
