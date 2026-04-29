"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface SlideContainerProps {
  children: React.ReactNode;
  className?: string;
  background?: "parchment" | "bone" | "charcoal";
  isActive?: boolean;
  index?: number;
}

const backgrounds = {
  parchment: "bg-[#F8F7F4]",
  bone: "bg-[#F5F3EF]",
  charcoal: "bg-[#1A1916] text-[#F8F7F4]",
};

export function SlideContainer({
  children,
  className,
  background = "parchment",
  isActive = true,
  index = 0,
}: SlideContainerProps) {
  return (
    <motion.section
      className={cn(
        "slide",
        backgrounds[background],
        className
      )}
      initial={{ opacity: 0 }}
      animate={isActive ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.section>
  );
}
