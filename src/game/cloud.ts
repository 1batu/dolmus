// Google ile giriş + bulut kayıt (Firebase Auth + Firestore).
// Statik sitede sunucu yok: her şey tarayıcıda çalışır.
//
// Yapılandırma ortam değişkenlerinden gelir (.env.local yerelde, Actions
// secrets yayında). Not: bu değerler derlemede paketin içine gömülür ve
// tarayıcıda görünür — Firebase web anahtarı gizli bilgi değil, proje
// kimliğidir. Asıl koruma Firestore kuralları + yetkili alan adı + Google
// Cloud'daki HTTP referrer kısıtıdır.
//
// Yapılandırma yoksa bulut sessizce kapanır: oyun yerel kayıtla tam çalışır.
import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  browserPopupRedirectResolver,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'
import { create } from 'zustand'
import { SAVE_KEY } from './saveKey'

const env = import.meta.env
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

// Bulut özellikleri yapılandırma varsa açılır
export const cloudEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

const app = cloudEnabled ? initializeApp(firebaseConfig) : null
const auth = app ? getAuth(app) : null
const db = app ? getFirestore(app) : null

// Buluttaki kaydın özeti: çakışma ekranında hangisini sürdüreceğini seçerken
// oyuncunun görmesi gerekenler
export type SaveSummary = { day: number; money: number; savedAt: number }

type CloudState = {
  user: { uid: string; email: string; name: string } | null
  ready: boolean // ilk oturum kontrolü tamamlandı mı
  status: 'idle' | 'syncing' | 'synced' | 'error'
  errorCode: string // Firebase hata kodu — arayüzde gösterilir, teşhis için
  lastSyncAt: number
  // İki kayıt çakışırsa oyuncu seçer — sessizce üzerine yazmak ilerlemeyi yakar
  conflict: { cloud: SaveSummary; local: SaveSummary } | null
}

export const useCloud = create<CloudState>(() => ({
  user: null,
  ready: false,
  status: 'idle',
  errorCode: '',
  lastSyncAt: 0,
  conflict: null,
}))

// Hata kodunu yakala: sessizce yutmak teşhisi imkânsız kılıyor
function fail(where: string, e: unknown) {
  const code = (e as { code?: string })?.code ?? (e as Error)?.message ?? 'unknown'
  console.error(`[dolmus:cloud] ${where}:`, code, e)
  useCloud.setState({ status: 'error', errorCode: code })
}

// Kayıt gövdesinden özet çıkar (çakışma ekranı için)
function summarize(payload: unknown): SaveSummary {
  const d = (payload ?? {}) as Record<string, number>
  return {
    day: Number.isFinite(d.day) ? d.day : 0,
    money: Number.isFinite(d.money) ? d.money : 0,
    savedAt: Number.isFinite(d.savedAt) ? d.savedAt : 0,
  }
}

