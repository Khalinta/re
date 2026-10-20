// Olay motoru: uygun olayı seçer, çok sahneli olayları yürütür, seçim sonuçlarını uygular.
//
// Olay (data/olaylar/*.json):
// {
//   "id", "baslik", "etiketler": [...],
//   "tetik": "otomatik" | "aksiyon:<aksiyonId>" | "zamanlayici" | "zincir"   (varsayılan otomatik)
//   "kosul": koşul dili, "agirlik": 10 | { "temel": 10, "carpanlar": [{ "kosul": ..., "carpan": 2 }] },
//   "bekleme": { "gun": 30 }, "tekrar": false | true | 3 (en çok kaç kez; varsayılan false = bir kez),
//   "baslangic": "giris",
//   "sahneler": {
//     "giris": {
//       "metin": varyasyonlar, "etki": [...],
//       "secenekler": [{
//          "metin", "alt", "kosul", "gizle": true (koşul tutmazsa hiç gösterme), "kosulSebep",
//          "maliyet": { "dakika", "para", "enerji" },
//          "etki": [...], "sonuc": varyasyonlar, "git": "sahne",
//          "kontrol": { "beceri": "yemek", "zorluk": 40, "durum": { "ozguven": 0.2 }, "bonus": [{ "kosul", "deger" }], "sans": 0.3 },
//          "basari": { "sonuc", "etki", "git" }, "basarisiz": { ... },
//          "sonuclar": [{ "agirlik", "kosul", "sonuc", "etki", "git" }]     (ağırlıklı rastgele dallar)
//       }],
//       "git": "sahne" (seçenek yoksa otomatik geçiş), "son": true
//     }
//   }
// }
//
// Metin varyasyonları: "tek metin" | ["çeşit 1", "çeşit 2"] — her çeşit bir metin, bir paragraf nesnesi
// ({ "tur": "konusma", "konusan": "...", "metin": "..." }) ya da birden çok paragraflık bir dizi olabilir.
//
// Etkin olay kayda yazılır (durum.aktifOlay): uygulama olay ortasında kapansa da aynı sahneden sürer.
import { kosulAcikla, nedenTutmadi } from './kosul.js';
import { etkileriUygula, sureDk } from './etki.js';
import { zamanGecir, sinirla } from './simulasyon.js';
import { para as paraYaz } from './format.js';
import { metinCoz } from './metin.js';

export const VARSAYILAN_BASLANGIC = 'giris';

// Metin çözümü js/core/metin.js'te (ton, koşullu çeşit, şablon)
export { metinCoz };

// ------------------------------------------------------------- uygunluk ve seçim

const ctxYap = (durum, veri, baglam) => ({ durum, veri, baglam });

export function agirlikHesapla(olay, ctx) {
  const a = olay.agirlik ?? 10;
  if (typeof a === 'number') return a;
  let w = a.temel ?? 10;
  for (const c of a.carpanlar || []) if (kosulAcikla(c.kosul, ctx).tamam) w *= c.carpan;
  return w;
}

// Döner: { uygun, nedenler: [teknik açıklama], agirlik }
// Olayın geçtiği yer (2.8): "yer": "ev" → yalnızca oyuncu evdeyken; "sokak" → evde ya da bir mekanda değilken.
// Konumu olmayan eski durumlarda (testler) her yer tutar.
export const OLAY_YERLERI = ['ev', 'sokak'];
export function olayYeriTutuyor(durum, olay) {
  if (!olay.yer || !durum.konum) return true;
  return olay.yer === 'ev' ? durum.konum.mekan === 'ev' : durum.konum.mekan === null;
}

