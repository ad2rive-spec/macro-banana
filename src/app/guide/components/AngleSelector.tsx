'use client'

import { useState } from 'react'
import type { AngleId } from '../types'

// ── Angle definitions ─────────────────────────────────────────────────────────

interface AngleDef {
  id: AngleId
  label: string
  description: string
  icon: React.ReactNode
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

/** Camera body rectangle helper — centred at (cx, cy) with given width/height */
function CameraRect({
  cx,
  cy,
  w = 22,
  h = 14,
  rx = 2,
  transform,
}: {
  cx: number
  cy: number
  w?: number
  h?: number
  rx?: number
  transform?: string
}) {
  return (
    <g transform={transform}>
      {/* Camera body */}
      <rect
        x={cx - w / 2}
        y={cy - h / 2}
        width={w}
        height={h}
        rx={rx}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      />
      {/* Lens circle */}
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
      />
    </g>
  )
}

const EyeLevelIcon = (
  <svg viewBox="0 0 40 40" width={40} height={40} aria-hidden="true">
    {/* Horizontal guide line */}
    <line
      x1={4}
      y1={20}
      x2={36}
      y2={20}
      stroke="currentColor"
      strokeWidth={0.8}
      strokeDasharray="2 2"
      opacity={0.4}
    />
    {/* Camera centred on the horizon line */}
    <CameraRect cx={20} cy={20} />
  </svg>
)

const LowAngleIcon = (
  <svg viewBox="0 0 40 40" width={40} height={40} aria-hidden="true">
    {/* Subject dot above */}
    <circle cx={20} cy={7} r={3} fill="currentColor" opacity={0.6} />
    {/* Camera at bottom, tilted upward */}
    <g transform="rotate(-20, 20, 30)">
      <CameraRect cx={20} cy={30} />
    </g>
    {/* Arrow indicating upward direction */}
    <line
      x1={20}
      y1={24}
      x2={20}
      y2={13}
      stroke="currentColor"
      strokeWidth={0.8}
      opacity={0.35}
      strokeDasharray="2 2"
    />
  </svg>
)

const HighAngleIcon = (
  <svg viewBox="0 0 40 40" width={40} height={40} aria-hidden="true">
    {/* Camera at top, tilted downward */}
    <g transform="rotate(20, 20, 10)">
      <CameraRect cx={20} cy={10} />
    </g>
    {/* Arrow indicating downward direction */}
    <line
      x1={20}
      y1={16}
      x2={20}
      y2={27}
      stroke="currentColor"
      strokeWidth={0.8}
      opacity={0.35}
      strokeDasharray="2 2"
    />
    {/* Subject dot below */}
    <circle cx={20} cy={33} r={3} fill="currentColor" opacity={0.6} />
  </svg>
)

const BirdsEyeIcon = (
  <svg viewBox="0 0 40 40" width={40} height={40} aria-hidden="true">
    {/* Outer circle representing the ground plane viewed from above */}
    <circle
      cx={20}
      cy={20}
      r={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      opacity={0.4}
    />
    {/* Camera rectangle inside, viewed top-down (flat) */}
    <CameraRect cx={20} cy={20} w={18} h={12} />
    {/* Small dot at centre representing subject */}
    <circle cx={20} cy={20} r={1.5} fill="currentColor" opacity={0.5} />
  </svg>
)

const WormsEyeIcon = (
  <svg viewBox="0 0 40 40" width={40} height={40} aria-hidden="true">
    {/* Outer circle representing the sky plane viewed from below */}
    <circle
      cx={20}
      cy={20}
      r={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      opacity={0.4}
    />
    {/* Camera rectangle inside, viewed bottom-up — lens at bottom */}
    <CameraRect cx={20} cy={20} w={18} h={12} />
    {/* Upward-pointing indicator lines */}
    <line
      x1={14}
      y1={26}
      x2={14}
      y2={30}
      stroke="currentColor"
      strokeWidth={0.8}
      opacity={0.4}
    />
    <line
      x1={20}
      y1={26}
      x2={20}
      y2={32}
      stroke="currentColor"
      strokeWidth={0.8}
      opacity={0.4}
    />
    <line
      x1={26}
      y1={26}
      x2={26}
      y2={30}
      stroke="currentColor"
      strokeWidth={0.8}
      opacity={0.4}
    />
  </svg>
)

const DutchTiltIcon = (
  <svg viewBox="0 0 40 40" width={40} height={40} aria-hidden="true">
    {/* Camera rectangle rotated ~15 degrees */}
    <g transform="rotate(15, 20, 20)">
      <CameraRect cx={20} cy={20} />
    </g>
    {/* Subtle horizon reference line (straight) */}
    <line
      x1={4}
      y1={20}
      x2={36}
      y2={20}
      stroke="currentColor"
      strokeWidth={0.6}
      strokeDasharray="2 3"
      opacity={0.25}
    />
  </svg>
)

const OTSIcon = (
  <svg viewBox="0 0 40 40" width={40} height={40} aria-hidden="true">
    {/* Foreground silhouette (shoulder/head, camera is behind this person) */}
    <circle cx={13} cy={14} r={5} fill="currentColor" opacity={0.5} />
    <path
      d="M 6 28 Q 13 22 20 28"
      fill="currentColor"
      opacity={0.5}
    />
    {/* Subject in the distance */}
    <circle cx={27} cy={17} r={3.5} fill="none" stroke="currentColor" strokeWidth={1.2} opacity={0.7} />
    <path
      d="M 22 28 Q 27 23 32 28"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      opacity={0.7}
    />
    {/* Small camera shape behind the foreground person */}
    <rect
      x={8}
      y={30}
      width={10}
      height={6}
      rx={1}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      opacity={0.8}
    />
    <circle cx={13} cy={33} r={1.5} fill="none" stroke="currentColor" strokeWidth={1} opacity={0.8} />
  </svg>
)

// ── Angle data ────────────────────────────────────────────────────────────────

const ANGLES: AngleDef[] = [
  {
    id: 'eye-level',
    label: 'Eye Level',
    description: 'Natural, neutral perspective',
    icon: EyeLevelIcon,
  },
  {
    id: 'low-angle',
    label: 'Low Angle',
    description: 'Empowers subject, creates drama',
    icon: LowAngleIcon,
  },
  {
    id: 'high-angle',
    label: 'High Angle',
    description: 'Diminishes subject, shows vulnerability',
    icon: HighAngleIcon,
  },
  {
    id: 'birds-eye',
    label: "Bird's Eye",
    description: 'Overhead map-like perspective',
    icon: BirdsEyeIcon,
  },
  {
    id: 'worms-eye',
    label: "Worm's Eye",
    description: 'Extreme upward perspective',
    icon: WormsEyeIcon,
  },
  {
    id: 'dutch-tilt',
    label: 'Dutch Tilt',
    description: 'Unease, tension, disorientation',
    icon: DutchTiltIcon,
  },
  {
    id: 'ots',
    label: 'Over-Shoulder',
    description: 'Conversational, relational framing',
    icon: OTSIcon,
  },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface AngleSelectorProps {
  value: AngleId | null
  onChange: (id: AngleId | null) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AngleSelector({ value, onChange }: AngleSelectorProps) {
  const [hoveredId, setHoveredId] = useState<AngleId | null>(null)

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3"
      role="group"
      aria-label="Camera angle selector"
    >
      {ANGLES.map(angle => {
        const isActive = value === angle.id
        const isHovered = hoveredId === angle.id

        return (
          <div key={angle.id} className="relative">
            <button
              onClick={() => onChange(isActive ? null : angle.id)}
              onMouseEnter={() => setHoveredId(angle.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(angle.id)}
              onBlur={() => setHoveredId(null)}
              className={`
                relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-150 cursor-pointer w-full
                ${
                  isActive
                    ? 'bg-[var(--color-purple-subtle)] border-[rgba(113,50,245,0.4)]'
                    : 'bg-[var(--color-raised)] border-[var(--color-border)] hover:border-[var(--color-muted)]'
                }
              `}
              title={angle.description}
              aria-pressed={isActive}
              aria-label={`${angle.label}: ${angle.description}`}
            >
              {/* SVG icon */}
              <span
                className={`transition-colors duration-150 ${
                  isActive ? 'text-[var(--color-purple)]' : 'text-[var(--color-muted)]'
                }`}
              >
                {angle.icon}
              </span>

              {/* Label */}
              <span className="text-[11px] font-medium text-center leading-tight">
                {angle.label}
              </span>
            </button>

            {/* Tooltip */}
            {isHovered && (
              <div
                className="
                  absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10
                  px-2 py-1 rounded-md text-[11px] leading-snug text-center
                  bg-[var(--color-hover)] border border-[var(--color-border)]
                  text-[var(--color-text)] whitespace-nowrap pointer-events-none
                  shadow-lg
                "
                role="tooltip"
              >
                {angle.description}
                {/* Arrow */}
                <span
                  className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--color-hover)]"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
