"use client";

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <span className="relative inline-flex items-center group" style={{ verticalAlign: "middle" }}>
      <span
        className="transition-all duration-150 group-hover:scale-110"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "14px",
          height: "14px",
          borderRadius: "50%",
          border: "1.5px solid var(--slate-light)",
          color: "var(--slate-light)",
          fontSize: "9px",
          fontFamily: "var(--font-sans)",
          fontWeight: 600,
          lineHeight: 1,
          cursor: "default",
          flexShrink: 0,
          transition: "border-color 0.15s ease, color 0.15s ease, transform 0.15s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--slate)";
          (e.currentTarget as HTMLElement).style.color = "var(--slate)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--slate-light)";
          (e.currentTarget as HTMLElement).style.color = "var(--slate-light)";
        }}
      >
        i
      </span>
      <span
        className="group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0"
        style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: "50%",
          transform: "translateX(-50%) translateY(4px)",
          backgroundColor: "var(--charcoal)",
          color: "#fff",
          fontSize: "11px",
          lineHeight: "1.5",
          padding: "6px 10px",
          borderRadius: "6px",
          width: "220px",
          opacity: 0,
          pointerEvents: "none",
          transition: "opacity 0.15s ease, transform 0.15s ease",
          zIndex: 50,
          whiteSpace: "normal",
        }}
      >
        {text}
        <span
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            borderWidth: "4px",
            borderStyle: "solid",
            borderColor: "var(--charcoal) transparent transparent transparent",
          }}
        />
      </span>
    </span>
  );
}
