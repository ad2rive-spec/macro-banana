'use client'

import { useEffect, useRef, useState } from 'react'
import type { GuideState } from '../types'
import { useT } from '@/lib/LanguageContext'

interface SectionDef {
  id: string
  labelKey: string
  hasSelection: (s: GuideState) => boolean
}

const IMAGE_SECTION_DEFS: SectionDef[] = [
  { id: 'use-case',    labelKey: 'sidebar.useCase',     hasSelection: s => s.useCase !== null },
  { id: 'subject',     labelKey: 'sidebar.subject',     hasSelection: s => s.subject.trim().length > 0 },
  { id: 'framing',     labelKey: 'sidebar.framing',     hasSelection: s => s.shotSize !== null || s.camera.camera !== 'none' || s.dof !== -1 },
  { id: 'angle',       labelKey: 'sidebar.angle',       hasSelection: s => s.angle !== null },
  { id: 'light',       labelKey: 'sidebar.light',       hasSelection: s => s.lighting.length > 0 || s.lightDirection !== null },
  { id: 'style',       labelKey: 'sidebar.style',       hasSelection: s => s.style !== null },
  { id: 'constraints', labelKey: 'sidebar.constraints', hasSelection: s => s.constraints.length > 0 },
]

const VIDEO_SECTION_DEFS: SectionDef[] = [
  { id: 'movement',    labelKey: 'sidebar.movement',    hasSelection: s => s.movement !== null },
  { id: 'subject',     labelKey: 'sidebar.subject',     hasSelection: s => s.subject.trim().length > 0 || s.action.trim().length > 0 },
  { id: 'framing',     labelKey: 'sidebar.shotSize',    hasSelection: s => s.shotSize !== null },
  { id: 'setting',     labelKey: 'sidebar.setting',     hasSelection: s => s.setting.trim().length > 0 },
  { id: 'style',       labelKey: 'sidebar.style',       hasSelection: s => s.videoStyle !== null },
  { id: 'constraints', labelKey: 'sidebar.constraints', hasSelection: s => s.constraints.length > 0 },
]

interface GuideSidebarProps {
  state: GuideState
  mediaTab: 'image' | 'video'
}

export function GuideSidebar({ state, mediaTab }: GuideSidebarProps) {
  const t = useT()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState<string>('subject')
  const SECTION_DEFS = mediaTab === 'video' ? VIDEO_SECTION_DEFS : IMAGE_SECTION_DEFS

  useEffect(() => {
    setActiveId(SECTION_DEFS[0].id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaTab])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const active = container.querySelector(`[data-section="${activeId}"]`) as HTMLElement | null
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeId])

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    SECTION_DEFS.forEach(section => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaTab])

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setActiveId(id)
  }

  const completedCount = SECTION_DEFS.filter(s => s.hasSelection(state)).length
  const progressPct = SECTION_DEFS.length > 0 ? (completedCount / SECTION_DEFS.length) * 100 : 0

  return (
    <div
      className="flex-shrink-0 bg-[var(--color-surface)] border-b border-[var(--color-border)]"
      style={{ position: 'sticky', top: 0, zIndex: 20 }}
    >
      <div
        ref={scrollRef}
        className="flex items-center gap-1 px-3 sm:px-4 py-2 overflow-x-auto scrollbar-none"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        role="navigation"
        aria-label="Guide sections"
      >
        {SECTION_DEFS.map(section => {
          const filled = section.hasSelection(state)
          const isActive = activeId === section.id
          return (
            <button
              key={`${mediaTab}-${section.id}`}
              data-section={section.id}
              onClick={() => scrollTo(section.id)}
              aria-current={isActive ? 'step' : undefined}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium',
                'flex-shrink-0 whitespace-nowrap transition-all duration-200 border-none cursor-pointer',
                isActive
                  ? 'bg-[var(--color-purple)] text-[#1a1a1a]'
                  : filled
                    ? 'bg-[var(--color-raised)] text-[var(--color-text)]'
                    : 'bg-transparent text-[var(--color-muted)] hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]',
              ].join(' ')}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: filled
                    ? isActive ? 'rgba(255,255,255,0.9)' : 'var(--color-purple)'
                    : isActive ? 'rgba(255,255,255,0.5)' : 'var(--color-faint)',
                }}
                aria-hidden="true"
              />
              {t(section.labelKey)}
            </button>
          )
        })}
      </div>
      <div className="h-[2px] w-full bg-[var(--color-border)]" aria-hidden="true">
        <div
          className="h-full bg-[var(--color-purple)] transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  )
}
