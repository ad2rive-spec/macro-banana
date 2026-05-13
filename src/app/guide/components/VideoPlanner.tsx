'use client'

import { useRef, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  VideoPlanState, PlanAsset, ShotState, MovementId,
  SpeedRamp, ShotMode, VideoStyleId, VideoOutputSettings,
  ShotSizeId, AngleId, LightingId, VisualSetting,
} from '../types'
import { MOVEMENT_TERMS, VIDEO_STYLE_TERMS, SHOT_SIZE_TERMS, ANGLE_TERMS, LIGHTING_TERMS, DOF_MAP } from '../logic'
import { CAMERA_PRESETS, LENS_PRESETS, FOCAL_LENGTHS, DEFAULT_CAMERA, buildCameraPrompt } from '@/lib/cameraPresets'
import { storePlan, buildCombinedPrompt } from '../planTransfer'
import { storeAssetFile } from '../assetDB'
import { useT } from '@/lib/LanguageContext'

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_DURATION = 15

const VIDEO_MODELS = [
  { value: 'doubao-seedance-2-0-260128',      label: 'Seedance 2.0' },
  { value: 'doubao-seedance-2-0-fast-260128', label: 'Seedance 2.0 Fast' },
]

const VIDEO_RATIOS: Record<string, string[]> = {
  'doubao-seedance-2-0-260128':      ['16:9', '9:16', '4:3', '3:4', '1:1', '21:9'],
  'doubao-seedance-2-0-fast-260128': ['16:9', '9:16', '4:3', '3:4', '1:1', '21:9'],
}
const DEFAULT_VIDEO_RATIOS = ['16:9', '9:16', '4:3', '3:4', '1:1']

const VIDEO_RESOLUTIONS: Record<string, string[]> = {
  'doubao-seedance-2-0-260128':      ['480p', '720p', '1080p'],
  'doubao-seedance-2-0-fast-260128': ['480p', '720p'],
}
const DEFAULT_VIDEO_RESOLUTIONS = ['480p', '720p', '1080p']

const DEFAULT_VIDEO_OUTPUT: VideoOutputSettings = {
  model: 'doubao-seedance-2-0-260128',
  ratio: '16:9',
  resolution: '1080p',
}

const DEFAULT_VISUAL_SETTING: VisualSetting = {
  shotSize: null,
  angle: null,
  lighting: [],
  camera: { ...DEFAULT_CAMERA },
  dof: -1,
}

// ── Movement card thumbnail (icon → GIF on hover) ────────────────────────────
function MovementThumb({ m, active }: { m: { id: MovementId; icon: string; gif: string; label: string }; active: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="w-full aspect-square flex items-center justify-center overflow-hidden relative"
      style={{ background: active ? 'rgba(255,215,0,0.06)' : 'var(--color-panel)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!hovered && (
        <iconify-icon icon={m.icon} width="18" height="18"
          style={{ display: 'block', color: active ? 'var(--color-purple)' : 'var(--color-faint)' }} />
      )}
      {hovered && (
        <img key={`${m.icon}-gif`} src={m.gif} alt={m.label}
          className="absolute inset-0 w-full h-full object-cover" />
      )}
    </div>
  )
}

const PLAN_MODES: { id: ShotMode; icon: string }[] = [
  { id: 'text_to_video',    icon: 'lucide:layers' },
  { id: 'omni_reference',   icon: 'lucide:paperclip' },
  { id: 'first_last_frames',icon: 'lucide:arrow-right-left' },
]

const SPEED_RAMPS: { id: SpeedRamp }[] = [
  { id: 'linear' },
  { id: 'slow-mo' },
  { id: 'ramp-up' },
  { id: 'ramp-down' },
  { id: 'ease-in-out' },
]

const MOVEMENTS: { id: MovementId; label: string; icon: string; gif: string }[] = [
  { id: 'static',      label: 'Static',         icon: 'lucide:lock',            gif: '/pic/guide/static-locked-shot.gif' },
  { id: 'handheld',    label: 'Handheld',        icon: 'lucide:hand',            gif: '/pic/guide/handheld-camera-shot.gif' },
  { id: 'zoom-out',    label: 'Zoom Out',        icon: 'lucide:zoom-out',        gif: '/pic/guide/zoom-out.gif' },
  { id: 'zoom-in',     label: 'Zoom In',         icon: 'lucide:zoom-in',         gif: '/pic/guide/zoom-in.gif' },
  { id: 'cam-follows', label: 'Camera follows',  icon: 'lucide:crosshair',       gif: '/pic/guide/camera-follows-subject.gif' },
  { id: 'pan-left',    label: 'Pan left',        icon: 'lucide:arrow-left',      gif: '/pic/guide/pan-left-shot.gif' },
  { id: 'pan-right',   label: 'Pan right',       icon: 'lucide:arrow-right',     gif: '/pic/guide/pan-right-shot.gif' },
  { id: 'tilt-up',     label: 'Tilt up',         icon: 'lucide:arrow-up',        gif: '/pic/guide/camera-tilt-up-shot.gif' },
  { id: 'tilt-down',   label: 'Tilt down',       icon: 'lucide:arrow-down',      gif: '/pic/guide/camera-tilt-down-shot.gif' },
  { id: 'orbit',       label: 'Orbit around',    icon: 'lucide:circle-dot',      gif: '/pic/guide/orbit-around.gif' },
  { id: 'dolly-in',    label: 'Dolly in',        icon: 'lucide:move-diagonal',   gif: '/pic/guide/dolly-in.gif' },
  { id: 'dolly-out',   label: 'Dolly out',       icon: 'lucide:move-diagonal-2', gif: '/pic/guide/dolly-out.gif' },
  { id: 'jib-up',      label: 'Jib up',          icon: 'lucide:trending-up',     gif: '/pic/guide/jib-up.gif' },
  { id: 'jib-down',    label: 'Jib down',        icon: 'lucide:trending-down',   gif: '/pic/guide/jib-down.gif' },
  { id: 'drone',       label: 'Drone shot',      icon: 'lucide:navigation',      gif: '/pic/guide/drone-shot.gif' },
  { id: 'dolly-left',  label: 'Dolly left',      icon: 'lucide:chevrons-left',   gif: '/pic/guide/dolly-left.gif' },
  { id: 'dolly-right', label: 'Dolly right',     icon: 'lucide:chevrons-right',  gif: '/pic/guide/dolly-right.gif' },
]

const STYLE_OPTIONS: { id: VideoStyleId; label: string }[] = [
  { id: 'action',      label: 'Action' },
  { id: 'documentary', label: 'Documentary' },
  { id: 'commercial',  label: 'Commercial' },
  { id: 'music-video', label: 'Music Video' },
  { id: 'short-film',  label: 'Short Film' },
  { id: 'news',        label: 'News / Broadcast' },
  { id: 'vlog',        label: 'Vlog' },
  { id: 'comedy',      label: 'Comedy' },
  { id: 'horror',      label: 'Horror' },
]

// ── Shot preset data ─────────────────────────────────────────────────────────

const SHOT_SIZES: { id: ShotSizeId; label: string; tip: string }[] = [
  { id: 'ecu', label: 'Extreme Close-Up', tip: 'Fills frame with a tiny detail — eyes, hands, texture.' },
  { id: 'cu',  label: 'Close-Up',         tip: 'Face or single object dominates. Emotion-forward.' },
  { id: 'mcu', label: 'Medium Close-Up',  tip: 'Head and upper chest. Standard interview or dialogue.' },
  { id: 'ms',  label: 'Medium Shot',      tip: 'Waist up. Balances character and environment.' },
  { id: 'mfs', label: 'Medium Full Shot', tip: 'Knees up. Shows body language and stance.' },
  { id: 'fs',  label: 'Full Shot',        tip: 'Head to toe. Full body visible in context.' },
  { id: 'ws',  label: 'Wide Shot',        tip: 'Subject small in frame. Environment is the story.' },
  { id: 'els', label: 'Extreme Long Shot', tip: 'Vast landscape. Subject barely visible, epic scale.' },
]

