import { describe, it, expect } from "vitest";
import { isCacheFresh } from "./report-cache";

// Fixed "now": 2026-07-18T12:00:00Z
const NOW = new Date("2026-07-18T12:00:00.000Z");

const hoursAgo = (h: number) =>
  new Date(NOW.getTime() - h * 60 * 60 * 1000).toISOString();
const minutesAgo = (m: number) =>
  new Date(NOW.getTime() - m * 60 * 1000).toISOString();

describe("isCacheFresh", () => {
  describe("closed period (ends 2+ days before today) — 24h TTL", () => {
    it("is fresh when fetched 23 hours ago", () => {
      expect(isCacheFresh("2026-07-16", hoursAgo(23), NOW)).toBe(true);
    });

    it("is stale when fetched 25 hours ago", () => {
      expect(isCacheFresh("2026-07-16", hoursAgo(25), NOW)).toBe(false);
    });

    it("treats a long-closed period the same", () => {
      expect(isCacheFresh("2026-06-01", hoursAgo(23), NOW)).toBe(true);
      expect(isCacheFresh("2026-06-01", hoursAgo(25), NOW)).toBe(false);
    });
  });

  describe("live period (includes today or yesterday) — 30min TTL", () => {
    it("period ending today is fresh at 29 minutes, stale at 31", () => {
      expect(isCacheFresh("2026-07-18", minutesAgo(29), NOW)).toBe(true);
      expect(isCacheFresh("2026-07-18", minutesAgo(31), NOW)).toBe(false);
    });

    it("period ending yesterday uses the live TTL", () => {
      expect(isCacheFresh("2026-07-17", minutesAgo(29), NOW)).toBe(true);
      expect(isCacheFresh("2026-07-17", hoursAgo(2), NOW)).toBe(false);
    });
  });

  it("boundary: period ending exactly 2 days ago is closed", () => {
    expect(isCacheFresh("2026-07-16", hoursAgo(2), NOW)).toBe(true);
  });

  it("rejects an unparseable fetched_at", () => {
    expect(isCacheFresh("2026-07-16", "not-a-date", NOW)).toBe(false);
  });
});
