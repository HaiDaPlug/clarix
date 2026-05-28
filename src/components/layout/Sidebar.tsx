"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, PanelLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { useLocale, Locale } from "@/lib/i18n";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { createClient } from "@/utils/supabase/client";
import { useDevScenario } from "@/lib/dev-scenario";

export const SIDEBAR_EXPANDED = 260;
export const SIDEBAR_COLLAPSED = 56;

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

const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];
const DUR = 0.22;

export function Sidebar({ collapsed, mobileOpen, onCollapseToggle, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { t, locale, setLocale } = useLocale();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const { activeId, setActiveId } = useDevScenario();
  const prefersReduced = useReducedMotion();

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
      items: [
        { label: t.nav.items.dashboard, href: "/dashboard", icon: IconDashboard },
        { label: t.nav.items.report, href: "/report", icon: IconReport },
      ],
    },
    {
      items: [
        { label: t.nav.items.integrations, href: "/integrations", icon: IconIntegrations },
        { label: "Data", href: "/data", icon: IconData },
        { label: "Kunder", href: "/clients", icon: IconClients },
        { label: "Inställningar", href: "/settings", icon: IconSettings },
      ],
    },
  ];

  const inner = (
    <SidebarContent
      collapsed={collapsed}
      isMobile={false}
      onCollapseToggle={onCollapseToggle}
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
      prefersReduced={!!prefersReduced}
    />
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-50 flex-col overflow-hidden border-r"
        style={{
          width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
          borderColor: "var(--rule)",
          backgroundColor: "var(--bone)",
          transition: `width ${DUR}s cubic-bezier(0.4,0,0.2,1)`,
        }}
      >
        {inner}
      </aside>

      {/* Mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 lg:hidden"
              style={{ backgroundColor: "rgba(20,18,16,0.4)", backdropFilter: "blur(3px)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReduced ? 0 : 0.18, ease: EASE }}
              onClick={onMobileClose}
            />
            <motion.aside
              key="mobile-sidebar"
              className="fixed inset-y-0 left-0 z-50 flex flex-col border-r lg:hidden"
              style={{
                width: "min(280px, calc(100vw - 48px))",
                borderColor: "var(--rule)",
                backgroundColor: "var(--bone)",
              }}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: prefersReduced ? 0 : 0.24, ease: EASE }}
            >
              <SidebarContent
                collapsed={false}
                isMobile={true}
                onCollapseToggle={onCollapseToggle}
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
                prefersReduced={!!prefersReduced}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Sidebar content ──────────────────────────────────────────────────────────

type NavGroup = {
  items: { label: string; href: string; icon: React.ComponentType<{ active?: boolean }> }[];
};

type ContentProps = {
  collapsed: boolean;
  isMobile: boolean;
  onCollapseToggle: () => void;
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
  prefersReduced: boolean;
};

function SidebarContent({
  collapsed,
  isMobile,
  onCollapseToggle,
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
  prefersReduced,
}: ContentProps) {
  const show = !collapsed || isMobile;

  return (
    <div className="flex h-full flex-col">

      {/* ── Top bar: logo + toggle ── */}
      <div className="flex h-16 shrink-0 items-center justify-between px-3">
        {/* Logo — fades out when collapsed */}
        <AnimatePresence initial={false}>
          {show && (
            <motion.div
              key="logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReduced ? 0 : 0.15, ease: EASE }}
              className="overflow-hidden min-w-0"
            >
              <Link href="/dashboard" onClick={onMobileClose} aria-label="Clarix">
                <Image
                  src="/clarix-logga-transparent.png"
                  alt="Clarix"
                  width={200}
                  height={65}
                  className="h-16 w-auto dark:invert"
                  priority
                />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle / close button */}
        <button
          type="button"
          onClick={isMobile ? onMobileClose : onCollapseToggle}
          aria-label={isMobile ? "Close menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[var(--bone-dark)]"
          style={{ color: "var(--slate)" }}
        >
          {isMobile ? <X className="h-[18px] w-[18px]" /> : <PanelLeft className="h-[18px] w-[18px]" />}
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {nav.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-4 border-t pt-4" : ""} style={{ borderColor: "var(--rule)" }}>
            <ul className="flex flex-col gap-0.5">
              {group.items.map(({ label, href, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onMobileClose}
                      title={!show ? label : undefined}
                      className={cn(
                        "group flex h-9 items-center rounded-md px-2 text-[13.5px] font-medium transition-colors",
                        show ? "gap-2.5" : "justify-center",
                        active
                          ? "bg-[var(--charcoal)] text-[var(--parchment)]"
                          : "text-[var(--charcoal)] hover:bg-[var(--bone-dark)]"
                      )}
                    >
                      <span className="shrink-0 opacity-80 group-hover:opacity-100">
                        <Icon active={active} />
                      </span>
                      <AnimatePresence initial={false}>
                        {show && (
                          <motion.span
                            key="lbl"
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: prefersReduced ? 0 : 0.16, ease: EASE }}
                            className="overflow-hidden whitespace-nowrap"
                          >
                            {label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Dev ── */}
      {process.env.NODE_ENV === "development" && show && (
        <div className="border-t px-3 py-2" style={{ borderColor: "var(--rule)" }}>
          <p className="mb-1.5 text-[9px] uppercase tracking-widest" style={{ color: "var(--slate-light)" }}>
            Dev
          </p>
          <div className="flex gap-1">
            {DEV_SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className="flex-1 rounded py-0.5 text-[10px] font-medium transition-colors"
                style={{
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

      {/* ── Bottom: locale + theme + user ── */}
      <div className="shrink-0 border-t px-2 py-2" style={{ borderColor: "var(--rule)" }}>
        {/* Locale + theme — only when expanded */}
        <AnimatePresence initial={false}>
          {show && (
            <motion.div
              key="footer-tools"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReduced ? 0 : 0.14 }}
              className="mb-1 flex items-center justify-between px-1"
            >
              <div className="flex items-center gap-0.5">
                {(["sv", "en"] as Locale[]).map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setLocale(loc)}
                    className="rounded px-2 py-1 text-[11px] font-medium uppercase tracking-wider transition-colors"
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
                className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[var(--bone-dark)] [&>svg]:h-[13px] [&>svg]:w-[13px]"
                style={{ color: "var(--slate-light)" }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* User row */}
        <div
          className={cn(
            "flex h-10 items-center gap-2.5 rounded-md px-2 transition-colors hover:bg-[var(--bone-dark)] cursor-default",
            !show && "justify-center px-0"
          )}
        >
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold uppercase"
            style={{ backgroundColor: "var(--charcoal)", color: "var(--parchment)" }}
          >
            {(userName ?? userEmail ?? "U").charAt(0)}
          </div>
          <AnimatePresence initial={false}>
            {show && (
              <motion.div
                key="user-info"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: prefersReduced ? 0 : 0.16, ease: EASE }}
                className="overflow-hidden whitespace-nowrap min-w-0"
              >
                <p className="text-[13px] font-medium leading-tight truncate" style={{ color: "var(--charcoal)" }}>
                  {userName ?? t.nav.user.account}
                </p>
                <p className="text-[11px] leading-tight truncate" style={{ color: "var(--slate-light)" }}>
                  {userEmail ?? t.nav.user.plan}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}

// ── Icons (16×16) ─────────────────────────────────────────────────────────────

function IconDashboard({ active }: { active?: boolean }) {
  const c = active ? "var(--parchment)" : "currentColor";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke={c} strokeWidth="1.4" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke={c} strokeWidth="1.4" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke={c} strokeWidth="1.4" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke={c} strokeWidth="1.4" />
    </svg>
  );
}

function IconReport({ active }: { active?: boolean }) {
  const c = active ? "var(--parchment)" : "currentColor";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1" width="12" height="14" rx="1.5" stroke={c} strokeWidth="1.4" />
      <line x1="5" y1="5" x2="11" y2="5" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <line x1="5" y1="8" x2="11" y2="8" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <line x1="5" y1="11" x2="8" y2="11" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconIntegrations({ active }: { active?: boolean }) {
  const c = active ? "var(--parchment)" : "currentColor";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="3.5" cy="8" r="2" stroke={c} strokeWidth="1.4" />
      <circle cx="12.5" cy="3.5" r="2" stroke={c} strokeWidth="1.4" />
      <circle cx="12.5" cy="12.5" r="2" stroke={c} strokeWidth="1.4" />
      <line x1="5.5" y1="7" x2="10.5" y2="4.5" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <line x1="5.5" y1="9" x2="10.5" y2="11.5" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconClients({ active }: { active?: boolean }) {
  const c = active ? "var(--parchment)" : "currentColor";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="2.5" stroke={c} strokeWidth="1.4" />
      <path d="M1.5 13.5c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11 7.5a2 2 0 1 0 0-4" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13.5 13.5c0-1.8-1-3.35-2.5-4.1" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconData({ active }: { active?: boolean }) {
  const c = active ? "var(--parchment)" : "currentColor";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <ellipse cx="8" cy="4" rx="5.5" ry="2" stroke={c} strokeWidth="1.4" />
      <path d="M2.5 4v4c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2V4" stroke={c} strokeWidth="1.4" />
      <path d="M2.5 8v4c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2V8" stroke={c} strokeWidth="1.4" />
    </svg>
  );
}

function IconSettings({ active }: { active?: boolean }) {
  const c = active ? "var(--parchment)" : "currentColor";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2" stroke={c} strokeWidth="1.4" />
      <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.27 1.27M11.33 11.33l1.27 1.27M12.6 3.4l-1.27 1.27M4.67 11.33l-1.27 1.27" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
