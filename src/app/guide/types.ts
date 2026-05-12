// ── Guide Types ──
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
  | 'editorial-photo'
  | 'product-mockup'
  | 'poster'
  | 'ui-screen'
  | 'concept-art'
  | 'social-media'
  | 'documentary'

export type MovementId =
  | 'static'
  | 'pan-left'
  | 'pan-right'
  | 'tilt-up'
  | 'tilt-down'
  | 'dolly-in'
  | 'dolly-out'
  | 'tracking'
  | 'handheld'
  | 'crane-up'
  | 'crane-down'
  | 'drone'

export interface GuideState {
  /** Media mode — image or video */
  mediaTab: 'image' | 'video'

  /** Section 1: Subject free-text */
  subject: string

  /** Section 2: Framing */
  shotSize: ShotSizeId | null
  camera: CameraSettings

  /** Section 3: Angle */
  angle: AngleId | null

  /** Section 4: Light (max 2, FIFO eviction) */
  lighting: LightingId[]

  /** Section 4b: Light Direction (single-select, toggle) */
  lightDirection: LightDirectionId | null

  /** Section 5: Style (single-select, toggle) */
  style: StyleId | null

  /** Section 6: Depth of Field — -1 = unset, 0–8 = aperture index */
  dof: number

  /** Section 7: Use Case (single-select, toggle) */
  useCase: UseCaseId | null

  /** Section 9: Constraints (multi-select) */
  constraints: string[]

  /** Section 10: Movement (video only) */
  movement: MovementId | null
}

/** Derived prompt segments — computed by assemblePrompt(), never stored */
export interface PromptSegments {
  subject:     string | null
  shotSize:    string | null
  camera:      string | null
  angle:       string | null
  lighting:        string | null
  lightDirection:  string | null
  style:       string | null
  dof:         string | null
  useCase:     string | null
  constraints: string | null
  movement:    string | null
  /** All non-null segments joined with ', ' */
  full:        string
}

/** Metadata for each guide section, used by GuideSidebar */
export interface SectionMeta {
  id: string
  label: string
  hasSelection: (state: GuideState) => boolean
  videoOnly?: boolean
}
