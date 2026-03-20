// 손글씨 캔버스 컴포넌트 — 되돌리기, 펜 두께, 가이드 그리드 지원
import { useRef, useEffect, useState, useCallback } from 'react'

interface Props {
  width?: number
  height?: number
}

/** 스트로크 하나의 경로 데이터 */
interface Stroke {
  points: { x: number; y: number }[]
  lineWidth: number
}

/** 펜 두께 설정 */
const PEN_SIZES = [2, 4, 7] as const
const MAX_UNDO = 30

export default function WritingCanvas({ width: propWidth, height: propHeight }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [drawing, setDrawing] = useState(false)
  const [penSize, setPenSize] = useState<number>(PEN_SIZES[1])
  const [showGrid, setShowGrid] = useState(false)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const currentStroke = useRef<Stroke | null>(null)

  // 반응형 크기 계산
  const width = propWidth ?? 360
  const height = propHeight ?? 180

  /** 캔버스 초기화 + DPR 대응 */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    // 초기 그리기
    redraw(ctx, strokes, showGrid, width, height)
  }, [width, height])

  /** 전체 다시 그리기 (되돌리기 시 사용) */
  const redraw = useCallback((
    ctx: CanvasRenderingContext2D,
    strokeList: Stroke[],
    grid: boolean,
    w: number,
    h: number
  ) => {
    ctx.clearRect(0, 0, w, h)
    // 가이드 그리드
    if (grid) drawGrid(ctx, w, h)
    // 저장된 스트로크 재그리기
    for (const s of strokeList) {
      if (s.points.length < 2) continue
      ctx.beginPath()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = s.lineWidth
      ctx.strokeStyle = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-primary').trim() || '#C06B0A'
      ctx.moveTo(s.points[0].x, s.points[0].y)
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y)
      }
      ctx.stroke()
    }
  }, [])

  /** 가이드 그리드 그리기 */
  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save()
    ctx.strokeStyle = 'var(--color-border, #E4DDD0)'
    ctx.lineWidth = 0.5
    ctx.setLineDash([4, 6])
    ctx.globalAlpha = 0.4

    // 중앙 수평선
    ctx.beginPath()
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w, h / 2)
    ctx.stroke()

    // 중앙 수직선
    ctx.beginPath()
    ctx.moveTo(w / 2, 0)
    ctx.lineTo(w / 2, h)
    ctx.stroke()

    // 보조선 (1/4, 3/4)
    ctx.globalAlpha = 0.2
    for (const frac of [0.25, 0.75]) {
      ctx.beginPath()
      ctx.moveTo(0, h * frac)
      ctx.lineTo(w, h * frac)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(w * frac, 0)
      ctx.lineTo(w * frac, h)
      ctx.stroke()
    }

    ctx.restore()
  }

  /** 그리드 토글 시 재그리기 */
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    redraw(ctx, strokes, showGrid, width, height)
  }, [showGrid, strokes, redraw, width, height])

  /** 터치/마우스 좌표 계산 */
  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  /** 그리기 시작 */
  const start = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    setDrawing(true)
    const { x, y } = getPos(e)
    currentStroke.current = { points: [{ x, y }], lineWidth: penSize }
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = penSize
    ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-primary').trim() || '#C06B0A'
    ctx.moveTo(x, y)
  }

  /** 그리기 진행 */
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

  /** 그리기 종료 — 스트로크 저장 */
  const stop = () => {
    if (!drawing) return
    setDrawing(false)
    if (currentStroke.current && currentStroke.current.points.length > 1) {
      setStrokes(prev => {
        const next = [...prev, currentStroke.current!]
        // 최대 되돌리기 수 제한
        return next.length > MAX_UNDO ? next.slice(-MAX_UNDO) : next
      })
    }
    currentStroke.current = null
  }

  /** 되돌리기 — 마지막 스트로크 제거 */
  const undo = () => {
    setStrokes(prev => {
      const next = prev.slice(0, -1)
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx) redraw(ctx, next, showGrid, width, height)
      return next
    })
  }

  /** 전체 지우기 */
  const clear = () => {
    setStrokes([])
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    redraw(ctx, [], showGrid, width, height)
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center gap-2 animate-fadeIn"
      style={{ width: '100%', maxWidth: `${width}px` }}
    >
      {/* 상단 툴바 — 펜 두께 + 그리드 */}
      <div className="flex items-center justify-between w-full px-1 mb-1">
        {/* 펜 두께 선택 */}
        <div className="flex items-center gap-2">
          {PEN_SIZES.map(size => (
            <button
              key={size}
              onClick={() => setPenSize(size)}
              className="flex items-center justify-center rounded-full transition-all"
              style={{
                width: 28,
                height: 28,
                backgroundColor: penSize === size ? 'var(--color-primary)' : 'var(--color-surface)',
                border: `1.5px solid ${penSize === size ? 'var(--color-primary)' : 'var(--color-border)'}`,
              }}
              title={`펜 두께 ${size}px`}
            >
              <span
                className="rounded-full"
                style={{
                  width: size + 2,
                  height: size + 2,
                  backgroundColor: penSize === size ? '#fff' : 'var(--color-text-secondary)',
                  display: 'block',
                }}
              />
            </button>
          ))}
        </div>
        {/* 그리드 토글 */}
        <button
          onClick={() => setShowGrid(v => !v)}
          className="text-xs px-2.5 py-1 rounded-full transition-all"
          style={{
            backgroundColor: showGrid ? 'var(--color-primary)' : 'var(--color-surface)',
            color: showGrid ? '#fff' : 'var(--color-text-secondary)',
            border: `1.5px solid ${showGrid ? 'var(--color-primary)' : 'var(--color-border)'}`,
          }}
        >
          {/* 그리드 아이콘 (SVG 인라인) */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="inline-block mr-1 -mt-px">
            <rect x="1" y="1" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
            <rect x="8" y="1" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
            <rect x="1" y="8" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
            <rect x="8" y="8" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          가이드
        </button>
      </div>

      {/* 캔버스 */}
      <canvas
        ref={canvasRef}
        className="rounded-2xl touch-none"
        style={{
          width: '100%',
          maxWidth: `${width}px`,
          height: `${height}px`,
          backgroundColor: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          boxShadow: 'inset 0 2px 6px rgba(30,27,22,0.06), var(--shadow-sm)',
        }}
        onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
        onTouchStart={start} onTouchMove={draw} onTouchEnd={stop}
      />

      {/* 하단 버튼 — 되돌리기 + 지우기 */}
      <div className="flex items-center gap-2">
        <button
          onClick={undo}
          disabled={strokes.length === 0}
          className="text-xs px-3 py-1.5 rounded-full transition-all flex items-center gap-1 disabled:opacity-30"
          style={{
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          {/* 되돌리기 아이콘 */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          되돌리기
        </button>
        <button
          onClick={clear}
          disabled={strokes.length === 0}
          className="text-xs px-3 py-1.5 rounded-full transition-all disabled:opacity-30"
          style={{
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          지우기
        </button>
      </div>
    </div>
  )
}
