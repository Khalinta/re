// Ulaşım: hatlar, bekleme, trafik, ücret ve yol bulma (adım 2.3).
// Düğümler semtlerdir. Yol bulma zamana bağlıdır: hangi hatların çalıştığı, ne kadar bekleneceği ve
// trafik, yolculuk ilerledikçe o anki saate göre hesaplanır. Rastgelelik yoktur (beklenen süreler);
// oyunda gerçek bekleme ve aksilikler olay motoruyla eklenir.
import { dilim } from './zaman.js';

// Ekonomi dosyası gelene kadar (adım 2.7) ücretlerin ₺ karşılığı bu asgari ücretle hesaplanır (PROJE.md ekonomi tablosu).
export const ASGARI_UCRET_TASLAK = 28000;
export const HAT_TURLERI = ['metro', 'otobus', 'vapur', 'dolmus'];
const TRAFIGE_TAKILAN = new Set(['otobus', 'dolmus']);
const SAAT = /^(\d{2}):(\d{2})$/;

export function saatDakika(s) {
  const m = SAAT.exec(s || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

const gunDk = t => ((t % 1440) + 1440) % 1440;

// Aralık gece yarısını geçebilir ("23:00"–"06:00")
function aralikta(dk, bas, son) {
  return bas <= son ? dk >= bas && dk < son : dk >= bas || dk < son;
}

export function trafikKatsayisi(ulasim, t) {
  const dk = gunDk(t);
  for (const tr of ulasim.trafik || []) if (aralikta(dk, saatDakika(tr.bas), saatDakika(tr.son))) return tr.katsayi;
  return 1;
}

// Hatta binmek için beklenen dakika; hat çalışmıyorsa ve bir saat içinde açılmıyorsa Infinity.
// Son sefer 24'ü geçebilir ("24:30" = gece 00:30).
export function beklenenBekleme(hat, t, haftaSonu = false) {
  const dk = gunDk(t);
  const ilk = saatDakika(hat.ilkSefer), son = saatDakika(hat.sonSefer);
  const calisiyor = (dk >= ilk && dk <= son) || dk + 1440 <= son;
  const aralik = hat.sefer[dilim(dk).id] * (haftaSonu ? hat.haftaSonu ?? 1 : 1);
  if (calisiyor) return aralik / 2;
  const acilisa = ((ilk - dk) + 1440) % 1440;
  return acilisa <= 60 ? acilisa : Infinity;
}

const tl = (oran, au) => Math.round(oran * au);

// Toplu taşıma adımlarının ücreti (₺). Kent Kart aktarma indirimi uygulanır.
export function topluUcret(ulasim, adimlar, asgariUcret = ASGARI_UCRET_TASLAK) {
  const kk = ulasim.tarife.kentKart;
  let ilkKart = null, aktarma = 0, toplam = 0;
  for (const a of adimlar) {
    if (a.tur !== 'hat') continue;
    const oran = ulasim.tarife[a.hatTuru];
    let indirim = 0;
    if (kk.turler.includes(a.hatTuru)) {
      if (ilkKart === null) ilkKart = a.binisAni;
      else if (a.binisAni - ilkKart <= kk.aktarmaSuresi && aktarma < kk.aktarmaSayisi) { indirim = kk.aktarmaIndirimi; aktarma++; }
    }
    a.ucret = tl(oran * (1 - indirim), asgariUcret);
    a.aktarmaIndirimi = indirim > 0;
    toplam += a.ucret;
  }
  return toplam;
}

export function taksiUcret(ulasim, yolDakika, asgariUcret = ASGARI_UCRET_TASLAK) {
  const t = ulasim.tarife.taksi;
  return tl(t.acilis + t.dakika * yolDakika, asgariUcret);
}

function komsuluklar(ulasim) {
  const k = new Map();
  for (const y of ulasim.yollar) {
    for (const [a, b] of [[y.a, y.b], [y.b, y.a]]) {
      if (!k.has(a)) k.set(a, []);
      k.get(a).push({ hedef: b, yuruyus: y.yuruyus, araba: y.araba });
    }
  }
  return k;
}

// Küçük ağ (14 düğüm × hat × yön): basit Dijkstra yeter.
function enKisa(baslangicDurumu, t0, komsular, hedefMi) {
  const en = new Map([[baslangicDurumu.anahtar, t0]]);
  const onceki = new Map();
  const acik = [{ ...baslangicDurumu, t: t0 }];
  const kapali = new Set();
  while (acik.length) {
    let i = 0;
    for (let j = 1; j < acik.length; j++) if (acik[j].t < acik[i].t) i = j;
    const d = acik.splice(i, 1)[0];
    if (kapali.has(d.anahtar)) continue;
    kapali.add(d.anahtar);
    if (hedefMi(d)) {
      const yol = [];
      for (let a = d.anahtar; onceki.has(a); a = onceki.get(a).from) yol.unshift(onceki.get(a));
      return { varis: d.t, kenarlar: yol };
    }
    for (const k of komsular(d)) {
      const t = d.t + k.maliyet;
      if (!Number.isFinite(t) || t >= (en.get(k.anahtar) ?? Infinity)) continue;
      en.set(k.anahtar, t);
      onceki.set(k.anahtar, { from: d.anahtar, kenar: k.kenar, bas: d.t, son: t });
      acik.push({ ...k.durum, anahtar: k.anahtar, t });
    }
  }
  return null;
}

// Kenarları okunur adımlara çevirir: art arda yürüyüşler ve aynı hattaki duraklar birleşir.
function adimlaraCevir(kenarlar, hatlar) {
  const adimlar = [];
  for (const { kenar, bas, son } of kenarlar) {
    const sonAdim = adimlar[adimlar.length - 1];
    if (kenar.tur === 'yuruyus') {
      if (sonAdim?.tur === 'yuruyus') { sonAdim.nereye = kenar.nereye; sonAdim.uzerinden.push(kenar.nereden); sonAdim.dakika += son - bas; }
      else adimlar.push({ tur: 'yuruyus', nereden: kenar.nereden, nereye: kenar.nereye, uzerinden: [], dakika: son - bas });
    } else if (kenar.tur === 'binis') {
      const hat = hatlar.get(kenar.hat);
      adimlar.push({ tur: 'hat', hat: hat.id, hatAdi: hat.ad, hatKisa: hat.kisa, hatTuru: hat.tur, nereden: kenar.durak, nereye: kenar.durak,
        bekleme: son - bas, binisAni: son, dakika: 0, durakSayisi: 0 });
    } else if (kenar.tur === 'surus') {
      sonAdim.nereye = kenar.nereye; sonAdim.dakika += son - bas; sonAdim.durakSayisi++;
    }
  }
  for (const a of adimlar) { a.dakika = Math.round(a.dakika * 10) / 10; if (a.bekleme !== undefined) a.bekleme = Math.round(a.bekleme * 10) / 10; }
  return adimlar;
}

// kip: 'toplu' (yürüyüş + hatlar), 'yuruyus', 'taksi'
// t: yola çıkış anı (oyun dakikası ya da günün dakikası; yalnızca günün saati kullanılır)
// Döner: { kip, nereden, nereye, cikis, varis, toplamDakika, ucret, adimlar } ya da null (o saatte yol yok)
export function yolBul(ulasim, nereden, nereye, { kip = 'toplu', t = 8 * 60, haftaSonu = false, asgariUcret = ASGARI_UCRET_TASLAK } = {}) {
  const kom = komsuluklar(ulasim);
  if (!kom.has(nereden) || !kom.has(nereye)) return null;
  const sonuc = (varis, adimlar, ucret) => ({ kip, nereden, nereye, cikis: t, varis, toplamDakika: Math.round(varis - t), ucret, adimlar });
  if (nereden === nereye) return sonuc(t, [], 0);

  if (kip === 'taksi') {
    const r = enKisa({ semt: nereden, anahtar: nereden }, t, d => kom.get(d.semt).map(k => ({
      anahtar: k.hedef, durum: { semt: k.hedef }, maliyet: k.araba * trafikKatsayisi(ulasim, d.t), kenar: null,
    })), d => d.semt === nereye);
    if (!r) return null;
    const bekleme = ulasim.tarife.taksi.bekleme[dilim(gunDk(t)).id];
    const yolDk = Math.round(r.varis - t);
    return sonuc(t + bekleme + yolDk, [{ tur: 'taksi', nereden, nereye, bekleme, dakika: yolDk }], taksiUcret(ulasim, yolDk, asgariUcret));
  }

  const hatlar = new Map(kip === 'toplu' ? ulasim.hatlar.map(h => [h.id, h]) : []);
  const duraktakiHatlar = new Map();
  for (const h of hatlar.values()) h.duraklar.forEach((s, i) => {
    if (!duraktakiHatlar.has(s)) duraktakiHatlar.set(s, []);
    duraktakiHatlar.get(s).push({ h, i });
  });
  const aktarma = ulasim.aktarmaYurumesi ?? 0;

  const komsular = d => {
    const c = [];
    if (!d.hat) {
      for (const k of kom.get(d.semt)) c.push({ anahtar: k.hedef, durum: { semt: k.hedef }, maliyet: k.yuruyus, kenar: { tur: 'yuruyus', nereden: d.semt, nereye: k.hedef } });
      for (const { h, i } of duraktakiHatlar.get(d.semt) || []) {
        for (const yon of [1, -1]) {
          if (!h.duraklar[i + yon]) continue;
          const bekle = beklenenBekleme(h, d.t + aktarma, haftaSonu);
          c.push({ anahtar: `${d.semt}|${h.id}|${yon}`, durum: { semt: d.semt, hat: h.id, i, yon }, maliyet: aktarma + bekle, kenar: { tur: 'binis', hat: h.id, durak: d.semt } });
        }
      }
    } else {
      const h = hatlar.get(d.hat);
      const j = d.i + d.yon;
      if (h.duraklar[j]) {
        const sure = h.sureler[Math.min(d.i, j)] * (TRAFIGE_TAKILAN.has(h.tur) ? trafikKatsayisi(ulasim, d.t) : 1);
        c.push({ anahtar: `${h.duraklar[j]}|${h.id}|${d.yon}`, durum: { semt: h.duraklar[j], hat: h.id, i: j, yon: d.yon }, maliyet: sure, kenar: { tur: 'surus', nereye: h.duraklar[j] } });
      }
      c.push({ anahtar: d.semt, durum: { semt: d.semt }, maliyet: 0, kenar: { tur: 'inis' } });
    }
    return c;
  };
  const r = enKisa({ semt: nereden, anahtar: nereden }, t, komsular, d => d.semt === nereye && !d.hat);
  if (!r) return null;
  const adimlar = adimlaraCevir(r.kenarlar, hatlar);
  return sonuc(r.varis, adimlar, topluUcret(ulasim, adimlar, asgariUcret));
}

// Oyuncuya sunulacak seçenekler: toplu taşıma (yürüyüşten farklıysa), yürüyüş, taksi
export function yolSecenekleri(ulasim, nereden, nereye, secenek = {}) {
  const toplu = yolBul(ulasim, nereden, nereye, { ...secenek, kip: 'toplu' });
  const yuruyus = yolBul(ulasim, nereden, nereye, { ...secenek, kip: 'yuruyus' });
  const taksi = yolBul(ulasim, nereden, nereye, { ...secenek, kip: 'taksi' });
  return { toplu: toplu?.adimlar.some(a => a.tur === 'hat') ? toplu : null, yuruyus, taksi };
}

// Veri denetimi. semtIdler: Set; komsuluk: semtler.json'daki "a|b" çiftleri (varsa)
export function ulasimDogrula(ulasim, semtIdler, komsulukCiftleri = null) {
  const h = [];
  const cift = (a, b) => [a, b].sort().join('|');
  const yolCiftleri = new Set();
  for (const [i, y] of (ulasim.yollar || []).entries()) {
    const ad = `yollar[${i}] (${y.a}–${y.b})`;
    if (!semtIdler.has(y.a) || !semtIdler.has(y.b) || y.a === y.b) h.push(`${ad}: geçersiz semt`);
    if (yolCiftleri.has(cift(y.a, y.b))) h.push(`${ad}: iki kez`);
    yolCiftleri.add(cift(y.a, y.b));
    if (!(y.araba > 0) || !(y.yuruyus > y.araba)) h.push(`${ad}: süreler pozitif olmalı, yürüyüş arabadan uzun`);
    if (komsulukCiftleri && !komsulukCiftleri.has(cift(y.a, y.b))) h.push(`${ad}: semtler.json'da komşu değiller`);
  }
  if (komsulukCiftleri) for (const c of komsulukCiftleri) if (!yolCiftleri.has(c)) h.push(`komşuluk ${c}: ulasim.json'da yol süresi yok`);

  for (const tur of HAT_TURLERI) if (!(ulasim.tarife?.[tur] > 0)) h.push(`tarife.${tur} eksik`);
  const hizmetli = new Set();
  const hatIdler = new Set();
  for (const [i, hat] of (ulasim.hatlar || []).entries()) {
    const ad = `hatlar[${i}] (${hat.id})`;
    if (!/^[a-z][a-z0-9_]*$/.test(hat.id || '')) h.push(`${ad}: id biçimi`);
    if (hatIdler.has(hat.id)) h.push(`${ad}: kimlik iki kez`);
    hatIdler.add(hat.id);
    if (!hat.ad) h.push(`${ad}: ad yok`);
    if (!HAT_TURLERI.includes(hat.tur)) h.push(`${ad}: bilinmeyen tür "${hat.tur}"`);
    const d = hat.duraklar || [];
    if (d.length < 2) h.push(`${ad}: en az iki durak`);
    if (new Set(d).size !== d.length) h.push(`${ad}: aynı durak iki kez`);
    for (const s of d) { if (!semtIdler.has(s)) h.push(`${ad}: bilinmeyen durak "${s}"`); hizmetli.add(s); }
    if ((hat.sureler || []).length !== d.length - 1 || hat.sureler.some(x => !(x > 0))) h.push(`${ad}: sureler durak sayısından bir eksik ve pozitif olmalı`);
    if (hat.durakAdlari && hat.durakAdlari.length !== d.length) h.push(`${ad}: durakAdlari durak sayısı kadar olmalı`);
    const ilk = saatDakika(hat.ilkSefer), son = saatDakika(hat.sonSefer);
    if (!(ilk >= 0 && ilk < 1440) || !(son > ilk && son < 1440 + ilk)) h.push(`${ad}: ilkSefer/sonSefer biçimi ya da sırası`);
    for (const dl of ['sabah', 'ogle', 'aksam', 'gece']) if (!(hat.sefer?.[dl] > 0)) h.push(`${ad}: sefer.${dl} pozitif olmalı`);
    if (hat.haftaSonu !== undefined && !(hat.haftaSonu >= 1)) h.push(`${ad}: haftaSonu katsayısı ≥ 1 olmalı`);
  }
  for (const s of semtIdler) if (!hizmetli.has(s)) h.push(`semt ${s}: hiçbir hat uğramıyor`);
  for (const [i, tr] of (ulasim.trafik || []).entries()) {
    if (Number.isNaN(saatDakika(tr.bas)) || Number.isNaN(saatDakika(tr.son)) || !(tr.katsayi > 0)) h.push(`trafik[${i}]: saat ya da katsayı biçimi`);
  }
  return h;
}
