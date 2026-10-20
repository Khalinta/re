// Koşul dili: olayların, seçeneklerin ve aksiyonların ne zaman mümkün olduğunu anlatan JSON.
//
//   { "ve":   [ koşul, koşul, ... ] }        hepsi tutmalı (dizi yazmak da "ve" demektir)
//   { "veya": [ koşul, koşul, ... ] }        en az biri tutmalı
//   { "degil": koşul }                       tutmamalı
//   { "durum": { "enerji": { "min": 20 } } } yaprak kontrol (bir nesnede birden çok anahtar = "ve")
//
// Sayısal kurallar: 5 (eşit), { "min": 1, "max": 9 }, { "esit": 3 }, { "degil": 0 }, { "biri": [1, 2] }
// Metin kuralları:  "asci" (eşit), ["asci", "garson"] (biri), { "degil": "asci" }
//
// koşulAcikla() her düğüm için { tamam, aciklama, alt } ağacı döner; geliştirici panelindeki
// "bu olay neden tetiklenmedi?" ekranı bunu gösterir. kosulDogrula() veri dosyalarındaki yazım
// hatalarını (bilinmeyen anahtar, bozuk kural) testte yakalar.
//
// ctx = { durum, veri: { sim, takvim }, baglam: { npc: { rol: npcId }, ... } }
import { bayrakAl, sayacAl } from './bayrak.js';
import { tarihAl, dilim, mevsim, ozelGun, gunNo, gunDakikasi, yas as yasHesapla, isoTarih } from './zaman.js';

const GUN_ADLARI = ['pazar', 'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi'];
const MEVSIM_ADLARI = ['kis', 'ilkbahar', 'yaz', 'sonbahar'];
const DILIM_ADLARI = ['sabah', 'ogle', 'aksam', 'gece'];

// ------------------------------------------------------------- yardımcılar

export function yolAl(nesne, yol) {
  let x = nesne;
  for (const p of String(yol).split('.')) {
    if (x === null || x === undefined) return undefined;
    x = x[p];
  }
  return x;
}

const goster = v => (v === undefined ? 'yok' : typeof v === 'number' ? String(Math.round(v * 100) / 100) : Array.isArray(v) ? '[' + v.join(', ') + ']' : String(v));

// Bir değerin kurala uyup uymadığı. Döner: { tamam, kural: "≥ 20" gibi okunur metin }
export function kuralTut(deger, kural) {
  if (kural === null || typeof kural !== 'object' || Array.isArray(kural)) {
    if (Array.isArray(kural)) return { tamam: kural.includes(deger), kural: 'şunlardan biri: ' + kural.join(', ') };
    return { tamam: deger === kural, kural: '= ' + goster(kural) };
  }
  const parca = [];
  let tamam = true;
  if ('min' in kural) { parca.push('≥ ' + goster(kural.min)); if (!(typeof deger === 'number' && deger >= kural.min) && !(typeof deger === 'string' && deger >= kural.min)) tamam = false; }
  if ('max' in kural) { parca.push('≤ ' + goster(kural.max)); if (!(typeof deger === 'number' && deger <= kural.max) && !(typeof deger === 'string' && deger <= kural.max)) tamam = false; }
  if ('esit' in kural) { parca.push('= ' + goster(kural.esit)); if (deger !== kural.esit) tamam = false; }
  if ('degil' in kural) { parca.push('≠ ' + goster(kural.degil)); if (deger === kural.degil) tamam = false; }
  if ('biri' in kural) { parca.push('şunlardan biri: ' + kural.biri.join(', ')); if (!kural.biri.includes(deger)) tamam = false; }
  if ('var' in kural) { parca.push(kural.var ? 'var' : 'yok'); if ((deger !== undefined && deger !== null && deger !== false) !== !!kural.var) tamam = false; }
  return { tamam, kural: parca.join(' ve ') };
}

const KURAL_ANAHTARLARI = new Set(['min', 'max', 'esit', 'degil', 'biri', 'var']);
function kuralGecerliMi(kural) {
  if (kural === null || typeof kural !== 'object') return true;
  if (Array.isArray(kural)) return true;
  return Object.keys(kural).length > 0 && Object.keys(kural).every(k => KURAL_ANAHTARLARI.has(k));
}

