// Türkçe dil yardımcıları: ünlü uyumuna göre ek getirme, büyük/küçük harf, sıralama.
//
// Kullanım:
//   ek('Ahmet', 'in')            -> "Ahmet'in"
//   ek('Kadıköy', 'e')           -> "Kadıköy'e"
//   ek(2026, 'de')               -> "2026'da"
//   ek('Kadıköy', ['de', 'ki'])  -> "Kadıköy'deki"
//   ek('kitap', 'i')             -> "kitabı"     (cins isim: kesme yok, yumuşama var)
//   ek('Çınaraltı Kahvesi', 'e', { iyelik: true }) -> "Çınaraltı Kahvesi'ne"
//
// Ekler kısa adla ('in', 'e', 'de'...) ya da kalıpla ('(y)lA', 'DAn') verilebilir.
// Kalıp harfleri: A = a/e, I = ı/i/u/ü, D = d/t, C = c/ç,
// (y) (n) (s) = sadece ünlüden sonra gelen kaynaştırma harfi, (I) = sadece ünsüzden sonra gelen ünlü.

const UNLULER = 'aeıioöuü';
const INCE = 'eiöü';
const SERT = 'fstkçşhp';

const KISA_EKLER = {
  in: '(n)In',      // ilgi: Ahmet'in, Ayşe'nin
  i: '(y)I',        // belirtme: Ali'yi, Ahmet'i
  e: '(y)A',        // yönelme: Kadıköy'e, Ankara'ya
  de: 'DA',         // bulunma: Gaziantep'te, İzmir'de
  den: 'DAn',       // ayrılma: Kars'tan, Bursa'dan
  le: '(y)lA',      // vasıta: Ali'yle, Ahmet'le
  ler: 'lAr',
  leri: 'lArI',
  li: 'lI',
  siz: 'sIz',
  lik: 'lIk',
  ci: 'CI',
  si: '(s)I',       // 3. tekil iyelik: annesi, babası
  im: '(I)m',
  in2: '(I)n',      // 2. tekil iyelik: evin
  imiz: '(I)mIz',
  iniz: '(I)nIz',
  dir: 'DIr',
  ki: 'ki',
  ce: 'CA',
  inci: '(I)ncI',   // sıra sayısı: 15'inci, 6'ncı
};

// 3. tekil iyelik ekiyle biten adlarda (Kalesi, Sarayı) kaynaştırma harfi n olur.
const IYELIK_EKLER = {
  '(y)A': 'nA',
  '(y)I': 'nI',
  'DA': 'ndA',
  'DAn': 'ndAn',
};

// Yapım ekleri özel isimden kesmeyle ayrılmaz (TDK): Ankaralı, Kadıköylü, İngilizce.
// Çokluk eki de kişi/yer adlarında ayrılmaz (Yılmazlar), ama sayı ve kısaltmalarda ayrılır (1990'lar, AVM'ler).
const YAPIM_EKLERI = new Set(['lI', 'sIz', 'lIk', 'CI', 'CA', 'CIk', 'gil']);

// Son hecesindeki ünlü kalın olduğu hâlde ince ek alan sözcükler (Kemal'e, saate, rolü).
const UYUM_ISTISNA = {
  kemal: 'e', celal: 'e', cemal: 'e', bilal: 'e', hilal: 'e', iclal: 'e', kemalettin: 'i',
  saat: 'e', hayal: 'e', ihtimal: 'e', hal: 'e', kabul: 'ü', rol: 'ü', gol: 'ü',
  alkol: 'ü', petrol: 'ü', kontrol: 'ü', protokol: 'ü', sembol: 'ü', futbol: 'ü',
  meal: 'e', misal: 'e', istiklal: 'e', helal: 'e', harf: 'e', kalp: 'e', golf: 'ü',
};

// Cins isimlerde ünsüz yumuşaması
const TEK_HECE_YUMUSAYAN = new Set(['dip', 'kap', 'uç', 'cep', 'dört', 'renk', 'kalp', 'yurt', 'kurt', 'dert', 'tat', 'denk', 'ahenk']);
const YUMUSAMAYAN = new Set(['hukuk', 'ahlak', 'merak', 'ittifak', 'sepet', 'tank', 'bank', 'park', 'golf', 'top', 'saç', 'at', 'ok', 'ip', 'kek']);
const T_YUMUSAYAN = new Set(['kanat', 'armut', 'yoğurt', 'bulut', 'umut', 'öğüt', 'kilit', 'geçit', 'yiğit', 'damat', 'dört', 'yurt', 'kurt', 'dert', 'tat']);

