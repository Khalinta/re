# PROJE.md — "Yeniden"

Türkçe, metin tabanlı, derin bir hayat simülasyonu. iPhone'da "Ana Ekrana Ekle" ile uygulama gibi çalışan bir PWA.

> Bu dosya projenin hafızasıdır. Her oturumun başında okunur, her adımın sonunda güncellenir.
> Bir karar değişirse eskisi silinmez; üstü çizilir (~~böyle~~) ve nedeni yazılır.

---

## 🧭 NEREDE KALDIK

- **Şu anki faz:** Faz 1 — Altyapı
- **Son tamamlanan adım:** 1.1 Proje hafızası ve klasör iskeleti
- **Sıradaki adım:** 1.2 Çekirdek yardımcılar (seed tabanlı rastgelelik, Türkçe ek motoru, para/tarih/saat biçimleri, testler) — **orta**
- **Kullanıcıdan beklenen:** "devam" demesi.

### Faz 1 adım listesi

| Adım | İçerik | Boyut | Durum |
|---|---|---|---|
| 1.1 | PROJE.md, CLAUDE.md, klasör yapısı, yer tutucu sayfa | küçük | ✅ |
| 1.2 | Seed RNG, Türkçe ek motoru, biçimlendirme (para/tarih/saat), tr-TR sıralama, Node testleri | orta | ⏳ |
| 1.3 | PWA kabuğu: manifest, service worker (çevrimdışı), ikon, açılış ekranı | orta | ⬜ |
| 1.4 | Arayüz iskeleti: alt sekme çubuğu, durum çubuğu, bottom sheet, anlatım akışı, temalar, yazı boyutu, safe-area | büyük | ⬜ |
| 1.5 | Oyun durumu, takvim, zaman dilimleri, durumlar (enerji, açlık, stres...), aksiyon döngüsü | orta | ⬜ |
| 1.6 | Kayıt sistemi: IndexedDB + localStorage yedek, 3 yuva, yuva başına 5 yedek, arka plana atılınca kayıt, kalıcı depolama izni, migration | büyük | ⬜ |
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
| K9 | **Testler Node'un yerleşik test koşucusuyla** (`node --test tests/`). Sadece saf mantık modülleri test edilir (ek motoru, koşul dili, RNG, migration). | Ek bağımlılık yok; geliştirme aracı, oyunun çalışmasına gerekmiyor. |
| K10 | **Service worker "önce önbellek, sonra ağ" + sürümlü önbellek adı.** Yeni sürümde eski önbellek silinir, kullanıcıya "güncelleme hazır" denir. | Tam çevrimdışı çalışma; güncellemeler kontrollü. |
| K11 | **NPC'ler tembel üretim:** dünyada yalnızca NPC kimliği + seed'i durur; ayrıntılar ilk karşılaşmada seed'den üretilir, kayda sadece *değişen* şeyler (ilişki, anılar, hayat olayları) yazılır. | Binlerce NPC'de bile kayıt küçük ve tutarlı kalır. |
| K12 | **Yayın: GitHub Pages (dal üzerinden).** Netlify'a geçiş için ek ayar gerekmez (statik dosyalar + göreli yollar). | Kullanıcı isteği; kodu gizlemek istenirse Netlify'a sürükle-bırak yeterli. |

---

## 📁 KLASÖR YAPISI

```
/
├── index.html              Uygulamanın tek sayfası
├── manifest.webmanifest    PWA tanımı (1.3)
├── sw.js                   Service worker — kökte olmalı ki tüm siteyi kapsasın (1.3)
├── .nojekyll               GitHub Pages'in dosyaları işlememesi için
├── PROJE.md                Bu dosya
├── CLAUDE.md               Claude için oturum kuralı
├── css/                    Stiller
├── icons/                  Uygulama ikonları, açılış ekranı görselleri
├── js/
│   ├── core/               Saf mantık: rng, tr (ek motoru), format, zaman, durum, kayıt, olay motoru
│   ├── ui/                 Ekranlar, sekmeler, bottom sheet, anlatım akışı
│   └── dev/                Gizli geliştirici paneli
├── data/
│   ├── ekonomi.json        Tüm fiyatlar (asgari ücrete oranlı) — Faz 2
│   ├── takvim.json         Resmi tatiller, bayram tarihleri, okul takvimi — Faz 2
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

### Kayıt (1.6'da kesinleşecek)

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

## 🐞 BİLİNEN HATALAR

- (henüz yok)

## 📝 YAPILACAKLAR / FİKİR HAVUZU

- Kullanıcıya önerilen ek fikirler (onay bekliyor) — aşağıda.
- Ramazan ve Kurban Bayramı tarihleri ay takvimine bağlı; Faz 2'de 2020–2060 arası tablo `data/takvim.json`'a yazılacak.
- Şehrin adı ve kimliği Faz 2'de belirlenecek.

### Önerilen ek fikirler (kullanıcı onayı bekliyor, uygulanmadı)

1. **Alışkanlık sistemi:** Tekrarlanan davranışlar (sabah koşusu, gece telefon, her akşam kahvehane) zamanla alışkanlığa dönüşsün; bırakmak/edinmek kendi başına bir uğraş olsun.
2. **Dedikodu ağı:** Oyuncunun yaptığı bir şey, NPC'lerin birbirini tanıma ağı üzerinden semtte yayılsın; semt itibarı bu yayılımla değişsin.
3. **Şehir gazetesi / haber akışı:** Telefonda dünya kitabından beslenen haberler (şirket iflası, yeni metro hattı, kira artışı haberi) — oyuncu bunlardan fırsat yakalayabilsin.
4. **Kırılma anları:** Hayatta nadir, geri dönüşü olmayan büyük kararlar (şehirden gitmek, birini ihbar etmek, mirası reddetmek) — özette öne çıksın.
5. **Nesil devri (Faz 6+):** Karakter ölünce, isterse çocuğuyla/yeğeniyle aynı dünyada devam.

---

## 📜 SÜRÜM GEÇMİŞİ

| Sürüm | Tarih | Not |
|---|---|---|
| 0.0.1 | 2026-10-20 | Adım 1.1: PROJE.md, CLAUDE.md, klasör iskeleti, yer tutucu sayfa. |
