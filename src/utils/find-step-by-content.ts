// 메모 내용으로 정확한 스텝 찾기
import { LESSONS } from '../features/grammar/lessons'
import type { StepType } from '../features/grammar/types'

interface StepLocation {
  lessonId: string
  stepIndex: number
  matchedText: string
}

/**
 * 메모 텍스트에서 원문/수정본 추출
 * 예: "사냥꾼은 사자를 위해 => 사냥꾼은 사자에게" → ["사냥꾼은 사자를 위해", "사냥꾼은 사자에게"]
 */
function extractTexts(memoText: string): string[] {
  const texts: string[] = []

  // "원문 => 수정본" 형식
  if (memoText.includes('=>')) {
    const parts = memoText.split('=>').map(t => t.trim())
    texts.push(...parts)
  }

  // 그냥 일반 텍스트
  texts.push(memoText.trim())

  return texts
}

/**
 * 스텝에서 검색 가능한 모든 텍스트 추출
 */
function getStepTexts(step: StepType): string[] {
  const texts: string[] = []

  if ('question' in step) texts.push(step.question)
  if ('pali' in step) texts.push(step.pali)
  if ('word' in step) texts.push(step.word)
  if ('meaning' in step) texts.push(step.meaning)
  if ('title' in step) texts.push(step.title)
  if ('translation' in step) texts.push(step.translation)

  if ('options' in step && Array.isArray(step.options)) {
    texts.push(...step.options)
  }

  return texts
}

/**
 * 메모 텍스트로 정확한 스텝 위치 찾기
 */
export function findStepByContent(
  lessonId: string,
  memoText: string
): StepLocation | null {
  const lesson = LESSONS.find(l => l.id === lessonId)
  if (!lesson) return null

  const searchTexts = extractTexts(memoText)

  // 각 스텝을 순회하면서 매칭 확인
  for (let i = 0; i < lesson.steps.length; i++) {
    const step = lesson.steps[i]
    const stepTexts = getStepTexts(step)

    // 메모의 텍스트가 스텝의 텍스트에 포함되어 있는지 확인
    for (const searchText of searchTexts) {
      for (const stepText of stepTexts) {
        // 공백 정규화 후 비교
        const normalizedSearch = searchText.replace(/\s+/g, ' ').toLowerCase()
        const normalizedStep = stepText.replace(/\s+/g, ' ').toLowerCase()

        if (normalizedStep.includes(normalizedSearch) ||
            normalizedSearch.includes(normalizedStep)) {
          return {
            lessonId,
            stepIndex: i,
            matchedText: stepText
          }
        }
      }
    }
  }

  return null
}

/**
 * 메모의 page 정보를 기반으로 정확한 위치 찾기
 * 저장된 스텝 번호가 부정확할 경우 메모 텍스트로 재검색
 */
export function findAccurateStep(
  page: string,  // 예: "학습: lesson-05#28"
  memoText: string
): { lessonId: string; stepIndex: number } | null {
  // page에서 lessonId와 stepIndex 추출
  const match = page.match(/학습:\s*([^#]+)(?:#(\d+))?/)
  if (!match) return null

  const lessonId = match[1].trim()
  const savedStepIndex = match[2] ? Number(match[2]) : null

  // 1차: 메모 텍스트로 정확한 스텝 찾기 (가장 신뢰할 수 있음)
  const found = findStepByContent(lessonId, memoText)
  if (found) {
    return {
      lessonId: found.lessonId,
      stepIndex: found.stepIndex
    }
  }

  // 2차: 저장된 스텝 번호 사용 (fallback)
  if (savedStepIndex !== null) {
    return {
      lessonId,
      stepIndex: savedStepIndex
    }
  }

  // 3차: 첫 스텝으로 이동
  return {
    lessonId,
    stepIndex: 0
  }
}
