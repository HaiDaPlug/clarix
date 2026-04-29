import { cn } from "@/lib/utils";

interface RuleProps {
  className?: string;
  light?: boolean;
}

export function Rule({ className, light }: RuleProps) {
  return (
    <div
      className={cn(
        "w-full h-px",
        light ? "bg-[var(--rule-light)]" : "bg-[var(--rule)]",
        className
      )}
    />
  );
}
