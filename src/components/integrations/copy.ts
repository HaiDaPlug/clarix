import type { ConnectModalCopy } from "./connect-modal";
import type { GoogleConnectionCopy } from "./GoogleConnectionCard";

export type IntegrationsPageCopy = ConnectModalCopy & {
  google: GoogleConnectionCopy;
  loadingConnections: string;
  failedConnections: string;
  failedProperties: string;
  selectedFor: (workspace: string) => string;
  notSelected: string;
  needsGoogle: string;
  returnConnected: string;
  returnDenied: string;
  returnIncomplete: Record<string, string>;
  returnError: Record<string, string>;
  manage: string;
  progress: (connected: number, total: number) => string;
  workspaceHint: string;
  workspaceLink: string;
};

export const INTEGRATIONS_COPY: Record<"sv" | "en", IntegrationsPageCopy> = {
  sv: {
    loadingConnections: "Hämtar anslutningar...",
    loadingProperties: "Hämtar tillgängliga egendomar...",
    choose: "Välj vilken egendom arbetsytan ska använda.",
    chooseReplace: "Välj en annan egendom. Bytet kräver ingen ny Google-inloggning.",
    chooseTitle: "Välj egendom",
    noProperties: "Inga egendomar hittades",
    noPropertiesHelp: "Google-kontot du anslöt har ingen egendom av den här typen. Ge kontot åtkomst i Google, eller anslut ett annat Google-konto ovan.",
    reconnect: "Behöver förnyas",
    connectedTo: "Ansluten till",
    failedConnections: "Kunde inte hämta anslutningar.",
    failedProperties: "Kunde inte hämta Google-egendomar.",
    failedConnect: "Kunde inte spara egendomen.",
    failedDisconnect: "Kunde inte ta bort egendomen.",
    connecting: "Sparar...",
    disconnecting: "Tar bort...",
    selectedTitle: "Vald egendom",
    selectedHelp: "Data hämtas automatiskt från den här egendomen.",
    changeProperty: "Byt egendom",
    removeProperty: "Ta bort",
    done: "Klar",
    cancel: "Avbryt",
    propertyLabel: "Egendom",
    workspaceLabel: "Arbetsyta",
    readOnlyNote: "Clarix läser endast statistik. Vi publicerar aldrig innehåll och kan inte ändra eller radera data.",
    googleNotReady: "Google-åtkomsten behöver förnyas innan egendomar kan väljas. Egendomen är sparad och används igen så fort åtkomsten är tillbaka.",
    selectedFor: (workspace) => `Vald för ${workspace}`,
    notSelected: "Ingen egendom vald ännu.",
    needsGoogle: "Anslut Google-kontot ovan först.",
    returnConnected: "Google är anslutet. Välj nu vilka egendomar som ska användas.",
    returnDenied: "Anslutningen avbröts. Inget ändrades — försök igen när du vill.",
    returnIncomplete: {
      missing_scopes: "Google gav inte åtkomst till både Analytics och Search Console. Anslut igen och lämna båda rutorna ikryssade.",
      missing_refresh_token: "Google gav ingen långvarig åtkomst. Anslut igen så begär vi den på nytt.",
    },
    returnError: {
      state_missing: "Anslutningen tog för lång tid eller startades i en annan flik. Försök igen.",
      state_mismatch: "Anslutningen kunde inte verifieras. Försök igen.",
      user_mismatch: "Anslutningen startades av ett annat konto. Försök igen.",
      exchange_failed: "Google godkände inte anslutningen. Försök igen.",
      google_unavailable: "Google svarade inte just nu. Försök igen om en stund.",
      server_misconfigured: "Servern saknar konfiguration för Google-anslutning. Kontakta support.",
      provider_error: "Google avbröt anslutningen. Försök igen.",
    },
    manage: "Hantera",
    progress: (connected, total) => `${connected} av ${total} kanaler kopplade`,
    workspaceHint: "Egendomarna nedan gäller den aktiva arbetsytan.",
    workspaceLink: "Byt arbetsyta under Kunder →",
    google: {
      title: "Google-konto",
      checking: "Kontrollerar",
      connected: "Ansluten",
      connectedHelp: "Clarix kan läsa Analytics och Search Console. Åtkomsten förnyas automatiskt i bakgrunden.",
      reconnectRequired: "Behöver förnyas",
      reconnectHelp: {
        invalid_grant: "Google har återkallat åtkomsten eller så har den löpt ut. Anslut igen — dina valda egendomar finns kvar.",
        missing_refresh_token: "Google gav ingen långvarig åtkomst. Anslut igen så begär vi den på nytt.",
        missing_scopes: "Åtkomst saknas till Analytics eller Search Console. Anslut igen och lämna båda rutorna ikryssade.",
      },
      disconnected: "Inte ansluten",
      disconnectedHelp: "Anslut ditt Google-konto för att hämta data från Analytics och Search Console. Du väljer egendomar i nästa steg.",
      error: "Kunde inte kontrollera",
      errorHelp: {
        google_unavailable: "Google svarade inte just nu. Din åtkomst är oförändrad — försök igen om en stund.",
        server_misconfigured: "Servern saknar konfiguration för Google-anslutning (Supabase secret key eller Google client). Kontakta support.",
      },
      connectCta: "Anslut Google",
      reconnectCta: "Anslut Google igen",
      retryCta: "Försök igen",
      disconnectCta: "Koppla från Google",
      disconnecting: "Kopplar från...",
      lastChecked: (time) => `Kontrollerad ${time}`,
    },
  },
  en: {
    loadingConnections: "Loading connections...",
    loadingProperties: "Loading available properties...",
    choose: "Choose which property this workspace should use.",
    chooseReplace: "Pick a different property. Switching needs no new Google sign-in.",
    chooseTitle: "Choose property",
    noProperties: "No properties found",
    noPropertiesHelp: "The Google account you connected has no property of this kind. Grant it access in Google, or connect another Google account above.",
    reconnect: "Needs renewal",
    connectedTo: "Connected to",
    failedConnections: "Could not load connections.",
    failedProperties: "Could not load Google properties.",
    failedConnect: "Could not save the property.",
    failedDisconnect: "Could not remove the property.",
    connecting: "Saving...",
    disconnecting: "Removing...",
    selectedTitle: "Selected property",
    selectedHelp: "Data is fetched automatically from this property.",
    changeProperty: "Change property",
    removeProperty: "Remove",
    done: "Done",
    cancel: "Cancel",
    propertyLabel: "Property",
    workspaceLabel: "Workspace",
    readOnlyNote: "Clarix only reads statistics. We never publish content and cannot change or delete data.",
    googleNotReady: "Google access needs renewal before properties can be chosen. The property stays saved and is used again as soon as access is back.",
    selectedFor: (workspace) => `Selected for ${workspace}`,
    notSelected: "No property selected yet.",
    needsGoogle: "Connect the Google account above first.",
    returnConnected: "Google is connected. Now choose which properties to use.",
    returnDenied: "Connection cancelled. Nothing changed — try again whenever you like.",
    returnIncomplete: {
      missing_scopes: "Google did not grant access to both Analytics and Search Console. Connect again and leave both boxes checked.",
      missing_refresh_token: "Google did not grant long-lived access. Connect again and we will request it anew.",
    },
    returnError: {
      state_missing: "The connection took too long or was started in another tab. Try again.",
      state_mismatch: "The connection could not be verified. Try again.",
      user_mismatch: "The connection was started by a different account. Try again.",
      exchange_failed: "Google did not accept the connection. Try again.",
      google_unavailable: "Google did not respond right now. Try again in a moment.",
      server_misconfigured: "The server is missing Google connection configuration. Contact support.",
      provider_error: "Google aborted the connection. Try again.",
    },
    manage: "Manage",
    progress: (connected, total) => `${connected} of ${total} channels connected`,
    workspaceHint: "The properties below apply to the active workspace.",
    workspaceLink: "Switch workspace under Clients →",
    google: {
      title: "Google account",
      checking: "Checking",
      connected: "Connected",
      connectedHelp: "Clarix can read Analytics and Search Console. Access renews automatically in the background.",
      reconnectRequired: "Needs renewal",
      reconnectHelp: {
        invalid_grant: "Google revoked the access or it has expired. Connect again — your selected properties are kept.",
        missing_refresh_token: "Google did not grant long-lived access. Connect again and we will request it anew.",
        missing_scopes: "Access to Analytics or Search Console is missing. Connect again and leave both boxes checked.",
      },
      disconnected: "Not connected",
      disconnectedHelp: "Connect your Google account to read Analytics and Search Console. You choose properties in the next step.",
      error: "Could not check",
      errorHelp: {
        google_unavailable: "Google did not respond right now. Your access is unchanged — try again in a moment.",
        server_misconfigured: "The server is missing Google connection configuration (Supabase secret key or Google client). Contact support.",
      },
      connectCta: "Connect Google",
      reconnectCta: "Connect Google again",
      retryCta: "Try again",
      disconnectCta: "Disconnect Google",
      disconnecting: "Disconnecting...",
      lastChecked: (time) => `Checked ${time}`,
    },
  },
};

export type ReturnNotice = { tone: "ok" | "warn" | "error"; text: string };

/** Turns the `?google=…&reason=…` return params from the OAuth callback into a one-shot notice. */
export function noticeFromReturnParams(
  outcome: string | null,
  reason: string | null,
  copy: IntegrationsPageCopy,
): ReturnNotice | null {
  const r = reason ?? "";
  switch (outcome) {
    case "connected":
      return { tone: "ok", text: copy.returnConnected };
    case "denied":
      return { tone: "warn", text: copy.returnDenied };
    case "incomplete":
      return { tone: "warn", text: copy.returnIncomplete[r] ?? copy.returnIncomplete.missing_scopes };
    case "error":
      return { tone: "error", text: copy.returnError[r] ?? copy.returnError.exchange_failed };
    default:
      return null;
  }
}
