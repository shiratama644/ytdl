import { describe, it, expect, afterEach } from 'vitest';
import { lstatSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildCacheRoot, isTermuxOrProot, setupBuildCache } from '@/scripts/executer';

describe('package.json launch script', () => {
  it('`pnpm launch` は strip-types + ExperimentalWarning 抑制付きで scripts/executer.ts を実行する', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.launch).toBe(
      'node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/executer.ts',
    );
  });
});

describe('isTermuxOrProot', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('標準の Linux 環境 (本サンドボックス) では false を返す', () => {
    delete process.env.PREFIX;
    delete process.env.TERMUX_VERSION;
    delete process.env.ANDROID_ROOT;
    delete process.env.ANDROID_DATA;
    // この環境の /proc/version に 'android' は含まれず、/data/data/com.termux は存在しない。
    expect(isTermuxOrProot()).toBe(false);
  });

  it('$PREFIX が termux を指す場合 true', () => {
    delete process.env.TERMUX_VERSION;
    delete process.env.ANDROID_ROOT;
    delete process.env.ANDROID_DATA;
    process.env.PREFIX = '/data/data/com.termux/files/usr';
    expect(isTermuxOrProot()).toBe(true);
  });

  it('$TERMUX_VERSION が設定されていれば true', () => {
    delete process.env.PREFIX;
    delete process.env.ANDROID_ROOT;
    delete process.env.ANDROID_DATA;
    process.env.TERMUX_VERSION = '0.118.3';
    expect(isTermuxOrProot()).toBe(true);
  });

  it('ANDROID_ROOT が設定されていれば true', () => {
    delete process.env.PREFIX;
    delete process.env.TERMUX_VERSION;
    delete process.env.ANDROID_DATA;
    process.env.ANDROID_ROOT = '/system';
    expect(isTermuxOrProot()).toBe(true);
  });
});

describe('build cache (buildCacheRoot / setupBuildCache)', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('buildCacheRoot は既定で <root>/.cache/next-build を返す', () => {
    delete process.env.YTDL_BUILD_CACHE_DIR;
    const root = resolve(process.cwd(), 'scripts', '..');
    expect(buildCacheRoot(root)).toBe(resolve(root, '.cache', 'next-build'));
  });

  it('buildCacheRoot は YTDL_BUILD_CACHE_DIR で上書きできる', () => {
    process.env.YTDL_BUILD_CACHE_DIR = '.cache-custom';
    const root = resolve(process.cwd(), 'scripts', '..');
    expect(buildCacheRoot(root)).toBe(resolve(root, '.cache-custom'));
  });

  it('setupBuildCache は .next/cache を永続ディレクトリへの symlink にする', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'ytdl-cache-'));
    try {
      process.env.YTDL_BUILD_CACHE_DIR = '.cache-custom';
      const cacheDir = setupBuildCache(tmp);
      const nextCache = resolve(tmp, '.next', 'cache');
      expect(cacheDir).toBe(resolve(tmp, '.cache-custom', 'next-cache'));
      expect(lstatSync(nextCache).isSymbolicLink()).toBe(true);
      expect(realpathSync(nextCache)).toBe(resolve(tmp, '.cache-custom', 'next-cache'));
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('setupBuildCache は既に正しい symlink なら再利用する', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'ytdl-cache-'));
    try {
      process.env.YTDL_BUILD_CACHE_DIR = '.cache-custom';
      const first = setupBuildCache(tmp);
      const second = setupBuildCache(tmp);
      const nextCache = resolve(tmp, '.next', 'cache');
      expect(first).toBe(second);
      expect(lstatSync(nextCache).isSymbolicLink()).toBe(true);
      expect(realpathSync(nextCache)).toBe(resolve(tmp, '.cache-custom', 'next-cache'));
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