export function olayUygunluk(durum, olay, veri, { tetik = 'otomatik', baglam } = {}) {
  const nedenler = [];
  const olayTetik = olay.tetik || 'otomatik';
  if (tetik !== '*' && olayTetik !== tetik) nedenler.push(`tetik "${olayTetik}" (istenen "${tetik}")`);
  const g = durum.olayGecmisi[olay.id];
  const tekrar = olay.tekrar ?? false;
  if (g) {
    if (tekrar === false && g.kez >= 1) nedenler.push('bir kez olur, zaten oldu');
    if (typeof tekrar === 'number' && g.kez >= tekrar) nedenler.push(`en çok ${tekrar} kez olur (${g.kez} oldu)`);
    const bekleme = sureDk(olay.bekleme);
    if (bekleme && durum.zaman.dakika - g.son < bekleme) {
      const kalan = bekleme - (durum.zaman.dakika - g.son);
      nedenler.push(`bekleme süresi dolmadı (${Math.ceil(kalan / 60)} saat kaldı)`);
    }
  }
  if (!olayYeriTutuyor(durum, olay)) nedenler.push(`yer: ${olay.yer} (şu an ${durum.konum.mekan === 'ev' ? 'evde' : durum.konum.mekan || 'sokakta'})`);
  const ctx = ctxYap(durum, veri, baglam);
  const ag = kosulAcikla(olay.kosul, ctx);
  if (!ag.tamam) nedenler.push(...nedenTutmadi(ag).map(n => 'koşul: ' + n));
  const agirlik = agirlikHesapla(olay, ctx);
  if (agirlik <= 0) nedenler.push('ağırlık 0');
  return { uygun: nedenler.length === 0, nedenler, agirlik };
}

export function olaySec(durum, veri, rng, { tetik = 'otomatik', baglam } = {}) {
  const adaylar = [];
  for (const o of Object.values(veri.olaylar || {})) {
    const u = olayUygunluk(durum, o, veri, { tetik, baglam });
    if (u.uygun) adaylar.push({ o, agirlik: u.agirlik });
  }
  return rng.agirlikliSec(adaylar, x => x.agirlik)?.o ?? null;
}

// ------------------------------------------------------------- kontroller (beceri / şans)

export function kontrolOlasiligi(kontrol, ctx) {
  let p;
  if (kontrol.sans !== undefined) {
    p = kontrol.sans;
    for (const b of kontrol.bonus || []) if (kosulAcikla(b.kosul, ctx).tamam) p += b.deger / 100;
  } else {
    let puan = kontrol.beceri ? (ctx.durum.beceriler?.[kontrol.beceri] ?? 0) : 0;
    for (const [k, carpan] of Object.entries(kontrol.durum || {})) puan += (ctx.durum.durumlar[k] ?? 0) * carpan;
    for (const b of kontrol.bonus || []) if (kosulAcikla(b.kosul, ctx).tamam) puan += b.deger;
    p = 0.5 + (puan - (kontrol.zorluk ?? 50)) / 60;
  }
  return Math.max(0.05, Math.min(0.95, p));
}

// Oyuncuya yüzde değil, his: "riskli görünüyor"
export function zorlukIfadesi(p) {
  if (p >= 0.8) return 'Elinden gelir.';
  if (p >= 0.6) return 'Büyük ihtimalle olur.';
  if (p >= 0.4) return 'Yazı tura.';
  if (p >= 0.2) return 'Riskli görünüyor.';
  return 'Neredeyse imkânsız gibi.';
}

// ------------------------------------------------------------- yürütme

function olayAl(veri, id) {
  const o = veri.olaylar?.[id];
  if (!o) throw new Error('Bilinmeyen olay: ' + id);
  return o;
}

function notlariEkle(paragraflar, sonuc, rng, ctx) {
  for (const n of sonuc.notlar) paragraflar.push({ tur: 'sistem', metin: n });
  for (const u of sonuc.uyarilar) paragraflar.push(...metinCoz(u.metin, rng, ctx).map(p => ({ ...p, tur: 'icses' })));
}

// Sahneye girer: metni yazar, giriş etkilerini uygular. Seçeneksiz sahnede "git" ile devam eder.
function sahneyeGir(durum, olay, sahneId, veri, rng, paragraflar, zincir) {
  let id = sahneId;
  for (let adim = 0; adim < 50; adim++) {
    const sahne = olay.sahneler?.[id];
    if (!sahne) throw new Error(`Olay ${olay.id}: sahne yok "${id}"`);
    durum.aktifOlay.sahne = id;
    paragraflar.push(...metinCoz(sahne.metin, rng, { durum, veri, baglam: durum.aktifOlay.baglam }));
    if (sahne.etki) {
      const sctx = { durum, veri, baglam: durum.aktifOlay.baglam, olayId: olay.id };
      const s = etkileriUygula(sahne.etki, sctx);
      notlariEkle(paragraflar, s, rng, sctx);
      zincir.push(...s.zincir);
    }
    const secenekVar = (sahne.secenekler || []).length > 0;
    if (secenekVar && !sahne.son) return false;
    if (sahne.git && !sahne.son) { id = sahne.git; continue; }
    return true; // olay bitti
  }
  throw new Error(`Olay ${olay.id}: sahne döngüsü`);
}

