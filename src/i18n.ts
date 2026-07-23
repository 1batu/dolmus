// Tüm UI metinleri buradan gelir — hardcoded string yok. / All UI strings live here.
export type Lang = 'tr' | 'en'

const fmt = (n: number) => n.toLocaleString('tr-TR')

const dicts = {
  tr: {
    appTitle: 'DOLMUŞ!',
    day: 'Gün',
    clock: 'Saat',
    cash: 'Kasa',
    waiting: 'Bekleyen',
    fleet: 'Filo',
    drivers: 'Şoför',
    buyVehicle: 'Minibüs Al',
    hireDriver: 'Şoför Kirala',
    buySpot: 'Park Yeri Al',
    nightShift: 'Nöbetçi',
    departed: (no: number, n: number, fare: number) =>
      `Minibüs ${no} sefere çıktı: ${n} yolcu +₺${fmt(fare)}`,
    returned: (no: number, extra: number) =>
      `Minibüs ${no} döndü · hat hasılatı +₺${fmt(extra)}`,
    wagesPaid: (total: number) => `Yevmiyeler ödendi: -₺${fmt(total)}`,
    refueled: (no: number, cost: number) => `⛽ Minibüs ${no} pompaya yanaştı: -₺${fmt(cost)}`,
    busLabel: (no: number) => `Minibüs ${no}`,
    seats: (used: number, total: number) => `${used}/${total}`,
    fuel: 'Yakıt',
    wear: 'Yıpranma',
    refuel: 'Doldur',
    repair: 'Bakım',
    reset: 'Sıfırla',
    resetConfirm: 'Emin misin?',
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
      toPump: 'Pompaya gidiyor',
      fueling: 'Yakıt alıyor',
      fromPump: 'Parka dönüyor',
    },
  },
  en: {
    appTitle: 'DOLMUŞ!',
    day: 'Day',
    clock: 'Time',
    cash: 'Cash',
    waiting: 'Waiting',
    fleet: 'Fleet',
    drivers: 'Drivers',
    buyVehicle: 'Buy Minibus',
    hireDriver: 'Hire Driver',
    buySpot: 'Buy Parking Spot',
    nightShift: 'Night duty',
    departed: (no: number, n: number, fare: number) =>
      `Minibus ${no} departed: ${n} passengers +₺${fmt(fare)}`,
    returned: (no: number, extra: number) =>
      `Minibus ${no} returned · route earnings +₺${fmt(extra)}`,
    wagesPaid: (total: number) => `Wages paid: -₺${fmt(total)}`,
    refueled: (no: number, cost: number) => `⛽ Minibus ${no} at the pump: -₺${fmt(cost)}`,
    busLabel: (no: number) => `Minibus ${no}`,
    seats: (used: number, total: number) => `${used}/${total}`,
    fuel: 'Fuel',
    wear: 'Wear',
    refuel: 'Refuel',
    repair: 'Repair',
    reset: 'Reset',
    resetConfirm: 'Are you sure?',
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
      toPump: 'Driving to pump',
      fueling: 'Refueling',
      fromPump: 'Returning to spot',
    },
  },
} satisfies Record<Lang, unknown>

export const lang: Lang = 'tr'
export const t = dicts[lang]
