// Dünya kitabı: yükleme sonrası yardımcılar ve tutarlılık denetimi.
// "Hiçbir şey havada kalmasın": her başvuru (semt, olay, kurum...) gerçekten var olan bir şeye gitmeli.
// Denetim testlerde çalışır (tests/dunya.test.js); oyun açılışında da hafif bir denetim yapılabilir.

// Dünya kitabındaki olaylar bu tarihten sonra olamaz: oyun en erken bu tarihte başlar
// ve zaman çizelgesi "geçmiş"tir. (Oyun içinde dünya kendi ilerler; o olaylar kayda yazılır, buraya değil.)
export const DUNYA_SIMDISI = '2026-10-20';

const KIMLIK = /^[a-z][a-z0-9_]*$/;
const TARIH = /^\d{4}(-\d{2}(-\d{2})?)?$/;

// Semtin iskeleti (sehir.json) ile ayrıntısı (semtler.json) birleşik döner.
export function semtBul(dunya, id) {
  const iskelet = dunya?.sehir?.semtler?.find(s => s.id === id);
  if (!iskelet) return null;
  const detay = dunya?.semtler?.semtler?.find(s => s.id === id);
  return detay ? { ...detay, ...iskelet } : iskelet;
}

export const semtKomsulari = (dunya, id) => (semtBul(dunya, id)?.komsular || []).map(k => semtBul(dunya, k)).filter(Boolean);

// a semtinin b'ye bakışı (ilişkiler tek yönlü yazılır; yoksa null)
export const semtIliskisi = (dunya, a, b) => semtBul(dunya, a)?.iliskiler?.find(i => i.semt === b) ?? null;

// Semtte yaşayan biri için sakin türü seçer (NPC üretimi, Faz 3)
export function sakinTuruSec(dunya, id, rng) {
  const s = semtBul(dunya, id);
  return s?.sakinler?.length ? rng.agirlikliSec(s.sakinler).tur : null;
}

export const SEMT_OLCEKLERI = { gelir: [1, 5], yogunluk: [1, 5], guvenlik: [1, 5], polis: [1, 5], donusum: [0, 5], kiraEgilimi: [-1, 2] };
export const YER_TURLERI = ['tarihi', 'dini', 'ticari', 'yeme_icme', 'eglence', 'doga', 'deniz', 'ulasim', 'kamu', 'egitim', 'saglik', 'spor', 'konut'];
export const ILISKI_TURLERI = ['dayanisma', 'gerilim', 'kucumseme', 'ozenti', 'rekabet', 'bagimlilik'];
const DILIM_IDLERI = ['sabah', 'ogle', 'aksam', 'gece'];
// Son kelimesi ı/i/u/ü ile biten adlar çoğunlukla 3. tekil iyeliklidir (Saat Kulesi, Liman Kapısı):
// ek motoru bunu kendisi anlayamaz, veride "iyelik": true ya da bilerek false yazılmalı.
const IYELIK_SUPHESI = /[ıiuü]$/;

function semtDetayDogrula(dunya, semtIdler, olayIdler) {
  const h = [];
  const d = dunya.semtler;
  const turler = d.sakinTurleri || {};
  const detayIdler = new Set();
  const yerIdler = new Set();
  for (const [i, s] of (d.semtler || []).entries()) {
    const y = `semtler.json[${i}] (${s.id})`;
    if (!semtIdler.has(s.id)) { h.push(`${y}: sehir.json'da böyle bir semt yok`); continue; }
    if (detayIdler.has(s.id)) h.push(`${y}: iki kez`);
    detayIdler.add(s.id);
    if (!s.karakter) h.push(`${y}: karakter yok`);
    for (const dl of DILIM_IDLERI) if (!s.atmosfer?.[dl]) h.push(`${y}: atmosfer.${dl} yok`);
    if (!s.duyular?.length) h.push(`${y}: duyular boş`);
    const so = s.sosyo || {};
    for (const [k, [en, ust]] of Object.entries(SEMT_OLCEKLERI)) {
      if (!Number.isInteger(so[k]) || so[k] < en || so[k] > ust) h.push(`${y}: sosyo.${k} ${en}–${ust} arası tam sayı olmalı`);
    }
    if (typeof so.kiraKatsayisi !== 'number' || so.kiraKatsayisi < 0.3 || so.kiraKatsayisi > 5) h.push(`${y}: sosyo.kiraKatsayisi 0,3–5 arası olmalı`);
    if (!s.sakinler?.length) h.push(`${y}: sakin yok`);
    for (const sk of s.sakinler || []) {
      if (!turler[sk.tur]) h.push(`${y}: bilinmeyen sakin türü "${sk.tur}"`);
      if (!(sk.agirlik > 0)) h.push(`${y}: sakin ağırlığı pozitif olmalı (${sk.tur})`);
    }
    for (const yer of s.unluYerler || []) {
      if (!KIMLIK.test(yer.id || '')) h.push(`${y}: ünlü yer id biçimi "${yer.id}"`);
      if (yerIdler.has(yer.id)) h.push(`${y}: ünlü yer kimliği iki kez "${yer.id}"`);
      yerIdler.add(yer.id);
      if (!yer.ad || !yer.aciklama) h.push(`${y}: ünlü yer ${yer.id}: ad ve açıklama gerekli`);
      if (!YER_TURLERI.includes(yer.tur)) h.push(`${y}: ünlü yer ${yer.id}: bilinmeyen tür "${yer.tur}"`);
      if (IYELIK_SUPHESI.test(yer.ad || '') && yer.iyelik === undefined) h.push(`${y}: "${yer.ad}" iyelikli olabilir, "iyelik" alanı yazılmalı`);
    }
    for (const g of s.gerilimler || []) {
      if (!KIMLIK.test(g.id || '')) h.push(`${y}: gerilim id biçimi "${g.id}"`);
      if (!g.ad || !g.aciklama) h.push(`${y}: gerilim ${g.id}: ad ve açıklama gerekli`);
      for (const o of g.olaylar || []) if (!olayIdler.has(o)) h.push(`${y}: gerilim ${g.id}: zaman çizelgesinde olmayan olay "${o}"`);
    }
    for (const k of s.komsular || []) {
      if (!semtIdler.has(k)) h.push(`${y}: bilinmeyen komşu "${k}"`);
      else if (k === s.id) h.push(`${y}: kendine komşu`);
      else {
        const ob = d.semtler.find(x => x.id === k);
        if (ob && !(ob.komsular || []).includes(s.id)) h.push(`${y}: komşuluk tek yönlü (${k} → ${s.id} yok)`);
      }
    }
    if (!s.komsular?.length) h.push(`${y}: komşusu yok`);
    for (const il of s.iliskiler || []) {
      if (!semtIdler.has(il.semt) || il.semt === s.id) h.push(`${y}: ilişki geçersiz semt "${il.semt}"`);
      if (!ILISKI_TURLERI.includes(il.tur)) h.push(`${y}: bilinmeyen ilişki türü "${il.tur}"`);
      if (!il.aciklama) h.push(`${y}: ilişki ${il.semt}: açıklama yok`);
    }
    for (const e of s.etiketler || []) if (!KIMLIK.test(e)) h.push(`${y}: etiket biçimi "${e}"`);
  }
  for (const sid of semtIdler) if (!detayIdler.has(sid)) h.push(`semt ${sid}: semtler.json'da ayrıntısı yok`);
  return h;
}

