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

## Roadmap (öncelik sırasıyla)

1. ~~**Save/load** (localStorage)~~ ✅ — 2.5 sn'de bir otomatik kayıt, `SAVE_VERSION` ile şema koruması, iki aşamalı Sıfırla; sırada offline kazanç
2. ~~**Gerçekçi ekonomi + gece/gündüz + nöbetçi**~~ ✅ — Tem 2026 İstanbul fiyatları (indi-bindi ₺43, motorin ₺74/L, yevmiye ₺1.750 akşam ödenir), 300 sn = 24 saat, 00-06 sadece 🌙 nöbetçi araçlar, gece tarifesi ×1.5, dinamik ışık/gökyüzü + terminal gece aydınlatması
3. ~~**İtibar + günlük görevler**~~ ✅ — ⭐ 0-5 itibar: sefer artırır, kuyruk doluyken kaçan yolcu düşürür, itibar yolcu akış hızını belirler; her sabah 06:00'da filo boyuna ölçekli görev (yolcu/hasılat/sefer), ödül nakit + itibar. Senetli araç alımı da eklendi (%25 peşinat, 30 gün taksit, akşam ödemeli)
3. **Terminal tesisleri (inşaat menüsü)** — büfe (bekleyen yolcudan pasif gelir), tamirhane (bakım indirimi), çay ocağı (şoför morali), yıkama
4. **Şoför derinliği** — isim, seviye/beceri (hızlı biniş, az yıpratma), moral
5. **Otomasyon** — oto-doldur/oto-bakım toggle'ları (idle QoL)
6. **Gün/gece + hava** — görsel derinlik, gece far/pencere ışıkları hazır
7. **Olaylar** — zabıta cezası, lastik patlaması, korsan dolmuş rakibi
8. **Hat plakası** → ikinci hat, uzun/karlı seferler; Capacitor ile mobil
