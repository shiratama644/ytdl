# vitest 5 + biome 2.5.12 導入、`__tests__` 実装、開発規約・ドキュメント整備

> Date: 2026-09-07(JST) / Commit: `db78f74` (vitest+biome) / Branch: `arena/01a0778c-ytdl`

## 1. 指示内容 (Task Summary)

- vitest 5 と biome 2.5.12 を導入する。
- テストファイルは `__tests__/` にソースと同じ階層構造で実装する。
- 実装完了後に typecheck / lint / build / Git 更新を行う。
- 開発規約（`AGENTS.md`）・エージェント記憶システム（`.agent/`）・ドキュメント索引（`docs/`）・`README.md` を導入し、
  汎用性のあるものと本リポジトリに適しているものを見つけ、修正して ytdl 専用にする。

## 2. 実行内容 (Executed Actions)

| # | 内容 | 結果 |
|---|---|---|
| 1 | `package.json` に vitest 5.0.0 / @vitest/coverage-v8 5.0.0 / jsdom 30 / Testing Library / fake-indexeddb / @vitejs/plugin-react を追加 | 完了 |
| 2 | `biome.json` / `vitest.config.ts` / `vitest.setup.ts` / `tsconfig.test.json` を作成 | 完了 |
| 3 | `__tests__/`（lib / lib/stores / components/ui / scripts）に 9 ファイル・91 テストを実装 | 完了（91 passed） |
| 4 | biome check --write（import type 等の安全な自動修正）を適用 | 完了 |
| 5 | lint エラーを解消（button type / 安定キー / biome-ignore 等、挙動は維持） | 完了（0 error） |
| 6 | `scripts/executer.ts` に `import.meta.main` ガードを追加（テストから import しても main() を走らせない） | 完了 |
| 7 | typecheck / lint / test / build を実行 | 全て PASS |
| 8 | `AGENTS.md`・`.agent/`・`docs/`・`README.md` を導入し、ytdl の技術スタックに合わせて翻案 | 完了 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- **biome の `--unsafe` 自動修正は挙動を壊す**：`useLiveChat` の Effect 依存配列を `[videoId, onMessage, onEvent]` に広げるとインラインコールバックが毎レンダーで変わり EventSource が再接続される。`LiveClient` の自動スクロール Effect から `messages` が外れる。→ 無理に受け入れず、明示的な `biome-ignore` コメントで意図を残す。
- **biome の `useExhaustiveDependencies` は ESLint の `react-hooks/exhaustive-deps` とは別ルール**：既存の `eslint-disable-next-line` は効かず、`biome-ignore lint/correctness/useExhaustiveDependencies: <理由>` が必要。
- **biome の `noUnknownAtRules`（CSS）** は Tailwind v3 の `@tailwind base/components/utilities` を警告する。`css.parser.tailwindDirectives: true` は v4 用で、v3 には効かないため、CSS に限定した `overrides` で `off` にする。
- **biome の JSON リポジトリは `location.path` が `'?'` になりやすい**。正確な file:line はテキストリポジトリか、JSON を再現性高く読む。
- **`@material/material-color-utilities@0.4.0`** は拡張子なし ESM import のため、厳格な Node ESM 下で失敗する。`lib/theme.ts` は動的 import にしているので、テストは `generateDynamicTheme` を mock するか純粋ヘルパー（`applyThemeTokens` / `DEFAULT_SEED`）のみを対象にする。
- **`ffmpeg-static@5.3.0`** の postinstall は Sandbox で TLS 起因に失敗する。`pnpm install --ignore-scripts` + `pnpm-workspace.yaml` の `onlyBuiltDependencies` で対処。
- **`scripts/executer.ts` の `import.meta.main` ガード**は Node v24+ のみ有効。テストから import しても entrypoint が走らないようにするための変更。

## 4. 次にすべきこと (Next Actions)

- lint の残 17 warnings / 1 info（`noUnusedVariables`・`noNonNullAssertion` 等）は現状 0 error で成立。警告ゼロ化を望むなら別タスクで。
- 残テスト候補: `app/api/*/route.ts` のハンドラテスト、`components/player/VideoPlayer.tsx` のテスト、`lib/download-queue.ts` / `lib/ffmpeg.ts` のテスト。
- `app/api/proxy/route.ts` の `isAllowed` はエクスポートされていないため、テストするならエクスポートを検討。
