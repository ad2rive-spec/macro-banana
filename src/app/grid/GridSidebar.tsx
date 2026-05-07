'use client'
import { useState, useRef } from 'react'
import { Columns, Rows, ArrowUpDown, ArrowLeftRight, MoveHorizontal, MoveVertical, Download, ChevronDown, MousePointerClick, Copy, Check, Upload, Trash2, Maximize, Share2 } from 'lucide-react'
import { GridConfig, PRESET_GROUPS } from './types'

interface SidebarProps {
  config: GridConfig
  setConfig: React.Dispatch<React.SetStateAction<GridConfig>>
  onDownload: () => void
  onSendToStudio: () => void
  isDownloading: boolean
  selectedCells: Set<number>
  onShare: () => string
  onClearSelection: () => void
  onClose?: () => void
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="ml-auto p-1 hover:bg-white/[0.06] rounded text-[#555] hover:text-[#a78bfa] transition-colors">
      {copied ? <Check className="w-3 h-3 text-[#4ade80]" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

function NumInput({ label, value, onChange, min = 0, max = 9999, step = 1, icon, suffix }:
  { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; icon?: React.ReactNode; suffix?: string }) {
  const [local, setLocal] = useState(value.toString())
  const [focused, setFocused] = useState(false)

  // Sync when value changes externally (e.g. unit switch px↔%)
  // Only update if not currently focused to avoid interrupting typing
  if (!focused && parseFloat(local) !== value) {
    setLocal(value.toString())
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase font-semibold text-[#555] tracking-widest flex items-center gap-1">{icon}{label}</label>
      <div className="relative">
        <input type="number" value={local} min={min} max={max} step={step}
          onChange={e => { setLocal(e.target.value); const n = parseFloat(e.target.value); if (!isNaN(n)) onChange(n) }}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); setLocal(value.toString()) }}
          className="w-full bg-[#0d0d12] border border-white/[0.08] text-[#f0f0f5] text-[13px] font-medium rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#a78bfa] focus:border-[#a78bfa] transition-all appearance-none pr-7" />
        {suffix && <span className="absolute right-2 top-1.5 text-[11px] text-[#555] pointer-events-none">{suffix}</span>}
      </div>
    </div>
  )
}

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b) }

