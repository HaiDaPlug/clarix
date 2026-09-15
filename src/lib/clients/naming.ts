// Pure helpers for turning Google property identifiers into workspace names
// and domains. Kept dependency-free so both server and client code can use
// them and so they are trivial to test.

const NOISE = [
  "GA4",
  "Google Analytics 4",
  "Google Analytics",
  "Analytics",
  "GSC",
  "Google Search Console",
  "Search Console",
  "Google Ads",
  "Ads",
];

const NOISE_PATTERN = NOISE.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
const NOISE_RE = new RegExp(
  `(?:[\\s\\-–“|]+(?:${NOISE_PATTERN})\\s*$|^\\s*(?:${NOISE_PATTERN})[\\s\\-–“|]+|\\s*[\\(\\[](?:${NOISE_PATTERN})[\\)\\]])`,
  "gi",
);

/** "Acme AB - GA4" → "Acme AB". Falls back to the input when cleaning would empty it. */
export function cleanPropertyDisplayName(name: string): string {
  const cleaned = name.replace(NOISE_RE, "").trim();
  return cleaned.length > 0 ? cleaned : name.trim();
}

/**
 * Search Console site identifiers are either `sc-domain:example.com` or a
 * URL-prefix like `https://www.example.com/`. Both reduce to a bare domain.
 */
export function domainFromGscSiteUrl(siteUrl: string): string | null {
  const trimmed = siteUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("sc-domain:")) {
    return stripWww(trimmed.slice("sc-domain:".length)) || null;
  }
  return domainFromUrl(trimmed);
}

/** Hostname of a URL (or bare hostname) without a leading `www.`. */
export function domainFromUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return stripWww(url.hostname) || null;
  } catch {
    return stripWww(trimmed.replace(/\/.*$/, "")) || null;
  }
}

function stripWww(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

/** Best display name for a workspace created from a property. */
export function workspaceNameFromProperty(displayName: string | null | undefined, propertyId: string): string {
  const base = displayName?.trim() || propertyId;
  return cleanPropertyDisplayName(base).slice(0, 120);
}