// Zaman çizelgesindeki bir olayın yılı (karakter geçmişleri için)
export const olayYili = o => Number(String(o.tarih).slice(0, 4));

// Belirli bir hikaye kancasına bağlı olaylar: 'tersane_issizi' -> [tersane_kapanis]
export function kancaOlaylari(dunya, kanca) {
  return (dunya?.sehir?.zamanCizelgesi || []).filter(o => (o.kancalar || []).includes(kanca));
}

export function tumKancalar(dunya) {
  return [...new Set((dunya?.sehir?.zamanCizelgesi || []).flatMap(o => o.kancalar || []))].sort();
}

// Döner: hata listesi (boşsa tutarlı)
export function dunyaDogrula(dunya) {
  const h = [];
  const s = dunya?.sehir;
  if (!s) return ['sehir yok'];
  for (const k of ['id', 'ad', 'halkAdi', 'nufus']) if (s[k] === undefined || s[k] === '') h.push(`sehir.${k} eksik`);
  if (!KIMLIK.test(s.id || '')) h.push('sehir.id biçimi');

  const semtIdler = new Set();
  for (const [i, semt] of (s.semtler || []).entries()) {
    if (!KIMLIK.test(semt.id || '')) h.push(`semtler[${i}].id biçimi: "${semt.id}"`);
    if (semtIdler.has(semt.id)) h.push(`semt kimliği iki kez: ${semt.id}`);
    semtIdler.add(semt.id);
    if (!semt.ad) h.push(`semt ${semt.id}: ad yok`);
    if (!['bati', 'dogu', 'kuzey'].includes(semt.yaka)) h.push(`semt ${semt.id}: yaka bati/dogu/kuzey olmalı`);
    if (!semt.ozet) h.push(`semt ${semt.id}: özet yok`);
  }
  if (semtIdler.size < 8) h.push('en az 8 semt olmalı');

  const ay = s.cografya?.iklim?.aylik || [];
  if (ay.length !== 12 || ay.some((a, i) => a.ay !== i + 1 || typeof a.ortSicaklik !== 'number' || typeof a.yagisliGun !== 'number')) h.push('iklim.aylik 12 ay, sırayla, sayısal olmalı');

  const olayIdler = new Set();
  let onceki = '';
  for (const [i, o] of (s.zamanCizelgesi || []).entries()) {
    const y = `zamanCizelgesi[${i}] (${o.id})`;
    if (!KIMLIK.test(o.id || '')) h.push(`${y}: id biçimi`);
    if (olayIdler.has(o.id)) h.push(`${y}: kimlik iki kez`);
    olayIdler.add(o.id);
    if (!TARIH.test(o.tarih || '')) h.push(`${y}: tarih YYYY, YYYY-AA ya da YYYY-AA-GG olmalı`);
    if (String(o.tarih) > DUNYA_SIMDISI) h.push(`${y}: tarih (${o.tarih}) dünyanın şimdisinden (${DUNYA_SIMDISI}) sonra`);
    if (String(o.tarih) < onceki) h.push(`${y}: zaman çizelgesi tarih sırasında değil`);
    onceki = String(o.tarih);
    if (!o.ad || !o.aciklama) h.push(`${y}: ad ve açıklama gerekli`);
    for (const sid of o.semtler || []) if (!semtIdler.has(sid)) h.push(`${y}: bilinmeyen semt "${sid}"`);
    for (const k of o.kancalar || []) if (!KIMLIK.test(k)) h.push(`${y}: kanca biçimi "${k}"`);
  }
  if (dunya.semtler) h.push(...semtDetayDogrula(dunya, semtIdler, olayIdler));
  return h;
}
