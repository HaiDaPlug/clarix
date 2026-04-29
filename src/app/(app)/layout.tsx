import { Sidebar } from "@/components/layout/Sidebar";
import { LocaleProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { DevScenarioProvider } from "@/lib/dev-scenario";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const inner = (
    <ThemeProvider>
      <LocaleProvider>
        <div className="flex min-h-dvh" style={{ backgroundColor: "var(--parchment)" }}>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 ml-64">
            {children}
          </div>
        </div>
      </LocaleProvider>
    </ThemeProvider>
  );

  if (process.env.NODE_ENV === "development") {
    return <DevScenarioProvider>{inner}</DevScenarioProvider>;
  }

  return inner;
}