// Kısaltmaların harf okunuşları
const HARF_ADLARI = {
  a: 'a', b: 'be', c: 'ce', ç: 'çe', d: 'de', e: 'e', f: 'fe', g: 'ge', ğ: 'yumuşakge', h: 'he',
  ı: 'ı', i: 'i', j: 'je', k: 'ke', l: 'le', m: 'me', n: 'ne', o: 'o', ö: 'ö', p: 'pe', r: 're',
  s: 'se', ş: 'şe', t: 'te', u: 'u', ü: 'ü', v: 've', y: 'ye', z: 'ze', q: 'kü', w: 've', x: 'iks',
};
// Sözcük gibi okunan kısa kısaltmalar
const KISALTMA_OKUNUS = { meb: 'meb' };

const BIRLER = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const ONLAR = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];

export const kucuk = s => String(s).toLocaleLowerCase('tr-TR');
export const buyuk = s => String(s).toLocaleUpperCase('tr-TR');
export const basHarfBuyuk = s => { s = String(s); return s ? buyuk(s[0]) + s.slice(1) : s; };
export const baslik = s => String(s).split(' ').map(k => k ? buyuk(k[0]) + kucuk(k.slice(1)) : k).join(' ');

const COLLATOR = new Intl.Collator('tr-TR', { sensitivity: 'base', numeric: true });
export const karsilastir = (a, b) => COLLATOR.compare(String(a), String(b));
export function sirala(dizi, anahtar) {
  const al = typeof anahtar === 'function' ? anahtar : anahtar ? (o => o[anahtar]) : (o => o);
  return dizi.slice().sort((a, b) => COLLATOR.compare(String(al(a)), String(al(b))));
}

// Bir tam sayının okunuşundaki son sözcük: 2026 -> "altı", 40 -> "kırk", 1000 -> "bin"
export function sayiSonSozcuk(n) {
  n = Math.abs(Math.trunc(n));
  if (n === 0) return 'sıfır';
  if (n % 10) return BIRLER[n % 10];
  if (n % 100) return ONLAR[(n % 100) / 10];
  if (n % 1000) return 'yüz';
  if (n % 1e6) return 'bin';
  if (n % 1e9) return 'milyon';
  if (n % 1e12) return 'milyar';
  return 'trilyon';
}

const unluMu = h => UNLULER.includes(h);

function sadelestir(s) {
  return kucuk(s).replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u');
}

// Sayı biçimindeki metnin okunuşu: "1.250" -> bin..., "3,5" -> beş, "%50" -> elli, "250 ₺" -> lira
function sayiOkunusu(metin) {
  let m = String(metin).trim();
  if (/(₺|tl)$/i.test(m)) return 'lira';
  m = m.replace(/^%/, '').replace(/%$/, '');
  const [tam, ondalik] = m.split(',');
  if (ondalik && /[1-9]/.test(ondalik)) {
    return sayiSonSozcuk(parseInt(ondalik.replace(/0+$/, '') || '0', 10));
  }
  return sayiSonSozcuk(parseInt(tam.replace(/\./g, ''), 10));
}

const okunabilirMi = s => /^[^aeıioöuü]?([aeıioöuü][^aeıioöuü]{0,2})+$/.test(s) && !/([^aeıioöuü])\1$/.test(s);

// Ekin uyacağı okunuşu bulur (küçük harf, sadeleşmiş)
function okunusBul(kelime) {
  if (typeof kelime === 'number') return sayiOkunusu(String(kelime).replace('.', ','));
  const s = String(kelime).trim();
  const son = s.split(/\s+/).pop();
  if (/^[%]?[\d.,]+%?(\s*(₺|TL))?$/.test(s) || /^\d[\d.,]*$/.test(son)) return sayiOkunusu(/\d/.test(son) ? son : s);
  if (/₺$/.test(s)) return 'lira';
  // Kısaltma: tamamı büyük harf, en az 2 harf
  const harfler = son.replace(/[^A-Za-zÇĞİIÖŞÜçğıiöşü]/g, '');
  if (harfler.length >= 2 && harfler === buyuk(harfler) && harfler !== kucuk(harfler)) {
    const k = kucuk(harfler);
    if (KISALTMA_OKUNUS[k]) return KISALTMA_OKUNUS[k];
    if (k.length >= 4 && okunabilirMi(k)) return k;
    return HARF_ADLARI[k[k.length - 1]] || k;
  }
  return sadelestir(son);
}

function sonUnlu(s, istisna) {
  if (istisna) return istisna;
  for (let i = s.length - 1; i >= 0; i--) if (unluMu(s[i])) return s[i];
  return 'e';
}

const dortlu = u => ('aı'.includes(u) ? 'ı' : 'ei'.includes(u) ? 'i' : 'ou'.includes(u) ? 'u' : 'ü');
const ikili = u => (INCE.includes(u) ? 'e' : 'a');

function heceSayisi(s) {
  let n = 0;
  for (const h of s) if (unluMu(h)) n++;
  return n;
}

