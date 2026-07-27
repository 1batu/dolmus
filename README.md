# DOLMUŞ! 🚐

Idle/tycoon game about running a Turkish dolmuş (shared minibus) terminal. Web-first: Three.js scene + DOM UI, one codebase for every platform. All 3D is procedural — zero art assets.

**TR:** Kendi dolmuş terminalini işletirsin — kamera hep terminaldedir, hat görünmez. Peronda yolcu birikir, minibüs yanaşır, *dolunca kalkar*, doğu kapısından sefere çıkar, hasılatla dönüp batı kapısından girer ve park eder. Ekonomi Temmuz 2026 İstanbul gerçekleriyle kuruludur.

## Oyun Sistemleri / Game Systems

| Sistem | Özet |
| --- | --- |
| 💰 Gerçekçi ekonomi | İndi-bindi ₺43, motorin ₺74/L (80L depo), yevmiye ₺1.750, araç ₺390k+. Asıl ciro hat boyu indi-bindiden gelir |
| 🌙 Gece/gündüz | 1 gün = 24 saat = 5 dk gerçek zaman. 00-06 arası sadece 🌙 nöbetçi ve ortaklı araçlar çalışır, gece tarifesi ×1,5. Dinamik güneş/gökyüzü + terminal projektörleri |
| 📝 Senetli satış | Araç alırken Nakit/Senetli seçilir: %25 peşinat + %15 vade farkı + 30 gün taksit. Taksitler her akşam 20:00'de yevmiyelerle düşer. Borç çipinden taksit öde / %5 indirimle erken kapat |
| ⭐ İtibar + günlük görev | Sefer itibar kazandırır, kuyruk doluyken kaçan yolcu düşürür; itibar yolcu akışını belirler. Her sabah 06:00'da filo boyuna ölçekli görev (ödül: nakit + itibar); tamamlanınca panel 4 sn "✓ Tamam" gösterip kendini kapatır |
| 🏗 İnşaat & Yatırım modalı | Sekmeli modal: Araçlar / Personel & Park / Tesisler / Devren. Büfe (bekleyen + yoldan geçen satışı), Çay Ocağı (biniş %25 hızlı), Tamirhane (bakım %40 indirim) |
| 🧢 Kahya | Araç başına Sv.1-3: +4/+6/+8 ayakta yolcu, hat indi-bindisine +%15/sv, günlük yevmiye |
| 🤝 Rakipler & Devren | Aynı hattın esnafı perona yanaşıp yolcu kapar (gündüz). Devren: yeni fiyatın %60'ı ama %55-80 yıpranmış eski kasa (×1,5 yıpranır). Oranlı ortaklık: %5-90 pay al/artır/sat, payın kadar günlük cirodan akşam ödemesi |
| 📊 Hisse ticareti | Kendi aracının hissesini kaydırıcıyla dilim dilim sat/geri al (değerleme: taban × yıpranma × itibar; geri alım %10 primli, elde asgari %25 kalır). Ortaklı araç gece de çalışır, gelir-gider hisse oranında bölüşülür; rakip ortaklık payı akşamları günlük cirodan ödenir |
| 📢 Özel servisler | **Sprinteri olana** gündüz ekran ortasına mesafeli teklif düşer (düğün/havalimanı/maç/okul/piknik, 5-60 km): fiyat-süre-masraf mesafeyle ölçekli, 40 sn içinde kabul edilmezse uçar. Parktaki veya dönüşteki araç atanır |
| 🚐 Servis Sprinteri | Kontrat işine adanmış panelvan (₺1,25M, "34 S" plaka): hat/peron işine girmez, okul-fabrika kontrat seferlerine öncelikli çıkar (%40 düşük masraf + ödemeye %20 konfor primi), boşken özel servis tekliflerini kapar. Şoförlü her sprinter +1 kontrat slotu açar (azami +4) |
| 🪪 Plakalar | Her araç kalıcı "34 M XXXX" plakası taşır — kartlarda gerçek plaka görünümü (TR bandı), 3D modelde ön/arka tampon dokusu, devren alınan araç rakibin plakasını getirir |
| 🛡 Filo sigortası | Tesisler'de üç kademe: **Poliçe yok** (zabıta cezası ×1,8, temiz denetimde bile poliçesizlik cezası, tüm hasar senden), **Trafik/zorunlu** (₺900/araç/gün × sınıf katsayısı), **Kasko** (₺2.600/araç/gün): kaza yıpranmasının %70'i ve ağır arıza faturasının %70'i sigortadan. Prim her akşam yevmiyelerle düşer, ortaklı araçta payın kadar |
| 🔧 Araç muayenesi | Her araç 30 günde bir muayeneye girer (araç kartında geri sayım; 5 gün kala sararır, geçince kırmızı yanar). Geçmek için **yıpranma %60 altında** olmalı — değilse ücret yanar, önce bakım gerekir. **Trafik sigortası şart** (gerçek kural). Süresi geçmiş araç denetimde yakalanırsa ₺6.500 ceza + itibar. Devren alınan kasa muayenesi 4 gün kala gelir |
| 💼 Kasa akışı paneli | Üst bardaki Kasa çipine basınca açılır: bugünün gelir kalemleri + gider + net, akşam 20:00 kesintisinin dökümü (yevmiye, sigorta primi, muhasebeci, taksitler) ve "kesinti sonrası kasa" öngörüsü, altında yürüyen vergi dönemi (usul, matrah, tahmini vergi, beyana kalan gün). Senet paneliyle aynı yeri paylaşır, biri açılırken diğeri kapanır |
| 🧾 Vergi & muhasebeci | Her 30 günde beyan: **muhasebecisiz basit usul** (dönem cirosunun %9'u), **muhasebeciyle gerçek usul** (net kârın %15'i — giderler yazılır). Muhasebeci ₺4.200/gün yevmiyeli: vergi usulünü değiştirir, temiz günde kredi skorunu daha hızlı toparlar, haciz eşiğini 3→5 güne öteler, **araç bazlı kârlılık raporunu açar** (İstatistik'te kilitli bölüm: araç başına ömür boyu hasılat − masraf, sefer sayısı ve sefer başı kâr, kârdan zarara sıralı çubuklar). Personel sekmesinde beyan geri sayımı ve tahmini vergi görünür. Dönem kapanışında dökümlü **beyan modalı**: ciro, yazılan gider, matrah, oran ve ödenen vergi; muhasebecisizken "gerçek usulde ₺X az ödeyecektin" karşılaştırması çıkar |
| ⛽ Pompa & planlı bakım | "Doldur" basınca araç fiilen terminaldeki pompaya sürer. Araç seferdeyken basılırsa ⏳ planlanır, parka dönünce uygulanır |
| 📈 Filo talebi | Şoförlü araç başına: yolcu gelişi +%25, kuyruk kapasitesi +6, hat indi-bindisi +%10 |
| 🗂 Kompakt filo kartları | Alt şeritte plaka + durum + barlar; tıklayınca tek kart genişleyip tüm yönetimi açar |
| 🏦 Bankacılık | Ayrı Banka butonu/modali. 3 banka (Esnaf/DolmuşBank/Boğaziçi): farklı şart, faiz, limit. Vadeli mevduat (7/15/30 gün), kredi skoru (temiz gün +1, ekside -8), skorlu kurumsal kredi. 3 gün üst üste ödenmezse **haciz**: en değerli araç alacaklıya gider. Gün içinde elle ödenen taksit o akşam otomatiğe girmez. Faizler Tem 2026 piyasasına göre kademeli (politika faizi %37, ihtiyaç kredisi ~%3,7/ay bandı) |
| 🚌 Otobüs sınıfı | Solo (27 koltuk, ₺5,5M), körüklü (42 koltuk, 3 kapı, ₺9,5M), elektrikli (30 koltuk, ₺12,5M — şarj istasyonu şart, şarj motorinin ~%30'u, itibar 2 kat). "34 O" plakası, hat hasılatı çarpanlı, bakım/tüketim kasayla ölçekli. **Talep araç sınıfı ağırlıklı**: otobüs durağa minibüsün ~2 katı yolcu çeker (bekleyen kuyruk + hat hasılatı büyür). Elektrikli araçlar dolum için pompaya değil **şarj ünitesine sürer** (ayrı kuyruk) |
| ⚡ Enerji & akaryakıt tesisleri | Şarj istasyonu (e-otobüs ön şartı), güneş paneli+depo (şarj %65 daha ucuz), akaryakıt tankı (kendi filo %10 indirimli doldurur + hattın esnafına saatlik mazot satışı kârı) |
| 🔑 Araç kiralama | Rent-a-car ofisi + 15 araca kadar plakalı filo (yazıhane arkasındaki otopark). Araçlar gerçek: yakıt yakar, yıpranır, bakım ister (Kiralama sekmesinde araç başına Doldur/Bakım). Sabah dolulukla kiraya çıkar: %10 kurumsal (30 gün, indirimli ama garanti), %20 uzun hafta (3-7 gün), gerisi günlük. Kiradaki araçlar sahnede trafiğe karışır, boştakiler otoparkta plakalarıyla bekler |
| 🅿️ Büyük terminal | 2 sıra × 10 = 20 park cebi (arka sıra yarım cep kaymalı — çıkışta çarpışma yok), tesisler güney şeridinde, binalarda Türkçe canvas tabelalar (BÜFE, TAMİRHANE, GİRİŞ/ÇIKIŞ...) |
| ⏩ Gece hızlanma | 00:00-06:00 arası simülasyon 2× hızlı akar — sabah çabuk gelir |
| 🚨 Araç üstü rozetler | Yakıt %25 altına düşünce pompa, yıpranma %75'i geçince anahtar rozeti aracın üstünde süzülür (kritikte kırmızı) — lucide glyph'leri canvas sprite olarak |
| ⚙️ Ayarlar | Sağ üstteki dişli: **dil** (Türkçe/English — tercih kaydedilir, ilk açılışta tarayıcı dilinden seçilir, değişince oyun yeniden yüklenir), **ses** açık/kapalı, **rehberi baştan göster** ve tehlikeli bölgede iki aşamalı **Sıfırla**. Eskiden ses düğmesi tek başına duruyordu, Sıfırla ve rehber düğmesi İnşaat başlığındaydı — hepsi buraya toplandı |
| 💾 Save/load | 2,5 sn'de bir localStorage; `SAVE_VERSION` + `SAVE_ACCEPTS` ile geriye uyumlu şema; iki aşamalı Sıfırla (İnşaat modalında) |
| 📱 Tam responsive HUD | Mobilde (<640px) üst bar sadece kritik beşliyi gösterir (Gün · Saat · Kasa ₺15,9M kısa format · Borç · İtibar, uçtan uca eşit bölüşük), Filo/Banka/İnşaat altta tam genişlik buton barına iner; modallar tek sütun, Filo liste+detay dikey istiflenir (detay üstte); dokunmatik kamera (sürükle/pinch, `touch-action: none`), pull-to-refresh ve tap-highlight kapalı. Dar masaüstünde üst bar kırpılmak yerine ikinci satıra sarar |

## Stack

- Vite + React 19 + TypeScript
- three + @react-three/fiber — isometric procedural scene (RoundedBox tabanlı modeller, geometri/materyal cache)
- zustand — game state + sim tick (`useFrame` driven)
- Tailwind v4 — Game Dev Tycoon tarzı açık flat HUD (mat paneller, lacivert mürekkep tipografi, sert alt gölgeli "basınca çöken" butonlar, Nunito), DOM üzerinde

## Run

```bash
npm install
npm run dev
```

## Deploy — GitHub Pages

Yayın otomatik: `main`'e push edilince `.github/workflows/deploy.yml` derleyip Pages'e atar.
Tek seferlik kurulum: repo → **Settings → Pages → Source: GitHub Actions**.

Adres: `https://1batu.github.io/dolmus/`

Site alt dizinde sunulduğu için derlemede `base` `/dolmus/` olur (`vite.config.ts`);
`npm run dev` kökte kalır. Repo adı değişirse Actions akışı base'i repo adından
geçirdiği için ek iş yok. Koddan public dosyaya erişirken mutlak `/dosya.svg`
yerine `import.meta.env.BASE_URL` kullan — yoksa alt dizinde 404 olur.

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
2. ~~**📑 Servis kontratları**~~ ✅ — okul/fabrika/otel/plaza: 30 günlük kontrat, her gün 07:00 ve 17:00 seferi (kaçarsa itibar cezası), sefer başına günlük ödemenin yarısı akşam yatar. **Sprinter şartı**: kontrat teklifi yalnız servis sprinteri olan işletmeye düşer (sprintersiz Kontrat sekmesi bunu açıklar); sefere sprinter yoksa uygun başka araç da gönderilir
3. ~~**🚕 Taksi işletmesi**~~ ✅ — plaka ₺11,5M (Tem 2026 gerçek borsa!): kirada ₺2.200/gün pasif ya da taksi al (₺750k) + işlet (₺6-12k/gün, sahnede sarı taksin dolaşır); maks 3 plaka
4. ~~**🚐 Servis Sprinteri**~~ ✅ — kontrat/özel servis işine adanmış panelvan: +1 kontrat slotu, sefer masrafı düşük, ödemeye konfor primi

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
18. ~~**Mobil/PWA**~~ ✅ — manifest + ikon + landscape, dokunmatik uyumlu HUD; Tem 2026: tam responsive düzen (mobil alt buton barı, kompakt üst bar, tek sütun modallar, dokunmatik kamera)
19. ~~**Lucide ikonları**~~ ✅ — emoji chrome'u modern ikon setine geçti

20. ~~**Bankacılık**~~ ✅ — 3 banka, mevduat, kredi skoru, kurumsal kredi, haciz, isimli ortaklar (45 isim)
21. ~~**Otobüs sınıfı**~~ ✅ — solo/körüklü/elektrikli + şarj istasyonu, güneş paneli, akaryakıt tankı
22. ~~**Araç kiralama**~~ ✅ — rent-a-car ofisi + günlük kiralık filo
23. ~~**Terminal büyümesi**~~ ✅ — 20 park cebi (2 sıra), Türkçe tabelalar, gece 2× hız, araç üstü uyarı rozetleri, renkli rakip minibüsler

### Kalan — Para kazandıran yeni oyuncaklar
24. ~~**Araç modifiye**~~ ✅ — araç detayında Modifiye & Reklam bölümü: motor yenileme (tüketim −%20), LPG dönüşümü (yakıt ×0,65 — elektrikliye takılmaz), klima (itibar ×1,5), ses sistemi (hat hasılatı +%8); fiyatlar kasa boyuyla ölçekli
25. ~~**Reklam**~~ ✅ — araç giydirme (gövde kampanya rengine boyanır + yan panel, ₺1.500-3.000/gün, hisse oranında) + Reklam Panosu tesisi (₺400k, ₺8-15k/gün, reklam her gün döner — uydurma markalar: Efsane Kolonya, Bereket Un...)
26. **İkinci şube** — farklı ilçede ikinci terminal (geç oyun hedefi, ₺50M+): kamera değişmez, şube ekran dışı özet gelir üretir, kahya gibi "şube müdürü" atanır

### Kalan — Takvim & atmosfer
27. ~~**Özel günler**~~ ✅ — her sabah zar atılır (%12 derbi, %8 okul açılışı, %5 bayram), üst barda "BUGÜN" çipi + sabah duyurusu. Derbi: akşam 16:00 sonrası yolcu 2×, servis teklifleri sık ve ×1,5 dolgun, zabıta sahada. Bayram: yarım tarife ama itibar 2 kat. Okul açılışı: öğrenci oranı 3×, okul servisi kontratları sık ve +%20
28. ~~**Kar + sis**~~ ✅ — hava olayı zarına kar eklendi (%35 kar / %65 yağmur): yavaş süzülen rüzgarda salınan taneler, beyazlaşan gök, çöken sis (görüş 320→170), kırağılı asfalt; oyun etkisi: yolcu +%25 sıklık, kaygan yolda sefer yıpranması ×1,7. **Hava olaya bağlı**: kar sürerken olay zarı %45, yağmurda %18 olasılıkla kazaya döner — yoldaki araç kayar, +%22 yıpranma ve -0,05 itibar. Kasko hasarın %70'ini karşılar
29. **Minibüs radyosu** — WebAudio ile hafif arabesk-vari loop + klakson kültürü, sessize almaya bağlı

### Kalan — Cila & meta
30. **Başarım paneli** — milestone'lar var ama listesi görünmüyor: İnşaat'a "Başarımlar" sekmesi, kilitliler gri
31. **Net varlık grafiği** — kasa + filo değeri + mevduat − borç; İstatistik sekmesine tek çizgi
32. **Skor kartı paylaşımı + Yayın** — tek tuşla şık skor görseli + **GitHub Pages** yayını → oynanabilir link (oyun paylaşılabilir olmadan twit tam vurmaz); sonrasında Capacitor ile mağaza. Altyapı hazır: `.github/workflows/deploy.yml` main'e her push'ta derleyip yayınlar, `vite.config.ts` alt dizin base'ini ayarlar
33. ~~**Onboarding**~~ ✅ — 6 adımlı açılış rehberi (alt ortada kart): karşılama → ilk seferi izle → ikinci aracı al → şoför tut → filoyu aç → kapanış. Adımlar oyuncu işi fiilen yapınca kendiliğinden ilerler; "Rehberi geç" her an kapatır. Yalnız yeni oyunda açılır (süregelen kayıt rehberi bitmiş sayar), İnşaat başlığındaki 🎓 düğmesiyle kayıt silmeden tekrar izlenir. Modal açıkken ince şeride iner
34. **Google ile giriş + bulut kayıt** — Google hesabıyla oturum aç, oyun kaydı Google altyapısında tutulsun (Firebase Auth + Firestore): localStorage tek gerçek kaynak olmaktan çıkar, mevcut kayıt ilk girişte buluta taşınır, cihazlar arası senkron (telefonda başla masaüstünde devam et), hesap silinirse anonim moda düş
