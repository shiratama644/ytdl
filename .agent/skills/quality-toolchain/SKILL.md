---
name: quality-toolchain
description: ytdl の品質ツールチェーン（TypeScript strict / biome 2.x / vitest / coverage / Playwright）の正しい設定と実測ハマり。P00-B/C（スキャフォールド・shared）と E2E 層導入時に参照。
---

# Quality Toolchain Skill — 品質ツールチェーンの運用と実測ハマり

> **スキル**: このリポジトリ（pnpm workspaces + Next.js `output:'export'`）で
> TypeScript / biome / vitest / coverage / Playwright を「どう設定し・どう使うと成功するか」。
> 出典: `.agent/logs` の cod-web 期ログ 7 件をユーザー指示で 2026-09-21 にインポート・スキル化
> （元ログは DOC-1 で削除済み・履歴は git 履歴参照）。
> コマンドは `package.json` 定義スクリプトのみ（AGENTS.md §3.1・捏造禁止）。

## ツール選定（確定・PHASE0_PLAN §10.4）

| 部品 | 採用 | 使わない |
|---|---|---|
| Lint / format | **biome**（`lint` + `format`） | ESLint / Prettier |
| Unit | **vitest**（`vitest run`） | `bun test` / jest |
| Coverage | **@vitest/coverage-v8** | istanbul |
| E2E | **@playwright/test** | Sandbox での browser 実行（不可・後述） |

## TypeScript strict

- **TS 7 では `baseUrl` が廃止** → `paths` は相対パス指定（`"@/*": ["./src/*"]`）。
- ビルドツール側（vite/next config）に alias があっても **tsc は tsconfig を見る** =
  tsconfig 側に `paths` が必要（片方だけだと `@/` 解決エラー）。

## biome 2.x（設定ハマり・導入時に確認）

- **`rules.recommended: true` は deprecated** → `rules: { preset: "recommended" }`
  （既存設定は `biome migrate` で移行）。
- **`files.includes` は不要**：`vcs.useIgnoreFile: true` で `.gitignore` を尊重し
  node_modules / out / coverage が自動除外される。2.x はネガティブグロブ構文が変わり、
  `biome migrate` が生成する `!!**/!**/dist/**` 形式はエラーになるため
  `vcs.useIgnoreFile: true` のみを使うのが最も単純・安全。
- **`$schema` のバージョン固定**: 固定値と導入 CLI バージョンが食い違うと lint info が
  出る（error ではない）。`$schema` と固定バージョンはまとめて更新する。
- **`biome-ignore` は対象コードの「直前行」に置く**。
- lint は `0 error` まで（info は既存の $schema 系のみ許容可・報告で明記）。

### import 境界の強制（monorepo 依存方向）

- workspace 間の依存方向は**慣習ではなく biome で強制**する（`overrides` +
  `linter.rules.style.noRestrictedImports`）。
- **`patterns.group` は subpath 捕捉に `**` が必須**: `@scope/pkg/*` では
  `@scope/pkg/sim/movement` が捕捉されない → `@scope/pkg/**` にする。
- **DOM グローバル（`WebSocket` 等）の直接参照禁止は `noRestrictedImports` では
  効かない**（import ではない）→ `linter.rules.style.noRestrictedGlobals` を使う。
  特定ファイルだけ許可する形（transport 実装 1 ファイルのみ WS を持つ等）が素直。
- 導入直後は**一時 probe ファイルで lint が実際に落ちるか確認**してから削除する
  （設定が空振りしている場合がある）。

## vitest（jsdom + testing-library）

- DOM 操作は jsdom 環境・`globals: true`・`setupFiles` に jest-dom 読み込み +
  `afterEach(cleanup)`。
- **jest-dom マッチャーの型が tsc に認識されない場合の解決（2 点セット）**:
  1. 型入口の `.d.ts`（`src/vite-env.d.ts` 相当）に
     `/// <reference types="@testing-library/jest-dom" />` を追加
  2. `vitest.setup.ts`（`@testing-library/jest-dom/vitest` を import するファイル）を
     **tsconfig の include に追加**

## coverage（数字稼ぎ禁止・意味のある増加のみ）

**ワークフロー（3 段）**:
1. **baseline**: `@vitest/coverage-v8` を導入し、thresholds は **0% を明示**（または未設定）で
   計測し、baseline 数値を記録（`include` / `exclude` / `reportsDirectory` を先に固定）。
2. **meaningful tests**: 重要経路（transport の分岐・不正入力・lifecycle・fallback）に
   アサーションを追加。**カバー率の数字稼ぎ目的のテストはしない**（AGENTS.md §3.2 精神）。
3. **ratchet**: baseline + meaningful 後に thresholds を実績の保守的値へ引き上げる
   （例: statements 79 / branches 73 / functions 79 / lines 80）。

**gotchas**:
- **top-level に副作用を持つモジュール（サーバー起動 / setInterval / serve）は
  coverage 用に直接 import しない** → handler 抽出（seam）するか exclude。
  import した瞬間にランタイムが起動してテスト環境を壊す。
- **再利用バッファの byte snapshot**: no-copy send（backing buffer 再利用 + subarray view）
  のテストでは、送信 mock が保持した view は後続送信で内容が変わり得る →
  **送信直後に byte スナップショットを取る**。
- Testing Library: `aria-hidden="true"` の親を持つ要素は **role query では見つからない** →
  `getByText(...)` 等で直接取得する。
- コマンドは `vitest run --coverage`（**watch 以外** = AGENTS.md §3.1）。

## Playwright（E2E）

- **Sandbox では Chromium バイナリ導入不可 + egress ブロック = browser 実行不可**。
  「実行済み」と主張しない（AGENTS.md §3.1）。実行可能なのは
  **`playwright test --list`（browser を起動しない discovery 検証）のみ** = これを
  「E2E 定義・登録完了」の検証とする。
- **推奨 config**: local は `webServer`（`command` / `url` / `reuseExistingServer` /
  `timeout` / `gracefulShutdown`）+ `use.baseURL` 併用。
  `PLAYWRIGHT_BASE_URL` 指定時は webServer を起動しない（preview / CI の既存 URL を
  対象にし、同じ spec を local と CI で使い回す）。
- **browser 向けコードに backend `localhost` を書かない**（Sandbox / プレビュー由来の
  接続不能になる）→ same-origin プロキシ経由（`/ws` 等）で実経路を検証し、
  結果はユーザー可視の DOM（status 表示等）でアサートする。
- `.gitignore` に `playwright-report/` と `test-results/` を追加。

## 関連

- 検証コマンドの本体: AGENTS.md §3.1 / `.agent/hooks/verify-before-commit.md`
- 「なぜ E2E が実行できないか」の根拠: `sandbox-constraints/SKILL.md`
- 設計仕様（スタック選定の根拠）: `docs/planning/PHASE0_PLAN.md` §10.4
