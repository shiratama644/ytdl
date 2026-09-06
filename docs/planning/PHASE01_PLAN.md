# Phase 1: YouTube Proxy 基盤・API・Web クライアント実装

> 対応 task-list ID: `P1-A` 〜 `P1-E` (docs/task-list.md)
> 計画書テンプレート: docs/planning/_TEMPLATE.md 準拠

## 1. 開始前確認

- 現在のブランチ: `arena/01a07701-ytdl`
- パッケージマネージャー: **bun**（`npm install -g bun` 済み）
- 関連仕様: `docs/arch/` (`product.md`, `architecture.md`, `engineering.md`, `adr.md`)

## 2. 目的 (Why)

低スペックサーバーでも軽快に動作する YouTube Proxy サービスを構築する。
`youtubei.js` を用いた軽量 Hono バックエンドで検索・詳細取得・Range対応ストリーミングプロキシを提供し、Vite + React + TypeScript + Tailwind CSS による高速かつ直感的な Web クライアントを実装する。

## 3. 変更範囲 (Scope)

変更対象:
- `package.json`, `tsconfig.json`, `vite.config.ts`, `biome.json`, `vitest.config.ts` のセットアップ
- `server/`: Hono サーバー、`youtubei.js` 連携、検索 API、動画詳細 API、ストリーミングプロキシ (Range requests 対応)
- `src/`: React クライアント (Home/Trending, Search, Watch, Player, 関連動画, 検索サジェスト)
- `shared/`: API 型定義・定数
- `_tests_/`: サーバーおよびクライアントのユニットテスト

変更しない（境界外）:
- ユーザー認証・データベース
- コメント投稿やいいね等の YouTube 書き込み操作

## 4. 禁止事項

- `any` の安易な使用や型エラーの握りつぶし
- サーバー側での動画全量バッファ（メモリ圧迫防止のため必ず ReadableStream で中継する）
- YouTube 以外のドメインへのオープンプロキシ化

## 5. 完了条件 (DoD)

- [ ] `bun run typecheck` PASS (0 errors)
- [ ] `bunx biome check .` PASS (0 errors)
- [ ] `bun run test:unit` PASS
- [ ] `bun run build` 成功
- [ ] ホーム画面でおすすめ/トレンド動画が表示される
- [ ] 検索バーからキーワード検索およびサジェストが機能する
- [ ] 検索結果から動画を選択してプロキシ経由で動画再生ができる
- [ ] 視聴画面で関連動画が表示され、別の動画へ遷移して再生できる

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit (vitest) | `bun run test:unit` | ストリーム Range 計算、API レスポンスフォーマッタ、URL パーサー、ユーティリティ |
| Build (vite) | `bun run build` | クライアント SPA の production バンドル生成 |
| Typecheck | `bun run typecheck` | TypeScript strict 型チェック |
| Lint | `bunx biome check .` | Biome コード規約検証 |

## 7. 停止条件

- `youtubei.js` のストリーミング取得で未解決のエラーが発生した場合
- サンドボックス環境でネットワークが完全遮断されテストが進行不能になった場合

## 8. 完了時に行うこと

1. 4 検証（typecheck / biome / test:unit / build）の実行
2. `docs/task-list.md` と `docs/planning/HANDOFF.md` の更新
3. `.agent/logs/` へのタスク完了ログ記録
4. セッション固定ブランチへの commit & push

## 9. サブタスク分割

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| P1-A | プロジェクト初期化 & ツールチェーン構築 | `package.json`, `tsconfig.json`, `vite.config.ts`, `biome.json`, `vitest.config.ts` | なし |
| P1-B | 共有型定義 & バックエンド YouTube プロキシ実装 | `shared/types.ts`, `server/yt.ts`, `server/index.ts`, `server/routes/*.ts` | P1-A |
| P1-C | フロントエンド UI & プレイヤー実装 | `src/components/*`, `src/pages/*`, `src/services/api.ts` | P1-B |
| P1-D | テストスイート構築 & 検証 | `_tests_/**/*.test.ts`, `_tests_/**/*.test.tsx` | P1-C |
| P1-E | 結合確認・ドキュメント更新・コミット | `task-list.md`, ログ, push | P1-D |

## 10. 設計詳細・仕様

### 10.1 API エンドポイント
- `GET /api/trending`: トレンド・おすすめ動画一覧
- `GET /api/search?q=:query`: キーワード検索
- `GET /api/suggest?q=:query`: 検索サジェスト
- `GET /api/video/:id`: 動画詳細・関連動画一覧
- `GET /api/stream/:id`: 動画ストリーミングプロキシ（`quality`, `type` クエリ、`Range` ヘッダー対応）

### 10.2 ストリーミングプロキシのロジック
- クライアントからの `Range` ヘッダーを解析
- `youtubei.js` の `getInfo()` または `download()` を使用し、ストリームを取得
- 適切な HTTP ステータス（`200` または `206 Partial Content`）と `Content-Range`, `Content-Length`, `Content-Type` をセットしてレスポンス
