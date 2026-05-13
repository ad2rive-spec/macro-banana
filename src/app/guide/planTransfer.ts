/**
 * planTransfer.ts
 *
 * Serialises Guide plans into Studio-ready payloads stored in localStorage.
 *
 * Keys:
 *   'guide_video_plan' — video shot planner
 *   'guide_image_plan' — image guide with refs
 */

import type { VideoPlanState, ShotState, ImageRef, ImageOutputSettings, VideoOutputSettings } from './types'
import { MOVEMENT_TERMS, SHOT_SIZE_TERMS, ANGLE_TERMS, LIGHTING_TERMS, DOF_MAP } from './logic'
import { buildCameraPrompt } from '@/lib/cameraPresets'

export const PLAN_STORAGE_KEY       = 'guide_video_plan'
export const IMAGE_PLAN_STORAGE_KEY = 'guide_image_plan'

// ── Video plan ─────────────────────────────────────────────────────────────────

export interface StoredPlan {
  planMode: string
  overallStyle: string | null
  outputSettings: VideoOutputSettings
  assets: Array<{
    tag: string
    kind: 'image' | 'video'
    previewUrl: string
    name: string
  }>
  shots: Array<{
    id: string
    duration: number
    mode: string
    movement: string | null
    movementTerm: string | null
    speedRamp: string
    prompt: string
    assetRefs: string[]
  }>
  /** Combined prompt for Studio */
  combinedPrompt: string
  totalDuration: number
}

// ── Image plan ─────────────────────────────────────────────────────────────────

export interface StoredImagePlan {
  prompt: string
  outputSettings: ImageOutputSettings
  refs: Array<{
    tag: string
    previewUrl: string
    name: string
  }>
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function speedRampLabel(r: string): string {
  const map: Record<string, string> = {
    'linear':      '',
    'slow-mo':     'slow motion',
    'ramp-up':     'speed ramp up',
    'ramp-down':   'speed ramp down',
    'ease-in-out': 'ease in and out',
  }
  return map[r] ?? r
}

function buildShotLine(s: ShotState, index: number): string {
  const promptParts: string[] = []

  // Framing / angle / lighting / camera / dof prepended to prompt text
  if (s.shotSize) promptParts.push(SHOT_SIZE_TERMS[s.shotSize])
  if (s.angle)    promptParts.push(ANGLE_TERMS[s.angle])
  if (s.lighting && s.lighting.length > 0)
    promptParts.push(...s.lighting.map(id => LIGHTING_TERMS[id]))
  const camStr = buildCameraPrompt(s.camera)
  if (camStr) promptParts.push(camStr)
  const dofStr = s.dof !== -1 ? (DOF_MAP[s.dof] ?? null) : null
  if (dofStr && !s.camera.aperture) promptParts.push(dofStr)
  if (s.prompt.trim()) promptParts.push(s.prompt.trim())

  const metaParts: string[] = ['Shot ' + (index + 1), s.duration + 's']
  if (s.movement) metaParts.push(MOVEMENT_TERMS[s.movement])
  const ramp = speedRampLabel(s.speedRamp)
  if (ramp) metaParts.push(ramp)

  const meta = '[' + metaParts.join(', ') + ']'
  const body = promptParts.join(', ')

  return body ? meta + ' ' + body : meta
}

function buildOverallSettingStr(plan: VideoPlanState): string {
  const s = plan.overallSetting
  const parts: string[] = []
  if (s.shotSize) parts.push(SHOT_SIZE_TERMS[s.shotSize])
  if (s.angle)    parts.push(ANGLE_TERMS[s.angle])
  if (s.lighting && s.lighting.length > 0)
    parts.push(...s.lighting.map(id => LIGHTING_TERMS[id]))
  const camStr = buildCameraPrompt(s.camera)
  if (camStr) parts.push(camStr)
  const dofStr = s.dof !== -1 ? (DOF_MAP[s.dof] ?? null) : null
  if (dofStr && !s.camera.aperture) parts.push(dofStr)
  return parts.join(', ')
}

export function buildCombinedPrompt(plan: VideoPlanState): string {
  const { planMode, shots, overallStyle } = plan

  if (planMode === 'first_last_frames') {
    const shot = shots[0]
    const parts: string[] = []
    if (shot.movement) parts.push(MOVEMENT_TERMS[shot.movement])
    const ramp = speedRampLabel(shot.speedRamp)
    if (ramp) parts.push(ramp)
    const metaParts = [shot.duration + 's', ...parts].join(', ')
    const meta = '[' + metaParts + ']'
    return shot.prompt.trim() ? meta + ' ' + shot.prompt.trim() : meta
  }

  // Multi-shot: always include all shots (even prompt-less ones)
  const shotLines = shots.map((s, i) => buildShotLine(s, i))

  const styleLine = overallStyle ? 'Overall style: ' + overallStyle + '. ' : ''
  const settingLine = buildOverallSettingStr(plan)
  const overallLine = [styleLine.replace('. ', ''), settingLine].filter(Boolean).join(', ')
  const prefix = overallLine ? overallLine + '. ' : ''
  return (prefix + shotLines.join('. ')).trim()
}

// ── Video plan API ─────────────────────────────────────────────────────────────

export function storePlan(plan: VideoPlanState): StoredPlan {
  const stored: StoredPlan = {
    planMode: plan.planMode,
    overallStyle: plan.overallStyle,
    outputSettings: plan.outputSettings,
    assets: plan.assets.map(a => ({
      tag: a.tag,
      kind: a.kind,
      previewUrl: a.previewUrl,
      name: a.name,
    })),
    shots: plan.shots.map((s) => ({
      id: s.id,
      duration: s.duration,
      mode: plan.planMode,
      movement: s.movement,
      movementTerm: s.movement ? MOVEMENT_TERMS[s.movement] : null,
      speedRamp: s.speedRamp,
      prompt: s.prompt,
      assetRefs: s.assetRefs,
    })),
    combinedPrompt: buildCombinedPrompt(plan),
    totalDuration: plan.shots.reduce((acc, s) => acc + s.duration, 0),
  }
  try {
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(stored))
  } catch { /* silent */ }
  return stored
}

export function consumePlan(): StoredPlan | null {
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEY)
    if (!raw) return null
    localStorage.removeItem(PLAN_STORAGE_KEY)
    return JSON.parse(raw) as StoredPlan
  } catch { return null }
}

// ── Image plan API ─────────────────────────────────────────────────────────────

export function storeImagePlan(
  prompt: string,
  outputSettings: ImageOutputSettings,
  refs: ImageRef[],
): StoredImagePlan {
  const stored: StoredImagePlan = {
    prompt,
    outputSettings,
    refs: refs.map(r => ({ tag: r.tag, previewUrl: r.previewUrl, name: r.name })),
  }
  try {
    localStorage.setItem(IMAGE_PLAN_STORAGE_KEY, JSON.stringify(stored))
  } catch { /* silent */ }
  return stored
}

export function consumeImagePlan(): StoredImagePlan | null {
  try {
    const raw = localStorage.getItem(IMAGE_PLAN_STORAGE_KEY)
    if (!raw) return null
    localStorage.removeItem(IMAGE_PLAN_STORAGE_KEY)
    return JSON.parse(raw) as StoredImagePlan
  } catch { return null }
}
