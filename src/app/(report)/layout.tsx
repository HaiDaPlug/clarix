import { LocaleProvider } from "@/lib/i18n";

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <div className="min-h-dvh" style={{ backgroundColor: "var(--parchment)" }}>
        {children}
      </div>
    </LocaleProvider>
  );
}