// Cins isimde ünsüz yumuşaması: kitap -> kitab, renk -> reng
function yumusat(kelime) {
  const k = sadelestir(kelime);
  if (YUMUSAMAYAN.has(k)) return kelime;
  const son = k[k.length - 1];
  const tekHece = heceSayisi(k) <= 1;
  if (tekHece && !TEK_HECE_YUMUSAYAN.has(k)) return kelime;
  const govde = kelime.slice(0, -1);
  if (son === 'p') return govde + 'b';
  if (son === 'ç') return govde + 'c';
  if (son === 't') return T_YUMUSAYAN.has(k) ? govde + 'd' : kelime;
  if (son === 'k') return govde + (k[k.length - 2] === 'n' ? 'g' : 'ğ');
  return kelime;
}

// Kalıbı mevcut okunuşa göre çözer. Döner: üretilen ek metni
function kalibiCoz(kalip, okunus, istisna) {
  let cikti = '';
  let i = 0;
  const birlesik = () => okunus + cikti;
  const sonHarf = () => { const b = birlesik(); return b[b.length - 1] || 'e'; };
  const uyum = () => sonUnlu(cikti ? birlesik() : okunus, cikti && /[aeıioöuü]/.test(cikti) ? null : istisna);

  while (i < kalip.length) {
    const c = kalip[i];
    if (c === '(') {
      const kapa = kalip.indexOf(')', i);
      const ic = kalip.slice(i + 1, kapa);
      const unluyleBaslar = ic[0] === 'I' || ic[0] === 'A' || unluMu(ic[0]);
      const sonUnluMu = unluMu(sonHarf());
      if (unluyleBaslar ? !sonUnluMu : sonUnluMu) cikti += kalibiCoz(ic, birlesik(), cikti ? null : istisna);
      i = kapa + 1;
      continue;
    }
    if (c === 'A') cikti += ikili(uyum());
    else if (c === 'I') cikti += dortlu(uyum());
    else if (c === 'D') cikti += SERT.includes(sonHarf()) ? 't' : 'd';
    else if (c === 'C') cikti += SERT.includes(sonHarf()) ? 'ç' : 'c';
    else cikti += c;
    i++;
  }
  return cikti;
}

// secenek.ozel: özel isim mi (kesme işareti, yumuşama yok). Verilmezse tahmin edilir:
//   büyük harfle başlayan, sayı ya da kısaltma ise özel isim sayılır.
// secenek.iyelik: ad 3. tekil iyelikle bitiyorsa (Sarayı, Kalesi) true.
// secenek.okunus: alışılmadık okunuşlu adlar için elle okunuş (ör. 'Bordeaux' -> 'bordo').
export function ek(kelime, ekler, secenek = {}) {
  const liste = Array.isArray(ekler) ? ekler : [ekler];
  const metin = String(kelime);
  const ozel = secenek.ozel ?? (typeof kelime === 'number' || /^[\d%A-ZÇĞİÖŞÜ]/.test(metin.trim()));
  const ilkKalip = KISA_EKLER[liste[0]] ?? liste[0];
  const sayiMi = /\d$/.test(metin.trim());
  const kisaltmaMi = /[A-ZÇĞİÖŞÜ]{2,}$/.test(metin.trim());
  const kesmesiz = YAPIM_EKLERI.has(ilkKalip) || (ilkKalip.startsWith('lAr') && !sayiMi && !kisaltmaMi);
  const tabanOkunus = secenek.okunus ? sadelestir(secenek.okunus) : okunusBul(kelime);
  const istisna = UYUM_ISTISNA[tabanOkunus];

  let govde = metin;
  let okunus = tabanOkunus;
  let ekMetni = '';

  liste.forEach((e, sira) => {
    let kalip = KISA_EKLER[e] ?? e;
    if (sira === 0 && secenek.iyelik && IYELIK_EKLER[kalip]) kalip = IYELIK_EKLER[kalip];
    if (sira === 0 && !ozel && (tabanOkunus === 'su' || tabanOkunus === 'ne') && kalip === '(n)In') kalip = 'yIn'; // suyun, neyin
    const uretilen = kalibiCoz(kalip, okunus, sira === 0 ? istisna : null);
    if (sira === 0 && !ozel && unluMu(uretilen[0])) {
      const yeni = yumusat(govde);
      okunus = okunus.slice(0, -1) + sadelestir(yeni).slice(-1);
      govde = yeni;
    }
    ekMetni += uretilen;
    okunus += uretilen;
  });

  return govde + (ozel && !kesmesiz && ekMetni ? "'" : '') + ekMetni;
}

// Kısayollar
export const ilgi = (k, s) => ek(k, 'in', s);
export const belirtme = (k, s) => ek(k, 'i', s);
export const yonelme = (k, s) => ek(k, 'e', s);
export const bulunma = (k, s) => ek(k, 'de', s);
export const ayrilma = (k, s) => ek(k, 'den', s);
