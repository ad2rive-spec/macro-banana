'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { loadSettings, saveSettings } from '@/services/api'

const NAV = [
  { href: '/studio', label: 'Studio', icon: 'lucide:wand-sparkles' },
  { href: '/guide',  label: 'Guide',  icon: 'lucide:compass' },
  { href: '/grid',   label: 'Grid',   icon: 'lucide:grid-3x3' },
]

// Mock user — replace with real auth later
const MOCK_USER = { name: 'Wayne Lin', email: 'wayne@macrobanana.ai', groups: 2 }

const RESOLUTIONS = ['480p', '720p', '1080p', '2K']
const RATIOS = ['16:9', '9:16', '4:3', '3:4', '21:9', '1:1']
const IMAGE_MODELS = [
  { value: 'gpt-image-2',     label: 'GPT Image 2' },
  { value: 'nano-banana-2',   label: 'Nano Banana 2' },
  { value: 'nano-banana-pro', label: 'Nano Banana Pro' },
]
const VIDEO_MODELS = [
  { value: 'doubao-seedance-2-0-260128',      label: 'Seedance 2.0' },
  { value: 'doubao-seedance-2-0-fast-260128', label: 'Seedance 2.0 Fast' },
  { value: 'veo-3-1-fast',                    label: 'Veo 3.1 Fast' },
]

function UserPopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const initial = MOCK_USER.name.charAt(0).toUpperCase()

  // Settings state
  const [s, setS] = useState(() => ({
    apiBaseUrl: 'http://localhost:3001',
    webhookUrl: '',
    defaultResolution: '1080p',
    defaultRatio: '9:16',
    defaultDuration: 5,
    defaultImageModel: IMAGE_MODELS[0].value,
    defaultVideoModel: VIDEO_MODELS[0].value,
    ...(typeof window !== 'undefined' ? loadSettings() : {}),
  }))
  const [saved, setSaved] = useState(false)

  function upd<K extends keyof typeof s>(key: K, value: (typeof s)[K]) {
    setS(p => ({ ...p, [key]: value })); setSaved(false)
  }
  function handleSave() {
    saveSettings(s as unknown as Record<string, unknown>)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open])

  const chipCls = (active: boolean) =>
    `px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer border transition-all
     ${active
       ? 'bg-[var(--color-purple-subtle)] border-[rgba(113,50,245,0.4)] text-purple-300'
       : 'bg-[var(--color-raised)] border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)]'}`

  return (
    <div ref={ref} className="relative">
      {/* Avatar button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 rounded-full bg-[var(--color-purple)] flex items-center justify-center text-white text-[13px] font-bold border-none cursor-pointer hover:opacity-90 transition-opacity select-none"
        title={MOCK_USER.name}
      >
        {initial}
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute top-[calc(100%+8px)] right-0 z-[9999] w-[320px] bg-[#17171e] border border-white/[0.09] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.7)] overflow-hidden">

          {/* User info */}
          <div className="px-4 py-3.5 border-b border-white/[0.07] flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--color-purple)] flex items-center justify-center text-white text-[15px] font-bold flex-shrink-0">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-white truncate">{MOCK_USER.name}</div>
              <div className="text-[11px] text-[#555] truncate">{MOCK_USER.email}</div>
            </div>
            {/* Groups badge */}
            <div className="ml-auto flex-shrink-0 flex items-center gap-1 bg-white/[0.06] rounded-full px-2 py-1">
              <iconify-icon icon="lucide:users" width="11" height="11" style={{ color: '#a78bfa' }} />
              <span className="text-[11px] text-[#a78bfa] font-semibold">{MOCK_USER.groups}</span>
            </div>
          </div>

          {/* Settings content */}
          <div className="overflow-y-auto max-h-[70vh]">

            {/* API Config */}
            <div className="px-4 pt-3 pb-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#444] mb-2.5">API Configuration</div>
              <div className="flex flex-col gap-2.5">
                <div>
                  <label className="text-[11px] text-[#555] block mb-1">Backend URL</label>
                  <input type="url" value={s.apiBaseUrl}
                    onChange={e => upd('apiBaseUrl', e.target.value)}
                    placeholder="http://localhost:3001"
                    className="w-full bg-[#0d0d12] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[12px] text-white outline-none focus:border-[#a78bfa] transition-colors placeholder:text-[#333]" />
                </div>
                <div>
                  <label className="text-[11px] text-[#555] block mb-1">Webhook URL <span className="text-[#333]">(optional)</span></label>
                  <input type="url" value={s.webhookUrl}
                    onChange={e => upd('webhookUrl', e.target.value)}
                    placeholder="https://your-server.com/webhook"
                    className="w-full bg-[#0d0d12] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[12px] text-white outline-none focus:border-[#a78bfa] transition-colors placeholder:text-[#333]" />
                </div>
              </div>
            </div>

            <div className="mx-4 my-3 border-t border-white/[0.06]" />

            {/* Defaults */}
            <div className="px-4 pb-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#444] mb-2.5">Default Parameters</div>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[11px] text-[#555] block mb-1.5">Image Model</label>
                  <div className="flex flex-wrap gap-1.5">
                    {IMAGE_MODELS.map(m => (
                      <button key={m.value} onClick={() => upd('defaultImageModel', m.value)} className={chipCls(s.defaultImageModel === m.value)}>{m.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-[#555] block mb-1.5">Video Model</label>
                  <div className="flex flex-wrap gap-1.5">
                    {VIDEO_MODELS.map(m => (
                      <button key={m.value} onClick={() => upd('defaultVideoModel', m.value)} className={chipCls(s.defaultVideoModel === m.value)}>{m.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-[#555] block mb-1.5">Resolution</label>
                  <div className="flex gap-1.5">
                    {RESOLUTIONS.map(r => (
                      <button key={r} onClick={() => upd('defaultResolution', r)} className={chipCls(s.defaultResolution === r)}>{r}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-[#555] block mb-1.5">Ratio</label>
                  <div className="flex flex-wrap gap-1.5">
                    {RATIOS.map(r => (
                      <button key={r} onClick={() => upd('defaultRatio', r)} className={chipCls(s.defaultRatio === r)}>{r}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] text-[#555]">Duration</label>
                    <span className="text-[11px] text-[#a78bfa] font-semibold">{s.defaultDuration}s</span>
                  </div>
                  <input type="range" min={4} max={15} value={s.defaultDuration}
                    onChange={e => upd('defaultDuration', +e.target.value)}
                    className="w-full accent-[#a78bfa] cursor-pointer" />
                  <div className="flex justify-between text-[10px] text-[#333] mt-0.5"><span>4s</span><span>15s</span></div>
                </div>
              </div>
            </div>

            {/* Save + Sign out */}
            <div className="px-4 py-3 border-t border-white/[0.07] mt-3 flex gap-2">
              <button onClick={handleSave}
                className="flex-1 py-2 rounded-xl bg-[#a78bfa] hover:bg-[#9370f0] text-white text-[12px] font-bold border-none cursor-pointer transition-colors">
                {saved ? '✓ Saved' : 'Save Settings'}
              </button>
              <button
                className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-[#555] hover:text-[#888] text-[12px] border-none cursor-pointer transition-colors"
                title="Sign out (coming soon)"
                disabled>
                <iconify-icon icon="lucide:log-out" width="13" height="13" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
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

      <div className="ml-auto flex items-center gap-3">
        {/* API status */}
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${dotColor}`} />
          <span className="text-[11px] text-[var(--color-faint)]">
            {online === false ? 'Offline' : 'API'}
          </span>
        </div>

        {/* User avatar */}
        <UserPopover />
      </div>
    </header>
  )
}
