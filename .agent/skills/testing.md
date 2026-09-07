# Skill: Testing

> vitest 5 + jsdom 30 + Testing Library のテスト規約・`__tests__` 階層・スタブ/モック。

## テストランナー & 設定

- **vitest 5.0.0** + **@vitest/coverage-v8 5.0.0** + **jsdom 30** + **@testing-library/react 16** + **@testing-library/jest-dom 7** + **fake-indexeddb 6**。
- 設定ファイル:
  - `vitest.config.ts` — `environment: 'jsdom'`、`globals: false`、`setupFiles: ['./vitest.setup.ts']`、`include: ['__tests__/**/*.test.{ts,tsx}']`、`@` alias を `./` に解決。
  - `vitest.setup.ts` — `@testing-library/jest-dom/vitest` を import。`window.matchMedia` の no-op スタブ。**Dexie テスト用に `import 'fake-indexeddb/auto'` を先頭で import**（Dexie を import する前にグローバルに IndexedDB を登録する）。
  - `tsconfig.test.json` — `types: ['@testing-library/jest-dom', 'node']`（`vitest/globals` は globals: false のため含めない）。テスト + 依存を typecheck。

## Dexie / IndexedDB テスト（2026-09-08 追記）

- **fake-indexeddb/auto の import 順が重要**: `Dexie` を import する前に `import 'fake-indexeddb/auto'` が実行されている必要がある。`vitest.setup.ts` の先頭に置く。
- fake-indexeddb v5+ は `structuredClone` を自前ポリフィルしない。**Node v22+ のグローバル `structuredClone` を利用**（本プロジェクトは Node >= 24）。
- **テスト用 DB 注入ハック**: `lib/search-history.ts` が `__setSearchHistoryDbForTest(db)` / `__resetSearchHistoryDbForTest()` を export。テストでは `new Dexie('...-test-<random>')` を作り注入し、`beforeEach`/`afterEach` で生成/削除してテスト間の IndexedDB 汚染を防ぐ。
- パッケージ: `dexie@4.4.5`（型定義は bundled、`@types/dexie` は不要・deprecated スタブ）。`fake-indexeddb` は devDependency。
- **ブラウザ専用注意**: Dexie は SSR（Node）で import しない。`'use client'` コンポーネント/ブラウザ専用モジュールに閉じ込める（AGENT.md §3.5 / sandbox-constraints）。

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

- `import { describe, it, expect } from 'vitest';` を明示 import（`globals: false` のため、**必ず明示 import**。`.beforeEach` / `.afterEach` / `vi` も同様）。
- 純粋ロジック（format / serialize / continuation-cache 等）はモックなしで検証。
- `window.matchMedia` は jsdom に無いため `vitest.setup.ts` でスタブ。
- Browser API（`fetch` / `EventSource` / `IntersectionObserver` / `ResizeObserver`）は必要に応じて `vi.stubGlobal` or モック。
- `lib/theme.ts` の `@material/material-color-utilities` は拡張子なし ESM import のため、動的 import でしか読めない。テストでは `generateDynamicTheme` を mock するか、純粋ヘルパー（`applyThemeTokens` / `DEFAULT_SEED`）のみを対象にする。
- `scripts/executer.ts` は `import.meta.main` ガードで、import しても `main()` は走らない（テスト可能）。
- `@/*` エイリアスは vitest.config.ts / tsconfig で解決される。

## biome とテスト

- `biome.json` の `overrides` で `__tests__/**/*.{ts,tsx}` のみ `noNonNullAssertion: off`。
- テストファイル内で non-null assertion を使ってよい（プロダクションコードでは禁止）。
