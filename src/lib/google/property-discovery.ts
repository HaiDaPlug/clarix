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

async function googleGet<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Google property discovery failed with ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
