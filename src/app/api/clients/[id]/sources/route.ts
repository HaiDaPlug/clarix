import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedContext, unauthorizedJson } from "@/lib/auth/server";
import {
  ClientNotFoundError,
  fillClientDomainIfEmpty,
  removeClientSource,
  setClientSource,
} from "@/lib/clients/server";
import { domainFromUrl } from "@/lib/clients/naming";
import { getGoogleAccessToken, getGoogleConnectionStore } from "@/lib/google/connection";
import { fetchGa4PropertyWebsite } from "@/lib/google/property-discovery";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

const putSchema = z.object({
  source: z.enum(["ga4", "gsc"]),
  propertyId: z.string().trim().min(1).max(512),
  displayName: z.string().trim().max(200).nullable().optional(),
});

const deleteSchema = z.object({
  source: z.enum(["ga4", "gsc"]),
});

type Context = { params: Promise<{ id: string }> };

// Assigns which property a workspace uses for a source. Changing a property
// never touches the Google grant, so there is no re-authorization involved.
export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: { type: "validation", message: "Invalid workspace id." } }, { status: 400 });
  }
  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { type: "validation", message: "Invalid source payload." } }, { status: 400 });
  }

  const ctx = await getAuthedContext();
  if (!ctx) return unauthorizedJson();

  try {
    let client = await setClientSource(ctx.supabase, ctx.user.id, id, parsed.data.source, {
      propertyId: parsed.data.propertyId,
      displayName: parsed.data.displayName ?? null,
    });

    if (parsed.data.source === "ga4" && !client.domain) {
      const token = await getGoogleAccessToken(getGoogleConnectionStore(), ctx.user.id);
      if (token.ok) {
        const website = await fetchGa4PropertyWebsite(token.accessToken, parsed.data.propertyId);
        const domain = website ? domainFromUrl(website) : null;
        if (domain) {
          await fillClientDomainIfEmpty(ctx.supabase, ctx.user.id, id, domain);
          client = { ...client, domain };
        }
      }
    }

    return NextResponse.json({ client });
  } catch (err) {
    if (err instanceof ClientNotFoundError) {
      return NextResponse.json({ error: { type: "not_found", message: "Workspace not found." } }, { status: 404 });
    }
    console.error("[clients] set source failed", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: { type: "database", message: "Could not save the property." } }, { status: 500 });
  }
}

// Removes a property from a workspace. The Google grant stays.
export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: { type: "validation", message: "Invalid workspace id." } }, { status: 400 });
  }
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { type: "validation", message: "Invalid source payload." } }, { status: 400 });
  }

  const ctx = await getAuthedContext();
  if (!ctx) return unauthorizedJson();

  try {
    const client = await removeClientSource(ctx.supabase, ctx.user.id, id, parsed.data.source);
    return NextResponse.json({ client });
  } catch (err) {
    if (err instanceof ClientNotFoundError) {
      return NextResponse.json({ error: { type: "not_found", message: "Workspace not found." } }, { status: 404 });
    }
    console.error("[clients] remove source failed", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: { type: "database", message: "Could not remove the property." } }, { status: 500 });
  }
}
