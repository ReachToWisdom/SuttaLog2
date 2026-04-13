// 서비스워커 — 오프라인 지원 (앱 셸 + 오디오 캐싱)
// 버전: 2026-04-13-03 (메모 위치 정확도 개선 배포)
const CACHE_NAME = 'pali-primer-v3'
const AUDIO_CACHE = 'pali-audio-v3'

// 앱 셸: 핵심 파일 (빌드 시 해시 포함되므로 index만 사전 캐싱)
const APP_SHELL = [
  '/SuttaLog2/',
  '/SuttaLog2/index.html',
  '/SuttaLog2/manifest.json',
]

// 설치: 앱 셸 사전 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

// 활성화: 이전 버전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== AUDIO_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// 요청 가로채기
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // 오디오 파일: 캐시 우선, 없으면 네트워크 → 캐시 저장
  if (url.pathname.includes('/audio/') && url.pathname.endsWith('.mp3')) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached
          return fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone())
            return response
          })
        })
      )
    )
    return
  }

  // JS/CSS 에셋 (해시 포함): 캐시 우선
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached
          return fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone())
            return response
          })
        })
      )
    )
    return
  }

  // 그 외: 네트워크 우선, 실패 시 캐시
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
