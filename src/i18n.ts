// Tüm UI metinleri buradan gelir — hardcoded string yok. / All UI strings live here.
export type Lang = 'tr' | 'en'

const dicts = {
  tr: {
    appTitle: 'DOLMUŞ!',
    cash: 'Kasa',
    carried: 'Taşınan',
    fleet: 'Minibüs',
    buyBus: 'Minibüs Al',
    stopNames: ['Meydan', 'Okul', 'Pazar', 'Hastane'],
    boarded: (n: number, stop: string, fare: number) =>
      `${stop}: ${n} yolcu bindi +₺${fare}`,
    skippedFull: (stop: string) => `Dolmuş dolu! ${stop} durağı pas geçildi`,
    busLabel: (id: number) => `Minibüs ${id}`,
    seats: (used: number, total: number) => `${used}/${total}`,
  },
  en: {
    appTitle: 'DOLMUŞ!',
    cash: 'Cash',
    carried: 'Carried',
    fleet: 'Minibus',
    buyBus: 'Buy Minibus',
    stopNames: ['Square', 'School', 'Bazaar', 'Hospital'],
    boarded: (n: number, stop: string, fare: number) =>
      `${stop}: ${n} boarded +₺${fare}`,
    skippedFull: (stop: string) => `Full! Skipped ${stop}`,
    busLabel: (id: number) => `Minibus ${id}`,
    seats: (used: number, total: number) => `${used}/${total}`,
  },
} satisfies Record<Lang, unknown>

export const lang: Lang = 'tr'
export const t = dicts[lang]