export function GridSidebar({ config, setConfig, onDownload, onSendToStudio, isDownloading, selectedCells, onShare, onClearSelection, onClose }: SidebarProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [marginUnit, setMarginUnit] = useState<'px' | '%'>('px')
  const [urlCopied, setUrlCopied] = useState(false)

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
      xStr: `${((sx / config.width) * 100).toFixed(1)}% – ${(((sx + sw) / config.width) * 100).toFixed(1)}%`,
      yStr: `${((sy / config.height) * 100).toFixed(1)}% – ${(((sy + sh) / config.height) * 100).toFixed(1)}%`,
    }
  }

  const sectionTitle = "text-[10px] font-semibold text-[#55556a] uppercase tracking-widest"
  const divider = "border-t border-white/[0.06] pt-4"

  return (
    <aside className="w-64 bg-[#111118] border-r border-white/[0.07] h-full flex flex-col overflow-hidden">

      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Canvas size */}
        <section className="space-y-3">
          <h2 className={sectionTitle}>畫布尺寸</h2>
          <div className="relative">
            <select
              className="w-full appearance-none bg-[#16161f] text-[#bbb] text-[12px] border border-white/[0.08] rounded-lg px-3 py-2 pr-7 focus:outline-none focus:ring-1 focus:ring-[#a78bfa] cursor-pointer"
              defaultValue=""
              onChange={e => {
                const id = e.target.value; if (!id) return
                for (const group of Object.values(PRESET_GROUPS)) {
                  const p = group.find(x => x.id === id)
                  if (p) { setConfig(prev => ({ ...prev, width: p.width, height: p.height, marginTop: 50, marginBottom: 50, marginLeft: 50, marginRight: 50 })); break }
                }
              }}>
              <option value="" disabled>選擇預設尺寸…</option>
              {Object.entries(PRESET_GROUPS).map(([g, ps]) => (
                <optgroup key={g} label={g} className="bg-[#16161f]">
                  {ps.map(p => { const d = gcd(p.width, p.height); return <option key={p.id} value={p.id}>{p.name} ({p.width}×{p.height}) {p.width/d}:{p.height/d}</option> })}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-3 h-3 text-[#555] pointer-events-none" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <NumInput label="寬度" icon={<ArrowLeftRight className="w-3 h-3 text-[#a78bfa]/60"/>} value={config.width}  onChange={v => upd('width', v)}  suffix="px" />
            <NumInput label="高度" icon={<ArrowUpDown    className="w-3 h-3 text-[#a78bfa]/60"/>} value={config.height} onChange={v => upd('height', v)} suffix="px" />
          </div>
          {config.backgroundImage && (
            <button onClick={() => { const img = new Image(); img.onload = () => setConfig(p => ({ ...p, width: img.naturalWidth, height: img.naturalHeight })); img.src = config.backgroundImage! }}
              className="w-full text-[12px] py-1.5 bg-white/[0.05] hover:bg-white/[0.09] text-[#888] hover:text-white rounded-lg border border-white/[0.07] transition-colors">
              調整為參考圖尺寸
            </button>
          )}
        </section>

        {/* Background ref */}
        <section className="space-y-3">
          <h2 className={`${sectionTitle} ${divider}`}>背景參考圖</h2>
          {!config.backgroundImage ? (
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-white/[0.1] rounded-xl p-4 hover:border-[#a78bfa]/50 hover:bg-white/[0.03] transition-all group">
              <Upload className="w-4 h-4 text-[#444] group-hover:text-[#a78bfa]" />
              <span className="text-[12px] text-[#555] group-hover:text-[#888]">上傳圖片</span>
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
                <NumInput label="X 位移" value={config.bgOffsetX} onChange={v => upd('bgOffsetX', v)} min={-9999} suffix="px" />
                <NumInput label="Y 位移" value={config.bgOffsetY} onChange={v => upd('bgOffsetY', v)} min={-9999} suffix="px" />
              </div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onloadend = () => { upd('backgroundImage', r.result as string); setConfig(p => ({ ...p, bgOffsetX: 0, bgOffsetY: 0 })) }; r.readAsDataURL(f) }} />
        </section>

        {/* Margins */}
        <section className="space-y-3">
          <div className={`flex items-center justify-between ${divider}`}>
            <h2 className={sectionTitle}>邊距</h2>
            <div className="flex bg-white/[0.05] rounded-lg p-0.5 border border-white/[0.07]">
              {(['px', '%'] as const).map(u => (
                <button key={u} onClick={() => setMarginUnit(u)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors ${marginUnit === u ? 'bg-white/15 text-white' : 'text-[#555] hover:text-[#888]'}`}>
                  {u.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <NumInput label="上" value={getMargin(config.marginTop,    config.height)} onChange={v => setMargin('marginTop',    v, config.height)} suffix={marginUnit} step={marginUnit === '%' ? 0.1 : 1} />
            <NumInput label="下" value={getMargin(config.marginBottom, config.height)} onChange={v => setMargin('marginBottom', v, config.height)} suffix={marginUnit} step={marginUnit === '%' ? 0.1 : 1} />
            <NumInput label="左" value={getMargin(config.marginLeft,   config.width)}  onChange={v => setMargin('marginLeft',   v, config.width)}  suffix={marginUnit} step={marginUnit === '%' ? 0.1 : 1} />
            <NumInput label="右" value={getMargin(config.marginRight,  config.width)}  onChange={v => setMargin('marginRight',  v, config.width)}  suffix={marginUnit} step={marginUnit === '%' ? 0.1 : 1} />
          </div>
        </section>

        {/* Grid layout */}
        <section className="space-y-3">
          <h2 className={`${sectionTitle} ${divider}`}>網格佈局</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <NumInput label="欄數" icon={<Columns className="w-3 h-3 text-[#a78bfa]/60"/>} value={config.columns} onChange={v => upd('columns', Math.max(1, v))} />
            <NumInput label="列數" icon={<Rows    className="w-3 h-3 text-[#a78bfa]/60"/>} value={config.rows}    onChange={v => upd('rows',    Math.max(1, v))} />
            <NumInput label="欄間距" icon={<MoveHorizontal className="w-3 h-3 text-[#a78bfa]/60"/>} value={config.colGap} onChange={v => upd('colGap', v)} suffix="px" />
            <NumInput label="列間距" icon={<MoveVertical   className="w-3 h-3 text-[#a78bfa]/60"/>} value={config.rowGap} onChange={v => upd('rowGap', v)} suffix="px" />
          </div>
        </section>

        {/* Selection stats */}
        {selStats && (
          <section className="bg-[#a78bfa]/[0.07] rounded-xl p-3 border border-[#a78bfa]/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-semibold text-[#a78bfa] uppercase flex items-center gap-1.5 tracking-widest">
                <MousePointerClick className="w-3 h-3"/>選取區域
              </h3>
              <button onClick={onClearSelection}
                className="px-2 py-0.5 text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors flex items-center gap-1">
                <Trash2 className="w-2.5 h-2.5"/>清除
              </button>
            </div>
            <div className="space-y-2 text-[12px]">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-[#555] block text-[11px]">寬度</span><span className="font-mono text-[#f0f0f5]">{selStats.w.toFixed(1)}px</span></div>
                <div><span className="text-[#555] block text-[11px]">高度</span><span className="font-mono text-[#f0f0f5]">{selStats.h.toFixed(1)}px</span></div>
              </div>
              <div className="pt-2 border-t border-[#a78bfa]/15 space-y-1.5">
                <div className="flex items-center justify-between"><span className="text-[#555] text-[11px]">X 軸 (%)</span><CopyBtn text={selStats.xStr}/></div>
                <div className="font-mono text-[#a78bfa]/80 text-[11px]">{selStats.xStr}</div>
                <div className="flex items-center justify-between"><span className="text-[#555] text-[11px]">Y 軸 (%)</span><CopyBtn text={selStats.yStr}/></div>
                <div className="font-mono text-[#a78bfa]/80 text-[11px]">{selStats.yStr}</div>
              </div>
            </div>
          </section>
        )}

        {/* Stats */}
        <section className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
          <h3 className="text-[10px] font-semibold text-[#555] uppercase mb-2 flex items-center gap-1.5 tracking-widest">
            <Maximize className="w-3 h-3"/>統計
          </h3>
          <div className="space-y-1.5 text-[12px]">
            <div className="flex justify-between"><span className="text-[#555]">欄寬</span><span className="font-mono text-[#bbb]">{colW.toFixed(1)}px <span className="text-[#a78bfa]">({contentW > 0 ? ((colW / contentW) * 100).toFixed(1) : 0}%)</span></span></div>
            <div className="flex justify-between"><span className="text-[#555]">內容寬</span><span className="font-mono text-[#bbb]">{contentW}px</span></div>
            <div className="flex justify-between"><span className="text-[#555]">列高</span><span className="font-mono text-[#bbb]">{rowH.toFixed(1)}px</span></div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.07] flex flex-col gap-2 flex-shrink-0">
        <div className="flex gap-2">
          <button onClick={onDownload} disabled={isDownloading}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#CDFF4D] hover:bg-[#d9ff6e] text-black font-bold py-2.5 px-3 rounded-xl transition-all disabled:opacity-50 text-[13px]">
            {isDownloading ? '處理中…' : <><Download className="w-3.5 h-3.5"/>下載</>}
          </button>
          <button onClick={() => { const url = onShare(); navigator.clipboard.writeText(url); setUrlCopied(true); setTimeout(() => setUrlCopied(false), 2000) }}
            className="p-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-[#888] hover:text-white rounded-xl transition-all border border-white/[0.07]">
            {urlCopied ? <Check className="w-4 h-4 text-[#4ade80]"/> : <Share2 className="w-4 h-4"/>}
          </button>
        </div>
        <button onClick={onSendToStudio} disabled={isDownloading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#a78bfa]/10 hover:bg-[#a78bfa]/20 border border-[#a78bfa]/20 text-[#a78bfa] text-[13px] font-medium transition-all disabled:opacity-50">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 10l-4 4l6 6l4-16l-16 4l6 6l4-4"/></svg>
          Send to Studio
        </button>
      </div>
    </aside>
  )
}
