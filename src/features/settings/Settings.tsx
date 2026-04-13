// 설정 화면 — 그룹 섹션, 애니메이션 토글, 아이콘, About, 위험 구역, 동기화
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSyncConfigured, isSyncLoggedIn, getSyncUser, initSync, syncLogin, syncLogout, pushToCloud, pullFromCloud } from '../../utils/sync'
import { FONT_SIZES, getSavedFontSize, setFontSize, type FontSizeKey } from '../../utils/font-size'
import { APP_NAME, APP_VERSION } from '../../config/constants'

/** 애니메이션 토글 스위치 */
function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative w-[50px] h-[28px] rounded-full transition-colors duration-300 flex-shrink-0"
      style={{ backgroundColor: value ? 'var(--color-accent)' : 'var(--color-border)' }}
      role="switch"
      aria-checked={value}
    >
      {/* 트랙 하이라이트 */}
      <span
        className="absolute inset-0.5 rounded-full transition-opacity duration-300"
        style={{
          background: value
            ? 'linear-gradient(135deg, rgba(255,255,255,0.15), transparent)'
            : 'none',
        }}
      />
      {/* 노브 */}
      <span
        className="absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{
          left: value ? '25px' : '3px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
        }}
      />
    </button>
  )
}

/** 섹션 헤더 */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xs font-semibold uppercase tracking-wider px-1 mb-2"
      style={{ color: 'var(--color-text-tertiary, var(--color-text-secondary))' }}
    >
      {children}
    </h2>
  )
}

