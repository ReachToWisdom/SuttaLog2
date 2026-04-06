// 메모 플로팅 버튼 + 모달
// 모든 페이지에서 사용 가능, 이미지 붙여넣기/첨부 지원

import { useState, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { saveMemo } from '../utils/memo'

// 페이지 경로 → 한글 이름 매핑
const PAGE_NAMES: Record<string, string> = {
  '/': '홈',
  '/courses': '과목',
  '/review': '복습',
  '/profile': '설정',
  '/settings': '설정',
}

function getPageName(path: string): string {
  if (path.startsWith('/learn/')) {
    const id = path.replace('/learn/', '')
    return `학습: ${id}`
  }
  return PAGE_NAMES[path] || path
}

interface ImageItem {
  file: File
  preview: string
  order: number
}

export default function MemoFab() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [images, setImages] = useState<ImageItem[]>([])
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const location = useLocation()
  const orderCounter = useRef(0)

  // 이미지 추가 (파일 배열)
  const addImages = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files)
    setImages(prev => {
      const next = [...prev]
      for (const f of arr) {
        // 5MB 제한
        if (f.size > 5 * 1024 * 1024) continue
        orderCounter.current += 1
        next.push({
          file: f,
          preview: URL.createObjectURL(f),
          order: orderCounter.current,
        })
      }
      return next
    })
  }, [])

  // 붙여넣기 핸들러 (Ctrl+V 이미지)
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    const files: File[] = []
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const f = item.getAsFile()
        if (f) files.push(f)
      }
    }
    if (files.length > 0) {
      e.preventDefault()
      addImages(files)
    }
  }, [addImages])

  // 이미지 제거
  const removeImage = (order: number) => {
    setImages(prev => {
      const item = prev.find(i => i.order === order)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter(i => i.order !== order)
    })
  }

  // 전송
  const handleSubmit = async () => {
    if (!text.trim() && images.length === 0) return
    setSending(true)
    const page = getPageName(location.pathname)
    const files = images
      .sort((a, b) => a.order - b.order)
      .map(i => i.file)
    const ok = await saveMemo(page, text, files)
    setSending(false)
    if (ok) {
      setDone(true)
      setTimeout(() => {
        setOpen(false)
        setDone(false)
        setText('')
        images.forEach(i => URL.revokeObjectURL(i.preview))
        setImages([])
        orderCounter.current = 0
      }, 1500)
    }
  }

  // 모달 닫기
  const handleClose = () => {
    setOpen(false)
    setText('')
    images.forEach(i => URL.revokeObjectURL(i.preview))
    setImages([])
    orderCounter.current = 0
  }

  return (
    <>
      {/* 플로팅 메모 버튼 */}
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-20 z-50 w-12 h-12 rounded-full
          bg-amber-600 text-white shadow-lg flex items-center justify-center
          hover:bg-amber-700 active:scale-95 transition-all"
        aria-label="메모 작성"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={2} className="w-6 h-6">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      {/* 모달 오버레이 */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center
          justify-center bg-black/50"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <div className="bg-white dark:bg-neutral-800 w-full max-w-lg
            rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col
            animate-[slideUp_0.2s_ease-out]">

            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3
              border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="font-bold text-lg">
                메모 — {getPageName(location.pathname)}
              </h2>
              <button onClick={handleClose}
                className="p-1 rounded-full hover:bg-neutral-100
                  dark:hover:bg-neutral-700">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none"
                  stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 본문 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* 안내 문구 */}
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                기능 개선 요청, 버그 리포트, 아이디어를 자유롭게 작성하세요.
                이미지는 붙여넣기(Ctrl+V) 또는 첨부 가능합니다.
              </p>

              {/* 텍스트 입력 */}
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onPaste={handlePaste}
                placeholder="메모 내용을 입력하세요..."
                rows={5}
                className="w-full rounded-lg border border-neutral-300
                  dark:border-neutral-600 bg-transparent p-3 text-sm
                  resize-none focus:outline-none focus:ring-2
                  focus:ring-amber-500"
              />

              {/* 이미지 미리보기 (순서 표시) */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {images
                    .sort((a, b) => a.order - b.order)
                    .map((img) => (
                    <div key={img.order} className="relative group">
                      <img src={img.preview} alt={`이미지 ${img.order}`}
                        className="w-full h-24 object-cover rounded-lg
                          border border-neutral-200 dark:border-neutral-600" />
                      {/* 순서 번호 배지 */}
                      <span className="absolute top-1 left-1 bg-amber-600
                        text-white text-xs w-5 h-5 rounded-full flex
                        items-center justify-center font-bold">
                        {img.order}
                      </span>
                      {/* 삭제 버튼 */}
                      <button onClick={() => removeImage(img.order)}
                        className="absolute top-1 right-1 bg-red-500
                          text-white w-5 h-5 rounded-full flex items-center
                          justify-center opacity-0 group-hover:opacity-100
                          transition-opacity text-xs">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 이미지 첨부 버튼 */}
              <input ref={fileRef} type="file" accept="image/*" multiple
                className="hidden"
                onChange={e => e.target.files && addImages(e.target.files)} />
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 text-sm text-amber-600
                  hover:text-amber-700 dark:text-amber-400">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none"
                  stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                이미지 첨부
              </button>
            </div>

            {/* 하단 전송 버튼 */}
            <div className="px-4 py-3 border-t border-neutral-200
              dark:border-neutral-700">
              {done ? (
                <div className="text-center text-green-600 font-medium py-2">
                  전송 완료!
                </div>
              ) : (
                <button onClick={handleSubmit} disabled={sending}
                  className="w-full py-2.5 rounded-lg bg-amber-600 text-white
                    font-medium hover:bg-amber-700 disabled:opacity-50
                    transition-colors">
                  {sending ? '전송 중...' : '메모 보내기'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