function bitir(durum, zincir) {
  durum.aktifOlay = null;
  return { bitti: true, zincir };
}

// Olayı başlatır. Döner: { paragraflar, bitti, zincir }
export function olayBaslat(durum, olayId, veri, rng, baglam = {}) {
  const olay = olayAl(veri, olayId);
  const g = durum.olayGecmisi[olay.id] || { kez: 0 };
  durum.olayGecmisi[olay.id] = { son: durum.zaman.dakika, kez: g.kez + 1 };
  durum.aktifOlay = { id: olay.id, sahne: olay.baslangic || VARSAYILAN_BASLANGIC, baglam };
  const paragraflar = [];
  const zincir = [];
  if (olay.baslik) paragraflar.push({ tur: 'olayBaslik', metin: olay.baslik });
  const bitti = sahneyeGir(durum, olay, durum.aktifOlay.sahne, veri, rng, paragraflar, zincir);
  if (bitti) return { paragraflar, ...bitir(durum, zincir) };
  return { paragraflar, bitti: false, zincir };
}

// Etkin olayın şu anki seçenekleri (saf: durum değişmez). Gizli seçenekler listede yoktur;
// 'sira' asıl dizideki yerdir, seçerken o kullanılır.
export function olaySecenekleri(durum, veri) {
  const ao = durum.aktifOlay;
  if (!ao) return [];
  const olay = olayAl(veri, ao.id);
  const sahne = olay.sahneler[ao.sahne];
  const ctx = ctxYap(durum, veri, ao.baglam);
  const liste = [];
  (sahne.secenekler || []).forEach((s, sira) => {
    const ag = kosulAcikla(s.kosul, ctx);
    if (!ag.tamam && s.gizle) return;
    const m = s.maliyet || {};
    let devreDisi = !ag.tamam, sebep = !ag.tamam ? (s.kosulSebep || 'Bunu şu an yapamazsın.') : undefined;
    if (!devreDisi && m.para && durum.para < m.para) { devreDisi = true; sebep = `Cebinde ${paraYaz(m.para)} yok.`; }
    if (!devreDisi && m.enerji && durum.durumlar.enerji < m.enerji) { devreDisi = true; sebep = 'Buna enerjin yetmez.'; }
    const ipucu = s.kontrol && olay.ipucu !== false ? zorlukIfadesi(kontrolOlasiligi(s.kontrol, ctx)) : undefined;
    liste.push({ sira, metin: s.metin, alt: [s.alt, ipucu].filter(Boolean).join(' ') || undefined, maliyet: m, devreDisi, sebep, teknik: !ag.tamam ? nedenTutmadi(ag) : undefined });
  });
  return liste;
}

// Bir seçeneği seçer. Döner: { paragraflar, bitti, zincir }
export function olaySecenegiSec(durum, veri, rng, sira) {
  const ao = durum.aktifOlay;
  if (!ao) throw new Error('Etkin olay yok');
  const olay = olayAl(veri, ao.id);
  const sahne = olay.sahneler[ao.sahne];
  const s = sahne.secenekler?.[sira];
  if (!s) throw new Error(`Olay ${olay.id}/${ao.sahne}: seçenek yok (${sira})`);
  const uygun = olaySecenekleri(durum, veri).find(x => x.sira === sira);
  if (!uygun || uygun.devreDisi) return { paragraflar: [], bitti: false, zincir: [], reddedildi: uygun?.sebep || 'Bu seçenek şu an yok.' };

  const ctx = { durum, veri, baglam: ao.baglam, olayId: olay.id };
  const paragraflar = [{ tur: 'secim', metin: s.metin }];
  const zincir = [];

  // Bedel
  const m = s.maliyet || {};
  if (m.para) { durum.para -= m.para; paragraflar.push({ tur: 'sistem', metin: '−' + paraYaz(m.para) }); }
  if (m.enerji) durum.durumlar.enerji = sinirla(durum.durumlar.enerji - m.enerji);
  if (m.dakika && veri.sim) for (const u of zamanGecir(durum, m.dakika, m.tur || 'normal', veri.sim)) paragraflar.push(...metinCoz(u.metin, rng, ctx).map(p => ({ ...p, tur: 'icses' })));

  // Dal seçimi: kontrol, ağırlıklı sonuçlar ya da seçeneğin kendisi
  let dal = s;
  if (s.kontrol) {
    const p = kontrolOlasiligi(s.kontrol, ctx);
    const basarili = rng.sayi() < p;
    dal = (basarili ? s.basari : s.basarisiz) || {};
    if (s.kontrol.beceri && s.kontrol.deneyim !== 0) {
      const k = s.kontrol.beceri;
      durum.beceriler[k] = sinirla((durum.beceriler[k] ?? 0) + (s.kontrol.deneyim ?? (basarili ? 1 : 0.5)));
    }
    if (s.etki) {
      const e = etkileriUygula(s.etki, ctx);
      notlariEkle(paragraflar, e, rng, ctx);
      zincir.push(...e.zincir);
    }
  } else if (s.sonuclar) {
    const uygunlar = s.sonuclar.filter(x => kosulAcikla(x.kosul, ctx).tamam);
    dal = rng.agirlikliSec(uygunlar, x => x.agirlik ?? 1) || {};
    if (s.etki) {
      const e = etkileriUygula(s.etki, ctx);
      notlariEkle(paragraflar, e, rng, ctx);
      zincir.push(...e.zincir);
    }
  }

  paragraflar.push(...metinCoz(dal.sonuc, rng, ctx));
  if (dal.etki) {
    const e = etkileriUygula(dal.etki, ctx);
    notlariEkle(paragraflar, e, rng, ctx);
    zincir.push(...e.zincir);
  }

  if (dal.git) {
    const bitti = sahneyeGir(durum, olay, dal.git, veri, rng, paragraflar, zincir);
    if (bitti) return { paragraflar, ...bitir(durum, zincir) };
    return { paragraflar, bitti: false, zincir };
  }
  return { paragraflar, ...bitir(durum, zincir) };
}

