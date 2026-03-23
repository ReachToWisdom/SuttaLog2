// 홈 화면 — 프리미엄 허브 (과 목록 없음, 히어로 중심)
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { LESSONS } from '../grammar/lessons'
import { getMonthStudyDates, getDayLog, type DayLog } from '../../utils/study-log'

// ── 설정 상수 ──
const QUOTES = [
  { pali: 'Dhammaṃ care sucaritaṃ', ko: '법을 잘 실천하라' },
  { pali: 'Appamādo amatapadaṃ', ko: '방일하지 않음이 불사의 길' },
  { pali: 'Attā hi attano nātho', ko: '자기 자신이 자신의 의지처' },
  { pali: 'Sabbe saṅkhārā aniccā', ko: '모든 형성된 것은 무상하다' },
  { pali: 'Khanti paramaṃ tapo', ko: '인내는 최상의 고행이다' },
  { pali: 'Manosetṭhā manomayā', ko: '마음이 앞서고, 마음이 만든다' },
  { pali: 'Saddhā dutiyā purisassa hoti', ko: '믿음은 사람의 동반자이다' },
]

// 시간대별 인사
function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '고요한 새벽이에요'
  if (h < 12) return '좋은 아침이에요'
  if (h < 18) return '좋은 오후에요'
  return '편안한 저녁이에요'
}

// 과별 진행도 조회
function getProgress(id: string, total: number) {
  return Math.min(Number(localStorage.getItem(`pali-primer-${id}`) || '0'), total)
}

// ── 연꽃 장식 (CSS 전용) ──
function LotusDecoration() {
  return (
    <div className="absolute right-4 bottom-8 opacity-[0.06] pointer-events-none"
      aria-hidden="true">
      <svg width="180" height="180" viewBox="0 0 200 200" fill="white">
        {/* 중앙 꽃잎 */}
        <ellipse cx="100" cy="80" rx="18" ry="50"
          transform="rotate(0, 100, 100)" />
        {/* 좌우 꽃잎들 */}
        {[-40, -20, 20, 40].map(angle => (
          <ellipse key={angle} cx="100" cy="80" rx="16" ry="48"
            transform={`rotate(${angle}, 100, 100)`} />
        ))}
        {/* 외곽 꽃잎들 */}
        {[-60, -30, 30, 60].map(angle => (
          <ellipse key={`o${angle}`} cx="100" cy="85" rx="14" ry="40"
            transform={`rotate(${angle}, 100, 100)`} opacity="0.6" />
        ))}
        {/* 받침대 */}
        <ellipse cx="100" cy="145" rx="50" ry="12" opacity="0.4" />
        <ellipse cx="100" cy="152" rx="60" ry="10" opacity="0.25" />
      </svg>
    </div>
  )
}

