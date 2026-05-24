import { AppShell } from "@/components/layout/AppShell";
import { LocaleProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { DevScenarioProvider } from "@/lib/dev-scenario";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const inner = (
    <ThemeProvider>
      <LocaleProvider>
        <AppShell>{children}</AppShell>
      </LocaleProvider>
    </ThemeProvider>
  );

  if (process.env.NODE_ENV === "development") {
    return <DevScenarioProvider>{inner}</DevScenarioProvider>;
  }

  return inner;
}
