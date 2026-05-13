// Guide Types
// Central type definitions for the Visual Prompt Guide feature.

import type { CameraSettings } from '@/lib/cameraPresets'

export type { CameraSettings }

export type ShotSizeId =
  | 'ecu'
  | 'cu'
  | 'mcu'
  | 'ms'
  | 'mfs'
  | 'fs'
  | 'ws'
  | 'els'

export type AngleId =
  | 'eye-level'
  | 'low-angle'
  | 'high-angle'
  | 'birds-eye'
  | 'worms-eye'
  | 'dutch-tilt'
  | 'ots'

export type LightingId =
  | 'golden-hour'
  | 'blue-hour'
  | 'overcast'
  | 'hard-studio'
  | 'soft-studio'
  | 'neon'
  | 'candlelight'
  | 'rembrandt'
  | 'high-key'
  | 'low-key'

export type LightDirectionId =
  | 'front'
  | 'back'
  | 'side-left'
  | 'side-right'
  | 'top'
  | 'bottom'
  | 'rim'
  | '45-front-left'
  | '45-front-right'

export type StyleId =
  | 'cinematic'
  | 'editorial'
  | 'documentary'
  | 'fine-art'
  | 'commercial'
  | 'street'
  | 'architectural'
  | 'macro'
  | 'vintage'
  | 'minimal'

export type UseCaseId =
  | 'portrait'
  | 'fashion'
  | 'editorial-photo'
  | 'product-mockup'
  | 'social-media'
  | 'poster'
  | 'album-cover'
  | 'concept-art'
  | 'fantasy-scifi'
  | 'anime-manga'
  | 'architecture'
  | 'food'
  | 'ui-screen'
  | 'wallpaper'
  | 'documentary'

export type MovementId =
  | 'static'
  | 'handheld'
  | 'zoom-out'
  | 'zoom-in'
  | 'cam-follows'
  | 'pan-left'
  | 'pan-right'
  | 'tilt-up'
  | 'tilt-down'
  | 'orbit'
  | 'dolly-in'
  | 'dolly-out'
  | 'jib-up'
  | 'jib-down'
  | 'drone'
  | 'dolly-left'
  | 'dolly-right'

export type VideoStyleId =
  | 'action'
  | 'documentary'
  | 'commercial'
  | 'music-video'
  | 'short-film'
  | 'news'
  | 'vlog'
  | 'comedy'
  | 'horror'

export interface GuideState {
  mediaTab: 'image' | 'video'
  subject: string
  shotSize: ShotSizeId | null
  camera: CameraSettings
  angle: AngleId | null
  lighting: LightingId[]
  lightDirection: LightDirectionId | null
  style: StyleId | null
  dof: number
  useCase: UseCaseId | null
  constraints: string[]
  movement: MovementId | null
  action: string
  setting: string
  videoStyle: VideoStyleId | null
}

export interface PromptSegments {
  subject:        string | null
  shotSize:       string | null
  camera:         string | null
  angle:          string | null
  lighting:       string | null
  lightDirection: string | null
  style:          string | null
  dof:            string | null
  useCase:        string | null
  constraints:    string | null
  movement:       string | null
  action:         string | null
  setting:        string | null
  videoStyle:     string | null
  full:           string
}

export interface SectionMeta {
  id: string
  label: string
  hasSelection: (state: GuideState) => boolean
  videoOnly?: boolean
}

// ── Video Shot Planner types ──────────────────────────────────────────────────

export type SpeedRamp =
  | 'linear'
  | 'slow-mo'
  | 'ramp-up'
  | 'ramp-down'
  | 'ease-in-out'

export type ShotMode =
  | 'text_to_video'
  | 'first_last_frames'
  | 'omni_reference'

/** A single uploaded asset in the global pool */
export interface PlanAsset {
  /** Unique id, e.g. "a1", "v1" */
  tag: string
  /** 'image' or 'video' */
  kind: 'image' | 'video'
  /** The File object – not serialised to localStorage */
  file?: File
  /** Object URL for preview */
  previewUrl: string
  /** Original filename */
  name: string
}

/** One shot in the plan */
export interface ShotState {
  id: string
  /** 1–15, integer seconds, all shots must sum <= 15 */
  duration: number
  mode: ShotMode
  movement: MovementId | null
  speedRamp: SpeedRamp
  /** Framing / shot size (text_to_video & omni only) */
  shotSize: ShotSizeId | null
  /** Camera angle (text_to_video & omni only) */
  angle: AngleId | null
  /** Lighting presets (text_to_video & omni only, max 2) */
  lighting: LightingId[]
  /** Camera body / lens / focal length / aperture (text_to_video & omni only) */
  camera: CameraSettings
  /** Depth of field slider value -1 (unset) to 8 (text_to_video & omni only) */
  dof: number
  /** Free-text prompt, may contain @image1 etc. */
  prompt: string
  /** Asset tags referenced in this shot (subset of global pool) */
  assetRefs: string[]
}

// ── Output settings ───────────────────────────────────────────────────────────

/** Studio output settings for image generation */
export interface ImageOutputSettings {
  model: string
  ratio: string
  resolution: string
  quality: string
}

/** Studio output settings for video generation */
export interface VideoOutputSettings {
  model: string
  ratio: string
  resolution: string
}

/** A reference image for image guide */
export interface ImageRef {
  tag: string
  kind: 'image'
  file?: File
  previewUrl: string
  name: string
}

/** Shared visual settings used by both Overall Setting and per-shot overrides */
export interface VisualSetting {
  shotSize: ShotSizeId | null
  angle: AngleId | null
  lighting: LightingId[]
  camera: CameraSettings
  dof: number
}

/** Top-level video plan (replaces GuideState for video mode) */
export interface VideoPlanState {
  /** Global generation mode — set once at the top level */
  planMode: ShotMode
  /** Global asset pool (used by omni_reference and first_last_frames) */
  assets: PlanAsset[]
  /** Overall video style */
  overallStyle: VideoStyleId | null
  /** Overall visual setting applied to all shots (can be overridden per shot) */
  overallSetting: VisualSetting
  /** All shots (multi for text_to_video / omni; always 1 for first_last_frames) */
  shots: ShotState[]
  /** Studio output settings */
  outputSettings: VideoOutputSettings
}
