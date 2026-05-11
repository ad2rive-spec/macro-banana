'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { ZoomIn, ZoomOut, MousePointer, Pen, Minus, Square, Circle, ArrowRight, Type, Trash2, Undo, Redo } from 'lucide-react'
import { GridCanvas } from './GridCanvas'
import { GridSidebar } from './GridSidebar'
import { GridConfig, DrawingState, DrawingElement } from './types'

const INITIAL_CONFIG: GridConfig = {
  width: 1080, height: 1080,
  columns: 12, rows: 12,
  colGap: 10, rowGap: 10,
  marginTop: 50, marginBottom: 50, marginLeft: 50, marginRight: 50,
  backgroundImage: null, bgOffsetX: 0, bgOffsetY: 0,
}

export default function GridPage() {
  const [config, setConfig]           = useState<GridConfig>(INITIAL_CONFIG)
  const [scale, setScale]             = useState(0.45)
  const [isDownloading, setIsDownloading] = useState(false)
  const [selectedCells, setSelectedCells] = useState<Set<number>>(new Set())
  const [drawingState, setDrawingState]   = useState<DrawingState>({ tool: 'select', color: '#ff0000', strokeWidth: 5, fontSize: 24, elements: [] })
  const [panOffset, setPanOffset]     = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning]     = useState(false)
  const [panStart, setPanStart]       = useState({ x: 0, y: 0 })
  const [history, setHistory]         = useState<{ elements: DrawingElement[]; cells: Set<number> }[]>([{ elements: [], cells: new Set() }])
  const [historyIndex, setHistoryIndex] = useState(0)

  const canvasRef   = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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

  // ── Download ──
  async function captureCanvas(): Promise<string | null> {
    if (!canvasRef.current) return null
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(canvasRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false })
    return canvas.toDataURL('image/png')
  }

  async function handleDownload() {
    if (!canvasRef.current) return
    setIsDownloading(true)
    try {
      const dataUrl = await captureCanvas()
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
      const { default: html2canvas } = await import('html2canvas')

      // Temporarily hide the grid overlay (red cells) before capturing
      const gridOverlay = canvasRef.current.querySelector<HTMLElement>('.absolute.inset-0.z-10')
      if (gridOverlay) gridOverlay.style.visibility = 'hidden'

      const full = await html2canvas(canvasRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false
      })

      // Restore grid overlay
      if (gridOverlay) gridOverlay.style.visibility = ''

      let cropDataUrl: string

      if (selectedCells.size > 0) {
        // Compute selected cells bounding box in canvas pixels
        const contentW = config.width  - config.marginLeft - config.marginRight
        const contentH = config.height - config.marginTop  - config.marginBottom
        const colW = (contentW - (config.columns - 1) * config.colGap) / config.columns
        const rowH = (contentH - (config.rows    - 1) * config.rowGap) / config.rows

        const idxs = Array.from(selectedCells)
        let minC = config.columns, maxC = -1, minR = config.rows, maxR = -1
        idxs.forEach(i => {
          const c = i % config.columns, r = Math.floor(i / config.columns)
          if (c < minC) minC = c; if (c > maxC) maxC = c
          if (r < minR) minR = r; if (r > maxR) maxR = r
        })

        const cs = maxC - minC + 1, rs = maxR - minR + 1

        // Bounding box: from start of first selected cell to end of last (no gaps at edges)
        const sx = config.marginLeft + minC * (colW + config.colGap)
        const sy = config.marginTop  + minR * (rowH + config.rowGap)
        // Fill as solid rectangle: span across all selected cols/rows including inner gaps
        const sw = cs * colW + (cs - 1) * config.colGap
        const sh = rs * rowH + (rs - 1) * config.rowGap

        // Crop from full canvas (scale 2)
        const crop = document.createElement('canvas')
        crop.width  = Math.round(sw * 2)
        crop.height = Math.round(sh * 2)
        const ctx = crop.getContext('2d')!
        // White background so the result is a clean solid rectangle
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, crop.width, crop.height)
        ctx.drawImage(full, sx * 2, sy * 2, sw * 2, sh * 2, 0, 0, sw * 2, sh * 2)
        cropDataUrl = crop.toDataURL('image/png')
      } else {
        // No selection — send full canvas without grid
        cropDataUrl = full.toDataURL('image/png')
      }

      localStorage.setItem('studio_pending_ref', cropDataUrl)
      window.location.href = '/studio'
    } catch (e) {
      console.error(e)
      alert('截圖失敗，請重試')
    } finally {
      setIsDownloading(false)
    }
  }

  // ── Share ──
  function generateShareUrl() {
    const p = new URLSearchParams()
    const keys = ['width','height','columns','rows','colGap','rowGap','marginTop','marginBottom','marginLeft','marginRight','bgOffsetX','bgOffsetY'] as const
    keys.forEach(k => p.set(k, String((config as any)[k])))
    if (selectedCells.size > 0) p.set('selected', Array.from(selectedCells).sort((a,b)=>a-b).join(','))
    return `${window.location.origin}${window.location.pathname}?${p.toString()}`
  }

  const DRAW_TOOLS = [
    { tool: 'pen',       icon: Pen,        title: '自由繪圖' },
    { tool: 'line',      icon: Minus,      title: '直線' },
    { tool: 'rectangle', icon: Square,     title: '矩形' },
    { tool: 'circle',    icon: Circle,     title: '圓形' },
    { tool: 'arrow',     icon: ArrowRight, title: '箭頭' },
    { tool: 'text',      icon: Type,       title: '文字' },
  ] as const

  return (
    <div className="flex h-full w-full bg-[#0d0d12] overflow-hidden">

      {/* Sidebar */}
      <GridSidebar
        config={config}
        setConfig={setConfig}
        onDownload={handleDownload}
        onSendToStudio={handleSendToStudio}
        isDownloading={isDownloading}
        selectedCells={selectedCells}
        onShare={generateShareUrl}
        onClearSelection={() => setSelectedCells(new Set())}
      />

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden relative">

        {/* Toolbar */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-[#17171e] border border-white/[0.09] rounded-xl px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {/* Undo / Redo */}
          <button onClick={undo} disabled={historyIndex <= 0} title="復原 (⌘Z)"
            className="p-1.5 rounded-lg text-[#555] hover:text-white hover:bg-white/[0.07] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <Undo className="w-3.5 h-3.5"/>
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} title="重做 (⌘Y)"
            className="p-1.5 rounded-lg text-[#555] hover:text-white hover:bg-white/[0.07] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <Redo className="w-3.5 h-3.5"/>
          </button>

          <div className="w-px h-4 bg-white/[0.08] mx-1"/>

          {/* Select / Draw mode */}
          <button onClick={() => setDrawingState(s => ({ ...s, tool: 'select' }))}
            className={`p-1.5 rounded-lg transition-colors ${drawingState.tool === 'select' ? 'bg-[#FFD700] text-[#1a1a1a]' : 'text-[#555] hover:text-white hover:bg-white/[0.07]'}`}
            title="選取網格">
            <MousePointer className="w-3.5 h-3.5"/>
          </button>
          <button onClick={() => setDrawingState(s => ({ ...s, tool: s.tool === 'select' ? 'pen' : s.tool }))}
            className={`p-1.5 rounded-lg transition-colors ${drawingState.tool !== 'select' ? 'bg-[#FFD700] text-[#1a1a1a]' : 'text-[#555] hover:text-white hover:bg-white/[0.07]'}`}
            title="塗鴉工具">
            <Pen className="w-3.5 h-3.5"/>
          </button>
          <button onClick={() => { setDrawingState(s => ({ ...s, elements: [], tool: 'select' })); setSelectedCells(new Set()) }}
            className="p-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-white/[0.07] transition-colors" title="清除全部">
            <Trash2 className="w-3.5 h-3.5"/>
          </button>

          {/* Drawing sub-tools */}
          {drawingState.tool !== 'select' && (
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
                className="w-6 h-6 rounded cursor-pointer border-0" title="顏色"/>
              <input type="range" min={2} max={12} value={drawingState.strokeWidth}
                onChange={e => setDrawingState(s => ({ ...s, strokeWidth: +e.target.value }))}
                className="w-16 accent-[#FFD700]" title="筆刷粗細"/>
            </>
          )}
        </div>

        {/* Zoom controls */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-[#17171e] border border-white/[0.09] rounded-xl px-1.5 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="p-1.5 hover:bg-white/[0.07] rounded-lg text-[#555] hover:text-white transition-colors"><ZoomOut className="w-3.5 h-3.5"/></button>
          <span className="text-[11px] font-mono text-[#555] w-12 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-1.5 hover:bg-white/[0.07] rounded-lg text-[#555] hover:text-white transition-colors"><ZoomIn className="w-3.5 h-3.5"/></button>
        </div>

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
    </div>
  )
}
