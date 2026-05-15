'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@/lib/LanguageContext'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EditParams {
  model: string
  ratio: string
  resolution: string
  quality: string
  background: string
}

interface MaskEditorProps {
  imageUrl: string
  initialParams?: Partial<EditParams>
  onConfirm: (maskDataUrl: string, prompt: string, params: EditParams, refs: File[]) => void
  onCancel: () => void
}

type Tool = 'brush' | 'eraser'
type PopoverId = 'model' | 'ratio' | 'resolution' | 'quality' | 'background' | null

// ── Image model data (inpainting only — no video models) ──────────────────────

const IMAGE_MODELS = [
  { value: 'gpt-image-2',     label: 'GPT Image 2' },
  { value: 'nano-banana-2',   label: 'Nano Banana 2' },
  { value: 'nano-banana-pro', label: 'Nano Banana Pro' },
]

const MODEL_OPTS: Record<string, { ratios: string[]; resolutions: string[]; qualities?: string[]; background?: string[] }> = {
  'gpt-image-2': {
    ratios:      ['auto', '1:1', '3:4', '9:16', '4:3', '16:9'],
    resolutions: ['1K', '2K', '4K'],
    qualities:   ['low', 'medium', 'high', 'auto'],
    background:  ['auto', 'transparent', 'opaque'],
  },
  'nano-banana-2': {
    ratios:      ['auto', '1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9'],
    resolutions: ['512', '1K', '2K', '4K'],
  },
  'nano-banana-pro': {
    ratios:      ['auto', '1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9'],
    resolutions: ['1K', '2K', '4K'],
  },
}

function getOpts(model: string) {
  return MODEL_OPTS[model] ?? MODEL_OPTS['gpt-image-2']
}

function clampToList<T>(value: T, list: T[]): T {
  return list.includes(value) ? value : list[0]
}

// ── Pill button ───────────────────────────────────────────────────────────────

