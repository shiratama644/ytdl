import { Innertube, UniversalCache } from "youtubei.js";

let clientPromise: Promise<Innertube> | undefined;

export function parseVideoId(input: string): string | null {
  const normalized = input.trim();
  if (!normalized) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(normalized)) {
    return normalized;
  }

  try {
    const url = new URL(normalized);

    if (url.hostname.includes("youtu.be")) {
      const candidate = url.pathname.replaceAll("/", "");
      return /^[a-zA-Z0-9_-]{11}$/.test(candidate) ? candidate : null;
    }

    if (url.pathname.startsWith("/shorts/")) {
      const candidate = url.pathname.split("/")[2] ?? "";
      return /^[a-zA-Z0-9_-]{11}$/.test(candidate) ? candidate : null;
    }

    const candidate = url.searchParams.get("v") ?? "";
    return /^[a-zA-Z0-9_-]{11}$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function detectMode(input: string, isLive: boolean, duration: number): "watch" | "short" | "live" {
  if (isLive) return "live";
  if (input.includes("/shorts/") || (duration > 0 && duration <= 90)) return "short";
  return "watch";
}

export async function getYoutubeClient() {
  if (!clientPromise) {
    clientPromise = Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
    });
  }

  return clientPromise;
}