function readLocal(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Buluta yazma: oyun 2,5 sn'de bir kaydeder, o hızda Firestore'a yazmak kotayı
// yakar — en fazla bu aralıkta bir yazılır, son gövde beklemede tutulur
const CLOUD_WRITE_INTERVAL = 15000
let pending: Record<string, unknown> | null = null
let timer: ReturnType<typeof setTimeout> | null = null

async function flush() {
  timer = null
  const user = useCloud.getState().user
  const payload = pending
  pending = null
  if (!db || !user || !payload) return
  useCloud.setState({ status: 'syncing' })
  try {
    // Kayıt tek JSON metni olarak yazılır: Firestore doküman alanlarında
    // undefined kabul etmez (senetlerin opsiyonel alanları invalid-argument
    // veriyordu) ve iç içe tip kısıtları da böyle tamamen aşılır
    await setDoc(doc(db, 'saves', user.uid), {
      data: JSON.stringify(payload),
      savedAt: payload.savedAt ?? Date.now(),
      day: payload.day ?? 0,
      money: payload.money ?? 0,
    })
    useCloud.setState({ status: 'synced', errorCode: '', lastSyncAt: Date.now() })
  } catch (e) {
    // Ağ yoksa oyun aksamaz: yerel kayıt zaten yazıldı, sonraki turda denenir
    fail('setDoc', e)
  }
}

// store.persist() her kayıtta bunu çağırır; girişli değilse hiçbir şey yapmaz
export function pushCloudSave(payload: Record<string, unknown>) {
  if (!useCloud.getState().user) return
  pending = payload
  timer ??= setTimeout(flush, CLOUD_WRITE_INTERVAL)
}

// Buluttaki dokümandan kayıt metnini çıkar ('data' yeni biçim, 'payload' ilk
// sürümün nesne biçimi)
function rawFromDoc(d: Record<string, unknown> | undefined): string | null {
  if (!d) return null
  if (typeof d.data === 'string') return d.data
  if (d.payload) return JSON.stringify(d.payload)
  return null
}

// Yerel kaydı buluttakiyle değiştirip oyunu yeniden yükler: kısmi hidrasyon
// hatalarına yer bırakmaz, mevcut yükleme yolu aynen çalışır
function applyCloudRaw(raw: string | null) {
  if (!raw) return
  try {
    localStorage.setItem(SAVE_KEY, raw)
  } catch {
    return
  }
  location.reload()
}

export async function signInWithGoogle() {
  if (!auth) return
  try {
    await signInWithPopup(auth, new GoogleAuthProvider(), browserPopupRedirectResolver)
  } catch (e) {
    // Açılır pencere engellenmiş olabilir (uygulama içi tarayıcılar) ya da
    // sağlayıcı kapalı olabilir — kod arayüzde görünür
    fail('signIn', e)
  }
}

export async function signOutCloud() {
  if (!auth) return
  await signOut(auth)
}

// Çakışma çözümü: hangi kayıt sürdürülecek
export function resolveConflict(pick: 'cloud' | 'local') {
  const state = useCloud.getState()
  const conflict = state.conflict
  useCloud.setState({ conflict: null })
  if (!conflict) return
  if (pick === 'cloud') {
    void (async () => {
      const user = useCloud.getState().user
      if (!db || !user) return
      const snap = await getDoc(doc(db, 'saves', user.uid))
      applyCloudRaw(rawFromDoc(snap.data()))
    })()
  } else {
    // Yerel kayıt kazanır: hemen buluta yaz
    const local = readLocal()
    if (local) {
      pending = local
      void flush()
    }
  }
}

// Girişten sonra iki kaydı karşılaştır: bulut yoksa yükle, biri belirgin
// şekilde yeniyse oyuncuya sor, değilse yereli sürdür
async function reconcile(uid: string) {
  if (!db) return
  const local = readLocal()
  let cloudDoc
  try {
    cloudDoc = await getDoc(doc(db, 'saves', uid))
  } catch (e) {
    fail('getDoc', e)
    return
  }
  const cloudRaw = rawFromDoc(cloudDoc.data())
  if (!cloudRaw) {
    // Bulutta kayıt yok: yereli yükle
    if (local) {
      pending = local
      void flush()
    }
    return
  }
  if (!local) {
    applyCloudRaw(cloudRaw)
    return
  }
  let cloudParsed: unknown
  try {
    cloudParsed = JSON.parse(cloudRaw)
  } catch {
    // Bozuk bulut kaydı: yereli doğru kabul et
    pending = local
    void flush()
    return
  }
  const c = summarize(cloudParsed)
  const l = summarize(local)
  // 30 sn eşiği: aynı oturumun kendi yazması çakışma sayılmasın
  if (Math.abs(c.savedAt - l.savedAt) < 30000) {
    pending = local
    void flush()
    return
  }
  useCloud.setState({ conflict: { cloud: c, local: l } })
}

if (auth) onAuthStateChanged(auth, (u: User | null) => {
  if (u) {
    useCloud.setState({
      user: { uid: u.uid, email: u.email ?? '', name: u.displayName ?? '' },
      ready: true,
    })
    void reconcile(u.uid)
  } else {
    useCloud.setState({ user: null, ready: true, status: 'idle', conflict: null })
  }
})
