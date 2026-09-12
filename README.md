# ytdl

**YouTube Proxy Site** — しあTube と同構成(静的フロントエンド + JSON 解決バックエンド)の YouTube 代替視聴・ダウンロードサイト。

## 特徴(予定)

- **Material 3 Design Expressive** の UI/UX(+ GSAP モーション)
- **動画ダウンロード**: 拡張子(mp4/webm)・画質(144p〜4K)を選択してキューに追加。ブラウザ内で再エンコードなしのバッファリングなし書き出し(File System Access API / StreamSaver)
- 再生は DASH をネイティブ `<video>`+`<audio>` 2 要素で(CORS フリー)、ライブは m3u8/hls.js
- **最初は Google Apps Script で運用** → CORS / クォータ等の壁が来たら自宅サーバー(Proxmox/LXC: Bun + yt-dlp + Nginx)へ移行

## 現状

| フェーズ | 内容 | 状態 |
|---|---|---|
| Phase 0 | 基盤構築(Next.js + Tailwind + M3 スキャフォールド、GAS 後端 MVP、単一 HTML ビルド) | 進行中(計画書: [`docs/planning/PHASE0_PLAN.md`](docs/planning/PHASE0_PLAN.md)) |
| Phase 1 | 再生(DASH + フォールバック + ライブ) | 未着手 |
| Phase 2 | ダウンロード機能(キュー) | 未着手 |
| Phase 3 | 機能拡張・ポリッシュ | 未着手 |
| Phase 4 | 自宅サーバー移行 | 未着手 |

進捗の正本: [`docs/task-list.md`](docs/task-list.md) ・ 設計根拠: [`docs/research/SHIATUBE_DEEP_RESEARCH.md`](docs/research/SHIATUBE_DEEP_RESEARCH.md)

## 構成(予定)

```
apps/web         Next.js (App Router, output:'export') + Tailwind v4 + GSAP + Dexie
packages/shared  API client (GAS / fetch 双方向輸送) + types
backend/gas      Google Apps Script バックエンド (youtubei.js, embedded client)
backend/home     自宅サーバー (Phase 4: Bun + Hono + yt-dlp)
```