// ------------------------------------------------------------- zamanlayıcılar

// Vakti gelmiş ilk zamanlayıcıyı listeden çıkarıp verir (yoksa null).
//  - Zamanlayıcının kendi koşulu tutmazsa: kosulTutmazsa "bekle" ise listede kalır, değilse iptal edilir.
//  - Olayın kendi koşulu tutmazsa (ör. gece olmaz) zamanlayıcı bekler; sonraki fırsatta yeniden bakılır.
// Döner: { zamanlayici, iptaller: [...] }
export function vadesiGelenZamanlayici(durum, veri) {
  const iptaller = [];
  const liste = durum.zamanlayicilar;
  for (let i = 0; i < liste.length; i++) {
    const z = liste[i];
    if (z.zaman > durum.zaman.dakika) break; // sıralı liste
    const ctx = ctxYap(durum, veri, z.baglam);
    const olay = veri.olaylar?.[z.olay];
    if (!olay) { iptaller.push({ ...z, neden: 'olay yok' }); liste.splice(i--, 1); continue; }
    if (z.kosul !== undefined && !kosulAcikla(z.kosul, ctx).tamam) {
      if (z.kosulTutmazsa === 'bekle') continue;
      iptaller.push({ ...z, neden: 'koşul tutmadı' }); liste.splice(i--, 1); continue;
    }
    if (!kosulAcikla(olay.kosul, ctx).tamam || !olayYeriTutuyor(durum, olay)) continue;
    liste.splice(i, 1);
    return { zamanlayici: z, iptaller };
  }
  return { zamanlayici: null, iptaller };
}

// ------------------------------------------------------------- doğrulama

