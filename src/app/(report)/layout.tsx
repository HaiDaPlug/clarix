import { LocaleProvider } from "@/lib/i18n";
import { LightOnly } from "./light-only";

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      {/* Hard load: drop the dark class before first paint (see LightOnly). */}
      <script dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.remove('dark')` }} />
      <LightOnly />
      <div className="h-dvh overflow-hidden" style={{ backgroundColor: "var(--parchment)" }}>
        {children}
      </div>
    </LocaleProvider>
  );
}
