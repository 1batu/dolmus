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
| 📊 Hisse ticareti | Kendi aracının hissesini kaydırıcıyla dilim dilim sat/geri al (değerleme: taban × yıpranma × itibar; geri alım %10 primli, elde asgari %25 kalır). Ortaklı araç gece de çalışır, gelir-gider hisse oranında bölüşülür; rakip ortaklık payı akşamları günlük cirodan ödenir |
| 📢 Özel servisler | Gündüz ekran ortasına mesafeli teklif düşer (düğün/havalimanı/maç/okul/piknik, 5-60 km): fiyat-süre-masraf mesafeyle ölçekli, 40 sn içinde kabul edilmezse uçar. Parktaki veya dönüşteki araç atanır |
| 🪪 Plakalar | Her araç kalıcı "34 M XXXX" plakası taşır — kartlarda gerçek plaka görünümü (TR bandı), 3D modelde ön/arka tampon dokusu, devren alınan araç rakibin plakasını getirir |
| ⛽ Pompa & planlı bakım | "Doldur" basınca araç fiilen terminaldeki pompaya sürer. Araç seferdeyken basılırsa ⏳ planlanır, parka dönünce uygulanır |
| 📈 Filo talebi | Şoförlü araç başına: yolcu gelişi +%25, kuyruk kapasitesi +6, hat indi-bindisi +%10 |
| 🗂 Kompakt filo kartları | Alt şeritte plaka + durum + barlar; tıklayınca tek kart genişleyip tüm yönetimi açar |
| 💾 Save/load | 2,5 sn'de bir localStorage; `SAVE_VERSION` + `SAVE_ACCEPTS` ile geriye uyumlu şema; iki aşamalı Sıfırla (İnşaat modalında) |

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

### Yeni iş kolları (gelir çeşitliliği)
1. ~~**🖤 VIP transfer (Uber tarzı)**~~ ✅ — siyah minivan (₺900k, senetli olur): çağrı bazlı 3-40 km transferler, peron beklemez, gece de çalışır
2. ~~**📑 Servis kontratları**~~ ✅ — okul/fabrika/otel/plaza: 30 günlük kontrat, her gün 07:00 ve 17:00 seferi (kaçarsa itibar cezası), sefer başına günlük ödemenin yarısı akşam yatar
3. ~~**🚕 Taksi işletmesi**~~ ✅ — plaka ₺11,5M (Tem 2026 gerçek borsa!): kirada ₺2.200/gün pasif ya da taksi al (₺750k) + işlet (₺6-12k/gün, sahnede sarı taksin dolaşır); maks 3 plaka

### Retention
4. ~~**Offline kazanç**~~ ✅ — kapalıyken birikim (verim %50, 4 saat kapak) + "sen yokken" karşılama modalı
5. ~~**Milestone/başarımlar**~~ ✅ — 11 kilometre taşı (ilk 100k/milyon, filo, yolcu, taksi...): nakit ödül + konfeti
6. ~~**Prestij**~~ ✅ — İnşaat > ⭐ Prestij: hattı devret, kalıcı bonus (başlangıç parası +%25/sv, itibar +0,2/sv, yolcu akışı +%5/sv); milestone'lar korunur
7. ~~**Olaylar**~~ ✅ — 👮 zabıta (ayakta yolcu cezası — kahya riski!), 🛞 lastik patlaması, 🌧 yağmur (yolcu patlar), 🕵️ korsan dolmuş
8. ~~**Şoför profili**~~ ✅ — isimli şoförler, 1-3⭐ beceri (hızlı biniş, az yakıt)
9. ~~**Otomasyon**~~ ✅ — Oto-Pompa Anlaşması + Bakım Aboneliği (Tesisler'de tek seferlik)
10. ~~**Ses + juice**~~ ✅ — WebAudio klakson/para/ding + görev-milestone konfetisi + 🔊 sessize alma

11. ~~**Günlük seri**~~ ✅ — gerçek takvim günü bazlı 🔥 seri + artan ödül
12. ~~**Dinamik ekonomi**~~ ✅ — motorin/tarife haberlerle değişir, üst barda canlı çipler
13. ~~**Yolcu tipleri**~~ ✅ — öğrenci (indirimli, +itibar), turist (bahşiş), kaçak (kahyaya takılır)
14. ~~**İstatistik**~~ ✅ — bugünkü gelir dağılımı + son 7 gün kâr/zarar (📊 sekmesi)
15. ~~**Yağmur görseli**~~ ✅ — partiküller + ıslak asfalt + gri gök
16. ~~**Hat plakası (Kadıköy)**~~ ✅ — ₺25M: yolcu +%25, hat hasılatı +%35
17. ~~**Şoför pazarı + moral**~~ ✅ — günlük 2 aday (★'ı belli), moral/çay molası
18. ~~**Mobil/PWA**~~ ✅ — manifest + ikon + landscape, dokunmatik uyumlu HUD
19. ~~**Lucide ikonları**~~ ✅ — emoji chrome'u modern ikon setine geçti

### Kalan
20. **Yayın** — Vercel deploy → oynanabilir link; sonrasında Capacitor ile mağaza
21. **Onboarding** — ilk oyuncu rehberi
22. **Skor kartı paylaşımı** — tek tuşla şık görsel üret, sosyal medyaya at
