"use client"

import { useId, type ComponentProps } from "react"
import { cn } from "@/lib/utils"

type BlendMode =
  | "overlay"
  | "multiply"
  | "screen"
  | "soft-light"
  | "hard-light"
  | "color-dodge"
  | "normal"

type Preset = "fine" | "medium" | "coarse" | "cinematic"

const PRESETS: Record<Preset, { frequency: number; octaves: number; opacity: number }> = {
  fine:      { frequency: 0.85, octaves: 4, opacity: 0.5 },
  medium:    { frequency: 0.65, octaves: 4, opacity: 0.65 },
  coarse:    { frequency: 0.45, octaves: 3, opacity: 0.75 },
  cinematic: { frequency: 0.72, octaves: 4, opacity: 0.6 },
}

export interface NoiseTextureProps extends Omit<ComponentProps<"svg">, "opacity"> {
  /** Shorthand preset. Overridden by explicit frequency/octaves/opacity. */
  preset?: Preset
  /** feTurbulence baseFrequency. Higher = finer grain. */
  frequency?: number
  /** feTurbulence numOctaves. More = richer texture. */
  octaves?: number
  /** Overall SVG opacity (0–1). */
  opacity?: number
  /** Backward-compatible alias for opacity. */
  noiseOpacity?: number
  /** CSS mix-blend-mode applied to the SVG. */
  blendMode?: BlendMode
  /** Animate the grain (subtle drift). */
  animated?: boolean
}

export function NoiseTexture({
  preset = "cinematic",
  frequency,
  octaves,
  opacity,
  noiseOpacity,
  blendMode = "overlay",
  animated = false,
  className,
  ...props
}: NoiseTextureProps) {
  const id = useId()
  const filterId = `noise-${id.replace(/:/g, "")}`
  const animId = `anim-${id.replace(/:/g, "")}`

  const base = PRESETS[preset]
  const freq = frequency ?? base.frequency
  const oct  = octaves  ?? base.octaves
  const op   = opacity  ?? noiseOpacity ?? base.opacity

  return (
    <svg
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-0 size-full select-none",
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
      style={{ mixBlendMode: blendMode, opacity: op }}
      {...props}
    >
      <filter id={filterId} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence
          type="fractalNoise"
          baseFrequency={freq}
          numOctaves={oct}
          stitchTiles="stitch"
          result="noise"
        >
          {animated && (
            <animate
              id={animId}
              attributeName="seed"
              from="0"
              to="100"
              dur="8s"
              repeatCount="indefinite"
            />
          )}
        </feTurbulence>
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${filterId})`} />
    </svg>
  )
}
