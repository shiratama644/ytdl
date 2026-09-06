import { randomUUID } from 'node:crypto';

/**
 * youtubei.js のフィード（Search / Comments / Channel）はオブジェクト自体が
 * 続き読み込み（getContinuation）の状態を持つ。HTTP はステートレスなため、
 * このモジュールで「継続トークン → フィードオブジェクト」をサーバー内に保持する。
 *
 * 個人利用・単一プロセス前提の軽量実装。TTL で確実に破棄する。
 */

interface Entry {
  value: unknown;
  expiresAt: number;
  last: number;
}

class ContinuationCache {
  private store = new Map<string, Entry>();
  private maxEntries = 200;

  static defaultTtlMs(): number {
    return 5 * 60 * 1000;
  }

  create(value: unknown, ttlMs = ContinuationCache.defaultTtlMs()): string {
    const token = randomUUID();
    this.store.set(token, {
      value,
      expiresAt: Date.now() + ttlMs,
      last: Date.now(),
    });
    this.gc();
    return token;
  }

  get<T>(token: string): T | undefined {
    const entry = this.store.get(token);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(token);
      return undefined;
    }
    entry.last = Date.now();
    return entry.value as T;
  }

  /** 継続トークンを次に差し替え、値を取り出す。 */
  rotate<T>(token: string, newValue: unknown, ttlMs = ContinuationCache.defaultTtlMs()): T | undefined {
    const value = this.get<T>(token);
    this.store.set(token, {
      value: newValue,
      expiresAt: Date.now() + ttlMs,
      last: Date.now(),
    });
    this.gc();
    return value;
  }

  delete(token: string): void {
    this.store.delete(token);
  }

  private gc(): void {
    if (this.store.size <= this.maxEntries) return;
    const now = Date.now();
    // 期限切れを全部消し、まだ多ければ最もアクセスが古いものから削除
    for (const [k, e] of this.store) {
      if (now > e.expiresAt) this.store.delete(k);
    }
    const sorted = [...this.store.entries()].sort((a, b) => a[1].last - b[1].last);
    while (this.store.size > this.maxEntries && sorted.length) {
      const [k] = sorted.shift()!;
      this.store.delete(k);
    }
  }
}

export const continuationCache = new ContinuationCache();
