# ytdl

**YouTube Proxy Site** — しあTube と同構成(静的フロントエンド + JSON 解決バックエンド)の **YouTube プロキシ閲覧サイト**。

## 特徴(予定)

- **再生は iframe 埋め込み**: `https://www.youtubeeducation.com/embed/{id}` を既定に、公式 embed へ差し替え可能な形で実装(しあTube の実コードで同方式を確認済み)。プレイヤー実装は薄く保つ
- **Material 3 Design Expressive** の UI/UX(+ GSAP モーション)
- バックエンドの役割は**メタデータ解決**(検索 / 動画情報 / 関連 / チャンネル / プレイリスト / コメント)。再生バイトはサーバーを通さない(再生はブラウザ ↔ YouTube 系で完結)
- **最初は Google Apps Script で運用** → クォータ等の壁が来たら自宅サーバー(Proxmox/LXC: Bun + Hono + Nginx)へ移行(将来オプション)
- ~~動画ダウンロード~~ = **保留**(2026-09-23 のユーザー決定。設計・調査は docs に保存)

## 現状

| フェーズ | 内容 | 状態 |
|---|---|---|
| Phase 0 | 基盤構築(Next.js + Tailwind + M3 スキャフォールド、GAS 後端 = メタデータ解決、単一 HTML ビルド) | 進行中(計画書: [`docs/planning/PHASE0_PLAN.md`](docs/planning/PHASE0_PLAN.md)) |
| Phase 1 | 再生(iframe プレイヤー + ブロック時フォールバック) | 未着手 |
| ~~Phase 2~~ | ~~ダウンロード機能~~ | **保留**(実装対象外) |
| Phase 3 | 機能拡張・ポリッシュ(しあTube 相当の閲覧機能) | 未着手 |
| Phase 4 | 自宅サーバー移行 | 未着手(将来オプション) |

進捗の正本: [`docs/task-list.md`](docs/task-list.md) ・ 設計正本: [`docs/planning/PHASE0_PLAN.md`](docs/planning/PHASE0_PLAN.md) ・ 引き継ぎ: [`docs/HANDOVER.md`](docs/HANDOVER.md)

**検証**: V1(GAS 抽出)= ✅ 完了 / V2(ブラウザ直接取得)= ✅ 完了(記録)/ **V5(iframe 到達性 + 検索・トレンド抽出)= 次に実行する必須キット**(`verification/v5*`)。実コード根拠: [`docs/research/SIATUBE_CODE_VERIFICATION.md`](docs/research/SIATUBE_CODE_VERIFICATION.md)

## 構成(予定)

```
apps/web         Next.js (App Router, output:'export') + Tailwind v4 + GSAP + Dexie
packages/shared  API client (GAS / fetch 双方向輸送) + types
backend/gas      Google Apps Script バックエンド (メタデータ解決 = /watch/ ページ抽出 + O9・プレーン JS)
backend/home     自宅サーバー (将来オプション: Bun + Hono + Nginx)
scripts/         単一 HTML ビルド (GAS 配信用)
```
