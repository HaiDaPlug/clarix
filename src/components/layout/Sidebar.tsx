"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
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

export const SIDEBAR_EXPANDED = 256;
export const SIDEBAR_COLLAPSED = 80;

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapseToggle: () => void;
  onMobileClose: () => void;
};

const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

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
  const { activeId, setActiveId } = useDevScenario();
  const prefersReduced = useReducedMotion();
  const dur = prefersReduced ? 0 : 0.26;

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
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-50 flex-col border-r overflow-hidden"
        style={{
          width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
          borderColor: "var(--rule)",
          backgroundColor: "var(--bone)",
          transition: "width 0.26s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <SidebarInner
          collapsed={collapsed}
          isMobile={false}
          onMobileClose={onMobileClose}
          userName={userName}
          userEmail={userEmail}
          pathname={pathname}
          nav={nav}
          locale={locale}
          setLocale={setLocale}
          activeId={activeId}
          setActiveId={setActiveId}
          t={t}
          dur={dur}
        />
      </aside>

      {/* ── Collapse toggle — floats outside sidebar, always reachable ──── */}
      {/* Slides horizontally with the sidebar edge via CSS transition.      */}
      <button
        type="button"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        onClick={onCollapseToggle}
        className="hidden lg:flex fixed z-[51] top-1/2 -translate-y-1/2 items-center justify-center"
        style={{
          left: (collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED) - 1,
          transition: "left 0.26s cubic-bezier(0.4, 0, 0.2, 1)",
          width: 20,
          height: 48,
          borderRadius: "0 8px 8px 0",
          backgroundColor: "var(--bone)",
          border: "1px solid var(--rule)",
          borderLeft: "none",
          color: "var(--slate)",
          cursor: "pointer",
        }}
      >
        {/* Animated double-bar icon that morphs to a play arrow on collapse */}
        <ToggleIcon collapsed={collapsed} />
      </button>

      {/* ── Mobile sidebar ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 lg:hidden"
              style={{ backgroundColor: "rgba(20,18,16,0.35)", backdropFilter: "blur(2px)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReduced ? 0 : 0.2, ease: EASE }}
              onClick={onMobileClose}
            />
            <motion.aside
              key="mobile-sidebar"
              className="fixed inset-y-0 left-0 z-50 flex flex-col border-r shadow-[18px_0_60px_-36px_rgba(20,18,16,0.45)] lg:hidden"
              style={{
                width: "min(20rem, calc(100vw - 2rem))",
                borderColor: "var(--rule)",
                backgroundColor: "var(--bone)",
              }}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: prefersReduced ? 0 : 0.28, ease: EASE }}
            >
              <SidebarInner
                collapsed={false}
                isMobile={true}
                onMobileClose={onMobileClose}
                userName={userName}
                userEmail={userEmail}
                pathname={pathname}
                nav={nav}
                locale={locale}
                setLocale={setLocale}
                activeId={activeId}
                setActiveId={setActiveId}
                t={t}
                dur={dur}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Toggle icon — two bars (expanded) ↔ single caret (collapsed) ─────────────

function ToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
      {collapsed ? (
        // Single right-pointing caret
        <path
          d="M3 2l4 5-4 5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        // Two vertical bars (panel close)
        <>
          <line x1="3" y1="2" x2="3" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

// ── Inner content ─────────────────────────────────────────────────────────────

type NavGroup = {
  section: string;
  items: {
    label: string;
    href: string;
    icon: React.ComponentType<{ size?: number; active?: boolean }>;
  }[];
};

type InnerProps = {
  collapsed: boolean;
  isMobile: boolean;
  onMobileClose: () => void;
  userName: string | null;
  userEmail: string | null;
  pathname: string;
  nav: NavGroup[];
  locale: Locale;
  setLocale: (l: Locale) => void;
  activeId: string;
  setActiveId: (id: "scenario-1" | "scenario-2" | "scenario-3") => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  dur: number;
};

const LABEL_OUT = { duration: 0.12, ease: [0.4, 0, 1, 1] as const };
const LABEL_IN  = { duration: 0.18, ease: [0, 0, 0.2, 1] as const };

function FadeLabel({
  show,
  children,
  className,
  style,
}: {
  show: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.span
          className={cn("block overflow-hidden whitespace-nowrap", className)}
          style={style}
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "auto" }}
          exit={{ opacity: 0, width: 0 }}
          transition={show ? LABEL_IN : LABEL_OUT}
        >
          {children}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function SidebarInner({
  collapsed,
  isMobile,
  onMobileClose,
  userName,
  userEmail,
  pathname,
  nav,
  locale,
  setLocale,
  activeId,
  setActiveId,
  t,
  dur,
}: InnerProps) {
  const show = !collapsed || isMobile;

  return (
    <div className="flex h-full flex-col">

      {/* ── Header ── */}
      <div className="flex items-center px-4" style={{ minHeight: 88 }}>
        {isMobile ? (
          // Mobile: logo + close button
          <>
            <Link href="/dashboard" onClick={onMobileClose} className="flex flex-1 items-center" aria-label="Clarix">
              <Image src="/clarix-logga-transparent.png" alt="Clarix" width={200} height={66} className="h-14 w-auto dark:invert" priority />
            </Link>
            <button
              type="button"
              aria-label="Close navigation"
              onClick={onMobileClose}
              className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bone-dark)]"
              style={{ color: "var(--slate)" }}
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          // Desktop: logo fades out on collapse, no toggle here (it floats outside)
          <AnimatePresence initial={false} mode="wait">
            {show && (
              <motion.div
                key="logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: dur * 0.7, ease: EASE }}
              >
                <Link href="/dashboard" className="flex items-center" aria-label="Clarix">
                  <Image src="/clarix-logga-transparent.png" alt="Clarix" width={200} height={66} className="h-14 w-auto dark:invert" priority />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <div className="flex flex-col gap-5">
          {nav.map((group) => (
            <div key={group.section}>
              {/* Section label — only when expanded */}
              <AnimatePresence initial={false}>
                {show && (
                  <motion.p
                    key="sec"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={LABEL_IN}
                    className="mb-1.5 px-3"
                    style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--slate-light)" }}
                  >
                    {group.section}
                  </motion.p>
                )}
              </AnimatePresence>

              <ul className="flex flex-col gap-0.5">
                {group.items.map(({ label, href, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={onMobileClose}
                        title={!show ? label : undefined}
                        aria-label={label}
                        className={cn(
                          "flex min-h-11 items-center rounded-lg py-2.5 text-sm transition-colors",
                          // Collapsed: center icon in the full 80px rail
                          !show ? "justify-center px-0" : "gap-3 px-3",
                          active ? "font-medium" : "hover:bg-[var(--bone-dark)]"
                        )}
                        style={{
                          backgroundColor: active ? "var(--charcoal)" : undefined,
                          color: active ? "var(--parchment)" : "var(--charcoal)",
                        }}
                      >
                        <span className="shrink-0 flex items-center justify-center" style={{ width: 16, height: 16 }}>
                          <Icon size={16} active={active} />
                        </span>
                        <FadeLabel show={show} className="min-w-0 truncate text-sm">
                          {label}
                        </FadeLabel>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* ── Dev scenario switcher ── */}
      {process.env.NODE_ENV === "development" && show && (
        <div className="border-t px-4 py-3" style={{ borderColor: "var(--rule)" }}>
          <p className="mb-2" style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--slate-light)" }}>
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
                  fontSize: 10, fontWeight: 500, letterSpacing: "0.03em",
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

      {/* ── Footer: locale + theme ── */}
      <div
        className={cn("flex border-t py-3", show ? "items-center justify-between px-5" : "flex-col items-center gap-3 px-2")}
        style={{ borderColor: "var(--rule)" }}
      >
        {show && (
          <div className="flex items-center gap-1">
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
        )}
        <AnimatedThemeToggler
          variant="circle"
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-[var(--bone-dark)] [&>svg]:h-[14px] [&>svg]:w-[14px]"
          style={{ color: "var(--slate-light)" }}
        />
      </div>

      {/* ── User ── */}
      <div className={cn("border-t py-4", show ? "px-4" : "px-2")} style={{ borderColor: "var(--rule)" }}>
        <div className={cn("flex items-center gap-3", !show && "justify-center")}>
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium uppercase"
            style={{ backgroundColor: "var(--charcoal)", color: "var(--parchment)" }}
          >
            {(userName ?? userEmail ?? "U").charAt(0)}
          </div>
          {show && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" style={{ color: "var(--charcoal)" }}>
                {userName ?? t.nav.user.account}
              </p>
              <p className="truncate text-[11px]" style={{ color: "var(--slate-light)" }}>
                {userEmail ?? t.nav.user.plan}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconDashboard({ size = 16, active }: { size?: number; active?: boolean }) {
  const c = active ? "var(--parchment)" : "var(--charcoal)";
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke={c} strokeWidth="1.2" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke={c} strokeWidth="1.2" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke={c} strokeWidth="1.2" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke={c} strokeWidth="1.2" />
    </svg>
  );
}

function IconReport({ size = 16, active }: { size?: number; active?: boolean }) {
  const c = active ? "var(--parchment)" : "var(--charcoal)";
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1" width="12" height="14" rx="1.5" stroke={c} strokeWidth="1.2" />
      <line x1="5" y1="5" x2="11" y2="5" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5" y1="8" x2="11" y2="8" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5" y1="11" x2="8" y2="11" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconIntegrations({ size = 16, active }: { size?: number; active?: boolean }) {
  const c = active ? "var(--parchment)" : "var(--charcoal)";
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="3.5" cy="8" r="2" stroke={c} strokeWidth="1.2" />
      <circle cx="12.5" cy="3.5" r="2" stroke={c} strokeWidth="1.2" />
      <circle cx="12.5" cy="12.5" r="2" stroke={c} strokeWidth="1.2" />
      <line x1="5.5" y1="7" x2="10.5" y2="4.5" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5.5" y1="9" x2="10.5" y2="11.5" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconClients({ size = 16, active }: { size?: number; active?: boolean }) {
  const c = active ? "var(--parchment)" : "var(--charcoal)";
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
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
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <ellipse cx="8" cy="4" rx="5.5" ry="2" stroke={c} strokeWidth="1.2" />
      <path d="M2.5 4v4c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2V4" stroke={c} strokeWidth="1.2" />
      <path d="M2.5 8v4c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2V8" stroke={c} strokeWidth="1.2" />
    </svg>
  );
}

function IconSettings({ size = 16, active }: { size?: number; active?: boolean }) {
  const c = active ? "var(--parchment)" : "var(--charcoal)";
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2" stroke={c} strokeWidth="1.2" />
      <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.27 1.27M11.33 11.33l1.27 1.27M12.6 3.4l-1.27 1.27M4.67 11.33l-1.27 1.27" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
