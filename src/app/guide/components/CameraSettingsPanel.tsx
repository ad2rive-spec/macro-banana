'use client'

import {
  CAMERA_PRESETS,
  LENS_PRESETS,
  FOCAL_LENGTHS,
  type CameraSettings,
} from '@/lib/cameraPresets'
import { DOFSlider } from './DOFSlider'
import { useT } from '@/lib/LanguageContext'

// ── Camera descriptions ───────────────────────────────────────────────────────

// Camera/lens descriptions are now translated via i18n — see CameraSettingsPanel component

// ── Focal Length Visualizer ───────────────────────────────────────────────────

function fovFromFocalLength(mm: number): number {
  return 2 * Math.atan(18 / mm) * (180 / Math.PI)
}

const FOCAL_COLORS: Record<number, string> = {
  8: '#f87171', 14: '#fb923c', 18: '#fbbf24', 24: '#a3e635', 28: '#34d399',
  35: '#22d3ee', 50: '#60a5fa', 85: '#818cf8', 100: '#a78bfa',
  135: '#c084fc', 200: '#e879f9',
}

const BASE_FL = 8

function FocalLengthVisualizer({ selected }: { selected: number | null }) {
  const t = useT()
  const isUnset = selected === null
  const active = selected ?? BASE_FL

  const scale = fovFromFocalLength(BASE_FL) / fovFromFocalLength(active)
  const focalColor = FOCAL_COLORS[active] ?? '#fff'
  const info = { label: t(`focal.${active}.label`), character: t(`focal.${active}.character`), color: focalColor }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-panel)' }}
    >
      {/* Image viewport */}
      <div className="relative overflow-hidden w-full" style={{ aspectRatio: '4 / 3' }}>
        <img
          src="/pic/guide/Focal-Length.jpg"
          alt="Focal length reference scene"
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${scale.toFixed(3)})`,
            transformOrigin: 'center 30%',
            transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), filter 0.3s ease',
            filter: isUnset ? 'grayscale(1) brightness(0.6)' : 'none',
            userSelect: 'none',
          }}
        />

        {/* Focal length badge */}
        <div
          className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums"
          style={{
            background: 'rgba(0,0,0,0.65)',
            color: isUnset ? '#64748b' : info.color,
            backdropFilter: 'blur(4px)',
            transition: 'color 0.2s ease',
          }}
        >
          {isUnset ? '— mm' : `${active}mm · ${fovFromFocalLength(active).toFixed(0)}° FOV`}
        </div>

        {/* Zoom indicator bar */}
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: isUnset ? 'rgba(100,116,139,0.3)' : `${info.color}60` }}
        >
          <div
            className="h-full"
            style={{
              background: isUnset ? '#475569' : info.color,
              width: isUnset ? '0%' : `${Math.min(100, (1 / scale) * 100)}%`,
              transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease',
            }}
          />
        </div>
      </div>

      {/* Description strip */}
      <div
        className="px-3 py-2.5 border-t"
        style={{ borderColor: 'var(--color-border)', minHeight: '52px' }}
      >
        {isUnset ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--color-faint)' }}>
              {t('camera.focalUnset')}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--color-faint)' }}>
              {t('camera.focalUnsetHint')}
            </span>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-[12px] font-bold tabular-nums" style={{ color: info.color }}>
                {active}mm
              </span>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>
                {info.label}
              </span>
            </div>
            <p className="text-[11px] leading-snug" style={{ color: 'var(--color-muted)' }}>
              {info.character}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CameraSettingsPanelProps {
  value: CameraSettings
  onChange: (settings: CameraSettings) => void
  dof: number
  onDofChange: (dof: number) => void
}

// ── Chip with tooltip ─────────────────────────────────────────────────────────

function ChipWithTooltip({
  label, sub, active, tooltip, onClick,
}: {
  label: string
  sub?: string
  active: boolean
  tooltip?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      className={[
        'flex flex-col items-start px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 border-none cursor-pointer flex-shrink-0',
        active
          ? 'bg-[var(--color-purple)] text-[#1a1a1a]'
          : 'bg-[var(--color-raised)] text-[var(--color-muted)] hover:text-[var(--color-text)]',
      ].join(' ')}
    >
      <span>{label}</span>
      {sub && (
        <span className={`text-[9px] font-bold uppercase tracking-wide mt-0.5 ${active ? 'opacity-70' : 'opacity-50'}`}>
          {sub}
        </span>
      )}
    </button>
  )
}

// ── Plain chip ────────────────────────────────────────────────────────────────

function Chip({ label, active, disabled, onClick }: {
  label: string; active: boolean; disabled?: boolean; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'px-3 py-1 rounded-full text-[12px] font-medium flex-shrink-0 transition-all duration-150 border-none',
        disabled
          ? 'opacity-25 cursor-not-allowed bg-[var(--color-raised)] text-[var(--color-muted)]'
          : active
            ? 'bg-[var(--color-purple)] text-[#1a1a1a] cursor-pointer'
            : 'bg-[var(--color-raised)] text-[var(--color-muted)] hover:text-[var(--color-text)] cursor-pointer',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-faint)]">
        {children}
      </div>
      {hint && (
        <span className="text-[10px] text-[var(--color-faint)] italic normal-case tracking-normal">
          {hint}
        </span>
      )}
    </div>
  )
}

function WrapRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-row flex-wrap gap-1.5">{children}</div>
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-row gap-1.5 overflow-x-auto pb-1 scrollbar-none">{children}</div>
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CameraSettingsPanel({ value, onChange, dof, onDofChange }: CameraSettingsPanelProps) {
  const t = useT()
  const selectedLens = LENS_PRESETS.find(l => l.id === value.lens)
  const focalLengthLocked = selectedLens?.fixedFocalLength === true

  return (
    <div className="flex flex-col gap-5">

      {/* Camera Body */}
      <div>
        <SectionLabel hint={t('camera.hoverForDetails')}>{t('camera.body')}</SectionLabel>
        <WrapRow>
          {CAMERA_PRESETS.filter(c => c.id !== 'none').map(camera => (
            <ChipWithTooltip
              key={camera.id}
              label={camera.label}
              sub={camera.sub}
              active={value.camera === camera.id}
              tooltip={t(`camera.desc.${camera.id}`)}
              onClick={() => onChange({ ...value, camera: value.camera === camera.id ? 'none' : camera.id })}
            />
          ))}
        </WrapRow>
      </div>

      {/* Lens */}
      <div>
        <SectionLabel hint={t('camera.hoverForDetails')}>{t('camera.lensType')}</SectionLabel>
        <WrapRow>
          {LENS_PRESETS.filter(l => l.id !== 'none').map(lens => (
            <ChipWithTooltip
              key={lens.id}
              label={lens.label}
              sub={lens.sub}
              active={value.lens === lens.id}
              tooltip={t(`lens.desc.${lens.id}`)}
              onClick={() => {
                const newLensId = value.lens === lens.id ? 'none' : lens.id
                const newLens = LENS_PRESETS.find(l => l.id === newLensId)
                const focalLength = newLens?.fixedFocalLength ? null : value.focalLength
                onChange({ ...value, lens: newLensId, focalLength })
              }}
            />
          ))}
        </WrapRow>
      </div>

      {/* Focal Length */}
      <div>
        <SectionLabel hint={focalLengthLocked ? t('camera.focalLengthFixed') : t('camera.focalLengthAffects')}>
          {t('camera.focalLength')}
        </SectionLabel>
        {focalLengthLocked && (
          <p className="text-[11px] text-amber-400/80 mb-2 leading-snug">
            {t('camera.focalLengthConflictNote')}
          </p>
        )}
        <ChipRow>
          {FOCAL_LENGTHS.filter((fl): fl is number => fl !== null).map(fl => (
            <Chip
              key={fl}
              label={`${fl}mm`}
              active={!focalLengthLocked && value.focalLength === fl}
              disabled={focalLengthLocked}
              onClick={() => {
                if (focalLengthLocked) return
                onChange({ ...value, focalLength: value.focalLength === fl ? null : fl })
              }}
            />
          ))}
        </ChipRow>

        {!focalLengthLocked && (
          <div className="mt-3">
            <FocalLengthVisualizer selected={value.focalLength} />
          </div>
        )}
      </div>

      {/* Depth of Field */}
      <div>
        <SectionLabel>{t('camera.dof')}</SectionLabel>
        <DOFSlider value={dof} onChange={onDofChange} />
      </div>

    </div>
  )
}
