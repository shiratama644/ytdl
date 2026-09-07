# 検索UIリファクタリング & 次世代デザイン刷新: 計画書作成

> Date: 2026-09-07(JST) / Commit: `fcb1f5e` / Branch: `arena/01a0778c-ytdl`

## 1. 指示内容 (Task Summary)

ユーザーが提示した「次世代動画プラットフォーム UI/UX デザイン設計仕様書」を実現するため、
**先に計画書を作成**する。検索窓に予測変換（サジェスト）を追加し、サイト全体を
「マット質感 × グラスモフィズム × ソフトシャドウ」基調のデザインへ刷新する計画を立てる。
AGENTS.md と `.agent/` ルールを適用し、Web 検索で事実確認する。

## 2. 実行内容 (Executed Actions)

| # | 内容 | 結果 |
|---|---|---|
| 1 | サンドボックス再構築を検知 → `git fetch && reset --hard FETCH_HEAD` で `e203375` に復旧 | 完了 |
| 2 | 事実確認 (web_search): `youtubei.js` の `Innertube.getSearchSuggestions(query)` → `Promise<string[]>` | 標準搭載。サジェストに使用可 |
| 3 | 事実確認 (web_search): Dexie.js 最新安定版 = 4.4.5、テストは `fake-indexeddb/auto` | 判明 |
| 4 | 計画書作成: `docs/planning/SEARCH_UI_REDESIGN_PLAN.md`（テンプレート形式 §1〜§12） | 完了 |
| 5 | `docs/README.md` に計画書を索引登録 | 完了 |
| 6 | 既存テーマ・テスト・デザインシステムを調査（`lib/theme.ts` / `stores/theme.ts` / `m3-tokens.css` / `tailwind.config.ts` / `vitest.config.ts`） | 完了 |
| 7 | （開始時に着手した実装差分）をユーザー判断でリセットし、計画書のみ残す | 完了 |
| 8 | 4 検証 (typecheck / biome lint / test:unit 101 / build) | 全て PASS |
| 9 | commit + push（`fcb1f5e`） | 完了 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- **youtubei.js に `getSearchSuggestions(query)` が標準搭載**: `suggestqueries-clients6.youtube.com` をライブラリがラップ。検索サジェスト API を自前実装不要。
- **Dexie.js = 4.4.5**: 型付き IndexedDB ラッパー。検索履歴の保存に最適。テストは `fake-indexeddb/auto` を `vitest.setup.ts` で import（Dexie の前にグローバル登録）。fake-indexeddb v5+ は `structuredClone` を自前で持たないが、Node v22+ で利用可。
- **計画書の位置づけ**: `docs/planning/{TOPIC}_PLAN.md`（`_TEMPLATE.md` 形式）が規約。AGENTS.md §6.7 で `docs/README.md` の目次更新が必須。
- **動的カラーとの共存**: 仕様書は「M3 動的抽出ではなくプリセット」だが、ユーザー確認で「共存」。プリセット（既定）と既存のシード/サムネイル抽出を併存させる。
- **サンドボックス再構築の検知**: `git log` が起点のみ + 大量未追跡。`git fetch && git reset --hard FETCH_HEAD`（§4.3 の例外）で復旧。`pnpm` は `corepack enable pnpm` 後に利用可。

## 4. 次にすべきこと (Next Actions)

- 計画書 §9 のサブタスク分割に沿って実装を進める（ユーザーは計画書を承認済み）。
  - Dexie 追加 → 検索履歴ストア → サジェスト API → カラートーン → デザイントークン → NavBar → SearchClient → サイト全体 → 検証。
- 実装に着手する際は、計画書 §3 の変更範囲を厳守する。
