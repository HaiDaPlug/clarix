"use client";

import { Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    window.localStorage.setItem("clarix-sidebar-collapsed", String(desktopCollapsed));
  }, [desktopCollapsed]);

  useEffect(() => {
    if (!mobileOpen) return;

    const drawer = document.getElementById("clarix-mobile-navigation");
    const menuButton = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = drawer?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        return;
      }

      if (event.key !== "Tab" || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      menuButton?.focus();
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-dvh" style={{ backgroundColor: "var(--parchment)" }}>
      {/* Mobile hamburger */}
      <button
        ref={menuButtonRef}
        type="button"
        aria-label="Open navigation"
        aria-controls="clarix-mobile-navigation"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(true)}
        className={cn(
          "fixed left-4 top-4 z-[60] inline-flex h-11 w-11 items-center justify-center rounded-xl border shadow-[0_12px_30px_-18px_rgba(20,18,16,0.45)] transition lg:hidden",
          mobileOpen ? "pointer-events-none opacity-0" : "opacity-100"
        )}
        style={{
          top: "max(1rem, env(safe-area-inset-top))",
          borderColor: "var(--rule)",
          backgroundColor: "var(--bone)",
          color: "var(--charcoal)",
        }}
      >
        <Menu className="h-5 w-5" />
      </button>

      <Sidebar
        collapsed={desktopCollapsed}
        mobileOpen={mobileOpen}
        onCollapseToggle={() => setDesktopCollapsed((v) => !v)}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        className={cn(
          "min-w-0 transition-[margin-left] duration-200 ease-out lg:ml-[260px]",
          desktopCollapsed && "lg:ml-[56px]"
        )}
      >
        {children}
      </div>
    </div>
  );
}
