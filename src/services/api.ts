import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// 429 auto-retry with exponential backoff
api.interceptors.response.use(null, async (err) => {
  const cfg = err.config
  if (err.response?.status !== 429 || cfg._retryCount >= 3) return Promise.reject(err)
  cfg._retryCount = (cfg._retryCount || 0) + 1
  await new Promise(r => setTimeout(r, 1000 * Math.pow(2, cfg._retryCount)))
  return api(cfg)
})

export interface TaskPayload {
  model: string
  content: unknown[]
  resolution: string
  ratio: string
  duration: number
  generate_audio?: boolean
  watermark?: boolean
  return_last_frame?: boolean
  seed?: number
  quality?: string
  thinking?: string
  background?: string
  mode?: string
  mask?: string  // base64 PNG mask for inpainting (gpt-image-2 / nano-banana)
}

export interface Task {
  task_id: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'expired' | 'cancelled'
  prompt?: string
  model?: string
  resolution?: string
  ratio?: string
  duration?: number
  created_at?: number
  video_url?: string | null
  last_frame_url?: string | null
  seed?: number | null
  error_message?: string
  usage?: { completion_tokens: number }
}

export async function submitTask(payload: TaskPayload): Promise<{ task_id: string }> {
  const { data } = await api.post('/generate', payload)
  return data
}

export async function getTaskStatus(taskId: string): Promise<Task> {
  const { data } = await api.get(`/tasks/${taskId}`)
  return data
}

export function loadTasks(): Task[] {
  try { return JSON.parse(localStorage.getItem('seedance_tasks') || '[]') }
  catch { return [] }
}

// ── Paginated task fetcher — swap this for Firebase when ready ──
export interface FetchTasksOptions {
  workspace: 'personal' | 'group'
  cursor?: string   // last task_id for pagination
  limit?: number
}
export interface FetchTasksResult {
  tasks: Task[]
  hasMore: boolean
  nextCursor: string | null
}

export async function fetchTasks(opts: FetchTasksOptions): Promise<FetchTasksResult> {
  const { workspace, cursor, limit: pageSize = 20 } = opts
  // TODO: replace with Firebase Firestore query
  const all = loadTasks().filter(t => !t.task_id.startsWith('mock'))
  const startIdx = cursor ? all.findIndex(t => t.task_id === cursor) + 1 : 0
  const slice = all.slice(startIdx, startIdx + pageSize)
  return {
    tasks: slice,
    hasMore: startIdx + pageSize < all.length,
    nextCursor: slice.length > 0 ? slice[slice.length - 1].task_id : null,
  }
}

export function saveTask(task: Task): void {
  const tasks = loadTasks()
  const idx = tasks.findIndex(t => t.task_id === task.task_id)
  if (idx >= 0) tasks[idx] = { ...tasks[idx], ...task }
  else tasks.unshift(task)
  localStorage.setItem('seedance_tasks', JSON.stringify(tasks))
}

export function deleteTask(taskId: string): void {
  localStorage.setItem('seedance_tasks', JSON.stringify(loadTasks().filter(t => t.task_id !== taskId)))
}

export function clearExpiredTasks(): void {
  localStorage.setItem('seedance_tasks', JSON.stringify(loadTasks().filter(t => t.status !== 'expired')))
}

export function loadSettings(): Record<string, unknown> {
  try { return JSON.parse(localStorage.getItem('seedance_settings') || '{}') }
  catch { return {} }
}

export function saveSettings(settings: Record<string, unknown>): void {
  localStorage.setItem('seedance_settings', JSON.stringify(settings))
}

const PRICE_T2V_PER_M = 6.40
const PRICE_V2V_PER_M = 3.90

export function calcCost(tokens: number, isV2V = false): string {
  const rate = isV2V ? PRICE_V2V_PER_M : PRICE_T2V_PER_M
  return ((tokens / 1_000_000) * rate).toFixed(4)
}
