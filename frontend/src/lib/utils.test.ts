import { describe, it, expect } from "vitest";
import { shortenAddress, formatStroops, formatDate } from "@/lib/utils";

describe("shortenAddress", () => {
  it("shortens a Stellar address", () => {
    const addr = "GA4HEQHQW5MNS3SCFJ5BNYJWBOILNXORBYB3VEFIFGJRBZJITL7XCA7T";
    const result = shortenAddress(addr, 4);
    expect(result).toBe("GA4HEQ...CA7T");
  });

  it("returns original if too short", () => {
    expect(shortenAddress("GA4H")).toBe("GA4H");
  });

  it("handles empty string", () => {
    expect(shortenAddress("")).toBe("");
  });
});

describe("formatStroops", () => {
  it("converts stroops to XLM", () => {
    expect(formatStroops(10_000_000)).toBe("1.0000000 XLM");
  });

  it("handles zero", () => {
    expect(formatStroops(0)).toBe("0.0000000 XLM");
  });

  it("handles fractional stroops", () => {
    expect(formatStroops(5_000_000)).toBe("0.5000000 XLM");
  });
});

describe("formatDate", () => {
  it("formats a timestamp", () => {
    const date = new Date("2025-07-23T12:00:00Z").getTime();
    const result = formatDate(date);
    expect(result).toContain("Jul 23");
  });
});
