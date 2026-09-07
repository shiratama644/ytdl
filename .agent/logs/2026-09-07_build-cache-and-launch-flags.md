# `pnpm launch` のフラグ変更とビルドキャッシュ導入（webpack / turbopack）

> Date: 2026-09-07(JST) / Branch: `arena/01a0778c-ytdl`

## 1. 指示内容 (Task Summary)

- `launch` コマンドを `node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/executer.ts` に変更する。
- Next.js のビルドキャッシュを導入する。Webpack と Turbopack の両方に導入する。
- AGENTS.md / `.agent/` のルール（pre-task 現状確認 / verify-before-commit 4 検証 / log-task 記録）を適用する。

## 2. 実行内容 (Executed Actions)

| # | 内容 | 結果 |
|---|---|---|
| 1 | 現状確認: `git status` clean・`arena/01a0778c-ytdl`・pnpm 12.3.4 を確認 | 完了 |
| 2 | `package.json` の `launch` を `node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/executer.ts` に変更 | 完了 |
| 3 | ビルドキャッシュ導入: `next.config.ts` に webpack / turbopack 共通のキャッシュ永続化メモを追加 | 完了 |
| 4 | `scripts/executer.ts` に `buildCacheRoot()` / `setupBuildCache()` を追加し、ビルド前に `.next/cache` を `.cache/next-build/next-cache` への symlink へ差し替え | 完了 |
| 5 | `scripts/executer.ts` のヘッダー・Usage・環境変数（`YTDL_BUILD_CACHE_DIR`）にキャッシュ説明を追加 | 完了 |
| 6 | `__tests__/scripts/executer.test.ts` に launch フラグ・buildCacheRoot・setupBuildCache のテストを追加 | 完了（96 passed） |
| 7 | `.agent/skills/`（project-overview / sandbox-constraints）へキャッシュ・launch 実態を反映 | 完了 |
| 8 | 本ログを追加 | 完了 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- **`experimental.turbopackPersistentCaching` は Next.js 15.5.25 stable では使えない**（canary 専用）。設定すると `Build error occurred` になる。→ 設定せず、Turbopack のキャッシュは `next build --turbopack` 自体が `.next/cache` に書く仕組みに任せる。
- **ビルドキャッシュの本質**: Webpack は `.next/cache/webpack`、Turbopack は `.next/cache`（.tsbuildinfo 等）に書く。両者共通の `next/cache` を `.cache/next-build/next-cache` への symlink に差し替えることで、`.next` 再生成・削除でもキャッシュは失われない（webpack / turbopack 両方に有効）。
- **`pnpm launch` では `--` セパレータが argv に渡る**ため、`parseArgs` で `=== '--'` を `continue` して無視する（前回実装）。`--no-install --no-build --no-start` をそのまま受け取れる。
- **Node v22 でも `--experimental-strip-types --disable-warning=ExperimentalWarning` が動く**（サンドボックス v22.22.3 で確認）。`package.json` の `engines.node >= 24` と整合。`import.meta.main` も v22 で `true`。
- **setupBuildCache のテストは tmp ディレクトリで実施**（`mkdtempSync`）し、`.next` / `.cache` を汚さない。既に正しい symlink なら再利用し、実体があれば退避してから差し替える。

## 4. 次にすべきこと (Next Actions)

- なし（本タスクは完了）。次回は `pnpm launch` で install → build → start を一括実行できる（ビルドキャッシュは `.cache/next-build/` に永続化）。
