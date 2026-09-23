# ytdl

**YouTube Proxy Site** — しあTube と同系統の **YouTube プロキシ閲覧サイト**。
**再生はクライアント側の iframe 埋め込み**、**メタデータは自前のサーバー API** が担う構成です（動画バイトは中継しません）。

## 特徴(予定)

- **再生は iframe 埋め込み**: `https://www.youtubeeducation.com/embed/{id}` を既定に、公式 embed へ差し替え可能な形で実装(しあTube の実コードで同方式を確認済み)。プレイヤー実装は薄く保つ
- **最初からサーバーを立てて構築**(2026-09-23 のユーザー決定): 自宅 **Proxmox(LXC/VM)** 上に **Docker Compose** で **Nginx + Bun(Hono) API** を配備する。**GAS 期は設けない**(GAS の検証資産は参考として保存)
- **メタデータ解決 = youtubei.js(InnerTube クライアント)**: 検索・動画・チャンネル・プレイリストなどの情報を取得する(第三者 API は使わない)。**yt-dlp は将来のダウンロード機能で使う**
- **Material 3 Design Expressive** の UI/UX(+ GSAP モーション)
- 再生バイトはサーバーを通さない(再生はブラウザ ↔ YouTube 系で完結 = サーバーはメタデータとキャッシュのみ)
- ~~動画ダウンロード~~ = **保留**(2026-09-23 のユーザー決定。設計・調査は docs に保存)

## 現状

| フェーズ | 内容 | 状態 |
|---|---|---|
| Phase 0 | 基盤構築(**サーバー骨格(Bun + Hono + Docker Compose + Nginx)** + メタデータ API + web スキャフォールド + M3 基線) | 進行中(計画書: [`docs/planning/PHASE0_PLAN.md`](docs/planning/PHASE0_PLAN.md)) |
| Phase 1 | 再生(iframe プレイヤー + ブロック時のフォールバック)+ 閲覧機能の接続 | 未着手 |
| ~~Phase 2~~ | ~~ダウンロード機能~~ | **保留**(実装対象外) |
| Phase 3 | 機能拡張・ポリッシュ(しあTube 相当の閲覧機能) | 未着手 |

進捗の正本: [`docs/task-list.md`](docs/task-list.md) ・ 設計正本: [`docs/planning/PHASE0_PLAN.md`](docs/planning/PHASE0_PLAN.md) ・ 引き継ぎ: [`docs/HANDOVER.md`](docs/HANDOVER.md)

**検証**: V1〜V4(GAS 期)= ✅ 完了(記録。**現行スコープでは参照**)/ **V5 = ブラウザ側の iframe 到達性(実行待ち)** / **V6 = youtubei.js / InnerTube の前提確認(サーバー側・実行待ち)**。

## 構成(予定)

```
apps/web         Next.js (App Router, output:'export') + Tailwind v4 + GSAP + Dexie
apps/api         Bun + Hono = メタデータ API(youtubei.js + O9 = キャッシュ/リトライ/single-flight)
packages/shared  API client(fetch 輸送)+ types + エラー分類
deploy/          Docker Compose(nginx / api)+ Proxmox 配備手順・TLS
scripts/         任意: 単一 HTML ビルド(ミラー配布用)
```

> 旧 GAS 構成(`backend/gas`・単一 HTML 配布)は **2026-09-23 の「最初からサーバー」決定により実装しません**
> (GAS の検証キットと証跡は `verification/` と `docs/research/` に保存)
