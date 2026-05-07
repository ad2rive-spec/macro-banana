'use client'
import { useEffect, useRef } from 'react'
import type { Task } from '@/services/api'

const TERMINAL = ['succeeded', 'failed', 'expired', 'cancelled']

export function usePolling(
  taskIds: string[],
  getStatus: (id: string) => Promise<Task>,
  onUpdate: (task: Task) => void
) {
  const timers  = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const delays  = useRef<Record<string, number>>({})
  // stable ref so poll() closure doesn't go stale
  const cbRef   = useRef(onUpdate)
  useEffect(() => { cbRef.current = onUpdate })

  useEffect(() => {
    function poll(id: string) {
      getStatus(id)
        .then(result => {
          cbRef.current(result)
          if (TERMINAL.includes(result.status)) { delete timers.current[id]; return }
          delays.current[id] = Math.min((delays.current[id] || 10_000) * 1.5, 60_000)
          timers.current[id] = setTimeout(() => poll(id), delays.current[id])
        })
        .catch(() => {
          delays.current[id] = Math.min((delays.current[id] || 10_000) * 2, 60_000)
          timers.current[id] = setTimeout(() => poll(id), delays.current[id])
        })
    }

    taskIds.forEach(id => {
      if (!timers.current[id]) {
        delays.current[id] = 10_000
        timers.current[id] = setTimeout(() => poll(id), 10_000)
      }
    })

    return () => {
      Object.values(timers.current).forEach(clearTimeout)
      timers.current = {}
    }
  }, [taskIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
}