function yaprak(tamam, aciklama) { return { tamam: !!tamam, aciklama }; }
function deger(ad, d, kural) {
  const r = kuralTut(d, kural);
  return yaprak(r.tamam, `${ad} ${r.kural} (şu an ${goster(d)})`);
}

// Zamanla ilgili türetilmiş bilgiler (her değerlendirmede bir kez hesaplanır)
function zamanBilgisi(ctx) {
  if (ctx._zaman) return ctx._zaman;
  const d = ctx.durum;
  const t = tarihAl(d.zaman.baslangic, d.zaman.dakika);
  ctx._zaman = {
    t, dakika: d.zaman.dakika, gunDk: gunDakikasi(d.zaman.dakika), dilim: dilim(d.zaman.dakika).id,
    gun: GUN_ADLARI[t.getUTCDay()], mevsim: mevsim(t), ozel: ozelGun(ctx.veri?.takvim, t), oyunGunu: gunNo(d.zaman.dakika) + 1, iso: isoTarih(t),
  };
  return ctx._zaman;
}

const saatDk = s => { const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); };
const npcId = (ctx, ref) => ctx.baglam?.npc?.[ref] ?? ref;

// Durum adını veri dosyasından okunur hale getir ("aclik" -> "Açlık")
const durumAdi = (ctx, k) => ctx.veri?.sim?.durumlar?.[k]?.ad || k;

// Bir haritanın (ör. { enerji: kural, aclik: kural }) her anahtarını kontrol eder
function haritaKontrol(harita, al, ad) {
  const alt = Object.entries(harita).map(([k, kural]) => deger(ad(k), al(k), kural));
  return { tamam: alt.every(x => x.tamam), aciklama: alt.map(x => x.aciklama).join('; '), alt: alt.length > 1 ? alt : undefined };
}

// ------------------------------------------------------------- yaprak kontroller
// Her biri: (arg, ctx) => { tamam, aciklama }. Yeni kontrol eklemek = buraya bir satır.

