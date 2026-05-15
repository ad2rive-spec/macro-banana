'use client'

import type { LightDirectionId } from '../types'
import { useT } from '@/lib/LanguageContext'
import { Tooltip } from '@/components/Tooltip'

// ── Direction card definitions ────────────────────────────────────────────────

interface DirectionCard {
  id: LightDirectionId
  /** SVG diagram showing where the light source is, relative to a subject circle */
  diagram: React.ReactNode
}

// ── SVG Diagram helper ────────────────────────────────────────────────────────

function LightDiagram({
  rays,
  label,
  isActive,
}: {
  rays: Array<{ x1: number; y1: number; x2: number; y2: number }>
  label?: string
  isActive: boolean
}) {
  const col = isActive ? '#FFD700' : '#94a3b8'
  const subjectFill = isActive ? 'rgba(255,215,0,0.15)' : 'rgba(148,163,184,0.12)'

  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true">
      {/* Subject silhouette */}
      <circle cx="24" cy="24" r="10" fill={subjectFill} stroke={col} strokeWidth="1.2" />
      {/* Light rays */}
      {rays.map((r, i) => (
        <line
          key={i}
          x1={r.x1} y1={r.y1}
          x2={r.x2} y2={r.y2}
          stroke={col}
          strokeWidth="1.8"
          strokeLinecap="round"
          markerEnd="url(#arrow)"
        />
      ))}
      {/* Arrowhead marker */}
      <defs>
        <marker id="arrow" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
          <path d="M0,0 L0,4 L4,2 z" fill={col} />
        </marker>
      </defs>
      {label && (
        <text x="24" y="46" textAnchor="middle" fontSize="5" fill={col} fontFamily="sans-serif">
          {label}
        </text>
      )}
    </svg>
  )
}

// ── Presets ──────────────────────────────────────────────────────────────────

const DIRECTION_CARDS: DirectionCard[] = [
  {
    id: 'front',
    diagram: (
      <LightDiagram
        rays={[{ x1: 24, y1: 2, x2: 24, y2: 13 }]}
        isActive={false}
      />
    ),
  },
  {
    id: '45-front-left',
    diagram: (
      <LightDiagram
        rays={[{ x1: 6, y1: 6, x2: 16, y2: 16 }]}
        isActive={false}
      />
    ),
  },
  {
    id: '45-front-right',
    diagram: (
      <LightDiagram
        rays={[{ x1: 42, y1: 6, x2: 32, y2: 16 }]}
        isActive={false}
      />
    ),
  },
  {
    id: 'side-left',
    diagram: (
      <LightDiagram
        rays={[{ x1: 2, y1: 24, x2: 13, y2: 24 }]}
        isActive={false}
      />
    ),
  },
  {
    id: 'side-right',
    diagram: (
      <LightDiagram
        rays={[{ x1: 46, y1: 24, x2: 35, y2: 24 }]}
        isActive={false}
      />
    ),
  },
  {
    id: 'back',
    diagram: (
      <LightDiagram
        rays={[{ x1: 24, y1: 46, x2: 24, y2: 35 }]}
        isActive={false}
      />
    ),
  },
  {
    id: 'rim',
    diagram: (
      <LightDiagram
        rays={[
          { x1: 38, y1: 38, x2: 30, y2: 30 },
          { x1: 10, y1: 38, x2: 18, y2: 30 },
        ]}
        isActive={false}
      />
    ),
  },
  {
    id: 'top',
    diagram: (
      <LightDiagram
        rays={[
          { x1: 16, y1: 2, x2: 20, y2: 13 },
          { x1: 24, y1: 2, x2: 24, y2: 13 },
          { x1: 32, y1: 2, x2: 28, y2: 13 },
        ]}
        isActive={false}
      />
    ),
  },
  {
    id: 'bottom',
    diagram: (
      <LightDiagram
        rays={[{ x1: 24, y1: 44, x2: 24, y2: 35 }]}
        isActive={false}
      />
    ),
  },
]

