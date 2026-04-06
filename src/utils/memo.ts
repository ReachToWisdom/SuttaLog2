// 메모 시스템 — Firestore에 base64 이미지 저장
// 기기별 ID로 "내 메모" 구분, 수정 가능

const COLLECTION = 'pali-primer-memos'
const DEVICE_ID_KEY = 'pali-memo-device-id'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fb: any = null

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDDNRL69ugkKb6mJPnJb2kQud0_3b97viA',
  authDomain: 'panditarama-video.firebaseapp.com',
  projectId: 'panditarama-video',
  storageBucket: 'panditarama-video.firebasestorage.app',
  messagingSenderId: '504794613271',
  appId: '1:504794613271:web:ac565d6c6e82d9b72c7e52',
}

const MAX_IMAGE_WIDTH = 800

export interface MemoImage {
  order: number
  dataUrl: string
  name: string
}

export interface Memo {
  id?: string
  page: string
  text: string
  images: MemoImage[]
  createdAt: string
  updatedAt?: string
  deviceId: string
  userAgent: string
}

// 기기 고유 ID (localStorage 기반)
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

// Firebase 초기화
async function ensureFirebase() {
  if (db) return

  const { initializeApp, getApps, getApp } = await import('firebase/app')
  const { getFirestore, collection, addDoc, getDocs, doc, updateDoc,
    query, orderBy, where } = await import('firebase/firestore')

  fb = { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, where }

  const app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG)
  db = getFirestore(app)
}

// 이미지 → 리사이즈 → base64 data URL
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > MAX_IMAGE_WIDTH) {
        height = Math.round(height * (MAX_IMAGE_WIDTH / width))
        width = MAX_IMAGE_WIDTH
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// 메모 저장
export async function saveMemo(
  page: string,
  text: string,
  imageFiles: File[],
): Promise<boolean> {
  try {
    await ensureFirebase()
    const images: MemoImage[] = []
    for (let i = 0; i < imageFiles.length; i++) {
      const dataUrl = await fileToDataUrl(imageFiles[i])
      images.push({ order: i + 1, dataUrl, name: imageFiles[i].name })
    }
    const memo: Omit<Memo, 'id'> = {
      page,
      text,
      images,
      createdAt: new Date().toISOString(),
      deviceId: getDeviceId(),
      userAgent: navigator.userAgent.slice(0, 150),
    }
    await fb.addDoc(fb.collection(db, COLLECTION), memo)
    return true
  } catch (e) {
    console.error('메모 저장 실패:', e)
    return false
  }
}

// 메모 수정
export async function updateMemo(
  memoId: string,
  text: string,
  images: MemoImage[],
): Promise<boolean> {
  try {
    await ensureFirebase()
    const ref = fb.doc(db, COLLECTION, memoId)
    await fb.updateDoc(ref, {
      text,
      images,
      updatedAt: new Date().toISOString(),
    })
    return true
  } catch (e) {
    console.error('메모 수정 실패:', e)
    return false
  }
}

// 내 메모 조회 (현재 기기)
export async function getMyMemos(): Promise<Memo[]> {
  try {
    await ensureFirebase()
    const q = fb.query(
      fb.collection(db, COLLECTION),
      fb.where('deviceId', '==', getDeviceId()),
      fb.orderBy('createdAt', 'desc'),
    )
    const snap = await fb.getDocs(q)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
  } catch (e) {
    console.error('메모 조회 실패:', e)
    return []
  }
}

// 전체 메모 조회 (스크립트용)
export async function getMemos(): Promise<Memo[]> {
  try {
    await ensureFirebase()
    const q = fb.query(
      fb.collection(db, COLLECTION),
      fb.orderBy('createdAt', 'desc'),
    )
    const snap = await fb.getDocs(q)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
  } catch (e) {
    console.error('메모 조회 실패:', e)
    return []
  }
}