export const KONTROLLER = {
  // { "durum": { "enerji": { "min": 20 } } }
  durum: (a, ctx) => haritaKontrol(a, k => ctx.durum.durumlar[k], k => durumAdi(ctx, k)),

  // { "beceri": { "yemek": { "min": 30 } } }   (öğrenilmemiş beceri 0 sayılır)
  beceri: (a, ctx) => haritaKontrol(a, k => ctx.durum.beceriler?.[k] ?? 0, k => 'beceri:' + k),

  // { "para": { "min": 1000 } }
  para: (a, ctx) => deger('para', ctx.durum.para, a),

  // { "bayrak": "ad" }  |  { "bayrak": { "ad": "x", "deger": 2, "npc": "patron" } }  |  { "bayrak": { "ad": "x", "var": false } }
  bayrak: (a, ctx) => {
    const o = typeof a === 'string' ? { ad: a } : a;
    const npc = o.npc !== undefined ? npcId(ctx, o.npc) : undefined;
    const v = bayrakAl(ctx.durum, o.ad, { npc });
    const ad = `bayrak ${o.ad}${npc !== undefined ? ' (npc ' + npc + ')' : ''}`;
    if ('deger' in o) return deger(ad, v, o.deger);
    const isteniyor = o.var !== false;
    const var_ = v !== undefined && v !== false;
    return yaprak(var_ === isteniyor, `${ad} ${isteniyor ? 'olmalı' : 'olmamalı'} (şu an ${var_ ? 'var: ' + goster(v) : 'yok'})`);
  },

  // { "sayac": { "kahve_sohbeti": { "min": 3 } } }  |  { "sayac": { "ad": "x", "npc": "patron", "kural": { "min": 2 } } }
  sayac: (a, ctx) => {
    if ('ad' in a && 'kural' in a) {
      const npc = a.npc !== undefined ? npcId(ctx, a.npc) : undefined;
      return deger(`sayaç ${a.ad}${npc !== undefined ? ' (npc ' + npc + ')' : ''}`, sayacAl(ctx.durum, a.ad, { npc }), a.kural);
    }
    return haritaKontrol(a, k => sayacAl(ctx.durum, k), k => 'sayaç ' + k);
  },

  // { "iliski": { "npc": "patron", "guven": { "min": 30 }, "tur": "arkadas" } }   (NPC sistemi Faz 3–4)
  iliski: (a, ctx) => {
    const id = npcId(ctx, a.npc);
    const n = ctx.durum.npcler?.[id];
    const { npc: _, ...kurallar } = a;
    if (!n) return yaprak(false, `ilişki: npc ${id} tanınmıyor`);
    const iliski = { ...(n.iliski || {}), tur: n.iliskiTuru };
    return haritaKontrol(kurallar, k => iliski[k], k => `ilişki(${id}).${k}`);
  },

  // { "mekan": "kahve_cinaralti" } | { "mekanTuru": ["kahvehane", "lokanta"] } | { "semt": "eski_carsi" }   (konum Faz 2)
  mekan: (a, ctx) => deger('mekan', ctx.durum.konum?.mekan ?? ctx.baglam?.mekan, a),
  mekanTuru: (a, ctx) => deger('mekan türü', ctx.durum.konum?.mekanTuru ?? ctx.baglam?.mekanTuru, a),
  semt: (a, ctx) => deger('semt', ctx.durum.konum?.semt ?? ctx.baglam?.semt, a),

  // { "zamanDilimi": ["ogle", "aksam"] }
  zamanDilimi: (a, ctx) => deger('dilim', zamanBilgisi(ctx).dilim, a),

  // { "saat": { "min": "22:00", "max": "03:00" } }   (gece yarısını aşan aralık desteklenir)
  saat: (a, ctx) => {
    const z = zamanBilgisi(ctx);
    const simdi = z.gunDk;
    const hh = String(Math.floor(simdi / 60)).padStart(2, '0') + ':' + String(simdi % 60).padStart(2, '0');
    const bas = a.min !== undefined ? saatDk(a.min) : 0, bit = a.max !== undefined ? saatDk(a.max) : 1439;
    const tamam = bas <= bit ? simdi >= bas && simdi <= bit : simdi >= bas || simdi <= bit;
    return yaprak(tamam, `saat ${a.min ?? '00:00'}–${a.max ?? '23:59'} arası (şu an ${hh})`);
  },

  // { "gun": ["cumartesi", "pazar"] }  |  { "haftaSonu": true }
  gun: (a, ctx) => deger('gün', zamanBilgisi(ctx).gun, a),
  haftaSonu: (a, ctx) => {
    const g = zamanBilgisi(ctx).gun;
    const hs = g === 'cumartesi' || g === 'pazar';
    return yaprak(hs === !!a, `hafta sonu ${a ? 'olmalı' : 'olmamalı'} (bugün ${g})`);
  },

  // { "mevsim": "kis" }
  mevsim: (a, ctx) => deger('mevsim', zamanBilgisi(ctx).mevsim, a),

  // { "tatil": true } (herhangi bir resmi tatil)  |  { "tatil": "Cumhuriyet Bayramı" }  |  { "tatil": false }
  tatil: (a, ctx) => {
    const oz = zamanBilgisi(ctx).ozel;
    const resmi = oz.filter(o => o.tur === 'resmi');
    const adlar = oz.map(o => o.ad);
    let tamam;
    if (a === true) tamam = resmi.length > 0;
    else if (a === false) tamam = resmi.length === 0;
    else tamam = (Array.isArray(a) ? a : [a]).some(x => adlar.includes(x));
    return yaprak(tamam, `tatil/özel gün ${goster(a)} (bugün: ${adlar.join(', ') || 'yok'})`);
  },

  // { "tarih": { "min": "2026-11-01" } }   (YYYY-AA-GG metin karşılaştırması)
  tarih: (a, ctx) => deger('tarih', zamanBilgisi(ctx).iso, a),

  // { "oyunGunu": { "min": 7 } }   (başlangıç günü = 1)
  oyunGunu: (a, ctx) => deger('oyun günü', zamanBilgisi(ctx).oyunGunu, a),

  // { "yas": { "min": 18 } }
  yas: (a, ctx) => deger('yaş', ctx.durum.karakter?.dogum ? yasHesapla(ctx.durum.karakter.dogum, zamanBilgisi(ctx).t) : undefined, a),

  // { "gecmis": { "eskiMeslek": "asci", "kusurlar": "kumar" } }   (başlangıç hikayesi bileşenleri, Faz 3)
  // Bileşen bir diziyse "içeriyor mu" diye bakılır.
  gecmis: (a, ctx) => {
    const g = ctx.durum.karakter?.gecmis || {};
    const alt = Object.entries(a).map(([k, kural]) => {
      const v = g[k];
      if (Array.isArray(v) && (typeof kural === 'string' || Array.isArray(kural))) {
        const aranan = Array.isArray(kural) ? kural : [kural];
        return yaprak(aranan.some(x => v.includes(x)), `geçmiş.${k} içinde ${aranan.join(' ya da ')} (şu an ${goster(v)})`);
      }
      return deger('geçmiş.' + k, v, kural);
    });
    return { tamam: alt.every(x => x.tamam), aciklama: alt.map(x => x.aciklama).join('; ') };
  },

  // { "olay": { "id": "mutfak_yangini", "kez": { "min": 1 } } }  |  { "olay": { "id": "x", "gecenGun": { "min": 30 } } }
  olay: (a, ctx) => {
    const g = ctx.durum.olayGecmisi?.[a.id];
    const alt = [];
    if ('kez' in a) alt.push(deger(`olay ${a.id} kaç kez`, g?.kez ?? 0, a.kez));
    if ('gecenGun' in a) alt.push(deger(`olay ${a.id} üzerinden geçen gün`, g ? Math.floor((ctx.durum.zaman.dakika - g.son) / 1440) : undefined, a.gecenGun));
    if (!alt.length) alt.push(yaprak(!!g, `olay ${a.id} yaşanmış olmalı (${g ? 'yaşandı' : 'yaşanmadı'})`));
    return { tamam: alt.every(x => x.tamam), aciklama: alt.map(x => x.aciklama).join('; ') };
  },

  // Genel yol kontrolü: durumdaki herhangi bir alan. { "deger": "suc.aranma", "min": 3 }
  deger: (a, ctx) => {
    const { deger: yol, ...kural } = a;
    return deger(yol, yolAl(ctx.durum, yol), Object.keys(kural).length ? kural : { var: true });
  },

  // Hikaye yayı: { "yay": { "id": "apartman_borcu", "asama": ["borclu", "ertelendi"] } }
  //   | { "yay": { "id": "x", "durum": "yok" | "aktif" | "bitti" } } | { "yay": { "id": "x", "sonuc": "odendi" } }
  yay: (a, ctx) => {
    const y = ctx.durum.yaylar?.[a.id];
    const hal = !y ? 'yok' : y.bitti ? 'bitti' : 'aktif';
    const alt = [];
    if ('durum' in a) alt.push(deger(`yay ${a.id} durumu`, hal, a.durum));
    if ('asama' in a) alt.push(deger(`yay ${a.id} aşaması`, y && !y.bitti ? y.asama : undefined, a.asama));
    if ('sonuc' in a) alt.push(deger(`yay ${a.id} sonucu`, y?.bitti?.sonuc, a.sonuc));
    if (!alt.length) alt.push(yaprak(hal === 'aktif', `yay ${a.id} sürüyor olmalı (${hal})`));
    return { tamam: alt.every(x => x.tamam), aciklama: alt.map(x => x.aciklama).join('; ') };
  },

  // ---- Suç dünyası kısa yazımları (sistemler Faz 4'te; alanlar yoksa "yok" sayılır) ----
  // { "aranma": { "min": 2 } }
  aranma: (a, ctx) => deger('aranma seviyesi', ctx.durum.suc?.aranma ?? 0, a),
  // { "karaPara": { "min": 10000 } }
  karaPara: (a, ctx) => deger('kara para', ctx.durum.suc?.karaPara ?? 0, a),
  // { "sabika": true } | { "sabika": false } | { "sabika": "hirsizlik" } | { "sabika": { "min": 2 } } (kayıt sayısı)
  sabika: (a, ctx) => {
    const l = ctx.durum.suc?.sabika || [];
    if (a === true || a === false) return yaprak((l.length > 0) === a, `sabıka ${a ? 'olmalı' : 'olmamalı'} (${l.length} kayıt)`);
    if (typeof a === 'string' || Array.isArray(a)) {
      const ar = Array.isArray(a) ? a : [a];
      return yaprak(l.some(s => ar.includes(s.tur)), `sabıkada ${ar.join(' ya da ')} (şu an ${goster(l.map(s => s.tur))})`);
    }
    return deger('sabıka kayıt sayısı', l.length, a);
  },
  // { "orgut": true } (herhangi birine üye) | { "orgut": { "id": "demirciler", "rutbe": { "min": 2 }, "guven": { "min": 40 } } }
  //  | { "orgut": { "id": "demirciler", "uye": false } }
  orgut: (a, ctx) => {
    const ou = ctx.durum.suc?.orgutler || {};
    if (a === true || a === false) {
      const var_ = Object.values(ou).some(o => o.uye);
      return yaprak(var_ === a, `bir örgüte üyelik ${a ? 'olmalı' : 'olmamalı'}`);
    }
    const o = ou[a.id];
    const { id, uye, ...kurallar } = a;
    const uyeMi = !!o?.uye;
    const alt = [yaprak(uyeMi === (uye !== false), `örgüt ${id} üyeliği ${uye === false ? 'olmamalı' : 'olmalı'} (${uyeMi ? 'üye' : 'üye değil'})`)];
    for (const [k, kural] of Object.entries(kurallar)) alt.push(deger(`örgüt ${id}.${k}`, o?.[k], kural));
    return { tamam: alt.every(x => x.tamam), aciklama: alt.map(x => x.aciklama).join('; ') };
  },
};

