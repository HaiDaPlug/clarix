// Shared workspace ("Kund") types. Safe to import from "use client" files.

import type { GoogleConnectionHealth } from "@/lib/google/connection-types";

export type ClientSourceKind = "ga4" | "gsc" | "google_ads";

export type ClientSourceRef = {
  propertyId: string;
  displayName: string | null;
};

export type ClientWorkspace = {
  id: string;
  name: string;
  domain: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  sources: Partial<Record<ClientSourceKind, ClientSourceRef>>;
};

export type ClientsResponse = {
  clients: ClientWorkspace[];
  activeClientId: string | null;
  google: GoogleConnectionHealth;
};

export type ClientRequestBody = {
  name?: string;
  domain?: string | null;
  sources?: Partial<Record<Exclude<ClientSourceKind, "google_ads">, ClientSourceRef | null>>;
  activate?: boolean;
};
