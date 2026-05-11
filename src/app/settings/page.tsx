'use client'
import { useState } from 'react'
import { loadSettings, saveSettings } from '@/services/api'

const RESOLUTIONS = ['480p', '720p', '1080p', '2K']
const RATIOS = ['16:9', '9:16', '4:3', '3:4', '21:9', '1:1', 'adaptive']
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

interface Settings {
  apiBaseUrl: string
  webhookUrl: string
  defaultResolution: string
  defaultRatio: string
  defaultDuration: number
  defaultImageModel: string
  defaultVideoModel: string
}

export default function SettingsPage() {
  const [s, setS] = useState<Settings>(() => ({
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

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setS(p => ({ ...p, [key]: value })); setSaved(false)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    saveSettings(s as unknown as Record<string, unknown>)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inputCls = "w-full bg-raised border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-[13px] text-text outline-none focus:border-purple focus:shadow-[0_0_0_3px_var(--color-purple-subtle)] transition-all placeholder:text-faint"
  const labelCls = "block text-[11px] font-bold uppercase tracking-widest text-faint mb-1.5"

  return (
    <div className="h-full overflow-y-auto p-8 bg-base">
      <div className="max-w-[560px]">
        <h1 className="text-[22px] font-bold tracking-tight text-text mb-1">Settings</h1>
        <p className="text-[13px] text-faint mb-7">API configuration and defaults</p>

        <form onSubmit={handleSave}>
          <div className="bg-panel border border-[var(--color-border)] rounded-2xl overflow-hidden mb-4">
            <div className="px-5 py-3.5 border-b border-[var(--color-border)] text-[11px] font-bold uppercase tracking-widest text-faint">API Configuration</div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className={labelCls}>Backend Base URL</label>
                <input type="url" value={s.apiBaseUrl} onChange={e => set('apiBaseUrl', e.target.value)} placeholder="http://localhost:3001" className={inputCls} />
                <p className="text-[11px] text-faint mt-1.5">⚠ Never expose your API key in the frontend — proxy through your backend</p>
              </div>
              <div>
                <label className={labelCls}>Webhook URL (optional)</label>
                <input type="url" value={s.webhookUrl} onChange={e => set('webhookUrl', e.target.value)} placeholder="https://your-server.com/webhook" className={inputCls} />
                <p className="text-[11px] text-faint mt-1.5">Replaces polling when set</p>
              </div>
            </div>
          </div>

          <div className="bg-panel border border-[var(--color-border)] rounded-2xl overflow-hidden mb-4">
            <div className="px-5 py-3.5 border-b border-[var(--color-border)] text-[11px] font-bold uppercase tracking-widest text-faint">Default Parameters</div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className={labelCls}>Default Image Model</label>
                <div className="flex flex-wrap gap-2">
                  {IMAGE_MODELS.map(m => (
                    <button key={m.value} type="button" onClick={() => set('defaultImageModel', m.value)} className={`chip ${s.defaultImageModel === m.value ? 'active' : ''}`}>{m.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Default Video Model</label>
                <div className="flex flex-wrap gap-2">
                  {VIDEO_MODELS.map(m => (
                    <button key={m.value} type="button" onClick={() => set('defaultVideoModel', m.value)} className={`chip ${s.defaultVideoModel === m.value ? 'active' : ''}`}>{m.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Default Resolution</label>
                <div className="flex gap-2">
                  {RESOLUTIONS.map(r => (
                    <button key={r} type="button" onClick={() => set('defaultResolution', r)} className={`chip ${s.defaultResolution === r ? 'active' : ''}`}>{r}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Default Ratio</label>
                <div className="flex flex-wrap gap-2">
                  {RATIOS.map(r => (
                    <button key={r} type="button" onClick={() => set('defaultRatio', r)} className={`chip ${s.defaultRatio === r ? 'active' : ''}`}>{r}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Default Duration — {s.defaultDuration}s</label>
                <input type="range" min={4} max={15} value={s.defaultDuration} onChange={e => set('defaultDuration', +e.target.value)} className="w-full accent-purple" />
                <div className="flex justify-between text-[10px] text-faint mt-1"><span>4s</span><span>15s</span></div>
              </div>
            </div>
          </div>

          <button type="submit"
            className="w-full py-3 rounded-xl bg-purple text-[#1a1a1a] text-[14px] font-bold border-none cursor-pointer hover:bg-purple-dark transition-colors">
            {saved ? '✓ Saved' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  )
}