// ── 원형 프로그레스 링 (큰 사이즈) ──
function ProgressRing({ pct, size = 120 }: { pct: number; size?: number }) {
  const stroke = 8
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* 배경 트랙 */}
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} />
        {/* 진행 아크 */}
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="white" strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          className="transition-all duration-1000"
          style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.3))' }} />
      </svg>
      {/* 중앙 퍼센트 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white leading-none">{pct}%</span>
        <span className="text-[10px] text-white/60 mt-1">진행률</span>
      </div>
    </div>
  )
}

export default function Home() {
  const nav = useNavigate()
  const [streak, setStreak] = useState(0)
  const [todayMinutes, setTodayMinutes] = useState(0)

  // 연속 학습일수 계산
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
        setStreak(0)
        localStorage.setItem('pali-study-streak', '0')
      }
    }

    // 오늘 학습 시간 (분)
    const mins = Number(localStorage.getItem(`pali-study-minutes-${today}`) || '0')
    setTodayMinutes(mins)
  }, [])

  // 학습 기록 갱신 + 캘린더 날짜 저장
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
    // 학습 날짜 캘린더 기록
    const dates: string[] = JSON.parse(localStorage.getItem('pali-study-dates') || '[]')
    if (!dates.includes(today)) {
      dates.push(today)
      localStorage.setItem('pali-study-dates', JSON.stringify(dates))
    }
  }

  // ── 전체 통계 ──
  const stats = useMemo(() => {
    let totalSteps = 0, doneSteps = 0, completedLessons = 0
    LESSONS.forEach(lesson => {
      const prog = getProgress(lesson.id, lesson.steps.length)
      totalSteps += lesson.steps.length
      doneSteps += prog
      if (prog >= lesson.steps.length) completedLessons++
    })
    return {
      totalLessons: LESSONS.length,
      completedLessons,
      overallPct: totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0,
    }
  }, [])

  // 현재 진행 중인 과
  const currentLessonIdx = LESSONS.findIndex((lesson, idx) => {
    const prog = getProgress(lesson.id, lesson.steps.length)
    return prog < lesson.steps.length && (idx === 0 ||
      getProgress(LESSONS[idx - 1].id, LESSONS[idx - 1].steps.length) >= LESSONS[idx - 1].steps.length)
  })
  const currentLesson = currentLessonIdx >= 0 ? LESSONS[currentLessonIdx] : null
  const allCompleted = currentLessonIdx === -1 && stats.completedLessons === stats.totalLessons

  const currentPct = currentLesson
    ? Math.round((getProgress(currentLesson.id, currentLesson.steps.length) / currentLesson.steps.length) * 100)
    : 0

  // 오늘의 명언
  const todayQuote = QUOTES[new Date().getDate() % QUOTES.length]

  // CTA 클릭
  const handleCTA = () => {
    if (allCompleted) {
      nav('/courses')
    } else if (currentLesson) {
      recordStudy()
      nav(`/learn/${currentLesson.id}`)
    } else {
      recordStudy()
      nav(`/learn/${LESSONS[0].id}`)
    }
  }

  return (
    <div className="min-h-screen pb-24"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>

      {/* ═══ 1. 상단 인사 + 프로필 ═══ */}
      <div className="px-5 pt-[max(env(safe-area-inset-top),16px)] pb-3 flex items-center justify-between animate-fadeIn">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {getGreeting()}
          </p>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            오늘도 빠알리어와 함께
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 연속 학습 불꽃 뱃지 */}
          {streak > 0 && (
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5
              transition-all duration-300"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-primary)">
                <path d="M12 23c-3.6 0-8-2.4-8-7.7C4 10 8 4.3 11 1.4c.2-.2.5-.2.7-.1.2.1.3.4.3.6 0 2 .6 4.6 2.2 6.3C16 9.8 20 12.5 20 15.3 20 20.6 15.6 23 12 23z" />
              </svg>
              <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>
                {streak}
              </span>
            </div>
          )}
          {/* 프로필 아바타 → 설정 */}
          <button
            onClick={() => nav('/profile')}
            className="w-10 h-10 rounded-full flex items-center justify-center
              transition-all duration-200 active:scale-95"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '2px solid var(--color-border)',
            }}
            aria-label="프로필">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="var(--color-text-secondary)" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </div>
      </div>

      {/* ═══ 2. 히어로 섹션 — 대형 카드 ═══ */}
      <div className="px-5 pt-2 animate-slideUp">
        <div className="relative overflow-hidden rounded-3xl"
          style={{
            background: 'linear-gradient(145deg, #8F4F08 0%, #C06B0A 30%, #D4820E 60%, #E8993A 100%)',
            minHeight: '340px',
          }}>

          {/* 장식: 연꽃 */}
          <LotusDecoration />

          {/* 미묘한 광택 효과 */}
          <div className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.08) 0%, transparent 60%)',
            }} />

          <div className="relative px-6 pt-8 pb-7 flex flex-col justify-between"
            style={{ minHeight: '340px' }}>

            {allCompleted ? (
              /* 전 과정 완료 */
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-white/15 flex items-center justify-center mb-4">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                    stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  축하합니다!
                </h2>
                <p className="text-white/70 text-sm">
                  전 과정 {stats.totalLessons}과를 모두 완료했습니다
                </p>
              </div>
            ) : currentLesson ? (
              /* 학습 이어가기 */
              <>
                <div>
                  <span className="inline-block text-[10px] font-bold tracking-widest uppercase
                    text-white/50 mb-3">
                    학습 이어가기
                  </span>
                  <h2 className="text-xl font-bold text-white leading-snug mb-1">
                    {currentLesson.title}
                  </h2>
                  <p className="text-white/60 text-sm">
                    {currentLesson.subtitle}
                  </p>
                </div>

                {/* 중앙: 프로그레스 링 */}
                <div className="flex justify-center py-4">
                  <ProgressRing pct={currentPct} size={120} />
                </div>
              </>
            ) : (
              /* 새 사용자 */
              <div className="flex-1 flex flex-col justify-center">
                <h2 className="text-2xl font-bold text-white leading-snug mb-3">
                  빠알리어의 세계로<br />
                  오신 것을 환영합니다
                </h2>
                <p className="text-white/60 text-sm leading-relaxed">
                  De Silva's Pali Primer 교재를 기반으로<br />
                  경전 실례와 함께 체계적으로 학습합니다
                </p>
              </div>
            )}

            {/* CTA 버튼 — 항상 하단 */}
            <button
              onClick={handleCTA}
              className="w-full py-4 rounded-2xl text-base font-bold
                transition-all duration-300
                active:scale-[0.97]"
              style={{
                backgroundColor: 'white',
                color: '#8F4F08',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15), 0 0 40px rgba(255,255,255,0.1)',
                marginTop: 'auto',
              }}>
              {allCompleted ? '복습 시작하기' :
               currentLesson ? '이어서 학습하기' : '학습 시작하기'}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ 3. 빠른 통계 카드 3개 ═══ */}
      <div className="px-5 pt-5 animate-slideUp delay-2">
        <div className="grid grid-cols-3 gap-3">
          {/* 완료 과목 */}
          <div className="rounded-2xl p-4 text-center card-shadow"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
            }}>
            <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-primary)" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              {stats.completedLessons}<span className="text-xs font-normal text-[var(--color-text-tertiary)]">/{stats.totalLessons}</span>
            </p>
            <p className="text-[10px] font-medium mt-0.5"
              style={{ color: 'var(--color-text-secondary)' }}>
              완료 과목
            </p>
          </div>

          {/* 연속 학습 */}
          <div className="rounded-2xl p-4 text-center card-shadow"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
            }}>
            <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, #E8993A 8%, transparent)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#E8993A">
                <path d="M12 23c-3.6 0-8-2.4-8-7.7C4 10 8 4.3 11 1.4c.2-.2.5-.2.7-.1.2.1.3.4.3.6 0 2 .6 4.6 2.2 6.3C16 9.8 20 12.5 20 15.3 20 20.6 15.6 23 12 23z" />
              </svg>
            </div>
            <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              {streak}<span className="text-xs font-normal text-[var(--color-text-tertiary)]">일</span>
            </p>
            <p className="text-[10px] font-medium mt-0.5"
              style={{ color: 'var(--color-text-secondary)' }}>
              연속 학습
            </p>
          </div>

          {/* 오늘 학습 */}
          <div className="rounded-2xl p-4 text-center card-shadow"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
            }}>
            <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 8%, transparent)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-accent)" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              {todayMinutes > 0 ? `${todayMinutes}` : '-'}
              <span className="text-xs font-normal text-[var(--color-text-tertiary)]">
                {todayMinutes > 0 ? '분' : ''}
              </span>
            </p>
            <p className="text-[10px] font-medium mt-0.5"
              style={{ color: 'var(--color-text-secondary)' }}>
              {todayMinutes > 0 ? '오늘 학습' : '시작해보세요'}
            </p>
          </div>
        </div>
      </div>

      {/* ═══ 4. 학습 캘린더 ═══ */}
      <StudyCalendar />

      {/* ═══ 5. 오늘의 빠알리 명언 ═══ */}
      <div className="px-5 pt-5 animate-slideUp delay-3">
        <div className="rounded-2xl p-5 card-shadow relative overflow-hidden"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)',
          }}>
          {/* 미묘한 배경 장식 */}
          <div className="absolute right-3 top-3 opacity-[0.04] pointer-events-none" aria-hidden="true">
            <svg width="60" height="60" viewBox="0 0 100 100" fill="var(--color-primary)">
              <ellipse cx="50" cy="40" rx="10" ry="30" />
              {[-25, 25].map(a => (
                <ellipse key={a} cx="50" cy="40" rx="9" ry="28"
                  transform={`rotate(${a}, 50, 50)`} />
              ))}
            </svg>
          </div>

          <p className="text-[10px] font-bold tracking-widest uppercase mb-3"
            style={{ color: 'var(--color-text-tertiary)' }}>
            오늘의 게송
          </p>
          <p className="text-lg leading-relaxed mb-2 pali-text"
            style={{ color: 'var(--color-primary-dark)' }}>
            {todayQuote.pali}
          </p>
          <p className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}>
            {todayQuote.ko}
          </p>
        </div>
      </div>

      {/* ═══ 6. 푸터 ═══ */}
      <div className="px-5 pt-6 pb-4 text-center">
        <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
          v2.0 · De Silva's Pali Primer 기반
        </p>
      </div>
    </div>
  )
}

