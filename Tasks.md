# Tasks — 빠알리 프라이머 (SuttaLog2)

## 초기 구축 (완료)

- [x] React + Vite + TypeScript 프로젝트 생성
- [x] Tailwind CSS 4 설정 + CSS 변수 테마 (라이트/다크)
- [x] HashRouter 라우팅 설정
- [x] 하단 네비게이션 (홈/과목/복습/프로필)
- [x] GitHub Pages 배포 (Actions 워크플로우)
- [x] vite.config.ts base 경로 `/SuttaLog2/` 설정

## 학습 데이터 (완료)

- [x] types.ts — StepType 10종, LessonInfo 인터페이스
- [x] lesson-00 ~ lesson-29 전체 30개 데이터 파일
- [x] lessons.ts — 32과 배열 + getLessonById
- [x] 카테고리: 기초(2) + 남성명사(8) + 동사(9) + 여성+분사(6) + 고급(5)

## 화면 구현 (완료)

- [x] Home — 히어로 카드, 프로그레스 링, 통계, 게송
- [x] Courses — 카테고리 접이식, 검색, 원형 진도
- [x] GrammarLearn — 학습 엔진 (10가지 스텝 타입)
- [x] Review — 완료 과 랜덤 복습
- [x] Settings — 쓰기/소리 토글, 동기화, 초기화, 앱 정보
- [x] WritingCanvas — 손글씨 캔버스
- [x] pali-tts — 빠알리→데바나가리 TTS

## Firebase 동기화 (완료)

- [x] sync.ts — Firebase Auth + Firestore 동기화 모듈
- [x] panditarama-video 프로젝트 설정값 입력
- [x] Google 로그인/로그아웃
- [x] push/pull (디바운스 자동 + 수동)
- [x] 앱 시작 시 동기화 초기화

## 2026-03-22: UX 개선

- [x] 과목 잠금 해제 — 진도 무관 모든 과 자유 접근
- [x] 건너뛰기 — 퀴즈뿐 아니라 모든 스텝에서 가능
- [x] 목차 오버레이 — 상단 목차 버튼 → 스텝 목록 → 바로 이동
- [x] 캐시 방지 — index.html no-cache 메타태그
- [x] 캐시 방지 — vite 빌드 파일명 콘텐츠 해시 명시

## 2026-03-22: 학습 UX 개선 (추가)

- [x] 글씨 크기 조절 — 4단계 (작게/보통/크게/아주크게), 기본값 '크게'
- [x] 문법 상세 바로 표시 — 접이식(details) 제거, 즉시 노출

## 2026-03-22: 심화 자료

- [x] 격변화 도표 오버레이 — PDF 기반 19개 표 (`declension-tables.ts`)
- [x] 명사/대명사/형용사 8격 × 단수/복수

## 2026-03-22: TTS 고품질화 (Colab)

- [x] mp3 우선 재생 구조 — `pali-tts.ts` (mp3 → Web Speech API 폴백)
- [x] TTS 텍스트 추출 스크립트 — `extract-tts-texts.mjs` (528개 추출)
- [x] Colab 노트북 생성 — `colab-tts-generator.ipynb` (3중 검증)
- [ ] Colab에서 mp3 일괄 생성 실행 (528개)
- [ ] `public/audio/` 에 mp3 + manifest.json 배치

## 명세서 구축

- [x] PRD.md 작성
- [x] Tasks.md 작성
- [x] TaskExecution.md 작성
- [x] CLAUDE.md 갱신

## 미완료 / 향후 작업

- [ ] 다크 모드 전환 UI (현재 CSS만 준비, 토글 없음)
- [ ] 오늘 학습 시간 측정 기능 (현재 표시만, 기록 미구현)
- [ ] Zustand 상태 관리 활용 (설치됨, 미사용)
- [ ] PWA 매니페스트 + 오프라인 지원
- [ ] 교재 내용 검증 — 32과 데이터 정확성 확인
- [ ] 접근성 개선 — 키보드 탐색, 스크린리더 지원
