'use client'
import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getAllAssetFiles } from '../guide/assetDB'
import { submitTask, saveTask, loadTasks, loadSettings, getTaskStatus, type Task } from '@/services/api'
import { usePolling } from '@/hooks/usePolling'
import { useToast } from '@/components/Toast'
import { useT } from '@/lib/LanguageContext'
import { MaskEditor, type EditParams } from '@/components/MaskEditor'

// ── Icons via Iconify (lucide set) ──
// Usage: <iconify-icon icon="lucide:xxx" width="N" height="N" />

const IconImage    = () => <iconify-icon icon="lucide:image"       width="18" height="18" />
const IconVideo    = () => <iconify-icon icon="lucide:video"        width="18" height="18" />
const IconPlus     = () => <iconify-icon icon="lucide:plus"         width="15" height="15" />
const IconModel    = () => <iconify-icon icon="lucide:cpu"          width="13" height="13" />
const IconRatio    = () => <iconify-icon icon="lucide:layout"       width="13" height="13" />
const IconQuality  = () => <iconify-icon icon="lucide:sparkles"     width="13" height="13" />
const IconDuration = () => <iconify-icon icon="lucide:timer"        width="13" height="13" />
const IconAudio    = () => <iconify-icon icon="lucide:volume-2"     width="13" height="13" />
const IconAudioOff = () => <iconify-icon icon="lucide:volume-x"     width="13" height="13" />
const IconBackground = () => <iconify-icon icon="lucide:layers"     width="13" height="13" />
const IconGrounding  = () => <iconify-icon icon="lucide:search"      width="13" height="13" />
const IconMode     = () => <iconify-icon icon="lucide:workflow"     width="13" height="13" />
const IconSend     = () => <iconify-icon icon="lucide:send" width="18" height="18" style={{display:'block'}} />

type MediaTab = 'image' | 'video'

const IMAGE_MODELS = [
  { value: 'gpt-image-2',       label: 'GPT Image 2' },
  { value: 'nano-banana-2',     label: 'Nano Banana 2' },
  { value: 'nano-banana-pro',   label: 'Nano Banana Pro' },
]
const VIDEO_MODELS = [
  { value: 'doubao-seedance-2-0-260128',      label: 'Seedance 2.0' },
  { value: 'doubao-seedance-2-0-fast-260128', label: 'Seedance 2.0 Fast' },
]

// Per-model option constraints
type ModelOptions = {
  ratios: string[]
  resolutions: string[]
  durations?: number[]
  qualities?: string[]
  thinking?: string[]
  background?: string[]
  seedanceModes?: string[]
  grounding?: string[]  // 'off' | 'web' | 'web+image' (web+image: NB2 only)
}