// ── 학습 캘린더 컴포넌트 ──
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function StudyCalendar() {
  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<DayLog | null>(null)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const studyDates = getMonthStudyDates(year, month)

  // 달의 첫째 날 요일, 마지막 날짜
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date().toISOString().slice(0, 10)

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const log = getDayLog(dateStr)
    setSelectedDay(log)
  }

  return (
    <div className="px-5 pt-5 animate-slideUp delay-2">
      <div className="rounded-2xl p-4 card-shadow"
        style={{ backgroundColor: 'var(--color-surface)', border: '1.5px solid var(--color-border)' }}>

        {/* 헤더: 월 이동 */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full active:scale-90"
            style={{ color: 'var(--color-text-secondary)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <p className="text-sm font-bold">{year}년 {month + 1}월</p>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full active:scale-90"
            style={{ color: 'var(--color-text-secondary)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold py-1"
              style={{ color: d === '일' ? '#EF5350' : d === '토' ? '#42A5F5' : 'var(--color-text-tertiary)' }}>
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-1">
          {/* 빈 칸 */}
          {Array.from({ length: firstDow }, (_, i) => (
            <div key={`e${i}`} className="aspect-square" />
          ))}
          {/* 날짜 */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const hasStudy = studyDates.has(dateStr)
            const isToday = dateStr === today
            return (
              <button key={day}
                onClick={() => handleDayClick(day)}
                className="aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-medium transition-all active:scale-90"
                style={{
                  backgroundColor: hasStudy
                    ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)'
                    : 'transparent',
                  border: isToday ? '2px solid var(--color-primary)' : '2px solid transparent',
                  color: hasStudy ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontWeight: hasStudy ? 700 : 400,
                }}>
                {day}
                {hasStudy && (
                  <span className="w-1 h-1 rounded-full mt-0.5"
                    style={{ backgroundColor: 'var(--color-primary)' }} />
                )}
              </button>
            )
          })}
        </div>

        {/* 선택한 날짜 상세 */}
        {selectedDay && (
          <div className="mt-3 pt-3 space-y-2"
            style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold">{selectedDay.date}</p>
              <button onClick={() => setSelectedDay(null)}
                className="text-xs active:scale-90" style={{ color: 'var(--color-text-tertiary)' }}>닫기</button>
            </div>
            {/* 요약 통계 */}
            <div className="flex gap-3 text-center">
              <div className="flex-1 rounded-xl py-2"
                style={{ backgroundColor: 'var(--color-surface-elevated, var(--color-bg))' }}>
                <p className="text-base font-bold" style={{ color: 'var(--color-primary)' }}>{selectedDay.sessionCount}</p>
                <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>학습 횟수</p>
              </div>
              <div className="flex-1 rounded-xl py-2"
                style={{ backgroundColor: 'var(--color-surface-elevated, var(--color-bg))' }}>
                <p className="text-base font-bold" style={{ color: 'var(--color-primary)' }}>{selectedDay.totalMinutes}</p>
                <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>분</p>
              </div>
            </div>
            {/* 개별 학습 기록 */}
            <div className="space-y-1.5">
              {selectedDay.entries.map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg"
                  style={{ backgroundColor: 'var(--color-surface-elevated, var(--color-bg))' }}>
                  <span className="font-bold truncate flex-1" style={{ color: 'var(--color-text)' }}>
                    {e.lessonTitle}
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{e.minutes}분</span>
                  <span style={{ color: 'var(--color-accent)' }}>{e.score}/{e.totalSteps}</span>
                  <span className="flex gap-0.5">
                    {[0, 1, 2].map(h => (
                      <span key={h} className={`text-[10px] ${h < e.hearts ? '' : 'opacity-20'}`}>🪷</span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
