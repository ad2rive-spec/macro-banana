'use client'

import { useState, useEffect } from 'react'
import { GuideSidebar } from './components/GuideSidebar'
import { ShotSizeSelector } from './components/ShotSizeSelector'
import { AngleSelector } from './components/AngleSelector'
import { DOFSlider } from './components/DOFSlider'
import { LightingPicker } from './components/LightingPicker'
import { LightDirectionPicker } from './components/LightDirectionPicker'
import { StylePicker } from './components/StylePicker'
import { MoodPicker } from './components/MoodPicker'
import { UseCasePicker } from './components/UseCasePicker'
import { ConstraintsPicker } from './components/ConstraintsPicker'
import { MovementPicker } from './components/MovementPicker'
import { CameraSettingsPanel } from './components/CameraSettingsPanel'
import { PromptPreview } from './components/PromptPreview'
import { initialGuideState, resetState } from './logic'
import type { GuideState } from './types'

// ── localStorage helpers ──────────────────────────────────────────────────────

function saveGuideState(state: GuideState) {
  try { localStorage.setItem('mb-guide-state', JSON.stringify(state)) } catch { /* silent */ }
}

function loadGuideState(): GuideState | null {
  try {
    const raw = localStorage.getItem('mb-guide-state')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    return parsed as GuideState
  } catch { return null }
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ label, hasSelection }: { label: string; hasSelection: boolean }) {
  return (
    <h2 className="text-[13px] font-semibold uppercase tracking-widest mb-4 flex items-center gap-2"
      style={{ color: 'var(--color-faint)' }}>
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: hasSelection ? 'var(--color-purple)' : 'var(--color-faint)' }}
        aria-hidden="true"
      />
      {label}
    </h2>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GuidePage() {
  const [state, setState] = useState<GuideState>(initialGuideState)

  useEffect(() => {
    const saved = loadGuideState()
    if (saved) setState(saved)
  }, [])

  useEffect(() => {
    saveGuideState(state)
  }, [state])

  function handleMediaTab(tab: 'image' | 'video') {
    setState(prev => ({ ...prev, mediaTab: tab }))
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Top chrome: title + media toggle ── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 sm:px-6 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <span className="text-[13px] font-semibold text-[var(--color-text)]">Prompt Guide</span>
        <div className="w-px h-4 bg-[var(--color-border)]" aria-hidden="true" />
        <div className="flex items-center gap-0.5 bg-[var(--color-raised)] rounded-lg p-0.5">
          {(['image', 'video'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => handleMediaTab(tab)}
              className={[
                'px-3 py-1 rounded-md text-[12px] font-medium transition-all duration-150 border-none cursor-pointer capitalize',
                state.mediaTab === tab
                  ? 'bg-[var(--color-purple)] text-[#1a1a1a]'
                  : 'bg-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]',
              ].join(' ')}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Step nav ── */}
      <GuideSidebar state={state} mediaTab={state.mediaTab} />

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 flex flex-col gap-10 max-w-4xl mx-auto w-full flex-1">

          {/* 1 · Subject */}
          <section id="subject" className="scroll-mt-24">
            <SectionHeading label="Subject" hasSelection={state.subject.trim().length > 0} />
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
              <textarea
                value={state.subject}
                onChange={e => setState(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Describe your subject — e.g. a woman in a red dress"
                rows={2}
                className="w-full resize-none bg-transparent text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-faint)] outline-none leading-relaxed"
              />
            </div>
          </section>

          {/* 2 · Framing */}
          <section id="framing" className="scroll-mt-24">
            <SectionHeading label="Framing" hasSelection={state.shotSize !== null || state.camera.camera !== 'none'} />
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:p-6 flex flex-col gap-8">
              {/* Shot size — centred on wider screens */}
              <div className="flex justify-center">
                <ShotSizeSelector
                  value={state.shotSize}
                  onChange={id => setState(prev => ({ ...prev, shotSize: id }))}
                />
              </div>
              <div className="border-t border-[var(--color-border)] pt-6">
                <CameraSettingsPanel
                  value={state.camera}
                  onChange={camera => setState(prev => ({ ...prev, camera }))}
                />
              </div>
            </div>
          </section>

          {/* 3 · Angle */}
          <section id="angle" className="scroll-mt-24">
            <SectionHeading label="Angle" hasSelection={state.angle !== null} />
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:p-6">
              <AngleSelector
                value={state.angle}
                onChange={id => setState(prev => ({ ...prev, angle: id }))}
              />
            </div>
          </section>

          {/* 4 · Light */}
          <section id="light" className="scroll-mt-24">
            <SectionHeading
              label="Light"
              hasSelection={state.lighting.length > 0 || state.lightDirection !== null}
            />
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:p-6 flex flex-col gap-6">
              {/* 4a · Lighting style */}
              <LightingPicker
                value={state.lighting}
                onChange={lighting => setState(prev => ({ ...prev, lighting }))}
              />

              {/* 4b · Light direction */}
              <div className="border-t border-[var(--color-border)] pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                  style={{ color: 'var(--color-faint)' }}>
                  Light Direction
                </p>
                <LightDirectionPicker
                  value={state.lightDirection}
                  onChange={lightDirection => setState(prev => ({ ...prev, lightDirection }))}
                />
              </div>
            </div>
          </section>

          {/* 5 · Style */}
          <section id="style" className="scroll-mt-24">
            <SectionHeading label="Style" hasSelection={state.style !== null} />
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:p-6">
              <StylePicker
                value={state.style}
                onChange={id => setState(prev => ({ ...prev, style: id }))}
              />
            </div>
          </section>

          {/* 6 · Depth of Field */}
          <section id="dof" className="scroll-mt-24">
            <SectionHeading label="Depth of Field" hasSelection={state.dof !== -1} />
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:p-6">
              <DOFSlider
                value={state.dof}
                onChange={dof => setState(prev => ({ ...prev, dof }))}
                cameraApertureSet={state.camera.aperture !== null}
              />
            </div>
          </section>

          {/* 7 · Mood */}
          <section id="mood" className="scroll-mt-24">
            <SectionHeading label="Mood" hasSelection={state.mood !== null} />
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:p-6">
              <MoodPicker
                value={state.mood}
                onChange={mood => setState(prev => ({ ...prev, mood }))}
              />
            </div>
          </section>

          {/* 8 · Use Case */}
          <section id="use-case" className="scroll-mt-24">
            <SectionHeading label="Use Case" hasSelection={state.useCase !== null} />
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:p-6">
              <UseCasePicker
                value={state.useCase}
                onChange={useCase => setState(prev => ({ ...prev, useCase }))}
              />
            </div>
          </section>

          {/* 9 · Constraints */}
          <section id="constraints" className="scroll-mt-24">
            <SectionHeading label="Constraints" hasSelection={state.constraints.length > 0} />
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:p-6">
              <ConstraintsPicker
                value={state.constraints}
                onChange={constraints => setState(prev => ({ ...prev, constraints }))}
              />
            </div>
          </section>

          {/* 10 · Movement (video only) */}
          {state.mediaTab === 'video' && (
            <section id="movement" className="scroll-mt-24">
              <SectionHeading label="Movement" hasSelection={state.movement !== null} />
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:p-6">
                <MovementPicker
                  value={state.movement}
                  onChange={id => setState(prev => ({ ...prev, movement: id }))}
                  mediaTab={state.mediaTab}
                />
              </div>
            </section>
          )}

          {/* bottom padding so last section clears the sticky bar */}
          <div className="h-4" />
        </div>
      </div>

      {/* ── Prompt preview — fixed to page bottom, outside scroll ── */}
      <PromptPreview
        state={state}
        onSubjectChange={subject => setState(prev => ({ ...prev, subject }))}
        onReset={() => setState(resetState(state))}
      />
    </div>
  )
}
