'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV = [
  { href: '/studio',   label: 'Studio',   icon: 'lucide:wand-sparkles' },
  { href: '/grid',     label: 'Grid',     icon: 'lucide:grid-3x3' },
  { href: '/settings', label: 'Settings', icon: 'lucide:settings-2' },
]

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'iconify-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        icon?: string; width?: string | number; height?: string | number
      }, HTMLElement>
    }
  }
}

export function Navbar() {
  const pathname = usePathname()
  const [online, setOnline] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        await fetch('/api/health', { method: 'GET', signal: AbortSignal.timeout(3000) })
        if (!cancelled) setOnline(true)
      } catch {
        if (!cancelled) setOnline(false)
      }
    }
    check()
    const id = setInterval(check, 30_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const dotColor = online === null ? 'bg-[#555]' : online ? 'bg-[var(--color-green)] shadow-[0_0_6px_var(--color-green)]' : 'bg-red-500 shadow-[0_0_6px_#f87171]'

  return (
    <header className="h-12 flex-shrink-0 flex items-center gap-6 px-5 border-b border-[var(--color-border)] bg-[var(--color-surface)] z-50">
      <div className="flex items-center gap-2 mr-2">
        <div className="w-6 h-6 rounded-md bg-[var(--color-purple)] flex items-center justify-center text-white text-xs font-bold">🍌</div>
        <span className="font-bold text-sm tracking-tight text-[var(--color-text)]">
          Macro <span className="text-[var(--color-faint)] font-normal">Banana</span>
        </span>
      </div>

      <nav className="flex gap-0.5">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || (href === '/studio' && pathname === '/')
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 no-underline
                ${active
                  ? 'bg-[var(--color-raised)] text-[var(--color-text)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'}`}>
              <iconify-icon icon={icon} width="14" height="14" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full transition-colors ${dotColor}`} />
        <span className="text-xs text-[var(--color-faint)]">
          {online === false ? 'Proxy Offline' : 'API Proxy'}
        </span>
      </div>
    </header>
  )
}
