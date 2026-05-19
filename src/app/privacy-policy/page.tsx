import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Integritetspolicy — Clarix",
  description: "Hur Clarix samlar in, använder och skyddar dina uppgifter.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-dvh" style={{ backgroundColor: "var(--bone)", color: "var(--charcoal)" }}>
      <div className="mx-auto max-w-2xl px-6 py-20">

        <Link
          href="/"
          className="text-xs mb-12 inline-block transition-opacity hover:opacity-60"
          style={{ color: "var(--slate)" }}
        >
          ← Tillbaka
        </Link>

        <h1 className="font-display text-[2.2rem] leading-[1.15] tracking-tight mb-3">
          Integritetspolicy
        </h1>
        <p className="text-sm mb-12" style={{ color: "var(--slate)" }}>
          Senast uppdaterad: maj 2025
        </p>

        <div className="flex flex-col gap-10 text-sm leading-relaxed" style={{ color: "var(--charcoal)" }}>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">1. Vem vi är</h2>
            <p>
              Clarix är en tjänst för digital rapportering riktad till SME-företag i Sverige.
              Vi är personuppgiftsansvarig för de uppgifter du lämnar till oss när du skapar
              ett konto och kopplar dina Google-tjänster.
            </p>
            <p>
              Kontakt: <a href="mailto:hai@khyteteam.com" className="underline underline-offset-2">hai@khyteteam.com</a>
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">2. Vilka uppgifter vi samlar in</h2>
            <p>Vi samlar in två kategorier av uppgifter:</p>
            <ul className="flex flex-col gap-2 pl-4" style={{ listStyleType: "disc" }}>
              <li>
                <strong>Kontouppgifter</strong> — e-postadress och lösenord (om du registrerar
                dig med e-post), eller din Google-kontoinformation (namn, e-post, profilbild)
                om du loggar in via Google.
              </li>
              <li>
                <strong>Google OAuth-tokens</strong> — åtkomsttoken och uppdateringstoken för
                dina anslutna Google-tjänster (Google Analytics 4 och Google Search Console).
                Dessa lagras krypterat i vår databas och används uteslutande för att hämta
                din analysdata på begäran.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">3. Vad vi <em>inte</em> lagrar</h2>
            <p>
              All analysdata från Google Analytics 4 och Google Search Console — trafik,
              söktermer, sidvisningar och liknande — hämtas i realtid när du öppnar en
              rapport och lagras <strong>aldrig</strong> i vår databas. Den behandlas enbart
              i minnet på servern och visas sedan direkt i din webbläsare.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">4. Hur vi använder dina uppgifter</h2>
            <ul className="flex flex-col gap-2 pl-4" style={{ listStyleType: "disc" }}>
              <li>Autentisera dig och hålla din session aktiv.</li>
              <li>
                Hämta data från Google APIs på din begäran och presentera den i din rapport.
              </li>
              <li>Förnya dina Google-tokens automatiskt när de löper ut, så att du slipper logga in igen.</li>
              <li>Kontakta dig om det gäller viktiga servicemeddelanden.</li>
            </ul>
            <p>
              Vi säljer, hyr ut eller delar aldrig dina uppgifter med tredje part i
              marknadsföringssyfte.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">5. Google-data och begränsad användning</h2>
            <p>
              Clarix använder Googles API:er med läsbehörighet:
            </p>
            <ul className="flex flex-col gap-2 pl-4" style={{ listStyleType: "disc" }}>
              <li><code className="text-xs bg-black/5 px-1 py-0.5 rounded">analytics.readonly</code> — läsa din GA4-data.</li>
              <li><code className="text-xs bg-black/5 px-1 py-0.5 rounded">webmasters.readonly</code> — läsa din Search Console-data.</li>
            </ul>
            <p>
              Vi skriver aldrig till dina Google-konton och vi delar aldrig data hämtad via
              Google APIs med tredje part. Vår användning följer{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Googles Policy för användning av API-tjänster och användardata
              </a>
              , inklusive krav på begränsad användning.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">6. Underbiträden och tredjeparter</h2>
            <p>Vi använder följande tjänster för att driva Clarix:</p>
            <ul className="flex flex-col gap-2 pl-4" style={{ listStyleType: "disc" }}>
              <li>
                <strong>Supabase</strong> — databas och autentisering. Dina kontouppgifter
                och OAuth-tokens lagras här. Supabase är GDPR-kompatibelt och kan placera
                data i EU-regionen.
              </li>
              <li>
                <strong>Google Cloud</strong> — OAuth-flöde och API-anrop till Analytics och
                Search Console. Inga andra Google-produkter används.
              </li>
            </ul>
            <p>
              Vi använder <strong>inga</strong> analysverktyg för att spåra dig som
              användare (inget Segment, Mixpanel, Amplitude eller liknande), och inga
              felövervakningsverktyg som skickar data utanför ovanstående tjänster.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">7. Lagring och säkerhet</h2>
            <p>
              OAuth-tokens lagras med radnivåsäkerhet (Row-Level Security) i Supabase —
              du kan bara se och komma åt dina egna uppgifter. Sessioner hanteras via
              HTTP-only cookies.
            </p>
            <p>
              Vi behåller dina uppgifter så länge ditt konto är aktivt. Om du begär att
              ditt konto tas bort raderas alla dina uppgifter, inklusive anslutna tokens,
              inom 30 dagar.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">8. Dina rättigheter (GDPR)</h2>
            <p>Du har rätt att:</p>
            <ul className="flex flex-col gap-2 pl-4" style={{ listStyleType: "disc" }}>
              <li>Få tillgång till de uppgifter vi lagrar om dig.</li>
              <li>Rätta felaktiga uppgifter.</li>
              <li>Begära radering av ditt konto och alla tillhörande uppgifter.</li>
              <li>Återkalla ditt samtycke till Google-åtkomst när som helst via ditt Google-konto under <em>Säkerhet → Tredjepartsappar med kontoåtkomst</em>.</li>
              <li>Lämna in ett klagomål till Integritetsskyddsmyndigheten (IMY) om du anser att vi bryter mot GDPR.</li>
            </ul>
            <p>
              Skicka din begäran till{" "}
              <a href="mailto:hai@khyteteam.com" className="underline underline-offset-2">
                hai@khyteteam.com
              </a>{" "}
              så återkommer vi inom 30 dagar.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">9. Cookies</h2>
            <p>
              Vi använder enbart session-cookies som krävs för inloggning och säkerhet
              (satta av Supabase SSR). Vi använder inga spårnings- eller reklamcookies.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">10. Ändringar i denna policy</h2>
            <p>
              Om vi gör väsentliga ändringar meddelar vi dig via e-post eller ett tydligt
              meddelande i appen innan ändringen träder i kraft. Datumet längst upp på
              sidan visar när policyn senast uppdaterades.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
