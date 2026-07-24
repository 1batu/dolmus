# DOLMUŞ! 🚐

Idle/tycoon game about running a Turkish dolmuş (shared minibus) terminal. Web-first: Three.js scene + DOM UI, one codebase for every platform. All 3D is procedural — zero art assets.

**TR:** Kendi dolmuş terminalini işletirsin — kamera hep terminaldedir, hat görünmez. Peronda yolcu birikir, minibüs yanaşır, *dolunca kalkar*, doğu kapısından sefere çıkar, hasılatla dönüp batı kapısından girer ve park eder. Ekonomi Temmuz 2026 İstanbul gerçekleriyle kuruludur.

## Oyun Sistemleri / Game Systems

| Sistem | Özet |
| --- | --- |
| 💰 Gerçekçi ekonomi | İndi-bindi ₺43, motorin ₺74/L (80L depo), yevmiye ₺1.750, araç ₺390k+. Asıl ciro hat boyu indi-bindiden gelir |
| 🌙 Gece/gündüz | 1 gün = 24 saat = 5 dk gerçek zaman. 00-06 arası sadece 🌙 nöbetçi ve ortaklı araçlar çalışır, gece tarifesi ×1,5. Dinamik güneş/gökyüzü + terminal projektörleri |
| 📝 Senetli satış | Araç alırken Nakit/Senetli seçilir: %25 peşinat + %15 vade farkı + 30 gün taksit. Taksitler her akşam 20:00'de yevmiyelerle düşer. Borç çipinden taksit öde / %5 indirimle erken kapat |
| ⭐ İtibar + günlük görev | Sefer itibar kazandırır, kuyruk doluyken kaçan yolcu düşürür; itibar yolcu akışını belirler. Her sabah 06:00'da filo boyuna ölçekli görev (ödül: nakit + itibar) |
| 🏗 İnşaat & Yatırım modalı | Sekmeli modal: Araçlar / Personel & Park / Tesisler / Devren. Büfe (bekleyen + yoldan geçen satışı), Çay Ocağı (biniş %25 hızlı), Tamirhane (bakım %40 indirim) |
| 🧢 Kahya | Araç başına Sv.1-3: +4/+6/+8 ayakta yolcu, hat indi-bindisine +%15/sv, günlük yevmiye |
| 🤝 Rakipler & Devren | Aynı hattın esnafı perona yanaşıp yolcu kapar (gündüz). Devren: yeni fiyatın %60'ı ama %55-80 yıpranmış eski kasa (×1,5 yıpranır). Oranlı ortaklık: %5-90 pay al/artır/sat, payın kadar günlük cirodan akşam ödemesi |
| 📊 Hisse ticareti | Kendi aracının %5-75'ini kaydırıcıyla sat (değerleme: taban × yıpranma × itibar), dilim dilim geri al (%10 prim). Ortaklı araç gece de çalışır, gelir-gider hisse oranında bölüşülür |
| ⛽ Pompa & planlı bakım | "Doldur" basınca araç fiilen terminaldeki pompaya sürer. Araç seferdeyken basılırsa ⏳ planlanır, parka dönünce uygulanır |
| 📈 Filo talebi | Şoförlü araç başına: yolcu gelişi +%25, kuyruk kapasitesi +6, hat indi-bindisi +%10 |
| 💾 Save/load | 2,5 sn'de bir localStorage; `SAVE_VERSION` + `SAVE_ACCEPTS` ile geriye uyumlu şema; iki aşamalı Sıfırla |

## Stack

- Vite + React 19 + TypeScript
- three + @react-three/fiber — isometric procedural scene (RoundedBox tabanlı modeller, geometri/materyal cache)
- zustand — game state + sim tick (`useFrame` driven)
- Tailwind v4 — koyu cam (glassmorphism) HUD, DOM üzerinde

## Run

```bash
npm install
npm run dev
```

## Structure

| Path | What / Ne |
| --- | --- |
| `src/game/config.ts` | All balance numbers + clock/queue helpers / Tüm ekonomi dengesi tek yerde |
| `src/game/paths.ts` | Terminal layout, gates, waypoint paths (spot→peron→pompa→yol) / Yerleşim ve güzergahlar |
| `src/game/store.ts` | Vehicle & rival state machines, economy, shares, debts, tasks, save/load / Simülasyon |
| `src/scene/models.tsx` | Procedural model library: rbox/cyl/sph + cars, people, trees, apartments / Model kütüphanesi |
| `src/scene/Vehicle.tsx` | Minibus mesh (own + rival variants), path follower / Minibüs |
| `src/scene/World.tsx` | Road, terminal, peron, pump, gates, neighborhood, day-night, lights / Sahne |
| `src/ui/HUD.tsx` | Top bar, task card, debt panel, fleet cards, construction modal / Arayüz |
| `src/i18n.ts` | All UI strings, tr + en parity / Tüm metinler |

## Roadmap

1. **Şoför derinliği** — isimli şoförler, beceriler (hızlı biniş, az yakıt/yıpranma), moral (çay ocağı besler)
2. **Olaylar** — zabıta denetimi (ayakta yolcu cezası — kahya riskiyle sinerji), lastik patlaması, yağmur, korsan dolmuş
3. **Otomasyon** — oto-doldur/oto-bakım toggle'ları (idle QoL)
4. **Ses + juice** — klakson, motor, para sesi, görev konfetisi
5. **Offline kazanç** — kapalıyken birikim, dönüşte özet ekranı
6. **Hat plakası** — geç oyun hedefi: ikinci hat, uzun/karlı seferler
7. **Yayın** — Vercel deploy; sonrasında dokunmatik uyum + Capacitor ile mobil
8. **Onboarding + istatistik** — ilk oyuncu rehberi, günlük kâr/zarar paneli
