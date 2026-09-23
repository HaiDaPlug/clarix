import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookies — Clarix",
  description: "Vilka cookies Clarix använder och varför.",
};

// Every row below describes a cookie the code in this repository actually
// sets. If a cookie is added or removed, this page changes in the same commit.
//
// Clarix sets only strictly necessary cookies, which under ePrivacy/GDPR do
// not require a consent banner — but they must still be disclosed.

export default function CookiesPage() {
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
          Cookies
        </h1>
        <p className="text-sm mb-12" style={{ color: "var(--slate)" }}>
          Senast uppdaterad: september 2026
        </p>

        <div className="flex flex-col gap-10 text-sm leading-relaxed" style={{ color: "var(--charcoal)" }}>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">Kort version</h2>
            <p>
              Clarix använder <strong>enbart nödvändiga cookies</strong> — de som krävs för att
              hålla dig inloggad och för att anslutningen till Google ska gå säkert till. Vi
              använder inga cookies för spårning, marknadsföring, A/B-tester eller
              besöksstatistik, och säljer inte data till någon.
            </p>
            <p>
              Därför visar vi ingen cookiebanner: nödvändiga cookies kräver inte samtycke
              enligt GDPR och ePrivacy. Skulle vi någon gång börja använda cookies som
              kräver samtycke, frågar vi dig först.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">Cookies vi sätter</h2>

            <div className="flex flex-col gap-4 mt-1">
              <div className="flex flex-col gap-1.5">
                <p className="font-medium">
                  <code className="text-xs bg-black/5 px-1 py-0.5 rounded">sb-*</code> — inloggning
                </p>
                <p style={{ color: "var(--slate)" }}>
                  Sätts av Supabase, vår leverantör för inloggning. Håller din session aktiv så
                  att du slipper logga in på nytt vid varje sidladdning. Innehåller en
                  krypterad sessionstoken, inget vi kan läsa som identifierar dig utåt.
                  Raderas när du loggar ut eller när sessionen löper ut.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="font-medium">
                  Kontrollcookie vid Google-anslutning
                </p>
                <p style={{ color: "var(--slate)" }}>
                  En kortlivad, signerad cookie (högst 10 minuter) som sätts medan du kopplar
                  ditt Google-konto. Den skyddar mot att någon annan kapar anslutningsflödet
                  (CSRF-skydd) och raderas så fort anslutningen är klar eller avbruten.
                </p>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">Lokal lagring i din webbläsare</h2>
            <p>
              Utöver cookies sparar vi några av dina egna inställningar i webbläsarens lokala
              lagring — till exempel om sidopanelen är öppen och vilken rapport du senast
              tittade på. Detta är inga cookies, skickas aldrig till våra servrar och lämnar
              aldrig din enhet.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">Cookies vi inte använder</h2>
            <p>
              Vi använder inga analysverktyg som spårar dig som användare (inget Google
              Analytics på Clarix själv, inget Segment, Mixpanel, Amplitude eller liknande),
              inga reklamcookies, inga cookies från sociala nätverk, och inga
              tredjepartsskript som sätter egna cookies.
            </p>
            <p>
              Att Clarix <em>läser</em> din Google Analytics-data betyder inte att vi kör
              Google Analytics på den här webbplatsen — det är din egen statistik som hämtas
              via API när du är inloggad.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">Hantera cookies själv</h2>
            <p>
              Du kan när som helst radera cookies i din webbläsares inställningar. Tar du bort
              Clarix inloggningscookies loggas du ut och får logga in igen — övriga funktioner
              påverkas inte. Blockerar du alla cookies helt går det inte att logga in, eftersom
              sessionen inte kan sparas.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">Mer information</h2>
            <p>
              Hur vi behandlar personuppgifter i övrigt beskrivs i{" "}
              <Link href="/privacy-policy" className="underline underline-offset-2">
                integritetspolicyn
              </Link>
              . Vilka leverantörer som behandlar uppgifter åt oss finns i{" "}
              <Link href="/subprocessors" className="underline underline-offset-2">
                underbiträdeslistan
              </Link>
              .
            </p>
            <p>
              Frågor:{" "}
              <a href="mailto:hai@khyteteam.com" className="underline underline-offset-2">
                hai@khyteteam.com
              </a>
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
