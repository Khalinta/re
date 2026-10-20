# PROJE.md — "Yeniden"

Türkçe, metin tabanlı, derin bir hayat simülasyonu. iPhone'da "Ana Ekrana Ekle" ile uygulama gibi çalışan bir PWA.

> Bu dosya projenin hafızasıdır. Her oturumun başında okunur, her adımın sonunda güncellenir.
> Bir karar değişirse eskisi silinmez; üstü çizilir (~~böyle~~) ve nedeni yazılır.

---

## 🧭 NEREDE KALDIK

- **Şu anki faz:** Faz 1 — Altyapı
- **Son tamamlanan adım:** 1.5 Oyun durumu, takvim, dilimler, durum simülasyonu, aksiyon döngüsü (10 temel aksiyon)
- **Sıradaki adım:** 1.6 Kayıt sistemi (IndexedDB + localStorage yedek, 3 yuva, yuva başına 5 yedek, arka plana atılınca kayıt, kalıcı depolama izni, migration) — **büyük**
- **Not:** Kayıt sistemi gelene kadar uygulama her açılışta yeni oyun başlatır (bilerek).
- **Kullanıcıdan beklenen:** "devam" demesi.

### Faz 1 adım listesi

| Adım | İçerik | Boyut | Durum |
|---|---|---|---|
| 1.1 | PROJE.md, CLAUDE.md, klasör yapısı, yer tutucu sayfa | küçük | ✅ |
| 1.2 | Seed RNG, Türkçe ek motoru, biçimlendirme (para/tarih/saat), tr-TR sıralama, Node testleri | orta | ✅ |
| 1.3 | PWA kabuğu: manifest, service worker (çevrimdışı), ikon, açılış ekranı | orta | ✅ |
| 1.4 | Arayüz iskeleti: alt sekme çubuğu, durum çubuğu, bottom sheet, anlatım akışı, temalar, yazı boyutu, safe-area | büyük | ✅ |
| 1.5 | Oyun durumu, takvim, zaman dilimleri, durumlar (enerji, açlık, stres...), aksiyon döngüsü | orta | ✅ |
| 1.6 | Kayıt sistemi: IndexedDB + localStorage yedek, 3 yuva, yuva başına 5 yedek, arka plana atılınca kayıt, kalıcı depolama izni, migration | büyük | ⏳ |
| 1.7 | Dışa/içe aktarma: dosya + sıkıştırılmış metin kodu, sağlama (checksum) | orta | ⬜ |
| 1.8 | Olay motoru A: bayraklar/sayaçlar, koşul dili, koşul açıklayıcı ("neden tetiklenmedi") | orta | ⬜ |
| 1.9 | Olay motoru B: ağırlıklı seçim, cooldown, çok aşamalı olaylar, beceri/şans kontrolleri, zamanlayıcılar, zincirler, metin şablonları, çoklu etki | büyük | ⬜ |
| 1.10 | Global hata yakalama, hata ekranı, hata raporu | orta | ⬜ |
| 1.11 | Gizli geliştirici paneli | orta | ⬜ |
| 1.12 | Yayın (GitHub Pages), telefonda test listesi, Faz 1 kapanışı | küçük | ⬜ |

### Fazlar

| Faz | İçerik | Durum |
|---|---|---|
| 1 | Altyapı | ⏳ devam ediyor |
| 2 | Dünya kitabı + ekonomi dosyası | ⬜ |
| 3 | Başlangıç hikayesi motoru, açılış sahneleri, NPC üretimi | ⬜ |
| 4 | İş, para, borç, barınma, eşya; ilişkiler, telefon ekranı | ⬜ |
| 5 | Olay içeriği (150+ derin olay, hikaye yayları) — sadece veri | ⬜ |
| 6 | Eğlence, hedefler, son ekranı, günlük | ⬜ |
| 7 | Denge, cila, hata ayıklama, kayıt testleri | ⬜ |

---

## 🏛️ MİMARİ KARARLAR

