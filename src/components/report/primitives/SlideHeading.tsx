export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] font-semibold uppercase tracking-[0.26em] text-foreground">
      {children}
    </p>
  );
}

export function SlideHeading({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-[3.1rem] font-bold leading-[1.05] tracking-tight lg:text-[3.8rem]">
        {children}<span style={{ color: "#FF6B55" }}>.</span>
      </h1>
      {sub ? (
        <p className="mt-3 text-[21px] text-foreground">{sub}</p>
      ) : null}
    </div>
  );
}
