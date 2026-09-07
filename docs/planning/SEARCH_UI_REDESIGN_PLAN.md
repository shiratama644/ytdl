# 検索UIリファクタリング&次世代デザイン刷新: 計画書

> **日付**: 2026-09-07(JST) / **ブランチ**: `arena/01a0778c-ytdl` / **HEAD**: `e203375`
> 本計画書は `docs/planning/_TEMPLATE.md` 形式。進捗の正本は [`AGENTS.md`](../../AGENTS.md) §5。

## 1. 開始前確認

- [x] ブランチ = `arena/01a0778c-ytdl`、HEAD = `e203375` を確認
- [x] `git status` で既存の作業途中変更を確認（下記「3. 変更範囲」に記録）
- [x] 関連仕様: `AGENTS.md` §6（ドキュメント運用）/ `.agent/skills/` を確認
- [ ] 本計画書 §5（完了条件）と §7（停止条件）を再読する

## 2. 目的 (Why)

ユーザーが提示した「次世代動画プラットフォーム UI/UX デザイン設計仕様書」を実現する。

- **検索課題**: 現状の検索窓は単純な `<input>` + Enter のみで、予測変換（サジェスト）がない。検索結果ページも情報のメリハリが乏しい。
- **デザイン課題**: 現状は Material 3 Expressive の動的カラー抽出が基調で、仕様書が「脱却すべき」とする丸み・主張の強さが残る。仕様書は「マット質感 × グラスモフィズム × ソフトシャドウ」を基調とし、カラーはユーザーが選べるプリセットへ移行することを求める。
- **ゴール**: 検索窓に予測変換を追加し、サイト全体のデザインを仕様書のトーンへ刷新する。

## 3. 変更範囲 (Scope)

### 変更対象（このタスクで作る/変える）
| 種別 | 対象 | 内容 |
|---|---|---|
| 依存追加 | `package.json` | `dexie` ^4.4.5 を dependencies に追加（済） |
| 新規 | `lib/search-history.ts` | Dexie で検索履歴を IndexedDB に保存（上限10件）（済・作業中） |
| 新規 | `app/api/search/suggest/route.ts` | `youtubei.js` の `getSearchSuggestions` で YouTube サジェスト返却（済・作業中） |
| 変更 | `lib/theme.ts` | カラートーンプリセット4種 + `toneTokens()` を追加（済・作業中） |
| 変更 | `lib/stores/theme.ts` | `tone` 選択を追加し、既存の動的カラー（seed/thumbnail）と共存 |
| 変更 | `app/globals.css` | グラスモフィズム / ソフトシャドウ / マットのユーティリティ追加 |
| 変更 | `tailwind.config.ts` | 新トークン（ガラス面・ソフトシャドウ・アクセント）追加 |
| 変更 | `components/NavBar.tsx` | 検索窓に予測変換ドロップダウン（履歴+サジェスト）、テーマ切替シート、グラス化 |
| 変更 | `components/SearchClient.tsx` | F型視線誘導・タイポグラフィ階層を反映した全面刷新 |
| 変更 | `components/VideoCard.tsx` / `app/page.tsx`（ホーム） | デザイン刷新に合わせたカード・チップ調整（site_wide） |
| 変更 | `vitest.setup.ts` | `fake-indexeddb/auto` を追加（Dexie テスト用） |
| 新規 | `__tests__/lib/search-history.test.ts` | 履歴ストアのユニットテスト |
| 新規 | `__tests__/lib/theme-tone.test.ts` | `toneTokens` / プリセットのユニットテスト |
| 変更 | `docs/README.md` / 計画書 | 目次更新 |

### 変更しない（境界外）
- 検索のみならず指定のない他機能（チャンネル/コメント/ダウンロード等）の内部ロジック
- 既存 API レスポンス形式（`/api/search` 等）の互換性
- `ytdl` のビデオ取得・ダウンロード処理本体

## 4. 禁止事項

- 推測で仕様を補完しない（不明な設計論点はユーザーに確認/計画書に明記）
- 無関係なリファクタリングをしない（対象ファイルのみ変更）
- テストを通すためだけに期待値を実装へ合わせない
- 既存レスポンス形式（`/api/search`, `/api/home` 等）を変えない
- 動的カラー（seed/thumbnail）機能を削除しない（ユーザー確認「共存」を反映）
- **M3 動的抽出を完全に廃止しない**（プリセットを既定としつつ、既存の「シード/サムネイル抽出」は選択肢として残す）

## 5. 完了条件 (DoD)

- [ ] `pnpm typecheck`（main + test）全 pass
- [ ] `pnpm exec biome lint .` 0 error
- [ ] `pnpm test:unit` 全 pass（既存 101 + 新規）
- [ ] `pnpm build` 全 pass
- [ ] 検索窓で履歴 + サジェストのドロップダウンが出る（3文字以上でサジェスト取得）
- [ ] カラートーンプリセット4種でサイト全体の色が切り替わる
- [ ] `git push origin arena/01a0778c-ytdl` 完了
- [ ] 計画書・ログ・スキル更新

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit (vitest) | `lib/search-history` | Dexie + fake-indexeddb で追加/重複更新/上限トリム/クリア |
| Unit (vitest) | `lib/theme` | `toneTokens` が期待トークンを返す / プリセット整合 |
| Component (testing-library) | NavBar / SearchClient | ドロップダウン表示・キーボードナビ・フィルタ切替 |
| 実環境 (本番 build) | `pnpm build` | 型/ビルド成功、サジェスト API が 502 でも UI が壊れない |

## 7. 停止条件

