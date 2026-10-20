# PROJE.md — "Yeniden"

Türkçe, metin tabanlı, derin bir hayat simülasyonu. iPhone'da "Ana Ekrana Ekle" ile uygulama gibi çalışan bir PWA.

> Bu dosya projenin hafızasıdır. Her oturumun başında okunur, her adımın sonunda güncellenir.
> Bir karar değişirse eskisi silinmez; üstü çizilir (~~böyle~~) ve nedeni yazılır.

---

## 🧭 NEREDE KALDIK

- **Şu anki faz:** Faz 2 — Dünya kitabı ve ekonomi (Faz 1 kapandı: 2026-10-20)
- **Son tamamlanan adım:** 2.5 Mekanlar (`data/dunya/mekanlar.json`): 52 mekan (her semtte en az 2), 31 tohum sahip (Faz 3'te NPC), 63 dedikodu (doğru/yanlış, konulu), fırsatlar, 8 gizli örgüt bağı; `core/mekan.js` (açık mı, kalabalık, semtteki mekanlar, konu dedikoduları, müdavimler, denetim)
- **Sıradaki adım:** 2.6 Takvim (Ramazan/Kurban Bayramı tarihleri, okul takvimi), hava durumu modeli, kendi ilerleyen dünya (dükkân açılıp kapanması, fiyatlar, şehir olayları) — **orta**
- **Faz 1 telefon testi (2026-10-20):** Yayın açıldı (https://khalinta.github.io/re/). iPhone, iOS 26 Safari, ana ekrandan: tam ekran ✓, IndexedDB ✓, kalıcı depolama izni verildi ✓, hata yok ✓, olay ve kayıt çalışıyor ✓. Tek sorun alttaki koyu şeritti. ~~0.1.2 yükseklik düzeltmesi~~, ~~0.1.3 kök arka plan~~, ~~0.1.4 gövde 100vh~~ (sekme yazılarını kesti) tutmadı. Kesin sebep (0.1.3 ölçümü): iOS 26 sayfayı 873 pt'de bitiriyor, altını kendisi uygulama rengiyle (#1b1916) boyuyor; CSS ile değiştirilemiyor. **0.1.5 çözümü (kullanıcının isteği):** sekme çubuğu ve kök arka plan şerit rengine (--arka) alındı, şerit varken ek alt boşluk kaldırıldı, palet tazelendi (seçili sekmede yumuşak vurgu zemini). 0.1.5 ekran görüntüsüyle doğrulandı (şerit sekme çubuğuyla aynı renkte, yazılar tam): **Faz 1 kapandı.**
- **Kullanıcıdan beklenen:** "devam" demesi (sıradaki: 2.2).

### Faz 1 adım listesi

| Adım | İçerik | Boyut | Durum |
|---|---|---|---|
| 1.1 | PROJE.md, CLAUDE.md, klasör yapısı, yer tutucu sayfa | küçük | ✅ |
| 1.2 | Seed RNG, Türkçe ek motoru, biçimlendirme (para/tarih/saat), tr-TR sıralama, Node testleri | orta | ✅ |
| 1.3 | PWA kabuğu: manifest, service worker (çevrimdışı), ikon, açılış ekranı | orta | ✅ |
| 1.4 | Arayüz iskeleti: alt sekme çubuğu, durum çubuğu, bottom sheet, anlatım akışı, temalar, yazı boyutu, safe-area | büyük | ✅ |
| 1.5 | Oyun durumu, takvim, zaman dilimleri, durumlar (enerji, açlık, stres...), aksiyon döngüsü | orta | ✅ |
| 1.6 | Kayıt sistemi: IndexedDB + localStorage yedek, 3 yuva, yuva başına 5 yedek, arka plana atılınca kayıt, kalıcı depolama izni, migration | büyük | ✅ |
| 1.7 | Dışa/içe aktarma: dosya + sıkıştırılmış metin kodu, sağlama (checksum) | orta | ✅ |
| 1.8 | Olay motoru A: bayraklar/sayaçlar, koşul dili, koşul açıklayıcı ("neden tetiklenmedi") | orta | ✅ |
| 1.9a | Olay motoru B1: yürütücü (ağırlıklı seçim, bekleme, tekrar engeli, çok sahneli olaylar, beceri/şans kontrolleri, ağırlıklı sonuçlar, zincir), etkiler, oyuna ve arayüze bağlama | büyük | ✅ |
| 1.9b | Olay motoru B2: metin şablonları ve ruh haline göre ton, zamanlayıcıların çalışması, hikaye yayları | orta | ✅ |
| 1.10 | Global hata yakalama, hata ekranı, hata raporu | orta | ✅ |
| 1.11 | Gizli geliştirici paneli | orta | ✅ |
| 1.12 | Yayın (GitHub Pages), telefonda test listesi, Faz 1 kapanışı | küçük | ✅ |

### Faz 2 adım listesi

| Adım | İçerik | Boyut | Durum |
|---|---|---|---|
| 2.1 | Şehrin kimliği, coğrafya, iklim, tarih, zaman çizelgesi (hikaye kancaları), semt iskeleti, dünya denetimi | orta | ✅ |
| 2.2 | Semt ayrıntıları: karakter, sosyoekonomik durum, kira katsayısı, sakinler, ünlü yerler, gerilimler, semtler arası ilişkiler | orta | ✅ |
| 2.3 | Ulaşım ağı: hatlar (metro, otobüs, vapur, dolmuş), duraklar, süreler, ücretler, yol bulma | orta | ✅ |
| 2.4 | Kurumlar, şirketler (iş ilanlarına kaynak), yerel figürler, kurgusal suç örgütleri ve bölgeleri | büyük | ✅ |
| 2.5 | Mekanlar: sahip (NPC tohumu), saatler, müşteri profili, geçmiş, dedikodular, fırsatlar | büyük | ✅ |
| 2.6 | Takvim (Ramazan/Kurban Bayramı tarihleri, okul takvimi), hava durumu modeli, kendi ilerleyen dünya (dükkan açılıp kapanması, fiyatlar, şehir olayları) | orta | ⏳ |
| 2.7 | Ekonomi dosyası (asgari ücrete oranlı her şey), PROJE.md ekonomi tablosunun kesinleşmesi | orta | ⬜ |
| 2.8 | Konum sistemi (kayıt şeması v2 + migration), Şehir sekmesi arayüzü, semtler arası gezinme | büyük | ⬜ |

### Fazlar

| Faz | İçerik | Durum |
|---|---|---|
| 1 | Altyapı (+ suç dünyası için koşul/etki türleri: 1.8–1.9) | ✅ kapandı (2026-10-20) |
| 2 | Dünya kitabı + ekonomi dosyası (+ örgütler, bölgeler, emniyet/adliye/cezaevi kurumları, suç ekonomisi) | ⏳ devam ediyor |
| 3 | Başlangıç hikayesi motoru, açılış sahneleri, NPC üretimi (+ örgüt hiyerarşisi/lider NPC'leri, suçla bağlantılı geçmiş bileşenleri) | ⬜ |
| 4 | İş, para, borç, barınma, eşya; ilişkiler, telefon ekranı (+ örgüt, aranma, adalet, hapishane, kara para sistemleri) | ⬜ |
| 5 | Olay içeriği (150+ derin olay, hikaye yayları) — sadece veri (+ suç dünyası olayları, giriş ve çıkış yayları, hapishane dönemi) | ⬜ |
| 6 | Eğlence, hedefler, son ekranı, günlük (+ suçla ilgili sonlar ve hayat özeti) | ⬜ |
| 7 | Denge, cila, hata ayıklama, kayıt testleri (+ "hızlı para, daralan hayat" eğrisi) | ⬜ |

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
| K24 | **Kayıt zarfı:** `{ bicim, kayitSurumu, oyunSurumu, sayac, kayitZamani, ozet, saglama, veri }`. `veri` durumun JSON metni; `saglama` bu metnin cyrb128 özeti (tek bayt bozulması yakalanır). `sayac` her kayıtta +1; iki depodan hangisinin yeni olduğu buna göre seçilir (cihaz saatine güvenilmez). Geçersiz durum (NaN, eksik alan, 0–100 dışı) asla zarflanmaz. | Bozuk ya da yarım yazılmış kaydı kesin tanımak; doğru kopyayı seçmek. |
| K25 | **İki depo + yedekler:** her kayıtta önce localStorage yansısına (eşzamanlı, uygulama kapanırken bile tamamlanır), sonra IndexedDB'ye yazılır; IndexedDB yazımı geri okunarak doğrulanır (`durability: strict`). Yüklerken iki depodaki geçerli kayıtlardan sayacı büyük olan seçilir, diğeri onarılır. İkisi de bozuksa otomatik yedeklerden (yeniden eskiye) açılır ve oyuncuya söylenir. Hiçbiri açılmazsa otomatik kayıt askıya alınır, hiçbir şeyin üstüne yazılmaz, oyuncuya sorulur. Yuva boşsa (bilerek silinmiş) yedekten kendiliğinden geri getirilmez. IndexedDB açılamazsa her şey localStorage'da tutulur. | "Asla veri kaybı" (bölüm 2). |
| K26 | **Otomatik yedek zamanı:** oturumun ilk kaydında ve oyun içinde her yeni gün başladığında; ayrıca yuva silinmeden, yedeğe dönülmeden ve yuvada yeni oyun başlatılmadan önce. Yuva başına en fazla 5, en eskisi silinir. Her hamlede yedek alınmaz (yoksa 5 yedek 5 hamlede biterdi). | Yedekler anlamlı zaman aralıklarını kapsar. |
| K27 | **Kayıt anları:** her aksiyondan sonra (oyun durumu her değiştiğinde), uygulama arka plana atılınca (`visibilitychange`), sayfa kapanırken (`pagehide`), güncelleme bandındaki "Yenile"den önce. Kayıt sürerken gelen istekler birleştirilir (en son hal yazılır). | Her an kesilebilecekmiş gibi. |
| K28 | **Migration kuralı:** şema değişince `KAYIT_SURUMU` +1, `js/core/migration.js`'e `n → n+1` adımı eklenir (eskiler asla silinmez/değişmez), `node tools/ornek-kayit.mjs` ile yeni sürüm örneği üretilir; `tests/ornekler/` içindeki TÜM eski örnekler testte güncel şemaya açılabilmeli. Daha yeni sürümden gelen kayıt reddedilir (bozulmadan). | Güncellemelerde eski kayıtlar sorunsuz dönüşsün. |
| K29 | **Kalıcı depolama:** ilk açılışta bir kez `navigator.storage.persist()` istenir; sonuç Kayıtlar ekranında gösterilir, "İzni tekrar iste" düğmesi var. İzin yoksa oyuncu birkaç hamle yaptıktan sonra bir kez kibar bir uyarı çıkar (dışa aktarma önerisiyle). | Bölüm 2 gereksinimi; ilk saniyede oyuncuyu uyarıyla karşılamamak. |
| K30 | ~~K8: "YND1." öneki + sağlama, CompressionStream yoksa sıkıştırmasız biçim~~ → **kesinleşti:** kod = `YND1.` + base64url(deflate-raw(zarf JSON)); sıkıştırma yoksa `YND0.` + base64url(zarf JSON). Ayrı bir kod sağlaması yok, çünkü zarfın kendi sağlaması zaten tüm veriyi kapsıyor; kesik kod sıkıştırma çözülürken düşüyor. Kodun arasındaki boşluk ve satır sonları yok sayılır (mesajlaşma uygulamaları kodu bölebilir). | Tek bütünlük mekanizması; iki ayrı sağlama gereksiz karmaşa olurdu. Değişiklik değil, K8'in netleşmesi. |
| K31 | **Dosya dışa aktarma:** okunabilir JSON (`{ aciklama, zarf }`), adı `yeniden-<ad>-yuva<N>-<tarih-saat>.json`. iPhone'da paylaşım menüsü açılır (Web Share, "Dosyalar'a Kaydet"); desteklenmezse indirme. İçe aktarma kodu da dosyayı da (sarmallı ya da çıplak zarf) kabul eder; önce özet + "sağlam ✓" gösterilir, sonra yuva seçilir; dolu yuvanın mevcut hali önce yedeklenir. | Hem kopyala-yapıştır hem dosya (bölüm 2); içe aktarma hiçbir şeyi geri dönüşsüz ezmez. |
| K32 | **Para biçiminde sayı ile ₺ arasında bölünmez boşluk** (`\u00a0`). | Dar ekranda "1.995" ile "₺" ayrı satırlara düşüyordu. |
| K33 | **Koşul dili: kontrol kayıt tablosu (`KONTROLLER`) + açıklayıcı + doğrulayıcı.** Her kontrol `{ tamam, aciklama }` döner; açıklama Türkçe ve sayılı ("Enerji ≥ 20 (şu an 12)"). `nedenTutmadi()` sadece tutmayan dalları verir (geliştirici paneli: "neden tetiklenmedi"). Yeni kontrol = tabloya bir satır. Genel `deger` kontrolü sayesinde ileride eklenecek her alana koda dokunmadan koşul yazılabilir. | Faz 5'te 150+ olay sadece veriyle; hatalar testte yakalanır, oyunda değil. |
| K34 | **Henüz var olmayan alanlar (konum, npcler, suc) kayıt şemasına şimdi eklenmedi;** koşul dili bunları yoksa "yok/0" sayar. Alanlar ilgili sistemle birlikte (Faz 2–4) migration ile eklenecek (K28). | Gereksiz migration ve boş alan taşımamak; mevcut kayıtlar değişmeden kalır. |
| K35 | **Bayraklar:** kalıcı / süreli (`bitis` oyun dakikası; dolunca yok sayılır, aksiyon sonrası temizlenir) / NPC'ye özel (`bayraklar.npc[id]`, boşalınca silinir). Sayaçlar `sayaclar`, NPC sayaçları NPC bölümünde sayı olarak. Aksiyonlar da artık `kosul` + `kosulSebep` taşıyabilir. | Bölüm 11 gereksinimi. |
| K36 | **Olay motoru saf mantıktır (`core/olay.js`), oyun döngüsü `oyun.js`'te.** Her aksiyondan sonra: önce o aksiyona bağlı olaylar (`aksiyonaBagliOlasilik`), yoksa genel olaylar (`aksiyonSonrasiOlasilik`, iki genel olay arası en az `enAzAralikDk`). Olay sürerken aksiyon ve kısayollar kapalı; seçenekler olayınkidir (sol kenarı vurgulu). Etkin olay `durum.aktifOlay` olarak kayda girer. | Olay ortasında uygulama kapansa da kaldığı sahneden sürer; olay sıklığı koda dokunmadan ayarlanır. |
| K37 | ~~K34'teki "alanlar şimdi eklenmedi"~~ **güncelleme:** `npcler`, `itibar`, `suc`, `aktifOlay`, `sonOlayZamani` gibi isteğe bağlı alanlar **ilk kullanıldıklarında** (bir etki ya da olay onları yazınca) oluşur. Kayıt şeması sürümü değişmedi; doğrulayıcı fazladan alanları kabul ediyor. Sistemler kesinleşince (Faz 3–4) varsayılanları migration ile her kayda eklenecek. | Olay etkileri, NPC ve suç sistemleri gelmeden de çalışabilsin (Faz 5 içeriği beklemesin). Eski kayıtlar hiç bozulmuyor. |
| K38 | **Tek metin motoru (`core/metin.js`)**: olaylar, aksiyonlar ve eşik uyarıları aynı varyasyon/ton/koşul/şablon kurallarını kullanır; şablon yazım anında çözülür ve anlatım geçmişine düz metin olarak kaydedilir. Ton bir "ses rengi"dir: aynı olay, gergin bir karakterde başka cümlelerle anlatılır. | Bölüm 11 ve 12: her metnin birden çok versiyonu, ruh haline göre ton, Türkçe ek. |
| K39 | **Hikaye yayları birinci sınıf yapı**: `durum.yaylar[id] = { asama, basladi, guncellendi, gecmis, bitti?: { sonuc, z } }` (ilk kullanımda oluşur, K37). Yaylar olaylardan bağımsız tanımlanır, böylece hayat özeti ve geliştirici paneli yayları anlamlı adlarla gösterebilir. | Uzun hikayeler bayrak yığınına dönüşmesin; sonuçları özetlenebilsin. |
| K40 | **Hamleler geri alınabilir:** her oyuncu hamlesi (`aksiyonYap`, `olaySeceneginiYap`, `olayiZorla`) durumun kopyasıyla başlar; içinde hata çıkarsa durum aynı nesne üzerinde eski haline döner, arayüze bildirim gitmez, dolayısıyla yarım hal asla kaydedilmez. | "Kayıt bozulması kesinlikle olmamalı" ve "hata oyunu çökertmesin" birlikte. |
| K41 | **Hata katmanları (`js/hata.js`):** (1) arka plandaki yakalanmamış hata/söz hatası → kaydedilir, oyun sürer, oturumda bir kez kısa bir bant; (2) hamle sırasındaki hata → "Bir sorun oldu" paneli: Hata raporunu kopyala / Devam et / Uygulamayı yeniden başlat; panel nasıl kapanırsa kapansın menü yeniden kurulur; (3) açılış hatası → açılış ekranında rapor ve yeniden dene düğmeleri. Son 100 hata bellekte. Daha Fazla → "Sorun bildir" ile rapor her an kopyalanabilir. | Bölüm 3. |
| K42 | **Hata raporu (`core/rapor.js`, saf):** sürümler, seed, cihaz (tarayıcı, ekran, ana ekrandan mı, saat dilimi, depolama, service worker), tüm hatalar (yığın dahil, oyun zamanıyla), kayıt sistemi uyarıları, durum özeti (zaman, para, durumlar, beceriler, etkin olay, bayraklar, zamanlayıcılar, yaylar, olay geçmişi), son 50 hamle (olay seçimleri dahil), son anlatım ve **o anki durumun kayıt kodu**. Rapordaki kodla durum birebir yeniden kurulabilir. | Kullanıcı raporu yapıştırınca sorunu yeniden oluşturabilmek. |
| K43 | **Gizli geliştirici paneli (`js/dev/panel.js`):** Daha Fazla → Sürüm satırına 2,5 sn içinde 7 dokunuş (4. dokunuştan sonra "N dokunuş kaldı"). Bölümler: Genel (seed kopyala, kayıt kodu, belirli seed + başlangıç tarihiyle yeni oyun, zaman atlat +1 saat/gün/hafta/ay, isteğe bağlı simülasyonlu, etkin olayı iptal), Durum (para ekle/çıkar, tüm durumlar kaydırıcıyla, beceriler), Olaylar (arama, uygunluk ✓/✗, "Neden?", koşulsuz tetikle, zamanlayıcılar: şimdi çalıştır/sil, yaylar: sıfırla), Bayrak (kalıcı/süreli/NPC, sayaçlar, ekle/sil), NPC (ilişki ve anılar; arka planlar Faz 3), Hata (liste, rapor kopyala, deneme hatası). Her değişiklik `gelistiriciDegistir` ile geri alınabilir yapılır, anlatıma "[geliştirici]" notu düşer ve hemen kaydedilir. | Bölüm 3. |
| K44 | **Kod denetimi:** `eslint.config.js` + `tests/lint.test.js` (ESLint kuruluysa çalışır): tanımsız ad, gölgelenen ad, kullanılmayan değişken, yinelenen anahtar. | 1.11'de bulunan "kayit" gölgeleme hatası testlerden kaçmıştı; bu tür hatalar artık her test çalıştırmasında yakalanır. |
| K45 | **Şehir: Karaliman** (kurgusal; ad `data/dunya/sehir.json` → `ad` alanından tek yerden değişir). Gerçek Türkiye'de, gerçek bölgede (Marmara), kurgusal şehir; gerçek ülke olayları (salgın, kur şokları) arka planda kalabilir ama şehre özgü kişiler, şirketler, kulüpler, felaketler kurgusaldır. | Gerçek kişi/kuruma gönderme yapmadan "son derece sağlam temelli" bir dünya. |
| K46 | **Dünya kitabının şimdisi = 2026-10-20 (`DUNYA_SIMDISI`).** Zaman çizelgesi bu tarihe kadar olan "geçmiş"tir; oyun içinde dünyanın ilerlemesi (2.6) kayda yazılır, dünya kitabına değil. Hikaye kancaları (`kancalar`) zaman çizelgesi olaylarına bağlıdır; karakter geçmişleri (Faz 3) bunları kullanır ve tarih/yaş tutarlılığı buradan denetlenir. | Geçmişteki olaylar dünya kitabıyla uyumlu olsun (bölüm 5): anılan yer, şirket ve tarih gerçekten var olsun. |
| K47 | **Adı iyelik ekiyle biten yerlere `"iyelik": true`** (Tersaneönü, Sahilyolu; ileride "Çınaraltı Kahvesi" gibi mekanlar). Test, her semt adının bulunma ekiyle doğru çekimlendiğini denetler. | Ek motoru iyeliği kendisi anlayamaz (1.2'de not edildi). |
| K48 | **Ulaşımda durak = semt; yol bulma beklenen sürelerle ve rastgelelik olmadan.** Hatlar semtleri sırayla bağlar; bekleme sefer aralığının yarısı, trafik saate göre katsayı. | Konum semt + mekan düzeyinde (K-konum); sokak düzeyi gereksiz ayrıntı olur. Rotanın her seferinde aynı çıkması test edilebilirlik ve oyuncunun planlayabilmesi için; sürprizler (kaçan otobüs, iptal vapur) olay motorunun işi. |
| K49 | **Her kişi ve kurumun iki yüzü: `kamuoyu` / `gercek`; örgüt bağları (`paravan`, figürün `orgut`u) gizli.** Gizli bilgi yalnızca kendi alanında durur; açık metinlere sızmaz (test). | Dedikodu ağı, haber akışı ve keşif (Faz 3–5) için: oyuncunun öğrendiği şeyin bir değeri olsun; dünya baştan her şeyi söylemesin. |
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
├── eslint.config.js        Kod denetimi kuralları (geliştirme aracı)
├── PROJE.md                Bu dosya
├── CLAUDE.md               Claude için oturum kuralı
├── css/                    Stiller
├── icons/                  Uygulama ikonları, açılış ekranı görselleri
├── js/
│   ├── main.js             Giriş noktası: açılış, service worker, güncelleme
│   ├── oyun.js             Oyun denetleyicisi: veri yükleme, durum, aksiyon çalıştırma, arayüze bildirim
│   ├── kayit.js            Kayıt yöneticisi: otomatik kayıt, arka planda kayıt, kalıcı izin, aktif yuva
│   ├── depolama.js         Tarayıcı depoları: IndexedDB, localStorage
│   ├── hata.js             Hata yakalama, hata paneli, açılış hatası, rapor kopyalama
│   ├── surum.js            Oyun sürümü
│   ├── core/               Saf mantık: rng, tr (ek motoru), format, zaman, simulasyon, durum, aksiyon,
│   │                       kayitbicim (zarf, sağlama, doğrulama), kayitdeposu (yuva/yedek mantığı), migration,
│   │                       aktarim (kayıt kodu, dosya), bayrak (bayrak/sayaç), kosul (koşul dili),
│   │                       etki (olay sonuçları), olay (olay motoru, zamanlayıcılar), metin (şablon, ton, çeşit),
│   │                       rapor (hata raporu metni), dunya (dünya kitabı denetimi ve yardımcıları),
│   │                       ulasim (hatlar, bekleme, trafik, ücret, yol bulma),
│   │                       toplum (kurum, şirket, figür, örgüt yardımcıları ve denetimi),
│   │                       mekan (açık mı, kalabalık, dedikodular, mekan denetimi)
│   ├── ayarlar.js          Cihaz görünüm ayarları (tema, yazı, hız, hareket)
│   ├── ui/                 Arayüz parçaları (panel, anlatım, seçenekler, durum çubuğu, sekmeler)
│   │   └── ekranlar/       Sekme ekranları ve paneller (simdi, dahafazla, kayitlar, aktarim, yertutucu)
│   └── dev/panel.js        Gizli geliştirici paneli
├── data/
│   ├── simulasyon.json     Durumların değişim kuralları, eşik uyarıları (1.5)
│   ├── aksiyonlar.json     Temel günlük aksiyonlar (1.5)
│   ├── takvim.json         Resmi tatiller (1.5); bayram tarihleri ve okul takvimi Faz 2'de
│   ├── ekonomi.json        Tüm fiyatlar (asgari ücrete oranlı) — Faz 2
│   ├── dunya/              Dünya kitabı (Faz 2): sehir.json (2.1), semtler.json (2.2), ulasim.json (2.3),
│   │                       kurumlar / sirketler / figurler / orgutler.json (2.4), mekanlar.json (2.5)
│   ├── olay_ayarlari.json  Olayların çıkma sıklığı (1.9a)
│   ├── yaylar.json         Hikaye yayı tanımları (1.9b)
│   ├── olaylar/            Olay dosyaları (her dosya bir tema); _liste.json hepsini sayar — içerik Faz 5
│   ├── hikaye/             Başlangıç hikayesi parçaları — Faz 3
│   ├── npc/                NPC şablonları, isim havuzları — Faz 3
│   └── isler/              İşler ve kariyer yolları — Faz 4
└── tests/                  Node testleri
    └── ornekler/           Eski sürüm örnek kayıtlar (migration testleri için; asla silinmez)
```

---

## 🧾 VERİ FORMATLARI (taslak — ilgili fazda kesinleşecek)

### Olay (1.9a — kesin; `js/core/olay.js`, ayrıntılı şema dosyanın başında)

Dosyalar: `data/olaylar/*.json` (`{ "olaylar": [...] }`), hepsi `data/olaylar/_liste.json`'da listelenir (test eksik olanı yakalar). Sıklık: `data/olay_ayarlari.json`.

Önemli kurallar: `tetik` = `otomatik` | `aksiyon:<id>` | `zamanlayici` | `zincir`. `tekrar` varsayılanı `false` (bir kez). Seçenekte `kontrol` varsa `basari`/`basarisiz` dalları, `sonuclar` varsa ağırlıklı ve koşullu dallar; ikisi birlikte olmaz. Kontrol olasılığı oyuncuya yüzde olarak değil "Yazı tura.", "Riskli görünüyor." gibi gösterilir. Her kontrol deneyim kazandırır (`deneyim: 0` ile kapatılır). Doğrulayıcı kırık sahne bağlantısını, ulaşılamayan sahneyi, bilinmeyen etkiyi, olmayan zincir/zamanlayıcı olayını yakalar.

Etkiler (`js/core/etki.js`): para, durum, beceri, bayrak, bayrakKaldir, sayac, iliski, ani, itibar, zamanla, zaman, olay (zincir), gunluk, not, deger (genel yol), yay, yayBitir, aranma, karaPara, sabika, orgut.

**Zamanlayıcı (1.9b):** `{ "zamanla": { "sure": { "gun": 6 }, "olay": "x", "kosul": ..., "kosulTutmazsa": "iptal" | "bekle", "baglam": true } }`. Vakti gelince (her aksiyon ve olay sonunda bakılır; rastgele olaylardan önce gelir) zamanlayıcının koşulu tutmazsa iptal olur (ya da bekler); olayın kendi koşulu tutmazsa (ör. "gece olmaz") bekler.

**Hikaye yayı (1.9b):** tanımlar `data/yaylar.json` (`id, ad, aciklama, asamalar, sonuclar`). Etki: `{ "yay": { "id", "asama" } }`, `{ "yayBitir": { "id", "sonuc" } }`; koşul: `{ "yay": { "id", "asama" | "durum": yok/aktif/bitti | "sonuc" } }`. Olayda `"yay": "id"` ile hangi yaya ait olduğu belirtilir. Tanımsız aşama/sonuç testte hata verir.

### Metin (1.9b — kesin; `js/core/metin.js`)

Biçimler: `"metin"` · `["çeşit 1", "çeşit 2"]` · `[["paragraf 1", "paragraf 2"], "çeşit 2"]` · `{ "tur": "konusma", "konusan": "...", "metin": "..." }` · `{ "ton": { "gergin", "kotu", "yorgun", "iyi", "varsayilan" } }` (öncelik bu sırayla: stres ≥ 75, ruh ≤ 35, enerji ≤ 20, ruh ≥ 65) · `{ "kosullu": [{ "kosul", "metin" }], "varsayilan": ... }`.

Şablon: `{karakter.ad}`, ekli `{karakter.ad|in}` → "Ayşe'nin", zincir `{semt|de|ki}`, süzgeç `|bas` `|buyuk` `|kucuk`; çeşitleme `[[soğuk|ayaz|keskin]]`. Değişkenler: karakter.*, saat, gun, tarih, dilim, mevsim, para, oyunGunu, yas + olayın bağlamından gelenler (`baglam.degisken`). Değer `{ "ad": "Çınaraltı Kahvesi", "iyelik": true }` olabilir. Bilinmeyen değişken «ad» olarak görünür ve uyarı verir; doğrulayıcı bilinmeyen kökleri ve kırık parantezleri yakalar. Aksiyon ve uyarı metinleri de aynı motoru kullanır.

Aşağıdaki ilk taslak (1.1) tarihsel kayıt olarak duruyor:

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

### Koşul dili (1.8 — kesin; `js/core/kosul.js`)

Mantık: `{ "ve": [...] }`, `{ "veya": [...] }`, `{ "degil": koşul }`. Dizi = "ve". Bir nesnede birden çok anahtar = "ve". Koşul yoksa her zaman tutar.

Kurallar — sayı: `5`, `{ "min": 1, "max": 9 }`, `{ "esit": 3 }`, `{ "degil": 0 }`, `{ "biri": [1, 2] }`, `{ "var": true }`; metin: `"asci"`, `["asci", "garson"]`.

| Kontrol | Örnek | Not |
|---|---|---|
| durum | `{ "durum": { "enerji": { "min": 20 }, "aclik": { "max": 70 } } }` | data/simulasyon.json'daki durumlar |
| beceri | `{ "beceri": { "yemek": { "min": 30 } } }` | öğrenilmemiş = 0 |
| para | `{ "para": { "min": 1000 } }` | |
| bayrak | `"borclu"` · `{ "ad": "x", "var": false }` · `{ "ad": "ofkeli", "npc": "patron", "deger": { "min": 2 } }` | süreli bayrak süresi dolunca yok |
| sayac | `{ "sayac": { "kahve": { "min": 3 } } }` · `{ "sayac": { "ad": "borc", "npc": "patron", "kural": { "min": 1 } } }` | |
| iliski | `{ "iliski": { "npc": "patron", "guven": { "min": 30 }, "tur": "is" } }` | NPC sistemi Faz 3–4 |
| mekan / mekanTuru / semt | `{ "mekanTuru": ["kahvehane", "lokanta"] }` | konum Faz 2 |
| zamanDilimi | `{ "zamanDilimi": ["ogle", "aksam"] }` | sabah, ogle, aksam, gece |
| saat | `{ "saat": { "min": "22:00", "max": "03:00" } }` | gece yarısını aşabilir |
| gun / haftaSonu | `{ "gun": ["cumartesi", "pazar"] }` · `{ "haftaSonu": true }` | gün adları Türkçe karaktersiz: sali, carsamba, persembe |
| mevsim | `{ "mevsim": "kis" }` | kis, ilkbahar, yaz, sonbahar |
| tatil | `true` (resmi tatil) · `false` · `"Cumhuriyet Bayramı"` | data/takvim.json |
| tarih | `{ "tarih": { "min": "2026-11-01" } }` | |
| oyunGunu | `{ "oyunGunu": { "min": 7 } }` | ilk gün = 1 |
| yas | `{ "yas": { "min": 18 } }` | |
| gecmis | `{ "gecmis": { "eskiMeslek": "asci", "kusurlar": "kumar" } }` | başlangıç hikayesi (Faz 3); dizi ise "içeriyor mu" |
| olay | `{ "olay": { "id": "x", "kez": { "min": 1 }, "gecenGun": { "min": 30 } } }` | olay geçmişi |
| deger (genel) | `{ "deger": "suc.orgutler.demirciler.rutbe", "min": 2 }` | durumdaki herhangi bir alan |
| aranma / karaPara | `{ "aranma": { "min": 2 } }` | suç dünyası (Faz 4); alan yoksa 0 |
| sabika | `true` · `false` · `"hirsizlik"` · `{ "min": 2 }` | |
| orgut | `true` · `{ "id": "demirciler", "rutbe": { "min": 2 }, "guven": { "min": 40 } }` · `{ "id": "x", "uye": false }` | |

NPC rolleri (`"patron"`) olayın bağlamından gerçek NPC kimliğine çevrilir (`baglam.npc`). Bilinmeyen kontrol çökmez, "tutmaz" ve açıklamada yazar. `kosulDogrula()` tüm veri dosyalarının koşullarını testte denetler.

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

## 🌆 DÜNYA: KARALİMAN (özet; ayrıntı `data/dunya/`)

Kurgusal, Marmara kıyısında, 4,18 milyonluk bir liman şehri. Çaybaşı Deresi körfeze dökülür ve şehri ikiye böler: **batı yakası** (eski şehir, liman, tersane, eski sanayi), **doğu yakası** (Cumhuriyet'le büyüyen yeni şehir), **kuzey** (sırtlar: gecekondudan apartmana, fabrikalar, yutulan köyler).

**Semtler (14):** Eski Çarşı, Aşağıliman, Tersaneönü, Marina, Tabakhane, İstasyon (batı) · Cumhuriyet, Çamlık, Sahilyolu, Yamaçevler (doğu) · Bezhane, Kayalıtepe, Kuzey Sanayi, Ilıcaköy (kuzey).

**Hikaye kancaları (zaman çizelgesinden; Faz 3'te karakter geçmişlerine bağlanacak):** mübadil torunu, gecekondu çocuğu, grevci ailesi, Bezhane emeklisi, sel mağduru (2003), tersane işsizi (2008), Demirspor oyuncusu/taraftarı, sakat sporcu, Deryapı mağduru/çalışanı (2018), liman işçisi (2021), kripto mağduru / KoinPazar çalışanı (2022), Tabakhane nöbetçisi (2023), unutulan ünlü / medya çalışanı (Liman TV, 2025).

**Kural:** Zaman çizelgesindeki her olay `DUNYA_SIMDISI` (2026-10-20) öncesidir, tarih sırasındadır ve yalnızca var olan semtlere başvurur (`tests/dunya.test.js`).

**Semt ayrıntıları (`semtler.json`, 2.2):** İskelet (id, ad, yaka, özet) `sehir.json`'da kalır; ayrıntılar `semtler.json`'da, `semtBul()` ikisini birleşik döndürür. Her semtte: `karakter`, `atmosfer` (sabah/öğle/akşam/gece birer satır, anlatım için), `duyular`, `sosyo` (gelir 1–5, yoğunluk 1–5, güvenlik 1–5, polis 1–5, dönüşüm 0–5, `kiraKatsayisi` = şehir ortalamasına çarpan, `kiraEgilimi` -1…2), `sakinler` (dosya başındaki `sakinTurleri` kataloğundan, NPC üretiminde ağırlık), `unluYerler` (semtin simgeleri; girilen mekanlar 2.5'te ayrı), `gerilimler` (zaman çizelgesi olaylarına bağlı), `komsular` (yürüyerek, iki yönlü; ağ bağlı), `iliskiler` (tek yönlü bakış: dayanışma, gerilim, küçümseme, özenti, rekabet, bağımlılık), `etiketler`.

| Semt | Gelir | Kira × | Güvenlik | Dönüşüm | Kısaca |
|---|---|---|---|---|---|
| Yamaçevler | 5 | 3,0 | 5 | 0 | köklü servet, kararlar akşam yemeğinde |
| Marina | 5 | 2,4 | 5 | 5 | cam kuleler, AVM, KoinPazar'ın gölgesi |
| Sahilyolu | 4 | 1,7 | 5 | 1 | Kordon, düzenli orta-üst hayat |
| Cumhuriyet | 4 | 1,35 | 4 | 1 | belediye, adliye, meydan |
| Çamlık | 2 | 1,0 | 4 | 2 | öğrenciler, her eylül kira zammı |
| Eski Çarşı | 3 | 0,95 | 4 | 3 | esnaf, turistleşme |
| Ilıcaköy | 3 | 0,9 | 4 | 4 | bağlar ve toplu konut, şehrin ucu |
| Tersaneönü | 2 | 0,85 | 3 | 4 | işsiz ustalar, gelen kafeler |
| Aşağıliman | 2 | 0,8 | 3 | 2 | mübadiller, balıkçılar, meyhaneler |
| Bezhane | 2 | 0,75 | 4 | 1 | lojman komşuluğu, yaşlanan semt |
| İstasyon | 2 | 0,7 | 2 | 2 | gar, pansiyonlar, gece ekonomisi |
| Kayalıtepe | 2 | 0,65 | 3 | 2 | kalabalık işçi semti, Deryapı mağdurları |
| Tabakhane | 1 | 0,6 | 2 | 3 | deri atölyeleri, göçmenler, dönüşüm korkusu |
| Kuzey Sanayi | 2 | 0,55 | 2 | 1 | fabrikalar, vardiyalar, gece depoları |

**Ulaşım (`ulasim.json`, 2.3):** Durak = semt. Hatlar: M1 Gar–Çarşı–Meydan–Kampüs, M2 Marina–Gar–Kayalıtepe–OSB, vapur Marina–Liman–Sahilyolu (havaya duyarlı), otobüs 10 / 22 / 31 / 40 / 55 (Ilıcaköy'e saatte bir), dolmuş Gar–Kampüs (gece 02:00'ye kadar) ve Kayalıtepe–Çarşı. Bekleme = sefer aralığının yarısı (dilime göre; hafta sonu uzar); otobüs, dolmuş ve taksi trafiğe takılır (sabah ×1,6, akşam ×1,7, gece ×0,8). Ücretler AÜ oranı: metro/otobüs 0,0009 (≈25 ₺), vapur 0,0011, dolmuş 0,0013, taksi açılış 0,0018 + dakika 0,00045; Kent Kart 60 dk içinde en çok 2 aktarma %50. Gece 01:00–05:30 arası hiçbir hat yok: yürüyüş ya da taksi. Yol bulma beklenen sürelerle çalışır (rastgelelik yok); gerçek bekleme ve aksilikler (kaçan otobüs, iptal vapur) oyun sırasında olaylarla eklenecek.

~~Suç dünyası için yalnızca zemin var; örgütler ve bölgeleri 2.4'te bu semtlere bağlanacak.~~ → 2.4'te bağlandı (aşağıda).

**Toplum (2.4):**
- **Kurumlar (35):** belediye, iş kurumu, SGK, vergi; Emniyet + 5 karakol (her semt tam bir karakola bağlı: Liman, Gar, Kuzey, Meydan, Sahil); adliye, baro, kapalı ve açık cezaevi (Ilıcaköy), denetimli serbestlik; 5 sağlık kurumu (devlet, üniversite, özel, ruh sağlığı, bağımlılık); üniversite ve 5 okul + halk eğitim; sosyal yardım, kadın danışma; sendika, esnaf odası, 4 dernek (mübadil, Tabakhane, KoinPazar ve Deryapı mağdurları); Demirspor.
- **Şirketler (32):** Oransay Holding ve şirketleri, fabrikalar (Kuzey Sanayi), lojistik, kurye, inşaat (Şanlı Yapı; batık Deryapı), finans (Körfezbank, batık KoinPazar, Çarşı Döviz), ulaşım, taşeronlar, medya (Körfez Postası, KaralimanHaber, kapanan Liman TV), turizm, balıkçılık, küçük esnaf. Her biri: iş türleri (22'lik katalog, Faz 4 iş ilanları buradan), ücret katsayısı, sigorta (tam/eksik/yok), itibar, çalışma koşulları. Paravan şirketlerin örgüt bağı gizli (`paravan`).
- **Figürler (26):** başkan ve oğlu, emniyet müdürü, Gar komiseri, Oransay baba-kız, müteahhitler, kaçak kurucular (Deryal, Çetinel), gazeteciler, unutulan spiker, kulüp başkanı, Rıza Usta, Gülizar Ateşoğlu, iki avukat, saatçi, muhtar, örgüt liderleri ve aileleri. Her biri: `kamuoyu` (şehrin bildiği) ve `gercek` (gizli; ipucu ve olaylarla öğrenilir), zaaf, istek, birbirleriyle ilişkiler (sır, borç, ortaklık, düşmanlık...). Faz 3'te sabit NPC olarak oyuna girecekler.
- **Örgütler (4, kurgusal):** **Kalyoncular** (Aşağıliman'ın eski usul ailesi; liman, kaçakçılık, kara para; çıkışı en zor), **Karakaşlar** (İstasyon'un gece ekonomisi; kumar, koruma, masada borç), **Tepeliler** (Kayalıtepe'nin genç mahalle çetesi; sokak, çalıntı mal, tribün), **Sarraflar** (Bedesten'in arka odası; tefecilik, kara para). Her biri: zaman çizelgesine bağlı tarihçe, semt bölgeleri (güç 1–5; Tabakhane çekişmeli), kurallar ve ihlal bedeli, rütbe şablonu, faaliyetler (anlatı düzeyinde), karşılıklı ilişkiler (ateşkes, rekabet, düşmanlık, iş ortaklığı), itibar (korku/saygı), polisin bilgisi, giriş yolları, çıkış anlatımı ve zorluğu. Hazır kıvılcımlar: Kalyoncu'nun halef kavgası (Tufan / Cevat), Cevat'ın Tepeliler'le gizli işi, başkanın oğlunun Karakaş'a borcu, yeni emniyet müdürünün aradığı tanık.
- **Mekanlar (2.5, 52):** her semtte 2–5 yer; kahvehane, çay ocağı, kafe, lokanta, büfe, meyhane, bar, gece kulübü, otel, pansiyon, fırın, bakkal, pazar, AVM, kitapçı, tamirci, park, hamam, spor salonu, özel kulüp, lokal, muhtarlık, kütüphane, kantin. Her biri: sahip (figür / şirket / kurum ya da Faz 3'te NPC olacak sabit bir **tohum**: ad, yaş, sakin türü, tanım), saatler (gece yarısını geçebilir; `kapaliGunler`, `her_zaman`), fiyat 1–5, hizmetler (aksiyonlar bunlara bağlanacak), müşteri profili (sakin türleri), dilime göre kalabalık 0–3, tasvir, geçmiş, müdavim figürler, dedikodular (`dogru` oyuncuya gizli; ~%35'i yanlış; `konu` bir figür/örgüt/şirket/kurum/mekan), fırsatlar (iş, tanışma, bilgi, eğlence, ucuz, beceri, yardım, sakinlik, güç, **suç kapısı**), gizli örgüt bağı. Paravan şirketin mekanı aynı örgüte gizli bağlı olmak zorunda (denetim). Her örgüt en az bir mekandan ve doğru bir dedikodudan keşfedilebilir (test). Her semtte sabah ve akşam açık bir yer var; gece 01:00–05:00 arası yalnızca İstasyon'un gece yerleri, bazı barlar ve sürekli açık yerler.
- **Kural:** gizli bağlar kamuya açık metinlere (şirket açıklaması, figürün `kamuoyu`, kurum açıklaması) yazılmaz; test bunu denetler.

---

## 🚀 YAYIN VE TELEFONDA TEST

**Adres:** https://khalinta.github.io/re/ (depo herkese açık; GitHub Pages ücretsiz).

**GitHub Pages'i açmak (bir kez):**
1. https://github.com/Khalinta/re adresine git.
2. Üstteki **Settings** (Ayarlar) sekmesine dokun.
3. Soldaki menüde **Pages**'i seç.
4. "Build and deployment" altında **Source**: `Deploy from a branch`.
5. **Branch**: `claude/yeniden-life-sim-7npvmq`, klasör: `/ (root)` → **Save**.
6. 1–3 dakika bekle; sayfanın üstünde "Your site is live at https://khalinta.github.io/re/" yazar.

Sonraki her push kendiliğinden yayına girer (1–3 dk). Uygulama yeni sürümü bir sonraki açılışta kendisi alır; oyun açıkken gelirse altta "Yeni sürüm hazır — Yenile" bandı çıkar.

**Netlify'a geçmek (kodu gizli tutmak istenirse):** depo gizli yapılır, netlify.com'da "Add new site → Import from Git" ile bu depo ve dal seçilir; build komutu boş, yayın klasörü kök. Göreli yollar sayesinde hiçbir dosya değişmez (K2).

**Faz 1 telefon test listesi (iPhone, Safari):**
1. Safari'de adresi aç: güneşli açılış ekranı, sonra oyun.
2. Paylaş düğmesi (kare + yukarı ok) → **Ana Ekrana Ekle** → Ekle. Ana ekranda güneş ikonu.
3. İkondan aç: tam ekran (Safari çubukları yok), açılışta koyu ekran + güneş.
4. Birkaç hamle yap. Durum çubuğuna dokun (ayrıntı paneli), bir seçeneğe uzun bas (bilgi), paneli aşağı kaydırarak kapat.
5. Üstte saat/çentik ile durum çubuğu çakışıyor mu? Alttaki sekmeler iPhone'un alt çizgisine yapışık mı?
6. Çift dokunarak yakınlaşma ve aşağı çekip yenileme olmamalı.
7. Uygulamayı tamamen kapat (alttan yukarı kaydır, uygulamayı yukarı at) → yeniden aç: kaldığın yerden devam etmeli.
8. Uçak modunu aç → uygulamayı aç: çalışmalı.
9. Daha Fazla → Kayıtlar: "Kalıcı depolama" ne yazıyor? Bir yuvada **Dışa aktar** → Kodu kopyala → Notlar'a yapıştır. **Dosya olarak kaydet** → paylaşım menüsü açılmalı.
10. **Kayıt içe aktar**: kod kutusuna dokun → klavye açılınca ekran bozulmamalı, yakınlaşma olmamalı, alt sekmeler gizlenmeli.
11. Tema / yazı boyutu / metin hızı ayarlarını dene.
12. Sürüm satırına 7 kez dokun → geliştirici paneli açılmalı.
13. Daha Fazla → **Sorun bildir** → Hata raporunu kopyala → raporu Claude'a yapıştır (sorun olmasa bile; cihaz bilgisi için yararlı).

---

## 🕶️ PLANLANAN ÖZELLİK: SUÇ DÜNYASI (2026-10-20, kullanıcı isteği)

Kurgusal, derin bir yeraltı dünyası. Ayrı bir mod değil; hayatın içine örülü, oyuncunun girebileceği, içinde yükselebileceği ve çıkmanın kendi başına bir hikaye olduğu bir yol.

### İçerik kuralları (bağlayıcı)
- Faaliyetler (uyuşturucu satıcılığı, haraç, kaçakçılık, kumarhane, tefecilik, çalıntı mal) **yalnızca anlatı ve seçim** olarak yer alır. Gerçek dünyada uygulanabilir yöntem, tarif, teknik ya da prosedür ayrıntısı **asla** yazılmaz. Anlatı insanlara, gerilime, ikilemlere ve sonuçlara odaklanır; "nasıl yapılır"a değil.
- Örgütler, kişiler, olaylar tamamen kurgusaldır; gerçek örgüt, kişi ya da olaya gönderme yapılmaz.
- Ton: vaaz vermez, özendirmez. Cazibesi gerçek, bedeli de gerçek. Bölüm 10'daki bağımlılık tonu gibi dengeli.

### Tasarım hedefi
Kısa vadede kolay ve hızlı para gibi görünür; uzun vadede hayatı daraltır: güvenilecek insan azalır, normal kapılar kapanır, para harcanamaz hale gelir, her tanıdık bir risk olur. Faz 7'de bu eğri ölçülerek ayarlanır.

### Faz dağılımı

**Faz 1 — Altyapı (1.8–1.9; mevcut motorun parçası, ayrı kod yok)**
- Koşul dilinde genel **yol tabanlı kontrol** (`{ "deger": "suc.aranma", "min": 3 }`): durumdaki herhangi bir alana koda dokunmadan koşul yazılabilir. Bunun üstüne kısa yazımlar: `aranma`, `sabika`, `orgut` (üyelik, rütbe, güven), `karaPara`.
- Etki türleri de genel: `degerEkle` / `degerYaz` ile her alan değiştirilebilir; ayrıca kısa etki adları (aranma artır, sabıka ekle, örgüt güveni, kara para). Böylece Faz 4 sistemleri gelince olay dosyaları değişmeden çalışır.
- Bayrak ve sayaçlar zaten kalıcı / süreli / NPC'ye özel olacak; ihbar, borç, sınanma gibi durumlar bunlarla izlenir.

**Faz 2 — Dünya kitabı**
- `data/dunya/orgutler.json`: mahalle çeteleri, organize suç aileleri, kaçakçılık şebekeleri. Her biri için: ad, tür, tarihçe (şehir zaman çizelgesine bağlı), **bölgeler** (dünya kitabındaki semtlere bağlı), kurallar (ihanet, borç, aile, bölgeye saygı), hiyerarşi şablonu (rütbe adları ve sayıları), geçim kaynakları (anlatı düzeyinde), müttefik / düşman ilişkileri, şehirdeki itibarı.
- Örgütlerin dünyaya bağlanması: semt karakterine yansıması (kim haraç veriyor, hangi kahvehane kimin), mekanların gizli sahiplik/bağlantı bilgisi, paravan işletmeler (iş ilanlarında da görünebilir), haber akışında suç haberleri.
- Kurumlar (kurgusal): karakollar ve emniyet, adliye, avukatlık büroları, cezaevi(ler), denetimli serbestlik.
- Suç ekonomisi değerleri `data/ekonomi.json`'da (asgari ücrete oranlı): kazanç aralıkları, haraç oranları, tefeci faizleri, avukat ücretleri, kefalet/para cezası aralıkları.

**Faz 3 — Hikaye ve NPC motoru**
- Örgüt hiyerarşisi NPC'lerle doldurulur: lider(ler) ana karakter katmanında (ayrıntılı arka plan, sır, zaaf, ailesi, rakibi), orta kademe ve sokak seviyesi tekrar eden tanıdık katmanında.
- NPC gizli özellikleri: **ihbarcı** (polisle bağlantılı), **güvenilmez** (ihanet eğilimi), **borçlu**, **hırslı**. Seed'den üretilir; oyuncu ancak ipuçlarıyla fark eder.
- Başlangıç hikayesi bileşenleri: eski sabıka, aileden ya da mahalleden örgüt bağı, örgüte / tefeciye borç, eski bir suç ortağı, tanık olunmuş bir olay. Tutarlılık kuralları (ör. kamu görevinden yeni ayrılmış biri genç yaşta ağır sabıkalı olamaz).
- Açık kalan iplikler: geçmişten gelen örgüt üyeleri, ödenmemiş borç, kapanmamış dava.

**Faz 4 — Sistemler**
- **Örgüt sistemi:** üyelik, rütbe, örgüt içi güven / sadakat / korku; kademeli giriş (küçük iş → güven → sınanma → yükselme); görev yapısı (olay motoruyla); kurallar ve çiğnemenin bedeli; **çıkış zorluğu ve bedeli** (borç, tehdit, aileye baskı, bilgi sahibi olmanın riski). Örgütler arası ilişki matrisi; dünya ilerlerken bölge el değiştirir, liderler düşer, ateşkesler bozulur.
- **Aranma ve polis ilgisi:** görünür aranma seviyesi (0–5) + gizli soruşturma dosyası (delil, tanık, ihbar sayısı). Zamanla söner ama dosya kapanmaz. İhbarcılar ve güvenilmez ortaklar dosyayı besler. Durum çubuğunda yalnızca sıfırdan büyükse küçük bir işaret.
- **Adalet zinciri:** gözaltı → ifade → avukat (NPC; ücretli, baro avukatı ya da pahalı ve "bağlantılı" olanı) → tutuklama ya da serbest bırakılma → mahkeme sahneleri → beraat / erteleme / hapis. Anlatı düzeyinde ve kurgusal; hukuki prosedür ayrıntısı oyunun gerektirdiği kadar.
- **Hapishane dönemi (oynanabilir):** ayrı mekan ve aksiyon seti, günlük düzen, koğuş hiyerarşisi ve kuralları, kendi NPC'leri ve ilişkileri, fırsatlar (okuma, eğitim, atölye, bağlantı), tehlikeler, görüş günü (aile ve sevgiliyle ilişki sınanır), mektup / telefon hakkı, tahliye ve dışarıya uyum. Zaman burada da gerçek akar (bölüm 15 / nesil devri şartı: yıllar birkaç dokunuşta geçmez; uzun cezalarda haftalık rutin kısayolu var, olay çıkınca durur).
- **Sabıka kaydı:** kalıcı bayraklar; iş başvurularında işe göre kontrol (kamu, güvenlik, finans kapalı; bazı işverenler göz yumar, bazıları sömürür), ehliyet / pasaport / kredi notu etkileri, ev kiralamada zorluk.
- **Kara para:** ayrı "kirli para" bakiyesi. Temiz paraya karışmadan harcanabilir ama büyük ya da göze batan harcama dikkat çeker (aranma, çevrenin şüphesi, vergi). Temize çıkarmak yalnızca anlatı düzeyinde ve riskli (paravan işletme, güvenilmez aracı); yöntem ayrıntısı yok.
- **Yaralanma ve ölüm riski:** sağlık sistemine bağlı; kalıcı iz (sakatlık, korku), ölüm hayatı bitirebilir (bölüm 15).
- **Hayatın her yanına yayılma:** aile ve sevgili ilişkileri (güven, gerginlik, korku; uzaklaşma ya da suç ortaklığı), mahalle itibarı (bazıları korkar, bazıları saygı duyar, çoğu uzak durur), dedikodu ağı üzerinden yayılma, telefon ekranında örgüt mesajları.

**Faz 5 — İçerik (sadece veri)**
- Giriş yolları: borç, mahalle tanıdığı, eski arkadaş, çaresizlik anı, tesadüfen şahit olmak. Her biri farklı bir örgüte ve farklı bir tona açılır.
- Faaliyet olay zincirleri (anlatı düzeyinde): küçük işler, sınanma görevleri, haraç, kaçakçılık, kumarhane, tefecilik, çalıntı mal; her birinde gerçek ikilem ve bedel.
- Risk olayları: polis baskını, ihbar, ortağın ihaneti, rakip örgüt çatışması, örgüt içi hesaplaşma, ailenin öğrenmesi.
- Hapishane olayları ve yayları.
- **Çıkış yayları** (her biri kendi başına uzun hikaye): temize çıkmak (borcu kapatmak, örgütle pazarlık, yeni hayat kurmak), tanıklık etmek (koruma, tehdit, kimlik), şehri terk etmek (her şeyi geride bırakmak). Bazıları kırılma anı (ek fikir 4) olarak işlenir.

**Faz 6 — Sonlar ve özet**
- Suçla bağlantılı sonlar (hapiste geçen yıllar, ölüm, kaçış, temize çıkış, örgütün başına geçmek) ve hayat özetinde bu dönemin anlatısı. Nesil devrinde geride kalan iz (borç, düşman, isim).

**Faz 7 — Denge**
- "Kolay para, daralan hayat" eğrisinin ölçülmesi; suç yolunun tek baskın para yöntemi olmaması (bölüm 16); çıkış yollarının ulaşılabilir ama bedelli olması.

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

### Düzeltilen hatalar (kayıt için)
- **Faz 1 telefon testi → 0.1.2:** iPhone'da ana ekrandan açınca altta boş koyu bir şerit kalıyordu. Sebep: iOS standalone modda `innerHeight` / `visualViewport.height` durum çubuğu kadar (59 pt) eksik bildiriyor (rapor: ekran 932, pencere 873); gövde yüksekliği bu değerden alınıyordu. Düzeltme: gövde `position: fixed; inset: 0` ile tüm ekranı kaplar; görünür yükseklik yalnızca klavye açıkken kullanılır.
- **1.3 → 1.11:** İlk ziyarette service worker kontrolü alınca sayfa gereksiz yere yeniden yükleniyordu (yarıda kalan indirmeler sahte hata olarak kaydediliyordu). Düzeltildi: yalnızca gerçekten bir önceki sürümden geçilirken yenilenir.
- **1.6 → 1.11:** Güncelleme bandındaki "Yenile" çalışmıyordu: service worker kaydını tutan yerel değişkenin adı (`kayit`) kayıt modülünü gölgeliyordu; "önce kaydet" adımı hata verip yenilemeyi engelliyordu. 1.10'daki hata kaydı sayesinde bulundu. Düzeltildi; ayrıca kayıt hata verse bile güncelleme artık sürer. Bu tür hatalar için ESLint teste eklendi (K44).
- **1.4 → 1.6:** Liste sayfalarında içerik ekrana sığmayınca bloklar sıkışıp görünmez oluyordu.

### Açık sınırlar
- **Açık sınır (iPhone, iOS 26, ana ekran modu):** sistem sayfanın altına ~59 pt'lik bir şerit çiziyor ve onu manifest rengiyle (#1b1916) boyuyor; sayfa o alana inemiyor (ölçüm: ekran 932, innerHeight/dvh 873). ~~0.1.4: gövdeyi 100vh yapmak~~ — 873'ün altı hiç çizilmiyor, sekme yazıları kesildi. 0.1.5'ten beri sekme çubuğu bu renkte, şerit çubuğun devamı gibi görünür (karanlık tema). Aydınlık temada şerit koyu kalır; manifest rengi tek olabildiği için şimdilik böyle.

- Ek motoru: 3. tekil iyelikle biten adlarda (Kahvesi, Sarayı, Belediyesi) `{ iyelik: true }` verilmeli; motor bunu kendisi anlayamaz. Veri dosyalarında mekan adlarına `iyelik` alanı konacak.
- Ek motoru: alışılmadık okunuşlu yabancı adlarda `{ okunus: '...' }` verilmeli (Bordeaux → bordo).
- İki depo birden bozulursa en yakın otomatik yedeğe dönülür; bu yedek birkaç hamle (en kötü durumda bir oyun günü) geride olabilir. Oyuncuya söylenir.
- Uygulama aynı anda iki sekmede açılırsa iki sekme aynı yuvaya sırayla yazar (sayaç en son yazanı kazandırır). iPhone uygulamasında bu durum oluşmaz; önlem alınmadı.
- Bir zamanlayıcının olayı kendi koşulu yüzünden (ör. "gece olmaz") hiç tutmazsa zamanlayıcı süresiz bekler. Şu an bu sadece birkaç saatlik gecikme demek; uzun bekleyenler için Faz 7'de "son geçerlilik" eklenebilir.
- Ramazan ve Kurban Bayramı tarihleri henüz takvimde yok (Faz 2).
- Ek motoru: istisna listeleri (Kemal'e, saate, kitabı/topu) yaygın sözcükleri kapsar; yeni istisna çıkarsa `js/core/tr.js` içindeki listelere eklenir.

## 📝 YAPILACAKLAR / FİKİR HAVUZU

- Bir zamanlayıcının olayı kendi koşulu yüzünden (ör. "gece olmaz") hiç tutmazsa zamanlayıcı süresiz bekler. Şu an bu sadece birkaç saatlik gecikme demek; uzun bekleyenler için Faz 7'de "son geçerlilik" eklenebilir.
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
| 0.1.9 | 2026-10-20 | Adım 2.5: `data/dunya/mekanlar.json` (52 mekan, 31 tohum sahip, 63 dedikodu, 8 gizli örgüt bağı; tür / hizmet / fırsat katalogları) ve `core/mekan.js` (açık mı — gece yarısını geçen saatler önceki güne sayılır, kalabalık, semtteki mekanlar, konu dedikoduları, müdavimler, denetim). Oyun dosyayı yüklüyor. 284 test. |
| 0.1.8 | 2026-10-20 | Adım 2.4: `kurumlar.json` (35), `sirketler.json` (32 + 22 iş türü), `figurler.json` (26), `orgutler.json` (4 kurgusal örgüt); `core/toplum.js` (karakol, semtteki örgütler, iş verenler, paravanlar, üyeler; çapraz başvuru denetimi: karakol kapsamı, sahip/paravan/lider/rütbe, iki yönlü örgüt ilişkileri, yaş, iyelik şüphesi). Oyun dosyaları yüklüyor. 276 test. |
| 0.1.7 | 2026-10-20 | Adım 2.3: `data/dunya/ulasim.json` (10 hat, 23 yol, tarife, trafik) ve `core/ulasim.js` (zamana bağlı yol bulma: toplu/yürüyüş/taksi, bekleme, trafik, Kent Kart aktarma indirimi, taksi ücreti, veri denetimi); dünya denetimine bağlandı, oyun dosyayı yüklüyor. 267 test. |
| 0.1.6 | 2026-10-20 | Adım 2.2: `data/dunya/semtler.json` (14 semt ayrıntısı, 27 sakin türü, 56 ünlü yer, 41 gerilim, komşuluk ağı, ilişkiler); `core/dunya.js` semt denetimi (ölçekler, sakin türleri, iki yönlü komşuluk, olay başvuruları, iyelik şüphesi) ve yardımcılar (`semtBul` birleşik, `semtKomsulari`, `semtIliskisi`, `sakinTuruSec`); oyun dosyayı yüklüyor. 256 test. |
| 0.1.5 | 2026-10-20 | Alttaki şerit, kalıcı çözüm: 0.1.4'teki 100vh geri alındı; sekme çubuğu ve kök arka plan --arka (şerit rengi), theme-color --arka; ana ekran modunda şerit algılanınca (`ios-alt-serit`) alt güvenli alan boşluğu 0. Palet tazelendi, `--vurgu-zemin` (seçili sekme, seçilen seçenek, aktif yuva). |
| 0.1.4 | 2026-10-20 | Alttaki şerit, ölçüme dayalı deneme: `@media (display-mode: standalone) { body { height: 100vh } }`; theme-color sekme çubuğu rengi. |
| 0.1.3 | 2026-10-20 | Alttaki şerit 0.1.2 ile gitmedi: kök arka plan sekme çubuğu renginde yapıldı (görsel yama), hata raporuna ekran ölçümleri eklendi (screen/inner/visualViewport/100vh-dvh-lvh-svh/güvenli alan/gövde ve sekme alt kenarı). |
| 0.1.2 | 2026-10-20 | Faz 1 telefon testi: iOS 26 standalone'da her şey çalışıyor (kalıcı depolama izni verildi). Alttaki boş şerit düzeltildi (yükseklik visualViewport'tan alınmıyor). |
| 0.1.1 | 2026-10-20 | Adım 2.1: `data/dunya/sehir.json` (Karaliman: coğrafya, 12 aylık iklim, kimlik, deyişler, mutfak, kulüp, medya, şehir efsaneleri, 7 dönemlik tarih, 23 olaylık zaman çizelgesi ve hikaye kancaları, 14 semt iskeleti), `core/dunya.js` (denetim, semt/kanca yardımcıları), şablonda `{sehir.*}`, giriş metni şehri anıyor. 250 test. |
| 0.1.0 | 2026-10-20 | Faz 1 sürümü (1.12 hazırlığı): alt adreste (/re/) açılış, service worker kapsamı, çevrimdışı açılış ve kayıt doğrulandı; yayın adımları, Netlify notu ve 13 maddelik telefon test listesi PROJE.md'ye yazıldı. Kullanıcı testi bekleniyor. |
| 0.0.12 | 2026-10-20 | Adım 1.11: gizli geliştirici paneli (6 bölüm), `oyun.js` geliştirici işlevleri (gelistiriciDegistir, zamanAtla, olayListesi, aktifOlayiIptal, zamanlayiciCalistir), belirli seed/tarihle yeni oyun. Hata düzeltmeleri: ilk ziyarette gereksiz yeniden yükleme; güncelleme bandının çalışmaması (değişken gölgeleme). ESLint denetimi teste eklendi, bulduğu 7 gölgeleme/kullanılmayan değişken temizlendi. 246 test. |
| 0.0.11 | 2026-10-20 | Adım 1.10: `js/hata.js` (global hata/söz hatası yakalama, bant, hata paneli, açılış hata ekranı, `guvenli` sarmalı, rapor kopyalama), `core/rapor.js`, `geriAlinabilir` (hamle hatasında durumu geri alma), olay başlangıç/seçimleri hamle geçmişine, Daha Fazla → Sorun bildir. Tarayıcıda zorla hata ile denendi: durum geri alındı, yarım hal kaydedilmedi, rapor kopyalandı, oyun sürdü. 245 test. |
| 0.0.10 | 2026-10-20 | Adım 1.9b: `core/metin.js` (şablon + ek, süzgeçler, [[çeşitleme]], ton, koşullu çeşit, doğrulayıcı) olaylar/aksiyonlar/uyarılara bağlandı; zamanlayıcıların çalışması (`vadesiGelenZamanlayici`, koşul/bekle/iptal); hikaye yayları (`data/yaylar.json`, yay/yayBitir etkileri, yay koşulu, doğrulayıcı); örnek yay: apartman_tesisati → yonetici_kapida → apartman_toplantisi. "Sabahın köründe" çeşidi koşullu metinle geri geldi. 242 test. |
| 0.0.9 | 2026-10-20 | Adım 1.9a: `core/etki.js` (20 etki türü, doğrulayıcı), `core/olay.js` (uygunluk ve nedenleri, ağırlıklı seçim ve çarpanlar, çok sahneli yürütme, gizli/kilitli seçenekler, bedeller, beceri ve şans kontrolleri + deneyim + anlatısal zorluk ifadesi, ağırlıklı koşullu sonuçlar, zincir, doğrulayıcı), `oyun.js` olay döngüsü, Şimdi ekranında olay seçenekleri, `data/olaylar/ev.json` (3 örnek olay: apartman tesisatı, kapıdaki kedi, eski fotoğraf), `data/olay_ayarlari.json`. 234 test. |
| 0.0.8 | 2026-10-20 | Adım 1.8: `core/bayrak.js` (kalıcı/süreli/NPC bayrakları, sayaçlar), `core/kosul.js` (ve/veya/değil, 25 kontrol türü: durum, beceri, para, bayrak, sayaç, ilişki, mekan, zaman, gün, mevsim, tatil, tarih, yaş, geçmiş, olay geçmişi, genel yol, aranma, kara para, sabıka, örgüt; açıklayıcı, "neden tutmadı", doğrulayıcı). Aksiyonlara `kosul`/`kosulSebep`. 222 test. |
| 0.0.7+ | 2026-10-20 | Plan: "Suç dünyası" planlanan özellik olarak eklendi ve Faz 1–7'ye dağıtıldı (kod yok). Önceden yazılmış hiçbir şey değişmedi. |
| 0.0.7 | 2026-10-20 | Adım 1.7: dışa/içe aktarma — `core/aktarim.js` (YND1 sıkıştırılmış kod, YND0 yedek biçim, boşluk toleransı, kesik/değişmiş kod reddi, dosya içeriği ve adı), Kayıtlar'da her yuvaya "Dışa aktar" (kodu kopyala, dosya olarak kaydet/paylaş) ve "Kayıt içe aktar" (kod ya da dosya → özet → yuva seç → dolu yuva önce yedeklenir → istersen oyuna geç). Depoya `enIyiZarf` ve `iceAktar`. Para biçiminde bölünmez boşluk. 207 test. |
| 0.0.6 | 2026-10-20 | Adım 1.6: kayıt sistemi — `kayitbicim.js` (zarf, sağlama, doğrulama), `migration.js` (adım altyapısı), `kayitdeposu.js` (iki depo, onarım, yedekten kurtarma, 5 yedek sınırı, silme/geri dönüşte önce yedek), `depolama.js` (IndexedDB strict + localStorage, IndexedDB yoksa tam localStorage), `kayit.js` (otomatik kayıt, birleştirme, arka planda kayıt, kalıcı izin), Kayıtlar ekranı (3 yuva, geç, yeni oyun, yedekler, sil, depolama durumu). Hata düzeltmesi: liste sayfalarında içerik taşınca bloklar sıkışıp görünmez oluyordu (1.4'ten beri). 196 test (300 adımlık bozulma stres testi dahil). |
| 0.0.5 | 2026-10-20 | Adım 1.5: `zaman.js` (gerçek takvim, dilimler, mevsim, yaş, özel günler), `simulasyon.js` (saatlik değişim, ruh hedefi, sağlık, uyku planı ve düzeni, eşik uyarıları), `durum.js` (kayıt şeması, kayıtlı RNG akışları, aksiyon/anlatım geçmişi), `aksiyon.js`, `oyun.js`; veri: simulasyon, aksiyonlar (10 aksiyon, her biri 2–4 metin), takvim (resmi tatiller). Deneme sahnesi kaldırıldı. Ek motoruna saat desteği (07:00'ye, 23:30'a). 177 test. |
| 0.0.4 | 2026-10-20 | Adım 1.4: arayüz iskeleti — durum çubuğu (dokununca ayrıntı paneli), 5 sekme, alttan panel, anlatım akışı (yazı hızı, atlama, geçmiş), seçenek kartları (maliyet, uzun basma), kısayollar, tema/yazı/hız/animasyon ayarları, safe-area, zoom ve aşağı çekme engeli, klavye takibi. Geçici deneme sahnesi. |
| 0.0.3 | 2026-10-20 | Adım 1.3: manifest, service worker (tam çevrimdışı, otomatik dosya listesi), ikonlar, 11 iPhone açılış görseli, HTML açılış ekranı, güncelleme bandı. Alışkanlık sistemi kullanıcı isteğiyle iptal. |
| 0.0.2 | 2026-10-20 | Adım 1.2: `js/core/rng.js` (seed, alt akışlar, ağırlıklı seçim), `js/core/tr.js` (ek motoru, tr-TR harf/sıralama), `js/core/format.js` (para, tarih, saat, süre), 154 Node testi. Ek fikir kararları işlendi. |
