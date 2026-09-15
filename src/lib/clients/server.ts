// Workspace ("Kund") persistence. Runs with the user-scoped Supabase client,
// so RLS already restricts every query to auth.uid(); the explicit user_id
// filters below are belt-and-braces.
//
// Invariants this module protects:
//   * at most one active workspace per user (DB partial unique index + RPC)
//   * at most one property per source per workspace (DB unique constraint)
//   * reconnecting / disconnecting Google never touches these rows

import type { SupabaseClient } from "@supabase/supabase-js";
import { clearReportCache } from "@/lib/google/report-cache";
import type {
  ClientSourceKind,
  ClientSourceRef,
  ClientWorkspace,
} from "./types";
import { domainFromGscSiteUrl } from "./naming";

export type ClientRow = {
  id: string;
  user_id: string;
  name: string;
  domain: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ClientSourceRow = {
  id: string;
  client_id: string;
  user_id: string;
  source: ClientSourceKind;
  property_id: string;
  display_name: string | null;
};

const CLIENT_COLUMNS = "id, user_id, name, domain, is_active, created_at, updated_at";
const SOURCE_COLUMNS = "id, client_id, user_id, source, property_id, display_name";

export class ClientNotFoundError extends Error {
  constructor() {
    super("client_not_found");
    this.name = "ClientNotFoundError";
  }
}

/** Pure: joins client rows with their source rows. Exported for tests. */
export function mapClientRows(clients: ClientRow[], sources: ClientSourceRow[]): ClientWorkspace[] {
  const byClient = new Map<string, ClientWorkspace["sources"]>();
  for (const s of sources) {
    const bucket = byClient.get(s.client_id) ?? {};
    bucket[s.source] = { propertyId: s.property_id, displayName: s.display_name };
    byClient.set(s.client_id, bucket);
  }

  return clients
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((c) => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      isActive: c.is_active,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      sources: byClient.get(c.id) ?? {},
    }));
}

export async function listClients(supabase: SupabaseClient, userId: string): Promise<ClientWorkspace[]> {
  const [{ data: clients, error: clientsError }, { data: sources, error: sourcesError }] = await Promise.all([
    supabase.from("clients").select(CLIENT_COLUMNS).eq("user_id", userId),
    supabase.from("client_sources").select(SOURCE_COLUMNS).eq("user_id", userId),
  ]);
  if (clientsError) throw new Error(`clients read failed: ${clientsError.message}`);
  if (sourcesError) throw new Error(`client_sources read failed: ${sourcesError.message}`);
  return mapClientRows((clients ?? []) as ClientRow[], (sources ?? []) as ClientSourceRow[]);
}

export async function getActiveClient(supabase: SupabaseClient, userId: string): Promise<ClientWorkspace | null> {
  const { data: client, error } = await supabase
    .from("clients")
    .select(CLIENT_COLUMNS)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(`clients read failed: ${error.message}`);
  if (!client) return null;

  const { data: sources, error: sourcesError } = await supabase
    .from("client_sources")
    .select(SOURCE_COLUMNS)
    .eq("user_id", userId)
    .eq("client_id", (client as ClientRow).id);
  if (sourcesError) throw new Error(`client_sources read failed: ${sourcesError.message}`);

  return mapClientRows([client as ClientRow], (sources ?? []) as ClientSourceRow[])[0] ?? null;
}

export async function getClientById(
  supabase: SupabaseClient,
  userId: string,
  clientId: string,
): Promise<ClientWorkspace | null> {
  const { data: client, error } = await supabase
    .from("clients")
    .select(CLIENT_COLUMNS)
    .eq("user_id", userId)
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw new Error(`clients read failed: ${error.message}`);
  if (!client) return null;

  const { data: sources, error: sourcesError } = await supabase
    .from("client_sources")
    .select(SOURCE_COLUMNS)
    .eq("user_id", userId)
    .eq("client_id", clientId);
  if (sourcesError) throw new Error(`client_sources read failed: ${sourcesError.message}`);

  return mapClientRows([client as ClientRow], (sources ?? []) as ClientSourceRow[])[0] ?? null;
}

export async function setActiveClient(
  supabase: SupabaseClient,
  userId: string,
  clientId: string,
): Promise<void> {
  const { error } = await supabase.rpc("set_active_client", { p_client_id: clientId });
  if (error) {
    if (error.code === "P0002" || /not found/i.test(error.message)) throw new ClientNotFoundError();
    throw new Error(`set_active_client failed: ${error.message}`);
  }
  void userId;
}

export async function createClientWorkspace(
  supabase: SupabaseClient,
  userId: string,
  input: {
    name: string;
    domain?: string | null;
    sources?: Partial<Record<Exclude<ClientSourceKind, "google_ads">, ClientSourceRef | null>>;
    activate?: boolean;
  },
): Promise<ClientWorkspace> {
  const domain = normaliseDomain(input.domain) ?? (input.sources?.gsc ? domainFromGscSiteUrl(input.sources.gsc.propertyId) : null);

  const { data, error } = await supabase
    .from("clients")
    .insert({ user_id: userId, name: input.name.trim().slice(0, 120), domain, is_active: false })
    .select(CLIENT_COLUMNS)
    .single();
  if (error || !data) throw new Error(`clients insert failed: ${error?.message ?? "no row"}`);
  const client = data as ClientRow;

  const sourceRows = Object.entries(input.sources ?? {})
    .filter((entry): entry is [ClientSourceKind, ClientSourceRef] => Boolean(entry[1]))
    .map(([source, ref]) => ({
      client_id: client.id,
      user_id: userId,
      source,
      property_id: ref.propertyId,
      display_name: ref.displayName,
    }));

  if (sourceRows.length > 0) {
    const { error: sourcesError } = await supabase.from("client_sources").insert(sourceRows);
    if (sourcesError) throw new Error(`client_sources insert failed: ${sourcesError.message}`);
  }

  // First workspace becomes active automatically; otherwise only on request.
  const { count } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);
  if (input.activate || (count ?? 0) === 0) {
    await setActiveClient(supabase, userId, client.id);
  }

  return (await getClientById(supabase, userId, client.id))!;
}

