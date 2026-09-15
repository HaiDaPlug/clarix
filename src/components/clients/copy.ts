export type ClientsCopy = {
  eyebrow: string;
  heading: string;
  newClient: string;
  count: (n: number) => string;
  active: string;
  activate: string;
  activating: string;
  open: string;
  edit: string;
  remove: string;
  removing: string;
  confirmRemove: (name: string) => string;
  ga4: string;
  gsc: string;
  notSelected: string;
  emptyTitle: string;
  emptyBody: string;
  emptyCta: string;
  googleReconnect: string;
  googleReconnectCta: string;
  googleDisconnected: string;
  loadFailed: string;
  saveFailed: string;
  editorCreateTitle: string;
  editorEditTitle: string;
  nameLabel: string;
  namePlaceholder: string;
  domainLabel: string;
  domainPlaceholder: string;
  sourceHint: string;
  sourceNone: string;
  sourceKeep: string;
  loadingProperties: string;
  googleNotReady: string;
  save: string;
  saving: string;
  cancel: string;
  activateOnSave: string;
};

export const CLIENTS_COPY: Record<"sv" | "en", ClientsCopy> = {
  sv: {
    eyebrow: "Arbetsytor",
    heading: "Kunder",
    newClient: "Ny kund",
    count: (n) => `${n} ${n === 1 ? "kund" : "kunder"}`,
    active: "Aktiv",
    activate: "Gör aktiv",
    activating: "Byter...",
    open: "Öppna arbetsyta",
    edit: "Redigera",
    remove: "Ta bort",
    removing: "Tar bort...",
    confirmRemove: (name) => `Ta bort arbetsytan "${name}"? Google-åtkomsten påverkas inte.`,
    ga4: "Google Analytics",
    gsc: "Search Console",
    notSelected: "Ej vald",
    emptyTitle: "Inga kunder ännu",
    emptyBody: "En arbetsyta samlar den GA4-egendom och Search Console-webbplats som en kund ska rapporteras på. Dashboard och rapport visar alltid bara den aktiva arbetsytans siffror.",
    emptyCta: "Skapa första kunden",
    googleReconnect: "Google-åtkomsten behöver förnyas. Arbetsytorna finns kvar, men data kan inte hämtas förrän du anslutit igen.",
    googleReconnectCta: "Anslut Google igen →",
    googleDisconnected: "Anslut ditt Google-konto under Integrationer för att välja egendomar.",
    loadFailed: "Kunde inte hämta kunder.",
    saveFailed: "Kunde inte spara.",
    editorCreateTitle: "Ny kund",
    editorEditTitle: "Redigera kund",
    nameLabel: "Namn",
    namePlaceholder: "T.ex. Lindqvist Juridik",
    domainLabel: "Domän",
    domainPlaceholder: "t.ex. lindqvistjuridik.se",
    sourceHint: "Egendomarna hämtas från det anslutna Google-kontot. Bytet kräver ingen ny inloggning.",
    sourceNone: "Ingen",
    sourceKeep: "Behåll nuvarande",
    loadingProperties: "Hämtar egendomar...",
    googleNotReady: "Google-åtkomsten är inte tillgänglig just nu. Namn och domän kan ändras; egendomar väljs när åtkomsten är tillbaka.",
    save: "Spara",
    saving: "Sparar...",
    cancel: "Avbryt",
    activateOnSave: "Gör till aktiv arbetsyta",
  },
  en: {
    eyebrow: "Workspaces",
    heading: "Clients",
    newClient: "New client",
    count: (n) => `${n} ${n === 1 ? "client" : "clients"}`,
    active: "Active",
    activate: "Make active",
    activating: "Switching...",
    open: "Open workspace",
    edit: "Edit",
    remove: "Remove",
    removing: "Removing...",
    confirmRemove: (name) => `Remove the workspace "${name}"? Google access is not affected.`,
    ga4: "Google Analytics",
    gsc: "Search Console",
    notSelected: "Not selected",
    emptyTitle: "No clients yet",
    emptyBody: "A workspace holds the GA4 property and Search Console site one client is reported on. The dashboard and report only ever show the active workspace's numbers.",
    emptyCta: "Create the first client",
    googleReconnect: "Google access needs renewal. Your workspaces are kept, but no data can be fetched until you reconnect.",
    googleReconnectCta: "Connect Google again →",
    googleDisconnected: "Connect your Google account under Integrations to pick properties.",
    loadFailed: "Could not load clients.",
    saveFailed: "Could not save.",
    editorCreateTitle: "New client",
    editorEditTitle: "Edit client",
    nameLabel: "Name",
    namePlaceholder: "e.g. Lindqvist Legal",
    domainLabel: "Domain",
    domainPlaceholder: "e.g. lindqvistlegal.com",
    sourceHint: "Properties come from the connected Google account. Switching needs no new sign-in.",
    sourceNone: "None",
    sourceKeep: "Keep current",
    loadingProperties: "Loading properties...",
    googleNotReady: "Google access is unavailable right now. Name and domain can be edited; properties can be chosen once access is back.",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    activateOnSave: "Make this the active workspace",
  },
};
