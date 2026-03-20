// 과목 리스트 — 카테고리별 접이식 + 검색 + 진도 표시
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { LESSONS } from '../grammar/lessons'

// 카테고리 정의
const CATEGORIES = [
  { key: 'basic', label: '기초', desc: '자모와 발음, 연성법', range: [0, 1] as const },
  { key: 'masculine', label: '남성명사 -a 격변화', desc: '1~8과', range: [2, 9] as const },
  { key: 'verb', label: '동사 활용', desc: '9~17과', range: [10, 18] as const },
  { key: 'feminine', label: '여성명사 + 분사', desc: '18~23과', range: [19, 24] as const },
  { key: 'advanced', label: '고급 문법', desc: '24~32과', range: [25, 31] as const },
]

// 과별 진행도 조회
function getProgress(id: string, total: number) {
  return Math.min(Number(localStorage.getItem(`pali-primer-${id}`) || '0'), total)
}

// 원형 진도 SVG
function CircleProgress({ pct, size = 36, stroke = 3 }: {
  pct: number; size?: number; stroke?: number
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const color = pct >= 100 ? 'var(--color-accent)' : 'var(--color-primary)'

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        className="transition-all duration-700" />
    </svg>
  )
}

// 쉐브론 아이콘
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      className="transition-transform duration-300 shrink-0"
      style={{
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        color: 'var(--color-text-secondary)',
      }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function Courses() {
  const nav = useNavigate()
  const [search, setSearch] = useState('')
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  // 학습 기록 갱신
  const recordStudy = () => {
    const today = new Date().toISOString().slice(0, 10)
    const lastDate = localStorage.getItem('pali-study-last-date')
    if (lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      const prev = Number(localStorage.getItem('pali-study-streak') || '0')
      const next = lastDate === yesterday ? prev + 1 : 1
      localStorage.setItem('pali-study-streak', String(next))
      localStorage.setItem('pali-study-last-date', today)
    }
  }

  // 현재 진행 중인 과 인덱스
  const currentLessonIdx = LESSONS.findIndex((lesson, idx) => {
    const prog = getProgress(lesson.id, lesson.steps.length)
    return prog < lesson.steps.length && (idx === 0 ||
      getProgress(LESSONS[idx - 1].id, LESSONS[idx - 1].steps.length) >= LESSONS[idx - 1].steps.length)
  })

  // 검색 필터링
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return CATEGORIES
    const q = search.toLowerCase()
    return CATEGORIES.filter(cat => {
      const catLessons = LESSONS.slice(cat.range[0], cat.range[1] + 1)
      return catLessons.some(l =>
        l.title.toLowerCase().includes(q) ||
        l.subtitle.toLowerCase().includes(q)
      )
    })
  }, [search])

  // 과 상태 판별
  const getLessonState = (idx: number) => {
    const lesson = LESSONS[idx]
    const prog = getProgress(lesson.id, lesson.steps.length)
    const isCompleted = prog >= lesson.steps.length
    const isLocked = idx > 0 &&
      getProgress(LESSONS[idx - 1].id, LESSONS[idx - 1].steps.length) < LESSONS[idx - 1].steps.length
    const isCurrent = idx === currentLessonIdx
    const pct = Math.round((prog / lesson.steps.length) * 100)
    return { isCompleted, isLocked, isCurrent, pct }
  }

  // 섹션별 완료율
  const getSectionCompletion = (range: readonly [number, number]) => {
    let done = 0, total = 0
    for (let i = range[0]; i <= Math.min(range[1], LESSONS.length - 1); i++) {
      total++
      if (getProgress(LESSONS[i].id, LESSONS[i].steps.length) >= LESSONS[i].steps.length) done++
    }
    return { done, total }
  }

  // 전체 진도
  const stats = useMemo(() => {
    let completed = 0
    LESSONS.forEach(l => {
      if (getProgress(l.id, l.steps.length) >= l.steps.length) completed++
    })
    return { completed, total: LESSONS.length }
  }, [])

  return (
    <div className="min-h-screen pb-24"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>

      {/* 헤더 */}
      <div className="px-5 pt-[max(env(safe-area-inset-top),20px)] pb-4 animate-fadeIn">
        <h1 className="text-2xl font-bold tracking-tight">과목</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {stats.completed}/{stats.total}과 완료
        </p>
      </div>

      {/* 검색바 */}
      <div className="px-5 mb-4 animate-slideUp">
        <div className="relative">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-text-tertiary)" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="과목 검색..."
            className="w-full rounded-2xl py-3 pl-12 pr-4 text-sm outline-none
              transition-all duration-200
              focus:ring-2 focus:ring-[var(--color-primary-light)]"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
        </div>
      </div>

      {/* 카테고리별 과 목록 */}
      <div className="px-5 space-y-3 animate-slideUp delay-2">
        {filteredCategories.map(cat => {
          const isOpen = openSections[cat.key] ?? false
          const catLessons = LESSONS.slice(cat.range[0], cat.range[1] + 1)
          const { done, total } = getSectionCompletion(cat.range)
          const isAllDone = done === total && total > 0
          const sectionPct = total > 0 ? Math.round((done / total) * 100) : 0

          // 검색 필터링
          const visibleLessons = search.trim()
            ? catLessons.filter(l =>
                l.title.toLowerCase().includes(search.toLowerCase()) ||
                l.subtitle.toLowerCase().includes(search.toLowerCase())
              )
            : catLessons

          if (visibleLessons.length === 0) return null

          return (
            <div key={cat.key}
              className="rounded-2xl overflow-hidden card-shadow transition-all duration-300"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: isAllDone
                  ? '1.5px solid color-mix(in srgb, var(--color-accent) 30%, var(--color-border))'
                  : '1.5px solid var(--color-border)',
              }}>

              {/* 카테고리 헤더 */}
              <button
                onClick={() => setOpenSections(prev => ({ ...prev, [cat.key]: !prev[cat.key] }))}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left
                  transition-all duration-300 active:scale-[0.99]"
                style={{ minHeight: '48px' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm truncate">{cat.label}</span>
                    <span className="badge text-[10px]">{done}/{total}</span>
                  </div>
                  <p className="text-[11px] mt-0.5 truncate"
                    style={{ color: 'var(--color-text-secondary)' }}>
                    {cat.desc}
                  </p>
                </div>

                {/* 미니 진행률 */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-12 h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--color-border)' }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${sectionPct}%`,
                        backgroundColor: isAllDone ? 'var(--color-accent)' : 'var(--color-primary)',
                      }} />
                  </div>
                  <ChevronIcon open={isOpen || !!search.trim()} />
                </div>
              </button>

              {/* 접이식 과 목록 */}
              <div className="overflow-hidden transition-all duration-500"
                style={{
                  maxHeight: (isOpen || !!search.trim()) ? `${visibleLessons.length * 80 + 16}px` : '0px',
                  opacity: (isOpen || !!search.trim()) ? 1 : 0,
                }}>
                <div className="px-3 pb-3 space-y-2">
                  {visibleLessons.map(lesson => {
                    const globalIdx = LESSONS.findIndex(l => l.id === lesson.id)
                    const { isCompleted, isLocked, isCurrent, pct } = getLessonState(globalIdx)

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          if (!isLocked) {
                            recordStudy()
                            nav(`/learn/${lesson.id}`)
                          }
                        }}
                        disabled={isLocked}
                        className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-left
                          transition-all duration-300
                          hover:shadow-md hover:-translate-y-px
                          active:scale-[0.98]"
                        style={{
                          backgroundColor: isCurrent
                            ? 'color-mix(in srgb, var(--color-primary) 5%, var(--color-surface-elevated))'
                            : 'var(--color-surface-elevated)',
                          border: isCurrent ? '1.5px solid var(--color-primary-light)' : '1px solid transparent',
                          opacity: isLocked ? 0.4 : 1,
                          minHeight: '48px',
                        }}>

                        {/* 원형 진도 or 완료 체크 or 잠금 */}
                        <div className="shrink-0 relative">
                          {isCompleted ? (
                            <div className="w-9 h-9 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                stroke="var(--color-accent)" strokeWidth="2.5"
                                strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          ) : isLocked ? (
                            <div className="w-9 h-9 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: 'var(--color-surface-hover)' }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                stroke="var(--color-text-tertiary)" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            </div>
                          ) : (
                            <div className="relative">
                              {isCurrent && (
                                <span className="absolute inset-[-2px] rounded-full animate-ping opacity-15"
                                  style={{ backgroundColor: 'var(--color-primary)' }} />
                              )}
                              <CircleProgress pct={pct} size={36} stroke={3} />
                              <span className="absolute inset-0 flex items-center justify-center
                                text-[9px] font-bold"
                                style={{ color: 'var(--color-primary)' }}>
                                {pct}%
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 과 정보 */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[13px] leading-snug truncate">
                            {lesson.title}
                          </p>
                          <p className="text-[11px] mt-0.5 truncate"
                            style={{ color: 'var(--color-text-secondary)' }}>
                            {lesson.subtitle}
                          </p>
                        </div>

                        {/* 스텝 수 */}
                        <span className="text-[10px] font-semibold shrink-0"
                          style={{ color: 'var(--color-text-tertiary)' }}>
                          {lesson.steps.length}스텝
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
