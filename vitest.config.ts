/**
 * Vitest 設定
 *
 * - jsdom 環境で React 19 コンポーネントをテスト
 * - `@/` path alias を Next.js の tsconfig と同じ扱いに
 * - テストは `__tests__/` 配下に **ソースと同じ階層構造** で配置する
 *   （例: `lib/serialize.ts` → `__tests__/lib/serialize.test.ts`）
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Node 24 (undici v7) の fetch が jsdom 由来の AbortSignal を拒否する問題
    // (vitest#8374) は vitest 4 以降で上流解決済みのため、素の 'jsdom' を使う。
    environment: 'jsdom',
    // テストは vitest のグローバルを自動注入せず、各ファイルで明示 import する。
    // これにより tsconfig の types にテスト専用型を足し忘れても「なぜか型エラー」に
    // ならない（globals に依存しない）。ビルド側 tsconfig へテスト型が漏れるのも防ぐ。
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**', 'coverage/**', 'out/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: [
        'lib/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'scripts/**/*.ts',
      ],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.d.ts',
        'node_modules/**',
        '.next/**',
        'coverage/**',
        // ---- Server / route / SSR (ビルドで担保) ----
        'app/**/route.ts',
        'app/**/*.tsx',
        // ---- 純粋な型定義 ----
        '**/types.ts',
        // ---- 外部 API に強結合し単体テスト ROI が低いもの ----
        'lib/innertube.ts',
        'lib/download-queue.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
});