const MANTIK = new Set(['ve', 'veya', 'degil']);

// ------------------------------------------------------------- değerlendirme

export function kosulAcikla(kosul, ctx) {
  if (kosul === undefined || kosul === null || kosul === true) return { tamam: true, aciklama: 'koşul yok' };
  if (kosul === false) return { tamam: false, aciklama: 'hiçbir zaman' };
  if (Array.isArray(kosul)) return kosulAcikla({ ve: kosul }, ctx);
  if (typeof kosul !== 'object') return { tamam: false, aciklama: 'geçersiz koşul: ' + goster(kosul) };

  // Genel yol kontrolü tek bir yapraktır: { "deger": "a.b", "min": 1 } bölünmez
  if ('deger' in kosul) return KONTROLLER.deger(kosul, ctx);
  const anahtarlar = Object.keys(kosul);
  if (anahtarlar.length > 1) return kosulAcikla({ ve: anahtarlar.map(k => ({ [k]: kosul[k] })) }, ctx);
  const [k] = anahtarlar;
  const v = kosul[k];
  if (k === 've') {
    const alt = v.map(x => kosulAcikla(x, ctx));
    return { tamam: alt.every(x => x.tamam), aciklama: 'hepsi', alt };
  }
  if (k === 'veya') {
    const alt = v.map(x => kosulAcikla(x, ctx));
    return { tamam: alt.some(x => x.tamam), aciklama: 'en az biri', alt };
  }
  if (k === 'degil') {
    const ic = kosulAcikla(v, ctx);
    return { tamam: !ic.tamam, aciklama: 'tutmamalı', alt: [ic] };
  }
  const kontrol = KONTROLLER[k];
  if (!kontrol) return { tamam: false, aciklama: 'bilinmeyen koşul: ' + k };
  try { return kontrol(v, ctx); } catch (e) { return { tamam: false, aciklama: `koşul ${k} değerlendirilemedi: ${e.message}` }; }
}

