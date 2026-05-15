'use client'

/**
 * Tooltip — viewport-aware tooltip component.
 *
 * Renders children inside a `position: relative` wrapper.
 * The floating panel is positioned with CSS only:
 *  - Starts centred above the trigger (bottom-full + left-1/2 -translate-x-1/2)
 *  - Uses `max-w-[min(240px,80vw)]` so it never overflows on narrow screens
 *  - Uses `whitespace-normal` so text wraps instead of pushing off-screen
 *  - `left` is clamped via inline style so it never leaves the viewport
 *
 * Usage:
 *   <Tooltip content="Some description text">
 *     <button>…</button>
 *   </Tooltip>
 */

import { useState, useRef, useEffect, useCallback } from 'react'

interface TooltipProps {
  content: string
  children: React.ReactNode
  /** Extra wrapper className (defaults to 'relative') */
  className?: string
}

export function Tooltip({ content, children, className = 'relative' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [offsetX, setOffsetX] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const tipRef  = useRef<HTMLDivElement>(null)

  const reposition = useCallback(() => {
    if (!wrapRef.current || !tipRef.current) return
    const wrapRect = wrapRef.current.getBoundingClientRect()
    const tipRect  = tipRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const MARGIN = 8

    // Natural centre position in viewport coords
    const naturalLeft = wrapRect.left + wrapRect.width / 2 - tipRect.width / 2

    let shift = 0
    if (naturalLeft < MARGIN) {
      shift = MARGIN - naturalLeft                          // push right
    } else if (naturalLeft + tipRect.width > vw - MARGIN) {
      shift = (vw - MARGIN) - (naturalLeft + tipRect.width) // push left
    }
    setOffsetX(shift)
  }, [])

  useEffect(() => {
    if (visible) {
      // Give browser one frame to paint the tip before measuring
      requestAnimationFrame(reposition)
    }
  }, [visible, reposition])

  return (
    <div
      ref={wrapRef}
      className={className}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}

      {visible && (
        <div
          ref={tipRef}
          role="tooltip"
          style={{ transform: `translateX(calc(-50% + ${offsetX}px))` }}
          className="
            absolute bottom-full left-1/2 mb-2 z-50
            px-2.5 py-1.5 rounded-md text-[11px] leading-snug text-center
            bg-[var(--color-hover)] border border-[var(--color-border)]
            text-[var(--color-text)] pointer-events-none shadow-lg
            max-w-[min(220px,80vw)] whitespace-normal
          "
        >
          {content}
          {/* Arrow */}
          <span
            className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--color-hover)]"
            style={{ marginLeft: -offsetX }}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  )
}