const ANGLES: { id: AngleId; label: string; tip: string }[] = [
  { id: 'eye-level',  label: 'Eye Level',          tip: 'Neutral and natural. Most relatable perspective.' },
  { id: 'low-angle',  label: 'Low Angle',           tip: 'Camera looks up. Makes subject feel powerful.' },
  { id: 'high-angle', label: 'High Angle',          tip: 'Camera looks down. Subject feels small or vulnerable.' },
  { id: 'birds-eye',  label: "Bird's Eye",          tip: 'Directly overhead. Abstract, godlike perspective.' },
  { id: 'worms-eye',  label: "Worm's Eye",          tip: 'Extreme low angle from the ground. Dramatic and imposing.' },
  { id: 'dutch-tilt', label: 'Dutch Tilt',          tip: 'Camera canted at an angle. Creates unease or tension.' },
  { id: 'ots',        label: 'Over-the-Shoulder',   tip: 'Camera behind one character looking at another. Conversation depth.' },
]

const LIGHTINGS: { id: LightingId; label: string; tip: string }[] = [
  { id: 'golden-hour',  label: 'Golden Hour',       tip: 'Warm orange-gold tones just after sunrise or before sunset.' },
  { id: 'blue-hour',    label: 'Blue Hour',         tip: 'Cool twilight blues after sunset. Moody and cinematic.' },
  { id: 'overcast',     label: 'Overcast',          tip: 'Soft diffused light, no harsh shadows. Clean and even.' },
  { id: 'hard-studio',  label: 'Hard Studio',       tip: 'Single strong directional light. Sharp shadows, dramatic contrast.' },
  { id: 'soft-studio',  label: 'Soft Studio',       tip: 'Large diffused source. Flattering, commercial look.' },
  { id: 'neon',         label: 'Neon / Cyberpunk',  tip: 'Vivid colored neon lights. Urban night atmosphere.' },
  { id: 'candlelight',  label: 'Candlelight',       tip: 'Warm flickering practical light. Intimate and cinematic.' },
  { id: 'rembrandt',    label: 'Rembrandt',         tip: 'Triangle of light on cheek. Classic portrait lighting.' },
  { id: 'high-key',     label: 'High-Key',          tip: 'Bright, low-contrast. Clean commercial or optimistic feel.' },
  { id: 'low-key',      label: 'Low-Key',           tip: 'Dark, high-contrast with deep shadows. Noir or thriller mood.' },
]

const CAMERA_DESCRIPTIONS: Record<string, string> = {
  'leica-m6':         'Classic 35mm rangefinder. Sharp, contrasty, timeless street look.',
  'hasselblad-500cm': 'Medium format film. Rich tones, fine grain, incredible detail.',
  'rolleiflex-28f':   'Twin-lens reflex. Soft, dreamy square format, waist-level feel.',
  'nikon-f3':         'Workhorse 35mm SLR. Neutral, reliable — the photojournalist camera.',
  'canon-ae1':        'Iconic 35mm SLR. Slightly warm, nostalgic film look.',
  'contax-t2':        'Premium compact 35mm. Razor-sharp Zeiss, slightly clinical.',
  'arri-alexa':       'Professional cinema camera. Natural skin tones, wide dynamic range.',
  'arri-mini-lf':     'Compact large-format ARRI. Filmic, versatile — drama and documentary.',
  'red-v-raptor':     'High-res cinema camera. Ultra-sharp, clinical — sci-fi and commercial.',
  'red-komodo-x':     'Compact RED cinema. High-res, modular — run-and-gun film work.',
  'sony-venice-2':    'Full-frame cinema camera. Exceptional low-light, natural highlight roll-off.',
  'sony-fx3':         'Compact full-frame cinema line. Lightweight — ideal for gimbal and handheld.',
  'sony-fx9':         'Full-frame professional video. Fast AF, cinematic — broadcast and film hybrid.',
  'canon-c300-iii':   'Cinema EOS workhorse. Natural color, reliable — documentary and commercial.',
  'bmpcc-6k':         'Pocket cinema camera. High dynamic range, RAW — indie and low-budget film.',
  'bm-ursa-12k':      'Large sensor studio camera. 12K resolution — high-end feature and VFX work.',
  'gopro-hero13':     'Rugged action camera. Immersive wide-angle — sports and POV footage.',
  'dji-ronin-4d':     'Integrated gimbal cinema camera. Stabilised 4-axis — fluid, floating shots.',
}

const LENS_DESCRIPTIONS: Record<string, string> = {
  'spherical':  'Standard lens. Clean, natural perspective — the default cinematic look.',
  'anamorphic': 'Widescreen cinema. Horizontal flares, oval bokeh, 2.39:1 feel.',
  'vintage':    'Vintage Cooke S4. Warm, slightly soft — used in period films.',
  'macro':      '100mm macro. Extreme close-up, flat perspective, fine detail.',
  'fisheye':    '8mm fisheye. Extreme barrel distortion, 180° ultra-wide.',
  'tilt-shift': 'Tilt-shift. Miniature effect or selective focus planes.',
}

