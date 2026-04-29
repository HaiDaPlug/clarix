"use client";

import { motion } from "motion/react";
import { ReportData } from "@/types/schema";
import { cn } from "@/lib/utils";

interface Scenario {
  id: string;
  label: string;
  description: string;
  data: ReportData;
}

interface ScenarioSelectorProps {
  scenarios: Scenario[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function ScenarioSelector({ scenarios, activeId, onSelect }: ScenarioSelectorProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-white/80 backdrop-blur-sm border border-[var(--rule)] rounded-full p-1">
      {scenarios.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          title={s.description}
          className={cn(
            "relative px-4 py-1.5 rounded-full text-[11px] font-medium transition-colors",
            activeId === s.id
              ? "text-[var(--parchment)]"
              : "text-[var(--slate)] hover:text-[var(--charcoal)]"
          )}
        >
          {activeId === s.id && (
            <motion.div
              layoutId="active-scenario"
              className="absolute inset-0 bg-[var(--charcoal)] rounded-full"
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
          <span className="relative z-10">{s.label}</span>
        </button>
      ))}
    </div>
  );
}
