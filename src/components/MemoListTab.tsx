// 메모 목록 탭 — 검색, 필터, 매칭, 이동, 수정/삭제
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { deleteMemo, getDeviceId, updateMemoStepId } from '../utils/memo'
import type { Memo } from '../utils/memo'
import {
  getPageLabel, findStepById, searchLessonContent,
  type PageSearchResult,
} from '../utils/page-search'
import { getCurrentPageId, formatDate, extractSearchTerms } from './memo-utils'

interface Props {
  memos: Memo[]
  loading: boolean
  loadMemos: () => void
  startEdit: (memo: Memo) => void
  onClose: () => void
}

export default function MemoListTab({
  memos, loading, loadMemos, startEdit, onClose,
}: Props) {
  const [showAll, setShowAll] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [matchResults, setMatchResults] = useState<{
    memoId: string; results: PageSearchResult[]
  } | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  // 메모에서 콘텐츠 매칭 검색
  const handleFindMatch = (memo: Memo) => {
    const terms = extractSearchTerms(memo.text)
    const allResults: PageSearchResult[] = []
    for (const term of terms) {
      allResults.push(...searchLessonContent(term))
    }
    const best = new Map<string, PageSearchResult>()
    for (const r of allResults) {
      const existing = best.get(r.stepId)
      if (!existing || r.score > existing.score) best.set(r.stepId, r)
    }
    const sorted = [...best.values()].sort((a, b) => b.score - a.score).slice(0, 5)
    setMatchResults({ memoId: memo.id!, results: sorted })
  }

  // 매칭 결과 선택 → stepId 업데이트
  const handleSelectMatch = async (memoId: string, stepId: string) => {
    const ok = await updateMemoStepId(memoId, stepId)
    if (ok) {
      setMatchResults(null)
      loadMemos()
    }
  }

  // 메모 클릭 → 해당 위치로 이동
  const handleMemoClick = (memo: Memo) => {
    // 1순위: stepId로 정확한 위치 찾기
    if (memo.stepId) {
      const mainRoutes: Record<string, string> = {
        'page-home': '/', 'page-courses': '/courses',
        'page-review': '/review', 'page-settings': '/settings',
      }
      if (mainRoutes[memo.stepId]) {
        navigate(mainRoutes[memo.stepId])
        onClose()
        return
      }
      const found = findStepById(memo.stepId)
      if (found) {
        navigate(`/learn/${found.lessonId}?step=${found.stepIndex}`)
        onClose()
        return
      }
    }

    // 2순위: 메모 텍스트로 콘텐츠 검색 매칭
    if (memo.text) {
      const terms = extractSearchTerms(memo.text)
      const allResults: PageSearchResult[] = []
      for (const term of terms) {
        allResults.push(...searchLessonContent(term))
      }
      const best = new Map<string, PageSearchResult>()
      for (const r of allResults) {
        const existing = best.get(r.stepId)
        if (!existing || r.score > existing.score) best.set(r.stepId, r)
      }
      const topResult = [...best.values()].sort((a, b) => b.score - a.score)[0]
      if (topResult) {
        if (memo.id && !memo.stepId) {
          updateMemoStepId(memo.id, topResult.stepId)
        }
        navigate(`/learn/${topResult.lessonId}?step=${topResult.stepIndex}`)
        onClose()
        return
      }
    }

    // 3순위: page 필드 파싱 (최후 fallback)
    const match = memo.page.match(/학습:\s*([^#]+)(?:#(\d+))?/)
    if (match) {
      const lessonId = match[1].trim()
      const stepIdx = match[2]
      navigate(stepIdx ? `/learn/${lessonId}?step=${stepIdx}` : `/learn/${lessonId}`)
      onClose()
    }
  }

  // 현재 레슨 ID
  const currentLessonId = location.pathname.startsWith('/learn/')
    ? location.pathname.replace('/learn/', '').split('?')[0]
    : null

  // 필터링
  let filtered = memos
  if (!showAll) {
    filtered = filtered.filter(m => {
      if (m.stepId && currentLessonId) {
        return m.stepId.startsWith(currentLessonId + '-') || m.stepId === currentLessonId
      }
      if (currentLessonId) return m.page.includes(currentLessonId)
      return false
    })
  }
  if (searchText.trim()) {
    const query = searchText.trim().toLowerCase()
    filtered = filtered.filter(m => m.text.toLowerCase().includes(query))
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* 검색창 */}
      <div className="mb-3">
        <input type="text" value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="메모 내용 검색..."
          className="w-full px-3 py-2 rounded-lg border border-neutral-300
            dark:border-neutral-600 bg-transparent text-sm
            focus:outline-none focus:ring-2 focus:ring-amber-500" />
      </div>

      {/* 이 레슨 / 전체 토글 */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setShowAll(false)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            !showAll ? 'bg-amber-600 text-white'
              : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
          }`}>이 레슨</button>
        <button onClick={() => setShowAll(true)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            showAll ? 'bg-amber-600 text-white'
              : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
          }`}>전체</button>
        <span className="text-xs text-neutral-400 ml-auto">
          {getCurrentPageId(location.pathname)}
        </span>
      </div>

      {loading ? (
        <p className="text-center text-neutral-400 py-8">불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-neutral-400 py-8">
          {searchText.trim()
            ? `"${searchText}" 검색 결과가 없습니다.`
            : showAll
              ? '아직 메모가 없습니다.'
              : `이 레슨(${currentLessonId || '알 수 없음'})에 메모가 없습니다.`}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map(memo => (
            <MemoCard key={memo.id} memo={memo}
              onMemoClick={handleMemoClick}
              onEdit={startEdit}
              onDelete={async (id) => { await deleteMemo(id); loadMemos() }}
              onFindMatch={handleFindMatch}
              matchResults={matchResults && matchResults.memoId === memo.id ? matchResults.results : null}
              onSelectMatch={handleSelectMatch}
              onCloseMatch={() => setMatchResults(null)} />
          ))}
        </div>
      )}
    </div>
  )
}

