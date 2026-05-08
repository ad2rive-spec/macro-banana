'use client'

import type { MovementId } from '../types'

// ── Movement card definitions ─────────────────────────────────────────────────

interface MovementCard {
  id: MovementId
  label: string
  icon: string
  promptTerm: string
}

const MOVEMENT_CARDS: MovementCard[] = [
  {
    id: 'static',
    label: 'Static / Locked',
    icon: 'lucide:lock',
    promptTerm: 'static locked shot',
  },
  {
    id: 'pan-left',
    label: 'Pan Left',
    icon: 'lucide:arrow-left',
    promptTerm: 'slow pan left',
  },
  {
    id: 'pan-right',
    label: 'Pan Right',
    icon: 'lucide:arrow-right',
    promptTerm: 'slow pan right',
  },
  {
    id: 'tilt-up',
    label: 'Tilt Up',
    icon: 'lucide:arrow-up',
    promptTerm: 'tilt up',
  },
  {
    id: 'tilt-down',
    label: 'Tilt Down',
    icon: 'lucide:arrow-down',
    promptTerm: 'tilt down',
  },
  {
    id: 'dolly-in',
    label: 'Dolly In',
    icon: 'lucide:zoom-in',
    promptTerm: 'dolly in',
  },
  {
    id: 'dolly-out',
    label: 'Dolly Out',
    icon: 'lucide:zoom-out',
    promptTerm: 'dolly out',
  },
  {
    id: 'tracking',
    label: 'Tracking Shot',
    icon: 'lucide:move-horizontal',
    promptTerm: 'tracking shot',
  },
  {
    id: 'handheld',
    label: 'Handheld / Vérité',
    icon: 'lucide:hand',
    promptTerm: 'handheld verité',
  },
  {
    id: 'crane-up',
    label: 'Crane / Jib Up',
    icon: 'lucide:trending-up',
    promptTerm: 'crane jib up',
  },
  {
    id: 'crane-down',
    label: 'Crane / Jib Down',
    icon: 'lucide:trending-down',
    promptTerm: 'crane jib down',
  },
  {
    id: 'drone',
    label: 'Drone Aerial',
    icon: 'lucide:navigation',
    promptTerm: 'drone aerial shot',
  },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface MovementPickerProps {
  value: MovementId | null
  onChange: (id: MovementId | null) => void
  mediaTab: 'image' | 'video'
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MovementPicker({ value, onChange, mediaTab }: MovementPickerProps) {
  // Guard: only render in video mode
  if (mediaTab === 'image') return null

  return (
    <div
      className="grid grid-cols-3 sm:grid-cols-4 gap-2"
      role="group"
      aria-label="Camera movement selector"
    >
      {MOVEMENT_CARDS.map(movement => {
        const isActive = value === movement.id

        return (
          <button
            key={movement.id}
            onClick={() => onChange(isActive ? null : movement.id)}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
              isActive
                ? 'bg-[var(--color-purple-subtle)] border-[rgba(113,50,245,0.4)]'
                : 'bg-[var(--color-raised)] border-[var(--color-border)] hover:border-[var(--color-muted)]'
            }`}
            aria-pressed={isActive}
            aria-label={movement.label}
          >
            {/* Icon */}
            <span
              className={`text-2xl ${
                isActive ? 'text-[var(--color-purple)]' : 'text-[var(--color-muted)]'
              }`}
            >
              <iconify-icon icon={movement.icon} width="24" height="24" />
            </span>
            {/* Label */}
            <span className="text-[11px] font-medium text-center leading-tight">
              {movement.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// Export movement cards for use in prompt assembly (e.g., logic.ts)
export { MOVEMENT_CARDS }
