'use client'

import { useEffect, useRef, useState } from 'react'
import type { GuideState, SectionMeta } from '../types'

const SECTIONS: SectionMeta[] = [
  { id: 'subject',     label: 'Subject',      hasSelection: s => s.subject.trim().length > 0 },
  { id: 'framing',     label: 'Framing',       hasSelection: s => s.shotSize !== null || s.camera.camera !== 'none' },
  { id: 'angle',       label: 'Angle',         hasSelection: s => s.angle !== null },
  { id: 'light',       label: 'Light',         hasSelection: s => s.lighting.length > 0 },
  { id: 'mood',        label: 'Mood',          hasSelection: s => s.mood !== null },
  { id: 'style',       label: 'Style',         hasSelection: s => s.style !== null },
  { id: 'dof',         label: 'DOF',           hasSelection: s => s.dof !== -1 },
  { id: 'use-case',    label: 'Use Case',      hasSelection: s => s.useCase !== null },
  { id: 'constraints', label: 'Constraints',   hasSelection: s => s.constraints.length > 0 },
  { id: 'movement',    label: 'Movement',      hasSelection: s => s.movement !== null, videoOnly: true },
]

interface GuideSidebarProps {
  state: GuideState
  mediaTab: 'image' | 'video'
}

export function GuideSidebar({ state, mediaTab }: GuideSidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState<string>('subject')

  // Keep active pill scrolled into view
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const active = container.querySelector(`[data-section="${activeId}"]`) as HTMLElement | null
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeId])

  // Track which section is in view
  useEffect(() => {
    const visible = SECTIONS.filter(s => !(s.videoOnly && mediaTab === 'image'))
    const observers: IntersectionObserver[] = []
    visible.forEach(section => {
      const el = document.getElementById(section.id)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveId(section.id) },
        { rootMargin: '-20% 0px -65% 0px', threshold: 0 }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [mediaTab])

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setActiveId(id)
  }

  const visible = SECTIONS.filter(s => !(s.videoOnly && mediaTab === 'image'))
  const completedCount = visible.filter(s => s.hasSelection(state)).length
  const progressPct = visible.length > 0 ? (completedCount / visible.length) * 100 : 0

  return (
    <div
      className="flex-shrink-0 bg-[var(--color-surface)] border-b border-[var(--color-border)]"
      style={{ position: 'sticky', top: 0, zIndex: 20 }}
    >
      {/* Pill row */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1 px-3 sm:px-4 py-2 overflow-x-auto scrollbar-none"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        role="navigation"
        aria-label="Guide sections"
      >
        {visible.map(section => {
          const filled = section.hasSelection(state)
          const isActive = activeId === section.id

          return (
            <button
              key={section.id}
              data-section={section.id}
              onClick={() => scrollTo(section.id)}
              aria-current={isActive ? 'step' : undefined}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium',
                'flex-shrink-0 whitespace-nowrap transition-all duration-200',
                'border-none cursor-pointer',
                isActive
                  ? 'bg-[var(--color-purple)] text-white'
                  : filled
                    ? 'bg-[var(--color-raised)] text-[var(--color-text)]'
                    : 'bg-transparent text-[var(--color-muted)] hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]',
              ].join(' ')}
            >
              {/* Completion dot */}
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: filled
                    ? isActive ? 'rgba(255,255,255,0.9)' : 'var(--color-purple)'
                    : isActive ? 'rgba(255,255,255,0.5)' : 'var(--color-faint)',
                }}
                aria-hidden="true"
              />
              {section.label}
              {section.videoOnly && (
                <span className="text-[9px] font-bold uppercase tracking-wide opacity-50 ml-0.5">
                  vid
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Thin progress bar */}
      <div className="h-[2px] w-full bg-[var(--color-border)]" aria-hidden="true">
        <div
          className="h-full bg-[var(--color-purple)] transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  )
}
