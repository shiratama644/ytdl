/**
 * シンプルな TTL 付きインメモリキャッシュ
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class SimpleCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private defaultTtlMs: number;

  constructor(defaultTtlSeconds = 300) {
    this.defaultTtlMs = defaultTtlSeconds * 1000;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T, ttlSeconds?: number): void {
    const ttl = (ttlSeconds !== undefined ? ttlSeconds : this.defaultTtlMs / 1000) * 1000;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  clear(): void {
    this.store.clear();
  }
}
