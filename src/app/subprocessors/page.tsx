import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Underbiträden — Clarix",
  description: "Leverantörer som behandlar uppgifter för Clarix räkning.",
};

// Every entry describes a provider this codebase actually calls. Adding or
// removing a provider changes this page in the same commit.
//
// "Underbiträde" = sub-processor: a provider that processes personal data on
// our behalf. GDPR art. 28 requires customers to be able to see the list.

type Sub = {
  name: string;
  purpose: string;
  data: string;
  location: string;
};

const SUBPROCESSORS: Sub[] = [
  {
    name: "Supabase",
    purpose: "Databas och inloggning. Lagrar kontouppgifter, Google-tokens, arbetsytor och mellanlagrad statistik.",
    data: "E-post, namn, Google OAuth-tokens, arbetsytor, sammanställd statistik",
    location: "EU (Stockholm, eu-north-1)",
  },
  {
    name: "Vercel",
    purpose: "Drift av webbapplikationen. Behandlar inkommande anrop och serverloggar.",
    data: "IP-adress och anropsmetadata i serverloggar",
    location: "EU-region med global edge-terminering",
  },
  {
    name: "Google (Analytics Data API, Analytics Admin API, Search Console API)",
    purpose: "Källan till din statistik. Vi läser enbart, på din begäran och för de egendomar du valt.",
    data: "Sammanställd statistik från dina egna egendomar",
    location: "Google Cloud, global",
  },
  {
    name: "OpenAI",
    purpose: "Genererar sammanfattningar i klartext utifrån periodens nyckeltal.",
    data: "Sammanställda nyckeltal för en period. Aldrig tokens, rådata eller uppgifter om enskilda besökare.",
    location: "USA, med standardavtalsklausuler (SCC)",
  },
];

export default function SubprocessorsPage() {
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
          Underbiträden
        </h1>
        <p className="text-sm mb-12" style={{ color: "var(--slate)" }}>
          Senast uppdaterad: september 2026
        </p>

        <div className="flex flex-col gap-10 text-sm leading-relaxed" style={{ color: "var(--charcoal)" }}>

          <section className="flex flex-col gap-3">
            <p>
              För att driva Clarix anlitar vi ett litet antal leverantörer som behandlar
              uppgifter för vår räkning. Listan nedan är fullständig. Vi säljer aldrig
              uppgifter och delar dem inte i marknadsföringssyfte.
            </p>
          </section>

          <section className="flex flex-col gap-5">
            {SUBPROCESSORS.map((s) => (
              <div
                key={s.name}
                className="flex flex-col gap-2 rounded-xl p-5"
                style={{ border: "1px solid var(--rule)" }}
              >
                <p className="font-semibold text-base">{s.name}</p>
                <p style={{ color: "var(--slate)" }}>{s.purpose}</p>
                <dl className="flex flex-col gap-1 mt-1">
                  <div className="flex gap-2">
                    <dt className="font-medium shrink-0">Uppgifter:</dt>
                    <dd style={{ color: "var(--slate)" }}>{s.data}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-medium shrink-0">Plats:</dt>
                    <dd style={{ color: "var(--slate)" }}>{s.location}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">Överföring utanför EU/EES</h2>
            <p>
              Din statistik och dina kontouppgifter lagras inom EU. Den enda regelmässiga
              överföringen utanför EU/EES är de sammanställda nyckeltal som skickas till
              OpenAI för att generera sammanfattningar. Överföringen sker med
              standardavtalsklausuler (SCC). Inga tokens, ingen rådata och inga uppgifter
              om enskilda besökare ingår.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">Ändringar</h2>
            <p>
              Byter vi eller lägger vi till ett underbiträde uppdaterar vi den här sidan.
              Vid väsentliga ändringar meddelar vi dig i förväg via e-post eller i appen, så
              att du hinner invända innan ändringen träder i kraft.
            </p>
            <p>
              Frågor eller invändningar:{" "}
              <a href="mailto:hai@khyteteam.com" className="underline underline-offset-2">
                hai@khyteteam.com
              </a>
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <p style={{ color: "var(--slate)" }}>
              Se även{" "}
              <Link href="/privacy-policy" className="underline underline-offset-2">
                integritetspolicyn
              </Link>{" "}
              och{" "}
              <Link href="/cookies" className="underline underline-offset-2">
                cookies
              </Link>
              .
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
