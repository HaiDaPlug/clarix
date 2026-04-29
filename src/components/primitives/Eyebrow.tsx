import { cn } from "@/lib/utils";

interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
}

export function Eyebrow({ children, className }: EyebrowProps) {
  return (
    <p className={cn("eyebrow mb-3", className)}>
      {children}
    </p>
  );
}
