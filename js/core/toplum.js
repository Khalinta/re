// Şehrin toplumu: kurumlar, şirketler, yerel figürler ve kurgusal örgütler (adım 2.4).
// Yardımcılar ve tutarlılık denetimi. "Hiçbir şey havada kalmasın": her başvuru (sahip, paravan,
// lider, rütbe, bölge, iş türü, olay) gerçekten var olan bir kayda gitmeli.

const KIMLIK = /^[a-z][a-z0-9_]*$/;
// Son kelimesi ı/i/u/ü ile biten adlar çoğunlukla iyeliklidir (Gar Karakolu); veride açıkça belirtilmeli (K47)
const IYELIK_SUPHESI = /[ıiuü]$/;
export const KURUM_TURLERI = ['kamu', 'guvenlik', 'karakol', 'adalet', 'cezaevi', 'saglik', 'egitim', 'sosyal', 'sendika', 'dernek', 'spor'];
export const ORGUT_TURLERI = ['aile', 'cete', 'sebeke'];
const SIGORTA = ['tam', 'eksik', 'yok'];
const FIGUR_DURUMLARI = ['sehirde', 'yurtdisinda', 'cezaevinde'];
const SIMDIKI_YIL = 2026; // DUNYA_SIMDISI'nin yılı (dunya.js)

const liste = (dunya, dosya, alan) => dunya?.[dosya]?.[alan] || [];
const bul = (dunya, dosya, alan, id) => liste(dunya, dosya, alan).find(x => x.id === id) ?? null;

export const kurumBul = (dunya, id) => bul(dunya, 'kurumlar', 'kurumlar', id);
export const sirketBul = (dunya, id) => bul(dunya, 'sirketler', 'sirketler', id);
export const figurBul = (dunya, id) => bul(dunya, 'figurler', 'figurler', id);
export const orgutBul = (dunya, id) => bul(dunya, 'orgutler', 'orgutler', id);

export const karakolBul = (dunya, semt) => liste(dunya, 'kurumlar', 'kurumlar').find(k => k.tur === 'karakol' && k.kapsar?.includes(semt)) ?? null;

// Bir semtte varlığı olan örgütler, güçlüden zayıfa
export function semtOrgutleri(dunya, semt) {
  return liste(dunya, 'orgutler', 'orgutler')
    .flatMap(o => o.bolgeler.filter(b => b.semt === semt).map(b => ({ orgut: o.id, ad: o.ad, guc: b.guc, faaliyetler: b.faaliyetler, aciklama: b.aciklama })))
    .sort((a, b) => b.guc - a.guc);
}

// Belirli bir iş türünü veren, faaliyetteki şirketler ve kurumlar (Faz 4 iş ilanları)
export function isVerenler(dunya, isTuru, { semt } = {}) {
  const s = liste(dunya, 'sirketler', 'sirketler').filter(x => x.durum === 'aktif' && x.isVerir.includes(isTuru)).map(x => ({ tur: 'sirket', kayit: x }));
  const k = liste(dunya, 'kurumlar', 'kurumlar').filter(x => x.isVerir?.includes(isTuru)).map(x => ({ tur: 'kurum', kayit: x }));
  return [...s, ...k].filter(x => !semt || x.kayit.semt === semt);
}

export const orgutParavanlari = (dunya, orgut) => liste(dunya, 'sirketler', 'sirketler').filter(s => s.paravan === orgut);
export const orgutUyeleri = (dunya, orgut) => liste(dunya, 'figurler', 'figurler').filter(f => f.orgut === orgut);
export const figurYasi = (f, yil = SIMDIKI_YIL) => yil - f.dogumYili;

const aralik = (v, en, ust) => Number.isInteger(v) && v >= en && v <= ust;