| # | Karar | Gerekçe |
|---|---|---|
| K1 | **Düz HTML/CSS/JavaScript, tarayıcının yerel ES modülleri (`import`/`export`). Build adımı yok.** | Kullanıcı kod okumuyor; derleme zinciri bozulma riski ve bakım yükü demek. iOS Safari 16.4+ ES modüllerini, CompressionStream'i ve service worker'ı destekliyor. |
| K2 | **Tüm yollar göreli** (`./js/...`), kök varsayılmaz. | GitHub Pages projeyi `kullanici.github.io/re/` alt yolunda yayınlar; Netlify kökte yayınlar. Göreli yollar ikisinde de değişiklik gerektirmeden çalışır. |
| K3 | **İçerik `data/` altında JSON dosyalarında.** Kod sadece motoru içerir. | Faz 5'te koda dokunmadan olay eklenebilsin. JSON'u service worker önbelleğe alır, çevrimdışı çalışır. |
| K4 | **Seed tabanlı, alt akışlı (substream) RNG.** Oyun seed'i + alan adı (ör. `"npc:417"`, `"olay"`) → bağımsız deterministik akışlar. Algoritma: cyrb128 karma + sfc32. | NPC #417'nin arka planı, oyunda ne yapılırsa yapılsın hep aynı çıkar; bir sistemde rastgele sayı çekmek diğerini kaydırmaz. Kayıt dosyası şişmez. |
| K5 | **Oyun zamanı = başlangıçtan beri geçen dakika (tam sayı).** Takvim tarihine dönüşüm tek bir modülde. Türkiye'de yaz saati yok (2016'dan beri UTC+3 sabit) → tüm hesaplar UTC üzerinden, saat dilimi hatası olmaz. | Tek doğruluk kaynağı; zaman atlatma ve zamanlayıcılar basit tam sayı karşılaştırması olur. |
| K6 | **Kayıt: IndexedDB ana depo, localStorage yedek, her aksiyondan sonra otomatik kayıt.** Kayıt önce doğrulanır (şema + sağlama), sonra yazılır; yazma başarısızsa eski kayıt korunur. | "Asla veri kaybı" gereksinimi. Bozuk yazma hiçbir zaman sağlam kaydın üstüne geçmez. |
| K7 | **Kayıt şemasında `kayitSurumu` alanı + sıralı migration fonksiyonları** (`1→2`, `2→3` ...). | Eski kayıtlar güncellemede otomatik dönüştürülür; her migration testlenir. |
| K8 | **Dışa aktarma kodu: JSON → deflate (CompressionStream) → base64url, başında `YND1.` öneki ve sağlama.** CompressionStream yoksa sıkıştırmasız yedek biçim. | Kopyala-yapıştır kodu kısa olur; yanlış/eksik kopyalanırsa sağlama sayesinde fark edilir. |
| K9 | **Testler Node'un yerleşik test koşucusuyla** (`node --test tests/*.test.js`). Sadece saf mantık modülleri test edilir (ek motoru, koşul dili, RNG, migration). | Ek bağımlılık yok; geliştirme aracı, oyunun çalışmasına gerekmiyor. |
| K10 | **Service worker "önce önbellek, sonra ağ" + sürümlü önbellek adı.** Yeni sürümde eski önbellek silinir, kullanıcıya "güncelleme hazır" denir. | Tam çevrimdışı çalışma; güncellemeler kontrollü. |
| K11 | **NPC'ler tembel üretim:** dünyada yalnızca NPC kimliği + seed'i durur; ayrıntılar ilk karşılaşmada seed'den üretilir, kayda sadece *değişen* şeyler (ilişki, anılar, hayat olayları) yazılır. | Binlerce NPC'de bile kayıt küçük ve tutarlı kalır. |
| K13 | **Ek motoru kalıp gösterimi:** ekler kısa adla (`'in'`, `'e'`, `'de'`) ya da kalıpla (`'(y)lA'`, `'DAn'`) verilir. A=a/e, I=ı/i/u/ü, D=d/t, C=c/ç; `(y)(n)(s)` yalnız ünlüden sonra, `(I)` yalnız ünsüzden sonra. Sayılar okunuşlarına göre (2026 → "altı" → 2026'da), kısaltmalar harf okunuşuna göre (THY → "ye" → THY'ye) ya da okunabiliyorsa sözcük gibi (NATO'ya). | Tek fonksiyon bütün eklerde doğru sonuç verir; yeni ek eklemek bir satır. |
| K14 | **Service worker önbellek listesi otomatik:** `node tools/sw-liste.mjs` tüm dosyaları tarar, listeyi ve içerik özetinden türeyen önbellek sürümünü `sw.js`'e yazar. `tests/sw.test.js` liste güncel değilse başarısız olur. | Dosya eklemeyi unutmak = çevrimdışında bozuk oyun. Elle liste tutmak yerine araç + test. Herhangi bir dosya değişince sürüm kendiliğinden değişir. |
| K15 | **Güncelleme akışı:** açılışta bekleyen sürüm varsa (oyun henüz yüklenmemişken) hemen geçilir; oyun sırasında gelirse alttan "Yeni sürüm hazır — Yenile" bandı çıkar. Uygulama her öne geldiğinde güncelleme kontrol edilir. | Oyun ortasında habersiz yenileme olmaz (veri kaybı riski yok); kullanıcı eski sürümde takılı da kalmaz. 1.6'dan sonra "Yenile" önce kayıt alacak. |
| K16 | **İkon ve açılış görselleri `icons/ikon.svg`'den üretilir** (`NODE_PATH=$(npm root -g) node tools/gorsel-uret.mjs`). 11 iPhone ekran boyutu için açılış görseli var. Görsel: ufuktan doğan güneş (yeniden doğuş). | Tek kaynak; ikon değişirse hepsi tek komutla yenilenir. |
| K17 | **Arayüz bileşenleri** (`js/ui/`): `panel.js` (alttan panel + onay + bilgi; üst üste açılabilir, sürükleyip kapatılır), `anlatim.js` (sıralı yazım, dokununca atla, 300 paragraf geçmiş, "Yeni ↓" işareti), `secenekler.js` (tam genişlik, maliyet etiketleri, çift dokunma kilidi, uzun basınca ayrıntı), `uzunbas.js`, `durumcubugu.js`, `arayuz.js` (sekmeler, klavye takibi). Paragraf türleri: anlati, icses, konusma, sistem, ayrac, secim. | Ekranlar bu parçalarla kurulur; olay motoru (1.9) doğrudan `anlatim.ekle` ve `secenekleriGoster`'i besleyecek. |
| K18 | **Görünüm ayarları (tema, yazı boyutu, metin hızı, animasyon) cihaz ayarıdır, oyun kaydı değildir** → localStorage. Okunamazsa varsayılan. Tema: otomatik / karanlık / aydınlık; "hareketi azalt" sistem ayarına uyar, elle de açılır. | Ayar kaybolsa bile oyun etkilenmez; kayıt dosyasını şişirmez. |
| K19 | **Başparmak bölgesi:** seçenekler ve kısayollar ekranın altında; liste sayfalarında içerik alta itilir, başlık üstte kalır. Butonlar en az 44px. | Tek elle oynanış (bölüm 14). |
| K20 | **Yeni oyunun başlangıç tarihi = gerçek bugünün Türkiye tarihi, saat 08:00.** Tarih kayda yazılır; sonrası oyun zamanıyla akar. Geliştirici panelinden başka tarih seçilebilecek. | Mevsim ve bayramlar oyuncunun gerçek takvimiyle örtüşür; deterministik kalır çünkü tarih kayıtta durur. |
| K21 | **Durum simülasyonu tamamen veriyle:** `data/simulasyon.json` (durumlar, saatlik değişim türleri: normal / dinlenme / ağır / uyku, ruh hali hedefi ve etkenleri, sağlık etkenleri, uyku kuralları, eşik uyarıları). Ruh hali bir hedefe doğru yavaşça kayar (ani zıplamaz). Eşik uyarıları sadece eşik geçildiği anda bir kez çıkar, iç ses olarak yazılır. | Denge koda dokunmadan ayarlanır; Faz 7 denge çalışması sadece bu dosyada. |
| K22 | **Aksiyonlar veriyle:** `data/aksiyonlar.json`. Alanlar: id, ad, alt, sure, tur, enerji (ek harcama), para, etki, dilimler, ozel ("uyku"), kisayol, metin (en az 2 çeşit — test zorunlu kılar). Uyku: gece (18–05) sabah 07:00'ye kadar, en az 6 en çok 10 saat; gündüz 2 saat; stresliyken daha az dinlendirir; düzenli saatte yatmak uyku düzenini artırır. | Faz 4–6'daki yeni aksiyonlar sadece veri eklenerek gelir. |
| K23 | **Rastgele akışların hali kayda yazılır** (`durum.rng[alan]`, `rngAl()`): kayıttan dönünce aynı seed aynı sonuçları vermeye devam eder. Test: aynı seed + aynı aksiyon dizisi = birebir aynı metin ve durum. | Seed tabanlı tekrar üretilebilirlik (hata raporlarında sorunu birebir yeniden oluşturabilmek için de şart). |
| K12 | **Yayın: GitHub Pages (dal üzerinden).** Netlify'a geçiş için ek ayar gerekmez (statik dosyalar + göreli yollar). | Kullanıcı isteği; kodu gizlemek istenirse Netlify'a sürükle-bırak yeterli. |

---

## 📁 KLASÖR YAPISI

```
/
├── index.html              Uygulamanın tek sayfası
├── manifest.webmanifest    PWA tanımı (1.3)
├── sw.js                   Service worker — kökte olmalı ki tüm siteyi kapsasın. Listesi otomatik (K14)
├── tools/                  Geliştirici araçları (sw listesi, ikon üretimi) — oyun bunları kullanmaz
├── .nojekyll               GitHub Pages'in dosyaları işlememesi için
├── package.json            Sadece Node testleri için (oyun bunu kullanmaz)
├── PROJE.md                Bu dosya
├── CLAUDE.md               Claude için oturum kuralı
├── css/                    Stiller
├── icons/                  Uygulama ikonları, açılış ekranı görselleri
├── js/
│   ├── main.js             Giriş noktası: açılış, service worker, güncelleme
│   ├── oyun.js             Oyun denetleyicisi: veri yükleme, durum, aksiyon çalıştırma, arayüze bildirim
│   ├── surum.js            Oyun sürümü
│   ├── core/               Saf mantık: rng, tr (ek motoru), format, zaman, simulasyon, durum, aksiyon (+ kayıt, olay motoru)
│   ├── ayarlar.js          Cihaz görünüm ayarları (tema, yazı, hız, hareket)
│   ├── ui/                 Arayüz parçaları (panel, anlatım, seçenekler, durum çubuğu, sekmeler)
│   │   └── ekranlar/       Sekme ekranları (simdi, dahafazla, yertutucu)
│   └── dev/                Gizli geliştirici paneli
├── data/
│   ├── simulasyon.json     Durumların değişim kuralları, eşik uyarıları (1.5)
│   ├── aksiyonlar.json     Temel günlük aksiyonlar (1.5)
│   ├── takvim.json         Resmi tatiller (1.5); bayram tarihleri ve okul takvimi Faz 2'de
│   ├── ekonomi.json        Tüm fiyatlar (asgari ücrete oranlı) — Faz 2
│   ├── dunya/              Dünya kitabı: şehir, semtler, ulaşım, mekanlar, kurumlar — Faz 2
│   ├── olaylar/            Olay dosyaları (her dosya bir tema) — Faz 5
│   ├── hikaye/             Başlangıç hikayesi parçaları — Faz 3
│   ├── npc/                NPC şablonları, isim havuzları — Faz 3
│   └── isler/              İşler ve kariyer yolları — Faz 4
└── tests/                  Node testleri
```

---

## 🧾 VERİ FORMATLARI (taslak — ilgili fazda kesinleşecek)

### Olay (Faz 1'de motor, Faz 5'te içerik)

```json
{
  "id": "mutfak_yangini",
  "baslik": "Ocakta unutulan tava",
  "etiketler": ["is", "mutfak"],
  "kosul": { "ve": [
    { "mekanTuru": "lokanta" },
    { "zamanDilimi": ["ogle", "aksam"] },
    { "degil": { "bayrak": "mutfak_yangini_oldu" } }
  ]},
  "agirlik": 10,
  "bekleme": { "gun": 30 },
  "tekrar": false,
  "sahneler": {
    "giris": {
      "metin": ["{npc.ad} bağırıyor: tavadan alev yükseliyor.", "Burnuna yanık yağ kokusu geliyor; {npc.ad} donmuş kalmış."],
      "secenekler": [
        { "metin": "Islak bezle üstünü kapat", "kontrol": { "beceri": "yemek", "zorluk": 40, "gecmisBonus": { "eskiMeslek": "asci", "deger": 30 } },
          "basari": { "git": "kurtardin" }, "basarisiz": { "git": "elin_yandi" } },
        { "metin": "Su dök", "git": "felaket" },
        { "metin": "Dışarı çık, itfaiyeyi ara", "maliyet": { "dakika": 20 }, "git": "kacis" }
      ]
    },
    "kurtardin": {
      "metin": ["Alev söndü. {npc.ad} sana uzun uzun bakıyor."],
      "etki": [
        { "iliski": { "npc": "patron", "saygi": 10, "guven": 5 } },
        { "ani": { "npc": "patron", "metin": "mutfağı yangından kurtardı" } },
        { "bayrak": "mutfak_yangini_oldu" },
        { "zamanla": { "gun": 21, "olay": "patronun_teklifi" } }
      ],
      "son": true
    }
  }
}
```

### Koşul dili (1.8'de kesinleşecek)

`ve`, `veya`, `degil` iç içe yazılır. Yaprak kontroller: `durum`, `beceri`, `para`, `iliski`, `bayrak`, `sayac`, `mekan`, `mekanTuru`, `semt`, `zamanDilimi`, `gun`, `mevsim`, `tatil`, `gecmis` (başlangıç hikayesi bileşenleri), `yas`. Sayısal kontrollerde `{ "para": { "min": 1000, "max": 5000 } }` biçimi.

### NPC (Faz 3)

```json
{
  "id": 417,
  "katman": "tanidik",
  "seed": "a91f-417",
  "uretildi": true,
  "degisenler": {
    "iliski": { "yakinlik": 22, "guven": 10, "saygi": 5, "cekim": 0, "gerginlik": 3 },
    "anilar": [{ "zaman": 18240, "metin": "çayının parasını ödedi" }],
    "hayatOlaylari": [{ "zaman": 30000, "tur": "is_degistirdi", "yeni": "mekan:fırın_12" }]
  }
}
```
Sabit arka plan (aile, geçmiş, sır, konuşma tarzı...) kayda yazılmaz; `seed`'den her seferinde aynı üretilir.

### Mekan (Faz 2)

```json
{ "id": "kahve_cinarlti", "ad": "Çınaraltı Kahvesi", "tur": "kahvehane", "semt": "eski_carsi",
  "sahip": "npc:12", "saatler": { "acilis": "07:00", "kapanis": "23:30" },
  "musteri": ["emekli", "esnaf"], "gecmis": "...", "dedikodular": ["..."], "firsatlar": ["okey_turnuvasi"] }
```

### İş (Faz 4)

```json
{ "id": "garson", "ad": "Garson", "sektor": "hizmet", "maasOran": 1.0, "bahsis": true,
  "gereksinim": { "beceri": { "iletisim": 10 } }, "mulakat": "mulakat_hizmet", "mesai": ["ogle", "aksam"] }
```

### Aksiyon (1.5 — kesin)

```json
{ "id": "yemek_hazirla", "ad": "Evde bir şeyler pişir", "alt": "Ucuz ve doyurucu; ama zaman alır.",
  "sure": 45, "tur": "normal", "para": 80, "enerji": 0, "etki": { "aclik": -50, "ruh": 3 },
  "dilimler": ["sabah", "ogle", "aksam"], "metin": ["...", "...", "..."] }
```

### Kayıt (1.5'te oluştu, 1.6'da kesinleşecek — `js/core/durum.js` → `yeniDurum`)

```json
{
  "kayitSurumu": 1,
  "oyunSurumu": "0.1.0",
  "seed": "KARGA-7Q2M",
  "olusturma": "2026-10-20T10:00:00Z",
  "zaman": 18240,
  "karakter": { "...": "..." },
  "durumlar": { "saglik": 80, "enerji": 60, "aclik": 30, "hijyen": 70, "ruh": 50, "stres": 40, "uyku": 50, "ozguven": 35 },
  "bayraklar": { "kalici": {}, "sureli": {}, "npc": {} },
  "sayaclar": {},
  "zamanlayicilar": [{ "zaman": 48000, "olay": "patronun_teklifi" }],
  "olayGecmisi": { "mutfak_yangini": { "son": 18200, "kez": 1 } },
  "npcler": {},
  "gunluk": [],
  "aksiyonGecmisi": []
}
```

---

## 💰 EKONOMİ REFERANS TABLOSU (taslak — Faz 2'de `data/ekonomi.json` ile kesinleşecek)

Tüm fiyatlar **asgari ücret (AÜ)** katı olarak tanımlanır. Tek bir sayıyı (`asgariUcret`) değiştirmek tüm ekonomiyi ölçekler. Oyunun başlangıç değeri: **AÜ = 28.000 ₺/ay (net)** (2026 Türkiye net asgari ücretine yakın yuvarlak değer; kurgusal).

| Kalem | AÜ oranı (taslak) | ≈ ₺ |
|---|---|---|
| Oda kirası (ucuz semt, paylaşımlı ev) | 0,35 – 0,50 | 9.800 – 14.000 |
| 1+1 kira (ucuz semt) | 0,75 – 0,95 | 21.000 – 26.600 |
| 1+1 kira (orta semt) | 1,1 – 1,5 | 30.800 – 42.000 |
| 2+1 kira (lüks semt) | 2,5 – 4,0 | 70.000 – 112.000 |
| Mutfak (tek kişi, idareli) | 0,30 – 0,40 | 8.400 – 11.200 |
| Toplu taşıma (aylık abonman) | 0,05 – 0,07 | 1.400 – 2.000 |
| Faturalar (paylaşımlı payı) | 0,08 – 0,12 | 2.200 – 3.400 |
| Telefon + internet | 0,03 – 0,05 | 850 – 1.400 |

**Örnek aylık bütçe (asgari ücretli, oda kiralayan):** oda 12.000 + mutfak 9.500 + ulaşım 1.700 + fatura payı 2.800 + telefon 1.000 = **27.000 ₺** → elde kalan ≈ 1.000 ₺. Birikim ancak disiplinle ya da ek gelirle.

**Maaş aralıkları (taslak):** vasıfsız 1,0–1,3 AÜ · ustalık/vasıflı 1,5–2,5 AÜ · beyaz yaka giriş 1,5–2 AÜ · uzman 3–6 AÜ · yönetici 6–15 AÜ.

**Enflasyon:** aylık %2–3 (değişken). Maaş zamları yılda 1–2 kez, enflasyonun gerisinde.

---

## 🐞 BİLİNEN HATALAR / SINIRLAR

- Ek motoru: 3. tekil iyelikle biten adlarda (Kahvesi, Sarayı, Belediyesi) `{ iyelik: true }` verilmeli; motor bunu kendisi anlayamaz. Veri dosyalarında mekan adlarına `iyelik` alanı konacak.
- Ek motoru: alışılmadık okunuşlu yabancı adlarda `{ okunus: '...' }` verilmeli (Bordeaux → bordo).
- Kayıt sistemi (1.6) gelene kadar her açılış yeni oyun başlatır.
- Ramazan ve Kurban Bayramı tarihleri henüz takvimde yok (Faz 2).
- Ek motoru: istisna listeleri (Kemal'e, saate, kitabı/topu) yaygın sözcükleri kapsar; yeni istisna çıkarsa `js/core/tr.js` içindeki listelere eklenir.

## 📝 YAPILACAKLAR / FİKİR HAVUZU

- Ramazan ve Kurban Bayramı tarihleri ay takvimine bağlı; Faz 2'de 2020–2060 arası tablo `data/takvim.json`'a yazılacak.
- Şehrin adı ve kimliği Faz 2'de belirlenecek.

### Ek fikirler — kullanıcı kararları (2026-10-20)

1. **Alışkanlık sistemi** — ❌ Kullanıcı istemedi (2026-10-20). Yapılmayacak.
2. **Dedikodu ağı** — ✅ Onaylandı, **şartlı**: basit bir "itibar +/-" sistemi olacaksa yapılmayacak. Yapılacaksa detaylı ve akıllı olmalı:
   - Bilgi NPC'den NPC'ye gerçek tanışıklık ağı üzerinden yayılır (kim kimi tanıyor, ne kadar yakın).
   - Her NPC kişiliğine göre aktarır: geveze büyütür, sadık olan saklar, düşman çarpıtır.
   - Bilgi yayıldıkça bozulur (çarpıtma), kaynağı izlenebilir ("bunu sana kim söyledi?").
   - Oyuncu bunu fark edebilir, kaynağı bulabilir, düzeltebilir ya da kendi lehine kullanabilir.
   - Hedef faz: Faz 4 (ilişkiler) altyapısı, Faz 5 içerik. Saçma sonuç üretmemesi için tutarlılık kuralları yazılacak.
3. **Şehir haber akışı** — ✅ Onaylandı. Telefonda, dünya kitabından beslenen haberler; içlerinde fırsat ipuçları. (Faz 2 veri + Faz 4 telefon ekranı)
4. **Kırılma anları** — ✅ Onaylandı, **şartlı**: çok iyi düşünülmüş olmalı. Nadir, geri dönüşü olmayan, geçmişe ve karaktere bağlı, hem kolay hem zor seçeneğin gerçek bedeli olan kararlar. Hayat özetinde öne çıkacak. (Faz 5 içerik, Faz 6 özet)
5. **Nesil devri** — ✅ Onaylandı, **şartlı**: zaman hızlı akmamalı (birkaç dokunuşta yıllar geçmesin), karakter hayatını gerçekten yaşamalı. Devir sadece ölüm/yaşlılıkta, çocuk/yeğen ile aynı dünyada. (Faz 6)
   - Bu şart zaman tasarımını da bağlar: oyunun temposu gün/dilim bazlı kalacak; "rutini tekrarla" kısayolu en fazla bir hafta atlatır ve olay çıkınca durur.

---

## 📜 SÜRÜM GEÇMİŞİ

| Sürüm | Tarih | Not |
|---|---|---|
| 0.0.1 | 2026-10-20 | Adım 1.1: PROJE.md, CLAUDE.md, klasör iskeleti, yer tutucu sayfa. |
| 0.0.5 | 2026-10-20 | Adım 1.5: `zaman.js` (gerçek takvim, dilimler, mevsim, yaş, özel günler), `simulasyon.js` (saatlik değişim, ruh hedefi, sağlık, uyku planı ve düzeni, eşik uyarıları), `durum.js` (kayıt şeması, kayıtlı RNG akışları, aksiyon/anlatım geçmişi), `aksiyon.js`, `oyun.js`; veri: simulasyon, aksiyonlar (10 aksiyon, her biri 2–4 metin), takvim (resmi tatiller). Deneme sahnesi kaldırıldı. Ek motoruna saat desteği (07:00'ye, 23:30'a). 177 test. |
| 0.0.4 | 2026-10-20 | Adım 1.4: arayüz iskeleti — durum çubuğu (dokununca ayrıntı paneli), 5 sekme, alttan panel, anlatım akışı (yazı hızı, atlama, geçmiş), seçenek kartları (maliyet, uzun basma), kısayollar, tema/yazı/hız/animasyon ayarları, safe-area, zoom ve aşağı çekme engeli, klavye takibi. Geçici deneme sahnesi. |
| 0.0.3 | 2026-10-20 | Adım 1.3: manifest, service worker (tam çevrimdışı, otomatik dosya listesi), ikonlar, 11 iPhone açılış görseli, HTML açılış ekranı, güncelleme bandı. Alışkanlık sistemi kullanıcı isteğiyle iptal. |
| 0.0.2 | 2026-10-20 | Adım 1.2: `js/core/rng.js` (seed, alt akışlar, ağırlıklı seçim), `js/core/tr.js` (ek motoru, tr-TR harf/sıralama), `js/core/format.js` (para, tarih, saat, süre), 154 Node testi. Ek fikir kararları işlendi. |
