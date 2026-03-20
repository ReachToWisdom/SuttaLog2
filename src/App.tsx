// 라우트 정의 + 동기화 초기화
import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './features/home/Home'
import GrammarLearn from './features/grammar/GrammarLearn'
import Settings from './features/settings/Settings'
import { initSync, isSyncConfigured } from './utils/sync'

export default function App() {
  // 앱 시작 시 Firebase 동기화 초기화
  useEffect(() => {
    if (isSyncConfigured()) {
      initSync(() => {
        // 로그인 상태 변경 시 페이지 갱신 불필요 (각 컴포넌트에서 처리)
      })
    }
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/learn/:lessonId" element={<GrammarLearn />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  )
}
