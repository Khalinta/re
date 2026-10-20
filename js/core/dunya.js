// Dünya kitabı: yükleme sonrası yardımcılar ve tutarlılık denetimi.
// "Hiçbir şey havada kalmasın": her başvuru (semt, olay, kurum...) gerçekten var olan bir şeye gitmeli.
// Denetim testlerde çalışır (tests/dunya.test.js); oyun açılışında da hafif bir denetim yapılabilir.

// Dünya kitabındaki olaylar bu tarihten sonra olamaz: oyun en erken bu tarihte başlar
// ve zaman çizelgesi "geçmiş"tir. (Oyun içinde dünya kendi ilerler; o olaylar kayda yazılır, buraya değil.)
export const DUNYA_SIMDISI = '2026-10-20';

const KIMLIK = /^[a-z][a-z0-9_]*$/;
const TARIH = /^\d{4}(-\d{2}(-\d{2})?)?$/;

export function semtBul(dunya, id) {
  return dunya?.sehir?.semtler?.find(s => s.id === id) ?? null;
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
  return h;
}