// ── Active-aware diagram wrapper ──────────────────────────────────────────────

function ActiveDiagram({
  card,
  isActive,
}: {
  card: DirectionCard
  isActive: boolean
}) {
  // Re-render the diagram with the correct isActive colour
  const col = isActive ? '#FFD700' : '#94a3b8'
  const subjectFill = isActive ? 'rgba(255,215,0,0.15)' : 'rgba(148,163,184,0.12)'

  // Pull ray data from the card's diagram — we rebuild SVG directly to pass colour
  const raysMap: Record<LightDirectionId, Array<{ x1: number; y1: number; x2: number; y2: number }>> = {
    'front':          [{ x1: 24, y1: 2, x2: 24, y2: 13 }],
    '45-front-left':  [{ x1: 6,  y1: 6, x2: 16, y2: 16 }],
    '45-front-right': [{ x1: 42, y1: 6, x2: 32, y2: 16 }],
    'side-left':      [{ x1: 2,  y1: 24, x2: 13, y2: 24 }],
    'side-right':     [{ x1: 46, y1: 24, x2: 35, y2: 24 }],
    'back':           [{ x1: 24, y1: 46, x2: 24, y2: 35 }],
    'rim':            [{ x1: 38, y1: 38, x2: 30, y2: 30 }, { x1: 10, y1: 38, x2: 18, y2: 30 }],
    'top':            [{ x1: 16, y1: 2, x2: 20, y2: 13 }, { x1: 24, y1: 2, x2: 24, y2: 13 }, { x1: 32, y1: 2, x2: 28, y2: 13 }],
    'bottom':         [{ x1: 24, y1: 44, x2: 24, y2: 35 }],
  }

  const rays = raysMap[card.id]
  const markerId = `arrow-${card.id}-${isActive ? 'on' : 'off'}`

  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true">
      <circle cx="24" cy="24" r="10" fill={subjectFill} stroke={col} strokeWidth="1.2" />
      {rays.map((r, i) => (
        <line
          key={i}
          x1={r.x1} y1={r.y1}
          x2={r.x2} y2={r.y2}
          stroke={col}
          strokeWidth="1.8"
          strokeLinecap="round"
          markerEnd={`url(#${markerId})`}
        />
      ))}
      <defs>
        <marker id={markerId} markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
          <path d="M0,0 L0,4 L4,2 z" fill={col} />
        </marker>
      </defs>
    </svg>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface LightDirectionPickerProps {
  value: LightDirectionId | null
  onChange: (id: LightDirectionId | null) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LightDirectionPicker({ value, onChange }: LightDirectionPickerProps) {
  const t = useT()

  return (
    <div className="flex flex-col gap-3">
      {/* Grid of preset cards */}
      <div
        className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2"
        role="group"
        aria-label="Light direction selector"
      >
        {DIRECTION_CARDS.map(card => {
          const isActive = value === card.id

          return (
            <Tooltip key={card.id} content={t(`lightDir.${card.id}.description`)}>
              <button
                onClick={() => onChange(isActive ? null : card.id)}
                aria-pressed={isActive}
                aria-label={`${t(`lightDir.${card.id}.label`)}: ${t(`lightDir.${card.id}.description`)}`}
                className={[
                  'flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all duration-150 cursor-pointer w-full',
                  isActive
                    ? 'bg-[var(--color-purple-subtle)] border-[rgba(255,215,0,0.4)]'
                    : 'bg-[var(--color-raised)] border-[var(--color-border)] hover:border-[var(--color-muted)]',
                ].join(' ')}
              >
                {/* Diagram */}
                <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
                  <ActiveDiagram card={card} isActive={isActive} />
                </div>

                {/* Label */}
                <span className="text-[10px] font-medium text-center leading-tight">
                  {t(`lightDir.${card.id}.label`)}
                </span>
              </button>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}
