"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLocale, Locale } from "@/lib/i18n";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { createClient } from "@/utils/supabase/client";
import { useDevScenario } from "@/lib/dev-scenario";

const DEV_SCENARIOS = [
  { id: "scenario-1" as const, label: "SEO" },
  { id: "scenario-2" as const, label: "Full" },
  { id: "scenario-3" as const, label: "Partial" },
];

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapseToggle: () => void;
  onMobileClose: () => void;
};

export function Sidebar({
  collapsed,
  mobileOpen,
  onCollapseToggle,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { t, locale, setLocale } = useLocale();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [propertyName, setPropertyName] = useState<string | null>(null);
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
    supabase
      .from("connected_sources")
      .select("display_name")
      .eq("source", "ga4")
      .neq("property_id", "_pending")
      .limit(1)
      .single()
      .then(({ data }) => {
        setPropertyName(data?.display_name ?? null);
      });
  }, []);

  const nav = [
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
        { label: "Data", href: "/data", icon: IconData },
        { label: "Kunder", href: "/clients", icon: IconClients },
        { label: "Inställningar", href: "/settings", icon: IconSettings },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[min(20rem,calc(100vw-2rem))] shrink-0 flex-col border-r shadow-[18px_0_60px_-36px_rgba(20,18,16,0.45)] transition-all duration-300 ease-out lg:shadow-none",
        collapsed ? "lg:w-20" : "lg:w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
      style={{ borderColor: "var(--rule)", backgroundColor: "var(--bone)" }}
    >
      <div
        className={cn("border-b px-4 transition-all lg:px-5", collapsed ? "lg:px-3" : "lg:px-6")}
        style={{ borderColor: "var(--rule)", minHeight: "88px" }}
      >
        <div className="flex min-h-[88px] items-center gap-3">
          <Link
            href="/dashboard"
            onClick={onMobileClose}
            className={cn("flex min-w-0 flex-1 items-center gap-3", collapsed && "lg:justify-center")}
            aria-label="Clarix dashboard"
          >
            <Image
              src="/clarix-logga-transparent.png"
              alt="Clarix"
              width={160}
              height={52}
              className={cn("h-10 w-auto dark:invert", collapsed ? "lg:h-8" : "lg:h-11")}
              priority
            />
          </Link>

          <button
            type="button"
            aria-label="Close navigation"
            onClick={onMobileClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bone-dark)] lg:hidden"
            style={{ color: "var(--slate)" }}
          >
            <X className="h-4 w-4" />
          </button>

          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={onCollapseToggle}
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bone-dark)] lg:inline-flex"
            style={{ color: "var(--slate)" }}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {propertyName && (
          <div
            className={cn("mb-4", collapsed && "lg:hidden")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "2px 8px 2px 6px",
              borderRadius: 6,
              backgroundColor: "var(--parchment)",
              border: "1px solid var(--rule)",
              alignSelf: "flex-start",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                flexShrink: 0,
                backgroundColor: "#E8826A",
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: "var(--slate)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 180,
              }}
            >
              {propertyName}
            </span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="flex flex-col gap-6">
          {nav.map((group) => (
            <div key={group.section}>
              <p
                className={cn("mb-1.5 px-3", collapsed && "lg:sr-only")}
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--slate-light)",
                }}
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
                        onClick={onMobileClose}
                        title={collapsed ? label : undefined}
                        aria-label={label}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                          collapsed && "lg:justify-center lg:px-0",
                          active ? "font-medium" : "hover:bg-[var(--bone-dark)]"
                        )}
                        style={{
                          backgroundColor: active ? "var(--charcoal)" : undefined,
                          color: active ? "var(--parchment)" : "var(--charcoal)",
                        }}
                      >
                        <Icon size={15} active={active} />
                        <span className={cn("min-w-0 truncate", collapsed && "lg:hidden")}>{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {process.env.NODE_ENV === "development" && (
        <div className={cn("border-t px-4 py-3", collapsed && "lg:hidden")} style={{ borderColor: "var(--rule)" }}>
          <p
            className="mb-2"
            style={{
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--slate-light)",
            }}
          >
            Dev · Scenario
          </p>
          <div className="flex items-center gap-1">
            {DEV_SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => setActiveId(scenario.id)}
                className="flex-1 rounded-md py-1 transition-colors"
                style={{
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.03em",
                  backgroundColor: activeId === scenario.id ? "var(--charcoal)" : "var(--bone-dark)",
                  color: activeId === scenario.id ? "var(--parchment)" : "var(--slate)",
                }}
              >
                {scenario.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className={cn(
          "flex items-center justify-between border-t px-5 py-3",
          collapsed && "lg:flex-col lg:gap-3 lg:px-3"
        )}
        style={{ borderColor: "var(--rule)" }}
      >
        <div className={cn("flex items-center gap-1", collapsed && "lg:hidden")}>
          {(["sv", "en"] as Locale[]).map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setLocale(loc)}
              className="rounded-md px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider transition-colors"
              style={{
                backgroundColor: locale === loc ? "var(--charcoal)" : "transparent",
                color: locale === loc ? "var(--parchment)" : "var(--slate-light)",
              }}
            >
              {loc}
            </button>
          ))}
        </div>
        <AnimatedThemeToggler
          variant="circle"
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-[var(--bone-dark)] [&>svg]:h-[14px] [&>svg]:w-[14px]"
          style={{ color: "var(--slate-light)" }}
        />
      </div>

      <div className={cn("border-t px-4 py-5", collapsed && "lg:px-3")} style={{ borderColor: "var(--rule)" }}>
        <div className={cn("flex items-center gap-3", collapsed && "lg:justify-center")}>
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium uppercase"
            style={{ backgroundColor: "var(--charcoal)", color: "var(--parchment)" }}
          >
            {(userName ?? userEmail ?? "U").charAt(0)}
          </div>
          <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
            <p className="truncate text-sm font-medium" style={{ color: "var(--charcoal)" }}>
              {userName ?? t.nav.user.account}
            </p>
            <p className="truncate text-[11px]" style={{ color: "var(--slate-light)" }}>
              {userEmail ?? t.nav.user.plan}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function IconDashboard({ size = 16, active }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="shrink-0">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke={active ? "var(--parchment)" : "var(--charcoal)"} strokeWidth="1.2" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke={active ? "var(--parchment)" : "var(--charcoal)"} strokeWidth="1.2" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke={active ? "var(--parchment)" : "var(--charcoal)"} strokeWidth="1.2" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke={active ? "var(--parchment)" : "var(--charcoal)"} strokeWidth="1.2" />
    </svg>
  );
}

