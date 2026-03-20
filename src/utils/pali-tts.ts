// 빠알리어 로마자 → 데바나가리 변환 + 힌디어 TTS
const CONSONANTS: Record<string, string> = {
  'kh': 'ख', 'k': 'क', 'gh': 'घ', 'g': 'ग', 'ṅ': 'ङ',
  'ch': 'छ', 'c': 'च', 'jh': 'झ', 'j': 'ज', 'ñ': 'ञ',
  'ṭh': 'ठ', 'ṭ': 'ट', 'ḍh': 'ढ', 'ḍ': 'ड', 'ṇ': 'ण',
  'th': 'थ', 't': 'त', 'dh': 'ध', 'd': 'द', 'n': 'न',
  'ph': 'फ', 'p': 'प', 'bh': 'भ', 'b': 'ब', 'm': 'म',
  'y': 'य', 'r': 'र', 'l': 'ल', 'ḷ': 'ळ',
  'v': 'व', 's': 'स', 'h': 'ह',
}

const VOWELS_IND: Record<string, string> = {
  'ā': 'आ', 'a': 'अ', 'ī': 'ई', 'i': 'इ',
  'ū': 'ऊ', 'u': 'उ', 'e': 'ए', 'o': 'ओ',
}

const VOWELS_DEP: Record<string, string> = {
  'ā': 'ा', 'a': '', 'ī': 'ी', 'i': 'ि',
  'ū': 'ू', 'u': 'ु', 'e': 'े', 'o': 'ो',
}

const VIRAMA = '्'
const isVowel = (ch: string) => ch in VOWELS_IND

export function paliToDevanagari(roman: string): string {
  let result = '', i = 0
  const s = roman.toLowerCase()
  while (i < s.length) {
    const ch = s[i]
    if (/[\s,.;:!?\-—–"'()""'']/.test(ch)) { result += ch; i++; continue }
    if (ch === 'ṃ') { result += 'ं'; i++; continue }
    const two = s.slice(i, i + 2)
    let consonant: string | undefined, consumed = 0
    if (CONSONANTS[two]) { consonant = CONSONANTS[two]; consumed = 2 }
    else if (CONSONANTS[ch]) { consonant = CONSONANTS[ch]; consumed = 1 }
    if (consonant) {
      i += consumed
      if (i < s.length && isVowel(s[i])) { result += consonant + VOWELS_DEP[s[i]]; i++ }
      else { result += consonant + VIRAMA }
      continue
    }
    if (isVowel(ch)) { result += VOWELS_IND[ch]; i++; continue }
    result += ch; i++
  }
  return result
}

function findBestVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices()
  for (const lang of ['hi-IN', 'hi', 'sa', 'en-IN', 'it-IT', 'en-US']) {
    const found = voices.find(v => v.lang.startsWith(lang))
    if (found) return found
  }
  return voices[0] || null
}

export function speakPali(text: string) {
  speechSynthesis.cancel()
  if (localStorage.getItem('suttalog2-sound') === 'off') return
  const trySpeak = () => {
    const voice = findBestVoice()
    const useDevanagari = voice && (voice.lang.startsWith('hi') || voice.lang.startsWith('sa'))
    const u = new SpeechSynthesisUtterance(useDevanagari ? paliToDevanagari(text) : text)
    u.lang = voice?.lang || 'hi-IN'
    if (voice) u.voice = voice
    u.rate = 0.6
    speechSynthesis.speak(u)
  }
  if (speechSynthesis.getVoices().length === 0) {
    speechSynthesis.onvoiceschanged = () => { speechSynthesis.onvoiceschanged = null; trySpeak() }
    setTimeout(() => {
      if (speechSynthesis.speaking) return
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'hi-IN'; u.rate = 0.6; speechSynthesis.speak(u)
    }, 500)
  } else { trySpeak() }
}
