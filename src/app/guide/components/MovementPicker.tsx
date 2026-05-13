'use client'

import { useState } from 'react'
import type { MovementId } from '../types'
import { useT } from '@/lib/LanguageContext'

// ── Movement card definitions ─────────────────────────────────────────────────

interface MovementCard {
  id: MovementId
  label: string
  icon: string
  promptTerm: string
  gif: string
}

const MOVEMENT_CARDS: MovementCard[] = [
  { id: 'static',      label: 'Static',         icon: 'lucide:lock',            promptTerm: 'static locked shot',          gif: '/pic/guide/static-locked-shot.gif' },
  { id: 'handheld',    label: 'Handheld',        icon: 'lucide:hand',            promptTerm: 'handheld camera shot',        gif: '/pic/guide/handheld-camera-shot.gif' },
  { id: 'zoom-out',    label: 'Zoom Out',        icon: 'lucide:zoom-out',        promptTerm: 'zoom out',                    gif: '/pic/guide/zoom-out.gif' },
  { id: 'zoom-in',     label: 'Zoom In',         icon: 'lucide:zoom-in',         promptTerm: 'zoom in',                     gif: '/pic/guide/zoom-in.gif' },
  { id: 'cam-follows', label: 'Camera follows',  icon: 'lucide:crosshair',       promptTerm: 'camera follows subject',      gif: '/pic/guide/camera-follows-subject.gif' },
  { id: 'pan-left',    label: 'Pan left',        icon: 'lucide:arrow-left',      promptTerm: 'camera pan left shot',        gif: '/pic/guide/pan-left-shot.gif' },
  { id: 'pan-right',   label: 'Pan right',       icon: 'lucide:arrow-right',     promptTerm: 'camera pan right shot',       gif: '/pic/guide/pan-right-shot.gif' },
  { id: 'tilt-up',     label: 'Tilt up',         icon: 'lucide:arrow-up',        promptTerm: 'camera tilt up shot',         gif: '/pic/guide/camera-tilt-up-shot.gif' },
  { id: 'tilt-down',   label: 'Tilt down',       icon: 'lucide:arrow-down',      promptTerm: 'camera tilt down shot',       gif: '/pic/guide/camera-tilt-down-shot.gif' },
  { id: 'orbit',       label: 'Orbit around',    icon: 'lucide:circle-dot',      promptTerm: 'camera orbit around subject', gif: '/pic/guide/orbit-around.gif' },
  { id: 'dolly-in',    label: 'Dolly in',        icon: 'lucide:move-diagonal',   promptTerm: 'camera dolly in shot',        gif: '/pic/guide/dolly-in.gif' },
  { id: 'dolly-out',   label: 'Dolly out',       icon: 'lucide:move-diagonal-2', promptTerm: 'camera dolly out shot',       gif: '/pic/guide/dolly-out.gif' },
  { id: 'jib-up',      label: 'Jib up',          icon: 'lucide:trending-up',     promptTerm: 'camera jib up shot',          gif: '/pic/guide/jib-up.gif' },
  { id: 'jib-down',    label: 'Jib down',        icon: 'lucide:trending-down',   promptTerm: 'camera jib down shot',        gif: '/pic/guide/jib-down.gif' },
  { id: 'drone',       label: 'Drone shot',      icon: 'lucide:navigation',      promptTerm: 'drone aerial shot',           gif: '/pic/guide/drone-shot.gif' },
  { id: 'dolly-left',  label: 'Dolly left',      icon: 'lucide:chevrons-left',   promptTerm: 'camera dolly left shot',      gif: '/pic/guide/dolly-left.gif' },
  { id: 'dolly-right', label: 'Dolly right',     icon: 'lucide:chevrons-right',  promptTerm: 'camera dolly right shot',     gif: '/pic/guide/dolly-right.gif' },
]

// ── Single card ───────────────────────────────────────────────────────────────

function MovementCardItem({
  movement, isActive, onClick,
}: { movement: MovementCard; isActive: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  const t = useT()

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-col rounded-xl border overflow-hidden transition-all cursor-pointer text-left"
      style={{
        background: isActive ? 'var(--color-purple-subtle)' : 'var(--color-raised)',
        borderColor: isActive ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
      }}
      aria-pressed={isActive}
      aria-label={movement.label}
    >
      {/* Thumbnail: icon at rest, GIF on hover */}
      <div
        className="w-full aspect-square flex items-center justify-center overflow-hidden relative"
        style={{ background: isActive ? 'rgba(255,215,0,0.06)' : 'var(--color-panel)' }}
      >
        {hovered ? (
          <img
            src={movement.gif}
            alt={movement.label}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <iconify-icon
            icon={movement.icon}
            width="18"
            height="18"
            style={{ display: 'block', color: isActive ? 'var(--color-purple)' : 'var(--color-faint)' }}
          />
        )}
      </div>
      {/* Label */}
      <div className="px-1.5 py-1">
        <span
          className="text-[10px] font-medium leading-tight block text-center"
          style={{ color: isActive ? 'var(--color-purple)' : 'var(--color-muted)' }}
        >
          {t(`movement.${movement.id}.label`)}
        </span>
      </div>
    </button>
  )
}

// —— Props ——————————————————————————————————————————————

interface MovementPickerProps {
  value: MovementId | null
  onChange: (id: MovementId | null) => void
  mediaTab: 'image' | 'video'
}

// —— Component —————————————————————————————————————————————

export function MovementPicker({ value, onChange, mediaTab }: MovementPickerProps) {
  if (mediaTab === 'image') return null

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}
      role="group"
      aria-label="Camera movement selector"
    >
      {MOVEMENT_CARDS.map(movement => (
        <MovementCardItem
          key={movement.id}
          movement={movement}
          isActive={value === movement.id}
          onClick={() => onChange(value === movement.id ? null : movement.id)}
        />
      ))}
    </div>
  )
}

// Export movement cards for use in prompt assembly (e.g., logic.ts)
export { MOVEMENT_CARDS }
