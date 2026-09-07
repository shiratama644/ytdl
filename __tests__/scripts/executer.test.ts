import { describe, it, expect, afterEach } from 'vitest';
import { isTermuxOrProot } from '@/scripts/executer';

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