// 개별 메모 카드 (인라인 — 별도 파일 불필요)
function MemoCard({ memo, onMemoClick, onEdit, onDelete,
  onFindMatch, matchResults, onSelectMatch, onCloseMatch,
}: {
  memo: Memo
  onMemoClick: (m: Memo) => void
  onEdit: (m: Memo) => void
  onDelete: (id: string) => void
  onFindMatch: (m: Memo) => void
  matchResults: PageSearchResult[] | null
  onSelectMatch: (memoId: string, stepId: string) => void
  onCloseMatch: () => void
}) {
  return (
    <div className="rounded-xl border border-neutral-200
      dark:border-neutral-700 p-3 space-y-2 hover:bg-neutral-50
      dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
      onClick={() => onMemoClick(memo)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-neutral-500 flex items-center gap-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2} className="w-3.5 h-3.5 text-amber-600">
              <path d="M9 5l7 7-7 7"/>
            </svg>
            {formatDate(memo.createdAt)} · {memo.stepId ? getPageLabel(memo.stepId) : memo.page}
            {memo.updatedAt && ' (수정됨)'}
          </span>
          {memo.stepId && (
            <span className="text-[10px] text-neutral-400 font-mono ml-5">
              {memo.stepId}
            </span>
          )}
        </div>
        {memo.deviceId === getDeviceId() && (
          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
            {!memo.stepId && (
              <button onClick={() => onFindMatch(memo)}
                className="text-xs text-blue-500 hover:text-blue-600
                  font-medium px-2 py-1 rounded-md
                  hover:bg-blue-50 dark:hover:bg-blue-900/20">매칭</button>
            )}
            <button onClick={() => onEdit(memo)}
              className="text-xs text-amber-600 hover:text-amber-700
                font-medium px-2 py-1 rounded-md
                hover:bg-amber-50 dark:hover:bg-amber-900/20">수정</button>
            <button onClick={() => {
              if (!confirm('이 메모를 삭제할까요?')) return
              onDelete(memo.id!)
            }}
              className="text-xs text-red-500 hover:text-red-600
                font-medium px-2 py-1 rounded-md
                hover:bg-red-50 dark:hover:bg-red-900/20">삭제</button>
          </div>
        )}
      </div>

      {/* 매칭 결과 팝업 */}
      {matchResults && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800
          bg-blue-50 dark:bg-blue-900/20 p-2 space-y-1"
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
              페이지 매칭 후보
            </span>
            <button onClick={onCloseMatch}
              className="text-xs text-neutral-400 hover:text-neutral-600">닫기</button>
          </div>
          {matchResults.length === 0 ? (
            <p className="text-xs text-neutral-500">매칭 결과 없음</p>
          ) : matchResults.map(r => (
            <button key={r.stepId}
              onClick={() => onSelectMatch(memo.id!, r.stepId)}
              className="w-full text-left rounded-md p-1.5 text-xs
                hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors">
              <span className="font-mono text-blue-600 dark:text-blue-400">{r.stepId}</span>
              <span className="text-neutral-500 ml-1">
                ({r.lessonTitle} · {r.stepType}#{r.stepIndex})
              </span>
              <br/>
              <span className="text-neutral-600 dark:text-neutral-400 truncate block">
                {r.matchField}: {r.matchText}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 텍스트 */}
      {memo.text && (
        <p className="text-sm whitespace-pre-wrap text-neutral-900
          dark:text-neutral-100">{memo.text}</p>
      )}
      {/* 이미지 썸네일 */}
      {memo.images?.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto">
          {memo.images.sort((a, b) => a.order - b.order).map(img => (
            <img key={img.order} src={img.dataUrl} alt={`${img.order}`}
              className="w-16 h-16 object-cover rounded-lg
                border border-neutral-200 dark:border-neutral-600
                flex-shrink-0" />
          ))}
        </div>
      )}
    </div>
  )
}
