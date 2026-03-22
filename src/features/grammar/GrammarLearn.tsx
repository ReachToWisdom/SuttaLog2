// 문법 학습 UI 엔진 (Duolingo 스타일 - 리디자인)
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { speakPali } from '../../utils/pali-tts'
import WritingCanvas from '../../components/WritingCanvas'
import { getLessonById } from './lessons'
import type { StepType } from './types'
import { debouncedPush, isSyncLoggedIn } from '../../utils/sync'

// 스텝 전환 상태
type TransitionPhase = 'enter' | 'stable' | 'exit'

export default function GrammarLearn() {
  const nav = useNavigate()
  const { lessonId } = useParams<{ lessonId: string }>()
  const lid = lessonId || 'lesson-01'
  const lesson = getLessonById(lid)
  const STEPS = lesson?.steps || []

  // 이어 학습
  const savedStep = Number(localStorage.getItem(`pali-primer-${lid}`) || '0')
  const [stepIdx, setStepIdxRaw] = useState(
    Math.min(savedStep, Math.max(0, STEPS.length - 1))
  )

  const setStepIdx = (updater: number | ((prev: number) => number)) => {
    setStepIdxRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      localStorage.setItem(`pali-primer-${lid}`, String(next))
      // 로그인 상태면 클라우드 동기화 (디바운스)
      if (isSyncLoggedIn()) debouncedPush()
      return next
    })
  }

  const [hearts, setHearts] = useState(3)
  const [prevHearts, setPrevHearts] = useState(3)
  const [selected, setSelected] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [writingChecked, setWritingChecked] = useState(false)
  const [arrangeOrder, setArrangeOrder] = useState<number[]>([])
  const [phase, setPhase] = useState<TransitionPhase>('enter')
  const [showCompletion, setShowCompletion] = useState(false)
  const startTimeRef = useRef(Date.now())
  const [correctCount, setCorrectCount] = useState(0)
  const [showTOC, setShowTOC] = useState(false)
  const writingEnabled =
    localStorage.getItem('pali-primer-writing') !== 'off'

  // 하트 소실 감지
  const [heartShakeIdx, setHeartShakeIdx] = useState<number | null>(null)
  useEffect(() => {
    if (hearts < prevHearts) {
      setHeartShakeIdx(hearts)
      const t = setTimeout(() => setHeartShakeIdx(null), 600)
      return () => clearTimeout(t)
    }
    setPrevHearts(hearts)
  }, [hearts, prevHearts])

  // 스텝 전환 애니메이션
  useEffect(() => {
    setPhase('enter')
    const t = setTimeout(() => setPhase('stable'), 350)
    return () => clearTimeout(t)
  }, [stepIdx])

  // 과 없음
  if (!STEPS.length) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <p>과를 찾을 수 없습니다.</p>
      </div>
    )
  }

  const step: StepType = STEPS[stepIdx]
  const progress = ((stepIdx + 1) / STEPS.length) * 100
  const speak = (text: string) => speakPali(text)

  const getAnswerText = (): string => {
    if (!('answer' in step) || !('options' in step)) return ''
    const s = step as { options: string[]; answer: number }
    return s.options[s.answer]
  }

  // 결정적 셔플 (동일 stepIdx에서 동일 순서)
  const shuffledOpts = (() => {
    if (!('options' in step)) return []
    const opts = [...(step as { options: string[] }).options]
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.abs(((stepIdx + 1) * 31 + i * 17) % (i + 1))
      ;[opts[i], opts[j]] = [opts[j], opts[i]]
    }
    return opts
  })()

  const handleCheck = () => {
    if (selected === null) return
    setShowResult(true)
    const answerText = getAnswerText()
    if (shuffledOpts[selected] !== answerText) {
      setHearts(h => Math.max(0, h - 1))
    } else {
      setCorrectCount(c => c + 1)
    }
  }

  // 스텝 전환 (exit → 다음 스텝)
  const transitionTo = useCallback(
    (action: () => void) => {
      setPhase('exit')
      setTimeout(() => {
        action()
        setSelected(null)
        setShowResult(false)
        setWritingChecked(false)
        setArrangeOrder([])
      }, 200)
    },
    []
  )

  const handleNext = () => {
    speechSynthesis.cancel()
    if (stepIdx + 1 >= STEPS.length) {
      // 완료 화면 표시
      localStorage.setItem(`pali-primer-${lid}`, String(STEPS.length))
      setShowCompletion(true)
      return
    }
    transitionTo(() => setStepIdx(i => i + 1))
  }

  const handlePrev = () => {
    speechSynthesis.cancel()
    if (stepIdx > 0) {
      transitionTo(() => setStepIdx(i => i - 1))
    }
  }

  const isQuizType =
    step.type === 'quiz' ||
    step.type === 'match-listen' ||
    step.type === 'match-reverse'

  // arrange 정답 체크
  const isArrangeCorrect =
    step.type === 'arrange' &&
    arrangeOrder.length === step.correctOrder.length &&
    arrangeOrder.every((v, i) => v === step.correctOrder[i])

  // 경과 시간 (분)
  const getElapsedMin = () =>
    Math.round((Date.now() - startTimeRef.current) / 60000)

  // === 완료 화면 ===
  if (showCompletion) {
    const elapsed = getElapsedMin()
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-text)',
        }}
      >
        <div className="bounce-in">
          <span className="text-7xl block mb-2">🎉</span>
          <span className="text-5xl block">🪷</span>
        </div>
        <h2
          className="text-2xl font-bold mt-6 intro-fade-up-delay"
          style={{ color: 'var(--color-primary)' }}
        >
          수고하셨습니다!
        </h2>
        <p
          className="text-sm mt-2 intro-fade-up-delay2"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          이 과를 모두 마쳤습니다
        </p>

        {/* 통계 카드 */}
        <div
          className="mt-6 w-full max-w-xs rounded-2xl p-4 intro-fade-up-delay2"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="flex justify-around text-center">
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
                {correctCount}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                정답
              </p>
            </div>
            <div
              className="w-px"
              style={{ backgroundColor: 'var(--color-border)' }}
            />
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {hearts}/3
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                연꽃잎
              </p>
            </div>
            <div
              className="w-px"
              style={{ backgroundColor: 'var(--color-border)' }}
            />
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-primary-light)' }}>
                {elapsed || '<1'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                분
              </p>
            </div>
          </div>
        </div>

        {/* CTA 버튼 */}
        <button
          onClick={() => nav('/')}
          className="mt-8 w-full max-w-xs py-3.5 rounded-2xl text-white font-bold text-sm
                     active:scale-[0.97] transition-transform"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          홈으로 돌아가기
        </button>
        <button
          onClick={() => {
            setShowCompletion(false)
            setHearts(3)
            setCorrectCount(0)
            setStepIdx(0)
            startTimeRef.current = Date.now()
          }}
          className="mt-3 w-full max-w-xs py-3 rounded-2xl font-bold text-sm
                     active:scale-[0.97] transition-transform"
          style={{
            color: 'var(--color-primary)',
            border: '1.5px solid var(--color-primary)',
          }}
        >
          다시 학습하기
        </button>
      </div>
    )
  }

  // === 체력 0 게임오버 ===
  if (hearts <= 0) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-text)',
        }}
      >
        <div className="bounce-in">
          <span className="text-7xl block">🥀</span>
        </div>
        <h2 className="text-xl font-bold mt-6 intro-fade-up-delay">
          연꽃잎을 모두 잃었습니다
        </h2>
        <p
          className="text-sm mt-2 intro-fade-up-delay2"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          괜찮아요, 다시 도전하면 됩니다!
        </p>
        <p
          className="text-xs mt-1 intro-fade-up-delay2"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {stepIdx + 1}/{STEPS.length} 단계까지 진행했습니다
        </p>
        <button
          onClick={() => {
            setHearts(3)
            setStepIdx(0)
            setCorrectCount(0)
          }}
          className="mt-8 w-60 py-3.5 rounded-2xl text-white font-bold text-sm
                     active:scale-[0.97] transition-transform"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          처음부터 다시
        </button>
        <button
          onClick={() => nav('/')}
          className="mt-3 text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          홈으로 돌아가기
        </button>
      </div>
    )
  }

  // 전환 CSS 클래스
  const phaseClass =
    phase === 'enter'
      ? 'step-enter'
      : phase === 'exit'
        ? 'step-exit'
        : ''

  // === 선택지 렌더링 ===
  const renderOptions = () => {
    const answerText = getAnswerText()
    return (
      <div className="space-y-3">
        {shuffledOpts.map((opt, i) => {
          const isAns = showResult && opt === answerText
          const isWrn = showResult && selected === i && opt !== answerText
          const isSelected = !showResult && selected === i
          return (
            <button
              key={i}
              onClick={() => !showResult && setSelected(i)}
              disabled={showResult}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl text-left text-sm
                font-medium transition-all active:scale-[0.98]
                ${isAns ? 'option-correct' : ''}
                ${isWrn ? 'option-wrong' : ''}`}
              style={{
                backgroundColor: isAns
                  ? '#E8F5E9'
                  : isWrn
                    ? '#FFEBEE'
                    : 'var(--color-surface)',
                border: isAns
                  ? '2px solid #4CAF50'
                  : isWrn
                    ? '2px solid #F44336'
                    : isSelected
                      ? '2px solid var(--color-primary)'
                      : '1.5px solid var(--color-border)',
                minHeight: '48px',
              }}
            >
              {/* 라디오 인디케이터 */}
              <span
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                style={{
                  border: isAns
                    ? '2px solid #4CAF50'
                    : isWrn
                      ? '2px solid #F44336'
                      : isSelected
                        ? '2px solid var(--color-primary)'
                        : '2px solid var(--color-border)',
                  backgroundColor: isAns
                    ? '#4CAF50'
                    : isWrn
                      ? '#F44336'
                      : isSelected
                        ? 'var(--color-primary)'
                        : 'transparent',
                }}
              >
                {(isAns || isSelected) && !isWrn && (
                  <span className="w-2 h-2 rounded-full bg-white" />
                )}
                {isWrn && (
                  <span className="text-white text-xs font-bold">✕</span>
                )}
              </span>
              <span className="flex-1">{opt}</span>
              {/* 결과 아이콘 */}
              {isAns && (
                <span className="text-green-600 font-bold text-base">✓</span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  // === 프로그레스 바 도트 (최대 12개 표시) ===
  const renderProgressDots = () => {
    const maxDots = Math.min(STEPS.length, 12)
    const ratio = STEPS.length / maxDots
    return (
      <div className="flex items-center gap-1 mt-1 justify-center">
        {Array.from({ length: maxDots }, (_, i) => {
          const mappedIdx = Math.floor(i * ratio)
          const isCurrent = mappedIdx <= stepIdx
          const isExact =
            Math.floor(stepIdx / ratio) === i
          return (
            <span
              key={i}
              className={`rounded-full transition-all duration-300
                ${isExact ? 'dot-active' : ''}`}
              style={{
                width: isExact ? '8px' : '5px',
                height: isExact ? '8px' : '5px',
                backgroundColor: isCurrent
                  ? 'var(--color-primary)'
                  : 'var(--color-border)',
              }}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      {/* === 상단 바: 프로그레스 + 하트 === */}
      <div className="shrink-0 px-4 pt-3 pb-1">
        <div className="flex items-center gap-3">
          {/* 닫기 */}
          <button
            onClick={() => nav('/')}
            className="w-8 h-8 flex items-center justify-center rounded-full
                       text-base active:scale-90 transition-transform"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            ✕
          </button>

          {/* 프로그레스 바 */}
          <div className="flex-1 flex flex-col gap-0.5">
            <div
              className="h-2.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--color-border)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700 ease-out
                           progress-bar-gradient"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* 도트 + 스텝 텍스트 */}
            <div className="flex items-center justify-between">
              <div className="flex-1">{renderProgressDots()}</div>
              <span
                className="text-[10px] ml-2 shrink-0"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {stepIdx + 1}/{STEPS.length}
              </span>
            </div>
          </div>

          {/* 목차 버튼 */}
          <button
            onClick={() => setShowTOC(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full
                       active:scale-90 transition-transform shrink-0"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label="목차"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>

          {/* 하트 (연꽃) */}
          <div className="flex gap-1 shrink-0 ml-1">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className={`text-lg transition-all duration-300
                  ${i < hearts ? 'heart-pulse' : 'opacity-15 grayscale scale-75'}
                  ${heartShakeIdx === i ? 'heart-shake' : ''}`}
                style={{
                  animationDelay:
                    i < hearts ? `${i * 0.2}s` : undefined,
                }}
              >
                🪷
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* === 목차 오버레이 === */}
      {showTOC && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: 'var(--color-overlay)' }}
          onClick={() => setShowTOC(false)}>
          <div className="w-full max-w-lg rounded-t-3xl overflow-hidden animate-slideUp"
            style={{ backgroundColor: 'var(--color-bg)', maxHeight: '70vh' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="text-base font-bold">스텝 목차</h3>
              <button onClick={() => setShowTOC(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full
                           active:scale-90 transition-transform"
                style={{ color: 'var(--color-text-secondary)' }}>✕</button>
            </div>
            <div className="overflow-y-auto px-3 pb-6" style={{ maxHeight: 'calc(70vh - 60px)' }}>
              {STEPS.map((s, i) => {
                const label = s.type === 'intro' ? `${s.title}`
                  : s.type === 'teach' ? `${s.word} — ${s.meaning}`
                  : s.type === 'teach-grammar' ? s.title
                  : s.type === 'quiz' ? `퀴즈: ${s.question.slice(0, 30)}...`
                  : s.type === 'match-listen' ? `듣기: ${s.instruction.slice(0, 30)}`
                  : s.type === 'match-reverse' ? `뜻맞추기: ${s.meaning}`
                  : s.type === 'writing' ? `쓰기: ${s.answer}`
                  : s.type === 'speak' ? `따라읽기: ${s.pali.slice(0, 30)}`
                  : s.type === 'arrange' ? `배열: ${s.instruction.slice(0, 30)}`
                  : s.type === 'verse' ? `경전: ${s.pali.slice(0, 30)}`
                  : `스텝 ${i + 1}`
                const isCur = i === stepIdx
                const typeIcon = s.type === 'intro' ? '📖' : s.type === 'teach' ? '📝'
                  : s.type === 'teach-grammar' ? '📐' : s.type === 'quiz' ? '❓'
                  : s.type === 'match-listen' ? '🔊' : s.type === 'match-reverse' ? '🎯'
                  : s.type === 'writing' ? '✍️' : s.type === 'speak' ? '🎤'
                  : s.type === 'arrange' ? '🧩' : s.type === 'verse' ? '☸️' : '•'

                return (
                  <button key={i}
                    onClick={() => {
                      transitionTo(() => {
                        setStepIdx(i)
                        setShowTOC(false)
                      })
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                               transition-all duration-200 active:scale-[0.98]"
                    style={{
                      backgroundColor: isCur
                        ? 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))'
                        : 'transparent',
                      border: isCur ? '1px solid var(--color-primary-light)' : '1px solid transparent',
                    }}>
                    <span className="text-sm shrink-0">{typeIcon}</span>
                    <span className="text-xs font-medium truncate flex-1"
                      style={{ color: isCur ? 'var(--color-primary)' : 'var(--color-text)' }}>
                      {i + 1}. {label}
                    </span>
                    {isCur && (
                      <span className="text-[10px] font-bold shrink-0"
                        style={{ color: 'var(--color-primary)' }}>현재</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* === 메인 콘텐츠 === */}
      <div
        className={`flex-1 flex flex-col overflow-y-auto px-4 pt-3 pb-28
                    scroll-smooth ${phaseClass}`}
      >
        {/* --- 인트로 --- */}
        {step.type === 'intro' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <span className="text-7xl mb-6 intro-fade-up block">
              {step.icon}
            </span>
            <h1
              className="text-3xl font-bold intro-fade-up-delay"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {step.title}
            </h1>
            <p
              className="pali-text text-sm mt-2 intro-fade-up-delay"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {step.subtitle}
            </p>
            <p
              className="text-sm mt-8 whitespace-pre-line leading-relaxed
                         max-w-sm intro-fade-up-delay2"
            >
              {step.description}
            </p>
          </div>
        )}

        {/* --- 단어 교육 --- */}
        {step.type === 'teach' && (
          <div className="flex-1 flex flex-col pt-1">
            {/* 게송 문맥 */}
            {step.verseLine && (
              <div
                className="rounded-2xl p-4 mb-4"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <p className="pali-text text-xs leading-relaxed">
                  {step.verseLine
                    .split(
                      new RegExp(
                        `(${step.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
                        'i'
                      )
                    )
                    .map((part, i) =>
                      part.toLowerCase() === step.word.toLowerCase() ? (
                        <span
                          key={i}
                          className="font-bold px-1 py-0.5 rounded text-sm"
                          style={{
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                          }}
                        >
                          {part}
                        </span>
                      ) : (
                        <span
                          key={i}
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {part}
                        </span>
                      )
                    )}
                </p>
                {step.verseLineKo && (
                  <p
                    className="text-xs mt-2"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {step.verseLineKo}
                  </p>
                )}
              </div>
            )}

            {/* 메인 단어 카드 */}
            <div
              className="rounded-2xl p-6 text-center"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '2px solid var(--color-primary)',
                boxShadow: '0 4px 16px rgba(212,118,10,0.08)',
              }}
            >
              <span className="text-4xl block">{step.icon}</span>
              <p
                className="pali-text text-3xl font-bold mt-3"
                style={{
                  fontFamily: 'var(--font-pali)',
                  color: 'var(--color-primary)',
                }}
              >
                {step.word}
              </p>
              {/* 발음 필 배지 */}
              <span
                className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                  color: 'var(--color-primary)',
                }}
              >
                {step.pronKo}
              </span>

              {/* 오디오 버튼 */}
              {step.audio && (
                <div className="mt-3">
                  <button
                    onClick={() => speak(step.word)}
                    className="audio-ripple px-5 py-2 rounded-full text-white text-sm
                               font-medium active:scale-95 transition-transform"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    🔊 발음 듣기
                  </button>
                </div>
              )}

              <hr
                className="my-4"
                style={{ borderColor: 'var(--color-border)' }}
              />
              <p className="text-xl font-bold">{step.meaning}</p>

              {/* 문법 태그 */}
              {step.grammar && (
                <span
                  className="inline-block mt-2 px-3 py-1 rounded-full text-xs"
                  style={{
                    backgroundColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {step.grammar}
                </span>
              )}
            </div>

            {/* 원형/형태 정보 (바로 표시) */}
            {(step.baseForm || step.formNote) && (
              <div
                className="mt-3 rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: '#E3F2FD',
                  border: '1px solid #BBDEFB',
                }}
              >
                <div className="px-4 py-3">
                  <p className="text-xs font-bold flex items-center gap-1 mb-1">
                    📐 문법 상세
                    {step.baseForm && (
                      <span className="font-normal ml-1">
                        (원형: {step.baseForm})
                      </span>
                    )}
                  </p>
                  {step.formNote && (
                    <p
                      className="text-xs whitespace-pre-line leading-relaxed"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {step.formNote}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 불교 맥락 */}
            {step.buddhism && (
              <div
                className="mt-3 rounded-2xl p-4 text-xs flex items-start gap-2"
                style={{
                  backgroundColor: '#E8F5E9',
                  border: '1px solid #C8E6C9',
                }}
              >
                <span className="text-base">☸️</span>
                <span>{step.buddhism}</span>
              </div>
            )}
          </div>
        )}

        {/* --- 문법 교육 --- */}
        {step.type === 'teach-grammar' && (
          <div className="flex-1 flex flex-col pt-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl">📐</span>
              <h2 className="text-lg font-bold">{step.title}</h2>
            </div>

            {/* 예문 하이라이트 박스 */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 8%, white), color-mix(in srgb, var(--color-accent) 6%, white))',
                border: '1.5px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
              }}
            >
              <p
                className="pali-text text-lg font-bold text-center whitespace-pre-line"
                style={{ color: 'var(--color-primary)' }}
              >
                {step.example}
              </p>
              <p className="text-center mt-2 font-semibold text-sm whitespace-pre-line">
                {step.exampleKo}
              </p>
            </div>

            {/* 설명 */}
            <div
              className="mt-4 rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-line"
              style={{
                backgroundColor: '#E3F2FD',
                border: '1px solid #BBDEFB',
              }}
            >
              {step.explanation.split('\n').map((line, i) => (
                <p key={i} className={`${i > 0 ? 'mt-2' : ''} flex gap-2`}>
                  {line.startsWith('-') || line.startsWith('•') ? (
                    <>
                      <span
                        className="shrink-0 w-1.5 h-1.5 rounded-full mt-2"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                      />
                      <span>{line.replace(/^[-•]\s*/, '')}</span>
                    </>
                  ) : (
                    <span>{line}</span>
                  )}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* --- 선택 퀴즈 --- */}
        {step.type === 'quiz' && (
          <div className="flex-1 flex flex-col">
            <p className="text-lg font-bold mb-2">{step.question}</p>
            {step.hint && !showResult && (
              <div
                className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl text-xs"
                style={{
                  backgroundColor: '#FFF8E1',
                  border: '1px solid #FFE082',
                }}
              >
                <span>💡</span>
                <span>{step.hint}</span>
              </div>
            )}
            {renderOptions()}
          </div>
        )}

        {/* --- 듣고 고르기 --- */}
        {step.type === 'match-listen' && (
          <div className="flex-1 flex flex-col">
            <p className="text-sm font-bold mb-4">{step.instruction}</p>
            <button
              onClick={() => speak(step.word)}
              className="w-24 h-24 mx-auto rounded-full flex items-center justify-center
                         text-4xl active:scale-90 transition-transform mb-6 mic-pulse"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
              }}
            >
              🔊
            </button>
            {renderOptions()}
          </div>
        )}

        {/* --- 뜻 보고 고르기 --- */}
        {step.type === 'match-reverse' && (
          <div className="flex-1 flex flex-col">
            <p className="text-sm font-bold mb-2">{step.instruction}</p>
            <div
              className="rounded-2xl p-4 mb-4 text-center"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1.5px solid var(--color-primary)',
              }}
            >
              <p
                className="text-xl font-bold"
                style={{ color: 'var(--color-primary)' }}
              >
                {step.meaning}
              </p>
            </div>
            {renderOptions()}
          </div>
        )}

        {/* --- 경전 구절 --- */}
        {step.type === 'verse' && (
          <div className="flex-1 flex flex-col">
            <div
              className="rounded-2xl p-5"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              }}
            >
              {/* 장식 상단 */}
              <div
                className="text-center text-xs mb-3 tracking-widest"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                ─── ☸ ───
              </div>

              <p
                className="pali-text text-base leading-loose"
                style={{ fontFamily: 'var(--font-pali)' }}
              >
                {step.pali.split(/(\s+)/).map((token, i) => {
                  const clean = token
                    .replace(/[,.:;—""\n]/g, '')
                    .toLowerCase()
                  const isHL = step.highlight?.some(h =>
                    clean.includes(h.toLowerCase())
                  )
                  return (
                    <span key={i}>
                      {isHL ? (
                        <button
                          onClick={() => speak(token)}
                          className="verse-word-dot font-bold px-1 py-0.5 rounded"
                          style={{
                            backgroundColor:
                              'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                            color: 'var(--color-primary)',
                          }}
                        >
                          {token}
                        </button>
                      ) : (
                        <span
                          className="verse-word-dot"
                          onClick={() => speak(token.trim())}
                          style={{ color: 'var(--color-primary)' }}
                        >
                          {token}
                        </span>
                      )}
                    </span>
                  )
                })}
              </p>

              {/* 전체 듣기 */}
              <button
                onClick={() => speak(step.pali)}
                className="audio-ripple mt-3 px-4 py-1.5 rounded-full text-xs font-medium
                           active:scale-95 transition-transform"
                style={{
                  color: 'var(--color-accent)',
                  backgroundColor:
                    'color-mix(in srgb, var(--color-accent) 8%, transparent)',
                }}
              >
                🔊 전체 듣기
              </button>

              {/* 발음 */}
              <p
                className="text-xs mt-3"
                style={{
                  color: 'var(--color-primary)',
                  opacity: 0.7,
                }}
              >
                🗣️ {step.pronKo}
              </p>

              {/* 번역 오버레이 */}
              <div
                className="mt-3 rounded-xl p-3 text-sm"
                style={{
                  backgroundColor:
                    'color-mix(in srgb, var(--color-border) 30%, transparent)',
                }}
              >
                {step.translation}
              </div>
            </div>

            {/* 노트 */}
            {step.note && (
              <div
                className="mt-3 rounded-2xl p-4 text-xs flex items-start gap-2"
                style={{
                  backgroundColor: '#FFF8E1',
                  border: '1px solid #FFE082',
                }}
              >
                <span>📝</span>
                <span>{step.note}</span>
              </div>
            )}
          </div>
        )}

        {/* --- 따라 읽기 --- */}
        {step.type === 'speak' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            {/* 장식 프레임 */}
            <div
              className="rounded-2xl p-6 w-full max-w-sm mb-8"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              }}
            >
              <div
                className="text-center text-xs mb-2 tracking-widest"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                ─── 따라 읽기 ───
              </div>
              <p
                className="pali-text text-lg font-semibold"
                style={{ color: 'var(--color-primary)' }}
              >
                {step.pali}
              </p>
              <p className="text-sm mt-2 font-medium">{step.pronKo}</p>
            </div>

            {/* 마이크 버튼 */}
            <button
              onClick={() => speak(step.pali)}
              className="w-20 h-20 rounded-full flex items-center justify-center
                         text-3xl active:scale-90 transition-transform mic-pulse"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
              }}
            >
              🎤
            </button>
            <p
              className="text-xs mt-3"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              탭하면 발음을 들을 수 있습니다
            </p>
          </div>
        )}

        {/* --- 쓰기 --- */}
        {step.type === 'writing' &&
          !writingEnabled &&
          (() => {
            handleNext()
            return null
          })()}
        {step.type === 'writing' && writingEnabled && (
          <div className="flex-1 flex flex-col">
            <p className="text-lg font-bold mb-2">✍️ {step.instruction}</p>
            <div
              className="flex items-center gap-3 mb-3 px-3 py-2 rounded-xl"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <span className="text-sm">
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  뜻:
                </span>{' '}
                {step.meaning}
              </span>
              <span
                className="w-px h-4"
                style={{ backgroundColor: 'var(--color-border)' }}
              />
              <span className="text-sm">
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  발음:
                </span>{' '}
                {step.pronKo}
              </span>
            </div>

            <button
              onClick={() => speak(step.answer)}
              className="audio-ripple text-xs mb-4 flex items-center gap-1
                         self-start px-3 py-1.5 rounded-full active:scale-95 transition-transform"
              style={{
                color: 'var(--color-accent)',
                backgroundColor:
                  'color-mix(in srgb, var(--color-accent) 8%, transparent)',
              }}
            >
              🔊 발음 듣기
            </button>

            {/* 캔버스 영역 */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                border: '1.5px solid var(--color-border)',
                minHeight: '200px',
              }}
            >
              <WritingCanvas />
            </div>

            {/* 정답 보기 토글 */}
            {!writingChecked ? (
              <button
                onClick={() => setWritingChecked(true)}
                className="mt-4 text-sm self-center py-2 px-4 rounded-xl
                           active:scale-95 transition-all"
                style={{
                  color: 'var(--color-text-secondary)',
                  border: '1px dashed var(--color-border)',
                }}
              >
                정답 확인하기
              </button>
            ) : (
              <div
                className="mt-4 rounded-2xl p-4 text-center reveal-down"
                style={{
                  backgroundColor: '#E8F5E9',
                  border: '1px solid #C8E6C9',
                }}
              >
                <p
                  className="text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  정답
                </p>
                <p
                  className="pali-text text-2xl font-bold mt-1"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {step.answer}
                </p>
                {step.hint && (
                  <p
                    className="text-xs mt-2 flex items-center justify-center gap-1"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    💡 {step.hint}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- 문장 배열 --- */}
        {step.type === 'arrange' && (
          <div className="flex-1 flex flex-col">
            <p className="text-lg font-bold mb-2">🧩 {step.instruction}</p>
            <p
              className="text-xs mb-4"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {step.translation}
            </p>

            {/* 배치 슬롯 (드롭존) */}
            <div
              className="flex flex-wrap gap-2 p-4 min-h-16 rounded-2xl mb-4
                         transition-all duration-200"
              style={{
                backgroundColor: arrangeOrder.length
                  ? 'color-mix(in srgb, var(--color-primary) 5%, var(--color-surface))'
                  : 'var(--color-surface)',
                border: arrangeOrder.length
                  ? '2px solid color-mix(in srgb, var(--color-primary) 30%, transparent)'
                  : '2px dashed var(--color-border)',
              }}
            >
              {arrangeOrder.length === 0 && (
                <p
                  className="text-xs w-full text-center"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  아래에서 단어를 순서대로 선택하세요
                </p>
              )}
              {arrangeOrder.map((idx, i) => (
                <button
                  key={i}
                  onClick={() =>
                    setArrangeOrder(o => o.filter((_, j) => j !== i))
                  }
                  className="px-4 py-2.5 rounded-xl text-sm font-medium pali-text
                             active:scale-95 transition-all"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    boxShadow: '0 2px 6px rgba(212,118,10,0.2)',
                  }}
                >
                  {step.blocks[idx]}
                </button>
              ))}
            </div>

            {/* 선택 블록 */}
            <div className="flex flex-wrap gap-2">
              {step.blocks.map((block, idx) => {
                const used = arrangeOrder.includes(idx)
                return (
                  <button
                    key={idx}
                    onClick={() =>
                      !used && setArrangeOrder(o => [...o, idx])
                    }
                    className="px-4 py-2.5 rounded-xl text-sm font-medium pali-text
                               active:scale-95 transition-all duration-200"
                    style={{
                      backgroundColor: used
                        ? 'var(--color-border)'
                        : 'var(--color-surface)',
                      border: used
                        ? '1.5px solid var(--color-border)'
                        : '1.5px solid var(--color-border)',
                      opacity: used ? 0.35 : 1,
                      transform: used ? 'scale(0.95)' : 'scale(1)',
                      boxShadow: used
                        ? 'none'
                        : '0 1px 4px rgba(0,0,0,0.06)',
                    }}
                  >
                    {block}
                  </button>
                )
              })}
            </div>

            {/* 정답 체크 */}
            {arrangeOrder.length === step.blocks.length && (
              <div
                className={`mt-4 rounded-2xl p-4 text-center text-sm font-medium
                  ${isArrangeCorrect ? 'option-correct' : 'option-wrong'}`}
                style={{
                  backgroundColor: isArrangeCorrect
                    ? '#E8F5E9'
                    : '#FFEBEE',
                  border: `1.5px solid ${isArrangeCorrect ? '#C8E6C9' : '#FFCDD2'}`,
                }}
              >
                {isArrangeCorrect ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="text-green-600 text-lg">✓</span>
                    정답입니다!
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span className="text-red-500 text-lg">✕</span>
                    다시 시도해보세요
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* === 하단 바 (프로스트 글래스) === */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pt-3 pb-3 flex items-center gap-3
                   bottom-bar-frost"
        style={{
          borderTop: '1px solid color-mix(in srgb, var(--color-border) 50%, transparent)',
        }}
      >
        {/* 뒤로 */}
        {stepIdx > 0 && (
          <button
            onClick={handlePrev}
            className="w-12 h-12 flex items-center justify-center rounded-2xl
                       text-sm font-bold active:scale-95 transition-transform shrink-0"
            style={{
              border: '1.5px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            ←
          </button>
        )}

        {/* 메인 버튼 */}
        {isQuizType && !showResult ? (
          <button
            onClick={handleCheck}
            disabled={selected === null}
            className="flex-1 py-3.5 rounded-2xl text-white font-bold text-sm
                       transition-all duration-200 active:scale-[0.97]"
            style={{
              backgroundColor:
                selected !== null
                  ? 'var(--color-primary)'
                  : 'var(--color-border)',
              color: selected !== null ? 'white' : 'var(--color-text-secondary)',
              opacity: selected !== null ? 1 : 0.7,
              minHeight: '48px',
            }}
          >
            확인
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex-1 py-3.5 rounded-2xl text-white font-bold text-sm
                       active:scale-[0.97] transition-transform"
            style={{
              backgroundColor: 'var(--color-primary)',
              minHeight: '48px',
            }}
          >
            {stepIdx + 1 >= STEPS.length ? '🪷 완료' : '다음'}
          </button>
        )}

        {/* 건너뛰기 — 모든 스텝에서 표시 */}
        {stepIdx + 1 < STEPS.length && (
          <button
            onClick={handleNext}
            className="shrink-0 text-xs font-medium py-2 px-1
                       active:opacity-50 transition-opacity"
            style={{
              color: 'var(--color-text-secondary)',
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            건너뛰기
          </button>
        )}
      </div>
    </div>
  )
}