次の場合は作業を停止し、変更せず報告する:
- 仕様書（本計画書・AGENTS.md・skills）同士に矛盾がある
- 本計画書の変更範囲を超える変更が必要
- 破壊的変更（既存 API 互換性・既存データ）が必要
- ユーザー判断が必要な新規設計論点に到達した
- 開始時点で作業ツリーに未確認の変更がある（現状: 本計画書に記録した変更のみ）

## 8. 完了時に行うこと

1. 差分を自己レビュー（対象外の変更が混ざっていないか）
2. 4 検証（typecheck / biome lint / test:unit / build）を実行
3. コミット（Conventional Commits 形式）+ push
4. 証拠中心の完了報告（結果 / テスト件数 / Git SHA / 残事項）

## 9. サブタスク分割

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| 1 | Dexie 追加 + 検索履歴ストア | `lib/search-history.ts` + テスト | — |
| 2 | サジェスト API | `app/api/search/suggest/route.ts` | — |
| 3 | カラートーンシステム | `lib/theme.ts` `toneTokens` / `lib/stores/theme.ts` `tone` | — |
| 4 | デザイントークン（CSS/Tailwind） | `app/globals.css` / `tailwind.config.ts` | 3 |
| 5 | NavBar リファクタ（予測変換 + テーマシート + グラス化） | `components/NavBar.tsx` | 1,2,4 |
| 6 | 検索結果ページ刷新 | `components/SearchClient.tsx` | 4 |
| 7 | サイト全体トーン調整 | `VideoCard.tsx` / `app/page.tsx` 等 | 4 |
| 8 | 検証 + 記録 + commit/push | 4 検証 / ログ / スキル / push | 1-7 |

## 10. 設計詳細・仕様

### 10.1 検索履歴（Dexie / IndexedDB）
- DB: `ytdl-search-history`、テーブル `searchHistory`（スキーマ `++id, query, visitedAt`）
- `query` を index 化して重複判定。同一クエリは `visitedAt` 更新、上限 10 件超過分は `bulkDelete`。
- ブラウザ専用（`'use client'`）。SSR では import しない。
- テスト: `fake-indexeddb/auto` を `vitest.setup.ts` に追加（Dexie と併用。`structuredClone` は Node v22 で利用可）。

### 10.2 サジェスト API
- `GET /api/search/suggest?q=<query>` → `{ q, suggestions: string[] }`
- `youtubei.js` の `Innertube.getSearchSuggestions(query)`（`suggestqueries-clients6.youtube.com` をラップ）。
- 失敗時は `502` + 空配列を返し、UI を壊さない（補助機能）。
- クライアント側で 3 文字以上 + debounce で呼ぶ。

### 10.3 カラートーン
- `ToneId`: `obsidian-frost`(既定) / `smoky-quartz` / `nordic-mist` / `deep-forest`
- 各プリセットは dark/light 両モードの base/surface/surfaceGlass/accent/onSurface/onSurfaceVariant/outline を持つ。
- `toneTokens(id, mode)` が `--md-sys-color-*` トークンを生成。`applyThemeTokens` で DOM 反映。
- テーマストアに `tone` を追加し、`dynamic`（off/seed/thumbnail）と**共存**させる（ユーザー確認）。
  - 既定はプリセット（`obsidian-frost`）。ユーザーが動的カラー（seed/thumbnail）を選んだ場合は従来どおり `generateDynamicTheme`。
- NavBar にテーマ色切替シート（プリセットスウォッチ）を常設。

### 10.4 デザイン（仕様書反映）
- グラスモフィズム: `backdrop-filter: blur(16-24px)` + 1px ハイライト `rgba(255,255,255,0.08)`。
- ソフトシャドウ: 高拡散・高透明の多重レイヤー（仕様書の Ambient Occlusion 的アプローチ）。
- F型視線誘導: ヘッダー(左上ロゴ/中央左検索/右上操作) → 中段左へ主役コンテンツ → 関連情報。
- タイポグラフィ階層: 主役 1.0(24-32px Bold) / 準主役 0.6(16px Medium, 2行まで) / 脇役 0.4(13px, 淡色)。
- 角丸は控えめ(12px)、ホバー時 `scale(1.02)` + ソフトシャドウ。

### 10.5 既存機能との整合
- Material Symbols Rounded アイコンはそのまま再利用（アイコン枠線・ピル型ボタンの過剰な丸みは抑制）。
- 動的カラー（`generateDynamicTheme` / `seedColorFromImage` / `applyThemeTokens`）は既存テストを壊さない形で残す。

## 11. リスク・Gotchas

- **Dexie と jsdom の IndexedDB**: `fake-indexeddb/auto` の import 順が重要。`Dexie` を import する前にセットアップでグローバル登録する。`structuredClone` は Node v22 で利用可（fake-indexeddb v5+ は自前ポリフィルを持たない）。
- **`lib/theme.ts` の動的 import**: material-color-utilities は拡張子なし ESM import のため厳格 Node ESM でトップレベル import 不可。`toneTokens` は純粋関数（外部 import 不要）で実装し、プリセットをテスト可能にする。
- **`serverExternalPackages`**: dexie はブラウザ専用のためサーバー側で import しない（`'use client'` で分離）。
- **現状の作業途中変更**: 計画書作成時点で `lib/theme.ts` / `package.json` / `pnpm-lock.yaml` / 新規2ファイルが未コミット。実装 §3 の対象なので、タスク完了時に一括コミットする。

## 12. 実績と証拠 (実装後に記入)

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |
| 6 | | | |
| 7 | | | |
| 8 | | | |
