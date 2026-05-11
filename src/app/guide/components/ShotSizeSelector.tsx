'use client'

import { useCallback, useRef } from 'react'
import type { ShotSizeId } from '../types'

// ── Shot size definitions ─────────────────────────────────────────────────────

interface ShotSizeDef {
  id: ShotSizeId
  abbrev: string
  fullName: string
  /** Y position as a fraction of the 480px viewBox height */
  yFraction: number
  description: string
}

const SHOT_SIZES: ShotSizeDef[] = [
  { id: 'ecu', abbrev: 'ECU', fullName: 'Extreme Close-Up',  yFraction: 0.12, description: 'Fills frame with a single facial feature or object detail' },
  { id: 'cu',  abbrev: 'CU',  fullName: 'Close-Up',          yFraction: 0.25, description: 'Head and top of shoulders' },
  { id: 'mcu', abbrev: 'MCU', fullName: 'Medium Close-Up',   yFraction: 0.38, description: 'Chest and above' },
  { id: 'ms',  abbrev: 'MS',  fullName: 'Medium Shot',       yFraction: 0.52, description: 'Waist and above' },
  { id: 'mfs', abbrev: 'MFS', fullName: 'Medium Full Shot',  yFraction: 0.68, description: 'Knees and above' },
  { id: 'fs',  abbrev: 'FS',  fullName: 'Full Shot',         yFraction: 0.82, description: 'Full body with minimal headroom' },
  { id: 'ws',  abbrev: 'WS',  fullName: 'Wide Shot',         yFraction: 0.92, description: 'Full body with environmental context' },
  { id: 'els', abbrev: 'ELS', fullName: 'Extreme Long Shot', yFraction: 1.00, description: 'Subject tiny in a vast environment' },
]

// ── Constants ─────────────────────────────────────────────────────────────────

const VIEW_W = 280
const VIEW_H = 480

// ── Props ─────────────────────────────────────────────────────────────────────

interface ShotSizeSelectorProps {
  value: ShotSizeId | null
  onChange: (id: ShotSizeId | null) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ShotSizeSelector({ value, onChange }: ShotSizeSelectorProps) {
  const containerRef = useRef<SVGSVGElement>(null)

  const selectedIndex = value ? SHOT_SIZES.findIndex(s => s.id === value) : -1
  const selectedDef   = selectedIndex >= 0 ? SHOT_SIZES[selectedIndex] : null

  // ── Keyboard handler ───────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGSVGElement>) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (selectedIndex <= 0) {
          onChange(SHOT_SIZES[0].id)
        } else {
          onChange(SHOT_SIZES[selectedIndex - 1].id)
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (selectedIndex < 0) {
          onChange(SHOT_SIZES[0].id)
        } else if (selectedIndex < SHOT_SIZES.length - 1) {
          onChange(SHOT_SIZES[selectedIndex + 1].id)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onChange(null)
      }
    },
    [selectedIndex, onChange],
  )

  // ── Active zone tint ───────────────────────────────────────────────────────

  const tintY = selectedDef ? selectedDef.yFraction * VIEW_H : 0

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-stretch w-full max-w-sm mx-auto">
      <svg
        ref={containerRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        tabIndex={0}
        role="listbox"
        aria-label="Shot size selector"
        aria-activedescendant={value ? `shot-size-${value}` : undefined}
        onKeyDown={handleKeyDown}
        className="outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-purple)] rounded"
        style={{ cursor: 'default', userSelect: 'none', display: 'block' }}
      >
        {/* ── Silhouette — real photo ── */}
        <image
          href="/pic/guide/fullbody.png"
          x={0}
          y={0}
          width={VIEW_W}
          height={VIEW_H}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          style={{ pointerEvents: 'none' }}
        />

        {/* ── Active zone tint (above selected crop line) ── */}
        {selectedDef && (
          <rect
            x={0}
            y={0}
            width={VIEW_W}
            height={tintY}
            fill="rgba(255, 215, 0, 0.25)"
            aria-hidden="true"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* ── Crop lines and labels ── */}
        {SHOT_SIZES.map((def, index) => {
          const y        = def.yFraction * VIEW_H
          const isActive = def.id === value

          // Hit area spans from midpoint above to midpoint below this line
          const prevY = index === 0 ? 0 : SHOT_SIZES[index - 1].yFraction * VIEW_H
          const nextY = index === SHOT_SIZES.length - 1 ? VIEW_H : SHOT_SIZES[index + 1].yFraction * VIEW_H
          const hitTop    = (y + prevY) / 2
          const hitBottom = (y + nextY) / 2
          const hitHeight = hitBottom - hitTop

          return (
            <g
              key={def.id}
              id={`shot-size-${def.id}`}
              role="option"
              aria-selected={isActive}
              onClick={() => onChange(isActive ? null : def.id)}
              style={{ cursor: 'pointer' }}
            >
              {/* Hit area — full width, spans half-zone above and below the line */}
              <rect
                x={0}
                y={hitTop}
                width={VIEW_W}
                height={hitHeight}
                fill="transparent"
              />

              {/* Hover highlight band (subtle) */}
              <rect
                x={0}
                y={hitTop}
                width={VIEW_W}
                height={hitHeight}
                fill={isActive ? 'rgba(255,215,0,0.04)' : 'transparent'}
                className="transition-all"
                style={{ pointerEvents: 'none' }}
              />

              {/* Crop line — white/purple with opacity so it shows over the photo */}
              <line
                x1={0}
                y1={y}
                x2={VIEW_W}
                y2={y}
                stroke={isActive ? 'rgba(167,139,250,0.95)' : 'rgba(255,255,255,0.35)'}
                strokeWidth={isActive ? 2 : 1}
                strokeDasharray={isActive ? undefined : '4 3'}
              />

              {/* Left abbreviation label — pill background for legibility */}
              <rect
                x={4}
                y={y - 14}
                width={28}
                height={13}
                rx={3}
                fill={isActive ? 'rgba(255,215,0,0.85)' : 'rgba(0,0,0,0.55)'}
                style={{ pointerEvents: 'none' }}
              />
              <text
                x={18}
                y={y - 4}
                fontSize={8}
                fontFamily="inherit"
                fontWeight="600"
                textAnchor="middle"
                fill="white"
              >
                {def.abbrev}
              </text>

              {/* Right full-name label — pill background for legibility */}
              <rect
                x={VIEW_W - 4 - def.fullName.length * 5.2}
                y={y - 14}
                width={def.fullName.length * 5.2 + 6}
                height={13}
                rx={3}
                fill={isActive ? 'rgba(255,215,0,0.85)' : 'rgba(0,0,0,0.55)'}
                style={{ pointerEvents: 'none' }}
              />
              <text
                x={VIEW_W - 7}
                y={y - 4}
                fontSize={8}
                fontFamily="inherit"
                fontWeight={isActive ? '600' : '400'}
                textAnchor="end"
                fill="white"
              >
                {def.fullName}
              </text>
            </g>
          )
        })}
      </svg>

      {/* ── Description ── */}
      <p className="text-[13px] text-[var(--color-muted)] mt-3 min-h-[2.5rem]">
        {selectedDef ? selectedDef.description : ''}
      </p>
    </div>
  )
}