export function olayDogrula(olay, { kosulDogrula, etkiDogrula, metinDogrula, olaylar = {}, yaylar }) {
  const h = [];
  const y = `olay ${olay.id}`;
  if (!olay.id) h.push('id eksik');
  if (!olay.sahneler || !Object.keys(olay.sahneler).length) { h.push(`${y}: sahne yok`); return h; }
  const bas = olay.baslangic || VARSAYILAN_BASLANGIC;
  if (!olay.sahneler[bas]) h.push(`${y}: başlangıç sahnesi "${bas}" yok`);
  const tetik = olay.tetik || 'otomatik';
  if (!/^(otomatik|zamanlayici|zincir|aksiyon:[a-z0-9_]+)$/.test(tetik)) h.push(`${y}: geçersiz tetik "${tetik}"`);
  if (olay.yay && yaylar && !yaylar[olay.yay]) h.push(`${y}: tanımsız yay "${olay.yay}"`);
  if (olay.yer !== undefined && !OLAY_YERLERI.includes(olay.yer)) h.push(`${y}: geçersiz yer "${olay.yer}"`);
  h.push(...kosulDogrula(olay.kosul, `${y}.kosul`));
  for (const c of olay.agirlik?.carpanlar || []) h.push(...kosulDogrula(c.kosul, `${y}.agirlik`));
  const gidilen = new Set([bas]);
  const gitKontrol = (git, yer) => {
    if (git === undefined) return;
    if (!olay.sahneler[git]) h.push(`${yer}: gidilecek sahne "${git}" yok`);
    gidilen.add(git);
  };
  const zincirKontrol = (liste, yer) => {
    for (const e of [].concat(liste || [])) {
      if (e?.olay && !olaylar[e.olay]) h.push(`${yer}: zincirlenen olay "${e.olay}" yok`);
      if (e?.zamanla && !olaylar[e.zamanla.olay]) h.push(`${yer}: zamanlanan olay "${e.zamanla.olay}" yok`);
      if (e?.zamanla) h.push(...kosulDogrula(e.zamanla.kosul, `${yer}.zamanla.kosul`));
      if (yaylar && (e?.yay || e?.yayBitir)) {
        const v = e.yay || e.yayBitir;
        const tanim = yaylar[v.id];
        if (!tanim) h.push(`${yer}: tanımsız yay "${v.id}" (data/yaylar.json)`);
        else if (e.yay && !tanim.asamalar.includes(v.asama)) h.push(`${yer}: yay ${v.id} için tanımsız aşama "${v.asama}"`);
        else if (e.yayBitir && !tanim.sonuclar.includes(v.sonuc)) h.push(`${yer}: yay ${v.id} için tanımsız sonuç "${v.sonuc}"`);
      }
    }
  };
  const metinKontrol = (m, yer) => { if (metinDogrula) h.push(...metinDogrula(m, yer, { kosulDogrula })); };
  for (const [sid, sahne] of Object.entries(olay.sahneler)) {
    const sy = `${y}/${sid}`;
    if (sahne.metin === undefined) h.push(`${sy}: metin yok`);
    metinKontrol(sahne.metin, `${sy}.metin`);
    h.push(...etkiDogrula(sahne.etki, `${sy}.etki`));
    zincirKontrol(sahne.etki, sy);
    gitKontrol(sahne.git, sy);
    const sec = sahne.secenekler || [];
    if (!sec.length && !sahne.git && !sahne.son && sahne.secenekler !== undefined) h.push(`${sy}: boş seçenek listesi`);
    sec.forEach((s, i) => {
      const yy = `${sy}.secenekler[${i}]`;
      if (!s.metin) h.push(`${yy}: metin yok`);
      metinKontrol(s.sonuc, `${yy}.sonuc`);
      for (const d of [s.basari, s.basarisiz, ...(s.sonuclar || [])]) if (d) metinKontrol(d.sonuc, `${yy}.dal`);
      h.push(...kosulDogrula(s.kosul, `${yy}.kosul`));
      h.push(...etkiDogrula(s.etki, `${yy}.etki`));
      zincirKontrol(s.etki, yy);
      gitKontrol(s.git, yy);
      if (s.kontrol) {
        if (!s.basari && !s.basarisiz) h.push(`${yy}: kontrol var ama basari/basarisiz yok`);
        for (const b of s.kontrol.bonus || []) h.push(...kosulDogrula(b.kosul, `${yy}.kontrol.bonus`));
        for (const [ad, dal] of [['basari', s.basari], ['basarisiz', s.basarisiz]]) {
          if (!dal) continue;
          h.push(...etkiDogrula(dal.etki, `${yy}.${ad}.etki`));
          zincirKontrol(dal.etki, `${yy}.${ad}`);
          gitKontrol(dal.git, `${yy}.${ad}`);
        }
      }
      for (const [j, dal] of (s.sonuclar || []).entries()) {
        h.push(...kosulDogrula(dal.kosul, `${yy}.sonuclar[${j}].kosul`));
        h.push(...etkiDogrula(dal.etki, `${yy}.sonuclar[${j}].etki`));
        zincirKontrol(dal.etki, `${yy}.sonuclar[${j}]`);
        gitKontrol(dal.git, `${yy}.sonuclar[${j}]`);
      }
      if (s.kontrol && s.sonuclar) h.push(`${yy}: kontrol ve sonuclar birlikte olmaz`);
    });
  }
  for (const sid of Object.keys(olay.sahneler)) if (!gidilen.has(sid)) h.push(`${y}: "${sid}" sahnesine hiçbir yerden gidilmiyor`);
  return h;
}
