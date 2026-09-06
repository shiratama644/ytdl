import { ClientType, Innertube, Log, UniversalCache } from "youtubei.js";

// 未知ノードの JIT 生成警告等の過剰ログを抑制
Log.setLevel(Log.Level.ERROR);

export type SupportedClientType = "WEB" | "MWEB" | "ANDROID" | "TV" | "IOS";

// クライアント種別ごとのインスタンスキャッシュ
const instances = new Map<string, Innertube>();
const initPromises = new Map<string, Promise<Innertube>>();

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";

/**
 * Innertube インスタンスを取得
 * @param clientType 'WEB' | 'MWEB' | 'ANDROID' | 'TV' | 'IOS' (デフォルト: WEB)
 */
export async function getInnertube(clientType?: SupportedClientType): Promise<Innertube> {
  const key = clientType || "WEB";

  const cached = instances.get(key);
  if (cached) {
    return cached;
  }

  const inProgress = initPromises.get(key);
  if (inProgress) {
    return inProgress;
  }

  const promise = (async () => {
    try {
      const selectedClient =
        key === "MWEB"
          ? ClientType.MWEB
          : key === "ANDROID"
            ? ClientType.ANDROID
            : key === "TV"
              ? ClientType.TV
              : key === "IOS"
                ? ClientType.IOS
                : ClientType.WEB;

      const yt = await Innertube.create({
        // ディスクキャッシュにセッションおよび visitor データを永続化
        cache: new UniversalCache(true, "./.cache/innertube"),
        retrieve_player: false, // player decipher 抽出エラーを回避
        client_type: selectedClient,
        user_agent: DEFAULT_USER_AGENT,
        lang: "ja",
        location: "JP",
      });

      instances.set(key, yt);
      return yt;
    } catch (error) {
      initPromises.delete(key);
      console.error(`[Innertube] Failed to initialize (${key}):`, error);
      throw error;
    }
  })();

  initPromises.set(key, promise);
  return promise;
}

/** キャッシュをクリアしてインスタンスを再生成する */
export function resetInnertube(): void {
  instances.clear();
  initPromises.clear();
}
