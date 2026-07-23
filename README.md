# DOLMUŞ! 🚐

Idle/tycoon game about running a Turkish dolmuş (shared minibus) line. Web-first: Three.js scene + DOM UI, one codebase for every platform.

**TR:** Kendi dolmuş terminalini işletirsin — kamera hep terminaldedir, hat görünmez. Peronda yolcu birikir, minibüs yanaşır, *dolunca kalkar*, ana yoldan ekran dışına sefere gider, süre sonunda döner ve park eder. Araç alırsın, şoför kiralarsın (günlük yevmiye), park yeri satın alırsın; mazot her seferde kasadan düşer. Trafik AI'ı yok — araçlar önceden tanımlı waypoint hatlarını izler, yoldaki diğer arabalar dekordur.

## Stack

- Vite + React 19 + TypeScript
- three + @react-three/fiber — isometric low-poly scene, all geometry procedural (zero assets)
- zustand — game state + sim tick (`useFrame` driven)
- Tailwind v4 — HUD is plain DOM on top of the canvas

## Run

```bash
npm install
npm run dev
```

## Structure

| Path | What / Ne |
| --- | --- |
| `src/game/config.ts` | All balance numbers / Tüm ekonomi dengesi tek yerde |
| `src/game/paths.ts` | Terminal layout + waypoint paths (spot→peron→road) / Yerleşim ve güzergahlar |
| `src/game/store.ts` | Vehicle state machine: parked → load → trip → return; wages, fuel, day cycle / Simülasyon |
| `src/scene/` | World (road, lot, peron, office, ambient traffic), procedural Minibus / 3B sahne |
| `src/ui/HUD.tsx` | Day, cash, queue, fleet panel, buy/hire buttons, toasts / Arayüz |
| `src/i18n.ts` | All UI strings, tr + en parity / Tüm metinler |

## Roadmap (sonrası)

- Araç bakımı/eskime: sefer başına yıpranma, tamirhane inşası
- Terminal tesisleri: çay ocağı (şoför morali), yazıhane upgrade, yıkama
- Hat plakası satın alma → ikinci hat, daha uzun/karlı seferler
- İtibar sistemi: bekletilen yolcu itibar düşürür, itibar yolcu akışını etkiler
- Save/load (localStorage), Capacitor ile mobil paket
