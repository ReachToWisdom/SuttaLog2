// 라우트 정의
import { Routes, Route } from 'react-router-dom'
import Home from './features/home/Home'
import GrammarLearn from './features/grammar/GrammarLearn'
import Settings from './features/settings/Settings'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/learn/:lessonId" element={<GrammarLearn />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  )
}
