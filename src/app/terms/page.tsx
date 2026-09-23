import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Användarvillkor — Clarix",
  description: "Villkoren för att använda Clarix.",
};

// Every statement below describes what the code in this repository does today.
// If the implementation changes, this page changes in the same commit.
//
// Google's OAuth verification requires a Terms of Service on the same domain
// as the home page and privacy policy (docs/google-oauth-production.md §6).

export default function TermsPage() {
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
          Användarvillkor
        </h1>
        <p className="text-sm mb-12" style={{ color: "var(--slate)" }}>
          Senast uppdaterad: september 2026
        </p>

        <div className="flex flex-col gap-10 text-sm leading-relaxed" style={{ color: "var(--charcoal)" }}>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">1. Vem vi är och vad detta gäller</h2>
            <p>
              Clarix är en tjänst för digital rapportering som hämtar statistik från Google
              Analytics 4 och Google Search Console och presenterar den som dashboard och
              rapport. Tjänsten tillhandahålls av Khyte Team.
            </p>
            <p>
              Genom att skapa ett konto eller använda Clarix godkänner du dessa villkor.
              Godkänner du dem inte ska du inte använda tjänsten.
            </p>
            <p>
              Kontakt: <a href="mailto:hai@khyteteam.com" className="underline underline-offset-2">hai@khyteteam.com</a>
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">2. Konto och ansvar</h2>
            <ul className="flex flex-col gap-2 pl-4" style={{ listStyleType: "disc" }}>
              <li>Du ansvarar för att uppgifterna du lämnar vid registrering är korrekta.</li>
              <li>Du ansvarar för att hålla dina inloggningsuppgifter hemliga och för det som sker i ditt konto.</li>
              <li>Du måste ha rätt att ge Clarix åtkomst till de Google-egendomar du kopplar. Kopplar du en kunds egendom ansvarar du för att kunden godkänt det.</li>
              <li>Du får inte använda Clarix för något olagligt, eller försöka komma åt andra användares uppgifter.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">3. Vad tjänsten gör med dina Google-konton</h2>
            <p>
              Clarix läser statistik med läsbehörighet (<code className="text-xs bg-black/5 px-1 py-0.5 rounded">analytics.readonly</code>{" "}
              och <code className="text-xs bg-black/5 px-1 py-0.5 rounded">webmasters.readonly</code>) från de egendomar du
              själv väljer. Vi skriver aldrig till dina Google-konton, publicerar inget
              innehåll och kan inte ändra eller radera din data hos Google.
            </p>
            <p>
              Du kan när som helst koppla från Google under Integrationer. Då återkallas
              åtkomsten hos Google och dina tokens raderas. Hur uppgifterna behandlas
              beskrivs i{" "}
              <Link href="/privacy-policy" className="underline underline-offset-2">
                integritetspolicyn
              </Link>
              .
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">4. Delade rapporter</h2>
            <p>
              Skapar du en delningslänk sparas en ögonblicksbild av rapporten som vem som
              helst med länken kan öppna, utan inloggning. Du ansvarar för vem du delar
              länken med. Dela inte rapporter som innehåller uppgifter du inte får sprida.
            </p>
            <p>
              Länken slutar fungera automatiskt efter 90 dagar. Du kan återkalla den
              tidigare under <em>Inställningar → Delade länkar</em>. Återkallar du en länk
              slutar den fungera omedelbart, även för den som redan fått den.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">5. Tillgänglighet och ändringar</h2>
            <p>
              Clarix tillhandahålls i befintligt skick. Vi strävar efter hög tillgänglighet
              men kan inte garantera att tjänsten alltid är tillgänglig eller felfri. Vi
              kan komma att ändra, begränsa eller avveckla funktioner. Vid väsentliga
              ändringar meddelar vi dig i förväg via e-post eller i appen.
            </p>
            <p>
              Clarix är beroende av Googles API:er. Om Google ändrar, begränsar eller
              stänger av åtkomsten kan delar av tjänsten sluta fungera utan att det beror
              på oss.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">6. Data och riktighet</h2>
            <p>
              Siffrorna i Clarix hämtas från Google och presenteras så troget källan som
              möjligt, men vi ansvarar inte för fel i Googles underliggande data eller för
              beslut du fattar utifrån rapporterna. Sammanfattningar som genereras
              automatiskt är hjälptext, inte rådgivning.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">7. Ansvarsbegränsning</h2>
            <p>
              Vi ansvarar inte för indirekta skador, utebliven vinst eller förlorad data
              till följd av användningen av tjänsten. Inget i dessa villkor begränsar
              ansvar som enligt tvingande svensk lag inte får begränsas, och ingenting
              inskränker dina rättigheter som konsument.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">8. Uppsägning</h2>
            <p>
              Du kan sluta använda Clarix när som helst och begära att ditt konto raderas
              genom att kontakta oss. Vi kan stänga av ett konto som bryter mot dessa
              villkor eller används på ett sätt som skadar tjänsten eller andra användare.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">9. Tillämplig lag</h2>
            <p>
              Svensk lag tillämpas. Tvister prövas av svensk allmän domstol. Är du konsument
              kan du också vända dig till Allmänna reklamationsnämnden (ARN).
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">10. Ändringar i villkoren</h2>
            <p>
              Vi kan uppdatera dessa villkor. Vid väsentliga ändringar meddelar vi dig innan
              de träder i kraft. Datumet längst upp visar när villkoren senast ändrades.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
