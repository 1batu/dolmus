# DOLMUŞ! 🚐

Idle/tycoon game about running a Turkish dolmuş (shared minibus) line. Web-first: Three.js scene + DOM UI, one codebase for every platform.

**TR:** Dolmuş hattı işletme oyunu. Duraklarda yolcu birikir, minibüs yanaşır, *dolunca kalkar*, kazandıkça filoyu büyütürsün. Trafik AI'ı yok — araçlar sabit spline hattı izler, simülasyon bu sayede basit kalır.

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
| `src/game/route.ts` | Closed CatmullRom spline, stops, road ribbon geometry / Hat spline'ı |
| `src/game/store.ts` | Sim tick: spawn → board (fare on boarding) → dwell → depart / Simülasyon |
| `src/scene/` | World, procedural Minibus, Stop with live queue / 3B sahne |
| `src/ui/HUD.tsx` | Cash, fleet, toasts, buy button / Arayüz |
| `src/i18n.ts` | All UI strings, tr + en parity / Tüm metinler |

## Roadmap (sonrası)

- "Müsait bir yerde inecek var" — durak dışı iniş + zabıta riski
- Hat plakası satın alma → yeni mahalle/hat açılımı
- Araç upgrade'leri (klima, müzik, döşeme) → konfor → itibar
- Şoför morali, çay molası, korsan dolmuş rakibi
- Save/load (localStorage), Capacitor ile mobil paket