const MODEL_OPTIONS: Record<string, ModelOptions> = {
  // GPT Image 2: flexible resolution up to 4K (655,360–8,294,400px, max edge 3840, multiples of 16)
  // quality: low/medium/high/auto | no thinking param | background maintained as-is
  'gpt-image-2': {
    ratios:      ['auto', '1:1', '3:4', '9:16', '4:3', '16:9'],
    resolutions: ['1K', '2K', '4K'],
    qualities:   ['low', 'medium', 'high', 'auto'],
    background:  ['auto', 'transparent', 'opaque'],
  },
  // Nano Banana 2 (gemini-3.1-flash-image-preview)
  // thinking: minimal/high (always on, cannot disable) — controlled via thinkingLevel
  // auto ratio: only valid for i2i (model auto-detects from input image)
  'nano-banana-2': {
    ratios:      ['auto', '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9', '1:4', '4:1', '1:8', '8:1'],
    resolutions: ['512', '1K', '2K', '4K'],
    thinking:    ['minimal', 'high'],
    grounding:   ['off', 'web', 'web+image'],
  },
  // Nano Banana Pro (gemini-3-pro-image-preview)
  // thinking always on, no quality param, no 512 resolution
  // auto ratio: only valid for i2i
  'nano-banana-pro': {
    ratios:      ['auto', '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
    resolutions: ['1K', '2K', '4K'],
    grounding:   ['off', 'web'],
  },
  // Seedance 2.0 Pro: 480p/720p/1080p, all ratios, 4-15s, audio
  // auto ratio: only valid for first_last_frames mode (i2i)
  'doubao-seedance-2-0-260128': {
    ratios:      ['16:9', '9:16', '4:3', '3:4', '1:1', '21:9'],
    resolutions: ['480p', '720p', '1080p'],
    durations:   [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    seedanceModes: ['text_to_video', 'first_last_frames', 'omni_reference'],
  },
  // Seedance 2.0 Fast: 480p/720p only
  // auto ratio: only valid for first_last_frames mode (i2i)
  'doubao-seedance-2-0-fast-260128': {
    ratios:      ['16:9', '9:16', '4:3', '3:4', '1:1', '21:9'],
    resolutions: ['480p', '720p'],
    durations:   [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    seedanceModes: ['text_to_video', 'first_last_frames', 'omni_reference'],
  },
}

const DEFAULT_IMG_OPTIONS: ModelOptions = {
  ratios:      ['1:1', '4:3', '3:4', '16:9', '9:16'],
  resolutions: ['512', '1K', '2K'],
  qualities:   ['standard', 'high'],
}
const DEFAULT_VID_OPTIONS: ModelOptions = {
  ratios:      ['16:9', '9:16', '4:3', '3:4', '1:1', '21:9'],
  resolutions: ['480p', '720p', '1080p'],
  durations:   [4, 5, 6, 8, 10, 12, 15],
}

function getModelOptions(model: string, tab: MediaTab): ModelOptions {
  return MODEL_OPTIONS[model] ?? (tab === 'image' ? DEFAULT_IMG_OPTIONS : DEFAULT_VID_OPTIONS)
}

const QUALITY     = ['standard', 'high']
const BACKGROUND  = ['auto', 'transparent', 'opaque']
const SEEDANCE_MODES = ['text_to_video', 'first_last_frames', 'omni_reference']
const SEEDANCE_MODE_LABELS: Record<string, string> = {
  text_to_video:    'Text → Video',
  first_last_frames:'First/Last Frame',
  omni_reference:   'Omni Reference',
}

// Reference image limits & descriptions per model
const REF_LIMITS: Record<string, { max: number; desc: string }> = {
  'gpt-image-2':                    { max: 16, desc: 'Up to 16 reference images' },
  'nano-banana-2':                  { max: 14, desc: 'Up to 14 refs (10 objects + 4 characters)' },
  'nano-banana-pro':                { max: 14, desc: 'Up to 14 refs (6 objects + 5 characters)' },
  'doubao-seedance-2-0-260128':     { max: 12, desc: 'Up to 12 refs (images + videos + audio)' },
  'doubao-seedance-2-0-fast-260128':{ max: 12, desc: 'Up to 12 refs (images + videos + audio)' },
}

const STATUS_COLOR: Record<string, string> = {
  queued: '#55556a', running: '#FFD700', succeeded: '#4ade80', failed: '#f87171', expired: '#55556a',
}

// ── Slot Wheel — single column picker ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SlotWheel({ items, selected, onSelect, renderItem, itemHeight = 52 }: {
  items: any[]
  selected: any
  onSelect: (v: any) => void
  renderItem: (v: any, active: boolean) => React.ReactNode
  itemHeight?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const idx = items.findIndex(i => i === selected)
  const visibleCount = 3
  const containerH = itemHeight * visibleCount

  function scroll(dir: 1 | -1) {
    const next = Math.max(0, Math.min(items.length - 1, idx + dir))
    onSelect(items[next])
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    scroll(e.deltaY > 0 ? 1 : -1)
  }

  return (
    <div className="relative flex flex-col items-stretch select-none" style={{ height: containerH }}>
      {/* top/bottom fade */}
      <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#17171e] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#17171e] to-transparent z-10 pointer-events-none" />
      {/* selection highlight */}
      <div className="absolute inset-x-0 z-0 border-t border-b border-[#FFD700]/30 bg-[#FFD700]/[0.07]"
        style={{ top: itemHeight, height: itemHeight }} />

      <div ref={ref} className="overflow-hidden flex-1" onWheel={onWheel}>
        <div className="flex flex-col transition-transform duration-200 ease-out"
          style={{ transform: `translateY(${-idx * itemHeight + itemHeight}px)` }}>
          {items.map((item, i) => (
            <button key={i} onClick={e => { e.stopPropagation(); onSelect(item) }}
              style={{ height: itemHeight, minHeight: itemHeight }}
              className={`flex items-center justify-center border-none cursor-pointer bg-transparent transition-all px-2
                ${i === idx ? 'text-white' : 'text-[#444] hover:text-[#777]'}`}>
              {renderItem(item, i === idx)}
            </button>
          ))}
        </div>
      </div>

      {/* up/down arrows */}
      <button onClick={e => { e.stopPropagation(); scroll(-1) }} disabled={idx === 0}
        className="absolute top-0 inset-x-0 h-10 flex items-center justify-center z-20 border-none bg-transparent cursor-pointer text-[#444] hover:text-[#888] disabled:opacity-0 transition-all">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
      </button>
      <button onClick={e => { e.stopPropagation(); scroll(1) }} disabled={idx === items.length - 1}
        className="absolute bottom-0 inset-x-0 h-10 flex items-center justify-center z-20 border-none bg-transparent cursor-pointer text-[#444] hover:text-[#888] disabled:opacity-0 transition-all">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>
  )
}

// ── Popover — #6: clamp to viewport ──
function Popover({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  // Clamp to viewport — prevents clipping on mobile edges and behind Navbar
  useEffect(() => {
    if (!open || !menuRef.current || !ref.current) return
    const el = menuRef.current
    // Reset to default centred position first so measurement is accurate
    el.style.bottom = ''
    el.style.transform = ''

    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect()
      const MARGIN = 8
      const NAVBAR = 52

      // Vertical: push down if clipped above navbar
      if (rect.top < NAVBAR) {
        el.style.bottom = `calc(100% + 6px - ${rect.top - NAVBAR}px)`
      }

      // Horizontal: shift so menu stays within viewport
      let shiftX = 0
      if (rect.left < MARGIN) {
        shiftX = MARGIN - rect.left
      } else if (rect.right > window.innerWidth - MARGIN) {
        shiftX = (window.innerWidth - MARGIN) - rect.right
      }
      el.style.transform = `translateX(calc(-50% + ${shiftX}px))`
    })
  }, [open])

  return (
    <div ref={ref} className="relative" style={{ zIndex: open ? 9999 : 'auto' }}>
      <div onClick={() => setOpen(o => !o)} className="cursor-pointer">{trigger}</div>
      {open && (
        <div ref={menuRef}
          className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 bg-[#1c1c26] border border-white/10 rounded-2xl p-2 shadow-[0_8px_32px_rgba(0,0,0,0.7)] min-w-[130px]"
          onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── Param pill ──
function Pill({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/10 transition-colors text-[13px] text-[#bbb] font-medium select-none">
      {icon && <span className="text-[#666] flex items-center">{icon}</span>}
      {label}
    </div>
  )
}

// ── Popover option ──
function Opt({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full px-3 py-1.5 rounded-xl text-[13px] text-left border-none cursor-pointer font-[inherit] transition-all
        ${active ? 'bg-white/10 text-white' : 'bg-transparent text-[#888] hover:bg-white/5 hover:text-white'}`}>
      {label}
    </button>
  )
}

// ── Reference thumbnail ──
function RefThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url] = useState(() => URL.createObjectURL(file))
  return (
    <div className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 group border border-white/10">
      {file.type.startsWith('image/') ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-white/5 flex items-center justify-center text-[10px] text-[#666]">🎬</div>
      )}
      <button onClick={onRemove}
        className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border-none cursor-pointer text-white text-[11px]">
        ✕
      </button>
    </div>
  )
}

// ── Video first-frame thumbnail ──
function VideoFrameThumb({ file, className }: { file: File; className?: string }) {
  const [thumb, setThumb] = useState<string | null>(null)
  const [url] = useState(() => URL.createObjectURL(file))

  useEffect(() => {
    const video = document.createElement('video')
    video.src = url
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.currentTime = 0.1

    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas')
      canvas.width  = video.videoWidth  || 160
      canvas.height = video.videoHeight || 90
      canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height)
      setThumb(canvas.toDataURL('image/jpeg', 0.8))
    }, { once: true })

    video.addEventListener('loadedmetadata', () => { video.currentTime = 0.1 }, { once: true })
    video.load()

    return () => { video.src = '' }
  }, [url])

  if (thumb) return <img src={thumb} alt="" className={className ?? 'w-full h-full object-cover'} />
  // fallback while loading
  return (
    <div className="w-full h-full bg-[#1a1a24] flex items-center justify-center">
      <div className="w-3 h-3 border border-[#FFD700]/40 border-t-[#FFD700] rounded-full animate-spin" />
    </div>
  )
}

// ── Detail modal ──
const MODEL_LABELS: Record<string, string> = {
  'gpt-image-2': 'GPT Image 2',
  'nano-banana-2': 'Nano Banana 2',
  'nano-banana-pro': 'Nano Banana Pro',
  'doubao-seedance-2-0-260128': 'Seedance 2.0',
  'doubao-seedance-2-0-fast-260128': 'Seedance 2.0 Fast',
}

function DetailModal({ task, onClose, onUseAsRef, onReusePrompt, onAddToGroup, onMaskConfirm, isPersonal }: {
  task: Task
  onClose: () => void
  onUseAsRef: (url: string) => void
  onReusePrompt: (prompt: string) => void
  onAddToGroup?: (task: Task) => void
  onMaskConfirm?: (maskDataUrl: string, prompt: string, params: EditParams, refs: File[]) => void
  isPersonal?: boolean
}) {
  const t = useT()
  const [editMode, setEditMode] = useState(false)
  const isVideo = task.video_url?.endsWith('.mp4') || task.video_url?.endsWith('.webm') || task.video_url?.endsWith('.mov')

  // Escape: exit edit mode first, then close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (editMode) setEditMode(false)
        else onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, editMode])

  const meta: { label: string; value: string }[] = [
    { label: t('studio.param.model'),      value: MODEL_LABELS[task.model || ''] || task.model || '—' },
    { label: t('studio.param.resolution'), value: task.resolution || '—' },
    { label: t('studio.param.ratio'),      value: task.ratio || '—' },
    ...(!isVideo ? [] : [{ label: t('studio.param.duration'), value: task.duration ? `${task.duration}s` : '—' }]),
    { label: t('studio.param.status'),     value: task.status },
    { label: t('studio.param.created'),    value: task.created_at ? new Date(task.created_at).toLocaleString() : '—' },
    { label: t('studio.param.taskId'),     value: task.task_id },
  ]

  // ── Edit mode — full-screen expanded layout ────────────────────────────────
  if (editMode && task.video_url && !isVideo && onMaskConfirm) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4">
        <div
          className="border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.9)] flex overflow-hidden"
          style={{ width: 'min(98vw, 1500px)', height: 'min(95vh, 900px)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Left: inline MaskEditor */}
          <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
            <MaskEditor
              imageUrl={task.video_url}
              initialParams={{
                model:      task.model || 'gpt-image-2',
                ratio:      task.ratio  || 'auto',
                resolution: task.resolution || '1K',
                quality:    'medium',
                background: 'auto',
              }}
              onConfirm={(maskDataUrl, prompt, params, refs) => {
                onMaskConfirm(maskDataUrl, prompt, params, refs)
                setEditMode(false)
                onClose()
              }}
              onCancel={() => setEditMode(false)}
            />
          </div>

          {/* Right: compact details panel — desktop only */}
          <div className="w-[260px] flex-shrink-0 border-l border-white/[0.07] flex-col bg-[#17171e] hidden md:flex">
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.07] flex-shrink-0">
              <span className="text-[12px] font-semibold text-[#aaa]">Details</span>
              <button
                onClick={onClose}
                className="w-6 h-6 rounded-full bg-white/[0.07] hover:bg-white/15 border-none cursor-pointer text-[#666] hover:text-white flex items-center justify-center transition-all text-[13px]"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
              {task.prompt && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#444] mb-1.5">
                    {t('studio.detail.promptLabel')}
                  </div>
                  <p className="text-[11px] text-[#888] leading-relaxed break-words">{task.prompt}</p>
                </div>
              )}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#444] mb-1.5">
                  {t('studio.detail.parameters')}
                </div>
                <div className="flex flex-wrap gap-1">
                  {meta.map(m => (
                    <div key={m.label} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.05]">
                      <span className="text-[9px] text-[#444]">{m.label}</span>
                      <span className="text-[10px] text-[#999] font-medium">{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── View mode ──────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#17171e] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.8)] w-[95vw] max-w-[1200px] max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] flex-shrink-0">
          <span className="text-[13px] font-semibold text-white">{t('studio.detail.generationDetail')}</span>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/[0.07] hover:bg-white/15 border-none cursor-pointer text-[#888] hover:text-white flex items-center justify-center transition-all text-[14px]">
            ✕
          </button>
        </div>

        {/* Body — mobile: single scroll column; desktop: side-by-side */}
        <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden md:flex md:flex-row">

          {/* Media */}
          <div className="md:w-[58%] bg-[#0d0d12] flex items-center justify-center md:overflow-hidden">
            {task.video_url ? (
              isVideo
                ? <video src={task.video_url} controls autoPlay className="w-full object-contain md:h-full" style={{ maxHeight: 'min(70vh, 600px)' }} />
                : <img src={task.video_url} alt={task.prompt} className="w-full object-contain md:h-full" style={{ maxHeight: 'min(70vh, 600px)' }} />
            ) : (
              <span className="text-[#333] text-[13px]">{t('studio.detail.noPreviewText')}</span>
            )}
          </div>

          {/* Info panel */}
          <div className="flex-1 flex flex-col gap-4 px-5 py-5 md:overflow-y-auto min-w-0">

            {/* Prompt */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-2">{t('studio.detail.promptLabel')}</div>
              <p className="text-[13px] text-[#ccc] leading-relaxed whitespace-pre-wrap break-words">
                {task.prompt || '—'}
              </p>
            </div>

            {/* Meta tags */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-2">{t('studio.detail.parameters')}</div>
              <div className="flex flex-wrap gap-1.5">
                {meta.map(m => (
                  <div key={m.label} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.06]">
                    <span className="text-[10px] text-[#555]">{m.label}</span>
                    <span className="text-[11px] text-[#bbb] font-medium">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 mt-auto pt-2">
              {task.video_url && !isVideo && onMaskConfirm && (
                <button onClick={() => setEditMode(true)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08] text-[13px] text-[#ccc] hover:text-white font-medium cursor-pointer transition-all border-none">
                  <iconify-icon icon="lucide:pencil-ruler" width="14" height="14" />
                  {t('studio.detail.editRegion')}
                </button>
              )}

              {task.video_url && (
                <button onClick={() => { onReusePrompt(task.prompt || ''); onClose() }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08] text-[13px] text-[#ccc] hover:text-white font-medium cursor-pointer transition-all border-none">
                  <iconify-icon icon="lucide:rotate-ccw" width="14" height="14" />
                  {t('studio.detail.usePrompt')}
                </button>
              )}

              {task.video_url && !isVideo && (
                <button onClick={() => { onUseAsRef(task.video_url!); onClose() }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08] text-[13px] text-[#ccc] hover:text-white font-medium cursor-pointer transition-all border-none">
                  <iconify-icon icon="lucide:image-plus" width="14" height="14" />
                  {t('studio.detail.useAsRefImage')}
                </button>
              )}

              {task.video_url && isVideo && (
                <button onClick={() => { onUseAsRef(task.video_url!); onClose() }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08] text-[13px] text-[#ccc] hover:text-white font-medium cursor-pointer transition-all border-none">
                  <iconify-icon icon="lucide:video" width="14" height="14" />
                  {t('studio.detail.useAsRefVideo')}
                </button>
              )}

              {task.video_url && !isVideo && (
                <button onClick={() => {
                  localStorage.setItem('grid_pending_image', task.video_url!)
                  window.location.href = '/grid'
                }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08] text-[13px] text-[#ccc] hover:text-white font-medium cursor-pointer transition-all border-none">
                  <iconify-icon icon="lucide:grid-3x3" width="14" height="14" />
                  {t('studio.detail.sendToGrid')}
                </button>
              )}

              {isPersonal && onAddToGroup && (
                <button onClick={() => { onAddToGroup(task); onClose() }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08] text-[13px] text-[#ccc] hover:text-white font-medium cursor-pointer transition-all border-none">
                  <iconify-icon icon="lucide:users" width="14" height="14" />
                  {t('studio.detail.addToGroup')}
                </button>
              )}

              {task.video_url && (
                <a href={task.video_url} download
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#FFD700]/10 hover:bg-[#FFD700]/20 border border-[#FFD700]/20 text-[13px] text-[#FFD700] font-medium cursor-pointer transition-all no-underline">
                  <iconify-icon icon="lucide:download" width="14" height="14" />
                  {t('studio.detail.download')}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Masonry grid (horizontal order) ─────────────────────────────────────────
// Distributes items left-to-right (index % numCols) then fills each column
// vertically, so the visual reading order matches insertion order.

function MasonryGrid<T>({
  items,
  colWidth,
  gap = 10,
  renderItem,
}: {
  items: T[]
  colWidth: number
  gap?: number
  renderItem: (item: T, index: number) => React.ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [numCols, setNumCols] = useState(1)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const calc = () => {
      const w = el.clientWidth
      const cols = Math.max(1, Math.floor((w + gap) / (colWidth + gap)))
      setNumCols(cols)
    }
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [colWidth, gap])

  // Distribute items into columns by index % numCols (horizontal order)
  const columns: T[][] = Array.from({ length: numCols }, () => [])
  items.forEach((item, i) => columns[i % numCols].push(item))

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', gap, alignItems: 'flex-start' }}
    >
      {columns.map((col, ci) => (
        <div key={ci} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap }}>
          {col.map((item, ri) => renderItem(item, ci + ri * numCols))}
        </div>
      ))}
    </div>
  )
}

// ── Output card ──
function OutputCard({ task, onOpen, isFavorite, onToggleFavorite, isNew, onSeen }: {
  task: Task
  onOpen: (t: Task) => void
  isFavorite?: boolean
  onToggleFavorite?: (id: string) => void
  isNew?: boolean
  onSeen?: (id: string) => void
}) {
  const t = useT()
  const isVideo = task.video_url?.endsWith('.mp4') || task.video_url?.endsWith('.webm') || task.video_url?.endsWith('.mov')
  const videoRef = useRef<HTMLVideoElement>(null)
  const [ar, setAr] = useState<string>(
    task.ratio ? task.ratio.replace(':', '/') : (isVideo ? '16/9' : '1/1')
  )
  const [isLoaded, setIsLoaded] = useState(false)

  function handleMouseEnter() {
    if (isVideo && videoRef.current) {
      videoRef.current.muted = true
      videoRef.current.play().catch(() => {})
    }
  }
  function handleMouseLeave() {
    if (isVideo && videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }

  return (
    <div
      className="bg-[#16161f] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/20 transition-all cursor-pointer group"
      onClick={() => {
        if (task.status === 'succeeded') {
          onSeen?.(task.task_id)
          onOpen(task)
        }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative flex items-center justify-center bg-[#0d0d12]" style={{ aspectRatio: ar }}>
        {task.status === 'succeeded' && task.video_url ? (
          <>
            {/* Shimmer placeholder — shown until media finishes loading */}
            {!isLoaded && (
              <div className="absolute inset-0 bg-[#1a1a24] overflow-hidden">
                <div className="absolute inset-0 skeleton-shimmer" />
              </div>
            )}
            {isVideo
              ? <video
                  ref={videoRef}
                  src={task.video_url}
                  muted loop playsInline
                  className={`w-full h-full object-cover ${isLoaded ? 'media-fade-in' : 'opacity-0'}`}
                  onLoadedData={() => setIsLoaded(true)}
                  onLoadedMetadata={e => {
                    const v = e.currentTarget
                    if (v.videoWidth && v.videoHeight) setAr(`${v.videoWidth}/${v.videoHeight}`)
                  }}
                />
              : <img
                  src={task.video_url}
                  alt={task.prompt}
                  className={`w-full h-full object-cover ${isLoaded ? 'media-fade-in' : 'opacity-0'}`}
                  onLoad={e => {
                    const img = e.currentTarget
                    if (img.naturalWidth && img.naturalHeight) setAr(`${img.naturalWidth}/${img.naturalHeight}`)
                    setIsLoaded(true)
                  }}
                />
            }
          </>
        ) : (
          <>
            {/* Skeleton shimmer for queued / running */}
            {(task.status === 'queued' || task.status === 'running') && (
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-[#1a1a24]" />
                {/* shimmer sweep */}
                <div className="absolute inset-0 skeleton-shimmer" />
                {/* subtle content lines */}
                <div className="absolute inset-0 flex flex-col justify-end p-3 gap-1.5">
                  <div className="h-2 rounded-full bg-white/[0.06] w-3/4" />
                  <div className="h-2 rounded-full bg-white/[0.04] w-1/2" />
                </div>
                {/* status badge */}
                <div className="absolute top-2 left-2">
                  {task.status === 'running' ? (
                    <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
                      <div className="w-3 h-3 border-[1.5px] border-[#FFD700] border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] text-[#FFD700] font-medium">{t('studio.generating')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
                      <span className="text-[10px] text-[#555] font-medium">{t('studio.queued')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {task.status === 'failed' && (
              <div className="text-center px-3 py-6">
                <span className="text-[11px] text-red-400">{t('studio.failed')}</span>
              </div>
            )}
          </>
        )}
        {/* new badge — shown until user clicks to view */}
        {isNew && task.status === 'succeeded' && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-[#CDFF4D]/90 backdrop-blur-sm rounded-full px-2 py-0.5 pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse inline-block" />
            <span className="text-[10px] text-black font-bold tracking-wide">{t('studio.new')}</span>
          </div>
        )}
        {/* video badge */}
        {isVideo && task.status === 'succeeded' && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-0.5">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span className="text-[10px] text-white/80 font-medium">{task.duration}s</span>
          </div>
        )}
        {/* hover overlay */}
        {task.status === 'succeeded' && (
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {!isVideo && <span className="text-white text-[12px] font-medium bg-black/50 px-3 py-1.5 rounded-full">{t('studio.viewDetails')}</span>}
          </div>
        )}
        {/* favorite button */}
        {task.status === 'succeeded' && onToggleFavorite && (
          <button
            onClick={e => { e.stopPropagation(); onToggleFavorite(task.task_id) }}
            className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center border-none cursor-pointer transition-all text-[14px]
              ${isFavorite
                ? 'bg-red-500/80 text-white opacity-100'
                : 'bg-black/50 text-white/40 opacity-0 group-hover:opacity-100 hover:text-red-400'}`}>
            {isFavorite ? '♥' : '♡'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Mock tasks from /pic for preview ──
const MOCK_PROMPTS: Record<string, { prompt: string; model: string; resolution: string; ratio: string }> = {
  'edited-adjusted-1756966092512.png':  { prompt: 'A stylish Asian man wearing a banana-print Hawaiian shirt, smiling, green studio background, professional photo', model: 'gpt-image-2', resolution: '1K', ratio: '1:1' },
  'edited-generated-1757037407216.png': { prompt: 'Black leather pants with yellow banana pattern, product shot on white background, fashion editorial', model: 'gpt-image-2', resolution: '1K', ratio: '1:1' },
  'edited-generated-1757037438244.png': { prompt: 'Black Nike sneakers with gold accents, studio product photography, clean white background, dramatic lighting', model: 'gpt-image-2', resolution: '1.5K', ratio: '1:1' },
  'edited-generated-1757037608237.png': { prompt: 'French bulldog puppy sitting, studio white background, professional pet photography, soft lighting', model: 'gpt-image-2', resolution: '1K', ratio: '1:1' },
  'edited-generated-1757037776203.png': { prompt: 'Gold rope chain necklace, luxury jewelry product shot, gradient grey background, high detail', model: 'gpt-image-2', resolution: '1.5K', ratio: '1:1' },
  'edited-generated-1757037944911.png': { prompt: 'BMW E30 M3 in gold/bronze color, classic car photography, studio lighting, clean background', model: 'gpt-image-2', resolution: '1.5K', ratio: '3:2' },
  'edited-generated-1757038219829.png': { prompt: 'Black leather jacket with banana print pattern, fashion product photography, white background', model: 'nano-banana-pro', resolution: '2K', ratio: '3:4' },
  'edited-generated-1757038797913.png': { prompt: 'Gold aviator sunglasses, luxury eyewear product shot, white background, reflective lenses', model: 'gpt-image-2', resolution: '1K', ratio: '1:1' },
  'edited-generated-1757038876177.png': { prompt: 'Black Boston Red Sox baseball cap with gold B logo, product photography, dark background', model: 'nano-banana-2', resolution: '1K', ratio: '1:1' },
  'edited-generated-1757040161800.png': { prompt: 'Golden eagle perched on branch, wildlife photography, dark moody background, dramatic lighting', model: 'gpt-image-2', resolution: '1.5K', ratio: '2:3' },
  'edited-generated-1757041463215.png': { prompt: 'Baby monkey sitting, cute wildlife portrait, soft white background, studio lighting', model: 'gpt-image-2', resolution: '1K', ratio: '1:1' },
}

const MOCK_TASKS: Task[] = [
  ...Object.entries(MOCK_PROMPTS).map(([filename, meta], i) => ({
    task_id: `mock-${i}`,
    status: 'succeeded' as const,
    prompt: meta.prompt,
    model: meta.model,
    resolution: meta.resolution,
    ratio: meta.ratio,
    duration: 5,
    created_at: Date.now() - i * 3600000,
    video_url: `/pic/${filename}`,
  })),
  // personal videos
  { task_id: 'mock-vid-0', status: 'succeeded' as const, prompt: 'A young man dancing energetically in a neon-lit urban street at night, cinematic slow motion, rain reflections on ground', model: 'doubao-seedance-2-0-260128', resolution: '1080p', ratio: '9:16', duration: 8, created_at: Date.now() - 500000, video_url: '/pic/video/ad2boy.mp4' },
  { task_id: 'mock-vid-1', status: 'succeeded' as const, prompt: 'Luxury sports car drifting on mountain road at sunset, cinematic wide angle, golden hour lighting, smoke trails', model: 'doubao-seedance-2-0-260128', resolution: '1080p', ratio: '16:9', duration: 10, created_at: Date.now() - 1200000, video_url: '/pic/video/e1.mp4' },
  { task_id: 'mock-vid-2', status: 'succeeded' as const, prompt: 'Abstract fluid simulation with gold and black ink dissolving in water, macro photography style, 4K ultra detail', model: 'doubao-seedance-2-0-fast-260128', resolution: '720p', ratio: '1:1', duration: 6, created_at: Date.now() - 2400000, video_url: '/pic/video/e2.mp4' },
  { task_id: 'mock-vid-3', status: 'succeeded' as const, prompt: 'Futuristic city skyline timelapse at night, flying vehicles, neon signs, cyberpunk aesthetic, rain and fog', model: 'veo-3-1-fast', resolution: '1080p', ratio: '16:9', duration: 8, created_at: Date.now() - 3600000, video_url: '/pic/video/e3.mp4' },
  { task_id: 'mock-vid-4', status: 'succeeded' as const, prompt: 'Close-up of a blooming flower in ultra slow motion, petals unfurling, morning dew drops, soft natural light', model: 'doubao-seedance-2-0-260128', resolution: '1080p', ratio: '9:16', duration: 12, created_at: Date.now() - 7200000, video_url: '/pic/video/e4.mp4' },
  // ── page 2 duplicates (offset by 24h) ──
  ...Object.entries(MOCK_PROMPTS).map(([filename, meta], i) => ({
    task_id: `mock-p2-${i}`,
    status: 'succeeded' as const,
    prompt: meta.prompt,
    model: meta.model,
    resolution: meta.resolution,
    ratio: meta.ratio,
    duration: 5,
    created_at: Date.now() - 86400000 - i * 3600000,
    video_url: `/pic/${filename}`,
  })),
  { task_id: 'mock-p2-vid-0', status: 'succeeded' as const, prompt: 'A young man dancing energetically in a neon-lit urban street at night, cinematic slow motion', model: 'doubao-seedance-2-0-260128', resolution: '1080p', ratio: '9:16', duration: 8, created_at: Date.now() - 86400000 - 500000, video_url: '/pic/video/ad2boy.mp4' },
  { task_id: 'mock-p2-vid-1', status: 'succeeded' as const, prompt: 'Luxury sports car drifting on mountain road at sunset, cinematic wide angle', model: 'doubao-seedance-2-0-260128', resolution: '1080p', ratio: '16:9', duration: 10, created_at: Date.now() - 86400000 - 1200000, video_url: '/pic/video/e1.mp4' },
  { task_id: 'mock-p2-vid-2', status: 'succeeded' as const, prompt: 'Abstract fluid simulation with gold and black ink dissolving in water', model: 'doubao-seedance-2-0-fast-260128', resolution: '720p', ratio: '1:1', duration: 6, created_at: Date.now() - 86400000 - 2400000, video_url: '/pic/video/e2.mp4' },
  { task_id: 'mock-p2-vid-3', status: 'succeeded' as const, prompt: 'Futuristic city skyline timelapse at night, flying vehicles, neon signs', model: 'veo-3-1-fast', resolution: '1080p', ratio: '16:9', duration: 8, created_at: Date.now() - 86400000 - 3600000, video_url: '/pic/video/e3.mp4' },
  { task_id: 'mock-p2-vid-4', status: 'succeeded' as const, prompt: 'Close-up of a blooming flower in ultra slow motion, petals unfurling', model: 'doubao-seedance-2-0-260128', resolution: '1080p', ratio: '9:16', duration: 12, created_at: Date.now() - 86400000 - 7200000, video_url: '/pic/video/e4.mp4' },
  // ── page 3 duplicates (offset by 48h) ──
  ...Object.entries(MOCK_PROMPTS).map(([filename, meta], i) => ({
    task_id: `mock-p3-${i}`,
    status: 'succeeded' as const,
    prompt: meta.prompt,
    model: meta.model,
    resolution: meta.resolution,
    ratio: meta.ratio,
    duration: 5,
    created_at: Date.now() - 172800000 - i * 3600000,
    video_url: `/pic/${filename}`,
  })),
]

// ── Group mock tasks ──
const GROUP_MOCK_TASKS: Task[] = [
  { task_id: 'group-mock-0', status: 'succeeded' as const, prompt: 'French bulldog puppy sitting, studio white background, professional pet photography', model: 'gpt-image-2', resolution: '1K', ratio: '1:1', duration: 5, created_at: Date.now() - 3600000, video_url: '/pic/group/group-generated-001.png' },
  { task_id: 'group-mock-1', status: 'succeeded' as const, prompt: 'Gold rope chain necklace, luxury jewelry product shot, gradient grey background', model: 'nano-banana-pro', resolution: '1.5K', ratio: '1:1', duration: 5, created_at: Date.now() - 7200000, video_url: '/pic/group/group-generated-002.png' },
  { task_id: 'group-mock-2', status: 'succeeded' as const, prompt: 'Black Boston Red Sox baseball cap with gold B logo, product photography, dark background', model: 'gpt-image-2', resolution: '1K', ratio: '1:1', duration: 5, created_at: Date.now() - 10800000, video_url: '/pic/group/group-generated-003.png' },
  { task_id: 'group-mock-3', status: 'succeeded' as const, prompt: 'Golden eagle perched on branch, wildlife photography, dark moody background, dramatic lighting', model: 'gpt-image-2', resolution: '1.5K', ratio: '2:3', duration: 5, created_at: Date.now() - 14400000, video_url: '/pic/group/group-generated-004.png' },
  { task_id: 'group-mock-4', status: 'succeeded' as const, prompt: 'A stylish Asian man wearing a banana-print Hawaiian shirt, smiling, green studio background', model: 'nano-banana-2', resolution: '2K', ratio: '3:4', duration: 5, created_at: Date.now() - 18000000, video_url: '/pic/group/group-generated-005.png' },
  // group videos
  { task_id: 'group-vid-0', status: 'succeeded' as const, prompt: 'Product showcase video of luxury sneakers rotating on pedestal, studio lighting, clean white background, 360 view', model: 'doubao-seedance-2-0-260128', resolution: '1080p', ratio: '1:1', duration: 8, created_at: Date.now() - 900000, video_url: '/pic/group/video/g1.mp4' },
  { task_id: 'group-vid-1', status: 'succeeded' as const, prompt: 'Fashion model walking on runway, slow motion, dramatic lighting, luxury brand aesthetic, Paris fashion week', model: 'doubao-seedance-2-0-fast-260128', resolution: '720p', ratio: '9:16', duration: 6, created_at: Date.now() - 1800000, video_url: '/pic/group/video/g2.mp4' },
  { task_id: 'group-vid-2', status: 'succeeded' as const, prompt: 'Brand commercial for streetwear collection, urban setting, youth culture, dynamic camera movements, vibrant colors', model: 'veo-3-1-fast', resolution: '1080p', ratio: '16:9', duration: 10, created_at: Date.now() - 5400000, video_url: '/pic/group/video/g3.mp4' },
]

export default function StudioPage() {
  return (
    <Suspense>
      <StudioPageInner />
    </Suspense>
  )
}

function StudioPageInner() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const searchParams = useSearchParams()
  const t = useT()
  const toast = useToast()

  // #13: load settings defaults on init
  const defaults = typeof window !== 'undefined' ? loadSettings() : {}

  const [tab, setTab]         = useState<MediaTab>('image')
  const [prompt, setPrompt]   = useState('')
  const [model, setModel]     = useState((defaults.defaultImageModel as string) || IMAGE_MODELS[0].value)
  const [ratio, setRatio]     = useState((defaults.defaultRatio as string) || '1:1')
  const [quality, setQuality] = useState('medium')
  const [resolution, setRes]  = useState((defaults.defaultResolution as string) || '1K')
  const [duration, setDur]    = useState((defaults.defaultDuration as number) || 5)
  const [audio, setAudio]     = useState(false)
  const [background, setBackground] = useState('auto')
  const [grounding, setGrounding] = useState('off')
  const [seedanceMode, setSeedanceMode] = useState('text_to_video')
  const [imageRefMode, setImageRefMode] = useState<'normal' | 'omni_reference'>('normal')
  // #2: count drives batch submission
  const [count, setCount]     = useState(1)
  const [refs, setRefs]       = useState<File[]>([])
  const [firstFrame, setFirstFrame] = useState<File | null>(null)
  const [lastFrame, setLastFrame]   = useState<File | null>(null)
  const firstFrameRef = useRef<HTMLInputElement>(null)
  const lastFrameRef  = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [outputs, setOutputs] = useState<Task[]>(() => {
    const saved = typeof window !== 'undefined' ? loadTasks().slice(0, 40) : []
    const realIds = new Set(saved.map(t => t.task_id))
    const mocks = MOCK_TASKS.filter(t => !realIds.has(t.task_id))
    return [...saved, ...mocks]
  })
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const fileRef    = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const galleryRef  = useRef<HTMLDivElement>(null)

  // #9: pick up ?ref= from tasks page "Continue with last frame"
  // #15: pick up ?prompt= and ?tab= from Guide page "Send to Studio"
  useEffect(() => {
    const ref = searchParams?.get('ref')
    if (ref) {
      setTab('video')
      setModel((defaults.defaultVideoModel as string) || VIDEO_MODELS[0].value)
      // Pre-populate a reference image URL as a note in the prompt
      setPrompt(p => p || `Continue from: ${ref}`)
    }

    // Pick up incoming prompt and tab from Guide page
    const incomingPrompt = searchParams?.get('prompt')
    const incomingTab    = searchParams?.get('tab') as MediaTab | null
    const incomingMode   = searchParams?.get('mode')
    const hasPlan        = searchParams?.get('plan') === '1'

    // Guide plan: consume stored plan (image or video)
    if (hasPlan && typeof window !== 'undefined') {

      // ── Image plan ──────────────────────────────────────────────────────────
      const imageRaw = localStorage.getItem('guide_image_plan')
      if (incomingTab === 'image' && imageRaw) {
        try {
          const imgPlan = JSON.parse(imageRaw) as {
            prompt: string
            outputSettings: { model: string; ratio: string; resolution: string; quality: string }
            refs: Array<{ tag: string; previewUrl: string; name: string }>
          }
          localStorage.removeItem('guide_image_plan')

          setTab('image')
          const m = imgPlan.outputSettings?.model || IMAGE_MODELS[0].value
          setModel(m)
          if (imgPlan.outputSettings?.ratio) setRatio(imgPlan.outputSettings.ratio)
          if (imgPlan.outputSettings?.resolution) setRes(imgPlan.outputSettings.resolution)
          if (imgPlan.outputSettings?.quality) setQuality(imgPlan.outputSettings.quality)
          if (imgPlan.prompt) setPrompt(imgPlan.prompt)

          if (imgPlan.refs?.length) {
            const refTags = imgPlan.refs.map(r => r.tag)
            getAllAssetFiles(refTags).then(fileMap => {
              const fetchFallbacks = imgPlan.refs
                .filter(r => !fileMap.has(r.tag) && r.previewUrl)
                .map(async r => {
                  try {
                    const res = await fetch(r.previewUrl)
                    const blob = await res.blob()
                    const file = new File([blob], r.name, { type: blob.type || 'image/jpeg' })
                    fileMap.set(r.tag, file)
                  } catch { /* silent */ }
                })
              Promise.all(fetchFallbacks).then(() => {
                const ordered = imgPlan.refs
                  .map(r => fileMap.get(r.tag))
                  .filter((f): f is File => f != null)
                if (ordered.length > 0) {
                  setImageRefMode('omni_reference')
                  setRefs(ordered.slice(0, 16))
                }
              })
            })
          }
        } catch { /* silent */ }

      // ── Video plan ──────────────────────────────────────────────────────────
      } else {
        const raw = localStorage.getItem('guide_video_plan')
        if (raw) {
          try {
            const plan = JSON.parse(raw) as {
              planMode: string
              combinedPrompt: string
              outputSettings?: { model: string; ratio: string; resolution: string }
              shots: Array<{ duration: number; mode: string; assetRefs: string[] }>
              assets: Array<{ tag: string; kind: string; previewUrl: string; name: string }>
              overallStyle: string | null
              totalDuration: number
            }
            localStorage.removeItem('guide_video_plan')

            setTab('video')
            const s = typeof window !== 'undefined' ? loadSettings() : {}
            const m = plan.outputSettings?.model || (s.defaultVideoModel as string) || VIDEO_MODELS[0].value
            setModel(m)
            if (plan.outputSettings?.ratio) setRatio(plan.outputSettings.ratio)
            if (plan.outputSettings?.resolution) setRes(plan.outputSettings.resolution)

            if (plan.combinedPrompt) setPrompt(plan.combinedPrompt)

            const planMode = plan.planMode ?? plan.shots[0]?.mode ?? 'text_to_video'
            if (['text_to_video', 'first_last_frames', 'omni_reference'].includes(planMode)) {
              setSeedanceMode(planMode)
            }

            const dur = planMode === 'first_last_frames'
              ? (plan.shots[0]?.duration ?? 5)
              : Math.min(plan.totalDuration ?? 5, 15)
            setDur(dur)

            const tags = plan.assets.map(a => a.tag)
            getAllAssetFiles(tags).then(fileMap => {
              const fetchFallbacks = plan.assets
                .filter(a => !fileMap.has(a.tag) && a.previewUrl)
                .map(async a => {
                  try {
                    const res = await fetch(a.previewUrl)
                    const blob = await res.blob()
                    const mime = a.kind === 'video' ? 'video/mp4' : 'image/jpeg'
                    const file = new File([blob], a.name, { type: blob.type || mime })
                    fileMap.set(a.tag, file)
                  } catch { /* silent */ }
                })

              Promise.all(fetchFallbacks).then(() => {
                const ordered = plan.assets
                  .map(a => fileMap.get(a.tag))
                  .filter((f): f is File => f !== null && f !== undefined)

                if (ordered.length === 0) return

                if (planMode === 'first_last_frames') {
                  if (ordered[0]) setFirstFrame(ordered[0])
                  if (ordered[1]) setLastFrame(ordered[1])
                } else {
                  setRefs(ordered.slice(0, 12))
                }
              })
            })
          } catch { /* silent */ }
        }
      }

    } else if (incomingPrompt) {
      setPrompt(incomingPrompt)
    }

    if (!hasPlan && (incomingTab === 'image' || incomingTab === 'video')) {
      setTab(incomingTab)
      const s = typeof window !== 'undefined' ? loadSettings() : {}
      if (incomingTab === 'image') {
        const m = (s.defaultImageModel as string) || IMAGE_MODELS[0].value
        setModel(m)
      } else {
        const m = (s.defaultVideoModel as string) || VIDEO_MODELS[0].value
        setModel(m)
        if (incomingMode && ['text_to_video', 'first_last_frames', 'omni_reference'].includes(incomingMode)) {
          setSeedanceMode(incomingMode)
        }
      }
    }

    // Pick up image sent from Grid page → auto switch to image-to-image (omni_reference) mode
    const pendingRef = localStorage.getItem('studio_pending_ref')
    if (pendingRef) {
      localStorage.removeItem('studio_pending_ref')
      setTab('image')
      setModel((defaults.defaultImageModel as string) || IMAGE_MODELS[0].value)
      setImageRefMode('omni_reference')
      fetch(pendingRef).then(r => r.blob()).then(blob => {
        const file = new File([blob], 'grid-ref.png', { type: 'image/png' })
        setRefs([file])
      }).catch(() => {})
      // Pre-fill prompt with selection range if provided
      const pendingPrompt = localStorage.getItem('studio_pending_prompt')
      if (pendingPrompt) {
        localStorage.removeItem('studio_pending_prompt')
        setPrompt(pendingPrompt)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function switchTab(t: MediaTab) {
    setTab(t)
    setRefs([])
    const s = typeof window !== 'undefined' ? loadSettings() : {}
    if (t === 'image') {
      setImageRefMode('normal')
      const m = (s.defaultImageModel as string) || IMAGE_MODELS[0].value
      setModel(m)
      const opts = getModelOptions(m, 'image')
      setRes(opts.resolutions[0])
      setRatio(opts.ratios.find(r => r !== 'auto') || opts.ratios[0])
      setCount(1)
    } else {
      setSeedanceMode('text_to_video')
      const m = (s.defaultVideoModel as string) || VIDEO_MODELS[0].value
      setModel(m)
      const opts = getModelOptions(m, 'video')
      setRes((s.defaultResolution as string) || opts.resolutions[opts.resolutions.length - 1])
      setRatio((s.defaultRatio as string) || opts.ratios.find(r => r !== 'auto') || opts.ratios[0])
      setCount(1)
    }
  }

  // When model changes, clamp current options to what the new model supports
  function handleModelChange(m: string) {
    setModel(m)
    const opts = getModelOptions(m, tab)
    const firstValidRatio = opts.ratios.find(r => r !== 'auto') || opts.ratios[0]
    if (!opts.ratios.includes(ratio) || (ratio === 'auto' && refs.length === 0)) setRatio(firstValidRatio)
    if (!opts.resolutions.includes(resolution)) setRes(opts.resolutions[0])
    if (opts.durations && !opts.durations.includes(duration)) setDur(opts.durations[1] ?? opts.durations[0])
    if (opts.qualities && !opts.qualities.includes(quality)) setQuality(opts.qualities[opts.qualities.length - 1])
    if (!opts.grounding) setGrounding('off')
  }

  // #5: auto-resize textarea
  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 144) + 'px' // ~6 rows
  }

  const activeIds = outputs.filter(t => ['queued', 'running'].includes(t.status)).map(t => t.task_id)

  const handleUpdate = useCallback((updated: Task) => {
    saveTask(updated)
    setOutputs(prev => prev.map(t => t.task_id === updated.task_id ? { ...t, ...updated } : t))
    if (updated.status === 'succeeded') {
      toast(`Generation complete`, 'success')
      setNewTaskIds(prev => new Set([...prev, updated.task_id]))
    }
    if (updated.status === 'failed') toast(t('studio.toast.generationFailed'), 'error')
  }, [toast])

  usePolling(activeIds, getTaskStatus, handleUpdate)

  const [demoMode, setDemoMode] = useState(false)

  // Demo mode: simulate queued → running → succeeded with a placeholder image
  async function handleDemoGenerate() {
    if (!prompt.trim()) return setError(t('studio.error.emptyPrompt'))
    setError('')

    const cameraText = ''
    const payload = {
      model, resolution, ratio, duration, generate_audio: audio,
      ...(tab === 'image' && quality ? { quality } : {}),
      ...(model === 'gpt-image-2' ? { background } : {}),
      ...(modelOpts.grounding && grounding !== 'off' ? { grounding } : {}),
      ...(model.includes('seedance') ? { mode: seedanceMode } : {}),
      prompt: prompt + cameraText,
    }
    console.group(`🍌 [DEMO] Generate ×${count}`)
    console.log('📋 Prompt:', prompt)
    console.log('🤖 Model:', model)
    console.log('📦 Full payload (demo):', payload)
    if (refs.length > 0) console.log('🖼 Refs:', refs.map(f => f.name))
    console.groupEnd()
    const demoImages = [
      '/pic/edited-adjusted-1756966092512.png',
      '/pic/edited-generated-1757037407216.png',
      '/pic/edited-generated-1757037438244.png',
      '/pic/edited-generated-1757037608237.png',
      '/pic/edited-generated-1757037776203.png',
      '/pic/edited-generated-1757038219829.png',
    ]
    const demoVideos = [
      '/pic/video/e1.mp4',
      '/pic/video/e2.mp4',
      '/pic/video/e3.mp4',
    ]
    const newTasks: Task[] = Array.from({ length: count }, (_, i) => ({
      task_id: `demo-${Date.now()}-${i}`,
      status: 'queued' as const,
      prompt, model, resolution, ratio, duration,
      created_at: Date.now(),
    }))
    setOutputs(prev => [...newTasks, ...prev])
    galleryRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    setPrompt(''); setRefs([])
    if (textareaRef.current) { textareaRef.current.style.height = 'auto' }
    toast(t('studio.toast.taskSubmitted'), 'success')

    // queued → running after 800ms
    await new Promise(r => setTimeout(r, 800))
    setOutputs(prev => prev.map(t =>
      newTasks.some(n => n.task_id === t.task_id) ? { ...t, status: 'running' } : t
    ))

    // running → succeeded after 2–4s (staggered)
    await Promise.all(newTasks.map(async (task, i) => {
      await new Promise(r => setTimeout(r, 2000 + i * 600 + Math.random() * 1000))
      const pool = tab === 'video' ? demoVideos : demoImages
      const url = pool[Math.floor(Math.random() * pool.length)]
      setOutputs(prev => prev.map(t =>
        t.task_id === task.task_id ? { ...t, status: 'succeeded', video_url: url } : t
      ))
      setNewTaskIds(prev => new Set([...prev, task.task_id]))
    }))
  }

  // #2: batch generation — submit `count` tasks
  async function handleGenerate() {
    if (demoMode) return handleDemoGenerate()
    if (!prompt.trim()) return setError(t('studio.error.emptyPrompt'))
    setError(''); setLoading(true)
    const content: unknown[] = [{ type: 'text', text: prompt }]
    refs.forEach(f => content.push({ type: 'image_url', image_url: { url: `upload://${f.name}` } }))

    const payload = {
      model, content, resolution, ratio, duration, generate_audio: audio,
      ...(tab === 'image' && quality ? { quality } : {}),
      ...(model === 'gpt-image-2' ? { background } : {}),
      ...(model.includes('seedance') ? { mode: seedanceMode } : {}),
      ...(modelOpts.grounding && grounding !== 'off' ? { grounding } : {}),
    }

    console.group(`🍌 Generate ×${count}`)
    console.log('📋 Prompt:', prompt)
    console.log('🤖 Model:', model)
    console.log('📦 Full payload:', payload)
    if (refs.length > 0) console.log('🖼 Refs:', refs.map(f => f.name))
    console.groupEnd()

    try {
      const submissions = Array.from({ length: count }, () => submitTask(payload))
      const results = await Promise.all(submissions)
      const newTasks: Task[] = results.map(({ task_id }) => ({
        task_id, status: 'queued', prompt, model, resolution, ratio, duration, created_at: Date.now(),
      }))
      newTasks.forEach(saveTask)
      setOutputs(prev => [...newTasks, ...prev])
      galleryRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      setPrompt(''); setRefs([])
      if (textareaRef.current) { textareaRef.current.style.height = 'auto' }
      toast(count > 1 ? `${count} ${t('studio.toast.tasksSubmitted')}` : t('studio.toast.taskSubmitted'), 'success')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      setError(e.response?.data?.message || e.message || 'Error')
    } finally { setLoading(false) }
  }

  // Inpainting: called when MaskEditor confirms inside DetailModal
  async function handleMaskConfirm(editTask: Task, maskDataUrl: string, editPrompt: string, params: EditParams, refFiles: File[] = []) {
    if (!editTask.video_url) return
    setLoading(true)
    setError('')
    try {
      // Convert ref files to base64 data URLs
      const refDataUrls = await Promise.all(refFiles.map(f => new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(f)
      })))

      const content: unknown[] = [
        { type: 'text', text: editPrompt },
        { type: 'image_url', image_url: { url: editTask.video_url } },
        ...refDataUrls.map(url => ({ type: 'image_url', image_url: { url } })),
      ]
      const { task_id } = await submitTask({
        model: params.model,
        content,
        resolution: params.resolution,
        ratio: params.ratio,
        duration,
        mask: maskDataUrl,
        ...(params.model === 'gpt-image-2' ? { quality: params.quality, background: params.background } : {}),
      })
      const newTask: Task = {
        task_id,
        status: 'queued',
        prompt: editPrompt,
        model: params.model,
        resolution: params.resolution,
        ratio: params.ratio,
        duration,
        created_at: Date.now(),
      }
      saveTask(newTask)
      setOutputs(prev => [newTask, ...prev])
      galleryRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      toast(t('studio.toast.editTaskSubmitted'), 'success')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      setError(e.response?.data?.message || e.message || 'Error')
    } finally { setLoading(false) }
  }

  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('seedance_favorites_personal') || '[]' : '[]')) }
    catch { return new Set() }
  })
  const [groupFavorites, setGroupFavorites] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('seedance_favorites_group') || '[]' : '[]')) }
    catch { return new Set() }
  })
  const [workspace, setWorkspace] = useState<'personal' | 'group'>('personal')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [groupSortOrder, setGroupSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [mediaFilter, setMediaFilter] = useState<'all' | 'image' | 'video' | 'favorites'>('all')
  const [colWidth, setColWidth] = useState(300)
  const PAGE_SIZE = 20
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const models  = tab === 'image' ? IMAGE_MODELS : VIDEO_MODELS
  const modelOpts = getModelOptions(model, tab)

  const [groupExtra, setGroupExtra] = useState<Task[]>([])
  const [newTaskIds, setNewTaskIds] = useState<Set<string>>(new Set())

  const isGroup = workspace === 'group'
  const activeFavorites = isGroup ? groupFavorites : favorites
  const activeSortOrder = isGroup ? groupSortOrder : sortOrder
  const setActiveSortOrder = isGroup ? setGroupSortOrder : setSortOrder
  const activeOutputs = isGroup ? [...GROUP_MOCK_TASKS, ...groupExtra] : outputs

  function toggleFavorite(id: string) {
    if (isGroup) {
      setGroupFavorites(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        localStorage.setItem('seedance_favorites_group', JSON.stringify([...next]))
        return next
      })
    } else {
      setFavorites(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        localStorage.setItem('seedance_favorites_personal', JSON.stringify([...next]))
        return next
      })
    }
  }

  // Sync current Studio context to localStorage so Guide can restore matching tab/mode
  useEffect(() => {
    try {
      const ctx = tab === 'image'
        ? { tab: 'image', mode: imageRefMode === 'omni_reference' ? 'omni_reference' : 'normal' }
        : { tab: 'video', mode: seedanceMode }
      localStorage.setItem('studio_nav_context', JSON.stringify(ctx))
    } catch { /* silent */ }
  }, [tab, seedanceMode, imageRefMode])

  // Reset visible count when filter/sort/workspace changes
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [mediaFilter, activeSortOrder, workspace])

  // Intersection Observer — load more when sentinel enters viewport
  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true)
          // Simulate async fetch delay — replace with real Firebase fetch
          setTimeout(() => {
            setVisibleCount(c => c + PAGE_SIZE)
            setIsLoadingMore(false)
          }, 600)
        }
      },
      { root: galleryRef.current, rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }) // runs every render — IntersectionObserver is cheap to re-attach

  if (!mounted) return null

  const isVideoUrl = (url?: string | null) =>
    !!(url && (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov')))

  const filteredOutputs = activeOutputs.filter(t => {
    if (mediaFilter === 'image') return !isVideoUrl(t.video_url)
    if (mediaFilter === 'video') return isVideoUrl(t.video_url)
    if (mediaFilter === 'favorites') return activeFavorites.has(t.task_id)
    return true
  })

  const sortedOutputs = [...filteredOutputs].sort((a, b) => {
    const at = a.created_at ?? 0
    const bt = b.created_at ?? 0
    return activeSortOrder === 'oldest' ? at - bt : bt - at
  })

  const SORT_LABELS = { newest: '↓ Newest', oldest: '↑ Oldest', favorites: '♥ Favorites' }
  const pagedOutputs = sortedOutputs.slice(0, visibleCount)
  const hasMore = visibleCount < sortedOutputs.length

  return (
    <div className="relative flex h-full overflow-hidden bg-[#0d0d12]">

      {/* Gallery */}
      <div ref={galleryRef} className="flex-1 overflow-y-auto pb-44">

        {/* Toolbar — 2 rows */}
        <div className="sticky top-0 z-10 bg-[#0d0d12]/90 backdrop-blur-sm border-b border-white/[0.04]">

          {/* Row 1: workspace + size slider */}
          <div className="flex items-center justify-between px-4 pt-2.5 pb-1.5">
            {/* Workspace switcher */}
            <div className="flex items-center bg-white/[0.05] rounded-lg p-0.5 gap-0.5">
              {(['personal', 'group'] as const).map(w => (
                <button key={w} onClick={() => setWorkspace(w)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium border-none cursor-pointer transition-all
                    ${workspace === w ? 'bg-white/15 text-white' : 'bg-transparent text-[#555] hover:text-[#888]'}`}>
                  <iconify-icon
                    icon={w === 'personal' ? 'lucide:user' : 'lucide:users'}
                    width="13"
                    height="13"
                  />
                  {w === 'personal' ? t('studio.filter.personal') : t('studio.filter.group')}
                </button>
              ))}
            </div>
            {/* Size toggle — hidden on mobile */}
            <div className="hidden sm:flex items-center gap-1">
              {([
                { w: 240, icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="9" height="9" rx="1"/><rect x="13" y="2" width="9" height="9" rx="1"/><rect x="2" y="13" width="9" height="9" rx="1"/><rect x="13" y="13" width="9" height="9" rx="1"/></svg> },
                { w: 300, icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/></svg> },
                { w: 360, icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg> },
              ] as { w: number; icon: React.ReactNode }[]).map(({ w, icon }) => (
                <button key={w} onClick={() => setColWidth(w)}
                  className="w-7 h-7 flex items-center justify-center rounded-md border-none cursor-pointer transition-all"
                  style={{ background: colWidth === w ? 'var(--color-raised)' : 'transparent', color: colWidth === w ? '#FFD700' : '#555' }}>
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: media type + sort */}
          <div className="flex items-center gap-1 px-4 pb-2 overflow-x-auto scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
            {/* Media type + favorites filter */}
            {(['all', 'image', 'video', 'favorites'] as const).map(f => {
              const isActive = mediaFilter === f
              return (
                <button key={f} onClick={() => setMediaFilter(f)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium border-none cursor-pointer transition-all flex-shrink-0
                    ${isActive ? 'bg-white/10 text-white' : 'bg-transparent text-[#555] hover:text-[#888]'}`}>
                  {f === 'all'       && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>}
                  {f === 'image'     && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
                  {f === 'video'     && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="15" height="12" rx="2"/><polyline points="17 10 22 7 22 17 17 14"/></svg>}
                  {f === 'favorites' && <span className="text-[11px] leading-none">♥</span>}
                  {/* label: always on desktop, only when active on mobile */}
                  <span className={`sm:inline ${isActive ? 'inline' : 'hidden'}`}>
                    {f === 'all' ? t('studio.filter.all') : f === 'image' ? t('studio.filter.images') : f === 'video' ? t('studio.filter.videos') : t('studio.filter.favorites')}
                  </span>
                </button>
              )
            })}

            <div className="w-px h-3.5 bg-white/[0.08] mx-1 flex-shrink-0" />

            {/* Sort: newest / oldest only */}
            {(['newest', 'oldest'] as const).map(s => {
              const isActive = activeSortOrder === s
              return (
                <button key={s} onClick={() => setActiveSortOrder(s)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-medium border-none cursor-pointer transition-all flex-shrink-0
                    ${isActive ? 'bg-white/10 text-white' : 'bg-transparent text-[#555] hover:text-[#888]'}`}>
                  <span>{s === 'newest' ? '↓' : '↑'}</span>
                  <span className={`sm:inline ${isActive ? 'inline' : 'hidden'}`}>
                    {s === 'newest' ? t('studio.sort.newest') : t('studio.sort.oldest')}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Grid */}
        <div className="p-4">
          {sortedOutputs.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-[#2a2a35]">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span className="text-[13px]">{t('studio.noGenerations')}</span>
            </div>
          ) : (
            <MasonryGrid
              items={pagedOutputs}
              colWidth={colWidth}
              gap={10}
              renderItem={t => (
                <OutputCard key={t.task_id} task={t}
                  isFavorite={activeFavorites.has(t.task_id)}
                  onOpen={setSelectedTask}
                  onToggleFavorite={toggleFavorite}
                  isNew={newTaskIds.has(t.task_id)}
                  onSeen={id => setNewTaskIds(prev => { const s = new Set(prev); s.delete(id); return s })}
                />
              )}
            />
          )}

          {/* Infinite scroll sentinel + loading indicator */}
          {hasMore && (
            <div ref={loadMoreRef} className="px-2.5 pb-2.5">
              {isLoadingMore ? (
                /* Skeleton cards while loading more */
                <MasonryGrid
                  items={Array.from({ length: 4 }, (_, i) => i)}
                  colWidth={colWidth}
                  gap={10}
                  renderItem={i => (
                    <div key={i} className="rounded-2xl overflow-hidden bg-[#1a1a24]"
                      style={{ aspectRatio: (['1/1', '3/4', '16/9', '4/5'] as const)[i % 4] }}>
                      <div className="w-full h-full skeleton-shimmer" />
                    </div>
                  )}
                />
              ) : (
                /* Invisible trigger zone */
                <div className="h-8" />
              )}
            </div>
          )}
          {!hasMore && sortedOutputs.length > PAGE_SIZE && (
            <div className="text-center py-4 text-[11px] text-[#333]">— {sortedOutputs.length} items —</div>
          )}
        </div>
      </div>

      {/* Floating bottom bar */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[min(740px,calc(100%-40px))] z-40">

        {/* #4: error above the bar */}
        {error && (
          <div className="mb-2 px-4 py-2.5 rounded-xl bg-[#2a1215] border border-red-500/40 text-[12px] text-red-400 shadow-lg">
            {error}
          </div>
        )}

        <div className="bg-[#17171e] border border-white/[0.09] rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.7)] overflow-visible">

          {/* Top row: tabs + prompt + generate */}
          <div className="flex items-stretch">

            {/* Image / Video tabs */}
            <div className="flex flex-col border-r border-white/[0.07] flex-shrink-0 p-1.5 gap-0.5">
              {([['image', <IconImage key="i"/>], ['video', <IconVideo key="v"/>]] as [MediaTab, React.ReactNode][]).map(([t, icon]) => (
                <button key={t} onClick={() => switchTab(t)}
                  className={`flex flex-col items-center justify-center gap-0.5 w-[46px] sm:w-[60px] py-2 sm:py-2.5 rounded-xl border-none cursor-pointer transition-all text-[10px] sm:text-[11px] font-medium capitalize
                    ${tab === t ? 'text-white bg-white/[0.10]' : 'text-[#444] hover:text-[#666] bg-transparent'}`}>
                  {icon}
                  {t}
                </button>
              ))}
            </div>

            {/* prompt area: refs strip on top, textarea below */}
            <div className="flex-1 flex flex-col justify-center px-3 sm:px-4 py-2.5 sm:py-3 min-w-0 gap-1.5">

              {/* Seedance mode selector (video) */}
              {tab === 'video' && model.includes('seedance') && (
                <div className="flex gap-1 -mx-1 mb-0.5">
                  {([
                    { id: 'text_to_video',     icon: '✦', label: t('studio.mode.textToVideo'), hint: t('studio.mode.hintPromptOnly') },
                    { id: 'first_last_frames',  icon: '↔', label: t('studio.mode.firstLast'),  hint: t('studio.mode.hintFirstLast') },
                    { id: 'omni_reference',     icon: '@', label: t('studio.mode.omniRef'),     hint: t('studio.mode.hintOmniRef') },
                  ] as const).map(m => (
                    <button key={m.id}
                      onClick={() => { setSeedanceMode(m.id); if (m.id === 'text_to_video') setRefs([]) }}
                      className={`flex-1 flex items-center justify-center sm:justify-start gap-1.5 px-1.5 sm:px-2 py-1.5 rounded-lg border transition-all cursor-pointer text-left
                        ${seedanceMode === m.id
                          ? 'bg-[#FFD700]/10 border-[#FFD700]/30 text-white'
                          : 'bg-transparent border-white/[0.06] text-[#555] hover:text-[#888] hover:border-white/10'}`}>
                      <span className={`text-[13px] font-bold flex-shrink-0 w-4 text-center ${seedanceMode === m.id ? 'text-[#FFD700]' : 'text-[#444]'}`}>{m.icon}</span>
                      <div className="min-w-0 hidden sm:block">
                        <div className="text-[11px] font-semibold leading-tight">{m.label}</div>
                        <div className={`text-[9px] leading-tight ${seedanceMode === m.id ? 'text-[#FFD700]/60' : 'text-[#333]'}`}>{m.hint}</div>
                      </div>
                      <div className={`min-w-0 sm:hidden text-[10px] font-semibold leading-tight truncate ${seedanceMode === m.id ? 'block' : 'hidden'}`}>{m.label}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Image ref mode selector */}
              {tab === 'image' && (
                <div className="flex gap-1 -mx-1 mb-0.5">
                  {([
                    { id: 'normal' as const,        icon: '✦', label: t('studio.mode.textToImage'), hint: t('studio.mode.hintPromptOnly') },
                    { id: 'omni_reference' as const, icon: '@', label: t('studio.mode.imageToImage'), hint: t('studio.mode.hintImageToImage') },
                  ]).map(m => (
                    <button key={m.id}
                      onClick={() => { setImageRefMode(m.id); if (m.id === 'normal') setRefs([]) }}
                      className={`flex-1 flex items-center justify-center sm:justify-start gap-1.5 px-1.5 sm:px-2 py-1.5 rounded-lg border transition-all cursor-pointer text-left
                        ${imageRefMode === m.id
                          ? 'bg-[#FFD700]/10 border-[#FFD700]/30 text-white'
                          : 'bg-transparent border-white/[0.06] text-[#555] hover:text-[#888] hover:border-white/10'}`}>
                      <span className={`text-[13px] font-bold flex-shrink-0 w-4 text-center ${imageRefMode === m.id ? 'text-[#FFD700]' : 'text-[#444]'}`}>{m.icon}</span>
                      <div className="min-w-0 hidden sm:block">
                        <div className="text-[11px] font-semibold leading-tight">{m.label}</div>
                        <div className={`text-[9px] leading-tight ${imageRefMode === m.id ? 'text-[#FFD700]/60' : 'text-[#333]'}`}>{m.hint}</div>
                      </div>
                      <div className={`min-w-0 sm:hidden text-[10px] font-semibold leading-tight truncate ${imageRefMode === m.id ? 'block' : 'hidden'}`}>{m.label}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* ── Refs area: adapts to Seedance mode ── */}
              {!(tab === 'video' && model.includes('seedance') && seedanceMode === 'text_to_video') && !(tab === 'image' && imageRefMode === 'normal') && (
                <>
                  {/* First / Last Frame mode */}
                  {tab === 'video' && model.includes('seedance') && seedanceMode === 'first_last_frames' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#555] font-semibold uppercase tracking-widest w-10 flex-shrink-0">{t('studio.pagination.first')}</span>
                        {firstFrame ? (
                          <div className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 group border border-white/10">
                            <img src={URL.createObjectURL(firstFrame)} alt="" className="w-full h-full object-cover" />
                            <button onClick={() => setFirstFrame(null)} className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border-none cursor-pointer text-white text-[11px]">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => firstFrameRef.current?.click()} className="w-9 h-9 rounded-lg border border-dashed border-white/[0.15] hover:border-[#FFD700]/50 bg-white/[0.03] hover:bg-[#FFD700]/[0.06] flex items-center justify-center text-[#444] hover:text-[#FFD700] transition-all cursor-pointer flex-shrink-0"><IconPlus /></button>
                        )}
                        <input ref={firstFrameRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setFirstFrame(f) }} />
                      </div>
                      <div className="hidden sm:block w-px h-6 bg-white/[0.07]" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#555] font-semibold uppercase tracking-widest w-10 flex-shrink-0">{t('studio.pagination.last')}</span>
                        {lastFrame ? (
                          <div className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 group border border-white/10">
                            <img src={URL.createObjectURL(lastFrame)} alt="" className="w-full h-full object-cover" />
                            <button onClick={() => setLastFrame(null)} className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border-none cursor-pointer text-white text-[11px]">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => lastFrameRef.current?.click()} className="w-9 h-9 rounded-lg border border-dashed border-white/[0.15] hover:border-[#FFD700]/50 bg-white/[0.03] hover:bg-[#FFD700]/[0.06] flex items-center justify-center text-[#444] hover:text-[#FFD700] transition-all cursor-pointer flex-shrink-0"><IconPlus /></button>
                        )}
                        <input ref={lastFrameRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setLastFrame(f) }} />
                      </div>
                    </div>
                  ) : tab === 'video' && model.includes('seedance') && seedanceMode === 'omni_reference' ? (
                    <div className="flex items-start gap-1.5 flex-wrap">
                      {refs.length < 12 && (
                        <button onClick={() => fileRef.current?.click()} className="w-7 h-7 rounded-full border border-white/10 bg-white/[0.07] hover:bg-white/[0.13] flex items-center justify-center text-[#777] hover:text-white transition-all cursor-pointer flex-shrink-0"><IconPlus /></button>
                      )}
                      <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" multiple className="hidden" onChange={e => { if (e.target.files) setRefs(p => [...p, ...Array.from(e.target.files!)].slice(0, 12)) }} />
                      {refs.map((f, i) => {
                        const isVid = f.type.startsWith('video/')
                        const isAud = f.type.startsWith('audio/')
                        const type = isVid ? 'video' : isAud ? 'audio' : 'image'
                        const tag = `@${type}${i + 1}`
                        return (
                          <div key={i} className="relative flex-shrink-0 group">
                            <div className="w-9 h-9 rounded-lg overflow-hidden border border-white/10 bg-white/[0.05] flex items-center justify-center">
                              {isAud
                                ? <span className="text-[11px]">🎵</span>
                                : isVid
                                  ? <VideoFrameThumb file={f} />
                                  : <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                              }
                            </div>
                            <button onClick={() => { const insert = tag + ' '; setPrompt(p => p.endsWith(' ') || p === '' ? p + insert : p + ' ' + insert); setTimeout(() => textareaRef.current?.focus(), 50) }}
                              className="absolute -bottom-1 -right-1 bg-[#FFD700] text-black text-[8px] font-bold px-1 rounded leading-tight border-none cursor-pointer hover:bg-[#CC9900] transition-colors z-10">{tag}</button>
                            <button onClick={() => setRefs(p => p.filter((_, j) => j !== i))} className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border-none cursor-pointer text-white text-[11px] rounded-lg">✕</button>
                          </div>
                        )
                      })}
                      {refs.length > 0 && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full self-center ${refs.length >= 12 ? 'text-amber-400 bg-amber-400/10' : 'text-[#555] bg-white/[0.04]'}`}>{refs.length}/12</span>}
                    </div>
                  ) : tab === 'image' && imageRefMode === 'omni_reference' ? (
                    <div className="flex items-start gap-1.5 flex-wrap">
                      {refs.length < 12 && (
                        <button onClick={() => fileRef.current?.click()} className="w-7 h-7 rounded-full border border-white/10 bg-white/[0.07] hover:bg-white/[0.13] flex items-center justify-center text-[#777] hover:text-white transition-all cursor-pointer flex-shrink-0"><IconPlus /></button>
                      )}
                      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { if (e.target.files) setRefs(p => [...p, ...Array.from(e.target.files!)].slice(0, 12)) }} />
                      {refs.map((f, i) => {
                        const tag = `@image${i + 1}`
                        return (
                          <div key={i} className="relative flex-shrink-0 group">
                            <div className="w-9 h-9 rounded-lg overflow-hidden border border-white/10 bg-white/[0.05] flex items-center justify-center">
                              <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                            </div>
                            <button onClick={() => { const insert = tag + ' '; setPrompt(p => p.endsWith(' ') || p === '' ? p + insert : p + ' ' + insert); setTimeout(() => textareaRef.current?.focus(), 50) }}
                              className="absolute -bottom-1 -right-1 bg-[#FFD700] text-black text-[8px] font-bold px-1 rounded leading-tight border-none cursor-pointer hover:bg-[#CC9900] transition-colors z-10">{tag}</button>
                            <button onClick={() => setRefs(p => p.filter((_, j) => j !== i))} className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border-none cursor-pointer text-white text-[11px] rounded-lg">✕</button>
                          </div>
                        )
                      })}
                      {refs.length > 0 && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full self-center ${refs.length >= 12 ? 'text-amber-400 bg-amber-400/10' : 'text-[#555] bg-white/[0.04]'}`}>{refs.length}/12</span>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(() => {
                        const refLimit = REF_LIMITS[model]
                        const maxRefs = refLimit?.max ?? 9
                        const atLimit = refs.length >= maxRefs
                        return (
                          <div className="relative group/refbtn flex-shrink-0">
                            <button onClick={() => !atLimit && fileRef.current?.click()} disabled={atLimit}
                              className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all cursor-pointer ${atLimit ? 'bg-white/[0.03] border-white/[0.06] text-[#444] cursor-not-allowed' : 'bg-white/[0.07] hover:bg-white/[0.13] border-white/10 text-[#777] hover:text-white'}`}>
                              <IconPlus />
                            </button>
                            <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 bg-[#1c1c26] border border-white/10 rounded-xl px-3 py-2 shadow-lg pointer-events-none opacity-0 group-hover/refbtn:opacity-100 transition-opacity z-50 w-max max-w-[200px]">
                              <div className="text-[11px] text-[#bbb] font-medium whitespace-nowrap">{refLimit?.desc ?? 'Add reference image'}</div>
                              {refs.length > 0 && <div className={`text-[10px] mt-0.5 ${atLimit ? 'text-amber-400' : 'text-[#555]'}`}>{refs.length} / {maxRefs} used{atLimit ? ' — limit reached' : ''}</div>}
                            </div>
                          </div>
                        )
                      })()}
                      <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={e => { if (e.target.files) setRefs(p => [...p, ...Array.from(e.target.files!)].slice(0, REF_LIMITS[model]?.max ?? 9)) }} />
                      {refs.map((f, i) => (
                        <RefThumb key={i} file={f} onRemove={() => { setRefs(p => { const next = p.filter((_, j) => j !== i); if (next.length === 0 && ratio === 'auto') setRatio(modelOpts.ratios.find(r => r !== 'auto') || '1:1'); return next }) }} />
                      ))}
                      {refs.length > 0 && (() => { const m = REF_LIMITS[model]?.max ?? 9; const a = refs.length >= m; return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${a ? 'text-amber-400 bg-amber-400/10' : 'text-[#555] bg-white/[0.04]'}`}>{refs.length}/{m}</span> })()}
                    </div>
                  )}
                </>
              )}

              {/* textarea */}
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={e => { setPrompt(e.target.value); autoResize(e.target) }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate() } }}
                placeholder={
                  tab === 'image' && imageRefMode === 'omni_reference' ? 'Use @image1, @image2 to reference uploaded images…' :
                  tab === 'image' ? t('studio.placeholder.image') :
                  model.includes('seedance') && seedanceMode === 'omni_reference' ? 'Use @image1, @video1, @audio1 to reference uploaded files…' :
                  t('studio.placeholder.video')
                }
                rows={2}
                className="w-full resize-none bg-transparent border-none outline-none text-[14px] text-white placeholder:text-[#3a3a4a] leading-relaxed shadow-none p-0 min-w-0"
                style={{ minHeight: '2.5rem', maxHeight: '9rem', overflowY: 'auto' }}
              />
            </div>

            {/* Generate button */}
            <div className="flex items-center gap-2 px-2 sm:px-3 flex-shrink-0">
              {/* Demo mode toggle — hidden on mobile */}
              <button
                onClick={() => setDemoMode(d => !d)}
                title={demoMode ? 'Demo mode ON — click to disable' : 'Demo mode OFF — click to enable'}
                className={`hidden sm:flex h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer whitespace-nowrap items-center
                  ${demoMode
                    ? 'bg-amber-400/20 border-amber-400/40 text-amber-300'
                    : 'bg-white/[0.04] border-white/10 text-[#555] hover:text-[#888]'}`}>
                {demoMode ? '🎬 DEMO' : 'DEMO'}
              </button>
              <button onClick={handleGenerate} disabled={loading}
                className="sm:h-[52px] sm:px-5 sm:rounded-xl sm:text-[13px] sm:w-auto w-[40px] h-[40px] rounded-xl font-bold text-black border-none cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0"
                style={{ background: loading ? '#999' : demoMode ? '#FFD700' : '#CDFF4D' }}>
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="sm:hidden flex items-center justify-center"><IconSend /></span>
                    <span className="hidden sm:inline">GENERATE{count > 1 ? ` ×${count}` : ''}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Params row */}
          <div className="flex items-center gap-1 px-3 py-2 border-t border-white/[0.06] flex-wrap">

            {/* Model */}
            <Popover trigger={<Pill icon={<IconModel />} label={models.find(m => m.value === model)?.label || ''} />}>
              <div className="flex flex-col gap-0.5 w-36">
                {models.map(m => <Opt key={m.value} label={m.label} active={model === m.value} onClick={() => handleModelChange(m.value)} />)}
              </div>
            </Popover>

            <div className="w-px h-4 bg-white/[0.07] mx-0.5 flex-shrink-0" />

            {/* Ratio */}
            <Popover trigger={<Pill icon={<IconRatio />} label={ratio} />}>
              <div className="w-44">
                <div className="px-3 pt-2.5 pb-1.5 text-[11px] font-semibold text-[#555] uppercase tracking-widest">{t('studio.filter.aspectRatio')}</div>
                {modelOpts.ratios
                  .filter(r => r !== 'auto' || refs.length > 0 || seedanceMode === 'first_last_frames')
                  .map(r => {
                    const [w, h] = r === 'auto' ? [1, 1] : r.split(':').map(Number)
                    const maxDim = 14
                    const bw = w >= h ? maxDim : Math.round(maxDim * w / h)
                    const bh = h >= w ? maxDim : Math.round(maxDim * h / w)
                    return (
                      <button key={r} onClick={() => setRatio(r)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left border-none cursor-pointer font-[inherit] transition-all
                          ${ratio === r ? 'bg-white/10 text-white' : 'bg-transparent text-[#888] hover:bg-white/5 hover:text-white'}`}>
                        <span className="flex items-center justify-center flex-shrink-0" style={{ width: 18, height: 18 }}>
                          {r === 'auto'
                            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg>
                            : <svg width={bw + 2} height={bh + 2} viewBox={`0 0 ${bw + 2} ${bh + 2}`} style={{ display: 'block' }}>
                                <rect x="1" y="1" width={bw} height={bh} rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                              </svg>
                          }
                        </span>
                        <span className="flex-1 text-[13px]">{r === 'auto' ? 'Auto' : r}</span>
                        {ratio === r && <span className="text-[#FFD700] text-[12px]">✓</span>}
                      </button>
                    )
                  })}
              </div>
            </Popover>

            {/* Quality — image only, if model supports it */}
            {tab === 'image' && modelOpts.qualities && (() => {
              const QUALITY_META: Record<string, string> = {
                low:    t('studio.quality.fastest'),
                medium: t('studio.quality.balanced'),
                high:   t('studio.quality.best'),
                auto:   t('studio.quality.auto'),
                standard: t('studio.quality.balanced'),
              }
              return (
                <Popover trigger={<Pill icon={<IconQuality />} label={quality} />}>
                  <div className="w-44">
                    <div className="px-3 pt-2.5 pb-1.5 text-[11px] font-semibold text-[#555] uppercase tracking-widest">Select quality</div>
                    {modelOpts.qualities.map(q => (
                      <button key={q} onClick={() => setQuality(q)}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left border-none cursor-pointer font-[inherit] transition-all
                          ${quality === q ? 'bg-white/10 text-white' : 'bg-transparent text-[#888] hover:bg-white/5 hover:text-white'}`}>
                        <div>
                          <div className="text-[13px] font-medium capitalize">{q}</div>
                          {QUALITY_META[q] && <div className="text-[11px] text-[#555] mt-0.5">{QUALITY_META[q]}</div>}
                        </div>
                        {quality === q && <span className="text-[#FFD700] text-[12px] flex-shrink-0">✓</span>}
                      </button>
                    ))}
                  </div>
                </Popover>
              )
            })()}

            {/* Background — GPT Image 2 only */}
            {model === 'gpt-image-2' && (
              <Popover trigger={<Pill icon={<IconBackground />} label={background} />}>
                <div className="w-44">
                  <div className="px-3 pt-2.5 pb-1.5 text-[11px] font-semibold text-[#555] uppercase tracking-widest">Background</div>
                  {([
                    { value: 'auto',        hint: t('studio.quality.auto') },
                    { value: 'transparent', hint: 'PNG with alpha channel' },
                    { value: 'opaque',      hint: 'Solid background'    },
                  ] as const).map(({ value, hint }) => (
                    <button key={value} onClick={() => setBackground(value)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left border-none cursor-pointer font-[inherit] transition-all
                        ${background === value ? 'bg-white/10 text-white' : 'bg-transparent text-[#888] hover:bg-white/5 hover:text-white'}`}>
                      <div>
                        <div className="text-[13px] font-medium capitalize">{value}</div>
                        <div className="text-[11px] text-[#555] mt-0.5">{hint}</div>
                      </div>
                      {background === value && <span className="text-[#FFD700] text-[12px] flex-shrink-0">✓</span>}
                    </button>
                  ))}
                </div>
              </Popover>
            )}

            {/* Grounding — Nano Banana models only */}
            {tab === 'image' && modelOpts.grounding && (
              <Popover trigger={<Pill icon={<IconGrounding />} label={grounding === 'off' ? 'Search Off' : grounding === 'web' ? 'Web Search' : 'Web+Image'} />}>
                <div className="w-52">
                  <div className="px-3 pt-2.5 pb-1.5 text-[11px] font-semibold text-[#555] uppercase tracking-widest">Google Search Grounding</div>
                  {([
                    { value: 'off',       hint: 'No search grounding' },
                    { value: 'web',       hint: 'Ground with web search results' },
                    { value: 'web+image', hint: 'Web search + image search (NB2 only)' },
                  ] as const).filter(o => modelOpts.grounding!.includes(o.value)).map(({ value, hint }) => (
                    <button key={value} onClick={() => setGrounding(value)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left border-none cursor-pointer font-[inherit] transition-all
                        ${grounding === value ? 'bg-white/10 text-white' : 'bg-transparent text-[#888] hover:bg-white/5 hover:text-white'}`}>
                      <div>
                        <div className="text-[13px] font-medium capitalize">{value === 'off' ? 'Off' : value === 'web' ? 'Web Search' : 'Web + Image'}</div>
                        <div className="text-[11px] text-[#555] mt-0.5">{hint}</div>
                      </div>
                      {grounding === value && <span className="text-[#FFD700] text-[12px] flex-shrink-0">✓</span>}
                    </button>
                  ))}
                </div>
              </Popover>
            )}

            {/* Resolution */}
            <Popover trigger={<Pill label={modelOpts.resolutions.includes(resolution) ? resolution : modelOpts.resolutions[0]} />}>
              <div className="w-44">
                <div className="px-3 pt-2.5 pb-1.5 text-[11px] font-semibold text-[#555] uppercase tracking-widest">Select resolution</div>
                {modelOpts.resolutions.map(r => {
                  const RES_PX: Record<string, string> = {
                    '512': '512px', '1K': '1024px', '2K': '2048px', '3K': '3072px', '4K': '4096px',
                    '480p': '854 × 480', '720p': '1280 × 720', '1080p': '1920 × 1080', '4k': '3840 × 2160',
                  }
                  return (
                    <button key={r} onClick={() => setRes(r)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left border-none cursor-pointer font-[inherit] transition-all
                        ${resolution === r ? 'bg-white/10 text-white' : 'bg-transparent text-[#888] hover:bg-white/5 hover:text-white'}`}>
                      <div>
                        <div className="text-[13px] font-medium">{r}</div>
                        {RES_PX[r] && <div className="text-[11px] text-[#555] mt-0.5">{RES_PX[r]}</div>}
                      </div>
                      {resolution === r && <span className="text-[#FFD700] text-[12px] flex-shrink-0">✓</span>}
                    </button>
                  )
                })}
              </div>
            </Popover>

            {/* Duration — video only, pill + popover with slider */}
            {tab === 'video' && modelOpts.durations && (
              <Popover trigger={<Pill icon={<IconDuration />} label={`${duration}s`} />}>
                <div className="w-52">
                  <div className="px-4 pt-3 pb-1 text-[11px] font-semibold text-[#555] uppercase tracking-widest">Duration</div>
                  <div className="px-4 pb-3">
                    {/* Current value display */}
                    <div className="flex justify-between items-baseline mb-3">
                      <span className="text-[11px] text-[#444]">{modelOpts.durations[0]}s</span>
                      <span className="text-[22px] font-bold text-white tabular-nums leading-none">{duration}<span className="text-[13px] text-[#666] font-normal ml-0.5">s</span></span>
                      <span className="text-[11px] text-[#444]">{modelOpts.durations[modelOpts.durations.length - 1]}s</span>
                    </div>
                    <input
                      type="range"
                      min={modelOpts.durations[0]}
                      max={modelOpts.durations[modelOpts.durations.length - 1]}
                      step={1}
                      value={duration}
                      onChange={e => {
                        const v = +e.target.value
                        const snapped = modelOpts.durations!.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a)
                        setDur(snapped)
                      }}
                      className="w-full cursor-pointer accent-[#FFD700]"
                    />
                    {/* tick marks for discrete models like Veo */}
                    {modelOpts.durations.length <= 5 && (
                      <div className="flex justify-between mt-2">
                        {modelOpts.durations.map(d => (
                          <button key={d} onClick={() => setDur(d)}
                            className={`text-[10px] border-none cursor-pointer bg-transparent transition-colors
                              ${duration === d ? 'text-[#FFD700] font-bold' : 'text-[#444] hover:text-[#888]'}`}>
                            {d}s
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Popover>
            )}

            {/* Camera settings removed — use the Prompt Guide instead */}

            <div className="w-px h-4 bg-white/[0.07] mx-0.5 flex-shrink-0" />

            {/* Count — image only (video always generates 1) */}
            {tab === 'image' && (
              <div className="flex items-center gap-1.5 px-1 flex-shrink-0">
                <button onClick={() => setCount(c => Math.max(1, c - 1))}
                  className="w-6 h-6 rounded-full bg-white/[0.07] hover:bg-white/[0.13] border-none cursor-pointer text-[#777] hover:text-white flex items-center justify-center transition-all text-base leading-none">
                  −
                </button>
                <span className="text-[13px] text-[#bbb] font-medium w-7 text-center tabular-nums">{count}/4</span>
                <button onClick={() => setCount(c => Math.min(4, c + 1))}
                  className="w-6 h-6 rounded-full bg-white/[0.07] hover:bg-white/[0.13] border-none cursor-pointer text-[#777] hover:text-white flex items-center justify-center transition-all text-base leading-none">
                  +
                </button>
              </div>
            )}

            {/* Audio toggle — video only, Seedance (all modes) or Veo */}
            {tab === 'video' && (model.includes('veo') || model.includes('seedance')) && (
              <>
                <div className="w-px h-4 bg-white/[0.07] mx-0.5 flex-shrink-0" />
                <button onClick={() => setAudio(a => !a)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[13px] font-medium border-none cursor-pointer transition-all
                    ${audio ? 'bg-white/10 text-white' : 'bg-white/[0.06] text-[#555] hover:text-[#999]'}`}>
                  {audio ? <IconAudio /> : <IconAudioOff />}
                  {audio ? 'Audio On' : 'Audio Off'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {selectedTask && (
        <DetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          isPersonal={!isGroup}
          onAddToGroup={(addedTask) => {
            // avoid duplicates
            setGroupExtra(prev =>
              prev.find(x => x.task_id === addedTask.task_id)
                ? prev
                : [...prev, { ...addedTask, task_id: `group-added-${addedTask.task_id}` }]
            )
            toast(t('studio.toast.addedToGroup'), 'success')
          }}
          onUseAsRef={(url) => {
            const name = url.split('/').pop() || 'ref.png'
            fetch(url).then(r => r.blob()).then(blob => {
              const isVideoFile = name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.mov')
              const file = new File([blob], name, { type: blob.type || (isVideoFile ? 'video/mp4' : 'image/png') })

              if (!isVideoFile) {
                // Image ref → always switch to image tab + omni_reference (image-to-image)
                setTab('image')
                const s = typeof window !== 'undefined' ? loadSettings() : {}
                const m = (s.defaultImageModel as string) || IMAGE_MODELS[0].value
                setModel(m)
                const opts = getModelOptions(m, 'image')
                setRes(opts.resolutions[0])
                setRatio(opts.ratios.find(r => r !== 'auto') || opts.ratios[0])
                setImageRefMode('omni_reference')
                setRefs([file])
              } else {
                // Video ref → switch to video tab + omni_reference
                setTab('video')
                const s = typeof window !== 'undefined' ? loadSettings() : {}
                const m = (s.defaultVideoModel as string) || VIDEO_MODELS[0].value
                setModel(m)
                setSeedanceMode('omni_reference')
                const maxRefs = REF_LIMITS[m]?.max ?? 12
                setRefs(p => [...p, file].slice(0, maxRefs))
              }
            })
          }}
          onReusePrompt={(p) => {
            setPrompt(p)
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'
                textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
              }
            }, 0)
          }}
        />
      )}
    </div>
  )
}
