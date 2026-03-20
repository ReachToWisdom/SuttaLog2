// 홈 화면: 히어로 + 학습 여정 맵 + 예정 과 + 설정 FAB
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LESSONS } from '../grammar/lessons'

// 과별 악센트 색상 배열
const ACCENT_COLORS = [
  '#D4760A', '#2E7D32', '#1565C0', '#7B1FA2', '#C62828',
]

// 오늘의 명언 목록
const QUOTES = [
  'Dhammaṃ care sucaritaṃ — 법을 잘 실천하라',
  'Appamādo amatapadaṃ — 방일하지 않음이 불사의 길',
  'Attā hi attano nātho — 자기 자신이 자신의 의지처',
  'Sabbe saṅkhārā aniccā — 모든 형성된 것은 무상하다',
  'Khanti paramaṃ tapo — 인내는 최상의 고행이다',
]

// 원형 진도 SVG 컴포넌트
function CircleProgress({ pct, size = 44, stroke = 3.5, color }: {
  pct: number; size?: number; stroke?: number; color: string
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      {/* 배경 원 */}
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
      {/* 진도 원 */}
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        className="transition-all duration-700" />
    </svg>
  )
}

// 법륜 장식 요소 (CSS 전용)
function DharmaWheel() {
  return (
    <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none"
      aria-hidden="true">
      <div className="relative w-20 h-20">
        {/* 외곽 원 */}
        <div className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: 'var(--color-surface)' }} />
        {/* 내부 원 */}
        <div className="absolute inset-[30%] rounded-full border-2"
          style={{ borderColor: 'var(--color-surface)' }} />
        {/* 8개 바큇살 */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="absolute left-1/2 top-0 h-full w-[2px] origin-center"
            style={{
              backgroundColor: 'var(--color-surface)',
              transform: `translateX(-50%) rotate(${i * 22.5}deg)`,
            }} />
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const nav = useNavigate()
  const [showUpcoming, setShowUpcoming] = useState(false)
  const [streak, setStreak] = useState(0)

  // 학습 연속일수 계산
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    const lastDate = localStorage.getItem('pali-study-last-date')
    const savedStreak = Number(localStorage.getItem('pali-study-streak') || '0')

    if (lastDate === today) {
      setStreak(savedStreak)
    } else {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      if (lastDate === yesterday) {
        setStreak(savedStreak)
      } else if (lastDate) {
        // 연속 끊김 — 리셋
        setStreak(0)
        localStorage.setItem('pali-study-streak', '0')
      }
    }
  }, [])

  // 오늘의 학습 기록 갱신 함수 (과 진입 시 호출용으로 export 가능)
  const recordStudy = () => {
    const today = new Date().toISOString().slice(0, 10)
    const lastDate = localStorage.getItem('pali-study-last-date')
    if (lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      const prev = Number(localStorage.getItem('pali-study-streak') || '0')
      const next = lastDate === yesterday ? prev + 1 : 1
      localStorage.setItem('pali-study-streak', String(next))
      localStorage.setItem('pali-study-last-date', today)
      setStreak(next)
    }
  }

  const getProgress = (id: string, total: number) => {
    return Math.min(Number(localStorage.getItem(`pali-primer-${id}`) || '0'), total)
  }

  // 오늘의 명언 (날짜 기반 고정)
  const todayQuote = QUOTES[new Date().getDate() % QUOTES.length]

  // 현재 진행 중인 과 인덱스 찾기
  const currentLessonIdx = LESSONS.findIndex((lesson, idx) => {
    const prog = getProgress(lesson.id, lesson.steps.length)
    return prog < lesson.steps.length && (idx === 0 ||
      getProgress(LESSONS[idx - 1].id, LESSONS[idx - 1].steps.length) >= LESSONS[idx - 1].steps.length)
  })

  // 예정 과 목록
  const upcomingLessons: { title: string; subtitle: string }[] = []

  return (
    <div className="min-h-screen pb-[env(safe-area-inset-bottom)]"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>

      {/* ── 히어로 섹션 ── */}
      <div className="relative overflow-hidden rounded-b-3xl"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
        }}>
        <DharmaWheel />
        <div className="relative px-6 pt-[max(env(safe-area-inset-top),24px)] pb-6">
          {/* 앱 제목 */}
          <h1 className="text-2xl font-bold text-white tracking-tight">
            빠알리 프라이머
          </h1>
          <p className="text-white/70 text-sm mt-1">
            De Silva의 Pāli Primer 기반 문법 학습
          </p>

          {/* 연속 학습 + 명언 */}
          <div className="mt-5 flex items-center gap-4">
            {/* 연속일수 뱃지 */}
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2">
              <span className="text-lg">🔥</span>
              <div>
                <p className="text-white text-xs font-medium leading-none">
                  연속 학습
                </p>
                <p className="text-white text-lg font-bold leading-tight">
                  {streak}<span className="text-sm font-normal ml-0.5">일</span>
                </p>
              </div>
            </div>

            {/* 명언 */}
            <p className="text-white/60 text-xs leading-relaxed flex-1 italic"
              style={{ fontFamily: 'var(--font-pali)' }}>
              {todayQuote}
            </p>
          </div>
        </div>
      </div>

      {/* ── 학습 여정 ── */}
      <div className="px-5 pt-6 pb-4">
        <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          학습 여정
        </h2>
      </div>

      {/* ── 과 카드 목록 (연결 경로 포함) ── */}
      <div className="relative px-5 pb-6">
        {/* 세로 연결선 */}
        <div className="absolute left-[27px] top-0 bottom-0 w-[2px] rounded-full"
          style={{ backgroundColor: 'var(--color-border)' }} />

        <div className="space-y-4 relative">
          {LESSONS.map((lesson, idx) => {
            const prog = getProgress(lesson.id, lesson.steps.length)
            const pct = Math.round((prog / lesson.steps.length) * 100)
            const isCompleted = prog >= lesson.steps.length
            const isLocked = idx > 0 &&
              getProgress(LESSONS[idx - 1].id, LESSONS[idx - 1].steps.length) < LESSONS[idx - 1].steps.length
            const isCurrent = idx === currentLessonIdx
            const accentColor = ACCENT_COLORS[idx % ACCENT_COLORS.length]

            return (
              <div key={lesson.id} className="relative flex items-start gap-4">
                {/* 연결선 위의 노드 */}
                <div className="relative z-10 shrink-0 mt-4">
                  {/* 진행 중 펄스 애니메이션 */}
                  {isCurrent && (
                    <span className="absolute inset-0 rounded-full animate-ping opacity-30"
                      style={{ backgroundColor: accentColor }} />
                  )}
                  <div className="w-3 h-3 rounded-full border-2 transition-all duration-300"
                    style={{
                      borderColor: isLocked ? 'var(--color-border)' : accentColor,
                      backgroundColor: isCompleted ? accentColor
                        : isCurrent ? accentColor : 'var(--color-bg)',
                    }} />
                </div>

                {/* 카드 본체 */}
                <button
                  onClick={() => {
                    if (!isLocked) {
                      recordStudy()
                      nav(`/learn/${lesson.id}`)
                    }
                  }}
                  disabled={isLocked}
                  className="flex-1 rounded-2xl overflow-hidden text-left
                    transition-all duration-300
                    hover:shadow-lg hover:-translate-y-0.5
                    active:scale-[0.98] active:shadow-md"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: isCompleted
                      ? '2px solid var(--color-accent)'
                      : isCurrent
                        ? `2px solid ${accentColor}`
                        : '1.5px solid var(--color-border)',
                    opacity: isLocked ? 0.45 : 1,
                    boxShadow: isCurrent
                      ? `0 0 20px ${accentColor}22` : undefined,
                  }}
                >
                  <div className="flex">
                    {/* 좌측 색상 악센트 바 */}
                    <div className="w-1.5 shrink-0 transition-colors duration-300"
                      style={{
                        backgroundColor: isLocked ? 'var(--color-border)' : accentColor,
                      }} />

                    <div className="flex-1 p-4 flex items-center gap-3">
                      {/* 원형 진도 표시 */}
                      <div className="relative">
                        <CircleProgress
                          pct={isLocked ? 0 : pct}
                          color={isCompleted ? 'var(--color-accent)' : accentColor}
                        />
                        {/* 중앙 아이콘 / 상태 */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          {isLocked ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                              stroke="var(--color-text-secondary)" strokeWidth="2.5"
                              strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          ) : isCompleted ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                              stroke="var(--color-accent)" strokeWidth="3"
                              strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <span className="text-xs font-bold"
                              style={{ color: accentColor }}>
                              {pct}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 과 정보 */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm leading-snug truncate">
                          {lesson.title}
                        </p>
                        <p className="text-xs mt-0.5 truncate"
                          style={{ color: 'var(--color-text-secondary)' }}>
                          {lesson.subtitle}
                        </p>
                      </div>

                      {/* 스텝 수 뱃지 */}
                      <div className="shrink-0 rounded-lg px-2 py-1 text-center"
                        style={{
                          backgroundColor: isCompleted
                            ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)'
                            : `${accentColor}14`,
                        }}>
                        <span className="text-[10px] font-bold block leading-none"
                          style={{
                            color: isCompleted ? 'var(--color-accent)' : accentColor,
                          }}>
                          {lesson.steps.length}
                        </span>
                        <span className="text-[9px] block mt-0.5 leading-none"
                          style={{ color: 'var(--color-text-secondary)' }}>
                          스텝
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 예정 과 (접이식) ── */}
      <div className="px-5 pb-6">
        <button
          onClick={() => setShowUpcoming(v => !v)}
          className="w-full flex items-center justify-between py-3 px-4 rounded-xl
            transition-all duration-300 active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold"
              style={{ color: 'var(--color-text-secondary)' }}>
              예정 과목
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}>
              {upcomingLessons.length}
            </span>
          </div>
          <svg
            width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="var(--color-text-secondary)"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className="transition-transform duration-300"
            style={{ transform: showUpcoming ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* 접이식 내용 */}
        <div className="overflow-hidden transition-all duration-500"
          style={{
            maxHeight: showUpcoming ? `${upcomingLessons.length * 80}px` : '0px',
            opacity: showUpcoming ? 1 : 0,
          }}>
          <div className="space-y-2 pt-3">
            {upcomingLessons.map((item, idx) => (
              <div key={idx}
                className="rounded-xl p-3 flex items-center gap-3 opacity-60"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}>
                {/* 번호 원 */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0
                  text-xs font-bold"
                  style={{
                    backgroundColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}>
                  {idx + 27}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{item.title}</p>
                  <p className="text-xs truncate"
                    style={{ color: 'var(--color-text-secondary)' }}>
                    {item.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 푸터 ── */}
      <div className="px-5 pb-8 text-center">
        <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
          v2.0 · De Silva's Pāli Primer 기반
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          교재 순서 + 경전 실례 학습
        </p>
      </div>

      {/* ── 설정 FAB (backdrop blur) ── */}
      <div className="fixed bottom-6 right-5 pb-[env(safe-area-inset-bottom)]">
        <button
          onClick={() => nav('/settings')}
          className="w-12 h-12 rounded-2xl flex items-center justify-center
            shadow-xl backdrop-blur-md
            transition-all duration-300
            hover:scale-105 active:scale-95"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-surface) 80%, transparent)',
            border: '1px solid var(--color-border)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-text-secondary)" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1
              0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33
              1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65
              1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0
              1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68
              15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1
              2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2
              2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0
              9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1
              2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0
              1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0
              2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0
              1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0
              0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
