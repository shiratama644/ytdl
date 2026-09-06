import { Innertube, UniversalCache } from 'youtubei.js';

/**
 * youtubei.js の ICache 型はトップレベルで export されていないため、
 * ここでは UniversalCache のインスタンス型で代用する。
 */
type CacheInstance = InstanceType<typeof UniversalCache>;

/**
 * YouTube 非公式内部 API のラッパー（シングルトン）。
 * セッション生成コストが高いためプロセス内で一度だけ生成し、使い回す。
 *
 * ## 注意（ボット対策）
 * YouTube は PoToken / botguard 等の要求を継続的に変更する。問題が発生した場合は
 * - `cache`（UniversalCache）で visitor_data を永続化する
 * - 一定時間ごとにセッションを再生成する（本モジュールの SESSION_TTL_MS）
 * - `Innertube.create` を再実行してセッションを更新する
 * などの対処を実装し、youtubei.js の最新 README を必ず確認すること。
 */

let client: Innertube | null = null;
let cache: CacheInstance | null = null;
let sessionCreatedAt = 0;
const SESSION_TTL_MS = 15 * 60 * 1000;

/** Node.js 環境でのみキャッシュを初期化する（browser では undefined）。 */
async function loadCache(): Promise<CacheInstance | undefined> {
  if (typeof window !== 'undefined') return undefined;
  if (cache) return cache;
  try {
    // UniversalCache はディスクキャッシュ（.cache/youtubei.js）を使う。
    cache = new UniversalCache(true);
    return cache;
  } catch {
    return undefined;
  }
}

export interface InnertubeConfig {
  /** 言語（既定: 日本語） */
  lang?: string;
  /** 地域（既定: JP） */
  location?: string;
  /** セッションを強制再生成する */
  forceRefresh?: boolean;
}

/**
 * Innertube クライアントを取得する（シングルトン）。
 * 世代が進みすぎたらセッションを破棄して再生成する。
 */
export async function getInnertube(options: InnertubeConfig = {}): Promise<Innertube> {
  const now = Date.now();
  const stale =
    !client ||
    (options.forceRefresh ?? false) ||
    now - sessionCreatedAt > SESSION_TTL_MS;

  if (!client || stale) {
    client = null;
    const cache = await loadCache();
    const lang = options.lang ?? process.env.YTDL_LANG ?? 'ja';
    const location = options.location ?? process.env.YTDL_LOCATION ?? 'JP';
    client = await Innertube.create({
      lang,
      location,
      cache,
    });
    sessionCreatedAt = now;
  }
  return client;
}

/** セッションを強制破棄して次回生成させる（呼び出し側から回転させる場合）。 */
export async function resetInnertube(): Promise<void> {
  client = null;
  sessionCreatedAt = 0;
}

export function hasInnertube(): boolean {
  return client !== null;
}
