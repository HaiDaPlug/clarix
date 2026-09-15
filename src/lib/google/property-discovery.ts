export type GooglePropertyOption = {
  propertyId: string;
  displayName: string;
};

export type GoogleSiteOption = {
  siteUrl: string;
  displayName: string;
};

type Ga4AccountSummariesResponse = {
  accountSummaries?: Array<{
    displayName?: string;
    propertySummaries?: Array<{
      property?: string;
      displayName?: string;
    }>;
  }>;
};

type GscSitesResponse = {
  siteEntry?: Array<{
    siteUrl?: string;
    permissionLevel?: string;
  }>;
};

const GSC_ALLOWED_PERMISSION_LEVELS = new Set(["siteOwner", "siteFullUser"]);

export async function fetchDiscoverableGoogleProperties(
  accessToken: string,
): Promise<{ ga4: GooglePropertyOption[]; gsc: GoogleSiteOption[] }> {
  const [ga4, gsc] = await Promise.all([
    fetchGa4Properties(accessToken),
    fetchGscSites(accessToken),
  ]);

  return { ga4, gsc };
}

async function fetchGa4Properties(
  accessToken: string,
): Promise<GooglePropertyOption[]> {
  const response = await googleGet<Ga4AccountSummariesResponse>(
    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
    accessToken,
  );

  return (response.accountSummaries ?? []).flatMap((account) =>
    (account.propertySummaries ?? [])
      .map((property) => {
        const propertyId = property.property?.replace(/^properties\//, "");
        if (!propertyId) return undefined;

        return {
          propertyId,
          displayName:
            property.displayName ??
            account.displayName ??
            `GA4 property ${propertyId}`,
        };
      })
      .filter(isDefined),
  );
}

async function fetchGscSites(accessToken: string): Promise<GoogleSiteOption[]> {
  const response = await googleGet<GscSitesResponse>(
    "https://www.googleapis.com/webmasters/v3/sites",
    accessToken,
  );

  return (response.siteEntry ?? [])
    .filter((site) =>
      GSC_ALLOWED_PERMISSION_LEVELS.has(site.permissionLevel ?? ""),
    )
    .map((site) => {
      const siteUrl = site.siteUrl ?? "";
      return {
        siteUrl,
        displayName: siteUrl.replace(/^sc-domain:/, ""),
      };
    })
    .filter((site) => site.siteUrl);
}

type Ga4DataStreamsResponse = {
  dataStreams?: Array<{
    type?: string;
    webStreamData?: { defaultUri?: string };
  }>;
};

/**
 * The website a GA4 property measures, from its first web data stream.
 * Best-effort: returns null on any failure so callers can treat it as
 * enrichment, never as a requirement.
 */
export async function fetchGa4PropertyWebsite(
  accessToken: string,
  propertyId: string,
): Promise<string | null> {
  const numericId = propertyId.trim().replace(/^properties\//, "");
  if (!/^\d+$/.test(numericId)) return null;
  try {
    const response = await googleGet<Ga4DataStreamsResponse>(
      `https://analyticsadmin.googleapis.com/v1beta/properties/${numericId}/dataStreams`,
      accessToken,
    );
    const web = (response.dataStreams ?? []).find(
      (stream) => stream.type === "WEB_DATA_STREAM" && stream.webStreamData?.defaultUri,
    );
    return web?.webStreamData?.defaultUri ?? null;
  } catch {
    return null;
  }
}

export class GooglePropertyDiscoveryError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "GooglePropertyDiscoveryError";
  }
}

async function googleGet<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new GooglePropertyDiscoveryError(
      `Google property discovery failed with ${response.status}: ${body.slice(0, 300)}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
