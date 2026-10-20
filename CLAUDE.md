# CLAUDE.md

Her oturumda işe başlamadan önce PROJE.md'yi oku.

- Kullanıcı kod okuyamıyor: teknik kararları sen ver, kullanıcının yapacağı her adımı madde madde ve çok basit anlat.
- Çalışma temposu: her adımı bitirince commit + push et, PROJE.md'deki "Nerede kaldık" bölümünü güncelle ve DUR. Kullanıcı "devam" demeden sonraki adıma geçme. Dururken sonraki adımın küçük / orta / büyük olduğunu söyle.
- Hiçbir şey yarım/bozuk kalmasın: her commit kendi başına çalışır durumda olmalı.
- Bir kararı değiştirirsen eskisini silme; PROJE.md'de üstünü çizip (~~eski~~) neden değiştiğini yaz.
- Testler: `node --test tests/*.test.js` (build adımı yok, sadece Node 18+ gerekir).