export async function updateClientWorkspace(
  supabase: SupabaseClient,
  userId: string,
  clientId: string,
  patch: { name?: string; domain?: string | null },
): Promise<ClientWorkspace> {
  const update: Partial<Pick<ClientRow, "name" | "domain">> = {};
  if (typeof patch.name === "string") update.name = patch.name.trim().slice(0, 120);
  if (patch.domain !== undefined) update.domain = normaliseDomain(patch.domain);

  if (Object.keys(update).length > 0) {
    const { data, error } = await supabase
      .from("clients")
      .update(update)
      .eq("user_id", userId)
      .eq("id", clientId)
      .select("id");
    if (error) throw new Error(`clients update failed: ${error.message}`);
    if (!data || data.length === 0) throw new ClientNotFoundError();
  }

  const client = await getClientById(supabase, userId, clientId);
  if (!client) throw new ClientNotFoundError();
  return client;
}

/**
 * Deletes a workspace. If it was the active one, the most recently created
 * remaining workspace takes over so the user is never left without one.
 */
export async function deleteClientWorkspace(
  supabase: SupabaseClient,
  userId: string,
  clientId: string,
): Promise<{ nextActiveId: string | null }> {
  const existing = await getClientById(supabase, userId, clientId);
  if (!existing) throw new ClientNotFoundError();

  const { error } = await supabase.from("clients").delete().eq("user_id", userId).eq("id", clientId);
  if (error) throw new Error(`clients delete failed: ${error.message}`);

  for (const [source, ref] of Object.entries(existing.sources)) {
    if (ref && (source === "ga4" || source === "gsc")) {
      await clearReportCache(supabase, userId, source, ref.propertyId);
    }
  }

  if (!existing.isActive) return { nextActiveId: null };

  const { data: remaining } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  const next = (remaining?.[0] as { id: string } | undefined)?.id ?? null;
  if (next) await setActiveClient(supabase, userId, next);
  return { nextActiveId: next };
}

/** Assigns (or replaces) the property a workspace uses for one source. */
export async function setClientSource(
  supabase: SupabaseClient,
  userId: string,
  clientId: string,
  source: Exclude<ClientSourceKind, "google_ads">,
  ref: ClientSourceRef,
): Promise<ClientWorkspace> {
  const client = await getClientById(supabase, userId, clientId);
  if (!client) throw new ClientNotFoundError();

  const previous = client.sources[source];

  const { error } = await supabase.from("client_sources").upsert(
    {
      client_id: clientId,
      user_id: userId,
      source,
      property_id: ref.propertyId,
      display_name: ref.displayName,
    },
    { onConflict: "client_id,source" },
  );
  if (error) throw new Error(`client_sources upsert failed: ${error.message}`);

  if (previous && previous.propertyId !== ref.propertyId) {
    await clearReportCache(supabase, userId, source, previous.propertyId);
  }

  // A GSC site tells us the domain outright; fill it in if the workspace has none.
  if (source === "gsc" && !client.domain) {
    const domain = domainFromGscSiteUrl(ref.propertyId);
    if (domain) {
      await supabase.from("clients").update({ domain }).eq("user_id", userId).eq("id", clientId);
    }
  }

  return (await getClientById(supabase, userId, clientId))!;
}

/** Removes one source from a workspace. The Google grant is untouched. */
export async function removeClientSource(
  supabase: SupabaseClient,
  userId: string,
  clientId: string,
  source: Exclude<ClientSourceKind, "google_ads">,
): Promise<ClientWorkspace> {
  const client = await getClientById(supabase, userId, clientId);
  if (!client) throw new ClientNotFoundError();

  const previous = client.sources[source];
  const { error } = await supabase
    .from("client_sources")
    .delete()
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .eq("source", source);
  if (error) throw new Error(`client_sources delete failed: ${error.message}`);

  if (previous) await clearReportCache(supabase, userId, source, previous.propertyId);

  return (await getClientById(supabase, userId, clientId))!;
}

/** Sets a workspace's domain only when it has none yet (best-effort enrichment). */
export async function fillClientDomainIfEmpty(
  supabase: SupabaseClient,
  userId: string,
  clientId: string,
  domain: string | null,
): Promise<void> {
  const normalised = normaliseDomain(domain);
  if (!normalised) return;
  await supabase
    .from("clients")
    .update({ domain: normalised })
    .eq("user_id", userId)
    .eq("id", clientId)
    .is("domain", null);
}

/** Every property id the user has assigned to any workspace for a source. */
export async function listAssignedPropertyIds(
  supabase: SupabaseClient,
  userId: string,
  source: ClientSourceKind,
): Promise<Array<{ propertyId: string; displayName: string | null; clientId: string; clientName: string; isActive: boolean }>> {
  const clients = await listClients(supabase, userId);
  return clients
    .flatMap((c) => {
      const ref = c.sources[source];
      return ref ? [{ propertyId: ref.propertyId, displayName: ref.displayName, clientId: c.id, clientName: c.name, isActive: c.isActive }] : [];
    })
    .sort((a, b) => Number(b.isActive) - Number(a.isActive));
}

function normaliseDomain(domain: string | null | undefined): string | null {
  if (domain === undefined || domain === null) return null;
  const trimmed = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  return trimmed.length > 0 ? trimmed.slice(0, 253) : null;
}
