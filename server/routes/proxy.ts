import { Hono } from "hono";

export const proxyRouter = new Hono();

// 許可する画像ホスト（ホワイトリストでオープンプロキシ悪用を防止）
const ALLOWED_IMAGE_HOSTS = [
  "i.ytimg.com",
  "yt3.ggpht.com",
  "yt3.googleusercontent.com",
  "lh3.googleusercontent.com",
  "i9.ytimg.com",
  "s.ytimg.com",
];

function isAllowedHost(host: string): boolean {
  return (
    ALLOWED_IMAGE_HOSTS.includes(host) ||
    host.endsWith(".ytimg.com") ||
    host.endsWith(".ggpht.com") ||
    host.endsWith(".googleusercontent.com")
  );
}

/**
 * 画像プロキシエンドポイント
 * GET /api/proxy/image?url=https%3A%2F%2Fi.ytimg.com%2F...
 */
proxyRouter.get("/proxy/image", async (c) => {
  const targetUrl = c.req.query("url");
  if (!targetUrl) {
    return c.text("Missing url parameter", 400);
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return c.text("Invalid URL", 400);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return c.text("Invalid protocol", 400);
  }

  if (!isAllowedHost(parsed.hostname)) {
    return c.text("Host not allowed", 403);
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.youtube.com/",
      },
    });

    if (!upstreamRes.ok) {
      return c.text("Upstream error", 502);
    }

    const contentType = upstreamRes.headers.get("content-type") || "image/jpeg";
    const body = await upstreamRes.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[Proxy Image] Error fetching upstream image:", error);
    return c.text("Failed to proxy image", 502);
  }
});

/**
 * サムネイルプロキシエンドポイント
 * GET /api/thumbnail/:id
 */
proxyRouter.get("/thumbnail/:id", async (c) => {
  const videoId = c.req.param("id");
  if (!videoId) {
    return c.text("Video ID is required", 400);
  }

  const quality = c.req.query("quality") || "hqdefault";
  const targetUrl = `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/${quality}.jpg`;

  try {
    const upstreamRes = await fetch(targetUrl);
    if (!upstreamRes.ok) {
      // フォールバック: default.jpg
      const fallbackRes = await fetch(
        `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/default.jpg`,
      );
      if (!fallbackRes.ok) {
        return c.text("Thumbnail not found", 404);
      }
      const body = await fallbackRes.arrayBuffer();
      return new Response(body, {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const body = await upstreamRes.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[Thumbnail] Error fetching thumbnail:", error);
    return c.text("Failed to load thumbnail", 502);
  }
});
