import { ClientType, Innertube, UniversalCache } from "youtubei.js";

export type SupportedClientType = "WEB" | "ANDROID" | "TV" | "IOS" | "MWEB";

// クライアント種別ごとのインスタンスキャッシュ
const instances = new Map<string, Innertube>();
const initPromises = new Map<string, Promise<Innertube>>();

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";

/**
 * Innertube インスタンスを取得
 * @param clientType 'WEB' | 'ANDROID' | 'TV' | 'IOS' | 'MWEB' (デフォルト: WEB)
 */
export async function getInnertube(clientType?: SupportedClientType): Promise<Innertube> {
  const key = clientType || "DEFAULT";

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
        clientType === "ANDROID"
          ? ClientType.ANDROID
          : clientType === "TV"
            ? ClientType.TV
            : clientType === "IOS"
              ? ClientType.IOS
              : clientType === "MWEB"
                ? ClientType.MWEB
                : ClientType.WEB;

      const yt = await Innertube.create({
        cache: new UniversalCache(false),
        generate_session_locally: true,
        retrieve_player: false, // decipher 抽出エラー (Failed to extract signature decipher algorithm) を回避
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
