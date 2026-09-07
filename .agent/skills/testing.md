# Skill: Testing

> vitest 5 + jsdom 30 + Testing Library のテスト規約・`__tests__` 階層・スタブ/モック。

## テストランナー & 設定

- **vitest 5.0.0** + **@vitest/coverage-v8 5.0.0** + **jsdom 30** + **@testing-library/react 16** + **@testing-library/jest-dom 7** + **fake-indexeddb 6**。
- 設定ファイル:
  - `vitest.config.ts` — `environment: 'jsdom'`、`setupFiles: ['./vitest.setup.ts']`、`include: ['__tests__/**/*.test.{ts,tsx}']`、`@` alias を `./` に解決。
  - `vitest.setup.ts` — `@testing-library/jest-dom/vitest` を import。`window.matchMedia` の no-op スタブ。
  - `tsconfig.test.json` — `types: ['vitest/globals', '@testing-library/jest-dom', 'node']`。テスト + 依存を typecheck。

## `__tests__` 階層規約

- ソースと**同じ階層構造**で配置する。
  - `lib/serialize.ts` → `__tests__/lib/serialize.test.ts`
  - `lib/stores/theme.ts` → `__tests__/lib/stores/theme.test.ts`
  - `components/ui/Button.tsx` → `__tests__/components/ui/Button.test.tsx`
  - `scripts/executer.ts` → `__tests__/scripts/executer.test.ts`
- テストファイル名は `<target>.test.{ts,tsx}`。

## スクリプト

- `pnpm test` / `pnpm test:unit` — `vitest run`（1 回実行）。
- `pnpm test:watch` — `vitest`（watch）。
- `pnpm test:coverage` — `vitest run --coverage`。
- **commit 前の検証には `pnpm test:unit` を使う**（`pnpm test` は watch なので使わない）。

## 書き方のポイント

- `import { describe, it, expect } from 'vitest';` を明示 import（`globals: true` でも明示推奨）。
- 純粋ロジック（format / serialize / continuation-cache 等）はモックなしで検証。
- `window.matchMedia` は jsdom に無いため `vitest.setup.ts` でスタブ。
- Browser API（`fetch` / `EventSource` / `IntersectionObserver` / `ResizeObserver`）は必要に応じて `vi.stubGlobal` or モック。
- `lib/theme.ts` の `@material/material-color-utilities` は拡張子なし ESM import のため、動的 import でしか読めない。テストでは `generateDynamicTheme` を mock するか、純粋ヘルパー（`applyThemeTokens` / `DEFAULT_SEED`）のみを対象にする。
- `scripts/executer.ts` は `import.meta.main` ガードで、import しても `main()` は走らない（テスト可能）。
- `@/*` エイリアスは vitest.config.ts / tsconfig で解決される。

## biome とテスト

- `biome.json` の `overrides` で `__tests__/**/*.{ts,tsx}` のみ `noNonNullAssertion: off`。
- テストファイル内で non-null assertion を使ってよい（プロダクションコードでは禁止）。
