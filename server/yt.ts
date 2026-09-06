import { Innertube, UniversalCache } from "youtubei.js";

let innertubeInstance: Innertube | null = null;
let initPromise: Promise<Innertube> | null = null;

export async function getInnertube(): Promise<Innertube> {
  if (innertubeInstance) {
    return innertubeInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      innertubeInstance = await Innertube.create({
        cache: new UniversalCache(false),
        generate_session_locally: true,
      });
      return innertubeInstance;
    } catch (error) {
      initPromise = null;
      console.error("[Innertube] Failed to initialize:", error);
      throw error;
    }
  })();

  return initPromise;
}
