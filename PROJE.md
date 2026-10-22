# PROJE.md — "Yeniden"

Türkçe, metin tabanlı, derin bir hayat simülasyonu. iPhone'da "Ana Ekrana Ekle" ile uygulama gibi çalışan bir PWA.

> Bu dosya projenin hafızasıdır. Her oturumun başında okunur, her adımın sonunda güncellenir.
> Bir karar değişirse eskisi silinmez; üstü çizilir (~~böyle~~) ve nedeni yazılır.

---

## 🧭 NEREDE KALDIK

- **Şu anki faz:** Faz 3, ek adımlar 3.7–3.10 (derin karakterler, hafıza, Claude ile serbest sohbet). Kullanıcı 2026-10-21'de istedi ve "uygulayalım" dedi.
- **Son tamamlanan adım:** 3.22 O anın durumuna göre sohbet (0.1.39, K76). Kullanıcı (2026-10-22): "Asıl vurgu kişiye özel değildi (o da iyi olur); durum özelinde de farklı ve o duruma uygun şeyler olmalı." Üç katman: (1) **Söylenen her şeye uygun cevap** — artık sadece dertler değil: bugünkü hali (yorgun: 'Otur, sana bir çay söyleyeyim' / 'Neden bu kadar yoruldun?' / 'Bugün erken yat'; gergin: 'Kim sinirlendirdi seni?' / 'Derin bir nefes al' / güldürmeye çalışmak; dalgın: 'Aklın nerede?' / rahat bırakmak; keyifli: 'Ne oldu, anlat!' / kutlamak), dedikodu ('Kimden duydun?', 'Başkasının işine karışmayalım', 'Bunu {o kişiye} söyleyeceğim', 'Baştan anlat'), hayali ('Neden hemen başlamıyorsun?', 'Sana yardım ederim', 'Benim de bir hayalim var'), şehrin gündemi (haklılar / abartıyorlar / hep aynı), işi ('Oralarda bana göre bir iş var mı?' — bazen iş ipucu bırakır; 'İşini seviyor musun?'), memleketi ('Özlüyor musun?', 'Bir gün beni de götür'). (2) **O anın durumu** (en çok 3, menünün başında): yüzünden belliyse 'Bir şey mi oldu?' (açılırsa yakınlık düşük olsa da derdini anlatır), barda/meyhanede 'Bir içki ısmarla' (üç kadehe kadar; her kadehte dili çözülür, ilgisi artar, derdini anlatma eşiği düşer; dindar biri içmez), çay ocağında/kafede 'Bir çay daha söyle' (daha uzun kalır), yağmurda parkta 'Bir yere sığınalım' (birlikte en yakın kapalı yere geçip konuşmaya devam), gece geç 'Seni eve bırakayım' (kapıda 'Yukarı gelmek ister misin?' ya da onun mahallesinde sokakta kalırsın), az önce kırdıysan 'Özür dilerim, kaba oldu', öpüştüyseniz 'Az önce olanı konuş', kalkmak üzereyse 'Biraz daha kal'. (3) **Kişiye özel tepki**: metinler kişinin özelliğine (gururlu, alıngan, kavgacı, geveze…), flört tarzına, kuşağına ve kaçıncı kadehte olduğuna göre değişiyor. Menü taşmasın diye ana özel seçenekler varken gündem/mahalle/kendinden bahset düşüyor. 436 test.
- **Önceki:** 3.21 Konuşma kancaları (0.1.38, K75). Kullanıcı (2026-10-22): "Defne ev arkadaşı aramaktan yoruldum diyor; teklif edebilmeliyim, kim olursa veya aramız ne olursa olsun. Ezber kalıp cümleler ve seçeneklerden çok daha derin bir sohbet sistemiyle böyle özelleştirilmiş cevaplar verilebilmeli, sohbetin akışı böyle olabilmeli." Yeni `js/core/kanca.js` + `data/npc/kanca.json`: kişinin söylediği bir cümle ("ev arkadaşı aramaktan yoruldum", "taşınmayı düşünüyorum", "ev çok sessiz") ya da anlattığı dert (64 dertten 45'i bağlı) bir **kanca** açar; o konuya özel cevaplar sohbetin en başına gelir — tanışalı beş dakika da olsa: ev arkadaşı / ev derdi ("Benim yanıma taşın", "Bir süre bende kal", birlikte ilanlara bakmak, haklarını anlatmak), iş (özgeçmişine bakmak, "bu akşam benden", etrafa sormak), para (500 ₺ borç vermek — gururlu reddedebilir —, birlikte hesap yapmak), yalnızlık (bir akşam çıkmak, "sana uğrarım", "ben de yalnızım"), hastalık ("hastaneye seninle gelirim", "lazım olursa ara"), kayıp ("anlat onu bana", sarılmak), kalp ("unut onu, bu akşam benimle çık", sonuna kadar dinlemek), iş yeri ("bırak o işi", "dayan"). Sonuç aranıza göre ağırlıklı çekiliyor (yakınlık, güven, ilgi, ilişki türü). Kişi söylediğini hatırlıyor; sonraki görüşmede "Ev arkadaşı bulabildi mi, sor" gibi takip soruları çıkıyor ve cevaplar yeniden açılıyor. Dert anlatınca bu teklifler 'teselli et / akıl ver' cevaplarının yanında. **Ev arkadaşı:** teklifi kabul ederse ertesi gün yanına taşınıyor; evdeyken "Defne'yle konuş" çıkıyor (hafta içi iş saatlerinde ve gece 01–07 arası evde değil). Kirayı bölüşmek, evin büyüklüğü Faz 4'te (barınma). 430 test.
- **Önceki:** 3.20 Romantizm ve cinsellik derinleşti (0.1.37, K74). Kullanıcı: "romantizm ve cinsellik seçeneklerini derinleştir, daha detaylı, güzel, çekici hale gelsin." (1) Birlikte gece artık beş aşama: yol → **kapı** (yavaş yavaş soy / duvara yasla, öp / ışığı açık bırak / önce bir kadeh, konuşalım) → **gece** (acele etme / kendini bırak / ne istediğini sor + yeni: ona ne istediğini söyle, ağzınla onu memnun et, kontrolü ona bırak, yeni bir şey dene — ikinci geceden sonra: anal, rol oyunu, ayna, yataktan düşüp gülmek) → **sonra** (sarıl, sus / ona bir sırrını anlat / onu nasıl gördüğünü söyle / bir daha / hemen uyu) → sabah. Sonuçlar arzuya, kaçıncı gece olduğuna ve kişinin tarzına göre değişiyor; sansürsüz, betimlemesiz (K64). Gizli ilişkide pansiyon, ters duran telefon. 'Pegging' yalnızca kadın kişi + erkek oyuncu iken çıkıyor (yeni koşul `baglam`). (2) Yeni hamleler (Flört et… altında, koşulları tutunca): **"Seni seviyorum" de** (flört/sevgili, yakınlık 15+, arzu 25+, 3 günde bir; karşılık verirse sevgili olursunuz, anı kalır), **gelecekten konuş** (sevgili), **ona sarıl**, **ona bir fantezini anlat** (bir geceden sonra; bazen 'bu gece' deyip kalkar). (3) Göz göze, dokunmak ve açık konuşmanın tepkileri her tarzda çoğaldı; senin açık sözlerin de. Yeni test: tests/gece.test.js (425 test).
- **Önceki:** 3.19 Geri bildirim 3 (0.1.36, K73). Kullanıcı (2026-10-22, 0.1.35 raporu): "Evden dışarı çık demeden de bir yerlere gidebiliyorum; bir yere gitmek için evden çıkmam gereksin, çıkınca direkt nereye gideceğimi seçeyim. Romantizm ve cinsellik seçeneklerini derinleştir. Bazılarının yanına oturup konuşma bile başlatamıyorum (Defne). Kıskançlık bildirimi geliyor da bunu niye belirtiyorsun, mesajı yaz sadece." (1) Evdeyken Şehir ekranından yolculuk ya da mekana giriş yok ('Evdesin; önce dışarı çık' + 'Önce dışarı çık' düğmesi). Dışarı çıkınca Şimdi'de semtindeki bütün yerler doğrudan seçenek ('Sendika Kahvesi'ne gir', kapalıysa saatleriyle), 'Başka bir semte git…' Şehir ekranını açar. (2) Defne: gerginlik eşiği (8) aşılınca kişi 'Şimdi olmaz' deyip konuşmayı kesiyordu; gerginlik ancak konuşunca azaldığı için kilitleniyordu. Artık yanına oturunca soğuk bir yüzleşme: sebebine göre açılış (kıskançlık, uzun süre aramamak, sınırını zorlamak), seçenekler özür dile / ne olduğunu sor, dinle / elini tut (sevgili-flört) / rahat bırak, kalk; tutarsa barışıyorsunuz (anı kalır), çok kötü giderse kalkıp gider. (3) Olay başlıkları ne olacağını söylemiyor: 'Kıskançlık', 'Kavga', 'Bitti', 'Kırgınlık', 'Öğrendi', 'Kötü haber' yerine mesajı atanın adı. Telefonda kıskançlığı konuştuysan yanına oturunca aynı hesabı yeniden sormuyor. Romantizm/cinsellik derinleşmesi ayrı adım: 3.20.
- **Önceki:** 3.18 Kendi denemem: otomatik oyuncu + ev ve yol metinleri (0.1.34). Kullanıcı "devam et bi süre" dedi; yeni geri bildirim yokken telefon boyutunda tarayıcıda rastgele oynayan bir bot yazdım (yüzlerce hamle): hata, eksi para, takılma, bozuk metin aradı — çıkmadı; ama ev hareketlerinin cümleleri (dinlen, çay, pencere, telefon, atıştır…) 3'er çeşit olduğu için sürekli tekrar ediyordu. Yapılanlar: ev hareketleri 3–4 → 10–16 çeşit; uyku (gece 3→10, gündüz 2→6, uykusuz 2→6, uyanış 3→10); yolculuk ve mekan metinleri (evden/mekandan çıkış, eve giriş, yürüyüş/otobüs/taksi, çay, yemek, içki, müzik, oyun…) 2–3 → 5–7. Saate bağlı cümleler artık yalnızca o saatte çıkıyor (gece pencereden güneşlenen kedi görmüyorsun). Yeni `js/core/cesit.js`: bir havuzdaki son kullanılan cümleler bir süre gelmiyor (hepsi kullanıldıysa en eskisi). Ayrıca: kasa artık hiçbir yoldan eksiye düşmüyor (para düşen etki cebindekiyle sınırlı); eksi kalmış eski kayıt açılınca 0'a çekiliyor. 421 test. **0.1.35:** şehirde gezen ikinci bot bir hata daha buldu: konuştuğun kişi bu arada gidince (saat geçti, mekan kapandı, buluşma süresi doldu) sohbet arka planda açık kalıyordu ve sonraki hamlen 'sen kalktın' sayılıyordu; artık '… kalkıp gitti' yazıyor ve sohbet kapanıyor.
- **Önceki:** 3.17 Geri bildirim 2 (0.1.33, K72). Kullanıcı (2026-10-21, hata raporu 0.1.32): "Kız yanına çağırıyor, gidiyorum ama başka hiçbir şey yapamıyorum; evdeymiş gibi seçenekler durmaya devam ediyor. Bir de para eksiye düştü; olmayan paramla fatura ödedim." Sebep 1: 'Hemen yanına git' gibi seçenekler yalnızca zaman harcatıp anlatıyordu; sen evde kalıyordun. Şimdi (etki `bulus`) onunla gerçekten bir mekandasın (onun semtinde açık bir park/kafe/çay ocağı/pastane) ve sohbet açık: derdini sorabilir, flört edebilir, kalkabilirsin. Uygulandı: kötü haber (dert), doğum günü ('aşağıda bir şey içelim'), sokakta karşılaşma ('bir çay içelim'). Akşam yemeği daveti ve taşınma yardımından sonra eve dönüyorsun; taşınma 'cumartesi' yerine 'bugün'. Sebep 2: bazı seçeneklerde ücret bedel yerine etki olarak yazılmıştı; oyun cebini kontrol etmiyordu (fatura, tamirci, eczane, şemsiye…). Dört seçenekte para iki kez kesiliyordu (borç verme, yarısını verme, davete hediye, doğum günü hediyesi). Hepsi bedele taşındı; motor da para düşen etkiyi bedel sayıyor ('Cebinde 450 ₺ yok'). Test: her olay sahnesinde parasız seçilebilecek bir seçenek var (tests/bulusma.test.js, 420 test). Not: eksiye düşmüş bir kayıt kendiliğinden düzelmez; para kazanınca toparlanır.
- **Önceki:** 3.16 Geri bildirim 1 (0.1.32, K71). Kullanıcı (2026-10-21): "gitar çalıyorum diyorum, 'ben anlamam' diyor; etkilensin ya da ilgisiz olsun fark etmez ama bir şey olsun; sadece ortak şey bulmak üzerinden gitmesi saçma. Numara isteyince vermiyorsa bir daha çıkmıyor; flört seçenekleri de eklememişsin; şaşırtıcı, sınırları zorlayan, tahmin edilemeyecek şeyler ekle. Şartlı yapma ama doğal olsun, herkese söyleme; yapay basit cümleleri de çıkar." Yapılanlar: (1) Farklı bir hobi/müzik söyleyince kişi artık düz geçmiyor: etkilenir (sana ilgisi varsa çok daha olası: 'Gitar mı? Bu biraz tehlikeli; bir gün bana çalacaksın'), merak eder (hobiye özel soru), takılır ('Her ortamda gitarı kapan sen misin?') ya da ilgilenmez ama canlı; her hobiye özel tepkiler. Etkilenirse çekim ve arzu artar, anı kalır. Flörte uygun olmayanda (yaş, yönelim) 'etkilendi' hiç yok. (2) Hiçbir flört hamlesi tek seferlik değil: iltifat/takılma oturumda iki kez, göz göze/dokunmak iki kez. Reddedilen numara yeniden istenebilir (ısrar): verir, telefonunu kapıp kendini arar, seninkini ister (belki yazar), kızar, kalkıp gider ya da **yanlış numara** verir (ertesi gün yazınca dönerciye/teyzeye çıkar; yüzüne vurunca çoğu zaman gerçeğini verir). Reddedilen buluşmada da ısrar edilebilir. (3) Yeni hamleler (sonuç hiçbir zaman kesin değil; ilgi yalnızca olasılığı değiştirir): öpmeye çalışmak (karşılık, yanak, 'burada olmaz', kahkaha, itme, tokat, öpüp 'gidelim'), kulağına açık saçık fısıldamak (hoşuna gider, daha açığıyla karşılık, 'kalk', 'ayıp', kahkaha), iddiaya girmek (kaybeden ne derse: öpücük, numara, masada şarkı, sır, hile, 'kaybeden bu gece benimle gelir'), dansa kaldırmak (yalnızca bar/meyhane/kulüp), telefonunu alıp numaranı kaydetmek, peçeteye numaranı yazıp gitmek (belki yazar, belki hiç), içini dökmek ('aklımdan çıkmıyorsun'). (4) Kişinin sürprizleri: arzusu yüksekken bazen kendisi telefonuna numarasını yazar, seni öper, 'yarın akşam boş musun? değilsen boşalt' der, 'evim on dakika' der (sen karar verirsin), masanın altında bacağını dayar. (5) Yapay/düz cümleler: 'Hanım bekler', 'çocuklar bekler', 'her kıza', 'Kordon'daki iskelede' ve benzerleri herkese uyan doğal cümlelerle değişti (koşul eklenmedi); 'Hı hı.', 'İlginç.', 'Peki.', 'Anladım.', 'İyi insandır.' gibi tek kelimelik tepkiler canlandı; herkese yakışmayan beden cümleleri (gözlük, sigara) değişti. Yeni test: tests/surpriz.test.js (417 test).
- **Önceki:** 3.15 Tekrara karşı (0.1.31): flört havuzları ≈ 2–3 katı (senin iltifatların 6 → 14, takılmaların 5 → 11; tepkiler her kuşakta; numara, buluşma teklifi, kişinin kendisinin flörte başlaması, 'sevgilin var mı' / 'buluşalım mı' soruları), selam (her kuşakta 3 → 6; soğuk 3 → 6), şaka (senin şakaların 12 → 22, gülme/gülümseme/kızma tepkileri), vedalar (sen kalkarken 3 → 7; kişinin vedası ve kalkma bahanesi her kuşakta 3 → 6). Söz hafızası güçlendi: bir havuzdaki bütün cümleler yakında duyulduysa artık rastgele değil, en uzun zamandır duyulmayanı geliyor (senin cümlelerin de havuz bitmeden asla tekrar etmiyor). Yeni test: tests/tekrar.test.js.
- **Önceki:** 3.14 Romantik ve cinsel hayat (0.1.30, K70): yakınlıktan ayrı bir arzu (karşılaştıkça alevlenir, görüşmeyince söner; sevgilide yavaş). Sohbette bütün flört tek bir "Flört et…" girişinin altında (menü kalabalıklaşmıyor, hiçbir hamle gizlenmiyor; açıp kapamak zaman almıyor): iltifat, takılma, numara, buluşma + göz göze gelmek, dokunmak (ilk dokunuş anı olur), açık konuşmak (isteğini söylemek), "buradan çıkalım" (kabul ederse aynı gece) ve ayrılmak. Her tepki kişinin flört tarzına göre (utangaç, açık sözlü, alaycı, romantik, temkinli, oyunbaz). Arzusu yüksekse kişi kendisi yaklaşır (dizini dizine yaslar, kulağına fısıldar). Birlikte gece: sana mı ona mı (gizli ilişkide pansiyon), gecenin tonu (acele etme / kendini bırak / ne istediğini sor), sabah (kahvaltı, "bir daha olacak mı?", sessizce kaçmak); sansürsüz ama betimlemesiz. Telefon: özlem mesajı, gece yarısı "gel" (gidersen gece başlar; gizlisi de var), kıskançlık mesajı, sevgiliyle kavga, senden ayrılması, eski sevgilinin dönüşü. Kıskançlık: başka biriyle flörtün, sevgilin o kişiyi tanıyorsa ya da oradaysa duyuluyor; yanına oturunca hesap soruyor (inkâr / özür / "sahibim değilsin" / "gözüm senden başkasını görmüyor"), fazla gerilirse ayrılıyor. Sevgilini uzun süre görmezsen geriliyor. Günlük iltifat sınırı 2 → 4. Sohbeti başka bir hamleyle bitirmek de "sen kalktın" sayılıyor.
- **Önceki:** 3.13 Sadakat, gizli ilişki, tekrar oturma (0.1.29, K69): evli/sevgilili biri artık kapıyı kapatmıyor. Ne kadar istekli olduğu kartından hesaplanıyor (ilişkisinin hali, değerleri, inancı, kişiliği, flört tarzı, sırrı, derdi; sana duyduğu çekim direnci aşındırıyor): sadık (gülümser, sınır çizer, ısrar edersen gerilir), kararsız (vicdan, karışık sinyal, buluşmadan sonra pişmanlık), açık ("burada olmaz, başka yerde"), ateşli (dizine dokunur, "kimse bilmeyecek"). Partneri olanla numara ve buluşma gizli: Ilıcaköy'de gizli buluşma (görülme ihtimali, Kordon'a gitme riski, öpüşme, bitirme). Görünür her karşılaşma riski artırıyor; risk birikince mahalle seni konuşuyor ve sonunda eşi öğreniyor: "Benimle ol, ondan ayrıl" (başarırsa gerçekten boşanıyor, sevgilin oluyor), "bitirelim" ya da "daha dikkatli oluruz" (bazen eşi kapına dayanıyor). Tekrar oturma: sohbeti bitirince 2 saat içinde dönersen ilgisine göre sevinir ya da sıkılır; ikinci kez ya da o kalktıysa meşgul; aynı gün ikinci görüşmede "yine sen!" selamı. "Kapı kapandı" cümleleri kaldırıldı; yönelim ve yaş cevapları sohbeti kesmiyor. Flört yaş sınırı gevşedi.
- **Önceki:** 3.9 eki (0.1.24): (1) **Gemini desteği** — Daha Fazla → Yapay zekâ sohbeti'nde 'Yapay zekâ: Claude / Gemini (ücretsiz)' seçimi; Gemini Flash / Flash-Lite / Pro; iki anahtar ayrı saklanır. Ücretsiz katman sınırı dolunca 'bir dakika bekle' denir, yazdığın söz kutuda kalır. (2) **Cinsellik sansürsüz** (K64): yetişkinler açık konuşabilir, terimlerden kaçınılmaz; sahne ayrıntılı betimlenmez; 18 yaş altı kesin yasak. (3) **Hayatı değişen kişinin eski bilgileri** (K62 düzeltmesi): medeni hal, iş, oturduğu semt söylendiği andaki haliyle saklanır; kişi boşanır/işten çıkar/taşınırsa eski bilgi 'eskiden doğruydu' olur, yenisi söylenebilir. Varsayılan Claude modeli Sonnet 5.5 oldu. 3.9 (0.1.23): bir kişiyle oturduğunda, yazılı seçeneklerin üstünde bir yazma kutusu ve üç öneri cevap çıkıyor; ne yazarsan karşındakinin cevabını Claude, o kişinin kartına (kimliği, ailesi, ilişkileri, hayat öyküsü, sırları, değerleri) ve seninle ilgili hafızasına sadık kalarak yazıyor. Model numara/buluşma/sır anlatma gibi sonuçları yalnızca önerebiliyor; oyun kendi kurallarıyla uyguluyor ve o an neye izin verildiğini modele önceden söylüyor (evli biri buluşmayı kabul edemez, kabul etmiş gibi de konuşmaz). Yeni bilgiler olgu kilidinden geçiyor. Ayarlar: Daha Fazla → Yapay zekâ sohbeti (aç/kapat, model, anahtar, bağlantı denemesi, bu ayki harcama). Anahtar yalnızca telefonda (kayda, kayıt koduna, hata raporuna girmez). Anahtar yoksa ya da internet yoksa eski yazılı sohbet aynen çalışıyor. Önceki: 3.8 Hafıza ve olgu kilidi (0.1.22): `js/core/hafiza.js`. Her kişinin seninle ilgili hafızası (söylediklerin, anlattığı dertler, flört denemeleri; son 30 satır) ve kendisi hakkında konuşmada ortaya çıkan olgular (son 40): yeni bir olgu önce kişi kartıyla denetlenir (medeni hal, yaş, çocuk/kardeş sayısı, anne/baba/eş adı, memleket, iş durumu) — çelişirse reddedilir; aynı konuda ilk söylenen kalır ve karta 'değişmez olgu' olarak girer. Kim kimin sırrını biliyor: çok yakın arkadaş ve gizli ilişki hep bilir; eski sevgili, arkadaş, komşu bazen; tanımayan asla. Dedikoduda bir sırrı artık yalnızca onu bilen anlatıyor. Önceki: 3.7 karakter derinliği (0.1.21).
- **Deneme kolaylığı (0.1.40):** Daha Fazla → "Deneme: para ekle" (+1.000 / +10.000 ₺). Faz 4'te (iş ve para) kaldırılacak.
- **Sıradaki adım:** 3.23 Oynarken gelen geri bildirimler, Faz 3 kapanışı — **küçük–orta**; ardından Faz 4 (iş, para, barınma: ev arkadaşıyla kira) — **büyük**. Not: tamamen serbest sohbet ancak yapay zekâyla (3.9 hazır, kapalı).
- ~~**Kullanıcıya soru (2026-10-21, 3.15'te fark edildi; değiştirmeden önce onay bekleniyor):** eski yazılmış birkaç cümle her kişiye uymuyor: veda 'Hanım bekler; ben gideyim' (kadına ya da bekâra da çıkabiliyor), 'Hadi bana müsaade; çocuklar bekler' (çocuğu olmayana da), iltifat tepkisi 'Bunu her kıza söylüyor musun?' (erkek de söyleyebiliyor), buluşma kabulü 'Kordon'daki iskelede' (asıl buluşma yeri başka olabiliyor). Önerim: bunları kişiye göre koşullu yapmak ya da nötr cümleyle değiştirmek.~~ → Cevap (2026-10-21): "Şartlı yapma ama doğal olsun, herkese söyleme; yapay basit cümleleri de çıkar." 3.16'da herkese uyan doğal cümlelerle değiştirildi.
- **Kullanıcıdan beklenen (3.16 testi, 0.1.32):**
  1. Uygulamayı kapatıp aç; Daha Fazla'da sürüm 0.1.32 mi?
  2. Biriyle otur, "Boş vaktinde ne yaptığını sor"; sonra kendi hobini söyle (ör. gitar). Kişiden kişiye farklı tepki geliyor mu?
  3. İlgisi düşük birinden numara iste; reddedince yine iste (ısrar). Ne oldu? Numarayı verdiyse ertesi gün bir mesaj gelebilir…
  4. Bir barda "Flört et…" → öpmeye çalış, kulağına fısılda, iddiaya gir, dansa kaldır, peçeteye numaranı bırak. Aynı hamle farklı kişilerde farklı bitiyor mu?
  5. Oynadıkça tuhaf, sıkıcı ya da tekrarlı gelen her şeyi yaz ya da Sorun bildir ile gönder.
- ~~**Kullanıcıdan beklenen (3.13–3.15 testi, 0.1.31):**~~ (0.1.32 testine katıldı)
  1. Uygulamayı kapatıp aç; Daha Fazla'da sürüm 0.1.31 mi?
  2. En temizi yeni oyun (Daha Fazla → Kayıtlar → boş yuva → Yeni oyun).
  3. Bir bara/kafeye gir, biriyle otur → "Flört et…" → iltifat, takılma, göz göze, dokunmak, açık konuşmak dene. Tepkiler kişiden kişiye değişiyor mu, tekrar ediyor mu?
  4. Numarasını al, buluşma ayarla; ertesi akşam buluşmaya git. İlgisi yüksekse "Buradan çıkalım" dene (birlikte gece ve sabah).
  5. Evli/sevgilili biriyle flört et: kimi sınır çizer, kimi "burada olmaz" der. Gizli buluşma ve yakalanma riski.
  6. Sevgilin varken başka biriyle flört et; sevgilin duyunca hesap soruyor mu? Birkaç gün görmezsen mesaj atıyor mu?
  7. Sohbeti bitirip hemen aynı kişinin yanına otur: "yine mi sen / meşgulüm" gibi tepki geliyor mu?
  8. Tuhaf, tekrarlı, tutarsız ya da sıkıcı gelen her şeyi Sorun bildir ile gönder.
- **Kullanıcı geri bildirimi (3.10–3.12 testi, 0.1.28, 2026-10-21):** "Kapı kapandı yazısı saçma, kapının kapanması daha saçma; eşi/sevgilisi olan isteksiz olabilir ama partneriyle arası kötü biri daha müsait, kendine hâkim olamayan olabilir, aldatmak gerçek ve bazen çekici. Çok tekrar. Biriyle konuştuktan sonra tekrar tekrar yanına oturulabiliyor. Flört, oynaşma gibi şeyleri kısıtlama. Duygusal şeyler oyunun ciddi bir kısmı olmalı; tekdüze değil, heyecanlı, coşkulu, arzulu." → plan: 3.13 (kapı, sadakat, gizli ilişki, tekrar oturma) ✅, 3.14 (arzu, aşamalar, birlikte gece, kıskançlık/kavga/barışma, kişinin seni araması), 3.15 (tekrara karşı havuzlar), 3.16 telefon testi.
- **Kullanıcıdan beklenen (3.10–3.12 testi, 0.1.28):**
  1. Uygulamayı kapatıp aç; Daha Fazla'da sürüm 0.1.28 mi?
  2. En temizi yeni oyun: Daha Fazla → Kayıtlar → boş bir yuvada Yeni oyun (eski kayıtta tanıdıkların derdi/sırrı değişmiş olabilir; kayıt bozulmaz).
  3. Şehir → bir kafeye/kahveye gir → biriyle tanış → yeni konular: "Ne dinlediğini sor", "Futbol aç", "Boş vaktinde ne yaptığını sor", "Günlerinin nasıl geçtiğini sor"; yakınlaştıkça "Ailesini sor", "Geçmişini sor", "Hayat üzerine konuş".
  4. Kişi sana da müziğini, takımını soracak; ilk söylediğin kaydolur (Hayatım → Karakter → Zevklerin).
  5. Hayatım → Tanıdıklarım → kişiye dokun: öğrendiklerin (müziği, takımı, hobisi…) orada.
  6. Birkaç gün oyna, sokakta gez, evde dinlen: yeni olaylar çıkıyor mu? Tanıdıkların seni arıyor mu?
  7. Biriyle numaralaşıp buluşma ayarla: buluşma yeri kişiye göre değişiyor mu?
  8. Tuhaf, tekrarlı, tutarsız ya da sıkıcı gelen her şeyi Sorun bildir ile gönder. Kullanıcı (2026-10-21): "devam, telefonda denemeye kadar devam" → 3.10, 3.11, 3.12 arka arkaya (her biri ayrı commit), 3.13'te durup telefon testi istenecek.
- **Çeşitlendirme ölçümü (2026-10-21, 0.1.25):** oyundaki rastgele olay sayısı ≈ 12 (ev 5, geçmiş 5, açılış 1, buluşma 1); NPC hayat olayı türü 12; dedikodu kalıbı 29; sır 16, dert 22, hayal 17 (yüzlerce NPC aynı sırları paylaşıyor); buluşma tek tip; sohbet satırları ≈ 660. 3.7'de üretilen derinlik (müzik, takım, hobi, korku, aile adları, hayat öyküsü, rutin, değerler) yazılı sohbette **hiç kullanılmıyor** — en büyük kaldıraç bu.
- **Kullanıcının soruları (2026-10-21):** Claude Pro aboneliği API'yi kapsamaz (ayrı ücretli). Ücretsiz yol olarak Gemini ücretsiz katmanı seçildi; kullanıcı aistudio.google.com'da anahtar oluşturdu. Önerim yine Claude Sonnet 5.5 (5 $ ≈ 450–700 mesaj); Gemini önce denenecek.
- **~~Kullanıcıdan beklenen (3.9 testi, 0.1.24)~~** (yapay zekâ kapatıldı; geçerli değil):
  1. aistudio.google.com → API Keys → anahtarın yanındaki kopyala düğmesi.
  2. Oyunda: Daha Fazla → Yapay zekâ sohbeti → Yapay zekâ: "Gemini (ücretsiz)" → Model: Flash → anahtarı yapıştır → Anahtarı kaydet → Bağlantıyı dene ("Bağlantı tamam" yazmalı).
  3. ~~Model: önce Sonnet 5.5 dene~~ → önce Gemini Flash; cevaplar sade gelirse Pro'yu dene (ücretsiz katmanda kapalı olabilir); "sınır doldu" çok sık gelirse Flash-Lite. Claude için: platform.claude.com → Billing → kredi → API Keys → Create Key, sonra Yapay zekâ: Claude.
  4. Şehir → bir kafeye/bara gir → biriyle tanış → altta yazma kutusu çıkar: istediğini yaz, Gönder. Ya da öneri cevaplardan birine dokun.
  5. Uzun konuş: hayatını, ailesini, işini sor; flört et; numara iste; buluşma teklif et; sırrını sormaya çalış. Söyledikleri kendi içinde ve Hayatım → Tanıdıklarım'daki bilgileriyle tutarlı mı?
  6. Ertesi gün aynı kişiyle yine konuş: önceki konuşmayı hatırlıyor mu?
  7. Daha Fazla'da "Bu ay" harcamasına bak. Tuhaf/tutarsız bir şey olursa Sorun bildir.
- **Kullanıcının soruları (2026-10-21) ve cevaplar:** maliyet hem token hem para (token = modelin okuduğu/yazdığı metin birimi; ücret token başına; ayrıca dakikalık hız sınırları ve konsolda kendi koyacağın aylık harcama tavanı var). Claude API anahtarı olur (platform.claude.com, Claude.ai aboneliğinden ayrı, önceden kredi yüklenir). Model seçimi 3.9'da Ayarlar'dan yapılacak; fiyatlar ve tahminler aşağıdaki 'Claude ile sohbet: maliyet' notunda.
- **Claude ile sohbet: maliyet (kaba tahmin, 2026-10 fiyatları, 1M token başına girdi/çıktı):** Opus 5.5 4 $ / 20 $; Sonnet 5.5 2 $ / 10 $; Haiku 5.5 0,10 $ / 0,50 $. Bir mesaj ≈ 4.000 token girdi (kişi kartı + hafıza + son konuşma) + ≈ 300 token çıktı. Mesaj başına ≈ Opus 0,02 $, Sonnet 0,01 $, Haiku 0,0005 $ (önbellekle daha az). Günde 100 mesajla ayda ≈ Opus 30–60 $, Sonnet 15–30 $, Haiku 1–2 $. ~~Gerçek rakam 3.9'da ölçülüp yazılacak.~~ Gerçek anahtarla ölçüm bu ortamda yapılamadı (sahte sunucuyla denendi); gerçek rakamı oyundaki 'Bu ay' göstergesi (cevaplardaki token sayılarından) gösterir. Kişi kartı önbelleğe alınır (aynı oturumda ikinci mesajdan itibaren kartın girdi ücreti ≈ onda bir).
- **Kullanıcıdan beklenen (Faz 3 testi, 0.1.20):**
  1. Daha Fazla'da sürüm 0.1.20 mi?
  2. Kayıtlar → Yeni oyun → "Yeni bir hayat" ekranında seç → "Bu hayatı yaşa" → ilk sabahı oyna.
  3. Dışarı çık → Şehir → kalabalık bir kafeye/bara gir (Çamlık, Kordon, Kızıl Bar, Merkez Kantin gençlerle dolu; Bezhane ve kahvehaneler yaşlılarla).
  4. Biriyle tanış: sana soru soruyor mu? Cevabını seçebiliyor musun? Yaşına göre mi konuşuyor?
  5. Yaşıtınla: "İltifat et", "Tatlı tatlı takıl", "Numarasını iste", "Bir akşam buluşmayı teklif et". Kabul ederse ertesi akşam buluşma gelir.
  6. "Ağzını ara" ve "Etrafa kulak ver": insanlar hakkında dedikodu geliyor mu? Hayatım → Duyduklarım.
  7. Birkaç hafta oyna (uyu, gez): tanıdıklarının hayatında bir şey değişiyor mu? Yanına oturunca anlatıyor mu?
  8. Tuhaf, tekrarlı ya da inandırıcı olmayan her şeyi Sorun bildir ile gönder.
- **Kullanıcı geri bildirimi (3.4 testi, 0.1.18, 2026-10-21):** "dedikodular çok sıkıcı; herkes çok yaşlı; 23 yaşındaki kız bile 70 yaşındaymış gibi konuşuyor; flört edilmiyor; güzel konuşmalar geçmiyor; tekrar çok fazla, içerikler ilgi çekmiyor." Teşhis: sohbet cümleleri yaşa göre seçilmiyordu (genç kız 'O yaşları geçtik', 'be' ağzı herkeste), oyuncunun sözü yoktu, kişi soru sormuyordu, hikâye sohbete girmiyordu, flört hiç yoktu, dedikodular yalnızca mekanların sabit emlak/ekonomi haberleriydi, semtin derdi her seferinde aynı cümleyle geliyordu, mekan müdavimlerinin yalnızca %20'si 30 yaş altıydı.
- **Kullanıcıdan beklenen (3.4 testi):** uygulamayı güncelle (Daha Fazla'da sürüm 0.1.18) → Kayıtlar → boş bir yuvada (ya da mevcut yuvada) "Yeni oyun" → Yeni bir hayat ekranında seç → önizlemede "Başka biri" ile birkaç kişiye bak → "Bu hayatı yaşa" → ilk sabahın seçeneklerini oyna → Hayatım → Karakter ve Tanıdıklarım'a bak → birkaç gün oyna (geçmişten biri geri dönüyor mu?). Tuhaf/tekrarlı/inandırıcı olmayan bir şey olursa Sorun bildir.
- **Çalışma notu:** kullanıcı Faz 2'de "deneyeceğim bir şey gelene kadar devam et" demişti; Faz 3'te de ilk denenebilir adım (3.4 açılış sahneleri) gelene kadar adımlar arka arkaya, her biri ayrı commit.
- **Kullanıcı isteği (2026-10-20):** "Benim deneyeceğim bir şey gelene kadar devam et." → 2.6, 2.7, 2.8 arka arkaya; 2.8'de (Şehir sekmesi, gezinme, mekanlar) durup telefonda denemesi istenecek.
- **Faz 1 telefon testi (2026-10-20):** Yayın açıldı (https://khalinta.github.io/re/). iPhone, iOS 26 Safari, ana ekrandan: tam ekran ✓, IndexedDB ✓, kalıcı depolama izni verildi ✓, hata yok ✓, olay ve kayıt çalışıyor ✓. Tek sorun alttaki koyu şeritti. ~~0.1.2 yükseklik düzeltmesi~~, ~~0.1.3 kök arka plan~~, ~~0.1.4 gövde 100vh~~ (sekme yazılarını kesti) tutmadı. Kesin sebep (0.1.3 ölçümü): iOS 26 sayfayı 873 pt'de bitiriyor, altını kendisi uygulama rengiyle (#1b1916) boyuyor; CSS ile değiştirilemiyor. **0.1.5 çözümü (kullanıcının isteği):** sekme çubuğu ve kök arka plan şerit rengine (--arka) alındı, şerit varken ek alt boşluk kaldırıldı, palet tazelendi (seçili sekmede yumuşak vurgu zemini). 0.1.5 ekran görüntüsüyle doğrulandı (şerit sekme çubuğuyla aynı renkte, yazılar tam): **Faz 1 kapandı.**
- **Faz 2 telefon testi, 1. rapor (0.1.12, 2026-10-20):** hata yok; eski kayıt v3'e sorunsuz taşındı (Bezhane'de evde); gezinme, mekanlar, kulak verme, yolculuk çalışıyor. Bulunan sorun: bir mekanın dedikoduları bitince "Etrafa kulak ver" boşa saatler harcatıyordu (16 deneme, 8 saat). 0.1.13'te düzeltildi (aşağıda).
- **Kullanıcıdan beklenen:** uygulamayı güncelleyip (0.1.13) denemeye devam etmesi:
  1. Daha Fazla'da sürüm 0.1.13 mü?
  2. Şimdi: "Dışarı çık" → Şehir sekmesi: semt, mekanlar (açık/kapalı, kalabalık), "Semt hakkında".
  3. Bir mekana gir; çay/yemek gibi bir şey yap (para düşüyor mu?); "Etrafa kulak ver" birkaç kez → Hayatım → Duyduklarım.
  4. Şehir → başka bir semte toplu taşıma / yürüyüş / taksi ile git; süre ve ücret mantıklı mı?
  5. "Eve git", evde uyu. Ertesi gün Şehir → "Şehirde bugün"de haber var mı?
  6. Bir şey bozuksa ya da tuhafsa: Daha Fazla → Sorun bildir → raporu yapıştır.
  Eski oyun güncellemeden sonra Bezhane'deki evinde devam eder (eski kayıtlarda ev yoktu).

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
| 2.6 | Takvim (Ramazan/Kurban Bayramı tarihleri, okul takvimi), hava durumu modeli, kendi ilerleyen dünya (dükkan açılıp kapanması, fiyatlar, şehir olayları) | orta | ✅ |
| 2.7 | Ekonomi dosyası (asgari ücrete oranlı her şey), PROJE.md ekonomi tablosunun kesinleşmesi | orta | ✅ |
| 2.8 | Konum sistemi (~~kayıt şeması v2~~ → v3, çünkü v2 2.6'da dünya için kullanıldı + migration), Şehir sekmesi arayüzü, semtler arası gezinme | büyük | ✅ |

### Faz 3 adım listesi

| Adım | İçerik | Boyut | Durum |
|---|---|---|---|
| 3.1 | NPC üretim motoru: isim havuzları (kuşağa göre), memleket ve ağız, kişilik, konuşma tarzı, aile, eğitim, iş geçmişi, dert, hayal, sır, alışkanlık, gizli özellikler; seed'den belirlenimli, tutarlılık kuralları; NPC kaydı (tembel üretim, katmanlar) | büyük | ✅ |
| 3.2 | NPC'ler dünyada: figürler ve mekan sahipleri sabit NPC; mekanlarda kimler var (semtin sakinlerinden), tanışma ve ilk sohbet, ilişki değerleri, NPC'ler arası tanışıklık ağı, anılar | büyük | ✅ |
| 3.2b | Kullanıcı testi sonrası: dış görünüş, ilk izlenim, günün hali; konu seçmeli, birinci ağızdan, tekrarsız sohbet | büyük | ✅ |
| 3.3 | Başlangıç hikayesi motoru: başlangıç tipleri (dipten / zirveden çöküş / rastgele), bileşenler (yaş, memleket, aile, eğitim, meslek/hayal, çöküş zinciri, hata/talih oranı, borçlar, sırlar, anılar, güçlü yanlar, kusurlar, eski bağlantılar, elde kalanlar), nadir uç hikayeler, tutarlılık ve dünya kitabı kancaları | büyük | ✅ |
| 3.4 | Açılış: yeni oyun ekranı (başlangıç tipi), 3–5 sahnelik interaktif giriş, iç ses ve tuhaflıklar, açık iplikler (geri dönen kişiler/olaylar) — **telefonda denenecek** | büyük | ✅ |
| ~~3.5~~ | ~~NPC'lerin kendi hayatı (iş, taşınma, evlilik, dert), geliştirici panelinde NPC bölümü, Faz 3 kapanışı~~ → 3.6'ya kaydı: kullanıcının 3.4 testi (2026-10-21) sohbetin yeniden yazılmasını gerektirdi | orta | — |
| 3.5 | Kullanıcı testi sonrası sohbet ve flört baştan: yaşa (kuşağa) göre konuşma, hitap ve ağız; karşılıklı diyalog (kişi sana soru sorar, senin cevabın seçenek olur, hikâyeni sorar ve hatırlar); flört (iltifat, takılma, numara, buluşma; ret de var); insanlar üzerine dedikodu (sırlar, dertler, kim kiminle; doğru ya da yanlış); tekrarın kesilmesi; genç nüfusun artması — **telefonda denenecek** | büyük | ✅ |
| 3.6 | NPC'lerin kendi hayatı (iş, taşınma, evlilik, dert), geliştirici panelinde NPC bölümü, Faz 3 kapanışı | orta | ✅ |
| 3.7 | **Karakter derinliği** (kullanıcı isteği, 2026-10-21: "her karakterin kendi kişiliği, davranış tarzı, hikâyesi, hayatı; aşırı tutarlı; ayrı parametreler, ilişki ağaçları"): isimli ve yaşlı aile ağacı (eş, çocuklar, anne-baba, kardeşler), insanlar arası ilişki ağı (arkadaş, küs, eski sevgili, gizli ilişki, iş, komşu, borç; iki yönlü his ve geçmiş), yıl yıl hayat öyküsü, değerler, inanç, beğeniler, korkular, hassas konular, mizah ve flört tarzı, para ve sağlık durumu, günlük rutin; hepsi seed'den, tutarlılık testleriyle; `kisiKarti` | büyük | ✅ |
| 3.8 | **Hafıza ve olgu kilidi:** her kişiyle konuşmaların özeti; konuşmada ortaya çıkan yeni olgular (kişinin kendisi ya da başkaları hakkında) kayda geçer ve bir daha değişmez; kim kimin hangi sırrını biliyor; çelişki denetimi | büyük | ✅ |
| 3.9 | **Claude ile serbest sohbet:** Ayarlar'da API anahtarı ve model seçimi; sohbette yazma kutusu + öneri cevaplar; kişi kartı + hafıza + kurallar modele verilir; model konuşmayı yazar ve sabit bir sonuç listesinden (yakınlık, çekim, numara, buluşma, sır anlatma, kırılma...) önerir, oyun kendi kurallarıyla uygular; internet ya da anahtar yoksa yazılı sohbete düşer; harcama göstergesi — **telefonda denenecek** | büyük | ✅ 0.1.23 |
| ~~3.10~~ | ~~Telefon testi sonrası ince ayar, Faz 3 kapanışı~~ → kullanıcı yapay zekâyı kapattırdı, çeşitlendirme istedi (2026-10-21); aşağıdaki adımlara bölündü | orta | — |
| 3.9k | Yapay zekâ sohbeti kapatıldı (K65); kod duruyor | küçük | ✅ 0.1.25 |
| 3.10 ✅ | **Çeşitlendirme A — kişi kartı sohbete:** yazılı sohbette kişinin derinliği konuşulur: yeni konular (müzik, takım/futbol, hobi, ailesi — isimleriyle, geçmişi/hayat öyküsü, korkusu, rutini, değerleri/inancı, para, sağlık), her biri kuşağa ve kişiliğe göre birinci ağızdan; kişi sana da bunları sorar; ortak noktalar (aynı takım, aynı müzik) yakınlaştırır, zıtlıklar (takım, gündem) gerer | büyük | ✅ 0.1.26 |
| 3.11 ✅ | **Çeşitlendirme B — insanların içeriği:** sır/dert/hayal havuzları ≈ üç katı (aynı sır az kişide), NPC hayat olayları 12 → ≈ 40, dedikodu kalıpları 29 → ≈ 70, buluşma birkaç türde (yemek, sahil, bar, sinema…) ve sonuçlu | büyük | ✅ 0.1.27 |
| 3.12 ✅ | **Çeşitlendirme C — gündelik olaylar:** Faz 5'ten öne çekilen ilk paket: ≈ 30–40 gündelik olay (sokak, komşu, apartman, telefon, hava, para, sağlık, rastlantılar, tanıdıkların seni araması), seçimli ve sonuçlu | büyük | ✅ 0.1.28 |
| ~~3.13~~ | ~~Telefon testi, ince ayar, Faz 3 kapanışı~~ → kullanıcı testi (2026-10-21) flörtün yeniden kurulmasını istedi; aşağıdaki adımlara bölündü | orta | — |
| 3.13 | **Sadakat ve gizli ilişki:** evli/sevgilili kapıyı kapatmaz, isteklilik karttan (sadık/kararsız/açık/ateşli); gizli numara ve buluşma, risk, dedikodu, eşin öğrenmesi, onun için ayrılmak; tekrar yanına oturma kuralı | büyük | ✅ 0.1.29 |
| 3.14 ✅ | **Romantik ve cinsel hayat:** yakınlıktan ayrı arzu (söner, alevlenir); aşamalar (ilgi, gerilim, ilk temas, öpüşme, birlikte gece, ilişki, kıskançlık, kavga, barışma, ayrılık); yeni hamleler (göz göze, dokunmak, açık sözlü olmak, "buradan çıkalım"); gece ve ertesi sabah (sansürsüz ama betimlemesiz, K64); kişi seni arar, özler, kıskanır; flört tarzına göre | büyük | ✅ 0.1.30 |
| 3.15 ✅ | **Tekrara karşı:** flört, selam, şaka, veda havuzları ~~3–4 katı~~ 2–3 katı (nitelik için; kalanı telefon testinden sonra en çok tekrar eden yerlere); en eski duyulan söz önce | orta | ✅ 0.1.31 |
| 3.16 ✅ | ~~Telefon testi, ince ayar, Faz 3 kapanışı~~ → **Geri bildirim 1** (kullanıcı oynayıp yazdı): farklı zevke canlı tepki, numara/buluşma ısrarı, yanlış numara, tahmin edilemeyen hamleler (öp, fısılda, iddia, dans, telefon, peçete, içini dök), kişinin sürprizleri, yapay cümlelerin temizliği | büyük | ✅ 0.1.32 |
| 3.17 ✅ | **Geri bildirim 2:** çağırana gidince gerçek buluşma (etki `bulus`, sohbet açık); olmayan parayla ödeme yok, çift kesilen para düzeldi | orta | ✅ 0.1.33 |
| 3.18 ✅ | **Kendi denemem:** otomatik oyuncu (bot) ile hata/eksi para/takılma taraması; ev, uyku, yol ve mekan metinleri 3–4 katı; saate bağlı cümleler; tekrarsız seçim (`cesit.js`); kasa eksiye düşmez | orta | ✅ 0.1.34 |
| 3.19 ✅ | **Geri bildirim 3:** önce evden çık, çıkınca gideceğin yeri seç; gerginken yüzleşme (kilit yok); olay başlıkları ne olacağını söylemez | orta | ✅ 0.1.36 |
| 3.20 ✅ | **Romantizm ve cinsellik derinleşti:** gece beş aşama (kapı, gece, sonra), yeni gece seçenekleri, "Seni seviyorum", gelecek, sarılmak, fantezi; tarz tepkileri çoğaldı | büyük | ✅ 0.1.37 |
| 3.21 ✅ | **Konuşma kancaları:** söylenene özel cevaplar (ev arkadaşı, ev, iş, para, yalnızlık, hastalık, kayıp, kalp, iş yeri), takip soruları, ev arkadaşı olarak taşınma | büyük | ✅ 0.1.38 |
| 3.22 ✅ | **O anın durumuna göre sohbet:** söylenen her şeye (hal, dedikodu, hayal, gündem, iş, memleket) cevap; ortam (içki, çay, yağmur, gece, özür, az önce olan, biraz daha kal); kişiye özel metinler | büyük | ✅ 0.1.39 |
| 3.23 | Oynarken gelen geri bildirimler, Faz 3 kapanışı | küçük–orta | ⬜ |

### Fazlar

| Faz | İçerik | Durum |
|---|---|---|
| 1 | Altyapı (+ suç dünyası için koşul/etki türleri: 1.8–1.9) | ✅ kapandı (2026-10-20) |
| 2 | Dünya kitabı + ekonomi dosyası (+ örgütler, bölgeler, emniyet/adliye/cezaevi kurumları, suç ekonomisi) | ✅ kapandı (2026-10-20) |
| 3 | Başlangıç hikayesi motoru, açılış sahneleri, NPC üretimi (+ örgüt hiyerarşisi/lider NPC'leri, suçla bağlantılı geçmiş bileşenleri) | ⏳ ~~adımlar bitti (0.1.20), telefon testi bekleniyor~~ → kullanıcı testi (2026-10-21): serbest, uzatılabilir sohbet ve derin, tutarlı karakterler istendi; 3.7–3.10 eklendi |
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
| K10 | **Service worker "önce önbellek, sonra ağ" + sürümlü önbellek adı.** Yeni sürümde eski önbellek silinir, kullanıcıya "güncelleme hazır" denir. | ~~Tam çevrimdışı çalışma~~ → Oyun çevrimdışı çalışmaya devam eder; ama 3.9'dan itibaren serbest sohbet internet ister (kullanıcı 2026-10-21: "internetli olabilir"). İnternet ya da anahtar yoksa sohbet yazılı sisteme düşer. Güncellemeler kontrollü. |
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
| K50 | **Konum = { semt, mekan }; mekan 'ev' / mekan kimliği / null (sokakta).** Ev aksiyonları `yer: "ev"` ile yalnızca evde listelenir ve `kosul: { mekan: "ev" }` taşır; mekanda o mekanın hizmetleri aksiyon olur (fiyat = ekonomi × mekanın fiyat seviyesi). Olaylarda `yer: "ev" / "sokak"` (ev.json'daki 5 olaya `yer: "ev"` eklendi: evde değilken çıkmasınlar; zamanlayıcıdaki olay oyuncu eve dönene kadar bekler). Şehir ekranından yapılan hamleler Şimdi'de anlatılır. | Şehri gezilebilir kılmanın en sade yolu; sokak düzeyi ayrıntı yok (K48). Ev olaylarının sokakta çıkması saçma olurdu. |
| K51 | **Konu seçmeli sohbet (3.2b).** Tanışınca ya da "yanına otur" deyince bir oturum açılır (`durum.sohbet`); oyuncu konu seçer (hal hatır, işi, memleketi, mahalle, şehrin gündemi, kendinden bahset, derdi, hayali, dedikodu, tanıdıkları, şaka, kalk). Kişi **kendi ağzından** cevap verir: cümleler üsluba göre (kibar, sade, sert, argo, esnaf, kitabi), yöresel ağız cümle sonunda tek tük bir sözcükle (", gari", ", da"), kişiye özgü sabit bir hitapla ("uşağum", "hocam", "kanka"). Dertler ve hayaller birinci ağızdan (`soz`). Kişi başına son 60, genelde son 100 cümle hatırlanır, tekrar edilmez. Sabır = 2 + dışadönüklük + yakınlık/15 (en çok 9); bitince kişi kalkar. Şaka kişiliğe göre güldürür ya da kırar (gerginlik); ~~gerginlik 8'i aşınca kişi yanına oturtmaz~~ → 3.19: oturtur ama soğuk bir yüzleşme başlar (özür / dinle / elini tut / kalk); sebep: kullanıcı "bazılarının yanına oturup konuşma bile başlatamıyorum" — gerginlik konuşarak azaldığı için kilitleniyordu. Başka bir hamle oturumu bitirir. | Kullanıcı testi: özet tarzı anlatım yapay ve tekrarlıydı; konuşma oyuncunun seçimiyle ve kişinin sesiyle olmalı. |
| K52 | **Dış görünüş (3.2b, kullanıcı isteği).** Boy, yapı, saç (yaşa göre kırlaşma), başörtüsü, göz, ten, yüz, sakal/bıyık, gözlük, ayırt edici işaret, ses, giyim (sakin türüne göre), bakım (kişiliğe göre), duruş; çekicilik ve karizma 1–10 (ortalamaya yakın, çok çarpıcılar nadir); ilk izlenim (her zaman doğru değil); günün hali (gün gün değişir). Ayrı bir rastgele akıştan üretilir: görünüş eklemek kişinin geri kalanını değiştirmez. Tanışmadan önce kısa tarif, tanışınca uzun tarif; aynı yerde benzer tarifli iki kişi varsa ikinci bir ayrıntı eklenir. | İnsanların gözle görülen bir hali olsun; ilk izlenim oyunun bir parçası. |
| K53 | **Başlangıç hikayesi = arketip iskeleti + seed (3.3).** 19 arketip (16 olağan, 3 nadir: ülkenin konuştuğu, piyango, tanık); tip zirveden/dipten. Zincir adımlarının yılı `yilOnce`, `yas` ya da sabit `yil` (dünya olayı); `yasMin` ve kancalar (`olaydaYas`) yaşı tutarlı kılar; yıllar artan ve ≤ 2026. Hata/talih oranı metin çeşidini seçer. Karakterin kendisi NPC motoruyla (kimlik `oyuncu`) üretilir; yurt dışı kökeni yok, eğitim kuşağına uyar. Geçmişten kişiler `k:<rol>` kimlikli gerçek NPC (aile: aynı soyad/memleket) ya da dünya kitabının figürü; Tanıdıklarım'a 'geçmişinden' diye girer. Çocuk yalnızca hikâyede bir çocuk varsa olur; metinde kardeş geçiyorsa kardeşin vardır. Borç/para AÜ oranından ₺. Sonuç kayda bir kez yazılır (`durum.karakter`, `durum.hikaye`): veri sonradan değişse de hikâyen değişmez. Konut tiplerine `pansiyon` eklendi (tahliye ve kumar hikâyeleri için). Sakatlanan sporcu hikâyesi yalnızca erkek karakterlere (Demirspor erkek takımı). | İki karakter aynı hikâyeyi yaşamasın ama hikâye kendi içinde ve şehrin tarihiyle tutarlı olsun. |
| K54 | **Açılış ve iplikler olay motoruyla (3.4).** İlk sabah `tetik: "acilis"` olan tek bir çok sahneli olaydır; yeni oyunda bir kez başlar, rastgele çıkmaz. Hikâyeye göre değişmesi için yeni `hikaye` koşulu (tip, arketip, etiket, var/yok: yakin, gergin, disarida, alacakli, borcVar, sir...) ve `{hk.*}` şablon değişkenleri; olaylarda `npc: "hk:yakin"` hikâyenin o kişisidir (motor gerçek kimliğe çevirir). Hikâye rolleri üretimde bir kez belirlenir: yakın = şehirdeki en yakın (gerginliği düşük), gergin = şehirdeki en gergin, dışarıdaki = şehir dışında seni merak eden (dolandıran ortak değil), alacaklı = bir NPC'ye olan en büyük borç. Yeni oyun ekranı aynı seed'le önizleme gösterir: önizlenen kişi tam olarak oynanacak kişidir. İlk sabahın sonunda seçilen 'niyet' kalıcı bayrak olarak durur (Faz 4'te hedeflere bağlanacak). | Açılış tek bir sabit metin değil, oyuncunun seçimleriyle ve kendi hikâyesiyle akan sahneler olsun; geçmişteki insanlar ilk haftalarda geri dönsün. |
| K55 | **Sohbet kuşağa göre (3.5).** ~~K51: cümleler üsluba göre (kibar, sade, sert, argo, esnaf, kitabi), ağız herkeste tek tük, hitap ağza göre~~ → Kullanıcı testi: "23 yaşındaki kız 70 yaşındaymış gibi konuşuyor". Her havuz kuşağa ayrılır: genc (≤ 29), orta (≤ 54), yasli; üslup kuşağın içinde ince ayar (genc_argo, yasli_esnaf...). Ağız sözcüğü (', be', ', da'): yerli gençte hiç, göçmüş gençte %8, ortada %18, yaşlıda %30. Hitap konuşanla oyuncu arasındaki yaş farkına ve iki tarafın cinsiyetine göre: ≥25 yaş büyük → evladım/kızım; ≥10 büyük → delikanlı/kızım; ≥10 küçük → abi/abla; akran → kuşağın dili (gençler 'kanka' ya da adınla). Kişi başına sabit. Semtin derdi artık her seferinde uzun açıklamasıyla değil adıyla geçer; mahalle konusu kişi başına günde bir. Tekrar hafızası kişi başına 80, genelde 220 cümle. | Yaşı tutmayan konuşma inandırıcılığı bozuyordu; aynı cümlenin herkesin ağzından çıkması tekrar hissini büyütüyordu. |
| K56 | **Karşılıklı sohbet (3.5).** Kişi bir konudan sonra (meraklı ve dışadönüksa daha sık) sana soru sorar: nerelisin, ne iş yapıyorsun, nereden çıktın (hikâyen), nerede oturuyorsun, çay ikramı, fikrin, geçmişini sorduktan sonra 'toparlanabildin mi', iş aracılığı. Sen cevabı seçersin (dürüst / kaçamak / şaka / yalan); senin sözün "Sen" diye yazılır; kişinin tepkisi kişiliğine göre (dürüstlüğe uyumlu ve yardımsever iyi, kuşkucu soğuk karşılar). Kişi öğrendiğini hatırlar (bilinen.oyuncu_*), aynı soruyu tekrar sormaz. "Kendinden bahset" ve birinin derdini dinlemek de seçim açar. Başlangıç hikâyesinin birinci ağızdan özeti (arketiplerde `ozet`) 'geçmişini anlat' deyince söylenir. | Kullanıcı: "güzel konuşmalar geçmiyor". Oyuncunun sözü yoktu, kişi soru sormuyordu, hikâye sohbete girmiyordu. |
| K57 | **Flört (3.5, kullanıcı isteği).** Seçenekler ikiniz de 18+ ve yaş farkı ~~≤ 4 + küçük yaşın %30'u~~ → ≤ 6 + küçük yaşın %50'si (3.13, kullanıcı: "flörtü kısıtlama"; yaş farkı zaten ilgiyi düşürüyor) ise çıkar. İlgi = seed'den uyum (−14…+20) + (çekiciliğin−5)×5 + (karizman−5)×4 + yakınlık×0,4 + dışadönüklük + biriken çekim×0,8 − yaş farkı×1,5 + ruh hâlin. Eşikler: iltifat iyi 22 / orta 6; numara 32; buluşma 45; kişinin kendisi flörte başlaması 40. Yönelim seed'den (karşı cins %90, aynı %5, ikisi %5); ~~sevgilisi/eşi varsa ya da~~ yönelimi uymuyorsa kibarca söyler, flört seçenekleri o kişide kapanır. **3.13:** ~~eşi/sevgilisi olan kapıyı kapatır~~ → kapı yok; ne kadar istekli olduğu kişinin kartından (K69). Sebep: kullanıcı (2026-10-21): "kapının kapanması saçma; partneriyle arası kötü biri çok daha müsait olabilir, kendine hâkim olamayan olabilir, aldatmak gerçek ve bazen çekici." Günde en çok 2 iltifat/takılma. Buluşma kabul edilirse ertesi akşam 20.00'de 'randevu' olayı (iskele, 300 ₺ sabit — ekonomiye bağlanması Faz 4); el ele → flört, öpüşme → sevgili (çekime göre şans). Gitmezsen kırılır. ~~Tanışma sırasında çekicilik etkisi 0~~ → ilgi ×0,004 tanışma kabulüne eklenir. | Flört hiç yoktu; çekicilik ve çekim değerleri kullanılmıyordu. |
| K58 | **İnsanlar üzerine dedikodu (3.5).** Kişiler tanıdıkları hakkında konuşur: o kişinin gerçek sırrı, derdi, boşanması, gizli özelliği (borçlu, ihbarcı, hırslı, güvenilmez) ya da seed'den belirlenimli gizli bir ilişki (kim kiminle; evliyse 'aldatma') — bunlar doğrudur; %22 uydurmadır. Tanıdığın ya da o an mekanda olan insanlar öncelikli; tanımadığın biri oradaysa görünüşüyle anılır ('Şu köşedeki...'). Kimse kendisi ve kendi örgütünün insanları hakkında konuşmaz. 'Ağzını ara' çoğunlukla (%70) insan dedikodusu; kulak verince de (%60) mekandakilerin birinin ağzından duyulur (aynı mekanda günde en çok 3). Duyduklarım'da kimden duyduğun yazar. | Kullanıcı: "dedikodular çok sıkıcı". Eski dedikodular yalnızca mekanların sabit emlak/ekonomi haberleriydi. |
| K59 | **Daha genç nüfus (3.5).** ~~NPC yaşı: sakin türünün aralığında iki zarın ortalaması (ortaya yığılır)~~ → aralığın genç tarafına yatkın (0,75 × küçük zar + 0,25 × ortalama). Mekan müdavimlerinde 30 yaş altı %20'den ~%29'a çıktı. Saç kırlaşması 26 yaş altında hiç yok. Gençlerde sevgili oranı biraz düşürüldü (≤24: 4 → 2,5; 25–34: sevgilili 3 → 2, bekâr 4 → 5). Bu değişiklikler var olan kayıtlardaki tanıdıkların yaşını ve adını değiştirebilir (kişiler seed'den yeniden üretilir). | Kullanıcı: "herkes çok yaşlı". |
| K60 | **Tanıdıkların kendi hayatı (3.6).** Yalnızca tanıştığın (figür olmayan) kişiler için, her oyun günü olasılıkla bir hayat olayı (kişi başına yılda ~1–3). Olaylar ve koşulları veride (iş bul/kaybet, terfi, sevgili, ayrılık, evlilik, boşanma, çocuk, dertten kurtulma, hastalık, taşınma, vefat). Değişen hal kayda (`npcler[id].degisim`) yazılır, kişi seed'den üretilip üstüne giydirilir (`kisiGuncel`). Seninle flörtleşen ya da sevgilin olan biri başkasıyla sevgili olmaz, evlenmez, ayrılmaz, taşınmaz. Öğrenme: yanına oturunca kendisi anlatır (kuşağına göre), ya da ortak tanıdığın dedikodu olarak anlatır (en taze dedikodu önceliklidir); öğrenene kadar Tanıdıklarım'da görünmez. Figürlerin hayatı dünya kitabında ve gündemde akar, burada değil. | Kullanıcının istediği "yaşayan şehir": insanlar sen yokken de değişsin, geri döndüğünde fark edesin. |
| K61 | **Kişi kartı (3.7).** Bir kişinin tüm bilgisi tek yerde: NPC motoru (kimlik, kişilik, aile sayıları, dert, hayal, sır, kancalar, görünüş) + derinlik (değerler, beğeniler, tarzlar, para, sağlık, rutin) + isimli aile ağacı + ilişki ağı + hayat öyküsü + hayatındaki değişiklikler + oyuncuyla ilişkisi. Hepsi seed'den belirlenimli, kayda yazılmaz; tutarlılık kuralları kodda ve testte (anne-baba 17–45 yaşında doğurmuş, çocuklar iki ebeveynden de ≥ 18 yaş küçük, kardeşler farklı yıllarda, evlilik ikisi de reşitken ve çocuklardan önce, boşanma evlilikten sonra, göçmenin göç yılı var, ilişki türü iki taraftan aynı, borçta biri borçlu öbürü alacaklı, gizli ilişkiler dedikoduyla aynı çiftler, rakip ancak aynı işi yapanlar). Yapay zekâ sohbeti (3.9) bu kartı 'değişmez gerçek' olarak alacak. | Kullanıcı: "her karakterin kendi kişiliği, davranış tarzı, hikâyesi, hayatı; aşırı tutarlı". Tutarlılığı sağlamanın yolu: bilgiyi tek kaynaktan üretmek ve kuralları test etmek. |
| K63 | **Claude ile serbest sohbet (3.9).** Tarayıcıdan doğrudan Claude API (resmî SDK, `js/vendor/anthropic-sdk.mjs` olarak projede; derleme adımı yok). Kullanıcının kendi anahtarı, yalnızca bu cihazda (`localStorage` 'yeniden.yz'); kayda, kayıt koduna, hata raporuna girmez. Varsayılan model Opus 5.5; Ayarlar'dan Sonnet 5.5 / Haiku 5.5. Modele verilen: sabit kurallar + kişi kartı (önbelleğe alınır) ve her mesajda romantik durum, **o an izin verilenler**, hafıza, sahne, konuşmanın son 24 satırı. Cevap sabit bir JSON şemasında: eylem, konuşma, ilişki değişimi (her biri −5…+5'e kırpılır), olaylar (sabit liste: numara, buluşma, kalkıp gitme, sır/dert/hayal anlatma, kırılma, flörte karşılık), olgular (olgu kilidinden geçer), oyuncu hakkında öğrendikleri, özet, üç öneri cevap. Olayları oyun kendi kurallarıyla uygular; izin verilmeyen reddedilir. Opus/Sonnet'te güvenlik reddine karşı sunucu tarafı yedek model açık. İçerik: K-suç güncellemesi (tema serbest, gerçek dünyada uygulanabilir yöntem yok); cinsellik ima düzeyinde. İnternet/anahtar yoksa yazılı sohbet. | Kullanıcı: "istediğim kadar uzatabileceğim, istediğim yere çekebileceğim bir sohbet". Tutarlılığın üçüncü ayağı: model yalnızca konuşur; gerçeği oyun tutar. |
| K64 | **Cinsellik ve ikinci sağlayıcı (3.9 eki).** ~~Romantizm ve cinsellik ima düzeyinde kalır~~ → Yetişkinler arasında sansürsüz: açık konuşma, argo ve açık terimler, cinsel geçmiş, fantezi, müstehcen şaka ve dedikodu serbest; kişi kendi kişiliğiyle tepki verir. Sahnenin kendisi ayrıntılı betimlenmez (geçişle). Kesin sınır: 18 yaş altı hiçbir cinsel/romantik içeriğe dahil edilmez, ima bile. Sağlayıcı: Claude ya da Google Gemini (REST, `js/yz/gemini.js`; güvenlik filtreleri BLOCK_NONE; ücretsiz katman). İki sağlayıcı aynı sözleşmeyi uygular (`js/yz/istemci.js`), bağlam/şema/kurallar ortak. Varsayılan Claude modeli ~~Opus 5.5~~ → Sonnet 5.5 (kalite/fiyat dengesi; kullanıcıya önerilen). | Kullanıcı: "sansürlü bir oyunmuş gibi olmasın", "para ödemeden yapmanın yolu yok mu". 18 yaş sınırı pazarlıksız. Gemini'nin de kendi engellemeleri olabilir; denemede görülecek. |
| K65 | **Yapay zekâ sohbeti şimdilik kapalı (2026-10-21).** `YZ_ETKIN = false`: yazma kutusu ve Ayarlar bölümü görünmez, oyun yazılı sohbetle oynanır. Kod, testler, kayıtlı anahtarlar silinmedi. Kullanıcı isterse (Gemini ya da Claude API) tek satırla açılır. | Kullanıcı: "düzgün çalışmıyor, şimdilik kapatalım ve çeşitlendirmeye odaklanalım". Ne olduğu (bağlantı mı, cevap kalitesi mi) bilinmiyor; açılırken sorulacak. |
| K66 | **Kişi kartı yazılı sohbette (3.10).** Derin konular (`js/core/zevk.js`, `data/npc/zevk.json`): müzik, futbol, hobi, rutin, aile, geçmiş, değerler. Kişinin söylediği her şey karttan (derinlik, aile ağacı, hayat öyküsü) gelir; cümleler kuşağa göre. Oyuncunun zevkleri (`durum.karakter.zevk`: müzik en çok 3, takım 1, hobi en çok 4) ilk söylendiğinde kilitlenir; sonraki seçenekler yalnızca bunlardır. Menüde oturum başına 1–3 derin konu (konuşulmamışlar öncelikli ama konuşulmuşlar da gelir; menü ≈12'yi aşmaz). Haftanın maçı `haftaninMaci` (seed + hafta; sezon ağustos–mayıs). Hassas konu eşiği yakınlık 25. | Kullanıcı: "çeşitlendirme"; ölçüm: 3.7'de üretilen derinlik yazılı sohbette hiç kullanılmıyordu. Oyuncu tarafında da tutarlılık: bir kişiye rap, öbürüne arabesk sevdiğini söyleyemezsin. |
| K67 | **İnsanların içeriği ve aileyle tutarlılık (3.11).** Dert/hayal/sır kayıtları aile koşulları taşır (`cocukMin`, `kardesMin`, `anneSag`, `babaSag`, `babaOlu`, `yore`, `aileIliski`); `olay: true` dertler üretimde seçilmez, yalnızca hayat olayıyla gelir; `para`/`saglik` bayrakları kişi kartının para ve sağlık satırını belirler. Aile ağacı derde uyar (`derdeUydur`, ayrı akış). Hayat olayları aileyi de değiştirir (`anneVefat`/`babaVefat` yılıyla, `aileIliski`, `hayal`, `sir`); kişi kartı ve hayat öyküsü bunu gösterir. Buluşma yeri `randevuYeri` (kuşak, içki, dindarlık, son yer). **Mevcut kayıtlar:** içerik seed'den üretildiği için havuz büyüyünce eski bir kayıttaki kişilerin derdi/hayali/sırrı değişebilir (kayıt bozulmaz); test için yeni oyun önerilir. | Kullanıcı: "çeşitlendirme"; ölçüm: yüzlerce kişi aynı 16 sırrı paylaşıyordu. Tutarlılık için her içerik parçası kişinin ailesiyle çelişmeyecek koşullarla yazıldı ve testle denetleniyor. |
| K68 | **Gündelik olaylar ve kişili olay (3.12).** `data/olaylar/gunluk.json` (ev, sokak, genel) ve `tanidik.json`. Olayda `"kisi": { seçici }` (`js/core/olaykisi.js`): otomatik seçimde tanıdıklarından uyan biri ağırlıklı (yakınlığa göre) seçilir, olay bağlamına girer (`npc.kisi`, `{kisi.ad}`, `{kisi.hitap}`, `{kisi.dert}`); devam olayları zamanlayıcıyla bağlamı taşır. Geliştirici panelinden zorlanan kişili olaya da biri atanır. Bazı olaylar Faz 4 için kanca bayrak bırakır: `nakliyeci_numara`, `is_referansi`, `avukat_tanidik`, `eski_gunluk`, `kopek_pamuk`. | Kullanıcı: "çeşitlendirme"; ölçüm: oyunda ≈12 rastgele olay vardı, günler boş geçiyordu. Faz 5'in (150+ olay) ilk paketi öne çekildi. |
| K69 | **Sadakat ve gizli ilişki (3.13).** `js/core/sadakat.js`: açıklık (0–100) = seed tabanı + ilişki hali (`iliskiHali`: mutlu −15, alışılmış +10, gergin +30) + sır/dert + değerler (sadakat −30, inanç −15, gelenek/aile −10, macera +15, özgürlük +10) + dindarlık + kişilik + flört tarzı + çekim×0.3 + yakınlık×0.1. Tip: <20 sadık, <45 kararsız, <70 açık, ≥70 ateşli. İlgiye `partnerCezasi` (sadık için büyük, ateşli için yok). Açık/ateşli tavır ancak gerçekten ilgiliyse. Gizli ilişki: `k.gizli`, risk `k.iliski.risk` (herkesin içinde flört +1, ateşliyle açık buluşma +3, Kordon'a gitmek +4, görülmek +4); her gün risk×%0,6 (en çok %15) ortaya çıkma → ertesi gün `gizli_ortaya_cikti`; risk ≥ 3 iken dedikodu türü `seninle`. Etki `partnerdenAyril` (kişi boşanmış/bekâr olur; hayatında "Senin için ilişkisini bitirdi"). Tekrar oturma: `sohbet.json → tekrarOturma` (120 dk). | Kullanıcı: "aldatmak gerçek; kapının kapanması saçma." Sadakat de, aldatma da kişinin kim olduğundan gelmeli; bedeli (dedikodu, eşin öğrenmesi, suçluluk) oyunun kurallarıyla. |
| K70 | **Arzu ve romantik hamleler (3.14).** `js/core/ask.js`, `flort.json → ask`, olaylar `birlikte_gece(_gizli)` ve tanıdık olayları (`ozledim`, `gece_cagri(_gizli)`, `kiskanc_mesaj`, `sevgili_kavga`, `senden_ayriliyor`, `eski_doner`). `k.iliski.arzu` 0–100, ilgiye ×0,3; günlük sönme sevgili 1 / flört 2 / diğer 3; sevgilini 7 günden uzun görmezsen gerginlik +1/gün (8'e kadar). Hamle eşikleri: dokun ilgi ≥ 6 ya da arzu ≥ 15; açık konuş arzu ≥ 25; çıkalım arzu ≥ 40, numara/ilişki, 18.00–04.00, günde bir ret. Başarı = ilgi + arzu×0,4 (açık konuşmada tarza göre ±). Kıskançlık: flört başarısında sevgili/flört (arzu ≥ 12) duyma olasılığı %8 + tanıyorsa %35 + oradaysa %40; gerginlik + kıskançlık/2; karşılamada 4 cevap; gerginlik ≥ 12 ve kötü cevap → ayrılık. İlişki türü `eski` eklendi. Menü: flört hamleleri `flortHamleleri` → "Flört et…" (bekleyen `flortMenu`). Etki `eveDon`. Seçici: `arzuMin`, `arzuMax`, `kiskanc`. | Kullanıcı: "duygusal şeyler oyunun ciddi bir kısmı olmalı; heyecanlı, coşkulu, arzulu; flört, oynaşma gibi şeyleri kısıtlama." Menü kalabalıklığı için hamle gizlemek yerine tek giriş: kısıtlama yok, düzen var. |
| K71 | **Tahmin edilemezlik (3.16).** Flört sonuçları tek eşik değil, ağırlıklı çekiliş: her sonuç için ağırlık = a + b·(skor/10) + tarz + partner (+ ısrar); skor = ilgi + 0,4·arzu (`ask.js → sonucSec`). Veri: `flort.json → ask.serbest` (7 hamle), `ask.surpriz` (kişinin kendiliğinden hamlesi, arzu ≥ 25, oturumda bir kez, olasılık 0,12 + arzu/400), `ask.teklif`, `numara.israr`, `davet.israr`. Özel işler: opucuk, numara, cik, randevu, kalkar, senKalk, pecete, kiskanclik. Yanlış numara: `k.sahteNumara` → ertesi gün `sahte_numara` olayı; peçete/"sen bana ver" → belki `pecete_mesaj` (olasılık ilgiye göre %12–90). Etkiler `numaraVer`, `sahteOgrendi`. Flört hamleleri oturumda birden fazla açılabilir (`o.kullanilan` artık sayaç). Farklı zevke tepki: etkilendi/merak/alay/ilgisiz ağırlıklı (zevk.js `farkTepkisi`); etkilendi yalnızca flörte uygunsa. | Kullanıcı: "tahmin edilemeyecek, şaşırtıcı, sınırları zorlayan şeyler ekle; sadece ortak şey üzerinden gitmesi saçma." Eşikli sistemde aynı hamle hep aynı biter; çekilişle ilgi yalnızca olasılığı değiştirir, yüksek ilgide de tokat, düşükte de sürpriz çıkabilir. |
| K72 | **Olaydan buluşmaya; para bedeli (3.17).** Etki `bulus: { npc, turler, sure }` → `sohbet.js bulusmaKur`: kişinin semtinde şu an açık, istenen türdeki mekan (yoksa şehirde; tür sırası öncelik), konum oraya geçer, sohbet `bulusma` süresi boyunca geçerli (kişi o mekanın müdavimi olmasa da). Olay seçeneklerinde para her zaman `maliyet.para`; motor ayrıca doğrudan para düşen etkiyi de bedel sayar ve yetmiyorsa seçeneği kapatır. | Kullanıcı: "gidiyorum ama hiçbir şey yapamıyorum; olmayan paramla fatura ödedim." Bir yere gittiğini söyleyen her seçenek ya seni oraya götürmeli ya da dönüşü anlatmalı; para eksiye düşmemeli. |
| K73 | **Önce evden çık; yüzleşme; başlık şablonu (3.19).** `konum.mekanaGir` ve `yolculukYap` evdeyken reddeder. Sokakta `baglamAksiyonlari` semtin mekanlarını `gezi:gir:<id>` olarak verir (açıklar önce), `gezi:sehir` Şehir sekmesini açar. Gerginlik ≥ eşik: `ask.js gerginKarsilama` (bekleyen `ask/gergin`, neden: kiskanc/ihmal/israr/genel); başarı şansı seçeneğe göre + güven/40 + yakınlık/120 − (gerginlik−8)/30. Olay `baslik` şablon çözülür (`{kisi.ad}`). Etki `kiskanclikKonusuldu`. | Kullanıcı: "bir yere gitmek için evden çıkmam gereksin; bazılarının yanına oturamıyorum; kıskançlığı niye belirtiyorsun." |
| K74 | **Gece aşamaları ve sartlı hamleler (3.20).** `birlikte_gece(_gizli)`: giris → kapi → gece (zaman +2 sa) → sonra (+4 sa) → sabah; `gece` sayacı yalnızca gece seçeneklerinde artar. `flort.json → ask.serbest[id].sart`: hepsi tutmalı (tur, gece, yakinlik, arzu, aralik gün; `k.serbestGun`). Özel iş `sevgili`. Koşul `baglam` (olay bağlamındaki değişken; `kisi.cinsiyet` artık zamanlayıcı bağlamlarında da var). | Kullanıcı: "romantizm ve cinselliği derinleştir; daha detaylı, güzel, çekici." Kısıtlamadan, ama her seçeneğin kişiye ve ilişkinin aşamasına göre farklı sonuçlanması. |
| K75 | **Konuşma kancaları (3.21).** `kanca.js`: `soyle()` her konuşmayı `kancaTara`'dan geçirir (desen regex ya da dert kimliği) → `durum.sohbet.kancalar` (son 2) + `k.kancalar[id] = { gun, cozuldu, dusunuyor }`; `kancaSecenekleri` menünün başına (en çok 4) ve `dert_tepki` cevaplarına; takip (çözülmemiş, son 20 gün). Sonuç `ask.js sonucSec` (skor = yakınlık + 2·güven + ilgi/2, +15 düşünüyorsa; yeni alanlar `iliski`, `flortKosul`). Ev arkadaşı: `durum.evArkadasi = { id, gun }`, evde oturum (`o.evde`, `evArkadasiEvde`, `evdeKonus`, aksiyon `npc:evde`). | Kullanıcı: "ezber kalıplardan derin; söylenene özel cevap, kim olursa olsun teklif edebilmeliyim." Yazılı sohbette serbest metin yok; en yakın şey söylenen her şeyin bir sonraki seçenekleri belirlemesi. |
| K76 | **An seçenekleri ve etiketli kancalar (3.22).** `kanca.json → an` (koşul: hal, mekanTur, yagmur, gece, son, kalanMax, para; `oncelik`, `tekrar`) → `anSecenekleri` (en çok 3, önceliğe göre). Kancalara `etiket` (hal:<tür>, dedikodu, hayal, gundem, is:<durum>, memleket) → `kancaEtiket` (+ metin değişkenleri `kancaDeg`, ör. `{s.kisiAd}`). Metin anahtarları: `oz:<özellik>`, flört tarzı, kuşak, `icki:N`. Oturumda `icki` (ilgi +4/kadeh, en çok 3; ≥2 kadehte dert eşiği 0), `acildi`, `son` ('kirildi' | 'opucuk'). Özel işler: `derdiniAc`, `icki`, `kalan:N`, `sigin` (`bulusmaKur` bulunduğun semtte), `eveBirak` (onun semtinde sokakta), `bayrak:x`. | Kullanıcı: "durum özelinde farklı ve o duruma uygun şeyler olmalı." Aynı kişiyle aynı konuşma, yere, saate, havaya, onun gününe ve az önce olana göre başka akar. |
| K62 | **Olgu kilidi (3.8).** Kişi kartı (seed'den) her zaman kazanır. Konuşmada ortaya çıkan bir bilgi ancak kartla çelişmiyorsa kalıcı olgu olur; alanlı olgularda (medeni, yaş, çocuk, kardeş, anne, baba, eş, memleket, iş, semt) ilk söylenen kalır, serbest olgular ('bir kedisi var, adı Pamuk') aynısı tekrar yazılmaz. **Düzeltme (0.1.24):** ~~alanlı olgularda ilk söylenen hep kalır~~ → medeni hal, iş ve semt zamanla değişebilir: söylendiği andaki kart değeriyle saklanır, kişinin hayatı değişince 'eskiden doğruydu' diye modele verilir ve yenisi kaydedilebilir (sebep: boşanan birinin eski 'evli' olgusu kartla çelişiyordu). Olgular kartla birlikte yapay zekâya 'değişmez' diye verilir. Sırrı bilenler belirlenimli: kanka ve gizli ilişki %100, eski sevgili %60, küs %25, arkadaş %15, komşu %8, iş %5; tanımayan 0. | Yapay zekâ sohbetinde tutarlılığın ikinci ayağı: model bir şey uydurursa bir kez uydurur, sonra o gerçek olur. |
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
│   │                       mekan (açık mı, kalabalık, dedikodular, mekan denetimi),
│   │                       takvim (okul/üniversite), hava (günlük ve anlık hava), ilerleme (kendi ilerleyen dünya),
│   │                       ekonomi (AÜ oranı → ₺, kira, maaş, mekan fiyatı),
│   │                       konum (ev/sokak/mekan, yolculuk, mekanda aksiyonlar, kulak verme),
│   │                       npc (NPC üretim motoru, sabit NPC şablonları, NPC kaydı),
│   │                       insanlar (mekanda kimler var, tanışma, sohbet, tanışıklık ağı),
│   │                       hikaye (başlangıç hikâyesi), sohbet (konuşma, flört, dedikodu), npchayat (NPC'lerin hayatı),
│   │                       kart (kişi kartı), hafiza (hafıza, olgu kilidi, sırlar), yz (Claude sohbeti: bağlam, şema, uygulama),
│   │                       zevk (kişi kartı yazılı sohbette: müzik, futbol, hobi, aile, geçmiş, değerler; oyuncunun zevkleri),
│   │                       olaykisi (olaya tanıdıklardan kişi seçici), sadakat (isteklilik, gizli ilişki),
│   │                       ask (arzu, romantik hamleler, kıskançlık)
│   ├── yz/                 Yapay zekâ: ayar (sağlayıcı/anahtar/model/harcama, yalnızca cihazda), istemci (sağlayıcıya yönlendirir), claude (SDK ile), gemini (REST)
│   ├── vendor/             Dış kütüphane: anthropic-sdk.mjs (@anthropic-ai/sdk 0.135.0, tek dosya)
│   ├── ayarlar.js          Cihaz görünüm ayarları (tema, yazı, hız, hareket)
│   ├── ui/                 Arayüz parçaları (panel, anlatım, seçenekler, durum çubuğu, sekmeler)
│   │   └── ekranlar/       Sekme ekranları ve paneller (simdi, sehir, hayatim, dahafazla, kayitlar, aktarim, yertutucu)
│   └── dev/panel.js        Gizli geliştirici paneli
├── data/
│   ├── simulasyon.json     Durumların değişim kuralları, eşik uyarıları (1.5)
│   ├── aksiyonlar.json     Temel günlük aksiyonlar (1.5)
│   ├── takvim.json         Resmi tatiller (1.5); bayramlar 2026–2036 ve okul takvimi kuralları (2.6)
│   ├── hava.json           Hava modeli ayarları ve hava anlatımları (2.6)
│   ├── gezi.json           Gezinme ve mekan aksiyonları, ev adayları (2.8)
│   ├── ekonomi.json        Tüm fiyatlar, kiralar, maaşlar, suç ekonomisi (asgari ücrete oranlı; 2.7)
│   ├── dunya/              Dünya kitabı (Faz 2): sehir.json (2.1), semtler.json (2.2), ulasim.json (2.3),
│   │                       kurumlar / sirketler / figurler / orgutler.json (2.4), mekanlar.json (2.5),
│   │                       ilerleme.json (kendi ilerleyen dünya, 2.6)
│   ├── olay_ayarlari.json  Olayların çıkma sıklığı (1.9a)
│   ├── yaylar.json         Hikaye yayı tanımları (1.9b)
│   ├── olaylar/            Olay dosyaları (her dosya bir tema); _liste.json hepsini sayar — içerik Faz 5
│   ├── hikaye/             Başlangıç hikayesi parçaları — Faz 3
│   ├── npc/                isimler (kuşağa göre), memleket ve ağızlar, kişilik, hayat bileşenleri (3.1)
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

**Kesinleşen (3.1):** kimlikler `f:<figür>` (figürler, katman `onemli`), `m:<mekan>` (mekanın tohum sahibi, `tanidik`), `n:<semt>:<sıra>` (üretilen sakinler). Kayıt: `durum.npcler[id] = { sablon, katman, ilk, iliski: { yakinlik, guven, saygi, cekim, gerginlik }, anilar: [] }` — etki ve koşul motorunun 1.8'den beri kullandığı alanlarla uyumlu. `npcUret(seed, id, sablon, veri)` üretilen arka plan: `ad, soyad, tamAd, hitapAdi, unvan?, lakap?, cinsiyet, dogumYili, yas, semt, sakinTuru, yore, memleket, ulke?, koken?, gocmus, agiz, kokenAgiz?, uslup, egitim, meslek { ad, durum, isTuru }, durum, eksenler { disadonuk, uyumlu, sorumlu, dengeli, acik }, ozellikler[], medeni, aile { es?, cocuk, anne, baba, kardes, iliski }, kancalar[], alisanliklar[], tuhaflik, tik, dert, hayal, sir, gizli[]`. **Tutarlılık kuralları (test, 3000 NPC):** yaş sakin türünün aralığında; emekli ≥ 50, öğrenci ≤ 27; akademisyen yüksek lisanslı; çocuk sayısı yaşa uygun; evlinin eşi var; kişilik özellikleri eksenlere uygun, zıtlar birlikte yok; şehrin tarihindeki izler olay anında uygun yaşta; kancaya bağlı dertler yalnızca o kancası olanda; "memlekete dönmek" hayali yalnızca göçmüşlerde; adlar doğduğu dönemin havuzundan. **İnsanlar dünyada (3.2):** mekanda o an göze çarpanlar (kalabalığa göre 0–4 kişi + sahibi %80 + müdavim figürler %35) seed + mekan + gün + dilimden belirlenimli; mekanın 6 kişilik müdavim havuzu (`n:<mekan>:k`, mekanın müşteri türlerinden) ve semtin 40 kişilik havuzu (`n:<semt>:k`, aynı insanlar semtin başka yerlerinde de çıkar). Tanışmadan önce görünüşüyle anılır ("önlüğünü çıkarmamış, ellilerinde bir adam"). Tanışma olasılığı NPC'nin dışadönüklüğü ve uyumluluğu + oyuncunun ruh hali; reddedilince aynı gün tekrar denenmez. ~~Sohbet konuları yakınlıkla açılır (iş, memleket, mahalle 0; dert 8; tanıdıkları 10; dedikodu 12; hayal 18); yeni konu öncelikli;~~ → 3.2b'de konu seçmeli sohbete dönüştü (aşağıda; kullanıcı: "doğal değil, benzerlikler çok"); dedikodu kaynağıyla kaydedilir (`bilgi.dedikodular[id].kaynak`, ileride "bunu sana kim söyledi?"). Kimse kendisi, örgütü, şirketi ya da mekanı hakkındaki dedikoduyu yaymaz (test). Figürlerin hayali kendi `istek`'leri. Tanışıklık ağı: aynı mekanın insanları, mekan müdavimi figürler, figürlerin birbirleriyle ilişkileri, aynı semtten olanlar (sahiplerle %50, diğerleriyle %15). 6 sohbetten sonra katman `onemli`. Hayatım → Tanıdıklarım (tanım, aranız, tanıştığınız yer, bildiğin dert/hayal, tuhaflığı, birlikte yaşadıklarınız).

Dağılım testleri: Tabakhane'de yurt dışından gelenler, Çamlık'ta öğrenciler, Aşağıliman'da mübadil aileleri, Tersaneönü'nde tersane işsizleri ağır basıyor.

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

~~**Takvim, hava, ilerleyen dünya (2.6):**
- **Takvim:** Ramazan (3 gün) ve Kurban (4 gün) bayramları + arifeleri 2026–2036, Ramazan'ın ilk günü ve Ramazan dönemi (`tur: donem`, ayraçta gösterilmez). Okul (`okulDurumu`: ders, hafta sonu, tatil, ara tatil, yarıyıl, yaz) ve üniversite (`universiteDurumu`: dönem / tatil) kuralları; koşul diline `okul` ve `universite` eklendi.
- **Hava (`core/hava.js`):** günün havası seed + tarihten hesaplanır, kayda yazılmaz (geri yüklemede değişmez). Yağış olasılığı ayın yağışlı gün sayısından, yağışlı günler art arda gelme eğiliminde; sıcaklık ay ortalamaları arasında yumuşak geçer, gün içinde 05:00'te en düşük, 15:00'te en yüksek. Yağış saatleri, sabah sisi, rüzgâr (poyraz / lodos / sakin, şiddet 0–3; 3 = fırtına → vapur çalışmaz, `yolBul({ firtina })`). Ayraçta ve durum panelinde: "14°, yağmurlu, poyraz". Anlatım metinleri `data/hava.json`.
- **Kendi ilerleyen dünya (`core/ilerleme.js`, `durum.dunya`):** her gün işlenir. Fiyat endeksi her ay %1,8–3,2; ücret endeksi yalnızca ocak ve temmuzda, enflasyonun %88–100'ü kadar (aradaki aylarda geçim zorlaşır). Demirspor sezonda her pazar maç, puan durumu. Gündem: 21 haber şablonu (belediye, ulaşım, asayiş, ekonomi, kültür, hava, medya; koşullu ve tekrar süreli), günde en çok bir haber, son 60'ı saklanır — haber akışının (Telefon) kaynağı. Sıradan sahipli mekanlar arada bir 1–6 gün kapanır (tadilat, cenaze...). Belirlenimli: aynı seed ve gidişatta aynı dünya; gün gün ilerlemek ile toptan atlamak aynı sonucu verir (test).
- **Kayıt sürümü 2:** `durum.dunya` eklendi; v1 kayıtlar otomatik taşınır (dünya kayıt anından başlar, geçmiş günler sonradan işlenmez).

**Konum ve gezinme (2.8):** yeni oyunda ev, seed'e göre ucuz semtlerden birinde küçük bir oda (`gezi.json → evAdaylari`). Evdeyken ev aksiyonları + "Dışarı çık"; sokakta "Eve dön / Eve git"; mekanda hizmet aksiyonları (çay/kahve, yemek, içki, okey, müzik, okuma, spor, hamam, göz gezdirme), "Etrafa kulak ver" (kalabalığa göre olasılıkla mekanın henüz duyulmamış bir dedikodusu; `durum.bilgi.dedikodular`), "Dışarı çık". Kapalı mekana girilmez (saat, kapalı gün, geçici kapanma); mekan kapanınca yalnızca çıkış kalır. Yolculuk: toplu (Kent Kart, fırtınada vapur yok), yürüyüş (enerji düşer; yağmurda ıslanırsın), taksi; süre, ücret, varış semtinin o dilimdeki atmosferi. **Şehir sekmesi:** bulunulan semt (özet, atmosfer, "Semt hakkında"), gidilecek yerler (açık/kapalı, kalabalık, ₺ seviyesi; mekan paneli: tasvir, geçmiş, saatler, fiyatlar, Gir / Git ve gir), "Şehirde bugün" (gündem), yakalara göre diğer semtler (en hızlı yol süresi ve ücreti; semt paneli: kimler yaşıyor, bilinen yerler, mekanlar, üç yolculuk seçeneği). **Hayatım → Duyduklarım.** Kayıt sürümü 3 (ev, konum, bilgi); eski kayıtlar Bezhane'de evde devam eder.

Suç dünyası için yalnızca zemin var; örgütler ve bölgeleri 2.4'te bu semtlere bağlanacak.~~ → 2.4'te bağlandı (aşağıda).

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
- **Güncelleme (2026-10-21, kullanıcı: "suç içerikliye sınır olmasını istemiyorum"):** ~~yalnızca anlatı ve seçim~~ → Suç dünyası tema olarak sınırsız: karanlık karakterler, şiddet, örgüt içi ilişkiler, sohbette suç planları ve itiraflar, ahlaken kötü seçimler serbest. Tek sınır değişmedi ve değişmeyecek: gerçek dünyada uygulanabilir tarif ya da yöntem (madde üretimi, silah yapımı, sistemlere sızma adımları vb.) yazılmaz — ne yazılı içerikte ne de yapay zekâ sohbetinde. Sebep: bu oyun dışına taşan gerçek bir zarar riski; ayrıca Claude'un kullanım kuralları da buna izin vermez. Oyunun buna ihtiyacı da yok: anlatı insanlara ve sonuçlara odaklanır.
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

## 💰 EKONOMİ (kesinleşti: adım 2.7, `data/ekonomi.json`, `core/ekonomi.js`)

Bütün tutarlar **asgari ücret (AÜ) oranı**dır: ₺ = oran × AÜ × endeks. **AÜ başlangıçta 28.000 ₺/ay (net)**. Fiyatlar **fiyat endeksiyle** (her ay %1,8–3,2), maaşlar **ücret endeksiyle** (yalnızca ocak ve temmuzda, enflasyonun %88–100'ü) büyür (2.6). Görünen fiyatlar esnaf yuvarlamasıyla (100 ₺ altı 1, 1.000 altı 5, üstü 50 ₺).

**Kira = taban × semtin kira katsayısı** (aylık, oyun başında):

| Konut | Taban (AÜ) | Tabakhane (×0,6) | Çamlık (×1,0) | Cumhuriyet (×1,35) | Marina (×2,4) | Yamaçevler (×3,0) |
|---|---|---|---|---|---|---|
| Paylaşımlı evde oda | 0,55 | 9.250 | 15.400 | 20.800 | 36.950 | 46.200 |
| Stüdyo | 0,95 | 15.950 | 26.600 | 35.900 | 63.850 | 79.800 |
| 1+1 | 1,2 | 20.150 | 33.600 | 45.350 | 80.650 | 100.800 |
| 2+1 | 1,6 | 26.900 | 44.800 | 60.500 | 107.500 | 134.400 |
| 3+1 | 2,1 | 35.300 | 58.800 | 79.400 | 141.100 | 176.400 |

Fatura (aylık, payına düşen): oda 0,08 · stüdyo 0,10 · 1+1 0,12 · 2+1 0,15 · 3+1 0,18 AÜ. Depozito 2 kira, emlakçı 1 kira.

**Yaşam:** mutfak (tek kişi, idareli) 0,34 AÜ ≈ 9.500 ₺/ay · telefon + internet ≈ 1.100 · abonman ≈ 1.700 · ekmek 15 ₺ · sigara 95 ₺.
**Örnek bütçe (asgari ücretli, Tabakhane'de oda):** 28.000 − (9.250 kira + 2.250 fatura + 9.500 mutfak + 1.700 ulaşım + 1.100 telefon) ≈ **4.200 ₺ kalır**; her ay biraz eriyerek (zam ocak ve temmuzda).

**Mekan fiyatları** (fiyat seviyesi 1 → 5; çarpanlar 1 / 1,6 / 2,6 / 4 / 6,5): çay 15 → 98 ₺ · kahve 45 → 290 · çorba 81 → 530 · döner/köfte ekmek 100 → 655 · bir öğün yemek 180 → 1.150 · bir içki 120 → 785 · tatlı 70 → 455 · gecelik konaklama 505 → 3.300 · hamam 250 → 1.650 · spor günlük 195 → 1.250. Mekanın her ücretli hizmeti bir ürüne bağlı (`hizmetUrun`).

**Maaşlar** (aylık net, AÜ; şirketin ücret katsayısıyla çarpılır, hiçbir zaman AÜ'nün altına inmez): vasıfsız 1,0–1,15 · depo 1,0–1,25 · fabrika 1,0–1,3 · temizlik 1,0–1,05 · güvenlik 1,0–1,25 · çağrı merkezi 1,0–1,2 · garson 1,0–1,2 (+ bahşiş 0,1–0,4) · kurye 1,0–1,8 · satış 1,0–1,3 · mutfak 1,0–1,5 · inşaat 1,1–1,6 · şoför 1,1–1,6 · denizci 1,1–2,0 · medya 1,1–2,2 · ofis 1,2–1,8 · usta 1,4–2,4 · tasarım 1,4–3,0 · muhasebe 1,5–3,0 · öğretmen 1,6–2,2 · sağlık 1,6–4,0 · yazılım 2,0–6,0 · yönetici 4–15. Gündelik iş: günlük 0,03–0,05 AÜ (nakit, sigortasız).

**Ulaşım:** `ulasim.json` tarifesi (metro/otobüs ≈ 25 ₺, vapur ≈ 31, dolmuş ≈ 36, taksi açılış ≈ 50 + dakika ≈ 13) — fiyat endeksiyle büyür.

**Suç ekonomisi (yalnızca oyun sayıları):** tefeci faizi aylık %10–25 · haraç (mekan başına aylık) 0,1–0,6 AÜ · avukat: görevli 0, sıradan 1,5–4, "bağlantılı" 8–30 AÜ · kefalet 0,5–20 · adli para cezası 0,2–10 · örgüt geliri aylık: alt kademe 0,5–1,5, orta 2–6, üst 10–40 AÜ · kirli para şüphe eşiği: 3 AÜ'yü aşan göze batan harcama.

<details><summary>~~Eski taslak (2.7 öncesi)~~ — 2.7'de semt katsayısına bağlı kira ve tam liste ile değişti</summary>


Tüm fiyatlar **asgari ücret (AÜ)** katı olarak tanımlanır. Tek bir sayıyı (`asgariUcret`) değiştirmek tüm ekonomiyi ölçekler. Oyunun başlangıç değeri: **AÜ = 28.000 ₺/ay (net)** (2026 Türkiye net asgari ücretine yakın yuvarlak değer; kurgusal).

| Kalem | AÜ oranı (taslak) | ≈ ₺ |
|
</details>

---|---|---|
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
- **Faz 2 telefon testi → 0.1.13:** Mekanın dedikoduları bitince "Etrafa kulak ver" hep açık kalıyor, her denemede 30 dakika boşa gidiyordu. Artık duyulacak bir şey kalmayınca seçenek kapanır ("Burada bugün yeni bir şey konuşulmuyor."), son şey duyulunca oyuncuya söylenir. Kulak verince şehrin son 7 günlük gündemi de konuşulabilir (haberler Duyduklarım'a girmez). Gündem olasılığı günde %35 → %55 (3 günde tek haber çıkmıştı). Yan hata: ilk gün duyulan haber "duyulmamış" sayılıyordu (0 değeri yanlış okunuyordu); test yakaladı.
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
- ~~Ramazan ve Kurban Bayramı tarihleri henüz takvimde yok (Faz 2).~~ → 2.6'da eklendi. 2029 ve sonrası tahmini (±1 gün); Ramazan ayı 29 gün varsayıldı. Okul takvimi yaklaşık kurallarla (eylülün 2. pazartesi … haziranın 3. cuması); MEB'in o yılki gerçek takvimi birkaç gün farklı olabilir.
- Hava modeli: yağışlı günler art arda gelir ama zincir yalnızca bir gün geriye bakar (uzun yağmurlu haftalar az çıkar).
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
| 0.1.16 | 2026-10-20 | Adım 3.2b: dış görünüş ve ilk izlenim (`data/npc/gorunus.json`, `fizikTarifi`, `gununHali`), konu seçmeli sohbet (`sohbetKonulari`, `sohbetHamlesi`, `yaninaOtur`; `data/npc/sohbet.json` baştan), dert ve hayaller birinci ağızdan, tekrar hafızası, sabır, gerginlik; aynı tarifli kişiler ayrışıyor; Tanıdıklarım'da görünüş. 331 test. |
| 0.1.17 | 2026-10-20 | Adım 3.3: başlangıç hikayesi motoru (`js/core/hikaye.js`, `data/hikaye/`): 19 arketip, zincir, borçlar, alacaklar, kalanlar, sırlar, anılar, güçlü yanlar, kusurlar, iç ses, açık uçlar, geçmişten gelen NPC'ler; açılış metni hikâyeyi anlatıyor; Hayatım → Karakter; Tanıdıklarım'da 'geçmişinden'. 340 test (4.260 karakterlik tutarlılık testi). |
| 0.1.18 | 2026-10-20 | Adım 3.4: yeni oyun ekranı (başlangıç tipi, cinsiyet, ad, önizleme), ilk sabahın etkileşimli sahneleri, geçmişin 5 geri dönen olayı, `hikaye` koşulu, `{hk.*}` değişkenleri, `hk:` NPC rolleri; pansiyon odası eki düzeltmesi. 342 test (600 açılış + 400 karakterlik iplik oynatma testi). |
| 0.1.19 | 2026-10-21 | Adım 3.5: sohbet ve flört baştan — kuşağa göre konuşma ve hitap, karşılıklı sorular ve cevap seçimi, geçmişini anlatma, flört (iltifat, takılma, numara, buluşma, randevu olayı), insanlar üzerine dedikodu (kulak verince de), daha genç nüfus; `js/core/sohbet.js`, `data/npc/flort.json`, `data/npc/dedikodu.json`, `data/olaylar/iliski.json`. 350 test. |
| 0.1.20 | 2026-10-21 | Adım 3.6: tanıdıkların kendi hayatı (12 hayat olayı; kendisinden ya da dedikodudan öğrenme; taşınan/vefat eden görülmez), geliştirici panelinde NPC bölümü (mekandakiler, flört ilgisi, yönelim, engel, hayat olayı yaşatma). Faz 3'ün adımları bitti. 354 test. |
| 0.1.21 | 2026-10-21 | Adım 3.7: karakter derinliği — isimli aile ağacı, ilişki ağı, hayat öyküsü, değerler ve tarzlar, kişi kartı (`js/core/kart.js`, `data/npc/derinlik.json`); geliştirici panelinde 'Kişi kartı'. 360 test. |
| 0.1.30 | 2026-10-21 | Adım 3.14: arzu; "Flört et…" menüsü (göz göze, dokunmak, açık konuşmak, buradan çıkalım, ayrılmak); flört tarzına göre tepkiler; birlikte gece ve sabah; özlem, gece çağrısı, kıskançlık, kavga, ayrılık, eskinin dönüşü; kıskançlığın yayılması. 407 test. |
| 0.1.31 | 2026-10-21 | Adım 3.15: flört, selam, şaka, veda havuzları genişledi; söz hafızası en uzun zamandır duyulmayanı seçiyor. 410 test. |
| 0.1.32 | 2026-10-21 | Adım 3.16 (geri bildirim 1): farklı hobi/müziğe canlı tepkiler; numara ve buluşmada ısrar, yanlış numara; öp, fısılda, iddia, dans, telefon, peçete, içini dök; kişinin sürprizleri; yapay cümleler temizlendi. 417 test. |
| 0.1.33 | 2026-10-21 | Adım 3.17 (geri bildirim 2): çağırana gidince gerçek buluşma ve sohbet; para yetmiyorsa ödeme seçeneği kapalı; çift kesilen para düzeldi. 420 test. |
| 0.1.34 | 2026-10-21 | Adım 3.18: otomatik oyuncu ile tarama; ev, uyku, yol ve mekan metinleri çoğaldı, saate bağlı cümleler, tekrarsız seçim; kasa eksiye düşmez. 421 test. |
| 0.1.35 | 2026-10-21 | 3.18 eki: konuştuğun kişi gidince sohbet kapanıyor ("… kalkıp gitti"). |
| 0.1.36 | 2026-10-22 | Adım 3.19 (geri bildirim 3): önce evden çık, sokakta yer seçimi; gerginken yüzleşme; olay başlıklarında yalnızca gönderenin adı. 422 test. |
| 0.1.37 | 2026-10-22 | Adım 3.20: romantizm ve cinsellik derinleşti — gece beş aşama, yeni gece seçenekleri, "Seni seviyorum", gelecek, sarılmak, fantezi. 425 test. |
| 0.1.38 | 2026-10-22 | Adım 3.21: konuşma kancaları — söylenene ve derde özel cevaplar, takip soruları, ev arkadaşı olarak yanına taşınma. 430 test. |
| 0.1.39 | 2026-10-22 | Adım 3.22: o anın durumuna göre sohbet — söylenen her şeye uygun cevaplar, ortam seçenekleri (içki, çay, yağmur, gece, özür…), kişiye özel tepkiler. 436 test. |
| 0.1.40 | 2026-10-22 | Daha Fazla → "Deneme: para ekle" (+1.000 / +10.000 ₺; kullanıcı isteği, oyunu denerken; iş ve para sistemi gelince kaldırılacak). |
| 0.1.29 | 2026-10-21 | Adım 3.13: evli/sevgilili kapıyı kapatmıyor (sadık/kararsız/açık/ateşli, kartından); gizli numara, gizli buluşma, risk, dedikodu, eşin öğrenmesi, onun için ayrılmak; tekrar yanına oturma kuralı ve aynı gün selamı; flört yaş sınırı gevşedi. 400 test. |
| 0.1.28 | 2026-10-21 | Adım 3.12: gündelik olaylar — 27 ev/sokak/genel olayı, 11 tanıdık olayı (kişi seçiciyle), devam olayları (cüzdanın sahibi, borcun dönüşü, Pamuk). 394 test. |
| 0.1.27 | 2026-10-21 | Adım 3.11: insanların içeriği — dert 64, hayal 49, sır 48, hayat olayı 38, dedikodu kalıbı 94 (yeni türler), 6 buluşma yeri; aileyle tutarlılık koşulları ve düzeltmeleri. 389 test. |
| 0.1.26 | 2026-10-21 | Adım 3.10: kişi kartı yazılı sohbette — müzik, futbol (haftanın maçı), boş vakit, günlük hayat, aile (isimleriyle), geçmiş (yıl yıl), hayat görüşü; kişi de sorar; oyuncunun zevkleri kilitlenir; ortak nokta yakınlaştırır, zıtlık gerer; hassas konu yakınlıkla açılır. Kart tutarlılık düzeltmeleri. 383 test. |
| 0.1.25 | 2026-10-21 | Yapay zekâ sohbeti kapatıldı (kullanıcı isteği, K65): yazma kutusu ve Ayarlar bölümü görünmez; kod duruyor. Çeşitlendirme planı (3.10–3.13). 374 test. |
| 0.1.24 | 2026-10-21 | 3.9 eki: Gemini desteği (ücretsiz katman; Claude/Gemini seçimi, ayrı anahtarlar, sınır dolunca söz kutuda kalır), cinsellik sansürsüz (18 yaş altı kesin yasak), hayatı değişen kişinin eski olguları 'eskiden doğruydu' olur; varsayılan Claude modeli Sonnet 5.5. 374 test. |
| 0.1.23 | 2026-10-21 | Adım 3.9: Claude ile serbest sohbet — yazma kutusu ve öneri cevaplar, kişi kartı + hafıza + o anki kurallar modele, JSON şemalı cevap, olaylar oyunun kurallarıyla, olgular olgu kilidiyle; Daha Fazla → Yapay zekâ sohbeti (anahtar, model, bağlantı denemesi, aylık harcama). Anahtar yalnızca cihazda. 369 test. |
| 0.1.22 | 2026-10-21 | Adım 3.8: hafıza ve olgu kilidi (`js/core/hafiza.js`) — kişinin seninle ilgili hafızası, kartla denetlenen kalıcı olgular, kim kimin sırrını biliyor; dedikoduda sırrı yalnızca bilen anlatır. 363 test. |
| 0.1.15 | 2026-10-20 | Adım 3.2: `core/insanlar.js` + `data/npc/sohbet.json` (mekandakiler, görünüş, tanışma, sohbet konuları, dedikodu kaynağı, tanışıklık ağı, tanıdıklarım); mekanda insan seçenekleri; Hayatım → Tanıdıklarım; Şehir'de "Şu an burada". 325 test. |
| 0.1.14 | 2026-10-20 | Adım 3.1: NPC üretim motoru (`core/npc.js`; `data/npc/isimler.json`, `memleket.json`, `kisilik.json`, `hayat.json`), sabit NPC şablonları (26 figür + 31 mekan sahibi), NPC kaydı ve katman yükseltme, veri denetimi; oyun NPC verisini yüklüyor. 318 test. |
| 0.1.13 | 2026-10-20 | Faz 2 telefon testi düzeltmesi: kulak verme bitince kapanıyor, gündem de konuşuluyor; gündem sıklığı arttı. 312 test. |
| 0.1.12 | 2026-10-20 | Adım 2.8: konum sistemi (`core/konum.js`, `data/gezi.json`; kayıt sürümü 3 + migration), Şehir sekmesi (`ui/ekranlar/sehir.js`), Hayatım → Duyduklarım (`ui/ekranlar/hayatim.js`), yolculuk, mekana girme, mekanda fiyatlı aksiyonlar, kulak verme; olaylarda `yer`; aksiyonlarda `yer`; durum panelinde konum; hata raporunda konum. Faz 2 kodu bitti. 311 test. |
| 0.1.11 | 2026-10-20 | Adım 2.7: `data/ekonomi.json` + `core/ekonomi.js` (esnaf yuvarlaması, fiyat/ücret endeksi, ürün ve hizmet fiyatı, kira, maaş aralığı, denetim); ekonomi tablosu kesinleşti. 302 test. |
| 0.1.10 | 2026-10-20 | Adım 2.6: bayramlar 2026–2036, okul/üniversite takvimi (`core/takvim.js`, koşul dilinde `okul`, `universite`); hava modeli (`core/hava.js`, `data/hava.json`; ayraçta ve durum panelinde hava; fırtınada vapur yok); kendi ilerleyen dünya (`core/ilerleme.js`, `data/dunya/ilerleme.json`: enflasyon, zam, Demirspor, gündem, mekan kapanmaları). Kayıt sürümü 2 + migration. 296 test. |
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
