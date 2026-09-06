import { describe, expect, it } from "vitest";
import { toProxyImageUrl } from "../../server/utils/proxyUrl";

describe("Proxy Image URL Helper", () => {
  it("converts external google/youtube URLs to proxy URLs", () => {
    const original = "https://i.ytimg.com/vi/test1234/hqdefault.jpg";
    const proxied = toProxyImageUrl(original);
    expect(proxied).toBe(`/api/proxy/image?url=${encodeURIComponent(original)}`);
  });

  it("leaves already proxied URLs unchanged", () => {
    const proxyUrl = "/api/proxy/image?url=something";
    expect(toProxyImageUrl(proxyUrl)).toBe(proxyUrl);

    const thumbUrl = "/api/thumbnail/test1234";
    expect(toProxyImageUrl(thumbUrl)).toBe(thumbUrl);
  });

  it("handles empty strings", () => {
    expect(toProxyImageUrl("")).toBe("");
  });
});
