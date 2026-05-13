'use client'
import { useState, useRef } from 'react'
import { Columns, Rows, ArrowUpDown, ArrowLeftRight, MoveHorizontal, MoveVertical, Download, ChevronDown, MousePointerClick, Copy, Check, Upload, Trash2, Maximize, X } from 'lucide-react'
import { GridConfig, PRESET_GROUPS } from './types'
import { useT } from '@/lib/LanguageContext'

interface SidebarProps {
  config: GridConfig
  setConfig: React.Dispatch<React.SetStateAction<GridConfig>>
  onDownload: () => void
  onSendToStudio: () => void
  isDownloading: boolean
  selectedCells: Set<number>
  onClearSelection: () => void
  onClose?: () => void
  isMobile?: boolean
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="ml-auto p-1 hover:bg-white/[0.06] rounded text-[#555] hover:text-[#FFD700] transition-colors">
      {copied ? <Check className="w-3 h-3 text-[#4ade80]" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

function NumInput({ label, value, onChange, min = 0, max = 9999, step = 1, icon, suffix }:
  { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; icon?: React.ReactNode; suffix?: string }) {
  const [local, setLocal] = useState(value.toString())
  const [focused, setFocused] = useState(false)

  if (!focused && parseFloat(local) !== value) {
    setLocal(value.toString())
  }

  function clamp(n: number) {
    return Math.min(max, Math.max(min, parseFloat(n.toFixed(10))))
  }
  function nudge(dir: 1 | -1) {
    const next = clamp(value + dir * step)
    setLocal(next.toString())
    onChange(next)
  }
  function handleWheel(e: React.WheelEvent<HTMLInputElement>) {
    e.preventDefault()
    nudge(e.deltaY < 0 ? 1 : -1)
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase font-semibold text-[#555] tracking-widest flex items-center gap-1">{icon}{label}</label>
      <div className="flex items-stretch bg-[#0d0d12] border border-white/[0.08] rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-[#FFD700] focus-within:border-[#FFD700] transition-all">
        <button type="button" onMouseDown={e => { e.preventDefault(); nudge(-1) }}
          disabled={value <= min}
          className="px-2 text-[#444] hover:text-[#FFD700] hover:bg-white/[0.06] disabled:opacity-30 transition-colors flex-shrink-0 border-r border-white/[0.06] text-[15px] leading-none select-none">
          −
        </button>
        <div className="relative flex-1 min-w-0">
          <input type="number" value={local} min={min} max={max} step={step}
            onChange={e => { setLocal(e.target.value); const n = parseFloat(e.target.value); if (!isNaN(n)) onChange(n) }}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); setLocal(value.toString()) }}
            onWheel={handleWheel}
            className={`w-full bg-transparent text-[#f0f0f5] text-[13px] font-medium py-1.5 focus:outline-none text-center
              [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden
              ${suffix ? 'pl-2 pr-6' : 'px-2'}`} />
          {suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[#555] pointer-events-none">{suffix}</span>}
        </div>
        <button type="button" onMouseDown={e => { e.preventDefault(); nudge(1) }}
          disabled={value >= max}
          className="px-2 text-[#444] hover:text-[#FFD700] hover:bg-white/[0.06] disabled:opacity-30 transition-colors flex-shrink-0 border-l border-white/[0.06] text-[15px] leading-none select-none">
          +
        </button>
      </div>
    </div>
  )
}

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b) }

