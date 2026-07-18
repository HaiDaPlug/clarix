import { cn } from "@/lib/utils"

type BlendMode =
  | "overlay"
  | "multiply"
  | "screen"
  | "soft-light"
  | "hard-light"
  | "color-dodge"
  | "normal"

const TILE_SIZE = 160

// Same grain as NoiseTexture's "fine" preset (baseFrequency 0.85, numOctaves 4,
// desaturated), but baked into a fixed-size tile delivered as a background image.
// The browser rasterizes the filter once and caches the bitmap, instead of
// re-running feTurbulence on every repaint like a live DOM SVG filter.
const NOISE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_SIZE}" height="${TILE_SIZE}"><filter id="n" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`

const NOISE_URL = `url("data:image/svg+xml,${encodeURIComponent(NOISE_SVG)}")`

export interface NoiseTileProps {
  /** Overall opacity (0–1). */
  opacity?: number
  /** CSS mix-blend-mode applied to the tile layer. */
  blendMode?: BlendMode
  className?: string
}

export function NoiseTile({
  opacity = 0.5,
  blendMode = "soft-light",
  className,
}: NoiseTileProps) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 z-0 select-none", className)}
      style={{
        backgroundImage: NOISE_URL,
        backgroundRepeat: "repeat",
        backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`,
        opacity,
        mixBlendMode: blendMode,
      }}
    />
  )
}
