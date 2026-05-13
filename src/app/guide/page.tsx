'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { GuideSidebar } from './components/GuideSidebar'
import { ShotSizeSelector } from './components/ShotSizeSelector'
import { AngleSelector } from './components/AngleSelector'
import { LightingPicker } from './components/LightingPicker'
import { LightDirectionPicker } from './components/LightDirectionPicker'
import { StylePicker } from './components/StylePicker'
import { UseCasePicker } from './components/UseCasePicker'
import { ConstraintsPicker } from './components/ConstraintsPicker'
import { CameraSettingsPanel } from './components/CameraSettingsPanel'
import { PromptPreview } from './components/PromptPreview'
import { VideoPlanner, makeEmptyPlan } from './components/VideoPlanner'
import { initialGuideState, resetState, assemblePrompt } from './logic'
import { storeImagePlan } from './planTransfer'
import { storeAssetFile } from './assetDB'
import type { GuideState, VideoPlanState, ImageRef, ImageOutputSettings } from './types'
import { useT } from '@/lib/LanguageContext'

// ── Image model/ratio/resolution options ──────────────────────────────────────

const IMAGE_MODELS = [
  { value: 'gpt-image-2',     label: 'GPT Image 2' },
  { value: 'nano-banana-2',   label: 'Nano Banana 2' },
  { value: 'nano-banana-pro', label: 'Nano Banana Pro' },
]

const IMAGE_RATIOS: Record<string, string[]> = {
  'gpt-image-2':     ['1:1', '3:4', '9:16', '4:3', '16:9'],
  'nano-banana-2':   ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
  'nano-banana-pro': ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
}
const DEFAULT_IMAGE_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9']

const IMAGE_RESOLUTIONS: Record<string, string[]> = {
  'gpt-image-2':     ['1K', '2K', '4K'],
  'nano-banana-2':   ['512', '1K', '2K', '4K'],
  'nano-banana-pro': ['1K', '2K', '4K'],
}
const DEFAULT_IMAGE_RESOLUTIONS = ['1K', '2K', '4K']

const IMAGE_QUALITIES: Record<string, string[]> = {
  'gpt-image-2':     ['low', 'medium', 'high', 'auto'],
  'nano-banana-2':   [],
  'nano-banana-pro': [],
}