/** 설정 항목 카드 */
function SettingRow({
  icon, title, desc, right, onClick, danger,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  right?: React.ReactNode
  onClick?: () => void
  danger?: boolean
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`flex items-center gap-3 w-full p-4 rounded-2xl text-left transition-all ${onClick ? 'active:scale-[0.98]' : ''}`}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: `1px solid ${danger ? 'var(--color-error-light, #EF5350)' : 'var(--color-border)'}`,
      }}
    >
      {/* 아이콘 */}
      <span
        className="flex items-center justify-center w-9 h-9 rounded-xl text-base flex-shrink-0"
        style={{
          backgroundColor: danger
            ? 'rgba(198,40,40,0.08)'
            : 'var(--color-surface-elevated, var(--color-bg))',
        }}
      >
        {icon}
      </span>
      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${danger ? 'text-red-500' : ''}`}>{title}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{desc}</p>
      </div>
      {/* 우측 컨트롤 */}
      {right}
    </Tag>
  )
}

export default function Settings() {
  const nav = useNavigate()
  const [writing, setWriting] = useState(localStorage.getItem('pali-primer-writing') !== 'off')
  const [sound, setSound] = useState(localStorage.getItem('suttalog2-sound') !== 'off')
  const [fontSize, setFontSizeState] = useState<FontSizeKey>(getSavedFontSize())
  const [syncLoggedIn, setSyncLoggedIn] = useState(isSyncLoggedIn())
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const syncUser = getSyncUser()
  const syncAvailable = isSyncConfigured()

  // 동기화 초기화
  useEffect(() => {
    if (syncAvailable) {
      initSync((loggedIn) => setSyncLoggedIn(loggedIn))
    }
  }, [syncAvailable])

  const toggleWriting = () => {
    const next = !writing
    setWriting(next)
    localStorage.setItem('pali-primer-writing', next ? 'on' : 'off')
  }

  const toggleSound = () => {
    const next = !sound
    setSound(next)
    localStorage.setItem('suttalog2-sound', next ? 'on' : 'off')
  }

  const changeFontSize = (key: FontSizeKey) => {
    setFontSizeState(key)
    setFontSize(key)
  }

  // 동기화 로그인/로그아웃
  const handleSyncLogin = async () => {
    setSyncLoading(true)
    const ok = await syncLogin()
    setSyncLoading(false)
    if (ok) setSyncMessage('로그인 성공! 진도를 동기화합니다.')
    else setSyncMessage('로그인 실패. 다시 시도해주세요.')
    setTimeout(() => setSyncMessage(''), 3000)
  }

  const handleSyncLogout = async () => {
    await syncLogout()
    setSyncLoggedIn(false)
    setSyncMessage('로그아웃되었습니다.')
    setTimeout(() => setSyncMessage(''), 3000)
  }

  // 수동 동기화
  const handlePush = async () => {
    setSyncLoading(true)
    const ok = await pushToCloud()
    setSyncLoading(false)
    setSyncMessage(ok ? '클라우드에 저장 완료!' : '저장 실패')
    setTimeout(() => setSyncMessage(''), 3000)
  }

  const handlePull = async () => {
    setSyncLoading(true)
    const ok = await pullFromCloud()
    setSyncLoading(false)
    setSyncMessage(ok ? '클라우드에서 가져오기 완료!' : '가져오기 실패')
    if (ok) setTimeout(() => window.location.reload(), 1000)
    else setTimeout(() => setSyncMessage(''), 3000)
  }

  const resetProgress = () => {
    if (!confirm('모든 진도를 초기화하시겠습니까?\n(연속 학습일, 학습 기록도 함께 초기화됩니다)')) return
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('pali-primer-') || key?.startsWith('pali-study-')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
    nav('/')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
     <div className="max-w-lg mx-auto">
      {/* ── 상단 헤더 ── */}
      <div
        className="flex items-center gap-3 px-4 pt-4 pb-3 sticky top-0 z-10"
        style={{
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg)',
        }}
      >
        <button
          onClick={() => nav(-1)}
          className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          {/* 쉐브론 뒤로 아이콘 */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">설정</h1>
      </div>

      <div className="px-4 py-5 space-y-6 pb-safe animate-fadeIn">
        {/* ── 학습 설정 ── */}
        <section>
          <SectionHeader>학습</SectionHeader>
          <div className="space-y-3">
            <SettingRow
              icon={<span>✍️</span>}
              title="쓰기 모드"
              desc="손글씨 쓰기 단계 포함"
              right={<Toggle value={writing} onChange={toggleWriting} />}
            />
            <SettingRow
              icon={<span>🔊</span>}
              title="소리"
              desc="TTS 발음 재생"
              right={<Toggle value={sound} onChange={toggleSound} />}
            />
          </div>
        </section>

        {/* ── 글씨 크기 ── */}
        <section>
          <SectionHeader>글씨 크기</SectionHeader>
          <div
            className="p-4 rounded-2xl space-y-3"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            {/* 미리보기 */}
            <div className="text-center py-2 rounded-xl"
              style={{ backgroundColor: 'var(--color-surface-elevated)' }}>
              <p className="pali-text font-bold" style={{ color: 'var(--color-primary)' }}>
                Dhammaṃ care sucaritaṃ
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                법을 잘 실천하라
              </p>
            </div>
            {/* 크기 선택 버튼 */}
            <div className="flex gap-2">
              {FONT_SIZES.map(s => {
                const isActive = fontSize === s.key
                return (
                  <button
                    key={s.key}
                    onClick={() => changeFontSize(s.key)}
                    className="flex-1 py-2.5 rounded-xl text-center font-semibold
                               transition-all duration-200 active:scale-[0.96]"
                    style={{
                      fontSize: `${s.px - 4}px`,
                      backgroundColor: isActive
                        ? 'var(--color-primary)'
                        : 'var(--color-surface-elevated)',
                      color: isActive ? 'white' : 'var(--color-text)',
                      border: isActive
                        ? '1.5px solid var(--color-primary)'
                        : '1.5px solid var(--color-border)',
                    }}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── 클라우드 동기화 ── */}
        <section>
          <SectionHeader>클라우드 동기화</SectionHeader>
          {!syncAvailable ? (
            <div className="p-4 rounded-2xl text-center text-xs" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
              Firebase 설정이 필요합니다.
              <br />sync.ts에 FIREBASE_CONFIG를 입력하세요.
            </div>
          ) : !syncLoggedIn ? (
            <SettingRow
              icon={<span>☁️</span>}
              title="Google 로그인"
              desc="기기간 진도 동기화를 위해 로그인하세요"
              onClick={handleSyncLogin}
              right={syncLoading ? <span className="animate-spin text-sm">⏳</span> : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-tertiary, var(--color-text-secondary))' }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            />
          ) : (
            <div className="space-y-3">
              {/* 사용자 정보 */}
              <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-accent)' }}>
                {syncUser?.photoURL ? (
                  <img src={syncUser.photoURL} alt="" className="w-9 h-9 rounded-full" />
                ) : (
                  <span className="flex items-center justify-center w-9 h-9 rounded-full text-base" style={{ backgroundColor: 'var(--color-surface-elevated)' }}>👤</span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{syncUser?.displayName || syncUser?.email}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{syncUser?.email}</p>
                </div>
                <span className="badge badge-success">연결됨</span>
              </div>
              {/* 동기화 버튼 */}
              <div className="flex gap-2">
                <button onClick={handlePush} disabled={syncLoading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
                  style={{ backgroundColor: 'var(--color-surface)', border: '1.5px solid var(--color-border)' }}>
                  {syncLoading ? '⏳' : '⬆️'} 업로드
                </button>
                <button onClick={handlePull} disabled={syncLoading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
                  style={{ backgroundColor: 'var(--color-surface)', border: '1.5px solid var(--color-border)' }}>
                  {syncLoading ? '⏳' : '⬇️'} 다운로드
                </button>
              </div>
              {/* 로그아웃 */}
              <SettingRow icon={<span>🚪</span>} title="로그아웃" desc="동기화 연결 해제" onClick={handleSyncLogout} />
            </div>
          )}
          {/* 동기화 메시지 */}
          {syncMessage && (
            <div className="mt-2 p-3 rounded-xl text-center text-xs font-medium animate-fadeIn"
              style={{ backgroundColor: syncMessage.includes('실패') ? 'rgba(198,40,40,0.08)' : 'rgba(46,125,50,0.08)', color: syncMessage.includes('실패') ? 'var(--color-error)' : 'var(--color-accent)' }}>
              {syncMessage}
            </div>
          )}
        </section>

        {/* ── 데이터 ── */}
        <section>
          <SectionHeader>데이터</SectionHeader>
          <SettingRow
            icon={<span>🗑️</span>}
            title="진도 초기화"
            desc="모든 과의 학습 진도를 초기화합니다"
            onClick={resetProgress}
            danger
            right={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-tertiary, var(--color-text-secondary))' }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            }
          />
        </section>

        {/* ── 앱 정보 ── */}
        <section>
          <SectionHeader>정보</SectionHeader>
          <div
            className="p-5 rounded-2xl space-y-3"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            {/* 앱 이름 + 버전 */}
            <div className="flex items-center gap-3">
              <span
                className="flex items-center justify-center w-11 h-11 rounded-2xl text-xl"
                style={{ background: 'var(--color-primary-gradient, var(--color-primary))', color: '#fff' }}
              >
                📿
              </span>
              <div>
                <p className="font-bold text-sm">{APP_NAME}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{APP_VERSION}</p>
              </div>
            </div>

            {/* 구분선 */}
            <hr style={{ borderColor: 'var(--color-divider, var(--color-border))' }} />

            {/* 크레딧 */}
            <div className="space-y-1.5">
              <CreditLine label="교재" value="De Silva — Pāli Primer (2008)" />
              <CreditLine label="한글 번역" value="백도수 편역 (2024)" />
              <CreditLine label="개발" value="SuttaLog2 Project" />
            </div>

            <p className="text-[10px] text-center pt-1" style={{ color: 'var(--color-text-tertiary, var(--color-text-secondary))' }}>
              Sadhu! Sadhu! Sadhu! 🙏
            </p>
          </div>
        </section>
      </div>
     </div>
    </div>
  )
}

/** 크레딧 한 줄 */
function CreditLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span
        className="flex-shrink-0 font-semibold min-w-[60px]"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {label}
      </span>
      <span style={{ color: 'var(--color-text)' }}>{value}</span>
    </div>
  )
}
