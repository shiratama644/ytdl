/**
 * Vitest グローバルセットアップ
 *
 * - @testing-library/jest-dom の matchers を追加 (toBeInTheDocument 等)
 * - fake-indexeddb をグローバル登録（Dexie.js / IndexedDB のテスト用）
 * - 各テストの前後で React tree を reset し、NODE_ENV を明示
 */

import '@testing-library/jest-dom/vitest';
// IndexedDB を jsdom で使えるようにする（Dexie.js のテスト用）。
// Dexie を import する前にグローバル登録する必要がある。
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// Next.js が公開する global (process.env.NODE_ENV) を明示 test に
beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'test');
});

// jsdom は Element.scrollIntoView を実装していない。
// 複数コンポーネントでスクロール操作を行うため、no-op stub をグローバルに置く。
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView =
    () => {};
}

// jsdom は window.matchMedia を実装していない。
// lib/stores/theme.ts の systemMode() が参照するため、no-op stub を追加する。
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    }) as unknown as MediaQueryList;
}
