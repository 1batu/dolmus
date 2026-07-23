// Tüm UI metinleri buradan gelir — hardcoded string yok. / All UI strings live here.
export type Lang = 'tr' | 'en'

const dicts = {
  tr: {
    appTitle: 'DOLMUŞ!',
    day: 'Gün',
    cash: 'Kasa',
    waiting: 'Bekleyen',
    fleet: 'Filo',
    drivers: 'Şoför',
    buyVehicle: 'Minibüs Al',
    hireDriver: 'Şoför Kirala',
    buySpot: 'Park Yeri Al',
    departed: (no: number, n: number, fare: number) =>
      `Minibüs ${no} sefere çıktı: ${n} yolcu +₺${fare}`,
    wagesPaid: (total: number) => `Yevmiyeler ödendi: -₺${total}`,
    busLabel: (no: number) => `Minibüs ${no}`,
    seats: (used: number, total: number) => `${used}/${total}`,
    fuel: 'Yakıt',
    wear: 'Yıpranma',
    refuel: 'Doldur',
    repair: 'Bakım',
    state: {
      parked: 'Parkta',
      noDriver: 'Şoför yok',
      noFuel: 'Yakıt bitti',
      wornOut: 'Bakım gerek',
      toPeron: 'Perona geliyor',
      loading: 'Yolcu alıyor',
      departing: 'Yola çıkıyor',
      onTrip: 'Seferde',
      returning: 'Dönüyor',
    },
  },
  en: {
    appTitle: 'DOLMUŞ!',
    day: 'Day',
    cash: 'Cash',
    waiting: 'Waiting',
    fleet: 'Fleet',
    drivers: 'Drivers',
    buyVehicle: 'Buy Minibus',
    hireDriver: 'Hire Driver',
    buySpot: 'Buy Parking Spot',
    departed: (no: number, n: number, fare: number) =>
      `Minibus ${no} departed: ${n} passengers +₺${fare}`,
    wagesPaid: (total: number) => `Wages paid: -₺${total}`,
    busLabel: (no: number) => `Minibus ${no}`,
    seats: (used: number, total: number) => `${used}/${total}`,
    fuel: 'Fuel',
    wear: 'Wear',
    refuel: 'Refuel',
    repair: 'Repair',
    state: {
      parked: 'Parked',
      noDriver: 'No driver',
      noFuel: 'Out of fuel',
      wornOut: 'Needs repair',
      toPeron: 'To platform',
      loading: 'Boarding',
      departing: 'Departing',
      onTrip: 'On trip',
      returning: 'Returning',
    },
  },
} satisfies Record<Lang, unknown>

export const lang: Lang = 'tr'
export const t = dicts[lang]
