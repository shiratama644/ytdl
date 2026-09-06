import { describe, expect, it } from "vitest";
import { api } from "../../src/services/api";

describe("Frontend API Client", () => {
  it("should generate stream URLs with query parameters correctly", () => {
    const url1 = api.getStreamUrl("test1234");
    expect(url1).toBe("/api/stream/test1234");

    const url2 = api.getStreamUrl("test1234", {
      itag: 18,
      quality: "360p",
      type: "videoandaudio",
    });
    expect(url2).toContain("itag=18");
    expect(url2).toContain("quality=360p");
    expect(url2).toContain("type=videoandaudio");

    const url3 = api.getStreamUrl("test1234", {
      type: "audio",
      download: true,
    });
    expect(url3).toContain("type=audio");
    expect(url3).toContain("download=true");
  });
});
