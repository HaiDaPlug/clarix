import { describe, expect, it } from "vitest";
import { cleanPropertyDisplayName, domainFromGscSiteUrl, domainFromUrl, workspaceNameFromProperty } from "./naming";
import { mapClientRows, type ClientRow, type ClientSourceRow } from "./server";

describe("cleanPropertyDisplayName", () => {
  it("strips Google product suffixes and prefixes", () => {
    expect(cleanPropertyDisplayName("Acme AB - GA4")).toBe("Acme AB");
    expect(cleanPropertyDisplayName("GA4 – Acme AB")).toBe("Acme AB");
    expect(cleanPropertyDisplayName("Acme AB (Google Analytics)")).toBe("Acme AB");
    expect(cleanPropertyDisplayName("Acme AB | Search Console")).toBe("Acme AB");
  });

  it("never returns an empty string", () => {
    expect(cleanPropertyDisplayName("GA4")).toBe("GA4");
  });
});

describe("domains", () => {
  it("derives a domain from either Search Console site format", () => {
    expect(domainFromGscSiteUrl("sc-domain:example.com")).toBe("example.com");
    expect(domainFromGscSiteUrl("https://www.example.com/")).toBe("example.com");
    expect(domainFromGscSiteUrl("http://shop.example.com/sv/")).toBe("shop.example.com");
    expect(domainFromGscSiteUrl("")).toBeNull();
  });

  it("derives a domain from a GA4 web stream URI or bare hostname", () => {
    expect(domainFromUrl("https://www.example.com")).toBe("example.com");
    expect(domainFromUrl("www.example.com")).toBe("example.com");
    expect(domainFromUrl("Example.COM/path")).toBe("example.com");
  });

  it("names a workspace from a property, falling back to the id", () => {
    expect(workspaceNameFromProperty("Acme AB - GA4", "123")).toBe("Acme AB");
    expect(workspaceNameFromProperty(null, "sc-domain:acme.se")).toBe("sc-domain:acme.se");
  });
});

describe("mapClientRows", () => {
  const clients: ClientRow[] = [
    { id: "b", user_id: "u", name: "Beta", domain: null, is_active: false, created_at: "2026-02-01T00:00:00Z", updated_at: "2026-02-01T00:00:00Z" },
    { id: "a", user_id: "u", name: "Alpha", domain: "alpha.se", is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  ];
  const sources: ClientSourceRow[] = [
    { id: "1", client_id: "a", user_id: "u", source: "ga4", property_id: "111", display_name: "Alpha GA4" },
    { id: "2", client_id: "a", user_id: "u", source: "gsc", property_id: "sc-domain:alpha.se", display_name: "alpha.se" },
    { id: "3", client_id: "b", user_id: "u", source: "ga4", property_id: "222", display_name: null },
  ];

  it("joins sources onto their workspace and orders by creation", () => {
    const result = mapClientRows(clients, sources);
    expect(result.map((c) => c.id)).toEqual(["a", "b"]);
    expect(result[0].sources.ga4?.propertyId).toBe("111");
    expect(result[0].sources.gsc?.propertyId).toBe("sc-domain:alpha.se");
    expect(result[1].sources.ga4?.propertyId).toBe("222");
    expect(result[1].sources.gsc).toBeUndefined();
  });

  it("never leaks a source from one workspace into another", () => {
    const result = mapClientRows(clients, sources);
    const allIds = result.flatMap((c) => Object.values(c.sources).map((s) => `${c.id}:${s?.propertyId}`));
    expect(allIds).toEqual(["a:111", "a:sc-domain:alpha.se", "b:222"]);
  });
});
