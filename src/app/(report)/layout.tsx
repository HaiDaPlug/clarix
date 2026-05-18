import { LocaleProvider } from "@/lib/i18n";

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <div className="h-dvh overflow-hidden" style={{ backgroundColor: "var(--parchment)" }}>
        {children}
      </div>
    </LocaleProvider>
  );
}
