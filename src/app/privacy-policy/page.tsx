import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Integritetspolicy — Clarix",
  description: "Hur Clarix samlar in, använder och skyddar dina uppgifter.",
};

// Every statement below describes what the code in this repository does today.
// If the implementation changes, this page changes in the same commit.

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
          Senast uppdaterad: september 2026
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
            <ul className="flex flex-col gap-2 pl-4" style={{ listStyleType: "disc" }}>
              <li>
                <strong>Kontouppgifter</strong> — e-postadress och lösenord (om du registrerar
                dig med e-post), eller din Google-kontoinformation (namn, e-post, profilbild)
                om du loggar in via Google. Inloggning via Google ger Clarix enbart din
                identitet — ingen åtkomst till din analysdata.
              </li>
              <li>
                <strong>Google OAuth-tokens</strong> — åtkomsttoken och uppdateringstoken för
                Google Analytics 4 och Google Search Console, som du ger separat under
                Integrationer. De används uteslutande för att hämta din analysdata åt dig.
              </li>
              <li>
                <strong>Arbetsytor</strong> — namn, domän och vilka GA4-egendomar och Search
                Console-webbplatser du valt att rapportera på.
              </li>
              <li>
                <strong>Teknisk logg vid inloggningsfel</strong> — felorsak och felkod från
                Google eller Supabase när en inloggning eller Google-anslutning misslyckas,
                utan tokens och utan personuppgifter, för felsökning.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">3. Analysdata: vad vi mellanlagrar och hur länge</h2>
            <p>
              Analysdata från Google Analytics 4 och Google Search Console hämtas på begäran
              när du öppnar dashboarden eller en rapport. För att sidorna ska ladda snabbt och
              för att vi ska kunna generera sammanfattningar lagrar vi <strong>sammanställda</strong>{" "}
              värden — aldrig råa händelseloggar eller uppgifter om enskilda besökare:
            </p>
            <ul className="flex flex-col gap-2 pl-4" style={{ listStyleType: "disc" }}>
              <li>
                <strong>Rapportcache</strong> — det färdigmappade underlaget för en period
                (besök, kanaler, toppsidor, klick, sökfrågor, positioner). Används i högst
                24 timmar för en avslutad period och 30 minuter för en pågående, därefter
                hämtas nya värden. Raderas när du byter egendom, kopplar från Google eller
                tar bort ditt konto.
              </li>
              <li>
                <strong>AI-sammanfattningar</strong> — den text som genereras utifrån de
                sammanställda värdena, sparad per arbetsyta och period i högst 24 timmar
                innan den genereras om.
              </li>
              <li>
                <strong>Delade rapporter</strong> — när du skapar en delningslänk sparas en
                ögonblicksbild av rapporten (samma sammanställda värden) så att mottagaren
                kan öppna den. Länken slutar fungera automatiskt efter 90 dagar, och du kan
                återkalla den när som helst under <em>Inställningar → Delade länkar</em>.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">4. Hur vi använder dina uppgifter</h2>
            <ul className="flex flex-col gap-2 pl-4" style={{ listStyleType: "disc" }}>
              <li>Autentisera dig och hålla din session aktiv.</li>
              <li>
                Hämta data från Google APIs på din begäran och presentera den i din dashboard
                och rapport, enbart för de egendomar du valt för den aktiva arbetsytan.
              </li>
              <li>Förnya dina Google-tokens automatiskt när de löper ut, så att du slipper ansluta igen.</li>
              <li>
                Generera sammanfattningar i klartext: de sammanställda nyckeltalen för en period
                skickas till vår AI-leverantör (se avsnitt 6). Inga tokens, ingen rådata och
                inga uppgifter om enskilda besökare ingår.
              </li>
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
              Vi skriver aldrig till dina Google-konton. Data som hämtas via Google APIs
              används bara för att visa och sammanfatta dina egna rapporter i Clarix, förs
              inte vidare till annonsnätverk eller datamäklare, och läses aldrig av människor
              utom med ditt uttryckliga medgivande eller när lagen kräver det. Vår användning
              och överföring till andra appar av information som tas emot från Googles API:er
              följer{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Google API Services User Data Policy
              </a>
              , inklusive kraven på begränsad användning (Limited Use).
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">6. Underbiträden och tredjeparter</h2>
            <p>Vi använder följande tjänster för att driva Clarix:</p>
            <ul className="flex flex-col gap-2 pl-4" style={{ listStyleType: "disc" }}>
              <li>
                <strong>Supabase</strong> — databas och autentisering. Dina kontouppgifter,
                OAuth-tokens, arbetsytor och den mellanlagrade analysdatan lagras här.
                Supabase är GDPR-kompatibelt och kan placera data i EU-regionen.
              </li>
              <li>
                <strong>Google Cloud</strong> — OAuth-flöde och API-anrop till Analytics och
                Search Console. Inga andra Google-produkter används.
              </li>
              <li>
                <strong>Vercel</strong> — drift av webbapplikationen. Behandlar dina anrop och
                serverloggar.
              </li>
              <li>
                <strong>AI-leverantör (OpenAI eller Anthropic)</strong> — tar emot de
                sammanställda nyckeltalen för en period för att generera sammanfattningar.
                Tar aldrig emot tokens, rådata eller uppgifter om enskilda besökare.
              </li>
            </ul>
            <p>
              Vi använder <strong>inga</strong> analysverktyg för att spåra dig som
              användare (inget Segment, Mixpanel, Amplitude eller liknande), och inga
              felövervakningsverktyg som skickar data utanför ovanstående tjänster.
            </p>
            <p>
              Fullständig lista med uppgifter, plats och syfte finns under{" "}
              <Link href="/subprocessors" className="underline underline-offset-2">
                underbiträden
              </Link>
              .
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">7. Lagring och säkerhet</h2>
            <p>
              Google-tokens lagras i en tabell som bara servern kan läsa — de skickas
              aldrig till webbläsaren och exponeras inte via vårt publika API. Övriga
              uppgifter skyddas med radnivåsäkerhet (Row-Level Security) i Supabase, så att
              du bara kan se dina egna uppgifter. All lagring är krypterad i vila på
              infrastrukturnivå hos Supabase; vi tillämpar ingen ytterligare
              applikationskryptering av tokens. Anslutningen till Google under auktorisering
              skyddas med PKCE och en signerad, kortlivad kontrollcookie.
            </p>
            <p>
              Vi behåller dina uppgifter så länge ditt konto är aktivt. Kopplar du från Google
              återkallas åtkomsten hos Google och tokens raderas direkt. Raderar du ditt konto
              under <em>Inställningar → Profil</em> tas allt bort omedelbart: kontot, tokens,
              arbetsytor, mellanlagrad analysdata och delade rapporter. Åtkomsten hos Google
              återkallas samtidigt. Begär du radering via e-post i stället genomför vi den
              inom 30 dagar.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">8. Dina rättigheter (GDPR)</h2>
            <p>Du har rätt att:</p>
            <ul className="flex flex-col gap-2 pl-4" style={{ listStyleType: "disc" }}>
              <li>Få tillgång till de uppgifter vi lagrar om dig.</li>
              <li>Rätta felaktiga uppgifter.</li>
              <li>Radera ditt konto och alla tillhörande uppgifter direkt under <em>Inställningar → Profil</em>, eller begära radering via e-post.</li>
              <li>Koppla från Google när som helst under Integrationer i Clarix, eller återkalla åtkomsten via ditt Google-konto under <em>Säkerhet → Tredjepartsappar med kontoåtkomst</em>.</li>
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
              Vi använder enbart cookies som krävs för inloggning och säkerhet: Supabase
              sessionscookies som håller dig inloggad, samt en tillfällig kontrollcookie
              (högst 10 minuter) medan du ansluter Google. Vi använder inga spårnings-
              eller reklamcookies. Webbläsarens lokala lagring används för dina egna
              inställningar (t.ex. sidopanel och senast visad rapport) och lämnar aldrig
              din enhet.
            </p>
            <p>
              Detaljerad beskrivning av varje cookie finns under{" "}
              <Link href="/cookies" className="underline underline-offset-2">
                cookies
              </Link>
              .
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
