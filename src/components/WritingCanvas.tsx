// 손글씨 캔버스 컴포넌트 — 되돌리기, 펜 두께, 가이드 그리드
import { useRef, useState, useCallback, useEffect } from 'react'

interface Props {
  width?: number
  height?: number
}

interface Stroke {
  points: { x: number; y: number }[]
  lineWidth: number
}

const PEN_SIZES = [2, 4, 7] as const
const MAX_UNDO = 30

// CSS 변수에서 색상값 가져오기 (Canvas API는 var() 미지원)
function getCSSColor(varName: string, fallback: string): string {
  try {
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
    return val || fallback
  } catch { return fallback }
}

export default function WritingCanvas({ width: propWidth, height: propHeight }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [penSize, setPenSize] = useState<number>(PEN_SIZES[1])
  const [showGrid, setShowGrid] = useState(false)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const currentStroke = useRef<Stroke | null>(null)
  const dprRef = useRef(1)

  const width = propWidth ?? 340
  const height = propHeight ?? 160

  // 가이드 그리드 그리기
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const borderColor = getCSSColor('--color-border', '#E4DDD0')
    ctx.save()
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 0.5
    ctx.setLineDash([4, 6])
    ctx.globalAlpha = 0.4

    // 중앙 십자선
    ctx.beginPath()
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2)
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h)
    ctx.stroke()

    // 1/4, 3/4 보조선
    ctx.globalAlpha = 0.2
    for (const frac of [0.25, 0.75]) {
      ctx.beginPath()
      ctx.moveTo(0, h * frac); ctx.lineTo(w, h * frac)
      ctx.moveTo(w * frac, 0); ctx.lineTo(w * frac, h)
      ctx.stroke()
    }
    ctx.restore()
  }, [])

  // 전체 다시 그리기
  const redraw = useCallback((ctx: CanvasRenderingContext2D, strokeList: Stroke[], grid: boolean, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h)
    if (grid) drawGrid(ctx, w, h)
    const primaryColor = getCSSColor('--color-primary', '#C06B0A')
    for (const s of strokeList) {
      if (s.points.length < 2) continue
      ctx.beginPath()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = s.lineWidth
      ctx.strokeStyle = primaryColor
      ctx.moveTo(s.points[0].x, s.points[0].y)
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y)
      }
      ctx.stroke()
    }
  }, [drawGrid])

  // 캔버스 초기화 + DPR 대응
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    dprRef.current = dpr
    canvas.width = width * dpr
    canvas.height = height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    redraw(ctx, strokes, showGrid, width, height)
  }, [width, height, showGrid, strokes, redraw])

  // 좌표 계산 (DPR 무관하게 CSS 좌표 사용)
  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = width / rect.width
    const scaleY = height / rect.height
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    const me = e as React.MouseEvent
    return {
      x: (me.clientX - rect.left) * scaleX,
      y: (me.clientY - rect.top) * scaleY,
    }
  }

  const start = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    setDrawing(true)
    const { x, y } = getPos(e)
    currentStroke.current = { points: [{ x, y }], lineWidth: penSize }
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const primaryColor = getCSSColor('--color-primary', '#C06B0A')
    ctx.beginPath()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = penSize
    ctx.strokeStyle = primaryColor
    ctx.moveTo(x, y)
  }

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!drawing) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    currentStroke.current?.points.push({ x, y })
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stop = () => {
    if (!drawing) return
    setDrawing(false)
    if (currentStroke.current && currentStroke.current.points.length > 1) {
      setStrokes(prev => {
        const next = [...prev, currentStroke.current!]
        return next.length > MAX_UNDO ? next.slice(-MAX_UNDO) : next
      })
    }
    currentStroke.current = null
  }

  const undo = () => setStrokes(prev => prev.slice(0, -1))
  const clear = () => setStrokes([])

  return (
    <div className="flex flex-col items-center gap-2 w-full" style={{ maxWidth: `${width}px` }}>
      {/* 툴바 */}
      <div className="flex items-center justify-between w-full px-1 mb-1">
        <div className="flex items-center gap-2">
          {PEN_SIZES.map(size => (
            <button key={size} onClick={() => setPenSize(size)}
              className="flex items-center justify-center rounded-full transition-all"
              style={{
                width: 28, height: 28,
                backgroundColor: penSize === size ? 'var(--color-primary)' : 'var(--color-surface)',
                border: `1.5px solid ${penSize === size ? 'var(--color-primary)' : 'var(--color-border)'}`,
              }}>
              <span className="rounded-full block" style={{
                width: size + 2, height: size + 2,
                backgroundColor: penSize === size ? '#fff' : 'var(--color-text-secondary)',
              }} />
            </button>
          ))}
        </div>
        <button onClick={() => setShowGrid(v => !v)}
          className="text-xs px-2.5 py-1 rounded-full transition-all"
          style={{
            backgroundColor: showGrid ? 'var(--color-primary)' : 'var(--color-surface)',
            color: showGrid ? '#fff' : 'var(--color-text-secondary)',
            border: `1.5px solid ${showGrid ? 'var(--color-primary)' : 'var(--color-border)'}`,
          }}>
          가이드
        </button>
      </div>

      {/* 캔버스 */}
      <canvas
        ref={canvasRef}
        className="rounded-2xl touch-none"
        style={{
          width: '100%', maxWidth: `${width}px`, height: `${height}px`,
          backgroundColor: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          boxShadow: 'inset 0 2px 6px rgba(30,27,22,0.06)',
        }}
        onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
        onTouchStart={start} onTouchMove={draw} onTouchEnd={stop}
      />

      {/* 버튼 */}
      <div className="flex items-center gap-2">
        <button onClick={undo} disabled={strokes.length === 0}
          className="text-xs px-3 py-1.5 rounded-full transition-all flex items-center gap-1 disabled:opacity-30"
          style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          되돌리기
        </button>
        <button onClick={clear} disabled={strokes.length === 0}
          className="text-xs px-3 py-1.5 rounded-full transition-all disabled:opacity-30"
          style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          지우기
        </button>
      </div>
    </div>
  )
}