function Pill({
  icon, label, active, onClick,
}: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border cursor-pointer transition-all whitespace-nowrap flex-shrink-0
        ${active
          ? 'bg-white/15 border-white/20 text-white'
          : 'bg-white/[0.06] border-white/[0.08] text-[#888] hover:text-white hover:bg-white/10'
        }`}
    >
      {icon}
      {label}
      <iconify-icon icon="lucide:chevron-down" width="10" height="10" style={{ opacity: 0.5 }} />
    </button>
  )
}

// ── Popover panel (portal — renders into body to escape overflow:hidden) ────────

function PopoverPanel({
  children, onClose, anchorRef,
}: { children: React.ReactNode; onClose: () => void; anchorRef: React.RefObject<HTMLDivElement | null> }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  // Measure anchor position after mount
  useEffect(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    // Place above the anchor, aligned to left edge
    setPos({ top: rect.top - 8, left: rect.left })
  }, [anchorRef])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node
      if (
        ref.current && !ref.current.contains(target) &&
        anchorRef.current && !anchorRef.current.contains(target)
      ) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorRef])

  if (!pos || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={ref}
      style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translateY(-100%)', zIndex: 99999 }}
      className="bg-[#1c1c26] border border-white/[0.1] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] min-w-[160px] overflow-hidden"
    >
      {children}
    </div>,
    document.body,
  )
}

function OptionItem({
  label, hint, active, onClick,
}: { label: string; hint?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left border-none cursor-pointer transition-all
        ${active ? 'bg-white/10 text-white' : 'bg-transparent text-[#888] hover:bg-white/[0.06] hover:text-white'}`}
    >
      <div>
        <div className="text-[12px] font-medium">{label}</div>
        {hint && <div className="text-[10px] text-[#555] mt-0.5">{hint}</div>}
      </div>
      {active && <iconify-icon icon="lucide:check" width="12" height="12" style={{ color: '#FFD700', flexShrink: 0 }} />}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function MaskEditor({ imageUrl, initialParams, onConfirm, onCancel }: MaskEditorProps) {
  const t = useT()
  const imageRef     = useRef<HTMLImageElement>(null)
  const maskRef      = useRef<HTMLCanvasElement>(null)
  const displayRef   = useRef<HTMLCanvasElement>(null)
  const borderRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [tool, setTool]           = useState<Tool>('brush')
  const [brushSize, setBrushSize] = useState(40)
  const [prompt, setPrompt]       = useState('')
  const [refs, setRefs]           = useState<File[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const refFileRef = useRef<HTMLInputElement>(null)
  const promptInputRef = useRef<HTMLInputElement>(null)
  const [imgSize, setImgSize]     = useState({ w: 0, h: 0 })
  const [history, setHistory]     = useState<ImageData[]>([])
  const [redoStack, setRedoStack] = useState<ImageData[]>([])
  const [cursorPos, setCursorPos] = useState({ x: -999, y: -999 })
  const [insideCanvas, setInsideCanvas] = useState(false)
  const [naturalSize, setNaturalSize]   = useState({ w: 0, h: 0 })
  const [openPop, setOpenPop]           = useState<PopoverId>(null)

  // ── Edit params state ─────────────────────────────────────────────────────
  const defaultModel = initialParams?.model ?? 'gpt-image-2'
  const defaultOpts  = getOpts(defaultModel)
  const [editModel, setEditModel]       = useState(defaultModel)
  const [editRatio, setEditRatio]       = useState(clampToList(initialParams?.ratio ?? 'auto', defaultOpts.ratios))
  const [editRes,   setEditRes]         = useState(clampToList(initialParams?.resolution ?? '1K', defaultOpts.resolutions))
  const [editQuality, setEditQuality]   = useState(initialParams?.quality ?? 'medium')
  const [editBg,    setEditBg]          = useState(initialParams?.background ?? 'auto')

  const modelOpts = getOpts(editModel)

  function changeModel(m: string) {
    const opts = getOpts(m)
    setEditModel(m)
    setEditRatio(clampToList(editRatio, opts.ratios))
    setEditRes(clampToList(editRes, opts.resolutions))
    setOpenPop(null)
  }

  // Refs for pill popovers (portal anchor measurement)
  const popRefs = {
    model:      useRef<HTMLDivElement>(null),
    ratio:      useRef<HTMLDivElement>(null),
    resolution: useRef<HTMLDivElement>(null),
    quality:    useRef<HTMLDivElement>(null),
    background: useRef<HTMLDivElement>(null),
  }

  const animFrameRef  = useRef<number>(0)
  const dashOffsetRef = useRef(0)

  // ── Compute fit size ──────────────────────────────────────────────────────
  const computeSize = useCallback((natW: number, natH: number) => {
    const c = containerRef.current
    if (!c || natW === 0 || natH === 0) return
    const { width, height } = c.getBoundingClientRect()
    const maxW = width  - 32
    const maxH = height - 32
    if (maxW <= 0 || maxH <= 0) return
    const scale = Math.min(maxW / natW, maxH / natH, 1)
    setImgSize({ w: Math.round(natW * scale), h: Math.round(natH * scale) })
  }, [])

  // ── Load image ────────────────────────────────────────────────────────────
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
      requestAnimationFrame(() => computeSize(img.naturalWidth, img.naturalHeight))
    }
    img.src = imageUrl
  }, [imageUrl, computeSize])

  // ── Resize observer ───────────────────────────────────────────────────────
  useEffect(() => {
    const c = containerRef.current
    if (!c || naturalSize.w === 0) return
    const ro = new ResizeObserver(() => computeSize(naturalSize.w, naturalSize.h))
    ro.observe(c)
    computeSize(naturalSize.w, naturalSize.h)
    return () => ro.disconnect()
  }, [naturalSize, computeSize])

  // ── Redraw display canvas ─────────────────────────────────────────────────
  const redrawDisplay = useCallback(() => {
    const mask    = maskRef.current
    const display = displayRef.current
    if (!mask || !display) return
    const mCtx = mask.getContext('2d', { willReadFrequently: true })!
    const dCtx = display.getContext('2d')!
    const { width, height } = mask
    dCtx.clearRect(0, 0, width, height)
    const maskData = mCtx.getImageData(0, 0, width, height)
    const out      = dCtx.createImageData(width, height)
    const [r, g, b, a] = [99, 179, 237, Math.round(0.45 * 255)]
    for (let i = 0; i < maskData.data.length; i += 4) {
      if (maskData.data[i] > 128) {
        out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b; out.data[i + 3] = a
      }
    }
    dCtx.putImageData(out, 0, 0)
  }, [])

  // ── Marching ants border ──────────────────────────────────────────────────
  useEffect(() => {
    if (imgSize.w === 0) return
    function animate() {
      const border = borderRef.current
      const mask   = maskRef.current
      if (!border || !mask) { animFrameRef.current = requestAnimationFrame(animate); return }
      const ctx = border.getContext('2d', { willReadFrequently: true })!
      const { width, height } = border
      ctx.clearRect(0, 0, width, height)
      const mCtx = mask.getContext('2d', { willReadFrequently: true })!
      const maskData   = mCtx.getImageData(0, 0, width, height)
      const borderData = ctx.createImageData(width, height)
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const i = (y * width + x) * 4
          if (maskData.data[i] <= 128) continue
          const nb = [
            maskData.data[((y-1)*width+x)*4],
            maskData.data[((y+1)*width+x)*4],
            maskData.data[(y*width+(x-1))*4],
            maskData.data[(y*width+(x+1))*4],
          ]
          if (nb.some(v => v <= 128)) {
            borderData.data[i] = borderData.data[i+1] = borderData.data[i+2] = borderData.data[i+3] = 255
          }
        }
      }
      ctx.putImageData(borderData, 0, 0)
      const offset   = Math.floor(dashOffsetRef.current) % 12
      const animated = ctx.getImageData(0, 0, width, height)
      let cnt = 0
      for (let i = 0; i < animated.data.length; i += 4) {
        if (animated.data[i+3] > 0) {
          const w = (cnt + offset) % 12 < 6
          animated.data[i] = animated.data[i+1] = animated.data[i+2] = w ? 255 : 0
          animated.data[i+3] = w ? 230 : 180
          cnt++
        }
      }
      ctx.putImageData(animated, 0, 0)
      dashOffsetRef.current += 0.4
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [imgSize])

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  const saveSnapshot = useCallback(() => {
    const mask = maskRef.current; if (!mask) return
    const ctx  = mask.getContext('2d', { willReadFrequently: true })!
    setHistory(prev => [...prev.slice(-19), ctx.getImageData(0, 0, mask.width, mask.height)])
    setRedoStack([])
  }, [])

  const undo = useCallback(() => {
    const mask = maskRef.current; if (!mask || history.length === 0) return
    const ctx  = mask.getContext('2d', { willReadFrequently: true })!
    const prev = history[history.length - 1]
    setRedoStack(r => [...r, ctx.getImageData(0, 0, mask.width, mask.height)])
    setHistory(h => h.slice(0, -1))
    ctx.putImageData(prev, 0, 0)
    redrawDisplay()
  }, [history, redrawDisplay])

  const redo = useCallback(() => {
    const mask = maskRef.current; if (!mask || redoStack.length === 0) return
    const ctx  = mask.getContext('2d', { willReadFrequently: true })!
    const next = redoStack[redoStack.length - 1]
    setHistory(h => [...h, ctx.getImageData(0, 0, mask.width, mask.height)])
    setRedoStack(r => r.slice(0, -1))
    ctx.putImageData(next, 0, 0)
    redrawDisplay()
  }, [redoStack, redrawDisplay])

  // ── Draw helpers ──────────────────────────────────────────────────────────
  function getPosFromClient(clientX: number, clientY: number) {
    const canvas = displayRef.current!
    const rect   = canvas.getBoundingClientRect()
    return {
      x: (clientX - rect.left) * (canvas.width  / rect.width),
      y: (clientY - rect.top)  * (canvas.height / rect.height),
    }
  }

  function paintMask(x: number, y: number) {
    const mask = maskRef.current!
    const ctx  = mask.getContext('2d', { willReadFrequently: true })!
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.fillStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : 'white'
    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
    redrawDisplay()
  }

  // Mouse handlers (React synthetic events — fine for mouse)
  function startDraw(e: React.MouseEvent) {
    e.preventDefault(); saveSnapshot(); setIsDrawing(true)
    const { x, y } = getPosFromClient(e.clientX, e.clientY); paintMask(x, y)
  }
  function onMouseMove(e: React.MouseEvent) {
    const canvas = displayRef.current!
    const rect   = canvas.getBoundingClientRect()
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    if (isDrawing) { const { x, y } = getPosFromClient(e.clientX, e.clientY); paintMask(x, y) }
  }
  function stopDraw() { setIsDrawing(false) }

  // Touch handlers — must be non-passive to allow preventDefault (scroll prevention)
  const isDrawingRef = useRef(false)
  useEffect(() => { isDrawingRef.current = isDrawing }, [isDrawing])

  useEffect(() => {
    const canvas = displayRef.current
    if (!canvas) return

    function onTouchStart(e: TouchEvent) {
      e.preventDefault()
      saveSnapshot(); setIsDrawing(true); isDrawingRef.current = true
      const t = e.touches[0]
      const { x, y } = getPosFromClient(t.clientX, t.clientY)
      paintMask(x, y)
    }
    function onTouchMove(e: TouchEvent) {
      e.preventDefault()
      if (!isDrawingRef.current) return
      const t = e.touches[0]
      const { x, y } = getPosFromClient(t.clientX, t.clientY)
      paintMask(x, y)
    }
    function onTouchEnd() { setIsDrawing(false); isDrawingRef.current = false }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false })
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: false })
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove',  onTouchMove)
      canvas.removeEventListener('touchend',   onTouchEnd)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgSize, tool, brushSize, saveSnapshot])

  // ── Build mask ────────────────────────────────────────────────────────────
  function buildMask(): string {
    const mask = maskRef.current!
    const off  = document.createElement('canvas')
    off.width  = naturalSize.w; off.height = naturalSize.h
    const ctx  = off.getContext('2d', { willReadFrequently: true })!
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, off.width, off.height)
    const mCtx = mask.getContext('2d', { willReadFrequently: true })!
    const maskData = mCtx.getImageData(0, 0, mask.width, mask.height)
    const tmp  = document.createElement('canvas')
    tmp.width = mask.width; tmp.height = mask.height
    const tCtx = tmp.getContext('2d', { willReadFrequently: true })!
    const out  = tCtx.createImageData(mask.width, mask.height)
    for (let i = 0; i < maskData.data.length; i += 4) {
      out.data[i] = out.data[i+1] = out.data[i+2] = 255
      out.data[i+3] = maskData.data[i+3] > 10 ? 255 : 0
    }
    tCtx.putImageData(out, 0, 0)
    ctx.save()
    ctx.scale(naturalSize.w / mask.width, naturalSize.h / mask.height)
    ctx.drawImage(tmp, 0, 0)
    ctx.restore()
    return off.toDataURL('image/png')
  }

  function handleConfirm() {
    if (!prompt.trim()) return
    onConfirm(buildMask(), prompt, {
      model:      editModel,
      ratio:      editRatio,
      resolution: editRes,
      quality:    editQuality,
      background: editBg,
    }, refs)
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo() }
      if ((e.metaKey || e.ctrlKey) &&  e.shiftKey && e.key === 'z') { e.preventDefault(); redo() }
      if (e.key === 'b') setTool('brush')
      if (e.key === 'e') setTool('eraser')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  const modelLabel = IMAGE_MODELS.find(m => m.value === editModel)?.label ?? editModel

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#0a0a10] rounded-2xl overflow-hidden">

      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-[#666] hover:text-white transition-colors bg-transparent border-none cursor-pointer px-0 py-0"
          >
            <iconify-icon icon="lucide:arrow-left" width="15" height="15" />
            <span className="hidden sm:block text-[13px]">{t('mask.back')}</span>
          </button>
          <div className="w-px h-4 bg-white/[0.08]" />
          <span className="text-[13px] font-semibold text-white">{t('studio.detail.editRegion')}</span>
          <span className="text-[11px] text-[#444] hidden md:block">{t('mask.hint')}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-white/[0.05] rounded-lg p-0.5 gap-0.5">
            {(['brush', 'eraser'] as Tool[]).map(toolId => (
              <button
                key={toolId}
                onClick={() => setTool(toolId)}
                title={toolId === 'brush' ? t('mask.brushTitle') : t('mask.eraserTitle')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium border-none cursor-pointer transition-all capitalize
                  ${tool === toolId ? 'bg-white/15 text-white' : 'bg-transparent text-[#555] hover:text-[#888]'}`}
              >
                <iconify-icon icon={toolId === 'brush' ? 'lucide:paintbrush-2' : 'lucide:eraser'} width="13" height="13" />
                <span className="hidden sm:inline">{toolId === 'brush' ? t('mask.brush') : t('mask.eraser')}</span>
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-white/[0.08]" />

          <button onClick={undo} disabled={history.length === 0} title={t('mask.undoTitle')}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.05] hover:bg-white/10 border-none cursor-pointer text-[#666] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            <iconify-icon icon="lucide:undo-2" width="13" height="13" />
          </button>
          <button onClick={redo} disabled={redoStack.length === 0} title={t('mask.redoTitle')}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.05] hover:bg-white/10 border-none cursor-pointer text-[#666] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            <iconify-icon icon="lucide:redo-2" width="13" height="13" />
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-hidden min-h-0 bg-[#0a0a10]">
        {imgSize.w > 0 ? (
          <div className="relative select-none" style={{ width: imgSize.w, height: imgSize.h }}>
            <img ref={imageRef} src={imageUrl} crossOrigin="anonymous" alt=""
              className="absolute inset-0 w-full h-full object-contain rounded-xl pointer-events-none" draggable={false} />
            <canvas ref={maskRef} width={imgSize.w} height={imgSize.h} className="hidden" />
            <canvas ref={displayRef} width={imgSize.w} height={imgSize.h}
              className="absolute inset-0 rounded-xl"
              style={{ cursor: 'none', touchAction: 'none' }}
              onMouseDown={startDraw} onMouseMove={onMouseMove} onMouseUp={stopDraw}
              onMouseLeave={() => { stopDraw(); setInsideCanvas(false) }}
              onMouseEnter={() => setInsideCanvas(true)}
            />
            <canvas ref={borderRef} width={imgSize.w} height={imgSize.h}
              className="absolute inset-0 rounded-xl pointer-events-none" />
            {insideCanvas && (
              <div className="absolute pointer-events-none rounded-full"
                style={{
                  width: brushSize, height: brushSize,
                  left: cursorPos.x - brushSize / 2, top: cursorPos.y - brushSize / 2,
                  border: tool === 'eraser' ? '2px dashed rgba(255,255,255,0.7)' : '2px solid rgba(99,179,237,0.9)',
                  background: tool === 'eraser' ? 'rgba(255,255,255,0.06)' : 'rgba(99,179,237,0.12)',
                  boxShadow: tool === 'eraser' ? 'none' : '0 0 6px rgba(99,179,237,0.35)',
                }}
              />
            )}
          </div>
        ) : (
          <div className="text-[#333] text-[13px]">{t('mask.loadingImage')}</div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 border-t border-white/[0.07] px-4 py-3 space-y-2.5">

        {/* Brush size */}
        <div className="flex items-center gap-2">
          <iconify-icon icon="lucide:circle" width="7" height="7" style={{ color: '#444', flexShrink: 0 }} />
          <input type="range" min={8} max={120} step={4} value={brushSize}
            onChange={e => setBrushSize(+e.target.value)}
            className="flex-1 accent-[#63B3ED] cursor-pointer" />
          <iconify-icon icon="lucide:circle" width="13" height="13" style={{ color: '#444', flexShrink: 0 }} />
          <span className="text-[11px] text-[#555] w-8 text-right tabular-nums flex-shrink-0">{brushSize}px</span>
        </div>

        {/* Params pill row */}
        <div className="relative">
          {/* Right fade hint — only visible when pills overflow */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0a0a10] to-transparent z-10" />
        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap sm:overflow-x-auto pb-0.5 no-scrollbar pr-6 sm:pr-0">

          {/* Model */}
          <div ref={popRefs.model} className="flex-shrink-0">
            <Pill
              icon={<iconify-icon icon="lucide:cpu" width="12" height="12" />}
              label={modelLabel}
              active={openPop === 'model'}
              onClick={() => setOpenPop(p => p === 'model' ? null : 'model')}
            />
            {openPop === 'model' && (
              <PopoverPanel anchorRef={popRefs.model} onClose={() => setOpenPop(null)}>
                <div className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#555]">{t('studio.param.model')}</div>
                {IMAGE_MODELS.map(m => (
                  <OptionItem key={m.value} label={m.label} active={editModel === m.value}
                    onClick={() => changeModel(m.value)} />
                ))}
              </PopoverPanel>
            )}
          </div>

          {/* Ratio */}
          <div ref={popRefs.ratio} className="flex-shrink-0">
            <Pill
              icon={<iconify-icon icon="lucide:layout" width="12" height="12" />}
              label={editRatio}
              active={openPop === 'ratio'}
              onClick={() => setOpenPop(p => p === 'ratio' ? null : 'ratio')}
            />
            {openPop === 'ratio' && (
              <PopoverPanel anchorRef={popRefs.ratio} onClose={() => setOpenPop(null)}>
                <div className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#555]">{t('studio.param.ratio')}</div>
                {modelOpts.ratios.map(r => (
                  <OptionItem key={r} label={r} active={editRatio === r}
                    onClick={() => { setEditRatio(r); setOpenPop(null) }} />
                ))}
              </PopoverPanel>
            )}
          </div>

          {/* Resolution */}
          <div ref={popRefs.resolution} className="flex-shrink-0">
            <Pill
              icon={<iconify-icon icon="lucide:monitor" width="12" height="12" />}
              label={editRes}
              active={openPop === 'resolution'}
              onClick={() => setOpenPop(p => p === 'resolution' ? null : 'resolution')}
            />
            {openPop === 'resolution' && (
              <PopoverPanel anchorRef={popRefs.resolution} onClose={() => setOpenPop(null)}>
                <div className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#555]">{t('studio.param.resolution')}</div>
                {modelOpts.resolutions.map(r => (
                  <OptionItem key={r} label={r} active={editRes === r}
                    onClick={() => { setEditRes(r); setOpenPop(null) }} />
                ))}
              </PopoverPanel>
            )}
          </div>

          {/* Quality — gpt-image-2 only */}
          {modelOpts.qualities && (
            <div ref={popRefs.quality} className="flex-shrink-0">
              <Pill
                icon={<iconify-icon icon="lucide:sparkles" width="12" height="12" />}
                label={editQuality}
                active={openPop === 'quality'}
                onClick={() => setOpenPop(p => p === 'quality' ? null : 'quality')}
              />
              {openPop === 'quality' && (
                <PopoverPanel anchorRef={popRefs.quality} onClose={() => setOpenPop(null)}>
                  <div className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#555]">{t('studio.param.quality')}</div>
                  {modelOpts.qualities!.map(q => (
                    <OptionItem key={q} label={q} active={editQuality === q}
                      onClick={() => { setEditQuality(q); setOpenPop(null) }} />
                  ))}
                </PopoverPanel>
              )}
            </div>
          )}

          {/* Background — gpt-image-2 only */}
          {modelOpts.background && (
            <div ref={popRefs.background} className="flex-shrink-0">
              <Pill
                icon={<iconify-icon icon="lucide:layers" width="12" height="12" />}
                label={editBg}
                active={openPop === 'background'}
                onClick={() => setOpenPop(p => p === 'background' ? null : 'background')}
              />
              {openPop === 'background' && (
                <PopoverPanel anchorRef={popRefs.background} onClose={() => setOpenPop(null)}>
                  <div className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#555]">{t('studio.param.background')}</div>
                  {modelOpts.background!.map(b => (
                    <OptionItem key={b} label={b} active={editBg === b}
                      onClick={() => { setEditBg(b); setOpenPop(null) }} />
                  ))}
                </PopoverPanel>
              )}
            </div>
          )}
        </div>
        </div>

        {/* Ref image thumbnails strip — shown only when refs exist */}
        {refs.length > 0 && (
          <div className="flex items-end gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            {refs.map((f, i) => {
              const tag = `@image${i + 1}`
              return (
                <div key={i} className="relative flex-shrink-0 group">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-white/[0.05]">
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                  </div>
                  {/* tag label always visible at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 rounded-b-xl flex items-center justify-center py-0.5">
                    <span className="text-[#FFD700] text-[8px] font-bold leading-tight">{tag}</span>
                  </div>
                  {/* click → insert tag into prompt */}
                  <button
                    onClick={() => {
                      const ins = tag + ' '
                      setPrompt(p => p.endsWith(' ') || p === '' ? p + ins : p + ' ' + ins)
                      setTimeout(() => promptInputRef.current?.focus(), 50)
                    }}
                    className="absolute inset-0 bg-transparent border-none cursor-pointer rounded-xl"
                    title={tag}
                  />
                  {/* ✕ remove */}
                  <button
                    onClick={e => { e.stopPropagation(); setRefs(p => p.filter((_, j) => j !== i)) }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#444] hover:bg-[#666] rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border-none cursor-pointer text-white text-[9px] z-10"
                  >✕</button>
                </div>
              )
            })}
          </div>
        )}

        {/* Prompt input + Generate */}
        <div className="flex items-center gap-2 bg-[#17171e] border border-white/[0.09] rounded-2xl px-3 py-2">
          {/* + add ref button — opens file picker via dynamic input to avoid overflow:hidden blocking */}
          <button
            type="button"
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = 'image/*'
              input.multiple = true
              input.onchange = (e) => {
                const files = (e.target as HTMLInputElement).files
                if (files) setRefs(p => [...p, ...Array.from(files)].slice(0, 16))
              }
              document.body.appendChild(input)
              input.click()
              setTimeout(() => document.body.removeChild(input), 1000)
            }}
            title={t('mask.addRef')}
            className="w-7 h-7 rounded-lg border border-dashed border-white/20 bg-white/[0.05] hover:bg-white/[0.10] flex items-center justify-center text-[#555] hover:text-white transition-all cursor-pointer flex-shrink-0"
          >
            <iconify-icon icon="lucide:plus" width="13" height="13" />
          </button>

          {/* Text input */}
          <input
            ref={promptInputRef}
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            placeholder={t('mask.promptPlaceholder')}
            className="flex-1 bg-transparent border-none outline-none text-[14px] text-white placeholder:text-[#333] min-w-0"
            autoFocus
          />

          {/* Send button */}
          <button
            onClick={handleConfirm}
            disabled={!prompt.trim()}
            className="w-8 h-8 rounded-xl border-none cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center"
            style={{ background: prompt.trim() ? '#CDFF4D' : '#2a2a30' }}
          >
            <iconify-icon icon="lucide:arrow-up" width="15" height="15"
              style={{ color: prompt.trim() ? '#000' : '#555' }} />
          </button>
        </div>

      </div>
    </div>
  )
}
