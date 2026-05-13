'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { ZoomIn, ZoomOut, MousePointer, Pen, Minus, Square, Circle, ArrowRight, Type, Trash2, Undo, Redo, SlidersHorizontal } from 'lucide-react'
import { GridCanvas } from './GridCanvas'
import { GridSidebar } from './GridSidebar'
import { GridConfig, DrawingState, DrawingElement } from './types'
import { useT } from '@/lib/LanguageContext'

const INITIAL_CONFIG: GridConfig = {
  width: 1080, height: 1080,
  columns: 12, rows: 12,
  colGap: 10, rowGap: 10,
  marginTop: 50, marginBottom: 50, marginLeft: 50, marginRight: 50,
  backgroundImage: null, bgOffsetX: 0, bgOffsetY: 0,
}

const SIDEBAR_W       = 288  // w-72 = 18rem = 288px, desktop only
const PADDING_DESKTOP = 80   // breathing room on desktop
const PADDING_MOBILE  = 10   // breathing room on mobile
const MD_BREAKPOINT   = 768  // Tailwind md

function calcInitialScale(canvasW: number, canvasH: number): number {
  if (typeof window === 'undefined') return 0.45
  const isMobile = window.innerWidth < MD_BREAKPOINT
  const padding = isMobile ? PADDING_MOBILE : PADDING_DESKTOP
  const sidebarOffset = isMobile ? 0 : SIDEBAR_W
  const availW = window.innerWidth  - sidebarOffset - padding * 2
  const availH = window.innerHeight - padding * 2
  const s = Math.min(availW / canvasW, availH / canvasH, 1)
  return Math.max(0.1, parseFloat(s.toFixed(3)))
}

