"use client";

import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem("clarix-sidebar-collapsed", String(desktopCollapsed));
  }, [desktopCollapsed]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <div className="min-h-dvh" style={{ backgroundColor: "var(--parchment)" }}>
      <button
        type="button"
        aria-label="Open navigation"
        onClick={() => setMobileOpen(true)}
        className={cn(
          "fixed left-4 top-4 z-[60] inline-flex h-11 w-11 items-center justify-center rounded-xl border shadow-[0_12px_30px_-18px_rgba(20,18,16,0.45)] transition lg:hidden",
          mobileOpen ? "pointer-events-none opacity-0" : "opacity-100"
        )}
        style={{
          borderColor: "var(--rule)",
          backgroundColor: "var(--bone)",
          color: "var(--charcoal)",
        }}
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        collapsed={desktopCollapsed}
        mobileOpen={mobileOpen}
        onCollapseToggle={() => setDesktopCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        className={cn(
          "min-w-0 transition-[margin] duration-300 ease-out",
          desktopCollapsed ? "lg:ml-20" : "lg:ml-64"
        )}
      >
        {children}
      </div>
    </div>
  );
}
