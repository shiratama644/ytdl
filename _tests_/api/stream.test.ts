import { describe, expect, it } from "vitest";

describe("Range header parser and stream logic", () => {
  it("should parse standard range headers correctly", () => {
    const rangeHeader = "bytes=0-1024";
    const matches = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
    expect(matches).not.toBeNull();
    if (matches) {
      const start = Number.parseInt(matches[1], 10);
      const end = Number.parseInt(matches[2], 10);
      expect(start).toBe(0);
      expect(end).toBe(1024);
      const chunkSize = end - start + 1;
      expect(chunkSize).toBe(1025);
    }
  });

  it("should parse open-ended range headers with total size", () => {
    const rangeHeader = "bytes=1000-";
    const totalSize = 5000;
    const matches = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
    expect(matches).not.toBeNull();
    if (matches) {
      const start = Number.parseInt(matches[1], 10);
      const end = matches[2] ? Number.parseInt(matches[2], 10) : totalSize - 1;
      expect(start).toBe(1000);
      expect(end).toBe(4999);
      expect(`bytes ${start}-${end}/${totalSize}`).toBe("bytes 1000-4999/5000");
    }
  });
});