// semtIdler, olayIdler: Set. Döner: hata listesi
export function toplumDogrula(dunya, semtIdler, olayIdler) {
  const h = [];
  const isTurleri = dunya.sirketler?.isTurleri || null;
  const figurIdler = new Set(liste(dunya, 'figurler', 'figurler').map(f => f.id));
  const orgutIdler = new Set(liste(dunya, 'orgutler', 'orgutler').map(o => o.id));
  const sirketIdler = new Set(liste(dunya, 'sirketler', 'sirketler').map(s => s.id));
  const kurumIdler = new Set(liste(dunya, 'kurumlar', 'kurumlar').map(k => k.id));

  const kimlikDenetle = (kayitlar, ad) => {
    const gorulen = new Set();
    for (const [i, x] of kayitlar.entries()) {
      if (!KIMLIK.test(x.id || '')) h.push(`${ad}[${i}]: id biçimi "${x.id}"`);
      if (gorulen.has(x.id)) h.push(`${ad}: kimlik iki kez "${x.id}"`);
      gorulen.add(x.id);
      if (!x.ad) h.push(`${ad} ${x.id}: ad yok`);
    }
  };
  const isTuruDenetle = (y, ids) => { if (isTurleri) for (const t of ids || []) if (!isTurleri[t]) h.push(`${y}: bilinmeyen iş türü "${t}"`); };
  const olayDenetle = (y, ids) => { for (const o of ids || []) if (!olayIdler.has(o)) h.push(`${y}: zaman çizelgesinde olmayan olay "${o}"`); };
  const semtDenetle = (y, s) => { if (!semtIdler.has(s)) h.push(`${y}: bilinmeyen semt "${s}"`); };
  const iyelikDenetle = (y, x) => { if (IYELIK_SUPHESI.test(x.ad || '') && x.iyelik === undefined) h.push(`${y}: "${x.ad}" iyelikli olabilir, "iyelik" alanı yazılmalı`); };

  // Kurumlar
  if (dunya.kurumlar) {
    const kurumlar = dunya.kurumlar.kurumlar;
    kimlikDenetle(kurumlar, 'kurum');
    const karakolu = new Map();
    for (const k of kurumlar) {
      const y = `kurum ${k.id}`;
      if (!KURUM_TURLERI.includes(k.tur)) h.push(`${y}: bilinmeyen tür "${k.tur}"`);
      semtDenetle(y, k.semt);
      if (!k.aciklama) h.push(`${y}: açıklama yok`);
      isTuruDenetle(y, k.isVerir);
      olayDenetle(y, k.olaylar);
      iyelikDenetle(y, k);
      if (k.tur === 'karakol') {
        if (!k.kapsar?.length) h.push(`${y}: karakolun sorumlu olduğu semt yok`);
        for (const s of k.kapsar || []) {
          semtDenetle(y, s);
          if (karakolu.has(s)) h.push(`semt ${s}: iki karakola bağlı (${karakolu.get(s)}, ${k.id})`);
          karakolu.set(s, k.id);
        }
      } else if (k.kapsar) h.push(`${y}: yalnızca karakollar semt kapsar`);
    }
    for (const s of semtIdler) if (!karakolu.has(s)) h.push(`semt ${s}: hiçbir karakola bağlı değil`);
  }

  // Şirketler
  if (dunya.sirketler) {
    for (const [k, v] of Object.entries(isTurleri || {})) if (!KIMLIK.test(k) || !v) h.push(`isTurleri: "${k}" biçimi`);
    const sirketler = dunya.sirketler.sirketler;
    kimlikDenetle(sirketler, 'şirket');
    for (const s of sirketler) {
      const y = `şirket ${s.id}`;
      semtDenetle(y, s.semt);
      if (!s.sektor || !s.aciklama) h.push(`${y}: sektör ve açıklama gerekli`);
      if (!aralik(s.buyukluk, 1, 5)) h.push(`${y}: büyüklük 1–5 olmalı`);
      if (!aralik(s.kurulus, 1000, SIMDIKI_YIL)) h.push(`${y}: kuruluş yılı geçersiz`);
      if (!aralik(s.itibar, 1, 5)) h.push(`${y}: itibar 1–5 olmalı`);
      if (!(s.ucretKatsayisi >= 0.5 && s.ucretKatsayisi <= 2)) h.push(`${y}: ücret katsayısı 0,5–2 olmalı`);
      if (!SIGORTA.includes(s.sigorta)) h.push(`${y}: sigorta tam/eksik/yok olmalı`);
      isTuruDenetle(y, s.isVerir);
      olayDenetle(y, s.olaylar);
      iyelikDenetle(y, s);
      if (s.durum === 'aktif') {
        if (s.kapanis) h.push(`${y}: faaliyetteki şirketin kapanışı olmaz`);
        if (!s.isVerir?.length) h.push(`${y}: faaliyetteki şirket hiç iş vermiyor`);
      } else if (s.durum === 'batik') {
        if (!olayIdler.has(s.kapanis)) h.push(`${y}: batık şirketin kapanışı zaman çizelgesindeki bir olay olmalı`);
        if (s.isVerir?.length) h.push(`${y}: batık şirket iş veremez`);
      } else h.push(`${y}: durum aktif/batik olmalı`);
      if (s.sahip && !figurIdler.has(s.sahip)) h.push(`${y}: bilinmeyen sahip "${s.sahip}"`);
      if (s.paravan && !orgutIdler.has(s.paravan)) h.push(`${y}: bilinmeyen örgüt "${s.paravan}"`);
    }
  }

  // Figürler
  if (dunya.figurler) {
    const turler = dunya.figurler.iliskiTurleri || {};
    const figurler = dunya.figurler.figurler;
    kimlikDenetle(figurler, 'figür');
    for (const f of figurler) {
      const y = `figür ${f.id}`;
      if (!['e', 'k'].includes(f.cinsiyet)) h.push(`${y}: cinsiyet e/k olmalı`);
      if (!aralik(figurYasi(f), 18, 95)) h.push(`${y}: yaş 18–95 arası olmalı (${figurYasi(f)})`);
      semtDenetle(y, f.semt);
      if (!FIGUR_DURUMLARI.includes(f.durum)) h.push(`${y}: bilinmeyen durum "${f.durum}"`);
      for (const k of ['unvan', 'kamuoyu', 'gercek', 'zaaf', 'istek']) if (!f[k]) h.push(`${y}: ${k} yok`);
      if (f.kurum && !kurumIdler.has(f.kurum)) h.push(`${y}: bilinmeyen kurum "${f.kurum}"`);
      for (const s of f.sirketler || []) if (!sirketIdler.has(s)) h.push(`${y}: bilinmeyen şirket "${s}"`);
      if (f.orgut) {
        const o = liste(dunya, 'orgutler', 'orgutler').find(x => x.id === f.orgut);
        if (!o) h.push(`${y}: bilinmeyen örgüt "${f.orgut}"`);
        else if (!o.hiyerarsi.some(r => r.id === f.rutbe)) h.push(`${y}: "${f.rutbe}" ${o.id} örgütünde bir rütbe değil`);
      } else if (f.rutbe) h.push(`${y}: örgütü olmayan figürün rütbesi olmaz`);
      for (const il of f.iliskiler || []) {
        if (!figurIdler.has(il.figur) || il.figur === f.id) h.push(`${y}: ilişki geçersiz figür "${il.figur}"`);
        if (!turler[il.tur]) h.push(`${y}: bilinmeyen ilişki türü "${il.tur}"`);
        if (!il.aciklama) h.push(`${y}: ${il.figur} ilişkisinin açıklaması yok`);
      }
    }
  }

  // Örgütler
  if (dunya.orgutler) {
    const d = dunya.orgutler;
    const orgutler = d.orgutler;
    kimlikDenetle(orgutler, 'örgüt');
    for (const o of orgutler) {
      const y = `örgüt ${o.id}`;
      if (!ORGUT_TURLERI.includes(o.tur)) h.push(`${y}: bilinmeyen tür "${o.tur}"`);
      if (!aralik(o.kurulus, 1900, SIMDIKI_YIL)) h.push(`${y}: kuruluş yılı geçersiz`);
      if (!o.ozet || !o.cikis) h.push(`${y}: özet ve çıkış anlatımı gerekli`);
      const lider = liste(dunya, 'figurler', 'figurler').find(f => f.id === o.lider);
      if (!lider) h.push(`${y}: bilinmeyen lider "${o.lider}"`);
      else if (lider.orgut !== o.id || lider.rutbe !== o.hiyerarsi?.[0]?.id) h.push(`${y}: lider ${o.lider} örgütün en üst rütbesinde değil`);
      for (const t of o.tarihce || []) { if (!t.aciklama) h.push(`${y}: tarihçe maddesinde açıklama yok`); if (t.olay) olayDenetle(y, [t.olay]); }
      if (!o.bolgeler?.length) h.push(`${y}: bölgesi yok`);
      const bolgeSemt = new Set();
      for (const b of o.bolgeler || []) {
        semtDenetle(y, b.semt);
        if (bolgeSemt.has(b.semt)) h.push(`${y}: bölge iki kez "${b.semt}"`);
        bolgeSemt.add(b.semt);
        if (!aralik(b.guc, 1, 5)) h.push(`${y}: ${b.semt} gücü 1–5 olmalı`);
        for (const ft of b.faaliyetler || []) if (!d.faaliyetTurleri?.[ft]) h.push(`${y}: bilinmeyen faaliyet "${ft}"`);
        if (!b.aciklama) h.push(`${y}: ${b.semt} bölgesinin açıklaması yok`);
      }
      if (!o.kurallar?.length || o.kurallar.some(k => !k.kural || !k.ihlal)) h.push(`${y}: kurallar (kural + ihlal) gerekli`);
      const rutbeler = new Set();
      for (const r of o.hiyerarsi || []) {
        if (!KIMLIK.test(r.id || '') || rutbeler.has(r.id)) h.push(`${y}: rütbe kimliği "${r.id}"`);
        rutbeler.add(r.id);
        if (!Array.isArray(r.sayi) || !(r.sayi[0] >= 1 && r.sayi[1] >= r.sayi[0])) h.push(`${y}: ${r.id} sayısı [en az, en çok] olmalı`);
      }
      if (rutbeler.size < 2) h.push(`${y}: hiyerarşi en az iki rütbe olmalı`);
      for (const f of o.faaliyetler || []) if (!d.faaliyetTurleri?.[f.tur] || !f.aciklama) h.push(`${y}: faaliyet "${f.tur}" bilinmiyor ya da açıklamasız`);
      for (const il of o.iliskiler || []) {
        if (!orgutIdler.has(il.orgut) || il.orgut === o.id) h.push(`${y}: ilişki geçersiz örgüt "${il.orgut}"`);
        else if (!orgutler.find(x => x.id === il.orgut).iliskiler?.some(x => x.orgut === o.id)) h.push(`${y}: ${il.orgut} ilişkisi tek yönlü (karşı taraf ${o.id}'i anmıyor)`);
        if (!d.iliskiTurleri?.[il.tur]) h.push(`${y}: bilinmeyen ilişki türü "${il.tur}"`);
      }
      if (!aralik(o.itibar?.korku, 1, 5) || !aralik(o.itibar?.saygi, 1, 5) || !o.itibar?.halk) h.push(`${y}: itibar (korku, saygı 1–5, halk) gerekli`);
      if (!aralik(o.polisBilgisi, 0, 5)) h.push(`${y}: polisBilgisi 0–5 olmalı`);
      if (!aralik(o.cikisZorlugu, 1, 5)) h.push(`${y}: cikisZorlugu 1–5 olmalı`);
      for (const g of o.girisYollari || []) if (!d.girisYollari?.[g]) h.push(`${y}: bilinmeyen giriş yolu "${g}"`);
    }
  }
  return h;
}