export function GridSidebar({ config, setConfig, onDownload, onSendToStudio, isDownloading, selectedCells, onClearSelection, onClose, isMobile }: SidebarProps) {
  const t = useT()
  const fileRef = useRef<HTMLInputElement>(null)
  const [marginUnit, setMarginUnit] = useState<'px' | '%'>('px')
  const [marginLinked, setMarginLinked] = useState(true)

  const upd = (key: keyof GridConfig, val: number | string | null) => setConfig(p => ({ ...p, [key]: val }))
  const getMargin = (v: number, dim: number) => marginUnit === 'px' ? v : parseFloat(((v / dim) * 100).toFixed(2))
  const setMargin = (key: keyof GridConfig, v: number, dim: number) => upd(key, marginUnit === '%' ? (v / 100) * dim : v)

  const contentW = config.width  - config.marginLeft - config.marginRight
  const contentH = config.height - config.marginTop  - config.marginBottom
  const colW = config.columns > 0 ? (contentW - (config.columns - 1) * config.colGap) / config.columns : 0
  const rowH = config.rows    > 0 ? (contentH - (config.rows    - 1) * config.rowGap) / config.rows    : 0

  let selStats: { w: number; h: number; xStr: string; yStr: string } | null = null
  if (selectedCells.size > 0) {
    const idxs = Array.from(selectedCells)
    let minC = config.columns, maxC = -1, minR = config.rows, maxR = -1
    idxs.forEach(i => { const c = i % config.columns, r = Math.floor(i / config.columns); if (c < minC) minC = c; if (c > maxC) maxC = c; if (r < minR) minR = r; if (r > maxR) maxR = r })
    const cs = maxC - minC + 1, rs = maxR - minR + 1
    const sw = cs * colW + (cs - 1) * config.colGap, sh = rs * rowH + (rs - 1) * config.rowGap
    const sx = config.marginLeft + minC * (colW + config.colGap), sy = config.marginTop + minR * (rowH + config.rowGap)
    selStats = {
      w: sw, h: sh,
      xStr: `x: ${((sx / config.width) * 100).toFixed(1)}% – ${(((sx + sw) / config.width) * 100).toFixed(1)}%`,
      yStr: `y: ${((sy / config.height) * 100).toFixed(1)}% – ${(((sy + sh) / config.height) * 100).toFixed(1)}%`,
    }
  }

  const sectionTitle = "text-[10px] font-semibold text-[#55556a] uppercase tracking-widest"
  const divider = "border-t border-white/[0.06] pt-4"

  return (
    <aside className={isMobile
      ? 'w-full bg-[#111118] border-t border-white/[0.07] rounded-t-2xl flex flex-col overflow-hidden h-full'
      : 'w-72 bg-[#111118] border-r border-white/[0.07] h-full flex flex-col overflow-hidden'
    }>

      {isMobile && (
        <div className="relative flex items-center justify-center px-4 pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
          {onClose && (
            <button onClick={onClose} className="absolute right-3 p-1.5 rounded-lg text-[#555] hover:text-white hover:bg-white/[0.07] transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">

        {/* Canvas size */}
        <section className="space-y-3">
          <h2 className={sectionTitle}>{t('grid.canvasSize')}</h2>
          <div className="relative">
            <select
              className="w-full appearance-none bg-[#16161f] text-[#bbb] text-[12px] border border-white/[0.08] rounded-lg px-3 py-2 pr-7 focus:outline-none focus:ring-1 focus:ring-[#FFD700] cursor-pointer"
              defaultValue=""
              onChange={e => {
                const id = e.target.value; if (!id) return
                for (const group of Object.values(PRESET_GROUPS)) {
                  const p = group.find(x => x.id === id)
                  if (p) { setConfig(prev => ({ ...prev, width: p.width, height: p.height, marginTop: 50, marginBottom: 50, marginLeft: 50, marginRight: 50 })); break }
                }
              }}>
              <option value="" disabled>{t('grid.selectPreset')}</option>
              {Object.entries(PRESET_GROUPS).map(([g, ps]) => (
                <optgroup key={g} label={g} className="bg-[#16161f]">
                  {ps.map(p => { const d = gcd(p.width, p.height); return <option key={p.id} value={p.id}>{p.name} ({p.width}×{p.height}) {p.width/d}:{p.height/d}</option> })}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-3 h-3 text-[#555] pointer-events-none" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <NumInput label={t('grid.width') || 'W'} icon={<ArrowLeftRight className="w-3 h-3 text-[#FFD700]/60"/>} value={config.width}  onChange={v => upd('width', v)}  suffix="px" />
            <NumInput label={t('grid.height') || 'H'} icon={<ArrowUpDown    className="w-3 h-3 text-[#FFD700]/60"/>} value={config.height} onChange={v => upd('height', v)} suffix="px" />
          </div>
          {config.backgroundImage && (
            <button onClick={() => { const img = new Image(); img.onload = () => setConfig(p => ({ ...p, width: img.naturalWidth, height: img.naturalHeight })); img.src = config.backgroundImage! }}
              className="w-full text-[12px] py-1.5 bg-white/[0.05] hover:bg-white/[0.09] text-[#888] hover:text-white rounded-lg border border-white/[0.07] transition-colors">
              {t('grid.fitToRef')}
            </button>
          )}
        </section>

        {/* Background ref */}
        <section className="space-y-3">
          <h2 className={`${sectionTitle} ${divider}`}>{t('grid.refImage')}</h2>
          {!config.backgroundImage ? (
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-white/[0.1] rounded-xl p-4 hover:border-[#FFD700]/50 hover:bg-white/[0.03] transition-all group">
              <Upload className="w-4 h-4 text-[#444] group-hover:text-[#FFD700]" />
              <span className="text-[12px] text-[#555] group-hover:text-[#888]">{t('grid.uploadImage')}</span>
            </button>
          ) : (
            <div className="space-y-2.5">
              <div className="relative rounded-xl overflow-hidden border border-white/[0.07] group">
                <img src={config.backgroundImage} alt="" className="w-full h-20 object-cover opacity-60" />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { upd('backgroundImage', null); if (fileRef.current) fileRef.current.value = '' }}
                    className="bg-red-500/80 p-1.5 rounded-full hover:bg-red-500 text-white"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <NumInput label={t('grid.xOffsetPx') || 'X'} value={config.bgOffsetX} onChange={v => upd('bgOffsetX', v)} min={-9999} suffix="px" />
                <NumInput label={t('grid.yOffsetPx') || 'Y'} value={config.bgOffsetY} onChange={v => upd('bgOffsetY', v)} min={-9999} suffix="px" />
              </div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onloadend = () => { upd('backgroundImage', r.result as string); setConfig(p => ({ ...p, bgOffsetX: 0, bgOffsetY: 0 })) }; r.readAsDataURL(f) }} />
        </section>

        {/* Margins */}
        <section className="space-y-3">
          <div className={`flex items-center justify-between ${divider}`}>
            <h2 className={sectionTitle}>{t('grid.margins') || 'Margins'}</h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setMarginLinked(l => !l)}
                title={marginLinked ? t('grid.linkedMargin') : t('grid.unlinkedMargin')}
                className={`p-1 rounded-md transition-colors border ${marginLinked ? 'border-[#FFD700]/40 bg-[#FFD700]/10 text-[#FFD700]' : 'border-white/[0.08] bg-white/[0.05] text-[#555] hover:text-[#888]'}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {marginLinked
                    ? <><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/><line x1="7" y1="11" x2="7" y2="13"/><line x1="17" y1="11" x2="17" y2="13"/><line x1="11" y1="7" x2="13" y2="7"/><line x1="11" y1="17" x2="13" y2="17"/></>
                    : <><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></>
                  }
                </svg>
              </button>
              <div className="flex bg-white/[0.05] rounded-lg p-0.5 border border-white/[0.07]">
                {(['px', '%'] as const).map(u => (
                  <button key={u} onClick={() => setMarginUnit(u)}
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors ${marginUnit === u ? 'bg-white/15 text-white' : 'text-[#555] hover:text-[#888]'}`}>
                    {u.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {marginLinked ? (
            <NumInput
              label={t('grid.allMargins') || 'All Margins'}
              value={getMargin(config.marginTop, config.height)}
              onChange={v => {
                setMargin('marginTop',    v, config.height)
                setMargin('marginBottom', v, config.height)
                setMargin('marginLeft',   v, config.width)
                setMargin('marginRight',  v, config.width)
              }}
              suffix={marginUnit}
              step={marginUnit === '%' ? 0.1 : 1}
            />
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <NumInput label={t('grid.marginTop')    || 'Top'}    value={getMargin(config.marginTop,    config.height)} onChange={v => setMargin('marginTop',    v, config.height)} suffix={marginUnit} step={marginUnit === '%' ? 0.1 : 1} />
              <NumInput label={t('grid.marginBottom') || 'Bottom'} value={getMargin(config.marginBottom, config.height)} onChange={v => setMargin('marginBottom', v, config.height)} suffix={marginUnit} step={marginUnit === '%' ? 0.1 : 1} />
              <NumInput label={t('grid.marginLeft')   || 'Left'}   value={getMargin(config.marginLeft,   config.width)}  onChange={v => setMargin('marginLeft',   v, config.width)}  suffix={marginUnit} step={marginUnit === '%' ? 0.1 : 1} />
              <NumInput label={t('grid.marginRight')  || 'Right'}  value={getMargin(config.marginRight,  config.width)}  onChange={v => setMargin('marginRight',  v, config.width)}  suffix={marginUnit} step={marginUnit === '%' ? 0.1 : 1} />
            </div>
          )}
        </section>

        {/* Grid layout */}
        <section className="space-y-3">
          <div className={`flex items-center justify-between ${divider}`}>
            <h2 className={sectionTitle}>{t('grid.gridLayout')}</h2>
            <button
              title={t('grid.autoCalcCols')}
              onClick={() => {
                const cw = config.width  - config.marginLeft - config.marginRight
                const ch = config.height - config.marginTop  - config.marginBottom
                if (cw <= 0 || ch <= 0) return
                const cellW = (cw - (config.columns - 1) * config.colGap) / config.columns
                if (cellW <= 0) return
                const rows = Math.max(1, Math.round((ch + config.rowGap) / (cellW + config.rowGap)))
                upd('rows', rows)
              }}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-lg border border-white/[0.08] bg-white/[0.04] text-[#666] hover:text-[#FFD700] hover:border-[#FFD700]/30 hover:bg-[#FFD700]/[0.06] transition-all">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/>
                <rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>
              </svg>
              {t('grid.squareCell')}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <NumInput label={t('grid.columns') || 'Cols'} icon={<Columns className="w-3 h-3 text-[#FFD700]/60"/>} value={config.columns} onChange={v => upd('columns', Math.max(1, v))} />
            <NumInput label={t('grid.rows')    || 'Rows'} icon={<Rows    className="w-3 h-3 text-[#FFD700]/60"/>} value={config.rows}    onChange={v => upd('rows',    Math.max(1, v))} />
            <NumInput label={t('grid.colGap')  || 'Col Gap'} icon={<MoveHorizontal className="w-3 h-3 text-[#FFD700]/60"/>} value={config.colGap} onChange={v => upd('colGap', v)} suffix="px" />
            <NumInput label={t('grid.rowGap')  || 'Row Gap'} icon={<MoveVertical   className="w-3 h-3 text-[#FFD700]/60"/>} value={config.rowGap} onChange={v => upd('rowGap', v)} suffix="px" />
          </div>
        </section>

        {/* Selection stats */}
        {selStats && (
          <section className="bg-[#FFD700]/[0.07] rounded-xl p-3 border border-[#FFD700]/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-semibold text-[#FFD700] uppercase flex items-center gap-1.5 tracking-widest">
                <MousePointerClick className="w-3 h-3"/>{t('grid.selection')}
              </h3>
              <button onClick={onClearSelection}
                className="px-2 py-0.5 text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors flex items-center gap-1">
                <Trash2 className="w-2.5 h-2.5"/>{t('grid.clear')}
              </button>
            </div>
            <div className="space-y-2 text-[12px]">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-[#555] block text-[11px]">{t('grid.widthLabel') || 'W'}</span><span className="font-mono text-[#f0f0f5]">{selStats.w.toFixed(1)}px</span></div>
                <div><span className="text-[#555] block text-[11px]">{t('grid.heightLabel') || 'H'}</span><span className="font-mono text-[#f0f0f5]">{selStats.h.toFixed(1)}px</span></div>
              </div>
              <div className="pt-2 border-t border-[#FFD700]/15 space-y-1.5">
                <div className="flex items-center justify-between"><span className="text-[#555] text-[11px]">{t('grid.xOffset')}</span><CopyBtn text={selStats.xStr}/></div>
                <div className="font-mono text-[#FFD700]/80 text-[11px]">{selStats.xStr}</div>
                <div className="flex items-center justify-between"><span className="text-[#555] text-[11px]">{t('grid.yOffset')}</span><CopyBtn text={selStats.yStr}/></div>
                <div className="font-mono text-[#FFD700]/80 text-[11px]">{selStats.yStr}</div>
              </div>
            </div>
          </section>
        )}

        {/* Stats */}
        <section className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
          <h3 className="text-[10px] font-semibold text-[#555] uppercase mb-2 flex items-center gap-1.5 tracking-widest">
            <Maximize className="w-3 h-3"/>{t('grid.stats')}
          </h3>
          <div className="space-y-1.5 text-[12px]">
            <div className="flex justify-between"><span className="text-[#555]">{t('grid.colWidth') || 'Col W'}</span><span className="font-mono text-[#bbb]">{colW.toFixed(1)}px <span className="text-[#FFD700]">({contentW > 0 ? ((colW / contentW) * 100).toFixed(1) : 0}%)</span></span></div>
            <div className="flex justify-between"><span className="text-[#555]">{t('grid.contentWidth')}</span><span className="font-mono text-[#bbb]">{contentW}px</span></div>
            <div className="flex justify-between"><span className="text-[#555]">{t('grid.rowHeight') || 'Row H'}</span><span className="font-mono text-[#bbb]">{rowH.toFixed(1)}px</span></div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.07] flex flex-col gap-2 flex-shrink-0">
        <div className="flex gap-2">
          <button onClick={onDownload} disabled={isDownloading}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#CDFF4D] hover:bg-[#d9ff6e] text-black font-bold py-2.5 px-3 rounded-xl transition-all disabled:opacity-50 text-[13px]">
            {isDownloading ? t('grid.processing') || '...' : <><Download className="w-3.5 h-3.5"/>{t('grid.detail.download') || t('studio.detail.download')}</>}
          </button>
        </div>
        <button onClick={onSendToStudio} disabled={isDownloading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FFD700]/10 hover:bg-[#FFD700]/20 border border-[#FFD700]/20 text-[#FFD700] text-[13px] font-medium transition-all disabled:opacity-50">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 10l-4 4l6 6l4-16l-16 4l6 6l4-4"/></svg>
          {t('grid.sendToStudio')}
        </button>
      </div>
    </aside>
  )
}
