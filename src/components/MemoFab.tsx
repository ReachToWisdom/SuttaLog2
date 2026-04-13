// 메모 플로팅 버튼 + 모달 (작성/목록/수정)
// 모든 페이지에서 사용 가능, 이미지 붙여넣기/첨부 지원

import { useState, useRef, useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { saveMemo, getMemos, updateMemo, deleteMemo, fileToDataUrl, getDeviceId } from '../utils/memo'
import type { Memo, MemoImage } from '../utils/memo'

// 페이지 경로 → 한글 이름
const PAGE_NAMES: Record<string, string> = {
  '/': '홈',
  '/courses': '과목',
  '/review': '복습',
  '/profile': '설정',
  '/settings': '설정',
}

function getPageName(path: string): string {
  if (path.startsWith('/learn/')) {
    const lessonId = path.replace('/learn/', '')

    // GrammarLearn에서 설정한 정확한 현재 위치 사용
    const currentInfo = (window as any).currentLessonInfo
    if (currentInfo && currentInfo.lessonId === lessonId) {
      return `학습: ${lessonId}#${currentInfo.stepIndex}`
    }

    // fallback: localStorage 사용 (하위 호환성)
    const stepIdx = localStorage.getItem(`pali-primer-${lessonId}`)
    if (stepIdx) {
      return `학습: ${lessonId}#${stepIdx}`
    }

    return `학습: ${lessonId}`
  }
  return PAGE_NAMES[path] || path
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

interface ImageItem {
  file?: File
  preview: string
  dataUrl?: string
  name: string
  order: number
}

// 탭 타입
type Tab = 'write' | 'list'

export default function MemoFab() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('write')
  const [text, setText] = useState('')
  const [images, setImages] = useState<ImageItem[]>([])
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [memos, setMemos] = useState<Memo[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const orderCounter = useRef(0)

  // 내 메모 불러오기
  const loadMemos = useCallback(async () => {
    setLoading(true)
    const list = await getMemos()
    setMemos(list)
    setLoading(false)
  }, [])

  // 목록 탭 열 때 자동 로드
  useEffect(() => {
    if (open && tab === 'list') loadMemos()
  }, [open, tab, loadMemos])

  // 이미지 추가
  const addImages = useCallback((files: FileList | File[]) => {
    setImages(prev => {
      const next = [...prev]
      for (const f of Array.from(files)) {
        if (f.size > 5 * 1024 * 1024) continue
        orderCounter.current += 1
        next.push({
          file: f,
          preview: URL.createObjectURL(f),
          name: f.name,
          order: orderCounter.current,
        })
      }
      return next
    })
  }, [])

  // 붙여넣기
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

  const removeImage = (order: number) => {
    setImages(prev => {
      const item = prev.find(i => i.order === order)
      if (item?.file) URL.revokeObjectURL(item.preview)
      return prev.filter(i => i.order !== order)
    })
  }

  // 초기화
  const resetForm = () => {
    setText('')
    images.forEach(i => { if (i.file) URL.revokeObjectURL(i.preview) })
    setImages([])
    orderCounter.current = 0
    setEditingId(null)
  }

  // 새 메모 전송 또는 수정 저장
  const handleSubmit = async () => {
    if (!text.trim() && images.length === 0) return
    setSending(true)

    let ok: boolean
    if (editingId) {
      // 수정: 새 파일은 base64 변환, 기존은 유지
      const finalImages: MemoImage[] = []
      const sorted = [...images].sort((a, b) => a.order - b.order)
      for (let i = 0; i < sorted.length; i++) {
        const img = sorted[i]
        if (img.file) {
          const dataUrl = await fileToDataUrl(img.file)
          finalImages.push({ order: i + 1, dataUrl, name: img.name })
        } else if (img.dataUrl) {
          finalImages.push({ order: i + 1, dataUrl: img.dataUrl, name: img.name })
        }
      }
      ok = await updateMemo(editingId, text, finalImages)
    } else {
      const files = images.sort((a, b) => a.order - b.order).map(i => i.file!)
      ok = await saveMemo(getPageName(location.pathname), text, files)
    }

    setSending(false)
    if (ok) {
      setDone(true)
      setTimeout(() => {
        setDone(false)
        resetForm()
        if (editingId) {
          setTab('list')
          loadMemos()
        }
      }, 1200)
    }
  }

  // 수정 모드 진입
  const startEdit = (memo: Memo) => {
    resetForm()
    setText(memo.text)
    setEditingId(memo.id!)
    // 기존 이미지 복원
    const restored: ImageItem[] = memo.images.map((img, i) => ({
      preview: img.dataUrl,
      dataUrl: img.dataUrl,
      name: img.name,
      order: i + 1,
    }))
    setImages(restored)
    orderCounter.current = restored.length
    setTab('write')
  }

  const handleClose = () => {
    setOpen(false)
    resetForm()
    setTab('write')
  }

  // 메모 클릭 → 해당 위치로 이동
  const handleMemoClick = (memo: Memo) => {
    // "학습: lesson-XX#스텝" 또는 "학습: lesson-XX" 형식에서 lessonId와 스텝 추출
    const match = memo.page.match(/학습:\s*([^#]+)(?:#(\d+))?/)
    if (match) {
      const lessonId = match[1].trim()
      const stepIdx = match[2] // 스텝 인덱스 (있으면)
      if (stepIdx) {
        navigate(`/learn/${lessonId}?step=${stepIdx}`)
      } else {
        navigate(`/learn/${lessonId}`)
      }
      handleClose()
    }
  }

  return (
    <>
      {/* 플로팅 메모 버튼 */}
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-20 z-50 w-12 h-12 rounded-full
          bg-amber-600 text-white shadow-lg flex items-center justify-center
          hover:bg-amber-700 active:scale-95 transition-all"
        aria-label="메모"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={2} className="w-6 h-6">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      {/* 모달 */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center
          justify-center bg-black/50"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <div className="bg-white dark:bg-neutral-800 text-neutral-900
            dark:text-neutral-100 w-full max-w-lg rounded-t-2xl sm:rounded-2xl
            max-h-[85vh] flex flex-col animate-[slideUp_0.2s_ease-out]">

            {/* 헤더 + 탭 */}
            <div className="border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <h2 className="font-bold text-lg">메모</h2>
                <button onClick={handleClose}
                  className="p-1 rounded-full hover:bg-neutral-100
                    dark:hover:bg-neutral-700">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none"
                    stroke="currentColor" strokeWidth={2}>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* 탭 버튼 */}
              <div className="flex px-4 gap-4">
                <button onClick={() => { resetForm(); setTab('write') }}
                  className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                    tab === 'write'
                      ? 'border-amber-600 text-amber-600'
                      : 'border-transparent text-neutral-400'
                  }`}>
                  새 메모
                </button>
                <button onClick={() => setTab('list')}
                  className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                    tab === 'list'
                      ? 'border-amber-600 text-amber-600'
                      : 'border-transparent text-neutral-400'
                  }`}>
                  전체 메모
                </button>
              </div>
            </div>

            {/* === 작성/수정 탭 === */}
            {tab === 'write' && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {editingId && (
                    <p className="text-xs text-amber-600 font-medium">
                      수정 중...
                    </p>
                  )}
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {editingId
                      ? '내용을 수정하고 저장하세요.'
                      : `기능 개선, 버그, 아이디어를 자유롭게 — ${getPageName(location.pathname)}`}
                  </p>

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

                  {/* 이미지 미리보기 */}
                  {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {[...images].sort((a, b) => a.order - b.order).map(img => (
                        <div key={img.order} className="relative group">
                          <img src={img.preview} alt={`이미지 ${img.order}`}
                            className="w-full h-24 object-cover rounded-lg
                              border border-neutral-200 dark:border-neutral-600" />
                          <span className="absolute top-1 left-1 bg-amber-600
                            text-white text-xs w-5 h-5 rounded-full flex
                            items-center justify-center font-bold">
                            {img.order}
                          </span>
                          <button onClick={() => removeImage(img.order)}
                            className="absolute top-1 right-1 bg-red-500
                              text-white w-5 h-5 rounded-full flex items-center
                              justify-center text-xs">
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

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

                {/* 하단 버튼 */}
                <div className="px-4 py-3 border-t border-neutral-200
                  dark:border-neutral-700 flex gap-2">
                  {editingId && (
                    <button onClick={() => { resetForm(); setTab('list') }}
                      className="px-4 py-2.5 rounded-lg border border-neutral-300
                        dark:border-neutral-600 text-sm">
                      취소
                    </button>
                  )}
                  <div className="flex-1">
                    {done ? (
                      <div className="text-center text-green-600 font-medium py-2">
                        {editingId ? '수정 완료!' : '전송 완료!'}
                      </div>
                    ) : (
                      <button onClick={handleSubmit} disabled={sending}
                        className="w-full py-2.5 rounded-lg bg-amber-600 text-white
                          font-medium hover:bg-amber-700 disabled:opacity-50
                          transition-colors">
                        {sending ? '저장 중...' : editingId ? '수정 저장' : '메모 보내기'}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* === 메모 목록 탭 === */}
            {tab === 'list' && (
              <div className="flex-1 overflow-y-auto p-4">
                {/* 현재 페이지 / 전체 보기 토글 */}
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => setShowAll(false)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      !showAll
                        ? 'bg-amber-600 text-white'
                        : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                    }`}>
                    이 페이지
                  </button>
                  <button onClick={() => setShowAll(true)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      showAll
                        ? 'bg-amber-600 text-white'
                        : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                    }`}>
                    전체
                  </button>
                  <span className="text-xs text-neutral-400 ml-auto">
                    {getPageName(location.pathname)}
                  </span>
                </div>
                {loading ? (
                  <p className="text-center text-neutral-400 py-8">불러오는 중...</p>
                ) : (() => {
                  const currentPage = getPageName(location.pathname)
                  const filtered = showAll
                    ? memos
                    : memos.filter(m => m.page === currentPage)
                  return filtered.length === 0 ? (
                  <p className="text-center text-neutral-400 py-8">
                    {showAll ? '아직 메모가 없습니다.' : `이 페이지(${currentPage})에 메모가 없습니다.`}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filtered.map(memo => (
                      <div key={memo.id}
                        className="rounded-xl border border-neutral-200
                          dark:border-neutral-700 p-3 space-y-2 hover:bg-neutral-50
                          dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
                        onClick={() => handleMemoClick(memo)}>
                        {/* 메모 헤더 */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-500 flex items-center gap-1">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                              strokeWidth={2} className="w-3.5 h-3.5 text-amber-600">
                              <path d="M9 5l7 7-7 7"/>
                            </svg>
                            {formatDate(memo.createdAt)} · {memo.page}
                            {memo.updatedAt && ' (수정됨)'}
                          </span>
                          {memo.deviceId === getDeviceId() && (
                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                              <button onClick={() => startEdit(memo)}
                                className="text-xs text-amber-600 hover:text-amber-700
                                  font-medium px-2 py-1 rounded-md
                                  hover:bg-amber-50 dark:hover:bg-amber-900/20">
                                수정
                              </button>
                              <button onClick={async () => {
                                if (!confirm('이 메모를 삭제할까요?')) return
                                await deleteMemo(memo.id!)
                                loadMemos()
                              }}
                                className="text-xs text-red-500 hover:text-red-600
                                  font-medium px-2 py-1 rounded-md
                                  hover:bg-red-50 dark:hover:bg-red-900/20">
                                삭제
                              </button>
                            </div>
                          )}
                        </div>
                        {/* 텍스트 */}
                        {memo.text && (
                          <p className="text-sm whitespace-pre-wrap text-neutral-900
                            dark:text-neutral-100">{memo.text}</p>
                        )}
                        {/* 이미지 썸네일 */}
                        {memo.images?.length > 0 && (
                          <div className="flex gap-1.5 overflow-x-auto">
                            {memo.images
                              .sort((a, b) => a.order - b.order)
                              .map(img => (
                              <img key={img.order} src={img.dataUrl}
                                alt={`${img.order}`}
                                className="w-16 h-16 object-cover rounded-lg
                                  border border-neutral-200 dark:border-neutral-600
                                  flex-shrink-0" />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
                  })()}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