export default function GridPage() {
  const t = useT()
  const [config, setConfig]           = useState<GridConfig>(INITIAL_CONFIG)
  const [scale, setScale]             = useState(0.45) // SSR-safe default; corrected after mount
  const [isDownloading, setIsDownloading] = useState(false)
  const [selectedCells, setSelectedCells] = useState<Set<number>>(new Set())
  const [drawingState, setDrawingState]   = useState<DrawingState>({ tool: 'select', color: '#ff0000', strokeWidth: 5, fontSize: 24, elements: [] })
  const [panOffset, setPanOffset]     = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning]     = useState(false)
  const [panStart, setPanStart]       = useState({ x: 0, y: 0 })
  const [history, setHistory]         = useState<{ elements: DrawingElement[]; cells: Set<number> }[]>([{ elements: [], cells: new Set() }])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const canvasRef    = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Set window-aware initial scale after mount (avoids SSR/client hydration mismatch)
  const prevDims = useRef({ w: INITIAL_CONFIG.width, h: INITIAL_CONFIG.height })
  useEffect(() => {
    setScale(calcInitialScale(INITIAL_CONFIG.width, INITIAL_CONFIG.height))
  }, [])

  // Re-fit scale when canvas dimensions change
  useEffect(() => {
    const { w, h } = prevDims.current
    if (config.width !== w || config.height !== h) {
      prevDims.current = { w: config.width, h: config.height }
      setScale(calcInitialScale(config.width, config.height))
    }
  }, [config.width, config.height])

  // Pick up image sent from Studio detail modal
  useEffect(() => {
    const pending = localStorage.getItem('grid_pending_image')
    if (pending) {
      localStorage.removeItem('grid_pending_image')
      setConfig(c => ({ ...c, backgroundImage: pending, bgOffsetX: 0, bgOffsetY: 0 }))
    }
  }, [])

  // ── History ──
  const saveHistory = useCallback((elements: DrawingElement[], cells: Set<number>) => {
    setHistory(h => {
      const next = [...h.slice(0, historyIndex + 1), { elements: [...elements], cells: new Set(cells) }]
      if (next.length > 20) next.shift()
      return next
    })
    setHistoryIndex(i => Math.min(i + 1, 19))
  }, [historyIndex])

  const undo = useCallback(() => {
    if (historyIndex <= 0) return
    const prev = history[historyIndex - 1]
    setDrawingState(s => ({ ...s, elements: prev.elements }))
    setSelectedCells(prev.cells)
    setHistoryIndex(i => i - 1)
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const next = history[historyIndex + 1]
    setDrawingState(s => ({ ...s, elements: next.elements }))
    setSelectedCells(next.cells)
    setHistoryIndex(i => i + 1)
  }, [history, historyIndex])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  // ── Wheel zoom ──
  useEffect(() => {
    const el = containerRef.current; if (!el) return
    const handler = (e: WheelEvent) => { e.preventDefault(); setScale(s => Math.max(0.1, Math.min(3, s + (e.deltaY > 0 ? -0.08 : 0.08)))) }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // ── Pan ──
  function onMouseDown(e: React.MouseEvent) {
    if (!canvasRef.current?.contains(e.target as Node)) {
      setIsPanning(true); setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
    }
  }
  function onMouseMove(e: React.MouseEvent) {
    if (isPanning) setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
  }
  function onMouseUp() { setIsPanning(false) }

  // ── Clean capture ──
  // Captures the full canvas: hides UI overlays ([data-capture-hide]),
  // renders background image at full opacity (no white wash), injects a clean
  // red selection fill if cells are selected.
  async function captureClean(): Promise<string | null> {
    if (!canvasRef.current) return null
    const { default: html2canvas } = await import('html2canvas')

    // Hide UI-only overlays (grid cells, selection box, margin guides)
    const hidden = Array.from(
      canvasRef.current.querySelectorAll<HTMLElement>('[data-capture-hide]')
    )
    hidden.forEach(el => { el.style.visibility = 'hidden' })

    // Render background image at full opacity; use transparent canvas bg so
    // no white layer bleeds over the image
    const bgImg = canvasRef.current.querySelector<HTMLImageElement>(':scope > div > img')
    if (bgImg) bgImg.style.opacity = '1'
    const hasBg = !!config.backgroundImage

    // Inject clean selection fill if cells are selected
    let selOverlay: HTMLElement | null = null
    if (selectedCells.size > 0) {
      const { marginLeft, marginTop, width: cw, height: ch, columns, rows, colGap, rowGap } = config
      const marginRight  = config.marginRight
      const marginBottom = config.marginBottom
      const contentW = cw - marginLeft - marginRight
      const contentH = ch - marginTop  - marginBottom
      const colW = (contentW - (columns - 1) * colGap) / columns
      const rowH = (contentH - (rows    - 1) * rowGap) / rows

      const idxs = Array.from(selectedCells)
      let minC = columns, maxC = -1, minR = rows, maxR = -1
      idxs.forEach(i => {
        const c = i % columns, r = Math.floor(i / columns)
        if (c < minC) minC = c; if (c > maxC) maxC = c
        if (r < minR) minR = r; if (r > maxR) maxR = r
      })
      const cs = maxC - minC + 1, rs = maxR - minR + 1
      const sx = marginLeft + minC * (colW + colGap)
      const sy = marginTop  + minR * (rowH + rowGap)
      const sw = cs * colW  + (cs - 1) * colGap
      const sh = rs * rowH  + (rs - 1) * rowGap

      selOverlay = document.createElement('div')
      Object.assign(selOverlay.style, {
        position: 'absolute', zIndex: '5',
        left: `${sx}px`, top: `${sy}px`,
        width: `${sw}px`, height: `${sh}px`,
        background: 'rgba(239, 68, 68, 0.45)',
        pointerEvents: 'none',
      })
      canvasRef.current.appendChild(selOverlay)
    }

    const full = await html2canvas(canvasRef.current, {
      scale: 2, useCORS: true,
      backgroundColor: hasBg ? null : '#ffffff',
      logging: false,
    })

    // Restore
    hidden.forEach(el => { el.style.visibility = '' })
    if (bgImg) bgImg.style.opacity = ''
    if (selOverlay) canvasRef.current.removeChild(selOverlay)

    return full.toDataURL('image/png')
  }

  async function handleDownload() {
    if (!canvasRef.current) return
    setIsDownloading(true)
    try {
      const dataUrl = await captureClean()
      if (!dataUrl) return
      const a = document.createElement('a'); a.href = dataUrl
      a.download = `grid-${config.width}x${config.height}.png`; a.click()
    } catch { alert('下載失敗，請重試') }
    finally { setIsDownloading(false) }
  }

  async function handleSendToStudio() {
    if (!canvasRef.current) return
    setIsDownloading(true)
    try {
      const dataUrl = await captureClean()
      if (!dataUrl) return
      localStorage.setItem('studio_pending_ref', dataUrl)

      // If cells are selected, carry x/y range into the Studio prompt
      if (selectedCells.size > 0) {
        const { marginLeft, marginTop, marginRight, marginBottom, width, height, columns, rows, colGap, rowGap } = config
        const contentW = width  - marginLeft - marginRight
        const contentH = height - marginTop  - marginBottom
        const colW = (contentW - (columns - 1) * colGap) / columns
        const rowH = (contentH - (rows    - 1) * rowGap) / rows
        const idxs = Array.from(selectedCells)
        let minC = columns, maxC = -1, minR = rows, maxR = -1
        idxs.forEach(i => {
          const c = i % columns, r = Math.floor(i / columns)
          if (c < minC) minC = c; if (c > maxC) maxC = c
          if (r < minR) minR = r; if (r > maxR) maxR = r
        })
        const cs = maxC - minC + 1, rs = maxR - minR + 1
        const sx = marginLeft + minC * (colW + colGap)
        const sy = marginTop  + minR * (rowH + rowGap)
        const sw = cs * colW  + (cs - 1) * colGap
        const sh = rs * rowH  + (rs - 1) * rowGap
        const xStr = `x: ${((sx / width) * 100).toFixed(1)}% – ${(((sx + sw) / width) * 100).toFixed(1)}%`
        const yStr = `y: ${((sy / height) * 100).toFixed(1)}% – ${(((sy + sh) / height) * 100).toFixed(1)}%`
        localStorage.setItem('studio_pending_prompt', `${xStr}, ${yStr}`)
      }

      window.location.href = '/studio'
    } catch (e) {
      console.error(e)
      alert('截圖失敗，請重試')
    } finally {
      setIsDownloading(false)
    }
  }


  const DRAW_TOOLS = [
    { tool: 'pen',       icon: Pen,        title: '自由繪圖' },
    { tool: 'line',      icon: Minus,      title: '直線' },
    { tool: 'rectangle', icon: Square,     title: '矩形' },
    { tool: 'circle',    icon: Circle,     title: '圓形' },
    { tool: 'arrow',     icon: ArrowRight, title: '箭頭' },
    { tool: 'text',      icon: Type,       title: '文字' },
  ] as const

  const isDrawMode = drawingState.tool !== 'select'

  return (
    <div className="flex h-full w-full bg-[#0d0d12] overflow-hidden">

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <GridSidebar
          config={config}
          setConfig={setConfig}
          onDownload={handleDownload}
          onSendToStudio={handleSendToStudio}
          isDownloading={isDownloading}
          selectedCells={selectedCells}
          onClearSelection={() => setSelectedCells(new Set())}
        />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden relative">

        {/* ── Desktop toolbar ── */}
        <div className="hidden md:flex absolute top-3 left-1/2 -translate-x-1/2 z-20 items-center gap-1 bg-[#17171e] border border-white/[0.09] rounded-xl px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <button onClick={undo} disabled={historyIndex <= 0} title={t('grid.undo')}
            className="p-1.5 rounded-lg text-[#555] hover:text-white hover:bg-white/[0.07] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <Undo className="w-3.5 h-3.5"/>
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} title={t('grid.redo')}
            className="p-1.5 rounded-lg text-[#555] hover:text-white hover:bg-white/[0.07] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <Redo className="w-3.5 h-3.5"/>
          </button>
          <div className="w-px h-4 bg-white/[0.08] mx-1"/>
          <button onClick={() => setDrawingState(s => ({ ...s, tool: 'select' }))}
            className={`p-1.5 rounded-lg transition-colors ${!isDrawMode ? 'bg-[#FFD700] text-[#1a1a1a]' : 'text-[#555] hover:text-white hover:bg-white/[0.07]'}`}
            title={t('grid.selectTool')}>
            <MousePointer className="w-3.5 h-3.5"/>
          </button>
          <button onClick={() => setDrawingState(s => ({ ...s, tool: isDrawMode ? s.tool : 'pen' }))}
            className={`p-1.5 rounded-lg transition-colors ${isDrawMode ? 'bg-[#FFD700] text-[#1a1a1a]' : 'text-[#555] hover:text-white hover:bg-white/[0.07]'}`}
            title={t('grid.drawTool')}>
            <Pen className="w-3.5 h-3.5"/>
          </button>
          <button onClick={() => { setDrawingState(s => ({ ...s, elements: [], tool: 'select' })); setSelectedCells(new Set()) }}
            className="p-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-white/[0.07] transition-colors" title={t('grid.clearAll')}>
            <Trash2 className="w-3.5 h-3.5"/>
          </button>
          {isDrawMode && (
            <>
              <div className="w-px h-4 bg-white/[0.08] mx-1"/>
              {DRAW_TOOLS.map(({ tool, icon: Icon, title }) => (
                <button key={tool} onClick={() => setDrawingState(s => ({ ...s, tool }))}
                  className={`p-1.5 rounded-lg transition-colors ${drawingState.tool === tool ? 'bg-[#FFD700] text-[#1a1a1a]' : 'text-[#555] hover:text-white hover:bg-white/[0.07]'}`}
                  title={title}>
                  <Icon className="w-3.5 h-3.5"/>
                </button>
              ))}
              <div className="w-px h-4 bg-white/[0.08] mx-1"/>
              <input type="color" value={drawingState.color}
                onChange={e => setDrawingState(s => ({ ...s, color: e.target.value }))}
                className="w-6 h-6 rounded cursor-pointer border-0" title={t('grid.color')}/>
              <input type="range" min={2} max={12} value={drawingState.strokeWidth}
                onChange={e => setDrawingState(s => ({ ...s, strokeWidth: +e.target.value }))}
                className="w-16 accent-[#FFD700]" title={t('grid.brushSize')}/>
            </>
          )}
        </div>

        {/* ── Desktop zoom ── */}
        <div className="hidden md:flex absolute top-3 right-3 z-20 items-center gap-1 bg-[#17171e] border border-white/[0.09] rounded-xl px-1.5 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="p-1.5 hover:bg-white/[0.07] rounded-lg text-[#555] hover:text-white transition-colors"><ZoomOut className="w-3.5 h-3.5"/></button>
          <span className="text-[11px] font-mono text-[#555] w-12 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-1.5 hover:bg-white/[0.07] rounded-lg text-[#555] hover:text-white transition-colors"><ZoomIn className="w-3.5 h-3.5"/></button>
        </div>

        {/* ── Mobile toolbar row 1: mode + zoom ── */}
        <div className="md:hidden absolute top-2 left-2 right-2 z-20 flex items-center gap-1 bg-[#17171e] border border-white/[0.09] rounded-xl px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <button onClick={undo} disabled={historyIndex <= 0}
            className="p-1.5 rounded-lg text-[#555] hover:text-white hover:bg-white/[0.07] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <Undo className="w-3.5 h-3.5"/>
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-lg text-[#555] hover:text-white hover:bg-white/[0.07] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <Redo className="w-3.5 h-3.5"/>
          </button>
          <div className="w-px h-4 bg-white/[0.08] mx-0.5"/>
          <button onClick={() => setDrawingState(s => ({ ...s, tool: 'select' }))}
            className={`p-1.5 rounded-lg transition-colors ${!isDrawMode ? 'bg-[#FFD700] text-[#1a1a1a]' : 'text-[#555] hover:text-white hover:bg-white/[0.07]'}`}>
            <MousePointer className="w-3.5 h-3.5"/>
          </button>
          <button onClick={() => setDrawingState(s => ({ ...s, tool: isDrawMode ? s.tool : 'pen' }))}
            className={`p-1.5 rounded-lg transition-colors ${isDrawMode ? 'bg-[#FFD700] text-[#1a1a1a]' : 'text-[#555] hover:text-white hover:bg-white/[0.07]'}`}>
            <Pen className="w-3.5 h-3.5"/>
          </button>
          <button onClick={() => { setDrawingState(s => ({ ...s, elements: [], tool: 'select' })); setSelectedCells(new Set()) }}
            className="p-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-white/[0.07] transition-colors">
            <Trash2 className="w-3.5 h-3.5"/>
          </button>
          {/* Zoom – right side */}
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="p-1.5 hover:bg-white/[0.07] rounded-lg text-[#555] hover:text-white transition-colors"><ZoomOut className="w-3.5 h-3.5"/></button>
            <span className="text-[11px] font-mono text-[#555] w-10 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-1.5 hover:bg-white/[0.07] rounded-lg text-[#555] hover:text-white transition-colors"><ZoomIn className="w-3.5 h-3.5"/></button>
          </div>
        </div>

        {/* ── Mobile toolbar row 2: draw sub-tools (only in draw mode) ── */}
        {isDrawMode && (
          <div className="md:hidden absolute top-12 left-2 right-2 z-20 flex items-center gap-1 bg-[#17171e] border border-white/[0.09] rounded-xl px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            {DRAW_TOOLS.map(({ tool, icon: Icon, title }) => (
              <button key={tool} onClick={() => setDrawingState(s => ({ ...s, tool }))}
                className={`p-1.5 rounded-lg transition-colors ${drawingState.tool === tool ? 'bg-[#FFD700] text-[#1a1a1a]' : 'text-[#555] hover:text-white hover:bg-white/[0.07]'}`}
                title={title}>
                <Icon className="w-3.5 h-3.5"/>
              </button>
            ))}
            <div className="w-px h-4 bg-white/[0.08] mx-1"/>
            <input type="color" value={drawingState.color}
              onChange={e => setDrawingState(s => ({ ...s, color: e.target.value }))}
              className="w-6 h-6 rounded cursor-pointer border-0"/>
            <input type="range" min={2} max={12} value={drawingState.strokeWidth}
              onChange={e => setDrawingState(s => ({ ...s, strokeWidth: +e.target.value }))}
              className="flex-1 accent-[#FFD700]"/>
          </div>
        )}

        {/* Canvas area */}
        <div ref={containerRef}
          className="flex-1 flex items-center justify-center overflow-hidden"
          style={{ backgroundImage: 'radial-gradient(circle, #1e1e2e 1px, transparent 1px)', backgroundSize: '24px 24px', cursor: isPanning ? 'grabbing' : 'grab' }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
          <div style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)`, transition: isPanning ? 'none' : 'transform 0.1s', flexShrink: 0 }}>
            <GridCanvas
              ref={canvasRef}
              config={config}
              scale={scale}
              selectedCells={selectedCells}
              onToggleCell={i => setSelectedCells(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n })}
              onSelectRange={(start, end) => {
                const sr = Math.floor(start / config.columns), sc = start % config.columns
                const er = Math.floor(end   / config.columns), ec = end   % config.columns
                const sel = new Set<number>()
                for (let r = Math.min(sr,er); r <= Math.max(sr,er); r++)
                  for (let c = Math.min(sc,ec); c <= Math.max(sc,ec); c++)
                    sel.add(r * config.columns + c)
                saveHistory(drawingState.elements, sel)
                setSelectedCells(sel)
              }}
              drawingState={drawingState}
              onDrawingChange={s => { saveHistory(s.elements, selectedCells); setDrawingState(s) }}
            />
          </div>
        </div>
      </div>

      {/* Mobile FAB – open sidebar */}
      <button onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed bottom-5 left-5 z-30 w-12 h-12 rounded-full bg-[#FFD700] text-[#1a1a1a] shadow-lg flex items-center justify-center">
        <SlidersHorizontal className="w-5 h-5"/>
      </button>

      {/* Mobile bottom sheet */}
      <div className="md:hidden">
        {/* Backdrop */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setSidebarOpen(false)} />
        )}
        {/* Sheet */}
        <div className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ height: '72vh', display: 'flex', flexDirection: 'column' }}>
          <GridSidebar
            config={config}
            setConfig={setConfig}
            onDownload={handleDownload}
            onSendToStudio={handleSendToStudio}
            isDownloading={isDownloading}
            selectedCells={selectedCells}
            onClearSelection={() => setSelectedCells(new Set())}
            isMobile
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      </div>
    </div>
  )
}
