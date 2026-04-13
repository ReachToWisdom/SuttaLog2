// 전체 과 목록 — 교재 32과 전체 수록 완료
import type { LessonInfo } from './types'
import { LESSON_00 } from './lesson-00-alphabet'
import { LESSON_01_SANDHI } from './lesson-01-sandhi'
import { LESSON_01 } from './lesson-01'
import { LESSON_02 } from './lesson-02'
import { LESSON_03 } from './lesson-03'
import { LESSON_04 } from './lesson-04'
import { LESSON_05 } from './lesson-05'
import { LESSON_06 } from './lesson-06'
import { LESSON_07 } from './lesson-07'
import { LESSON_08 } from './lesson-08'
import { LESSON_09 } from './lesson-09'
import { LESSON_10 } from './lesson-10'
import { LESSON_11 } from './lesson-11'
import { LESSON_12 } from './lesson-12'
import { LESSON_13 } from './lesson-13'
import { LESSON_14 } from './lesson-14'
import { LESSON_15 } from './lesson-15'
import { LESSON_16 } from './lesson-16'
import { LESSON_17 } from './lesson-17'
import { LESSON_18 } from './lesson-18'
import { LESSON_19 } from './lesson-19'
import { LESSON_20 } from './lesson-20'
import { LESSON_21 } from './lesson-21'
import { LESSON_22 } from './lesson-22'
import { LESSON_23 } from './lesson-23'
import { LESSON_24 } from './lesson-24'
import { LESSON_25 } from './lesson-25'
import { LESSON_26 } from './lesson-26'
import { LESSON_27 } from './lesson-27'
import { LESSON_28 } from './lesson-28'
import { LESSON_29 } from './lesson-29'

export const LESSONS: LessonInfo[] = [
  // 기초
  { id: 'lesson-00', title: '자모와 발음', subtitle: '모음 8 · 자음 33 · 발음규칙 · 8격', icon: '🔤', steps: LESSON_00 },
  { id: 'lesson-sandhi', title: '연성법', subtitle: 'Sandhi ①~⑬ · 억제음 변화', icon: '🔗', steps: LESSON_01_SANDHI },
  // 남성 -a 8격
  { id: 'lesson-01', title: '1과: 주격 + 동사', subtitle: '-o/-ā · -ti/-nti', icon: '📿', steps: LESSON_01 },
  { id: 'lesson-02', title: '2과: 목적격', subtitle: '-ṃ/-e · ~을/를', icon: '🎯', steps: LESSON_02 },
  { id: 'lesson-03', title: '3과: 구격', subtitle: '-ena/-ehi · ~으로/함께', icon: '🤝', steps: LESSON_03 },
  { id: 'lesson-04', title: '4과: 탈격', subtitle: '-ā/-mhā/-smā · ~로부터', icon: '↩️', steps: LESSON_04 },
  { id: 'lesson-05', title: '5과: 여격', subtitle: '-āya/-ssa · ~에게/위해', icon: '🎁', steps: LESSON_05 },
  { id: 'lesson-06', title: '6과: 소유격', subtitle: '-ssa/-ānaṃ · ~의', icon: '👤', steps: LESSON_06 },
  { id: 'lesson-07', title: '7과: 처소격', subtitle: '-e/-mhi/-smiṃ · ~에', icon: '📍', steps: LESSON_07 },
  { id: 'lesson-08', title: '8과: 호격 + 중성명사', subtitle: '총정리 · 중성 도입', icon: '📢', steps: LESSON_08 },
  // 동사 활용
  { id: 'lesson-09', title: '9과: 절대분사', subtitle: '-(i)tvā/-ya · ~하고서', icon: '⏭️', steps: LESSON_09 },
  { id: 'lesson-10', title: '10-11과: 부정사+현재분사', subtitle: '-tuṃ · -nta/-māna', icon: '🔄', steps: LESSON_10 },
  { id: 'lesson-11', title: '12과: 동사 인칭변화', subtitle: '1·2·3인칭 현재형', icon: '👥', steps: LESSON_11 },
  { id: 'lesson-12', title: '13과: -e/-nā 어간', subtitle: 'deseti · kiṇāti · hoti', icon: '📚', steps: LESSON_12 },
  { id: 'lesson-13', title: '14과: 미래형', subtitle: '-(i)ssa · ~할 것이다', icon: '🔮', steps: LESSON_13 },
  { id: 'lesson-14', title: '15과: 원망형', subtitle: '-eyya · 만약 ~한다면', icon: '💭', steps: LESSON_14 },
  { id: 'lesson-15', title: '16과: 명령형', subtitle: '-atu · ~하라 / mā 금지', icon: '📣', steps: LESSON_15 },
  { id: 'lesson-16', title: '17과: 과거형', subtitle: 'Aorist · ~했다', icon: '⏪', steps: LESSON_16 },
  // 여성명사 + 분사
  { id: 'lesson-17', title: '18과: -ā 여성명사', subtitle: 'vanitā 격변화', icon: '👩', steps: LESSON_17 },
  { id: 'lesson-18', title: '19과: 과거분사', subtitle: '-(i)ta/-na', icon: '✅', steps: LESSON_18 },
  { id: 'lesson-19', title: '20과: -i/-ī 여성명사', subtitle: 'bhūmi/nadī', icon: '🌊', steps: LESSON_19 },
  { id: 'lesson-20', title: '21과: 현재분사 여성형', subtitle: '-ntī/-mānā', icon: '🔄', steps: LESSON_20 },
  { id: 'lesson-21', title: '22과: 미래수동분사', subtitle: '-tabba/-anīya', icon: '📋', steps: LESSON_21 },
  { id: 'lesson-22', title: '23과: 사역형', subtitle: '-āpe/-āpaya', icon: '👉', steps: LESSON_22 },
  { id: 'lesson-23', title: '24-26과: 기타 명사', subtitle: '-u여성 · -i/-ī남성', icon: '📖', steps: LESSON_23 },
  // 고급
  { id: 'lesson-24', title: '27과: -u/-ū 남성명사', subtitle: 'bhikkhu/vidū 격변화', icon: '🧘', steps: LESSON_24 },
  { id: 'lesson-25', title: '28과: 친족명사', subtitle: 'satthā/pitā/mātā', icon: '👨‍👩‍👦', steps: LESSON_25 },
  { id: 'lesson-26', title: '29과: -i/-u 중성명사', subtitle: 'aṭṭhi/cakkhu', icon: '🦴', steps: LESSON_26 },
  { id: 'lesson-27', title: '30과: -vantu/-mantu', subtitle: 'Bhagavā · 소유형용사', icon: '🏔️', steps: LESSON_27 },
  { id: 'lesson-28', title: '31과: 인칭대명사', subtitle: 'ahaṃ/tvaṃ/mayaṃ/tumhe', icon: '🫵', steps: LESSON_28 },
  { id: 'lesson-29', title: '32과: 관계·지시·의문대명사', subtitle: 'yo/so/ko · yattha/tattha', icon: '❓', steps: LESSON_29 },
]

export function getLessonById(id: string) {
  return LESSONS.find(l => l.id === id)
}
