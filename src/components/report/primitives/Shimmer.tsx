export function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        borderRadius: 10,
        background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
        ...style,
      }}
    />
  );
}

export function SlideShimmer() {
  return (
    <div className="flex flex-col gap-6 h-full">
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      <Shimmer style={{ height: 52, width: "55%", borderRadius: 12 }} />
      <Shimmer style={{ height: 20, width: "20%", borderRadius: 8 }} />
      <div className="flex gap-4 flex-1">
        <div className="flex-1 flex flex-col gap-3">
          <Shimmer style={{ height: "60%", borderRadius: 16 }} />
          <Shimmer style={{ height: "35%", borderRadius: 16 }} />
        </div>
        <Shimmer style={{ width: 196, borderRadius: 16 }} />
      </div>
    </div>
  );
}
