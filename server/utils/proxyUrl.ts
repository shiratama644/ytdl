/**
 * Google / YouTube の外部画像 URL を自サーバーのプロキシ URL に変換するヘルパー。
 */
export function toProxyImageUrl(originalUrl: string): string {
  if (!originalUrl) return "";
  // 既にプロキシ URL の場合はそのまま
  if (originalUrl.startsWith("/api/proxy/image") || originalUrl.startsWith("/api/thumbnail/")) {
    return originalUrl;
  }
  // 相対パスまたはローカル URL
  if (originalUrl.startsWith("/")) {
    return originalUrl;
  }
  return `/api/proxy/image?url=${encodeURIComponent(originalUrl)}`;
}
