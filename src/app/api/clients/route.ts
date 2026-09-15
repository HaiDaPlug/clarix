import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedContext, unauthorizedJson } from "@/lib/auth/server";
import { createClientWorkspace, fillClientDomainIfEmpty, listClients } from "@/lib/clients/server";
import { domainFromUrl } from "@/lib/clients/naming";
import type { ClientsResponse } from "@/lib/clients/types";
import { getGoogleAccessToken, getGoogleConnectionHealth, getGoogleConnectionStore } from "@/lib/google/connection";
import { fetchGa4PropertyWebsite } from "@/lib/google/property-discovery";

export const dynamic = "force-dynamic";

const sourceRefSchema = z.object({
  propertyId: z.string().trim().min(1).max(512),
  displayName: z.string().trim().max(200).nullable().optional(),
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  domain: z.string().trim().max(253).nullable().optional(),
  sources: z
    .object({
      ga4: sourceRefSchema.nullable().optional(),
      gsc: sourceRefSchema.nullable().optional(),
    })
    .optional(),
  activate: z.boolean().optional(),
});

export async function GET() {
  const ctx = await getAuthedContext();
  if (!ctx) return unauthorizedJson();

  try {
    const [clients, google] = await Promise.all([
      listClients(ctx.supabase, ctx.user.id),
      getGoogleConnectionHealth(getGoogleConnectionStore(), ctx.user.id),
    ]);
    const body: ClientsResponse = {
      clients,
      activeClientId: clients.find((c) => c.isActive)?.id ?? null,
      google,
    };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[clients] list failed", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: { type: "database", message: "Could not load workspaces." } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { type: "validation", message: "Invalid workspace payload." } }, { status: 400 });
  }

  const ctx = await getAuthedContext();
  if (!ctx) return unauthorizedJson();

  try {
    const input = parsed.data;
    let client = await createClientWorkspace(ctx.supabase, ctx.user.id, {
      name: input.name,
      domain: input.domain ?? null,
      sources: {
        ga4: input.sources?.ga4 ? { propertyId: input.sources.ga4.propertyId, displayName: input.sources.ga4.displayName ?? null } : null,
        gsc: input.sources?.gsc ? { propertyId: input.sources.gsc.propertyId, displayName: input.sources.gsc.displayName ?? null } : null,
      },
      activate: input.activate,
    });

    // Enrichment only: a GA4-only workspace gets its domain from the
    // property's web stream when the grant is usable. Never blocks creation.
    if (!client.domain && client.sources.ga4) {
      const token = await getGoogleAccessToken(getGoogleConnectionStore(), ctx.user.id);
      if (token.ok) {
        const website = await fetchGa4PropertyWebsite(token.accessToken, client.sources.ga4.propertyId);
        const domain = website ? domainFromUrl(website) : null;
        if (domain) {
          await fillClientDomainIfEmpty(ctx.supabase, ctx.user.id, client.id, domain);
          client = { ...client, domain };
        }
      }
    }

    return NextResponse.json({ client }, { status: 201 });
  } catch (err) {
    console.error("[clients] create failed", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: { type: "database", message: "Could not create the workspace." } }, { status: 500 });
  }
}
