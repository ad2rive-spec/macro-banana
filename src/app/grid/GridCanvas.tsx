'use client'
import { forwardRef, useState, useRef } from 'react'
import { GridConfig, DrawingState, DrawingElement } from './types'

interface CanvasProps {
  config: GridConfig
  scale: number
  selectedCells: Set<number>
  onToggleCell: (index: number) => void
  onSelectRange: (start: number, end: number) => void
  drawingState: DrawingState
  onDrawingChange: (state: DrawingState) => void
}

export const GridCanvas = forwardRef<HTMLDivElement, CanvasProps>(
  ({ config, scale, selectedCells, onToggleCell, onSelectRange, drawingState, onDrawingChange }, ref) => {
    const [isDragging, setIsDragging]   = useState(false)
    const [dragStart, setDragStart]     = useState<number | null>(null)
    const [dragCurrent, setDragCurrent] = useState<number | null>(null)
    const [isDrawing, setIsDrawing]     = useState(false)
    const [currentEl, setCurrentEl]     = useState<DrawingElement | null>(null)

    function getPos(e: React.MouseEvent | React.TouchEvent) {
      if (!ref || typeof ref === 'function' || !ref.current) return { x: 0, y: 0 }
      const rect = ref.current.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale }
    }

    // ── Grid cell handlers ──
    function cellDown(i: number, e: React.MouseEvent) {
      e.stopPropagation()
      setIsDragging(false); setDragStart(i); setDragCurrent(i)
    }
    function cellEnter(i: number) {
      if (dragStart !== null && dragCurrent !== i) { setIsDragging(true); setDragCurrent(i) }
    }
    function cellUp() {
      if (dragStart !== null) {
        if (isDragging && dragCurrent !== null) onSelectRange(dragStart, dragCurrent)
        else onToggleCell(dragStart)
      }
      setIsDragging(false); setDragStart(null); setDragCurrent(null)
    }

    // ── Touch cell selection (drag support) ──
    function getCellIndexFromPoint(clientX: number, clientY: number): number | null {
      const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null
      if (!el) return null
      const cell = el.closest<HTMLElement>('[data-cell-index]')
      if (!cell) return null
      const idx = parseInt(cell.dataset.cellIndex ?? '', 10)
      return isNaN(idx) ? null : idx
    }
    function cellTouchStart(i: number, e: React.TouchEvent) {
      if (drawingState.tool !== 'select') return
      e.stopPropagation()
      e.preventDefault()
      setIsDragging(false); setDragStart(i); setDragCurrent(i)
    }
    function cellTouchMove(e: React.TouchEvent) {
      if (dragStart === null || drawingState.tool !== 'select') return
      e.preventDefault()
      const t = e.touches[0]
      const idx = getCellIndexFromPoint(t.clientX, t.clientY)
      if (idx !== null && idx !== dragCurrent) { setIsDragging(true); setDragCurrent(idx) }
    }
    function cellTouchEnd() {
      if (dragStart !== null) {
        if (isDragging && dragCurrent !== null) onSelectRange(dragStart, dragCurrent)
        else onToggleCell(dragStart)
      }
      setIsDragging(false); setDragStart(null); setDragCurrent(null)
    }

    // ── Drawing handlers ──
    function drawDown(e: React.MouseEvent | React.TouchEvent) {
      if (drawingState.tool === 'select') return
      e.preventDefault()
      const pos = getPos(e)
      const el: DrawingElement = {
        id: Date.now().toString(), type: drawingState.tool,
        x: pos.x, y: pos.y,
        color: drawingState.color, strokeWidth: drawingState.strokeWidth, fontSize: drawingState.fontSize,
        points: drawingState.tool === 'pen' ? [pos] : undefined,
      }
      setCurrentEl(el); setIsDrawing(true)
    }
    function drawMove(e: React.MouseEvent | React.TouchEvent) {
      if (!isDrawing || !currentEl) return
      const pos = getPos(e)
      const updated = { ...currentEl }
      if (drawingState.tool === 'pen') updated.points = [...(updated.points || []), pos]
      else { updated.x2 = pos.x; updated.y2 = pos.y; updated.width = pos.x - updated.x; updated.height = pos.y - updated.y }
      setCurrentEl(updated)
    }
    function drawUp() {
      if (isDrawing && currentEl) {
        if (drawingState.tool === 'text') {
          const text = prompt('輸入文字:')
          if (text) onDrawingChange({ ...drawingState, elements: [...drawingState.elements, { ...currentEl, text }] })
        } else {
          onDrawingChange({ ...drawingState, elements: [...drawingState.elements, currentEl] })
        }
      }
      setIsDrawing(false); setCurrentEl(null)
    }

    // ── Drag selection preview ──
    function getDragSel() {
      if (!isDragging || dragStart === null || dragCurrent === null) return new Set<number>()
      const sr = Math.floor(dragStart / config.columns), sc = dragStart % config.columns
      const er = Math.floor(dragCurrent / config.columns), ec = dragCurrent % config.columns
      const sel = new Set<number>()
      for (let r = Math.min(sr, er); r <= Math.max(sr, er); r++)
        for (let c = Math.min(sc, ec); c <= Math.max(sc, ec); c++)
          sel.add(r * config.columns + c)
      return sel
    }
    const dragSel = getDragSel()

    // ── Selection bounding box overlay ──
    function getSelectionRect(cells: Set<number>): { left: number; top: number; width: number; height: number } | null {
      if (cells.size === 0) return null
      const { columns, rows, colGap, rowGap, marginLeft, marginTop, marginRight, marginBottom, width, height } = config
      const contentW = width  - marginLeft - marginRight
      const contentH = height - marginTop  - marginBottom
      const colW = (contentW - (columns - 1) * colGap) / columns
      const rowH = (contentH - (rows    - 1) * rowGap) / rows
      let minC = columns, maxC = -1, minR = rows, maxR = -1
      cells.forEach(i => {
        const c = i % columns, r = Math.floor(i / columns)
        if (c < minC) minC = c; if (c > maxC) maxC = c
        if (r < minR) minR = r; if (r > maxR) maxR = r
      })
      const cs = maxC - minC + 1, rs = maxR - minR + 1
      return {
        left:   marginLeft + minC * (colW + colGap),
        top:    marginTop  + minR * (rowH + rowGap),
        width:  cs * colW  + (cs - 1) * colGap,
        height: rs * rowH  + (rs - 1) * rowGap,
      }
    }

    // While dragging: show only the live drag rect (hide old selection to avoid confusion)
    // When idle: show the committed selection rect
    const selRect = isDragging
      ? getSelectionRect(dragSel)
      : getSelectionRect(selectedCells)

    // ── Render drawing element ──
    function renderEl(el: DrawingElement) {
      const svgStyle = { position: 'absolute' as const, left: 0, top: 0, pointerEvents: 'none' as const, width: '100%', height: '100%' }
      switch (el.type) {
        case 'text':
          return <div key={el.id} style={{ position: 'absolute', left: el.x, top: el.y, color: el.color, fontSize: el.fontSize, fontFamily: 'Arial Black, sans-serif', fontWeight: 900, pointerEvents: 'none' }}>{el.text}</div>
        case 'pen':
          if (!el.points || el.points.length < 2) return null
          return <svg key={el.id} style={svgStyle}><path d={el.points.reduce((p, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${p} L ${pt.x} ${pt.y}`, '')} stroke={el.color} strokeWidth={el.strokeWidth} fill="none"/></svg>
        case 'line':
          if (!el.x2 || !el.y2) return null
          return <svg key={el.id} style={svgStyle}><line x1={el.x} y1={el.y} x2={el.x2} y2={el.y2} stroke={el.color} strokeWidth={el.strokeWidth}/></svg>
        case 'rectangle':
          if (!el.width || !el.height) return null
          return <svg key={el.id} style={svgStyle}><rect x={el.width < 0 ? el.x + el.width : el.x} y={el.height < 0 ? el.y + el.height : el.y} width={Math.abs(el.width)} height={Math.abs(el.height)} stroke={el.color} strokeWidth={el.strokeWidth} fill="none"/></svg>
        case 'circle': {
          if (!el.width || !el.height) return null
          const r = Math.sqrt(el.width ** 2 + el.height ** 2) / 2
          return <svg key={el.id} style={svgStyle}><circle cx={el.x + el.width / 2} cy={el.y + el.height / 2} r={r} stroke={el.color} strokeWidth={el.strokeWidth} fill="none"/></svg>
        }
        case 'arrow': {
          if (!el.x2 || !el.y2) return null
          const angle = Math.atan2(el.y2 - el.y, el.x2 - el.x)
          const al = Math.max(10, el.strokeWidth * 3), aa = Math.PI / 6
          return <svg key={el.id} style={svgStyle}>
            <line x1={el.x} y1={el.y} x2={el.x2} y2={el.y2} stroke={el.color} strokeWidth={el.strokeWidth}/>
            <line x1={el.x2} y1={el.y2} x2={el.x2 - al * Math.cos(angle - aa)} y2={el.y2 - al * Math.sin(angle - aa)} stroke={el.color} strokeWidth={el.strokeWidth}/>
            <line x1={el.x2} y1={el.y2} x2={el.x2 - al * Math.cos(angle + aa)} y2={el.y2 - al * Math.sin(angle + aa)} stroke={el.color} strokeWidth={el.strokeWidth}/>
          </svg>
        }
        default: return null
      }
    }

    const { width, height, columns, rows, colGap, rowGap, marginLeft, marginRight, marginTop, marginBottom, backgroundImage, bgOffsetX, bgOffsetY } = config
    const isPortrait = height > width

    return (
      <div ref={ref} className="relative shadow-2xl bg-white overflow-hidden"
        style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'center center' }}>

        {/* Background image */}
        {backgroundImage && (
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img src={backgroundImage} alt="" className="absolute opacity-50"
              style={{ height: isPortrait ? '100%' : 'auto', width: !isPortrait ? '100%' : 'auto', maxWidth: 'none', maxHeight: 'none', transform: `translate(${bgOffsetX}px, ${bgOffsetY}px)` }} />
          </div>
        )}

        {/* Grid */}
        <div className="absolute inset-0 z-10" data-capture-hide
          style={{ paddingTop: marginTop, paddingBottom: marginBottom, paddingLeft: marginLeft, paddingRight: marginRight }}>
          <div className="w-full h-full"
            style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, columnGap: colGap, rowGap }}
            onMouseDown={drawingState.tool !== 'select' ? drawDown : undefined}
            onMouseMove={drawingState.tool !== 'select' ? drawMove : undefined}
            onMouseUp={drawingState.tool !== 'select' ? drawUp : cellUp}
            onMouseLeave={cellUp}
            onTouchStart={drawingState.tool !== 'select' ? drawDown : undefined}
            onTouchMove={drawingState.tool !== 'select' ? drawMove : cellTouchMove}
            onTouchEnd={drawingState.tool !== 'select' ? drawUp : cellTouchEnd}>
            {Array.from({ length: columns * rows }).map((_, i) => (
              <div key={i} data-cell-index={i}
                onMouseDown={drawingState.tool === 'select' ? e => cellDown(i, e) : undefined}
                onMouseEnter={drawingState.tool === 'select' ? () => cellEnter(i) : undefined}
                onTouchStart={drawingState.tool === 'select' ? e => cellTouchStart(i, e) : undefined}
                className={`w-full h-full border transition-all select-none touch-none ${drawingState.tool === 'select' ? 'cursor-pointer' : 'pointer-events-none'} bg-red-500/10 border-red-500/20 hover:bg-red-500/20`} />
            ))}
          </div>
        </div>

        {/* Selection bounding box overlay */}
        {selRect && (
          <div className="absolute z-20 pointer-events-none" data-capture-hide style={{
            left: selRect.left, top: selRect.top,
            width: selRect.width, height: selRect.height,
            background: 'rgba(239, 68, 68, 0.5)',
            border: '2px solid rgba(239, 68, 68, 0.9)',
            boxShadow: '0 0 0 1px rgba(239,68,68,0.3)',
          }} />
        )}

        {/* Drawing layer */}
        <div className="absolute inset-0 z-30 pointer-events-none">
          {drawingState.elements.map(renderEl)}
          {currentEl && renderEl(currentEl)}
        </div>

        {/* Margin guides */}
        <div className="absolute inset-0 pointer-events-none z-20" data-capture-hide>
          <div className="absolute top-0 bottom-0 border-r border-yellow-500/20 border-dashed" style={{ left: marginLeft }} />
          <div className="absolute top-0 bottom-0 border-l border-yellow-500/20 border-dashed" style={{ right: marginRight }} />
          <div className="absolute left-0 right-0 border-b border-yellow-500/20 border-dashed" style={{ top: marginTop }} />
          <div className="absolute left-0 right-0 border-t border-yellow-500/20 border-dashed" style={{ bottom: marginBottom }} />
          <div className="absolute bottom-2 right-2 text-[10px] text-yellow-100 font-mono bg-slate-900/80 px-2 py-1 rounded border border-slate-700">
            {width}×{height}px
          </div>
        </div>
      </div>
    )
  }
)
GridCanvas.displayName = 'GridCanvas'
