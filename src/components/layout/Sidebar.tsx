"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLocale, Locale } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { createClient } from "@/utils/supabase/client";
import { useDevScenario } from "@/lib/dev-scenario";

const DEV_SCENARIOS = [
  { id: "scenario-1" as const, label: "SEO" },
  { id: "scenario-2" as const, label: "Full" },
  { id: "scenario-3" as const, label: "Partial" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const { activeId, setActiveId } = useDevScenario();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (!user) return;
      setUserEmail(user.email ?? null);
      setUserName(
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email?.split("@")[0] ??
        null
      );
    });
  }, []);

  const NAV = [
    {
      section: t.nav.sections.overview,
      items: [
        { label: t.nav.items.dashboard, href: "/dashboard", icon: IconDashboard },
        { label: t.nav.items.report, href: "/report", icon: IconReport },
      ],
    },
    {
      section: t.nav.sections.data,
      items: [
        { label: t.nav.items.integrations, href: "/integrations", icon: IconIntegrations },
      ],
    },
    {
      section: "Design v2",
      items: [
        { label: "Dashboard 2", href: "/dashboard2", icon: IconDashboard },
        { label: "Anslutningar", href: "/connections", icon: IconIntegrations },
        { label: "Kunder", href: "/clients", icon: IconReport },
        { label: "Inställningar 2", href: "/settings2", icon: IconReport },
      ],
    },
  ];

  return (
    <aside
      className="w-64 shrink-0 flex flex-col border-r fixed top-0 left-0 h-dvh z-40"
      style={{ borderColor: "var(--rule)", backgroundColor: "var(--bone)" }}
    >
      {/* Logo */}
      <div className="px-6 border-b flex flex-col justify-center" style={{ borderColor: "var(--rule)", height: "88px" }}>
        <p className="eyebrow" style={{ color: "var(--slate)" }}>{t.nav.brand}</p>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.15rem",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--charcoal)",
            marginTop: "3px",
          }}
        >
          {t.nav.tagline}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 flex flex-col gap-6 overflow-y-auto">
        {NAV.map((group) => (
          <div key={group.section}>
            <p
              className="px-3 mb-1.5"
              style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--slate-light)" }}
            >
              {group.section}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map(({ label, href, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                        active
                          ? "font-medium"
                          : "hover:bg-[var(--bone-dark)]"
                      )}
                      style={{
                        backgroundColor: active ? "var(--charcoal)" : undefined,
                        color: active ? "var(--parchment)" : "var(--slate)",
                      }}
                    >
                      <Icon size={15} active={active} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Dev scenario switcher */}
      {process.env.NODE_ENV === "development" && (
        <div className="px-4 py-3 border-t" style={{ borderColor: "var(--rule)" }}>
          <p className="mb-2" style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--slate-light)" }}>
            Dev · Scenario
          </p>
          <div className="flex items-center gap-1">
            {DEV_SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className="flex-1 py-1 rounded-md transition-colors"
                style={{
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.03em",
                  backgroundColor: activeId === s.id ? "var(--charcoal)" : "var(--bone-dark)",
                  color: activeId === s.id ? "var(--parchment)" : "var(--slate)",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Display controls — language + theme */}
      <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: "var(--rule)" }}>
        <div className="flex items-center gap-1">
          {(["sv", "en"] as Locale[]).map((loc) => (
            <button
              key={loc}
              onClick={() => setLocale(loc)}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium uppercase tracking-wider transition-colors"
              style={{
                backgroundColor: locale === loc ? "var(--charcoal)" : "transparent",
                color: locale === loc ? "var(--parchment)" : "var(--slate-light)",
              }}
            >
              {loc}
            </button>
          ))}
        </div>
        <button
          onClick={toggleTheme}
          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--bone-dark)]"
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          style={{ color: "var(--slate-light)" }}
        >
          {theme === "light" ? <IconMoon size={14} /> : <IconSun size={14} />}
        </button>
      </div>

      {/* User */}
      <div className="px-4 py-5 border-t" style={{ borderColor: "var(--rule)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 uppercase"
            style={{ backgroundColor: "var(--charcoal)", color: "var(--parchment)" }}
          >
            {(userName ?? userEmail ?? "U").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--charcoal)" }}>
              {userName ?? t.nav.user.account}
            </p>
            <p className="text-[11px] truncate" style={{ color: "var(--slate-light)" }}>
              {userEmail ?? t.nav.user.plan}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function IconSun({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3" />
      <line x1="8" y1="1" x2="8" y2="3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="8" y1="13" x2="8" y2="15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="1" y1="8" x2="3" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="13" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="3.05" y1="3.05" x2="4.46" y2="4.46" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="11.54" y1="11.54" x2="12.95" y2="12.95" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="12.95" y1="3.05" x2="11.54" y2="4.46" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="4.46" y1="11.54" x2="3.05" y2="12.95" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconMoon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconDashboard({ size = 16, active }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke={active ? "var(--parchment)" : "var(--slate)"} strokeWidth="1.2" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke={active ? "var(--parchment)" : "var(--slate)"} strokeWidth="1.2" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke={active ? "var(--parchment)" : "var(--slate)"} strokeWidth="1.2" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke={active ? "var(--parchment)" : "var(--slate)"} strokeWidth="1.2" />
    </svg>
  );
}

function IconReport({ size = 16, active }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1" width="12" height="14" rx="1.5" stroke={active ? "var(--parchment)" : "var(--slate)"} strokeWidth="1.2" />
      <line x1="5" y1="5" x2="11" y2="5" stroke={active ? "var(--parchment)" : "var(--slate)"} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5" y1="8" x2="11" y2="8" stroke={active ? "var(--parchment)" : "var(--slate)"} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5" y1="11" x2="8" y2="11" stroke={active ? "var(--parchment)" : "var(--slate)"} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconIntegrations({ size = 16, active }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="3.5" cy="8" r="2" stroke={active ? "var(--parchment)" : "var(--slate)"} strokeWidth="1.2" />
      <circle cx="12.5" cy="3.5" r="2" stroke={active ? "var(--parchment)" : "var(--slate)"} strokeWidth="1.2" />
      <circle cx="12.5" cy="12.5" r="2" stroke={active ? "var(--parchment)" : "var(--slate)"} strokeWidth="1.2" />
      <line x1="5.5" y1="7" x2="10.5" y2="4.5" stroke={active ? "var(--parchment)" : "var(--slate)"} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5.5" y1="9" x2="10.5" y2="11.5" stroke={active ? "var(--parchment)" : "var(--slate)"} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
