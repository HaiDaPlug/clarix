import { describe, expect, it } from "vitest";
import {
  SHARE_LINK_TTL_DAYS,
  daysUntilExpiry,
  shareLinkExpiryFrom,
  shareLinkState,
} from "./share-links";

const NOW = new Date("2026-09-20T12:00:00.000Z");

describe("shareLinkExpiryFrom", () => {
  it("is SHARE_LINK_TTL_DAYS ahead of the given moment", () => {
    const expiry = shareLinkExpiryFrom(NOW);
    const days = (expiry.getTime() - NOW.getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBe(SHARE_LINK_TTL_DAYS);
  });

  it("does not mutate the date it is given", () => {
    const before = NOW.getTime();
    shareLinkExpiryFrom(NOW);
    expect(NOW.getTime()).toBe(before);
  });
});

describe("shareLinkState", () => {
  it("is active while unexpired and not revoked", () => {
    const state = shareLinkState(
      { expires_at: "2026-12-01T00:00:00.000Z", revoked_at: null },
      NOW,
    );
    expect(state).toBe("active");
  });

  it("is expired once the expiry has passed", () => {
    const state = shareLinkState(
      { expires_at: "2026-09-01T00:00:00.000Z", revoked_at: null },
      NOW,
    );
    expect(state).toBe("expired");
  });

  it("treats the exact expiry instant as expired, matching the SQL `> now()`", () => {
    const state = shareLinkState(
      { expires_at: NOW.toISOString(), revoked_at: null },
      NOW,
    );
    expect(state).toBe("expired");
  });

  it("reports revoked even when the link would still be within its window", () => {
    const state = shareLinkState(
      { expires_at: "2026-12-01T00:00:00.000Z", revoked_at: "2026-09-15T00:00:00.000Z" },
      NOW,
    );
    expect(state).toBe("revoked");
  });

  it("prefers revoked over expired, so the owner sees why it stopped working", () => {
    const state = shareLinkState(
      { expires_at: "2026-09-01T00:00:00.000Z", revoked_at: "2026-08-20T00:00:00.000Z" },
      NOW,
    );
    expect(state).toBe("revoked");
  });

  it("treats a legacy row with no expiry as active until revoked", () => {
    expect(shareLinkState({ expires_at: null, revoked_at: null }, NOW)).toBe("active");
    expect(shareLinkState({ expires_at: null, revoked_at: "2026-09-19T00:00:00.000Z" }, NOW)).toBe("revoked");
  });
});

describe("daysUntilExpiry", () => {
  it("floors to whole days", () => {
    expect(daysUntilExpiry("2026-09-25T18:00:00.000Z", NOW)).toBe(5);
  });

  it("is 0 rather than negative once past", () => {
    expect(daysUntilExpiry("2026-09-01T00:00:00.000Z", NOW)).toBe(0);
  });

  it("is null when there is no expiry", () => {
    expect(daysUntilExpiry(null, NOW)).toBeNull();
  });
});
