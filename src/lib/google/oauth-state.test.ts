import { describe, expect, it } from "vitest";
import {
  GOOGLE_OAUTH_STATE_TTL_SECONDS,
  decodeOAuthState,
  deriveStateSecret,
  encodeOAuthState,
  generatePkcePair,
  generateState,
  sanitizeNextPath,
  statesMatch,
  type GoogleOAuthStatePayload,
} from "./oauth-state";

const SECRET = deriveStateSecret("client-secret-for-tests");
const NOW = 1_800_000_000_000;

function payload(overrides: Partial<GoogleOAuthStatePayload> = {}): GoogleOAuthStatePayload {
  return {
    state: generateState(),
    codeVerifier: generatePkcePair().verifier,
    userId: "user-1",
    next: "/integrations",
    issuedAt: NOW,
    ...overrides,
  };
}

describe("oauth state cookie", () => {
  it("round-trips a signed payload", () => {
    const p = payload();
    const encoded = encodeOAuthState(p, SECRET);
    expect(decodeOAuthState(encoded, SECRET, NOW + 1000)).toEqual(p);
  });

  it("rejects a tampered payload", () => {
    const encoded = encodeOAuthState(payload(), SECRET);
    const [data, sig] = encoded.split(".");
    const tampered = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(data, "base64url").toString()), userId: "user-2" }),
    ).toString("base64url");
    expect(decodeOAuthState(`${tampered}.${sig}`, SECRET, NOW)).toBeNull();
  });

  it("rejects a payload signed with another secret", () => {
    const encoded = encodeOAuthState(payload(), deriveStateSecret("other"));
    expect(decodeOAuthState(encoded, SECRET, NOW)).toBeNull();
  });

  it("expires after the TTL", () => {
    const encoded = encodeOAuthState(payload(), SECRET);
    expect(decodeOAuthState(encoded, SECRET, NOW + GOOGLE_OAUTH_STATE_TTL_SECONDS * 1000 - 1)).not.toBeNull();
    expect(decodeOAuthState(encoded, SECRET, NOW + GOOGLE_OAUTH_STATE_TTL_SECONDS * 1000 + 1)).toBeNull();
  });

  it("rejects garbage and missing values", () => {
    expect(decodeOAuthState(undefined, SECRET)).toBeNull();
    expect(decodeOAuthState("", SECRET)).toBeNull();
    expect(decodeOAuthState("nodot", SECRET)).toBeNull();
    expect(decodeOAuthState("abc.def", SECRET)).toBeNull();
  });
});

describe("pkce", () => {
  it("produces a verifier in the RFC 7636 length range and a distinct S256 challenge", () => {
    const { verifier, challenge } = generatePkcePair();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    expect(challenge).not.toEqual(verifier);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates unique state values", () => {
    expect(generateState()).not.toEqual(generateState());
  });

  it("compares states safely", () => {
    const s = generateState();
    expect(statesMatch(s, s)).toBe(true);
    expect(statesMatch(s, `${s}x`)).toBe(false);
    expect(statesMatch(null, s)).toBe(false);
  });
});

describe("sanitizeNextPath", () => {
  it("keeps same-origin relative paths", () => {
    expect(sanitizeNextPath("/integrations")).toBe("/integrations");
    expect(sanitizeNextPath("/clients?tab=1")).toBe("/clients?tab=1");
  });

  it("falls back for anything that could leave the origin or hit the API", () => {
    expect(sanitizeNextPath("https://evil.example")).toBe("/integrations");
    expect(sanitizeNextPath("//evil.example")).toBe("/integrations");
    expect(sanitizeNextPath("/\\evil.example")).toBe("/integrations");
    expect(sanitizeNextPath("/api/google/oauth/start")).toBe("/integrations");
    expect(sanitizeNextPath("dashboard")).toBe("/integrations");
    expect(sanitizeNextPath(null, "/x")).toBe("/x");
  });
});
