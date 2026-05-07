'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getTaskStatus, loadTasks, saveTask, deleteTask, clearExpiredTasks, calcCost, type Task } from '@/services/api'
import { usePolling } from '@/hooks/usePolling'

const STATUS_BADGE: Record<string, string> = {
  queued: 'bg-white/5 text-muted', running: 'bg-purple/20 text-purple-300',
  succeeded: 'bg-green-500/15 text-green-400', failed: 'bg-red-500/10 text-red-400', expired: 'bg-white/5 text-muted',
}
const STATUS_LABEL: Record<string, string> = {
  queued: 'Queued', running: 'Running', succeeded: 'Done', failed: 'Failed', expired: 'Expired', cancelled: 'Cancelled',
}
const TERMINAL = ['succeeded', 'failed', 'expired', 'cancelled']

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

function expiresIn(ts: number) {
  const remaining = ts + 24 * 3600 * 1000 - Date.now()
  if (remaining <= 0) return 'Expired'
  const h = Math.floor(remaining / 3600000)
  const m = Math.floor((remaining % 3600000) / 60000)
  return `${h}h ${m}m left`
}

// "9:16" → "9/16"
function ratioToCss(ratio?: string | null) {
  return ratio ? ratio.replace(':', '/') : '16/9'
}

export default function TasksPage() {
  const [tasks, setTasks]       = useState<Task[]>(() => typeof window !== 'undefined' ? loadTasks() : [])
  const [selected, setSelected] = useState<string | null>(null)
  const [now, setNow]           = useState(Date.now())
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  const activeIds = tasks.filter(t => !TERMINAL.includes(t.status)).map(t => t.task_id)

  const handleUpdate = useCallback((updated: Task) => {
    const current = loadTasks().find(t => t.task_id === updated.task_id)
    saveTask({ ...current, ...updated })
    setTasks(loadTasks())
  }, [])

  usePolling(activeIds, getTaskStatus, handleUpdate)

  function handleDelete(e: React.MouseEvent, taskId: string) {
    e.stopPropagation()
    deleteTask(taskId)
    setTasks(loadTasks())
    if (selected === taskId) setSelected(null)
  }

  function handleClearExpired() {
    clearExpiredTasks()
    setTasks(loadTasks())
    if (tasks.find(t => t.task_id === selected)?.status === 'expired') setSelected(null)
  }

  const sel = tasks.find(t => t.task_id === selected)
  const expiredCount = tasks.filter(t => t.status === 'expired').length

  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className={`${sel ? 'w-[380px]' : 'w-full'} flex-shrink-0 flex flex-col overflow-hidden bg-panel border-r border-white/10 transition-all duration-200`}>
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
          <div>
            <span className="font-bold text-[15px] text-text">Tasks</span>
            <span className="text-xs text-faint ml-2">{tasks.length} total</span>
          </div>
          <div className="flex items-center gap-2">
            {expiredCount > 0 && (
              <button onClick={handleClearExpired}
                className="px-3 py-1.5 rounded-xl bg-white/5 text-faint text-xs font-medium border-none cursor-pointer hover:bg-white/10 hover:text-text transition-colors">
                Clear {expiredCount} expired
              </button>
            )}
            <button onClick={() => router.push('/studio')}
              className="px-3 py-1.5 rounded-xl bg-purple text-white text-xs font-semibold border-none cursor-pointer hover:bg-purple-dark transition-colors">
              + New
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-faint text-[13px]">
              <span className="text-3xl">◈</span>No tasks yet
            </div>
          ) : tasks.map(task => {
            const elapsed = task.status === 'running' ? Math.min(95, Math.floor((now - (task.created_at || 0)) / 1200)) : 0
            return (
              <div key={task.task_id}
                onClick={() => setSelected(task.task_id === selected ? null : task.task_id)}
                className={`group px-5 py-3.5 border-b border-white/10 cursor-pointer transition-all duration-150 border-l-[3px]
                  ${task.task_id === selected ? 'bg-raised border-l-purple' : 'border-l-transparent hover:bg-hover'}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${STATUS_BADGE[task.status] || STATUS_BADGE.queued}`}>
                    {STATUS_LABEL[task.status] || task.status}
                  </span>
                  <span className="text-[11px] text-faint ml-auto">{timeAgo(task.created_at || 0)}</span>
                  <button
                    onClick={e => handleDelete(e, task.task_id)}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-[#555] hover:text-red-400 hover:bg-red-500/10 border-none cursor-pointer transition-all text-[11px]"
                    title="Delete task">
                    ✕
                  </button>
                </div>
                {task.status === 'running' && (
                  <div className="w-full h-1 bg-raised rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-purple rounded-full transition-all duration-1000 animate-pulse" style={{ width: `${elapsed}%` }} />
                  </div>
                )}
                <p className="text-[13px] text-text truncate mb-1">{task.prompt || '—'}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-faint">{task.model?.includes('fast') ? 'Fast' : 'Standard'} · {task.resolution} · {task.duration}s</span>
                  {task.status === 'succeeded' && task.created_at && (
                    <span className="text-[10px] text-amber-400 ml-auto">⏱ {expiresIn(task.created_at)}</span>
                  )}
                </div>
                {task.status === 'succeeded' && (
                  <div className="flex gap-2 mt-2">
                    {task.video_url && (
                      <a href={task.video_url} download onClick={e => e.stopPropagation()}
                        className="px-2 py-1 rounded-lg bg-purple/20 text-purple-300 text-[11px] font-semibold no-underline hover:bg-purple/30">
                        ↓ Download
                      </a>
                    )}
                    {task.video_url && (
                      <button onClick={e => { e.stopPropagation(); router.push(`/studio?ref=${encodeURIComponent(task.video_url!)}`) }}
                        className="px-2 py-1 rounded-lg bg-white/5 text-muted text-[11px] font-medium border-none cursor-pointer hover:bg-white/10 hover:text-text transition-all">
                        ⏭ Continue with last frame
                      </button>
                    )}
                  </div>
                )}
                {task.status === 'expired' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px] text-amber-400">URL expired</span>
                    {task.seed && <span className="text-[10px] text-faint font-mono">seed: {task.seed}</span>}
                    <button onClick={e => { e.stopPropagation(); router.push('/studio') }}
                      className="px-2 py-1 rounded-lg bg-white/5 text-muted text-[11px] border-none cursor-pointer hover:bg-white/10">
                      Resubmit
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail panel */}
      {sel && (
        <div className="flex-1 bg-base overflow-y-auto flex flex-col">
          <div className="px-5 py-3.5 border-b border-white/10 flex items-center gap-3">
            <button onClick={() => setSelected(null)}
              className="w-8 h-8 rounded-xl bg-transparent border border-white/10 text-muted cursor-pointer hover:bg-hover hover:text-text transition-all text-sm">
              ✕
            </button>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${STATUS_BADGE[sel.status] || STATUS_BADGE.queued}`}>
              {STATUS_LABEL[sel.status]}
            </span>
            {/* #10: timestamp + model instead of raw UUID */}
            <span className="text-[12px] text-faint">
              {sel.created_at ? new Date(sel.created_at).toLocaleString() : '—'}
              {sel.model && <span className="ml-1.5 font-mono">{sel.model.includes('fast') ? 'Fast' : sel.model.includes('seedance') ? 'Seedance' : sel.model}</span>}
            </span>
          </div>
          <div className="p-6 flex-1">
            {/* #7: aspect ratio from sel.ratio */}
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-surface flex items-center justify-center mb-5"
              style={{ aspectRatio: ratioToCss(sel.ratio) }}>
              {sel.status === 'succeeded' && sel.video_url
                ? <video src={sel.video_url} controls className="w-full h-full object-contain" />
                : <div className="text-center">
                    {sel.status === 'running' && (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[13px] text-purple-300 animate-pulse">⟳ Generating…</span>
                        <div className="w-32 h-1.5 bg-raised rounded-full overflow-hidden">
                          <div className="h-full bg-purple rounded-full transition-all duration-1000 animate-pulse"
                            style={{ width: `${Math.min(95, Math.floor((now - (sel.created_at || 0)) / 1200))}%` }} />
                        </div>
                        <span className="text-[11px] text-faint">Estimated 60-120s</span>
                      </div>
                    )}
                    {sel.status === 'failed' && <span className="text-[13px] text-red-400">✕ Generation failed</span>}
                    {sel.status === 'queued' && <span className="text-[13px] text-faint">Waiting in queue…</span>}
                  </div>
              }
            </div>
            <div className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-faint mb-1.5">Prompt</p>
              <div className="text-sm text-text leading-relaxed bg-panel border border-white/10 rounded-xl px-3.5 py-3">{sel.prompt || '—'}</div>
            </div>
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {[['Model', sel.model?.includes('fast') ? 'Fast' : 'Standard'], ['Resolution', sel.resolution], ['Duration', `${sel.duration}s`]].map(([k, v]) => (
                <div key={k} className="bg-panel border border-white/10 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-faint mb-1">{k}</p>
                  <p className="text-sm font-semibold text-text">{v}</p>
                </div>
              ))}
            </div>
            {sel.seed && (
              <div className="bg-panel border border-white/10 rounded-xl px-3.5 py-2.5 mb-5 text-[12px] text-muted">
                🎲 Seed: <span className="font-mono text-text">{sel.seed}</span>
              </div>
            )}
            {sel.usage?.completion_tokens && (
              <div className="bg-purple/15 border border-purple/20 rounded-xl px-3.5 py-3 mb-5 text-[12px] text-purple-300">
                {sel.usage.completion_tokens.toLocaleString()} tokens · <strong>${calcCost(sel.usage.completion_tokens)} USD</strong>
              </div>
            )}
            {sel.status === 'succeeded' && sel.created_at && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-2.5 mb-5 text-[12px] text-amber-400">
                ⚠ Video URL expires in {expiresIn(sel.created_at)} — download now
              </div>
            )}
            {sel.error_message && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 mb-5 text-[12px] text-red-400">{sel.error_message}</div>
            )}
            <div className="flex gap-2.5 flex-wrap">
              {sel.status === 'succeeded' && sel.video_url && (
                <>
                  <a href={sel.video_url} download className="px-4 py-2 rounded-xl bg-purple text-white text-[13px] font-semibold no-underline hover:bg-purple-dark transition-colors">
                    ↓ Download
                  </a>
                  <button onClick={() => router.push(`/studio?ref=${encodeURIComponent(sel.video_url!)}`)}
                    className="px-4 py-2 rounded-xl bg-transparent border border-white/10 text-muted text-[13px] font-medium cursor-pointer hover:bg-hover hover:text-text transition-all">
                    ⏭ Continue with last frame
                  </button>
                </>
              )}
              <button onClick={() => router.push('/studio')}
                className="px-4 py-2 rounded-xl bg-transparent border border-white/10 text-muted text-[13px] font-medium cursor-pointer hover:bg-hover hover:text-text transition-all">
                New Generation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