const DOF_LABELS: Record<number, { label: string; tip: string }> = {
  0: { label: 'f/1.2 — Razor Thin',   tip: 'Extreme bokeh. Paper-thin focus plane, dreamy background blur.' },
  1: { label: 'f/1.4 — Very Shallow', tip: 'Subject sharp, background melts away. Portrait or macro.' },
  2: { label: 'f/1.8 — Shallow',      tip: 'Classic portrait depth. Separated subject, smooth bokeh.' },
  3: { label: 'f/2.8 — Moderate',     tip: 'Balanced depth. Good for low light with some separation.' },
  4: { label: 'f/4 — Medium',         tip: 'Sharp subject, slightly soft background. Versatile.' },
  5: { label: 'f/5.6 — Deep',         tip: 'Most of the scene is sharp. Standard for environment shots.' },
  6: { label: 'f/8 — Very Deep',      tip: 'Wide depth of field. Landscape and architectural default.' },
  7: { label: 'f/11 — Extended',      tip: 'Near-total sharpness. Documentary or technical photography.' },
  8: { label: 'f/16 — Full',          tip: 'Everything sharp front to back. Maximum depth of field.' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeId() { return Math.random().toString(36).slice(2, 8) }

function nextAssetTag(assets: PlanAsset[], kind: 'image' | 'video'): string {
  const count = assets.filter(a => a.kind === kind).length
  return kind === 'image' ? `@image${count + 1}` : `@video${count + 1}`
}

export function makeEmptyShot(duration = 5): ShotState {
  return { id: makeId(), duration, mode: 'text_to_video', movement: null, speedRamp: 'linear', shotSize: null, angle: null, lighting: [], camera: { ...DEFAULT_CAMERA }, dof: -1, prompt: '', assetRefs: [] }
}

export function makeEmptyPlan(): VideoPlanState {
  return {
    planMode: 'text_to_video',
    assets: [],
    overallStyle: null,
    overallSetting: { ...DEFAULT_VISUAL_SETTING, lighting: [], camera: { ...DEFAULT_CAMERA } },
    shots: [makeEmptyShot()],
    outputSettings: { ...DEFAULT_VIDEO_OUTPUT },
  }
}

// ── OverallSubSection helper ─────────────────────────────────────────────────

function OverallSubSection({ label, hint, defaultOpen, children }: { label: string; hint?: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer border-none text-left"
        style={{ background: 'transparent' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-faint)' }}>{label}</span>
          {hint && <span className="text-[10px] font-normal normal-case tracking-normal" style={{ color: 'var(--color-faint)' }}>{hint}</span>}
        </div>
        <iconify-icon
          icon={open ? 'lucide:chevron-up' : 'lucide:chevron-down'}
          width="13" height="13"
          style={{ display: 'block', color: 'var(--color-faint)', flexShrink: 0 }}
        />
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  )
}

// ── Asset chip ────────────────────────────────────────────────────────────────

function AssetChip({ asset, onRemove }: { asset: PlanAsset; onRemove: () => void }) {
  return (
    <div className="relative group flex-shrink-0">
      <div className="w-12 h-12 rounded-lg overflow-hidden border"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-raised)' }}>
        {asset.kind === 'image'
          ? <img src={asset.previewUrl} alt={asset.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center">
              <iconify-icon icon="lucide:video" width="20" height="20" style={{ display: 'block', color: 'var(--color-muted)' }} />
            </div>
        }
      </div>
      <span className="absolute -bottom-1 -right-1 text-[9px] font-bold px-1 rounded"
        style={{ background: 'var(--color-purple)', color: '#1a1a1a' }}>
        {asset.tag.replace('@', '')}
      </span>
      <button onClick={onRemove}
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full hidden group-hover:flex items-center justify-center cursor-pointer border-none text-[9px]"
        style={{ background: '#ef4444', color: '#fff' }}>
        x
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface VideoPlannerProps {
  plan: VideoPlanState
  onChange: (plan: VideoPlanState) => void
}

export function VideoPlanner({ plan, onChange }: VideoPlannerProps) {
  const router = useRouter()
  const t = useT()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalDuration = plan.shots.reduce((s, sh) => s + sh.duration, 0)
  const remaining = MAX_DURATION - totalDuration
  const isMultiShot = plan.planMode !== 'first_last_frames'

  // ── Mode switch: reset shots/assets on mode change ────────────────────────

  function switchMode(mode: ShotMode) {
    if (mode === plan.planMode) return
    const newShot = makeEmptyShot()
    onChange({
      planMode: mode,
      assets: [],
      overallStyle: plan.overallStyle,
      overallSetting: plan.overallSetting ?? { ...DEFAULT_VISUAL_SETTING, lighting: [], camera: { ...DEFAULT_CAMERA } },
      shots: [newShot],
      outputSettings: plan.outputSettings ?? { ...DEFAULT_VIDEO_OUTPUT },
    })
  }

  // ── Asset handlers ────────────────────────────────────────────────────────

  const handleAssetFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const fileArray = Array.from(files)

    // Resize image to a thumbnail data URL to keep localStorage small (<100KB per asset)
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

    const readers = fileArray.map(file => {
      const kind = file.type.startsWith('video/') ? 'video' : 'image'
      if (kind === 'video') {
        // Extract first frame as data URL thumbnail so preview persists across navigation
        return new Promise<PlanAsset>(resolve => {
          const objUrl = URL.createObjectURL(file)
          const video = document.createElement('video')
          video.preload = 'metadata'
          video.muted = true
          video.src = objUrl
          video.onloadeddata = () => {
            video.currentTime = 0
          }
          video.onseeked = () => {
            const canvas = document.createElement('canvas')
            canvas.width = 400; canvas.height = Math.round(400 * video.videoHeight / (video.videoWidth || 1))
            canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
            const thumb = canvas.toDataURL('image/jpeg', 0.7)
            URL.revokeObjectURL(objUrl)
            resolve({ tag: '', kind, file, previewUrl: thumb, name: file.name })
          }
          video.onerror = () => {
            URL.revokeObjectURL(objUrl)
            resolve({ tag: '', kind, file, previewUrl: '', name: file.name })
          }
        })
      }
      return resizeImage(file).then(dataUrl => ({
        tag: '', kind: kind as 'image', file,
        previewUrl: dataUrl,
        name: file.name,
      } as PlanAsset))
    })

    Promise.all(readers).then(resolved => {
      const accumulated: PlanAsset[] = []
      const withTags = resolved.map(a => {
        const tagged = { ...a, tag: nextAssetTag([...plan.assets, ...accumulated], a.kind) }
        accumulated.push(tagged)
        return tagged
      })
      // Store original Files in IndexedDB for lossless transfer to Studio
      withTags.forEach(a => { if (a.file) storeAssetFile(a.tag, a.file).catch(() => {}) })
      onChange({ ...plan, assets: [...plan.assets, ...withTags] })
    })
  }, [plan, onChange])

  const removeAsset = useCallback((tag: string) => {
    onChange({
      ...plan,
      assets: plan.assets.filter(a => a.tag !== tag),
      shots: plan.shots.map(s => ({ ...s, assetRefs: s.assetRefs.filter(r => r !== tag) })),
    })
  }, [plan, onChange])

  // ── Shot handlers ─────────────────────────────────────────────────────────

  function updateShot(id: string, patch: Partial<ShotState>) {
    onChange({ ...plan, shots: plan.shots.map(s => s.id === id ? { ...s, ...patch } : s) })
  }

  function addShot() {
    if (remaining <= 0) return
    const dur = Math.min(5, remaining)
    onChange({ ...plan, shots: [...plan.shots, makeEmptyShot(dur)] })
  }

  function removeShot(id: string) {
    if (plan.shots.length <= 1) return
    onChange({ ...plan, shots: plan.shots.filter(s => s.id !== id) })
  }

  function moveShot(id: string, dir: -1 | 1) {
    const idx = plan.shots.findIndex(s => s.id === id)
    if (idx < 0) return
    const next = [...plan.shots]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    onChange({ ...plan, shots: next })
  }

  // ── Send to Studio ────────────────────────────────────────────────────────

  function sendToStudio() {
    storePlan(plan)
    router.push(`/studio?tab=video&mode=${plan.planMode}&plan=1`)
  }

  const isEmpty = plan.shots.every(s => !s.prompt.trim()) && plan.assets.length === 0

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 lg:px-10 py-6 flex flex-col gap-8 max-w-4xl mx-auto w-full">

          {/* ── STEP 1: Mode selection ── */}
          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'var(--color-faint)' }}>
              {t('vp.section.generationMode')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PLAN_MODES.map(m => {
                const active = plan.planMode === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => switchMode(m.id)}
                    className="flex flex-col gap-2 p-4 rounded-xl border text-left transition-all cursor-pointer"
                    style={{
                      background: active ? 'var(--color-purple-subtle)' : 'var(--color-panel)',
                      borderColor: active ? 'rgba(255,215,0,0.5)' : 'var(--color-border)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <iconify-icon icon={m.icon} width="16" height="16"
                        style={{ display: 'block', color: active ? 'var(--color-purple)' : 'var(--color-muted)' }} />
                      <span className="text-[13px] font-semibold"
                        style={{ color: active ? 'var(--color-purple)' : 'var(--color-text)' }}>
                        {t(`video.planMode.${m.id}.label`)}
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug" style={{ color: 'var(--color-muted)' }}>{t(`video.planMode.${m.id}.desc`)}</p>
                  </button>
                )
              })}
            </div>
          </section>

          {/* ── STEP 2: Overall Setting ── */}
          {(() => {
            const os = plan.overallSetting ?? { ...DEFAULT_VISUAL_SETTING, lighting: [], camera: { ...DEFAULT_CAMERA } }
            const setOs = (patch: Partial<VisualSetting>) =>
              onChange({ ...plan, overallSetting: { ...os, ...patch } })
            const hasOverall = !!(plan.overallStyle || os.shotSize || os.angle || os.lighting.length ||
              os.camera.camera !== 'none' || os.camera.lens !== 'none' || os.camera.focalLength || os.dof !== -1)
            const osLens = LENS_PRESETS.find(l => l.id === os.camera.lens)
            const osLocked = osLens?.fixedFocalLength === true

            return (
            <section>
              <h2 className="text-[13px] font-semibold uppercase tracking-widest mb-3 flex items-center gap-2"
                style={{ color: 'var(--color-faint)' }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: hasOverall ? 'var(--color-purple)' : 'var(--color-faint)' }} />
{t('video.section.setting')}
                <span className="text-[10px] font-normal normal-case tracking-normal ml-1" style={{ color: 'var(--color-faint)' }}>
                  {t('vp.overallSetting.hint')}
                </span>
              </h2>
              <div className="rounded-xl border flex flex-col gap-0 overflow-hidden" style={{ borderColor: 'var(--color-border)', background: 'var(--color-panel)' }}>

                {/* Style */}
                <OverallSubSection label={t('vp.section.style')} defaultOpen>
                  <div className="flex flex-wrap gap-1.5">
                    {STYLE_OPTIONS.map(s => {
                      const active = plan.overallStyle === s.id
                      return (
                        <button key={s.id}
                          onClick={() => onChange({ ...plan, overallStyle: active ? null : s.id })}
                          className="text-[12px] font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer"
                          style={{
                            background: active ? 'var(--color-purple-subtle)' : 'var(--color-raised)',
                            borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                            color: active ? 'var(--color-purple)' : 'var(--color-muted)',
                          }}>
                          {t(`videoStyle.${s.id}.label`)}
                        </button>
                      )
                    })}
                  </div>
                </OverallSubSection>

                {/* Framing */}
                <OverallSubSection label={t('vp.section.framing')}>
                  <div className="flex flex-wrap gap-1.5">
                    {SHOT_SIZES.map(s => {
                      const active = os.shotSize === s.id
                      return (
                        <button key={s.id} title={t(`vp.shotSize.${s.id}.tip`)}
                          onClick={() => setOs({ shotSize: active ? null : s.id })}
                          className="px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer"
                          style={{
                            background: active ? 'var(--color-purple-subtle)' : 'var(--color-raised)',
                            borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                            color: active ? 'var(--color-purple)' : 'var(--color-muted)',
                          }}>{t(`vp.shotSize.${s.id}.label`)}</button>
                      )
                    })}
                  </div>
                </OverallSubSection>

                {/* Angle */}
                <OverallSubSection label={t('vp.section.angle')}>
                  <div className="flex flex-wrap gap-1.5">
                    {ANGLES.map(a => {
                      const active = os.angle === a.id
                      return (
                        <button key={a.id} title={t(`vp.angle.${a.id}.tip`)}
                          onClick={() => setOs({ angle: active ? null : a.id })}
                          className="px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer"
                          style={{
                            background: active ? 'var(--color-purple-subtle)' : 'var(--color-raised)',
                            borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                            color: active ? 'var(--color-purple)' : 'var(--color-muted)',
                          }}>{t(`vp.angle.${a.id}.label`)}</button>
                      )
                    })}
                  </div>
                </OverallSubSection>


                {/* Camera Body */}
                <OverallSubSection label={t('vp.section.cameraBody')}>
                  <div className="flex flex-wrap gap-1.5">
                    {CAMERA_PRESETS.filter(c => ['arri-alexa','arri-mini-lf','red-v-raptor','red-komodo-x','sony-venice-2','sony-fx3','sony-fx9','canon-c300-iii','bmpcc-6k','bm-ursa-12k','gopro-hero13','dji-ronin-4d'].includes(c.id)).map(cam => {
                      const active = os.camera.camera === cam.id
                      return (
                        <div key={cam.id} className="relative group/cam">
                          <button
                            onClick={() => setOs({ camera: { ...os.camera, camera: active ? 'none' : cam.id } })}
                            className="flex flex-col items-start px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer"
                            style={{
                              background: active ? 'var(--color-purple-subtle)' : 'var(--color-raised)',
                              borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                              color: active ? 'var(--color-purple)' : 'var(--color-muted)',
                            }}>
                            <span>{cam.label}</span>
                            {cam.sub && <span className="text-[9px] font-bold uppercase tracking-wide mt-0.5 opacity-50">{cam.sub}</span>}
                          </button>
                          {CAMERA_DESCRIPTIONS[cam.id] && (
                            <div className="absolute bottom-[calc(100%+6px)] left-0 z-50 pointer-events-none opacity-0 group-hover/cam:opacity-100 transition-opacity duration-150 w-max max-w-[200px] bg-[#1c1c26] border border-white/10 rounded-xl px-3 py-2 shadow-lg">
                              <p className="text-[11px] leading-snug" style={{ color: 'var(--color-muted)' }}>{CAMERA_DESCRIPTIONS[cam.id]}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </OverallSubSection>

                {/* Lens Type */}
                <OverallSubSection label={t('vp.section.lensType')}>
                  <div className="flex flex-wrap gap-1.5">
                    {LENS_PRESETS.filter(l => l.id !== 'none').map(lens => {
                      const active = os.camera.lens === lens.id
                      return (
                        <button key={lens.id} title={LENS_DESCRIPTIONS[lens.id]}
                          onClick={() => {
                            const newId = active ? 'none' : lens.id
                            const newLens = LENS_PRESETS.find(l => l.id === newId)
                            const focalLength = newLens?.fixedFocalLength ? null : os.camera.focalLength
                            setOs({ camera: { ...os.camera, lens: newId, focalLength } })
                          }}
                          className="flex flex-col items-start px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer"
                          style={{
                            background: active ? 'var(--color-purple-subtle)' : 'var(--color-raised)',
                            borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                            color: active ? 'var(--color-purple)' : 'var(--color-muted)',
                          }}>
                          <span>{lens.label}</span>
                          {lens.sub && <span className="text-[9px] font-bold uppercase tracking-wide mt-0.5 opacity-50">{lens.sub}</span>}
                        </button>
                      )
                    })}
                  </div>
                </OverallSubSection>

                {/* Focal Length */}
                <OverallSubSection label={t('vp.section.focalLength')} hint={osLocked ? t('vp.section.focalLocked') : undefined}>
                  <div className="flex flex-wrap gap-1.5">
                    {(FOCAL_LENGTHS.filter((fl): fl is number => fl !== null)).map(fl => {
                      const active = !osLocked && os.camera.focalLength === fl
                      return (
                        <button key={fl} disabled={osLocked}
                          onClick={() => { if (!osLocked) setOs({ camera: { ...os.camera, focalLength: os.camera.focalLength === fl ? null : fl } }) }}
                          className="px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all"
                          style={{
                            background: active ? 'var(--color-purple-subtle)' : 'var(--color-raised)',
                            borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                            color: active ? 'var(--color-purple)' : 'var(--color-muted)',
                            opacity: osLocked ? 0.3 : 1,
                            cursor: osLocked ? 'not-allowed' : 'pointer',
                          }}>{fl}mm</button>
                      )
                    })}
                  </div>

                {/* Lighting */}
                <OverallSubSection label={t('vp.section.lighting')} hint={t('vp.lighting.max2')}>
                  <div className="flex flex-wrap gap-1.5">
                    {LIGHTINGS.map(l => {
                      const active = os.lighting.includes(l.id)
                      return (
                        <button key={l.id} title={t(`vp.lighting.${l.id}.tip`)}
                          onClick={() => {
                            if (active) setOs({ lighting: os.lighting.filter(x => x !== l.id) })
                            else if (os.lighting.length < 2) setOs({ lighting: [...os.lighting, l.id] })
                            else setOs({ lighting: [os.lighting[1], l.id] })
                          }}
                          className="px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer"
                          style={{
                            background: active ? 'var(--color-purple-subtle)' : 'var(--color-raised)',
                            borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                            color: active ? 'var(--color-purple)' : 'var(--color-muted)',
                          }}>{t(`vp.lighting.${l.id}.label`)}</button>
                      )
                    })}
                  </div>
                </OverallSubSection>
                </OverallSubSection>

                {/* Depth of Field */}
                <OverallSubSection label={t('vp.section.dof')} hint={os.camera.aperture ? t('vp.dof.apertureOverride') : undefined}>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(DOF_LABELS).map(([val, info]) => {
                      const n = Number(val)
                      const active = os.dof === n
                      return (
                        <button key={n} title={info.tip} disabled={!!os.camera.aperture}
                          onClick={() => setOs({ dof: active ? -1 : n })}
                          className="px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all"
                          style={{
                            background: active ? 'var(--color-purple-subtle)' : 'var(--color-raised)',
                            borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                            color: active ? 'var(--color-purple)' : 'var(--color-muted)',
                            opacity: os.camera.aperture ? 0.3 : 1,
                            cursor: os.camera.aperture ? 'not-allowed' : 'pointer',
                          }}>{info.label}</button>
                      )
                    })}
                  </div>
                </OverallSubSection>

              </div>
            </section>
            )
          })()}

          {/* ── STEP 3: Assets (omni / first_last only) ── */}
          {plan.planMode !== 'text_to_video' && (
            <section>
              <h2 className="text-[13px] font-semibold uppercase tracking-widest mb-3 flex items-center gap-2"
                style={{ color: 'var(--color-faint)' }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: plan.assets.length > 0 ? 'var(--color-purple)' : 'var(--color-faint)' }} />
                {plan.planMode === 'first_last_frames' ? t('video.planMode.first_last_frames.label') : t('video.assets')}
                {plan.planMode === 'omni_reference' && (
                  <span className="text-[10px] font-normal normal-case tracking-normal" style={{ color: 'var(--color-muted)' }}>
                    {t('vp.assets.refHint')}
                  </span>
                )}
              </h2>
              <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-panel)' }}>
                <div className="flex items-center gap-3 flex-wrap">
                  {plan.assets.map(asset => (
                    <AssetChip key={asset.tag} asset={asset} onRemove={() => removeAsset(asset.tag)} />
                  ))}
                  {/* For first_last_frames: max 2 images */}
                  {(plan.planMode === 'omni_reference' || plan.assets.length < 2) && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-12 h-12 rounded-lg border border-dashed flex items-center justify-center cursor-pointer transition-all"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                      onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--color-purple)')}
                      onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                    >
                      <iconify-icon icon="lucide:plus" width="20" height="20" style={{ display: 'block' }} />
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={plan.planMode === 'first_last_frames' ? 'image/*' : 'image/*,video/*'}
                    multiple={plan.planMode === 'omni_reference'}
                    className="hidden"
                    onChange={e => handleAssetFiles(e.target.files)}
                  />
                  {plan.assets.length === 0 && (
                    <p className="text-[12px]" style={{ color: 'var(--color-faint)' }}>
                      {plan.planMode === 'first_last_frames'
                        ? t('vp.assets.uploadFirstLast')
                        : t('vp.assets.uploadOmni')}
                    </p>
                  )}
                </div>

                {/* First/Last labels */}
                {plan.planMode === 'first_last_frames' && plan.assets.length > 0 && (
                  <div className="flex gap-3 mt-3">
                    {plan.assets.slice(0, 2).map((a, i) => (
                      <div key={a.tag} className="flex-1 text-center">
                        <p className="text-[10px] font-semibold mb-1"
                          style={{ color: i === 0 ? '#34d399' : '#f472b6' }}>
                          {i === 0 ? t('vp.firstFrame') : t('vp.lastFrame')}
                        </p>
                        <img src={a.previewUrl} alt="" className="w-full h-20 object-cover rounded-lg" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── STEP 4: Shot(s) ── */}
          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: 'var(--color-faint)' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-purple)' }} />
              {plan.planMode === 'first_last_frames' ? t('vp.section.transition') : t('vp.section.shots')}
              {isMultiShot && (
                <span className="ml-auto text-[11px] font-normal normal-case tracking-normal"
                  style={{ color: remaining <= 0 ? '#ef4444' : 'var(--color-muted)' }}>
                  {totalDuration}s / {MAX_DURATION}s
                  {remaining > 0 ? ` ${t('vp.remaining').replace('{remaining}', String(remaining))}` : ` ${t('vp.limitReached')}`}
                </span>
              )}
            </h2>

            <div className="flex flex-col gap-4">
              {plan.planMode === 'first_last_frames'
                ? (
                  // First/Last: single transition card
                  <FirstLastCard
                    shot={plan.shots[0]}
                    assets={plan.assets}
                    onUpdate={patch => updateShot(plan.shots[0].id, patch)}
                  />
                ) : (
                  <>
                    {plan.shots.map((shot, idx) => (
                      <MultiShotCard
                        key={shot.id}
                        shot={shot}
                        index={idx}
                        total={plan.shots.length}
                        assets={plan.assets}
                        planMode={plan.planMode}
                        remaining={remaining}
                        onUpdate={patch => updateShot(shot.id, patch)}
                        onRemove={() => removeShot(shot.id)}
                        onMove={dir => moveShot(shot.id, dir)}
                      />
                    ))}
                    <button
                      onClick={addShot}
                      disabled={remaining <= 0}
                      className="w-full py-3 rounded-xl border border-dashed text-[13px] font-medium transition-all cursor-pointer"
                      style={{
                        borderColor: 'var(--color-border)',
                        color: remaining > 0 ? 'var(--color-muted)' : 'var(--color-faint)',
                        opacity: remaining > 0 ? 1 : 0.4,
                      }}>
                      + {t('video.addShot')} {remaining <= 0 ? '(15s limit reached)' : ''}
                    </button>
                  </>
                )
              }
            </div>
          </section>

          {/* ── Output Settings ── */}
          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: 'var(--color-faint)' }}>
              <span className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: 'var(--color-purple)' }} />
{t('video.output')}
            </h2>
            <div className="rounded-xl border p-4 flex flex-col gap-4"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-panel)' }}>

              {/* Model */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-faint)' }}>{t('vp.output.model')}</p>
                <div className="flex flex-wrap gap-2">
                  {VIDEO_MODELS.map(m => {
                    const active = (plan.outputSettings?.model ?? DEFAULT_VIDEO_OUTPUT.model) === m.value
                    return (
                      <button key={m.value}
                        onClick={() => {
                          const ratios = VIDEO_RATIOS[m.value] ?? DEFAULT_VIDEO_RATIOS
                          const resolutions = VIDEO_RESOLUTIONS[m.value] ?? DEFAULT_VIDEO_RESOLUTIONS
                          const cur = plan.outputSettings ?? DEFAULT_VIDEO_OUTPUT
                          const ratio = ratios.includes(cur.ratio) ? cur.ratio : ratios[0]
                          const resolution = resolutions.includes(cur.resolution) ? cur.resolution : resolutions[resolutions.length - 1]
                          onChange({ ...plan, outputSettings: { model: m.value, ratio, resolution } })
                        }}
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

              {/* Ratio + Resolution */}
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-faint)' }}>{t('vp.output.ratio')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(VIDEO_RATIOS[plan.outputSettings?.model ?? DEFAULT_VIDEO_OUTPUT.model] ?? DEFAULT_VIDEO_RATIOS).map(r => {
                      const active = (plan.outputSettings?.ratio ?? DEFAULT_VIDEO_OUTPUT.ratio) === r
                      return (
                        <button key={r}
                          onClick={() => onChange({ ...plan, outputSettings: { ...(plan.outputSettings ?? DEFAULT_VIDEO_OUTPUT), ratio: r } })}
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
                  <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-faint)' }}>{t('vp.output.resolution')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(VIDEO_RESOLUTIONS[plan.outputSettings?.model ?? DEFAULT_VIDEO_OUTPUT.model] ?? DEFAULT_VIDEO_RESOLUTIONS).map(r => {
                      const active = (plan.outputSettings?.resolution ?? DEFAULT_VIDEO_OUTPUT.resolution) === r
                      return (
                        <button key={r}
                          onClick={() => onChange({ ...plan, outputSettings: { ...(plan.outputSettings ?? DEFAULT_VIDEO_OUTPUT), resolution: r } })}
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
              </div>

            </div>
          </section>

        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex-shrink-0 border-t"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <div className="px-4 sm:px-6 lg:px-10 py-3 max-w-4xl mx-auto flex flex-col gap-2">

          {/* ── Prompt preview chips ── */}
          {(() => {
            const combined = buildCombinedPrompt(plan)
            if (!combined) {
              return (
                <p className="text-[12px] italic pb-1" style={{ color: 'var(--color-faint)' }}>
                  {t('vp.preview.empty')}
                </p>
              )
            }

            // Build token chips per segment
            const os = plan.overallSetting
            const tokens: { key: string; text: string; color: string }[] = []

            if (plan.overallStyle) tokens.push({ key: 'style', text: VIDEO_STYLE_TERMS[plan.overallStyle], color: '#a78bfa' })
            if (os.shotSize)       tokens.push({ key: 'os-framing', text: SHOT_SIZE_TERMS[os.shotSize], color: '#FFD700' })
            if (os.angle)          tokens.push({ key: 'os-angle', text: ANGLE_TERMS[os.angle], color: '#38bdf8' })
            if (os.camera.camera !== 'none') tokens.push({ key: 'os-cam', text: CAMERA_PRESETS.find(c => c.id === os.camera.camera)?.label ?? os.camera.camera, color: '#818cf8' })
            if (os.camera.lens !== 'none')   tokens.push({ key: 'os-lens', text: LENS_PRESETS.find(l => l.id === os.camera.lens)?.label ?? os.camera.lens, color: '#818cf8' })
            if (os.camera.focalLength)       tokens.push({ key: 'os-fl', text: `${os.camera.focalLength}mm`, color: '#818cf8' })
            if (os.lighting.length > 0)      tokens.push({ key: 'os-light', text: os.lighting.map(id => LIGHTING_TERMS[id]).join(', '), color: '#fb923c' })
            if (os.dof !== -1 && !os.camera.aperture) tokens.push({ key: 'os-dof', text: DOF_MAP[os.dof] ?? '', color: '#f472b6' })

            if (plan.planMode === 'first_last_frames') {
              const shot = plan.shots[0]
              tokens.push({ key: 'dur', text: `${shot.duration}s`, color: '#94a3b8' })
              if (shot.movement) tokens.push({ key: 'move', text: MOVEMENT_TERMS[shot.movement], color: '#facc15' })
              if (shot.prompt.trim()) tokens.push({ key: 'prompt', text: shot.prompt.trim(), color: '#f0f0f5' })
            } else {
              plan.shots.forEach((shot, i) => {
                tokens.push({ key: `shot-${i}-meta`, text: `Shot ${i + 1} · ${shot.duration}s`, color: '#94a3b8' })
                if (shot.movement)             tokens.push({ key: `shot-${i}-move`, text: MOVEMENT_TERMS[shot.movement], color: '#facc15' })
                if (shot.shotSize)             tokens.push({ key: `shot-${i}-framing`, text: SHOT_SIZE_TERMS[shot.shotSize], color: '#FFD700' })
                if (shot.angle)                tokens.push({ key: `shot-${i}-angle`, text: ANGLE_TERMS[shot.angle], color: '#38bdf8' })
                if (shot.camera.camera !== 'none') tokens.push({ key: `shot-${i}-cam`, text: CAMERA_PRESETS.find(c => c.id === shot.camera.camera)?.label ?? shot.camera.camera, color: '#818cf8' })
                if (shot.camera.lens !== 'none')   tokens.push({ key: `shot-${i}-lens`, text: LENS_PRESETS.find(l => l.id === shot.camera.lens)?.label ?? shot.camera.lens, color: '#818cf8' })
                if (shot.camera.focalLength)       tokens.push({ key: `shot-${i}-fl`, text: `${shot.camera.focalLength}mm`, color: '#818cf8' })
                if (shot.lighting.length > 0)      tokens.push({ key: `shot-${i}-light`, text: shot.lighting.map(id => LIGHTING_TERMS[id]).join(', '), color: '#fb923c' })
                if (shot.dof !== -1 && !shot.camera.aperture) tokens.push({ key: `shot-${i}-dof`, text: DOF_MAP[shot.dof] ?? '', color: '#f472b6' })
                if (shot.prompt.trim())            tokens.push({ key: `shot-${i}-prompt`, text: shot.prompt.trim(), color: '#f0f0f5' })
              })
            }

            return (
              <div className="flex flex-row flex-wrap gap-1.5 pb-1">
                {tokens.filter(t => t.text).map(token => (
                  <span key={token.key}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-md leading-snug whitespace-nowrap"
                    style={{
                      color: token.color,
                      backgroundColor: `${token.color}15`,
                      border: `1px solid ${token.color}28`,
                    }}>
                    {token.text}
                  </span>
                ))}
              </div>
            )
          })()}

          {/* ── Action row ── */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t"
            style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-[12px]" style={{ color: 'var(--color-faint)' }}>
              {plan.planMode === 'first_last_frames'
                ? `First / Last · ${plan.assets.length}/2 frames`
                : `${plan.shots.length} shot${plan.shots.length !== 1 ? 's' : ''} · ${totalDuration}s`}
            </div>
            <button
              onClick={sendToStudio}
              disabled={isEmpty}
              className="px-5 py-2 rounded-lg text-[13px] font-semibold transition-all border-none flex-shrink-0"
              style={{
                background: isEmpty ? 'var(--color-raised)' : 'var(--color-purple)',
                color: isEmpty ? 'var(--color-faint)' : '#1a1a1a',
                cursor: isEmpty ? 'not-allowed' : 'pointer',
                opacity: isEmpty ? 0.5 : 1,
              }}>
{t('video.sendToStudio')} →
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── First/Last transition card ────────────────────────────────────────────────

interface FirstLastCardProps {
  shot: ShotState
  assets: PlanAsset[]
  onUpdate: (patch: Partial<ShotState>) => void
}

function FirstLastCard({ shot, assets, onUpdate }: FirstLastCardProps) {
  const t = useT()
  const first = assets[0]
  const last  = assets[1]

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-panel)' }}>

      {/* Frames preview if uploaded */}
      {(first || last) && (
        <div className="flex gap-0 border-b" style={{ borderColor: 'var(--color-border)' }}>
          {/* First frame */}
          <div className="flex-1 relative">
            {first
              ? <img src={first.previewUrl} alt="First frame" className="w-full h-24 object-cover" />
              : <div className="w-full h-24 flex items-center justify-center text-[11px]"
                  style={{ background: 'var(--color-raised)', color: 'var(--color-faint)' }}>
                  No first frame
                </div>
            }
            <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded"
              style={{ background: 'rgba(0,0,0,0.6)', color: '#34d399' }}>First</span>
          </div>
          {/* Arrow */}
          <div className="flex items-center px-3 flex-shrink-0" style={{ background: 'var(--color-raised)' }}>
            <iconify-icon icon="lucide:arrow-right" width="16" height="16"
              style={{ display: 'block', color: 'var(--color-purple)' }} />
          </div>
          {/* Last frame */}
          <div className="flex-1 relative">
            {last
              ? <img src={last.previewUrl} alt="Last frame" className="w-full h-24 object-cover" />
              : <div className="w-full h-24 flex items-center justify-center text-[11px]"
                  style={{ background: 'var(--color-raised)', color: 'var(--color-faint)' }}>
                  No last frame
                </div>
            }
            <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded"
              style={{ background: 'rgba(0,0,0,0.6)', color: '#f472b6' }}>Last</span>
          </div>
        </div>
      )}

      <div className="p-4 flex flex-col gap-4">

        {/* Duration */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-faint)' }}>
              Duration
            </p>
            <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--color-purple)' }}>
              {shot.duration}s
            </span>
          </div>
          <input
            type="range"
            min={3}
            max={15}
            value={shot.duration}
            onChange={e => onUpdate({ duration: Number(e.target.value) })}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              accentColor: 'var(--color-purple)',
              background: `linear-gradient(to right, var(--color-purple) ${((shot.duration - 3) / (15 - 3)) * 100}%, var(--color-raised) ${((shot.duration - 3) / (15 - 3)) * 100}%)`,
            }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px]" style={{ color: 'var(--color-faint)' }}>3s</span>
            <span className="text-[10px]" style={{ color: 'var(--color-faint)' }}>15s</span>
          </div>
        </div>

        {/* Movement */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-faint)' }}>
{t('video.section.cameraMovement')}
          </p>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
            {MOVEMENTS.map(m => {
              const active = shot.movement === m.id
              return (
                <button key={m.id}
                  onClick={() => onUpdate({ movement: active ? null : m.id })}
                  className="flex flex-col rounded-xl border overflow-hidden transition-all cursor-pointer text-left"
                  style={{
                    background: active ? 'var(--color-purple-subtle)' : 'var(--color-raised)',
                    borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                  }}>
                  {/* Thumbnail: icon by default, GIF on hover */}
                  <MovementThumb m={m} active={active} />
                  {/* Label */}
                  <div className="px-1.5 py-1">
                    <span className="text-[10px] font-medium leading-tight block text-center"
                      style={{ color: active ? 'var(--color-purple)' : 'var(--color-muted)' }}>
                      {t(`movement.${m.id}.label`)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Speed Ramp */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-faint)' }}>
{t('video.section.speedRamp')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SPEED_RAMPS.map(r => {
              const active = shot.speedRamp === r.id
              return (
                <button key={r.id}
                  onClick={() => onUpdate({ speedRamp: r.id })}
                  className="px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer"
                  style={{
                    background: active ? 'var(--color-purple-subtle)' : 'var(--color-raised)',
                    borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                    color: active ? 'var(--color-purple)' : 'var(--color-muted)',
                  }}>
                  {t(`video.speedRamp.${r.id}`)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Transition prompt */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-faint)' }}>
            {t('vp.transition.between')}
          </p>
          <div className="rounded-lg border p-3 transition-colors focus-within:border-[var(--color-purple)]"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-raised)' }}>
            <textarea
              value={shot.prompt}
              onChange={e => onUpdate({ prompt: e.target.value })}
              placeholder={t('vp.transition.placeholder')}
              rows={4}
              className="w-full resize-none bg-transparent text-[13px] placeholder:text-[var(--color-faint)] outline-none leading-relaxed"
              style={{ color: 'var(--color-text)' }}
            />
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Shot Visual Settings (collapsible) ──────────────────────────────────────

interface ShotVisualSettingsProps {
  shot: ShotState
  onUpdate: (patch: Partial<ShotState>) => void
}

function ShotSubSection({ label, hint, active, children }: { label: string; hint?: string; active?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 cursor-pointer border-none text-left"
        style={{ background: 'transparent' }}
      >
        <div className="flex items-center gap-2">
          {active && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--color-purple)' }} />}
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: active ? 'var(--color-purple)' : 'var(--color-faint)' }}>{label}</span>
          {hint && <span className="text-[10px] font-normal normal-case tracking-normal" style={{ color: 'var(--color-faint)' }}>{hint}</span>}
        </div>
        <iconify-icon
          icon={open ? 'lucide:chevron-up' : 'lucide:chevron-down'}
          width="12" height="12"
          style={{ display: 'block', color: 'var(--color-faint)', flexShrink: 0 }}
        />
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

function ShotVisualSettings({ shot, onUpdate }: ShotVisualSettingsProps) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const hasAny = !!(shot.shotSize || shot.angle || shot.lighting.length ||
    shot.camera.camera !== 'none' || shot.camera.lens !== 'none' ||
    shot.camera.focalLength || shot.dof !== -1)
  const selectedLens = LENS_PRESETS.find(l => l.id === shot.camera.lens)
  const focalLocked = selectedLens?.fixedFocalLength === true

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: hasAny ? 'rgba(255,215,0,0.3)' : 'var(--color-border)', background: 'var(--color-raised)' }}>
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 cursor-pointer border-none text-left"
        style={{ background: 'transparent' }}
      >
        <div className="flex items-center gap-2">
          <iconify-icon icon="lucide:sliders-horizontal" width="13" height="13"
            style={{ display: 'block', color: hasAny ? 'var(--color-purple)' : 'var(--color-faint)' }} />
          <span className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: hasAny ? 'var(--color-purple)' : 'var(--color-faint)' }}>
{t('vp.section.shotVisuals')}
          </span>
          {hasAny && (
            <span className="text-[10px] font-normal normal-case tracking-normal" style={{ color: 'var(--color-muted)' }}>
              {t('vp.overrides')}
            </span>
          )}
        </div>
        <iconify-icon
          icon={open ? 'lucide:chevron-up' : 'lucide:chevron-down'}
          width="13" height="13"
          style={{ display: 'block', color: 'var(--color-faint)', flexShrink: 0 }}
        />
      </button>

      {open && (
        <div className="border-t" style={{ borderColor: 'var(--color-border)' }}>

          {/* Framing */}
          <ShotSubSection label={t('vp.section.framing')} active={!!shot.shotSize}>
            <div className="flex flex-wrap gap-1.5">
              {SHOT_SIZES.map(s => {
                const active = shot.shotSize === s.id
                return (
                  <button key={s.id} title={t(`vp.shotSize.${s.id}.tip`)}
                    onClick={() => onUpdate({ shotSize: active ? null : s.id })}
                    className="px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer"
                    style={{
                      background: active ? 'var(--color-purple-subtle)' : 'var(--color-panel)',
                      borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                      color: active ? 'var(--color-purple)' : 'var(--color-muted)',
                    }}>{t(`vp.shotSize.${s.id}.label`)}</button>
                )
              })}
            </div>
          </ShotSubSection>

          {/* Angle */}
          <ShotSubSection label={t('vp.section.angle')} active={!!shot.angle}>
            <div className="flex flex-wrap gap-1.5">
              {ANGLES.map(a => {
                const active = shot.angle === a.id
                return (
                  <button key={a.id} title={t(`vp.angle.${a.id}.tip`)}
                    onClick={() => onUpdate({ angle: active ? null : a.id })}
                    className="px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer"
                    style={{
                      background: active ? 'var(--color-purple-subtle)' : 'var(--color-panel)',
                      borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                      color: active ? 'var(--color-purple)' : 'var(--color-muted)',
                    }}>{t(`vp.angle.${a.id}.label`)}</button>
                )
              })}
            </div>
          </ShotSubSection>


          {/* Camera Body */}
          <ShotSubSection label={t('vp.section.cameraBody')} active={shot.camera.camera !== 'none'}>
            <div className="flex flex-wrap gap-1.5">
              {CAMERA_PRESETS.filter(c => ['arri-alexa','arri-mini-lf','red-v-raptor','red-komodo-x','sony-venice-2','sony-fx3','sony-fx9','canon-c300-iii','bmpcc-6k','bm-ursa-12k','gopro-hero13','dji-ronin-4d'].includes(c.id)).map(cam => {
                const active = shot.camera.camera === cam.id
                return (
                  <div key={cam.id} className="relative group/cam">
                    <button
                      onClick={() => onUpdate({ camera: { ...shot.camera, camera: active ? 'none' : cam.id } })}
                      className="flex flex-col items-start px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer"
                      style={{
                        background: active ? 'var(--color-purple-subtle)' : 'var(--color-panel)',
                        borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                        color: active ? 'var(--color-purple)' : 'var(--color-muted)',
                      }}>
                      <span>{cam.label}</span>
                      {cam.sub && <span className="text-[9px] font-bold uppercase tracking-wide mt-0.5 opacity-50">{cam.sub}</span>}
                    </button>
                    {CAMERA_DESCRIPTIONS[cam.id] && (
                      <div className="absolute bottom-[calc(100%+6px)] left-0 z-50 pointer-events-none opacity-0 group-hover/cam:opacity-100 transition-opacity duration-150 w-max max-w-[200px] bg-[#1c1c26] border border-white/10 rounded-xl px-3 py-2 shadow-lg">
                        <p className="text-[11px] leading-snug" style={{ color: 'var(--color-muted)' }}>{CAMERA_DESCRIPTIONS[cam.id]}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ShotSubSection>

          {/* Lens Type */}
          <ShotSubSection label={t('vp.section.lensType')} active={shot.camera.lens !== 'none'}>
            <div className="flex flex-wrap gap-1.5">
              {LENS_PRESETS.filter(l => l.id !== 'none').map(lens => {
                const active = shot.camera.lens === lens.id
                return (
                  <button key={lens.id} title={LENS_DESCRIPTIONS[lens.id]}
                    onClick={() => {
                      const newId = active ? 'none' : lens.id
                      const newLens = LENS_PRESETS.find(l => l.id === newId)
                      const focalLength = newLens?.fixedFocalLength ? null : shot.camera.focalLength
                      onUpdate({ camera: { ...shot.camera, lens: newId, focalLength } })
                    }}
                    className="flex flex-col items-start px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer"
                    style={{
                      background: active ? 'var(--color-purple-subtle)' : 'var(--color-panel)',
                      borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                      color: active ? 'var(--color-purple)' : 'var(--color-muted)',
                    }}>
                    <span>{lens.label}</span>
                    {lens.sub && <span className="text-[9px] font-bold uppercase tracking-wide mt-0.5 opacity-50">{lens.sub}</span>}
                  </button>
                )
              })}
            </div>
          </ShotSubSection>

          {/* Focal Length */}
          <ShotSubSection label={t('vp.section.focalLength')} hint={focalLocked ? t('vp.section.focalLocked') : undefined} active={!!shot.camera.focalLength && !focalLocked}>
            <div className="flex flex-wrap gap-1.5">
              {(FOCAL_LENGTHS.filter((fl): fl is number => fl !== null)).map(fl => {
                const active = !focalLocked && shot.camera.focalLength === fl
                return (
                  <button key={fl} disabled={focalLocked}
                    onClick={() => { if (!focalLocked) onUpdate({ camera: { ...shot.camera, focalLength: shot.camera.focalLength === fl ? null : fl } }) }}
                    className="px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all"
                    style={{
                      background: active ? 'var(--color-purple-subtle)' : 'var(--color-panel)',
                      borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                      color: active ? 'var(--color-purple)' : 'var(--color-muted)',
                      opacity: focalLocked ? 0.3 : 1,
                      cursor: focalLocked ? 'not-allowed' : 'pointer',
                    }}>{fl}mm</button>
                )
              })}
            </div>
          </ShotSubSection>

          {/* Lighting */}
          <ShotSubSection label={t('vp.section.lighting')} hint={t('vp.lighting.max2')} active={shot.lighting.length > 0}>
            <div className="flex flex-wrap gap-1.5">
              {LIGHTINGS.map(l => {
                const active = shot.lighting.includes(l.id)
                return (
                  <button key={l.id} title={t(`vp.lighting.${l.id}.tip`)}
                    onClick={() => {
                      if (active) onUpdate({ lighting: shot.lighting.filter(x => x !== l.id) })
                      else if (shot.lighting.length < 2) onUpdate({ lighting: [...shot.lighting, l.id] })
                      else onUpdate({ lighting: [shot.lighting[1], l.id] })
                    }}
                    className="px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer"
                    style={{
                      background: active ? 'var(--color-purple-subtle)' : 'var(--color-panel)',
                      borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                      color: active ? 'var(--color-purple)' : 'var(--color-muted)',
                    }}>{t(`vp.lighting.${l.id}.label`)}</button>
                )
              })}
            </div>
          </ShotSubSection>

          {/* Depth of Field */}
          <ShotSubSection label={t('vp.section.dof')} hint={shot.camera.aperture ? t('vp.dof.apertureOverride') : undefined} active={shot.dof !== -1}>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(DOF_LABELS).map(([val, info]) => {
                const n = Number(val)
                const active = shot.dof === n
                return (
                  <button key={n} title={info.tip} disabled={!!shot.camera.aperture}
                    onClick={() => onUpdate({ dof: active ? -1 : n })}
                    className="px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all"
                    style={{
                      background: active ? 'var(--color-purple-subtle)' : 'var(--color-panel)',
                      borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                      color: active ? 'var(--color-purple)' : 'var(--color-muted)',
                      opacity: shot.camera.aperture ? 0.3 : 1,
                      cursor: shot.camera.aperture ? 'not-allowed' : 'pointer',
                    }}>{info.label}</button>
                )
              })}
            </div>
          </ShotSubSection>

        </div>
      )}
    </div>
  )
}

// ── Multi-shot card (text_to_video / omni) ────────────────────────────────────

interface MultiShotCardProps {
  shot: ShotState
  index: number
  total: number
  assets: PlanAsset[]
  planMode: ShotMode
  remaining: number
  onUpdate: (patch: Partial<ShotState>) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}

function MultiShotCard({ shot, index, total, assets, planMode, remaining, onUpdate, onRemove, onMove }: MultiShotCardProps) {
  const t = useT()
  const maxDur = Math.min(15, shot.duration + remaining)

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-panel)' }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-raised)' }}>
        <span className="text-[12px] font-bold" style={{ color: 'var(--color-purple)' }}>
          {t('vp.shot.label')} {index + 1}
        </span>

        <div className="flex-1" />

        <button onClick={() => onMove(-1)} disabled={index === 0}
          className="w-6 h-6 rounded flex items-center justify-center cursor-pointer border-none"
          style={{ background: 'transparent', color: index === 0 ? 'var(--color-faint)' : 'var(--color-muted)' }}>
          <iconify-icon icon="lucide:chevron-up" width="14" height="14" style={{ display: 'block' }} />
        </button>
        <button onClick={() => onMove(1)} disabled={index === total - 1}
          className="w-6 h-6 rounded flex items-center justify-center cursor-pointer border-none"
          style={{ background: 'transparent', color: index === total - 1 ? 'var(--color-faint)' : 'var(--color-muted)' }}>
          <iconify-icon icon="lucide:chevron-down" width="14" height="14" style={{ display: 'block' }} />
        </button>
        {total > 1 && (
          <button onClick={onRemove}
            className="w-6 h-6 rounded flex items-center justify-center cursor-pointer border-none ml-1"
            style={{ background: 'transparent', color: 'var(--color-faint)' }}>
            <iconify-icon icon="lucide:x" width="14" height="14" style={{ display: 'block' }} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-4">

        {/* Duration slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-faint)' }}>
              {t('vp.section.duration')}
            </p>
            <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--color-purple)' }}>
              {shot.duration}s
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={maxDur}
            value={shot.duration}
            onChange={e => onUpdate({ duration: Number(e.target.value) })}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              accentColor: 'var(--color-purple)',
              background: `linear-gradient(to right, var(--color-purple) ${((shot.duration - 1) / (maxDur - 1)) * 100}%, var(--color-raised) ${((shot.duration - 1) / (maxDur - 1)) * 100}%)`,
            }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px]" style={{ color: 'var(--color-faint)' }}>1s</span>
            <span className="text-[10px]" style={{ color: 'var(--color-faint)' }}>{maxDur}s</span>
          </div>
        </div>

        {/* ── Shot Visual Settings (collapsible) ── */}
        <ShotVisualSettings shot={shot} onUpdate={onUpdate} />

        {/* Movement */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-faint)' }}>{t('video.section.cameraMovement')}</p>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
            {MOVEMENTS.map(m => {
              const active = shot.movement === m.id
              return (
                <button key={m.id}
                  onClick={() => onUpdate({ movement: active ? null : m.id })}
                  className="flex flex-col rounded-xl border overflow-hidden transition-all cursor-pointer text-left"
                  style={{
                    background: active ? 'var(--color-purple-subtle)' : 'var(--color-raised)',
                    borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                  }}>
                  {/* Thumbnail: icon by default, GIF on hover */}
                  <MovementThumb m={m} active={active} />
                  {/* Label */}
                  <div className="px-1.5 py-1">
                    <span className="text-[10px] font-medium leading-tight block text-center"
                      style={{ color: active ? 'var(--color-purple)' : 'var(--color-muted)' }}>
                      {t(`movement.${m.id}.label`)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Speed Ramp */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-faint)' }}>{t('video.section.speedRamp')}</p>
          <div className="flex flex-wrap gap-1.5">
            {SPEED_RAMPS.map(r => {
              const active = shot.speedRamp === r.id
              return (
                <button key={r.id}
                  onClick={() => onUpdate({ speedRamp: r.id })}
                  className="px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer"
                  style={{
                    background: active ? 'var(--color-purple-subtle)' : 'var(--color-raised)',
                    borderColor: active ? 'rgba(255,215,0,0.4)' : 'var(--color-border)',
                    color: active ? 'var(--color-purple)' : 'var(--color-muted)',
                  }}>
                  {t(`video.speedRamp.${r.id}`)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Prompt */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-faint)' }}>{t('vp.label.prompt')}</p>

          <div className="rounded-lg border p-3 transition-colors focus-within:border-[var(--color-purple)]"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-raised)' }}>
            <textarea
              value={shot.prompt}
              onChange={e => onUpdate({ prompt: e.target.value })}
              placeholder={
                planMode === 'omni_reference'
                  ? t('vp.shot.placeholderOmni')
                  : t('vp.shot.placeholder')
              }
              rows={3}
              className="w-full resize-none bg-transparent text-[13px] placeholder:text-[var(--color-faint)] outline-none leading-relaxed"
              style={{ color: 'var(--color-text)' }}
            />
          </div>

          {planMode === 'omni_reference' && assets.length > 0 && (
            <div>
              <p className="text-[10px] mb-1.5" style={{ color: 'var(--color-muted)' }}>
                {t('vp.clickToInsert')}
              </p>
              <div className="flex gap-2 flex-wrap">
                {assets.map(a => {
                  const inserted = shot.prompt.includes(a.tag)
                  return (
                    <button key={a.tag}
                      onClick={() => {
                        if (!inserted) {
                          onUpdate({
                            prompt: shot.prompt ? `${shot.prompt} ${a.tag}` : a.tag,
                            assetRefs: shot.assetRefs.includes(a.tag) ? shot.assetRefs : [...shot.assetRefs, a.tag],
                          })
                        }
                      }}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all cursor-pointer"
                      style={{
                        background: inserted ? 'var(--color-purple-subtle)' : 'var(--color-raised)',
                        borderColor: inserted ? 'rgba(255,215,0,0.5)' : 'var(--color-border)',
                        opacity: inserted ? 0.6 : 1,
                      }}>
                      {a.previewUrl
                        ? <img src={a.previewUrl} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                        : <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                            style={{ background: 'var(--color-border)' }}>
                            <iconify-icon icon="lucide:video" width="14" height="14"
                              style={{ display: 'block', color: 'var(--color-faint)' }} />
                          </div>
                      }
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold" style={{ color: inserted ? 'var(--color-purple)' : 'var(--color-text)' }}>
                          {a.tag}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--color-faint)' }}>
                          {a.name.length > 16 ? a.name.slice(0, 16) + '…' : a.name}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
