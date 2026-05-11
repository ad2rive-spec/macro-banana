'use client'
import { useRef, useState, useEffect, useCallback } from 'react'

interface MaskEditorProps {
  imageUrl: string
  onConfirm: (maskDataUrl: string, prompt: string) => void
  onCancel: () => void
}

type Tool = 'brush' | 'eraser'

const MASK_FILL = 'rgba(99, 179, 237, 0.38)'

export function MaskEditor({ imageUrl, onConfirm, onCancel }: MaskEditorProps) {
  const imageRef    = useRef<HTMLImageElement>(null)
  // maskCanvas: stores the binary mask (white = selected, black = not)
  const maskRef     = useRef<HTMLCanvasElement>(null)
  // displayCanvas: renders the colored overlay from the mask
  const displayRef  = useRef<HTMLCanvasElement>(null)
  // borderCanvas: renders the marching-ants border animation
  const borderRef   = useRef<HTMLCanvasElement>(null)

  const [tool, setTool]           = useState<Tool>('brush')
  const [brushSize, setBrushSize] = useState(40)
  const [prompt, setPrompt]       = useState('')
  const [isDrawing, setIsDrawing] = useState(false)
  const [imgSize, setImgSize]     = useState({ w: 0, h: 0 })
  const [history, setHistory]     = useState<ImageData[]>([])
  const [redoStack, setRedoStack] = useState<ImageData[]>([])
  const [cursorPos, setCursorPos] = useState({ x: -999, y: -999 })
  const [insideCanvas, setInsideCanvas] = useState(false)

  const animFrameRef = useRef<number>(0)
  const dashOffsetRef = useRef(0)

  // ── Load image ──
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const maxW = Math.min(window.innerWidth * 0.80, 960)
      const maxH = window.innerHeight * 0.68
      const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1)
      setImgSize({ w: Math.round(img.naturalWidth * scale), h: Math.round(img.naturalHeight * scale) })
    }
    img.src = imageUrl
  }, [imageUrl])

  // ── Redraw display canvas from mask ──
  const redrawDisplay = useCallback(() => {
    const mask    = maskRef.current
    const display = displayRef.current
    if (!mask || !display) return
    const mCtx = mask.getContext('2d')!
    const dCtx = display.getContext('2d')!
    const { width, height } = mask

    dCtx.clearRect(0, 0, width, height)

    // Read mask pixels, paint fill color where mask is white
    const maskData = mCtx.getImageData(0, 0, width, height)
    const out      = dCtx.createImageData(width, height)
    const [r, g, b, a] = [99, 179, 237, Math.round(0.38 * 255)]
    for (let i = 0; i < maskData.data.length; i += 4) {
      if (maskData.data[i] > 128) {
        out.data[i]     = r
        out.data[i + 1] = g
        out.data[i + 2] = b
        out.data[i + 3] = a
      }
    }
    dCtx.putImageData(out, 0, 0)
  }, [])

  // ── Marching ants animation ──
  useEffect(() => {
    if (imgSize.w === 0) return

    function animate() {
      const border  = borderRef.current
      const mask    = maskRef.current
      if (!border || !mask) { animFrameRef.current = requestAnimationFrame(animate); return }

      const ctx = border.getContext('2d')!
      const { width, height } = border
      ctx.clearRect(0, 0, width, height)

      // Trace mask edge using a temporary offscreen
      const mCtx     = mask.getContext('2d')!
      const maskData = mCtx.getImageData(0, 0, width, height)

      // Build a path from mask boundary pixels
      // Simple approach: draw the mask as a path, then stroke with dashes
      const tmp    = document.createElement('canvas')
      tmp.width    = width; tmp.height = height
      const tCtx   = tmp.getContext('2d')!
      tCtx.putImageData(maskData, 0, 0)

      ctx.save()
      ctx.drawImage(tmp, 0, 0)
      ctx.globalCompositeOperation = 'source-in'
      ctx.clearRect(0, 0, width, height)
      ctx.restore()

      // Draw dashed border by stroking the mask shape
      ctx.save()
      ctx.globalCompositeOperation = 'source-over'

      // Use the mask as a clipping reference — draw outline via shadow trick
      // Actually: draw mask, then erode 1px, XOR = border pixels
      const borderData = ctx.createImageData(width, height)
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const i = (y * width + x) * 4
          const isMask = maskData.data[i] > 128
          if (!isMask) continue
          // Check if any neighbor is NOT mask → this is a border pixel
          const neighbors = [
            maskData.data[((y-1)*width+x)*4],
            maskData.data[((y+1)*width+x)*4],
            maskData.data[(y*width+(x-1))*4],
            maskData.data[(y*width+(x+1))*4],
          ]
          if (neighbors.some(v => v <= 128)) {
            borderData.data[i]     = 255
            borderData.data[i + 1] = 255
            borderData.data[i + 2] = 255
            borderData.data[i + 3] = 255
          }
        }
      }
      ctx.putImageData(borderData, 0, 0)
      ctx.restore()

      // Now animate: alternate white/black pixels based on dashOffset
      const offset = Math.floor(dashOffsetRef.current) % 12
      const animated = ctx.getImageData(0, 0, width, height)
      let borderPixelCount = 0
      for (let i = 0; i < animated.data.length; i += 4) {
        if (animated.data[i + 3] > 0) {
          const isWhite = (borderPixelCount + offset) % 12 < 6
          animated.data[i]     = isWhite ? 255 : 0
          animated.data[i + 1] = isWhite ? 255 : 0
          animated.data[i + 2] = isWhite ? 255 : 0
          animated.data[i + 3] = isWhite ? 230 : 180
          borderPixelCount++
        }
      }
      ctx.putImageData(animated, 0, 0)

      dashOffsetRef.current += 0.4
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [imgSize])

  // ── Undo / Redo ──
  const saveSnapshot = useCallback(() => {
    const mask = maskRef.current; if (!mask) return
    const ctx  = mask.getContext('2d')!
    setHistory(prev => [...prev.slice(-19), ctx.getImageData(0, 0, mask.width, mask.height)])
    setRedoStack([])
  }, [])

  const undo = useCallback(() => {
    const mask = maskRef.current; if (!mask || history.length === 0) return
    const ctx  = mask.getContext('2d')!
    const prev = history[history.length - 1]
    setRedoStack(r => [...r, ctx.getImageData(0, 0, mask.width, mask.height)])
    setHistory(h => h.slice(0, -1))
    ctx.putImageData(prev, 0, 0)
    redrawDisplay()
  }, [history, redrawDisplay])

  const redo = useCallback(() => {
    const mask = maskRef.current; if (!mask || redoStack.length === 0) return
    const ctx  = mask.getContext('2d')!
    const next = redoStack[redoStack.length - 1]
    setHistory(h => [...h, ctx.getImageData(0, 0, mask.width, mask.height)])
    setRedoStack(r => r.slice(0, -1))
    ctx.putImageData(next, 0, 0)
    redrawDisplay()
  }, [redoStack, redrawDisplay])

  const clearAll = useCallback(() => {
    const mask = maskRef.current; if (!mask) return
    saveSnapshot()
    mask.getContext('2d')!.clearRect(0, 0, mask.width, mask.height)
    redrawDisplay()
  }, [saveSnapshot, redrawDisplay])

  // ── Canvas position helper ──
  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = displayRef.current!
    const rect   = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * (canvas.width  / rect.width),
      y: (clientY - rect.top)  * (canvas.height / rect.height),
    }
  }

  // ── Paint on mask canvas ──
  function paintMask(x: number, y: number) {
    const mask = maskRef.current!
    const ctx  = mask.getContext('2d')!
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0,0,0,1)'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = 'white'
    }
    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
    redrawDisplay()
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    saveSnapshot()
    setIsDrawing(true)
    const { x, y } = getPos(e)
    paintMask(x, y)
  }

  function onMouseMove(e: React.MouseEvent) {
    const canvas = displayRef.current!
    const rect   = canvas.getBoundingClientRect()
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    if (isDrawing) {
      const { x, y } = getPos(e)
      paintMask(x, y)
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault()
    if (!isDrawing) return
    const { x, y } = getPos(e)
    paintMask(x, y)
  }

  function stopDraw() { setIsDrawing(false) }

  // ── Build final B&W mask for API ──
  function buildMask(): string {
    const mask = maskRef.current!
    const img  = imageRef.current!
    const off  = document.createElement('canvas')
    off.width  = img.naturalWidth
    off.height = img.naturalHeight
    const ctx  = off.getContext('2d')!

    // Black background
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, off.width, off.height)

    // Scale mask up and draw white where selected
    const mCtx     = mask.getContext('2d')!
    const maskData = mCtx.getImageData(0, 0, mask.width, mask.height)
    const tmp      = document.createElement('canvas')
    tmp.width = mask.width; tmp.height = mask.height
    const tCtx = tmp.getContext('2d')!
    const out  = tCtx.createImageData(mask.width, mask.height)
    for (let i = 0; i < maskData.data.length; i += 4) {
      out.data[i] = out.data[i+1] = out.data[i+2] = 255
      out.data[i+3] = maskData.data[i+3] > 10 ? 255 : 0
    }
    tCtx.putImageData(out, 0, 0)

    ctx.save()
    ctx.scale(img.naturalWidth / mask.width, img.naturalHeight / mask.height)
    ctx.drawImage(tmp, 0, 0)
    ctx.restore()

    return off.toDataURL('image/png')
  }

  function handleConfirm() {
    if (!prompt.trim()) return
    onConfirm(buildMask(), prompt)
  }

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo() }
      if ((e.metaKey || e.ctrlKey) &&  e.shiftKey && e.key === 'z') { e.preventDefault(); redo() }
      if (e.key === 'b') setTool('brush')
      if (e.key === 'e') setTool('eraser')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, undo, redo])

  return (
    <div className="fixed inset-0 z-[10000] bg-[#0a0a10] flex flex-col">

      {/* ── Top toolbar ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onCancel}
            className="w-7 h-7 flex items-center justify-center text-[#666] hover:text-white transition-colors border-none bg-transparent cursor-pointer text-[18px]">
            ✕
          </button>
          <span className="text-[13px] font-semibold text-white">Edit Region</span>
          <span className="text-[11px] text-[#444] hidden sm:block">Paint the area you want to change</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/[0.05] rounded-lg p-0.5 gap-0.5">
            {(['brush', 'eraser'] as Tool[]).map(t => (
              <button key={t} onClick={() => setTool(t)}
                title={t === 'brush' ? 'Brush (B)' : 'Eraser (E)'}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium border-none cursor-pointer transition-all capitalize
                  ${tool === t ? 'bg-white/15 text-white' : 'bg-transparent text-[#555] hover:text-[#888]'}`}>
                <iconify-icon icon={t === 'brush' ? 'lucide:paintbrush-2' : 'lucide:eraser'} width="13" height="13" />
                {t}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-white/[0.08]" />

          <button onClick={undo} disabled={history.length === 0} title="Undo (⌘Z)"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.05] hover:bg-white/10 border-none cursor-pointer text-[#666] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            <iconify-icon icon="lucide:undo-2" width="13" height="13" />
          </button>
          <button onClick={redo} disabled={redoStack.length === 0} title="Redo (⌘⇧Z)"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.05] hover:bg-white/10 border-none cursor-pointer text-[#666] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            <iconify-icon icon="lucide:redo-2" width="13" height="13" />
          </button>
          <button onClick={clearAll}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 border-none cursor-pointer text-[11px] text-[#555] hover:text-[#888] transition-all">
            Clear
          </button>
        </div>
      </div>

      {/* ── Canvas area ── */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-6 min-h-0">
        <div className="relative select-none" style={{ width: imgSize.w, height: imgSize.h }}>

          {/* Base image */}
          <img
            ref={imageRef}
            src={imageUrl}
            crossOrigin="anonymous"
            alt=""
            className="absolute inset-0 w-full h-full object-contain rounded-lg pointer-events-none"
            draggable={false}
          />

          {/* Hidden mask canvas (binary, not displayed) */}
          {imgSize.w > 0 && (
            <canvas ref={maskRef} width={imgSize.w} height={imgSize.h} className="hidden" />
          )}

          {/* Display canvas — colored overlay, fixed opacity */}
          {imgSize.w > 0 && (
            <canvas
              ref={displayRef}
              width={imgSize.w}
              height={imgSize.h}
              className="absolute inset-0 rounded-lg"
              style={{ cursor: 'none', touchAction: 'none' }}
              onMouseDown={startDraw}
              onMouseMove={onMouseMove}
              onMouseUp={stopDraw}
              onMouseLeave={() => { stopDraw(); setInsideCanvas(false) }}
              onMouseEnter={() => setInsideCanvas(true)}
              onTouchStart={startDraw}
              onTouchMove={onTouchMove}
              onTouchEnd={stopDraw}
            />
          )}

          {/* Border canvas — marching ants animation */}
          {imgSize.w > 0 && (
            <canvas
              ref={borderRef}
              width={imgSize.w}
              height={imgSize.h}
              className="absolute inset-0 rounded-lg pointer-events-none"
            />
          )}

          {/* Custom cursor circle */}
          {insideCanvas && imgSize.w > 0 && (
            <div
              className="absolute pointer-events-none rounded-full"
              style={{
                width:  brushSize,
                height: brushSize,
                left:   cursorPos.x - brushSize / 2,
                top:    cursorPos.y - brushSize / 2,
                border: tool === 'eraser'
                  ? '2px dashed rgba(255,255,255,0.7)'
                  : '2px solid rgba(99,179,237,0.9)',
                background: tool === 'eraser'
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(99,179,237,0.12)',
                boxShadow: tool === 'eraser' ? 'none' : '0 0 6px rgba(99,179,237,0.35)',
              }}
            />
          )}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="flex-shrink-0 border-t border-white/[0.07] px-5 py-4">
        <div className="max-w-3xl mx-auto flex flex-col gap-3">

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#555] w-16 flex-shrink-0">Brush size</span>
            <iconify-icon icon="lucide:circle" width="8" height="8" style={{ color: '#555' }} />
            <input type="range" min={8} max={120} step={4} value={brushSize}
              onChange={e => setBrushSize(+e.target.value)}
              className="flex-1 accent-[#FFD700] cursor-pointer" />
            <iconify-icon icon="lucide:circle" width="14" height="14" style={{ color: '#555' }} />
            <span className="text-[11px] text-[#555] w-8 text-right tabular-nums">{brushSize}px</span>
          </div>

          <div className="flex items-center gap-3 bg-[#17171e] border border-white/[0.09] rounded-2xl px-4 py-3">
            <input
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
              placeholder="Describe what to put in the selected area…"
              className="flex-1 bg-transparent border-none outline-none text-[14px] text-white placeholder:text-[#3a3a4a]"
              autoFocus
            />
            <button
              onClick={handleConfirm}
              disabled={!prompt.trim()}
              className="px-5 py-2 rounded-xl font-bold text-[13px] text-black border-none cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              style={{ background: prompt.trim() ? '#CDFF4D' : '#555' }}>
              GENERATE
            </button>
          </div>

          <p className="text-[10px] text-[#444] text-center">
            B = brush · E = eraser · ⌘Z = undo · ⌘⇧Z = redo · Esc = cancel
          </p>
        </div>
      </div>
    </div>
  )
}
