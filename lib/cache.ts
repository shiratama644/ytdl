import { createClient } from "redis";
import { env } from "@/lib/env";

type MemoryEntry = {
  value: string;
  expiresAt: number;
};

const memoryCache = new Map<string, MemoryEntry>();
type RedisClient = ReturnType<typeof createClient>;
let redisClientPromise: Promise<RedisClient | null> | undefined;

async function getRedisClient() {
  if (!env.CACHE_ENABLED || !env.REDIS_URL) return null;
  if (!redisClientPromise) {
    redisClientPromise = (async () => {
      const client = createClient({ url: env.REDIS_URL });
      client.on("error", (error) => {
        if (process.env.NODE_ENV === "production") {
          const errorCode =
            typeof error === "object" && error && "code" in error && typeof error.code === "string"
              ? error.code
              : "unknown";
          console.warn(`Redis cache error (code: ${errorCode})`);
          return;
        }
        console.warn("Redis cache error:", error.message);
      });
      await client.connect();
      return client;
    })().catch(() => null);
  }
  return redisClientPromise;
}

function withPrefix(key: string) {
  return `${env.CACHE_PREFIX}:${key}`;
}

function pruneMemory() {
  const now = Date.now();
  for (const [key, value] of memoryCache.entries()) {
    if (value.expiresAt <= now) memoryCache.delete(key);
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!env.CACHE_ENABLED) return null;
  const namespaced = withPrefix(key);

  const client = await getRedisClient();
  if (client) {
    const redisValue = await client.get(namespaced);
    return redisValue ? (JSON.parse(redisValue) as T) : null;
  }

  pruneMemory();
  const memory = memoryCache.get(namespaced);
  if (!memory) return null;
  return JSON.parse(memory.value) as T;
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds = env.CACHE_DEFAULT_TTL_SECONDS) {
  if (!env.CACHE_ENABLED) return;
  const namespaced = withPrefix(key);
  const payload = JSON.stringify(value);

  const client = await getRedisClient();
  if (client) {
    await client.set(namespaced, payload, { EX: ttlSeconds });
    return;
  }

  memoryCache.set(namespaced, {
    value: payload,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function cacheGetOrSet<T>(
  key: string,
  producer: () => Promise<T>,
  ttlSeconds = env.CACHE_DEFAULT_TTL_SECONDS,
) {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const value = await producer();
  await cacheSet(key, value, ttlSeconds);
  return value;
}