export const kosulTutar = (kosul, ctx) => kosulAcikla(kosul, ctx).tamam;

// Açıklama ağacını okunur satırlara çevirir (geliştirici paneli, hata raporu)
export function aciklamaMetni(ag, girinti = 0) {
  const on = '  '.repeat(girinti) + (ag.tamam ? '✓ ' : '✗ ');
  const satirlar = [on + ag.aciklama];
  for (const a of ag.alt || []) satirlar.push(aciklamaMetni(a, girinti + 1));
  return satirlar.join('\n');
}

// Sadece tutmayan dalları gösterir: "neden tetiklenmedi?"
export function nedenTutmadi(ag) {
  if (ag.tamam) return [];
  if (!ag.alt) return [ag.aciklama];
  if (ag.aciklama === 'en az biri') return ['şunlardan hiçbiri tutmadı: ' + ag.alt.flatMap(nedenTutmadi).join(' | ')];
  if (ag.aciklama === 'tutmamalı') return ['tutmaması gerekirken tuttu: ' + ag.alt[0].aciklama];
  return ag.alt.flatMap(nedenTutmadi);
}

// ------------------------------------------------------------- doğrulama (veri dosyaları için)

export function kosulDogrula(kosul, yol = 'kosul') {
  const hatalar = [];
  const gez = (k, y) => {
    if (k === undefined || k === null || typeof k === 'boolean') return;
    if (Array.isArray(k)) { k.forEach((x, i) => gez(x, `${y}[${i}]`)); return; }
    if (typeof k !== 'object') { hatalar.push(`${y}: koşul nesne olmalı`); return; }
    if (!Object.keys(k).length) hatalar.push(`${y}: boş koşul`);
    if ('deger' in k) {
      const { deger: yol, ...kural } = k;
      if (typeof yol !== 'string') hatalar.push(`${y}.deger: yol ("deger": "a.b") gerekli`);
      if (Object.keys(kural).length && !kuralGecerliMi(kural)) hatalar.push(`${y}: bozuk kural`);
      return;
    }
    for (const [a, v] of Object.entries(k)) {
      if (MANTIK.has(a)) {
        if (a === 'degil') gez(v, `${y}.degil`);
        else if (!Array.isArray(v) || !v.length) hatalar.push(`${y}.${a}: boş olmayan dizi olmalı`);
        else v.forEach((x, i) => gez(x, `${y}.${a}[${i}]`));
        continue;
      }
      if (!KONTROLLER[a]) { hatalar.push(`${y}: bilinmeyen koşul "${a}"`); continue; }
      if (['durum', 'beceri'].includes(a)) {
        if (typeof v !== 'object' || Array.isArray(v)) hatalar.push(`${y}.${a}: { ad: kural } biçiminde olmalı`);
        else for (const [ad, kural] of Object.entries(v)) if (!kuralGecerliMi(kural)) hatalar.push(`${y}.${a}.${ad}: bozuk kural`);
      }
      if (['para', 'oyunGunu', 'yas', 'aranma', 'karaPara'].includes(a) && !kuralGecerliMi(v)) hatalar.push(`${y}.${a}: bozuk kural`);
      if (a === 'bayrak' && typeof v !== 'string' && !(v && typeof v === 'object' && typeof v.ad === 'string')) hatalar.push(`${y}.bayrak: ad gerekli`);
      if (a === 'zamanDilimi') for (const x of [].concat(v.biri || v)) if (typeof x === 'string' && !DILIM_ADLARI.includes(x)) hatalar.push(`${y}.zamanDilimi: bilinmeyen dilim "${x}"`);
      if (a === 'mevsim') for (const x of [].concat(v.biri || v)) if (typeof x === 'string' && !MEVSIM_ADLARI.includes(x)) hatalar.push(`${y}.mevsim: bilinmeyen mevsim "${x}"`);
      if (a === 'gun') for (const x of [].concat(v.biri || v)) if (typeof x === 'string' && !GUN_ADLARI.includes(x)) hatalar.push(`${y}.gun: bilinmeyen gün "${x}" (Türkçe karakter kullanma: sali, carsamba, persembe)`);
      if (a === 'saat') for (const s of [v.min, v.max]) if (s !== undefined && !/^\d{1,2}:\d{2}$/.test(s)) hatalar.push(`${y}.saat: "SS:DD" biçiminde olmalı`);
      if (a === 'olay' && typeof v?.id !== 'string') hatalar.push(`${y}.olay: id gerekli`);
      if (a === 'orgut' && typeof v === 'object' && typeof v.id !== 'string') hatalar.push(`${y}.orgut: id gerekli`);
      if (a === 'iliski' && v?.npc === undefined) hatalar.push(`${y}.iliski: npc gerekli`);
      if (a === 'yay' && typeof v?.id !== 'string') hatalar.push(`${y}.yay: id gerekli`);
      if (a === 'yay' && v?.durum !== undefined && ![].concat(v.durum.biri || v.durum).every(x => ['yok', 'aktif', 'bitti'].includes(x))) hatalar.push(`${y}.yay: durum yok/aktif/bitti olmalı`);
    }
  };
  gez(kosul, yol);
  return hatalar;
}
