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
 * 가장 긴 문장 매칭을 우선하여 단어 수준 매칭 방지
 */
export function findStepByContent(
  lessonId: string,
  memoText: string
): StepLocation | null {
  const lesson = LESSONS.find(l => l.id === lessonId)
  if (!lesson) return null

  const searchTexts = extractTexts(memoText)
    // 최소 길이 필터: 공백 제외 5자 이상만 검색 (단어 수준 배제)
    .filter(text => text.replace(/\s+/g, '').length >= 5)
    // 긴 텍스트부터 검색 (정확도 우선)
    .sort((a, b) => b.length - a.length)

  if (searchTexts.length === 0) return null

  // 모든 매칭 후보 수집
  const matches: Array<{ stepIndex: number; matchedText: string; searchLength: number }> = []

  for (let i = 0; i < lesson.steps.length; i++) {
    const step = lesson.steps[i]
    const stepTexts = getStepTexts(step)

    for (const searchText of searchTexts) {
      const normalizedSearch = searchText.replace(/\s+/g, ' ').trim().toLowerCase()

      for (const stepText of stepTexts) {
        const normalizedStep = stepText.replace(/\s+/g, ' ').trim().toLowerCase()

        // 완전 일치 우선
        if (normalizedSearch === normalizedStep) {
          return {
            lessonId,
            stepIndex: i,
            matchedText: stepText
          }
        }

        // 스텝 텍스트에 검색 텍스트가 포함되는 경우만 (단방향)
        if (normalizedStep.includes(normalizedSearch)) {
          matches.push({
            stepIndex: i,
            matchedText: stepText,
            searchLength: normalizedSearch.length
          })
        }
      }
    }
  }

  // 가장 긴 검색 텍스트로 매칭된 것 반환 (정확도 우선)
  if (matches.length > 0) {
    matches.sort((a, b) => b.searchLength - a.searchLength)
    return {
      lessonId,
      stepIndex: matches[0].stepIndex,
      matchedText: matches[0].matchedText
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