const DEFAULT_IMAGE_OUTPUT: ImageOutputSettings = {
  model: 'gpt-image-2',
  ratio: '1:1',
  resolution: '1K',
  quality: 'medium',
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function saveGuideState(state: GuideState) {
  try { localStorage.setItem('mb-guide-state', JSON.stringify(state)) } catch { /* silent */ }
}

function saveMediaTab(tab: 'image' | 'video') {
  try { localStorage.setItem('mb-guide-tab', tab) } catch { /* silent */ }
}

function loadMediaTab(): 'image' | 'video' | null {
  try {
    const v = localStorage.getItem('mb-guide-tab')
    return v === 'image' || v === 'video' ? v : null
  } catch { return null }
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

function saveVideoPlan(plan: VideoPlanState) {
  try {
    const slim = {
      ...plan,
      assets: plan.assets.map(a => ({ tag: a.tag, kind: a.kind, name: a.name, previewUrl: a.previewUrl })),
    }
    const json = JSON.stringify(slim)
    localStorage.setItem('mb-video-plan', json)
  } catch {
    try {
      const slim = {
        ...plan,
        assets: plan.assets.map(a => ({ tag: a.tag, kind: a.kind, name: a.name, previewUrl: '' })),
      }
      localStorage.setItem('mb-video-plan', JSON.stringify(slim))
    } catch { /* silent */ }
  }
}

function loadVideoPlan(): VideoPlanState | null {
  try {
    const raw = localStorage.getItem('mb-video-plan')
    if (!raw) return null
    const parsed = JSON.parse(raw) as VideoPlanState
    if (!parsed.shots) return null
    return parsed
  } catch { return null }
}

function saveImageRefs(refs: ImageRef[]) {
  try {
    const slim = refs.map(r => ({ tag: r.tag, kind: r.kind, name: r.name, previewUrl: r.previewUrl }))
    localStorage.setItem('mb-image-refs', JSON.stringify(slim))
  } catch {
    try {
      const slim = refs.map(r => ({ tag: r.tag, kind: r.kind, name: r.name, previewUrl: '' }))
      localStorage.setItem('mb-image-refs', JSON.stringify(slim))
    } catch { /* silent */ }
  }
}

function loadImageRefs(): ImageRef[] {
  try {
    const raw = localStorage.getItem('mb-image-refs')
    if (!raw) return []
    return JSON.parse(raw) as ImageRef[]
  } catch { return [] }
}

function saveImageOutputSettings(s: ImageOutputSettings) {
  try { localStorage.setItem('mb-image-output-v2', JSON.stringify(s)) } catch { /* silent */ }
}

function loadImageOutputSettings(): ImageOutputSettings | null {
  try {
    const raw = localStorage.getItem('mb-image-output-v2')
    if (!raw) return null
    const s = JSON.parse(raw) as ImageOutputSettings
    // Clamp resolution to valid options for the saved model (handles stale values)
    const validRes = IMAGE_RESOLUTIONS[s.model] ?? DEFAULT_IMAGE_RESOLUTIONS
    if (!validRes.includes(s.resolution)) s.resolution = validRes[0]
    return s
  } catch { return null }
}

// ── Section heading (image mode only) ─────────────────────────────────────────

function SectionHeading({ label, hasSelection, tag }: { label: string; hasSelection: boolean; tag?: string }) {
  return (
    <h2 className="text-[13px] font-semibold uppercase tracking-widest mb-4 flex items-center gap-2"
      style={{ color: 'var(--color-faint)' }}>
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: hasSelection ? 'var(--color-purple)' : 'var(--color-faint)' }}
        aria-hidden="true"
      />
      {label}
      {tag && (
        <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ml-1"
          style={{ background: 'var(--color-raised)', color: 'var(--color-muted)' }}>
          {tag}
        </span>
      )}
    </h2>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GuidePage() {
  const router = useRouter()
  const t = useT()
  const imageRefInputRef = useRef<HTMLInputElement>(null)

  const [mediaTab, setMediaTab] = useState<'image' | 'video'>('image')
  const [imageState, setImageState] = useState<GuideState>(initialGuideState)
  const [videoPlan, setVideoPlan] = useState<VideoPlanState>(makeEmptyPlan)
  const [imageRefs, setImageRefs] = useState<ImageRef[]>([])
  const [imageOutputSettings, setImageOutputSettings] = useState<ImageOutputSettings>({ ...DEFAULT_IMAGE_OUTPUT })

  // Hydrate from localStorage after mount — avoids SSR/client hydration mismatch
  useEffect(() => {
    const s = loadGuideState()
    if (s) setImageState(prev => ({ ...prev, ...s }))
    const p = loadVideoPlan()
    if (p) setVideoPlan(prev => ({ ...prev, ...p }))
    const refs = loadImageRefs()
    if (refs.length > 0) setImageRefs(refs)
    const out = loadImageOutputSettings()
    if (out) setImageOutputSettings(out)

    // Apply Studio nav context LAST so it wins over saved plan state
    try {
      const raw = localStorage.getItem('studio_nav_context')
      if (raw) {
        const ctx = JSON.parse(raw) as { tab: 'image' | 'video'; mode: string }
        if (ctx.tab === 'image' || ctx.tab === 'video') setMediaTab(ctx.tab)
        if (ctx.tab === 'video' && ctx.mode) {
          const validMode = ['text_to_video', 'first_last_frames', 'omni_reference'].includes(ctx.mode)
            ? (ctx.mode as import('./types').ShotMode)
            : 'text_to_video' as import('./types').ShotMode
          setVideoPlan(prev => ({ ...prev, planMode: validMode }))
        }
      }
    } catch { /* silent */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { saveMediaTab(mediaTab) }, [mediaTab])
  useEffect(() => { saveGuideState(imageState) }, [imageState])
  useEffect(() => { saveVideoPlan(videoPlan) }, [videoPlan])
  useEffect(() => { saveImageRefs(imageRefs) }, [imageRefs])
  useEffect(() => { saveImageOutputSettings(imageOutputSettings) }, [imageOutputSettings])

  // ── Image ref handlers ──────────────────────────────────────────────────────

  function resizeImage(file: File, maxW = 400, maxH = 400, quality = 0.75): Promise<string> {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        const scale = Math.min(1, maxW / img.width, maxH / img.height)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve('') }
      img.src = url
    })
  }

  const handleImageRefFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const fileArray = Array.from(files)
    Promise.all(
      fileArray.map(file =>
        resizeImage(file).then(dataUrl => {
          const count = imageRefs.filter(r => r.kind === 'image').length + fileArray.indexOf(file)
          const tag = '@ref' + (count + 1)
          return { tag, kind: 'image' as const, file, previewUrl: dataUrl, name: file.name }
        })
      )
    ).then(newRefs => {
      newRefs.forEach(r => { if (r.file) storeAssetFile(r.tag, r.file).catch(() => {}) })
      setImageRefs(prev => [...prev, ...newRefs])
    })
  }, [imageRefs])

  const removeImageRef = useCallback((tag: string) => {
    setImageRefs(prev => prev.filter(r => r.tag !== tag))
  }, [])

  // ── Image output settings helpers ───────────────────────────────────────────

  function updateImageModel(model: string) {
    const ratios = IMAGE_RATIOS[model] ?? DEFAULT_IMAGE_RATIOS
    const resolutions = IMAGE_RESOLUTIONS[model] ?? DEFAULT_IMAGE_RESOLUTIONS
    const qualities = IMAGE_QUALITIES[model] ?? []
    const ratio = ratios.includes(imageOutputSettings.ratio) ? imageOutputSettings.ratio : ratios[0]
    const resolution = resolutions.includes(imageOutputSettings.resolution) ? imageOutputSettings.resolution : resolutions[resolutions.length - 1]
    const quality = qualities.length > 0
      ? (qualities.includes(imageOutputSettings.quality) ? imageOutputSettings.quality : qualities[qualities.length - 2] ?? qualities[0])
      : ''
    setImageOutputSettings({ model, ratio, resolution, quality })
  }

  // ── Send Image to Studio ────────────────────────────────────────────────────

  function sendImageToStudio() {
    const segments = assemblePrompt(imageState)
    storeImagePlan(segments.full, imageOutputSettings, imageRefs)
    const mode = imageRefs.length > 0 ? '&mode=omni_reference' : ''
    router.push('/studio?tab=image&plan=1' + mode)
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const imageQualities = IMAGE_QUALITIES[imageOutputSettings.model] ?? []

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Top chrome */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 sm:px-6 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <span className="text-[13px] font-semibold text-[var(--color-text)]">{t('guide.title')}</span>
        <div className="w-px h-4 bg-[var(--color-border)]" aria-hidden="true" />
        <div className="flex items-center gap-0.5 bg-[var(--color-raised)] rounded-lg p-0.5">
          {(['image', 'video'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setMediaTab(tab)}
              className={[
                'px-3 py-1 rounded-md text-[12px] font-medium transition-all duration-150 border-none cursor-pointer',
                mediaTab === tab
                  ? 'bg-[var(--color-purple)] text-[#1a1a1a]'
                  : 'bg-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]',
              ].join(' ')}
            >
              {t(`guide.tab.${tab}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Video mode */}
      {mediaTab === 'video' ? (
        <VideoPlanner plan={videoPlan} onChange={setVideoPlan} />
      ) : (
        <>
          <GuideSidebar state={imageState} mediaTab="image" />

          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 flex flex-col gap-10 max-w-4xl mx-auto w-full flex-1">

              {/* 0  Reference Images */}
              <section id="references" className="scroll-mt-24">
                <SectionHeading label={t('guide.section.references')} hasSelection={imageRefs.length > 0} tag={t('guide.optional')} />
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
                  <p className="text-[12px] mb-3" style={{ color: 'var(--color-muted)' }}>
                    {t('guide.refs.description')} <span className="font-mono text-[11px] px-1 rounded" style={{ background: 'var(--color-raised)', color: 'var(--color-purple)' }}>@ref1</span>,&nbsp;
                    <span className="font-mono text-[11px] px-1 rounded" style={{ background: 'var(--color-raised)', color: 'var(--color-purple)' }}>@ref2</span>… {t('guide.refs.in')}
                  </p>
                  <div className="flex items-start gap-3 flex-wrap">
                    {imageRefs.map(ref => (
                      <div key={ref.tag} className="relative group flex-shrink-0">
                        <div className="w-16 h-16 rounded-lg overflow-hidden border"
                          style={{ borderColor: 'var(--color-border)' }}>
                          {ref.previewUrl
                            ? <img src={ref.previewUrl} alt={ref.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"
                                style={{ background: 'var(--color-raised)', color: 'var(--color-muted)' }}>
                                <iconify-icon icon="lucide:image" width="20" height="20" style={{ display: 'block' }} />
                              </div>
                          }
                        </div>
                        <span className="absolute -bottom-1 -right-1 text-[9px] font-bold px-1 rounded"
                          style={{ background: 'var(--color-purple)', color: '#1a1a1a' }}>
                          {ref.tag.replace('@', '')}
                        </span>
                        <button
                          onClick={() => removeImageRef(ref.tag)}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full hidden group-hover:flex items-center justify-center cursor-pointer border-none text-[9px]"
                          style={{ background: '#ef4444', color: '#fff' }}>
                          x
                        </button>
                        <p className="text-[9px] text-center mt-1.5 max-w-[64px] truncate" style={{ color: 'var(--color-faint)' }}>
                          {ref.name}
                        </p>
                      </div>
                    ))}
                    <button
                      onClick={() => imageRefInputRef.current?.click()}
                      className="w-16 h-16 rounded-lg border border-dashed flex items-center justify-center cursor-pointer transition-all flex-shrink-0"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                      onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--color-purple)')}
                      onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
                      <iconify-icon icon="lucide:plus" width="20" height="20" style={{ display: 'block' }} />
                    </button>
                    <input
                      ref={imageRefInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => handleImageRefFiles(e.target.files)}
                    />
                  </div>
                </div>
              </section>

              {/* 1  Use Case */}
              <section id="use-case" className="scroll-mt-24">
                <SectionHeading label={t('guide.section.useCase')} hasSelection={imageState.useCase !== null} />
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:p-6">
                  <UseCasePicker
                    value={imageState.useCase}
                    onChange={id => setImageState(prev => ({ ...prev, useCase: prev.useCase === id ? null : id }))}
                  />
                </div>
              </section>

              {/* 2  Subject */}
              <section id="subject" className="scroll-mt-24">
                <SectionHeading label={t('guide.section.subject')} hasSelection={imageState.subject.trim().length > 0} />
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
                  <textarea
                    value={imageState.subject}
                    onChange={e => setImageState(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder={t('guide.subject.placeholder')}
                    rows={3}
                    className="w-full resize-none bg-transparent text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-faint)] outline-none leading-relaxed"
                  />
                  {/* Ref tag chips */}
                  {imageRefs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                      {imageRefs.map(ref => {
                        const inserted = imageState.subject.includes(ref.tag)
                        return (
                          <button
                            key={ref.tag}
                            onClick={() => {
                              if (!inserted) {
                                setImageState(prev => ({ ...prev, subject: prev.subject ? `${prev.subject} ${ref.tag}` : ref.tag }))
                              }
                            }}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] transition-all cursor-pointer"
                            style={{
                              background: inserted ? 'var(--color-purple-subtle)' : 'var(--color-raised)',
                              borderColor: inserted ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                              opacity: inserted ? 0.6 : 1,
                            }}>
                            {ref.previewUrl && (
                              <img src={ref.previewUrl} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
                            )}
                            <span className="font-bold" style={{ color: 'var(--color-purple)' }}>{ref.tag}</span>
                            {inserted && <iconify-icon icon="lucide:check" width="11" height="11" style={{ display: 'block', color: 'var(--color-purple)' }} />}
                          </button>
                        )
                      })}
                      <span className="text-[10px] self-center" style={{ color: 'var(--color-faint)' }}>{t('guide.refs.clickToInsert')}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* 2  Framing */}
              <section id="framing" className="scroll-mt-24">
                <SectionHeading
                  label={t('guide.section.framing')}
                  hasSelection={imageState.shotSize !== null || imageState.camera.camera !== 'none' || imageState.dof !== -1}
                />
                <div className="flex flex-col gap-5">
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:p-6">
                    <p className="text-[11px] font-semibold uppercase tracking-widest mb-4"
                      style={{ color: 'var(--color-faint)' }}>{t('sidebar.shotSize')}</p>
                    <div className="flex justify-center">
                      <ShotSizeSelector
                        value={imageState.shotSize}
                        onChange={id => setImageState(prev => ({ ...prev, shotSize: id }))}
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:p-6">
                    <CameraSettingsPanel
                      value={imageState.camera}
                      dof={imageState.dof}
                      onChange={camera => setImageState(prev => ({ ...prev, camera }))}
                      onDofChange={dof => setImageState(prev => ({ ...prev, dof }))}
                    />
                  </div>
                </div>
              </section>

              {/* 3  Angle */}
              <section id="angle" className="scroll-mt-24">
                <SectionHeading label={t('guide.section.angle')} hasSelection={imageState.angle !== null} />
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:p-6">
                  <AngleSelector
                    value={imageState.angle}
                    onChange={id => setImageState(prev => ({ ...prev, angle: id }))}
                  />
                </div>
              </section>

              {/* 4  Light */}
              <section id="light" className="scroll-mt-24">
                <SectionHeading
                  label={t('guide.section.light')}
                  hasSelection={imageState.lighting.length > 0 || imageState.lightDirection !== null}
                />
                <div className="flex flex-col gap-5">
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:p-6">
                    <LightingPicker
                      value={imageState.lighting}
                      onChange={newLighting => setImageState(prev => ({ ...prev, lighting: newLighting }))}
                    />
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:p-6">
                    <LightDirectionPicker
                      value={imageState.lightDirection}
                      onChange={id => setImageState(prev => ({ ...prev, lightDirection: prev.lightDirection === id ? null : id }))}
                    />
                  </div>
                </div>
              </section>

              {/* 5  Style */}
              <section id="style" className="scroll-mt-24">
                <SectionHeading label={t('guide.section.style')} hasSelection={imageState.style !== null} />
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:p-6">
                  <StylePicker
                    value={imageState.style}
                    onChange={id => setImageState(prev => ({ ...prev, style: prev.style === id ? null : id }))}
                  />
                </div>
              </section>

              {/* 7  Constraints */}
              <section id="constraints" className="scroll-mt-24">
                <SectionHeading label={t('guide.section.constraints')} hasSelection={imageState.constraints.length > 0} />
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:p-6">
                  <ConstraintsPicker
                    value={imageState.constraints}
                    onChange={constraints => setImageState(prev => ({ ...prev, constraints }))}
                  />
                </div>
              </section>

              {/* 8  Output Settings */}
              <section id="output-settings" className="scroll-mt-24">
                <SectionHeading label={t('guide.section.outputSettings')} hasSelection={true} />
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 flex flex-col gap-4">

                  {/* Model */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-faint)' }}>{t('guide.output.model')}</p>
                    <div className="flex flex-wrap gap-2">
                      {IMAGE_MODELS.map(m => {
                        const active = imageOutputSettings.model === m.value
                        return (
                          <button key={m.value}
                            onClick={() => updateImageModel(m.value)}
                            className="px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-all cursor-pointer"
                            style={{
                              background: active ? 'var(--color-purple-subtle)' : 'var(--color-raised)',
                              borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                              color: active ? 'var(--color-purple)' : 'var(--color-muted)',
                            }}>
                            {m.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Ratio + Resolution + Quality */}
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-faint)' }}>{t('guide.output.ratio')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(IMAGE_RATIOS[imageOutputSettings.model] ?? DEFAULT_IMAGE_RATIOS).map(r => {
                          const active = imageOutputSettings.ratio === r
                          return (
                            <button key={r}
                              onClick={() => setImageOutputSettings(prev => ({ ...prev, ratio: r }))}
                              className="px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer"
                              style={{
                                background: active ? 'var(--color-purple-subtle)' : 'var(--color-raised)',
                                borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                                color: active ? 'var(--color-purple)' : 'var(--color-muted)',
                              }}>
                              {r}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-faint)' }}>{t('guide.output.resolution')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(IMAGE_RESOLUTIONS[imageOutputSettings.model] ?? DEFAULT_IMAGE_RESOLUTIONS).map(r => {
                          const active = imageOutputSettings.resolution === r
                          return (
                            <button key={r}
                              onClick={() => setImageOutputSettings(prev => ({ ...prev, resolution: r }))}
                              className="px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer"
                              style={{
                                background: active ? 'var(--color-purple-subtle)' : 'var(--color-raised)',
                                borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                                color: active ? 'var(--color-purple)' : 'var(--color-muted)',
                              }}>
                              {r}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    {imageQualities.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-faint)' }}>{t('guide.output.quality')}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {imageQualities.map(q => {
                            const active = imageOutputSettings.quality === q
                            return (
                              <button key={q}
                                onClick={() => setImageOutputSettings(prev => ({ ...prev, quality: q }))}
                                className="px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer capitalize"
                                style={{
                                  background: active ? 'var(--color-purple-subtle)' : 'var(--color-raised)',
                                  borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                                  color: active ? 'var(--color-purple)' : 'var(--color-muted)',
                                }}>
                                {q}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <div className="h-4" />
            </div>
          </div>
          {/* Image prompt preview */}
          <PromptPreview
            state={imageState}
            onSubjectChange={subject => setImageState(s => ({ ...s, subject }))}
            onReset={() => setImageState(s => resetState(s))}
            onSend={sendImageToStudio}
          />
                </>
      )}
    </div>
  )
}
