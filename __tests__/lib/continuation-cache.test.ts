import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { continuationCache } from '@/lib/continuation-cache';

describe('ContinuationCache', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('create → get で値を取り出せる', () => {
    const token = continuationCache.create({ a: 1 });
    expect(token).toBeTruthy();
    expect(continuationCache.get(token)).toEqual({ a: 1 });
  });

  it('存在しないトークンは undefined', () => {
    expect(continuationCache.get('nope')).toBeUndefined();
  });

  it('TTL 経過後は undefined になり破棄される', () => {
    const token = continuationCache.create('value', 1000);
    expect(continuationCache.get(token)).toBe('value');
    vi.advanceTimersByTime(1001);
    expect(continuationCache.get(token)).toBeUndefined();
  });

  it('rotate は旧値を返し、新しい値に差し替える', () => {
    const token = continuationCache.create('old');
    const old = continuationCache.rotate(token, 'new');
    expect(old).toBe('old');
    expect(continuationCache.get(token)).toBe('new');
  });

  it('delete で削除できる', () => {
    const token = continuationCache.create('value');
    continuationCache.delete(token);
    expect(continuationCache.get(token)).toBeUndefined();
  });

  it('最大エントリ数を超えると最もアクセスが古いものから破棄される', () => {
    // defaultTtlMs よりも短い TTL を指定して、すべてエントリが有効な状態で
    // maxEntries (200) を超えるまで生成する。
    const tokens: string[] = [];
    for (let i = 0; i < 205; i++) {
      tokens.push(continuationCache.create({ i }, 60_000));
    }
    // 先頭の 5 件（最もアクセスが古い）は破棄される
    for (let i = 0; i < 5; i++) {
      expect(continuationCache.get(tokens[i])).toBeUndefined();
    }
    // 残りは取得可能
    expect(continuationCache.get(tokens[204])).toEqual({ i: 204 });
  });
});
