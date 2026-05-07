'use client'
import { useMemo, useState } from 'react'
import { loadTasks, calcCost } from '@/services/api'

type Range = '7d' | '30d' | 'all'

const RANGE_LABELS: Record<Range, string> = { '7d': 'Last 7 days', '30d': 'Last 30 days', 'all': 'All time' }

export default function CostPage() {
  const [range, setRange] = useState<Range>('all')

  const { done, totalTokens, totalCost } = useMemo(() => {
    const all = typeof window !== 'undefined' ? loadTasks() : []
    const cutoff = range === 'all' ? 0 : Date.now() - (range === '7d' ? 7 : 30) * 86_400_000
    const done = all.filter(t => t.status === 'succeeded' && t.usage?.completion_tokens && (t.created_at || 0) >= cutoff)
    return {
      done,
      totalTokens: done.reduce((s, t) => s + (t.usage?.completion_tokens || 0), 0),
      totalCost:   done.reduce((s, t) => s + parseFloat(calcCost(t.usage?.completion_tokens || 0)), 0),
    }
  }, [range])

  return (
    <div className="h-full overflow-y-auto p-8 bg-base">
      <div className="max-w-3xl">
        <div className="flex items-end justify-between mb-7">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-text mb-1">Cost Tracking</h1>
            <p className="text-[13px] text-faint">Based on usage.completion_tokens</p>
          </div>
          <div className="flex gap-1 bg-panel border border-[var(--color-border)] rounded-xl p-1">
            {(Object.keys(RANGE_LABELS) as Range[]).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border-none cursor-pointer transition-all
                  ${range === r ? 'bg-raised text-text' : 'bg-transparent text-faint hover:text-text'}`}>
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-7">
          {[
            { label: 'Completed Tasks', value: done.length,                  unit: 'tasks' },
            { label: 'Total Tokens',    value: totalTokens.toLocaleString(), unit: '' },
            { label: 'Total Cost',      value: `$${totalCost.toFixed(4)}`,   unit: 'USD' },
          ].map(({ label, value, unit }) => (
            <div key={label} className="bg-panel border border-[var(--color-border)] rounded-2xl px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-faint mb-2">{label}</p>
              <p className="text-[26px] font-bold text-purple tracking-tight">{value}</p>
              {unit && <p className="text-[11px] text-faint mt-0.5">{unit}</p>}
            </div>
          ))}
        </div>

        <div className="bg-panel border border-[var(--color-border)] rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-3.5 border-b border-[var(--color-border)] text-[11px] font-bold uppercase tracking-widest text-faint">Rate Reference</div>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {['Duration', 'Tokens', 'T2V/I2V', 'V2V'].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-faint">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[['5s 1080p','~103,000','~$0.66','~$0.40'],['10s 1080p','~206,000','~$1.32','~$0.80'],['15s 1080p','~309,000','~$1.97','~$1.20']].map(row => (
                <tr key={row[0]} className="border-b border-[var(--color-border)]">
                  {row.map((cell, i) => (
                    <td key={i} className={`px-5 py-3 ${i === 0 ? 'text-text' : 'text-muted'}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-5 py-2.5 text-[11px] text-faint">T2V/I2V: $6.40/M tokens · V2V: $3.90/M tokens</p>
        </div>

        {done.length > 0 ? (
          <div className="bg-panel border border-[var(--color-border)] rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--color-border)] text-[11px] font-bold uppercase tracking-widest text-faint">Task Breakdown</div>
            {done.map(task => (
              <div key={task.task_id} className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
                <div>
                  <p className="text-[12px] font-mono text-faint">{task.task_id?.slice(0, 18)}…</p>
                  <p className="text-[11px] text-faint mt-0.5">{task.resolution} · {task.duration}s</p>
                </div>
                <div className="text-right">
                  <p className="text-[12px] text-muted">{task.usage!.completion_tokens.toLocaleString()} tokens</p>
                  <p className="text-[13px] font-bold text-purple">${calcCost(task.usage!.completion_tokens)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-faint text-[13px]">
            <span className="text-3xl">◎</span>No completed tasks yet
          </div>
        )}
      </div>
    </div>
  )
}