function IconReport({ size = 16, active }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="shrink-0">
      <rect x="2" y="1" width="12" height="14" rx="1.5" stroke={active ? "var(--parchment)" : "var(--charcoal)"} strokeWidth="1.2" />
      <line x1="5" y1="5" x2="11" y2="5" stroke={active ? "var(--parchment)" : "var(--charcoal)"} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5" y1="8" x2="11" y2="8" stroke={active ? "var(--parchment)" : "var(--charcoal)"} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5" y1="11" x2="8" y2="11" stroke={active ? "var(--parchment)" : "var(--charcoal)"} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconIntegrations({ size = 16, active }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="shrink-0">
      <circle cx="3.5" cy="8" r="2" stroke={active ? "var(--parchment)" : "var(--charcoal)"} strokeWidth="1.2" />
      <circle cx="12.5" cy="3.5" r="2" stroke={active ? "var(--parchment)" : "var(--charcoal)"} strokeWidth="1.2" />
      <circle cx="12.5" cy="12.5" r="2" stroke={active ? "var(--parchment)" : "var(--charcoal)"} strokeWidth="1.2" />
      <line x1="5.5" y1="7" x2="10.5" y2="4.5" stroke={active ? "var(--parchment)" : "var(--charcoal)"} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5.5" y1="9" x2="10.5" y2="11.5" stroke={active ? "var(--parchment)" : "var(--charcoal)"} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconClients({ size = 16, active }: { size?: number; active?: boolean }) {
  const c = active ? "var(--parchment)" : "var(--charcoal)";
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="shrink-0">
      <circle cx="6" cy="5" r="2.5" stroke={c} strokeWidth="1.2" />
      <path d="M1.5 13.5c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11 7.5a2 2 0 1 0 0-4" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M13.5 13.5c0-1.8-1-3.35-2.5-4.1" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconData({ size = 16, active }: { size?: number; active?: boolean }) {
  const c = active ? "var(--parchment)" : "var(--charcoal)";
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="shrink-0">
      <ellipse cx="8" cy="4" rx="5.5" ry="2" stroke={c} strokeWidth="1.2" />
      <path d="M2.5 4v4c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2V4" stroke={c} strokeWidth="1.2" />
      <path d="M2.5 8v4c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2V8" stroke={c} strokeWidth="1.2" />
    </svg>
  );
}

function IconSettings({ size = 16, active }: { size?: number; active?: boolean }) {
  const c = active ? "var(--parchment)" : "var(--charcoal)";
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="shrink-0">
      <circle cx="8" cy="8" r="2" stroke={c} strokeWidth="1.2" />
      <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.27 1.27M11.33 11.33l1.27 1.27M12.6 3.4l-1.27 1.27M4.67 11.33l-1.27 1.27" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
