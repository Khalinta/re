// "Şehir" ekranı (adım 2.8): bulunduğun semt, oradaki mekanlar, şehirde bugün olanlar ve başka semtlere yolculuk.
// Hamleler Şimdi ekranında anlatılır: yolculuk ya da mekana giriş seçilince Şimdi sekmesine geçilir.
import { h, bosalt } from '../dom.js';
import { IKON } from '../ikonlar.js';
import { panelAc, bilgiGoster } from '../panel.js';
import { disaridanHamle } from './simdi.js';
import * as oyun from '../../oyun.js';
import { semtBul } from '../../core/dunya.js';
import { semtMekanlari } from '../../core/mekan.js';
import { mekanKapaliMi, mekanKalabaligi, mekanAksiyonFiyati, yolOzeti } from '../../core/konum.js';
import { dilim } from '../../core/zaman.js';
import { para, sure as sureYaz } from '../../core/format.js';
import { ek } from '../../core/tr.js';

const YAKALAR = [['bati', 'Batı yakası'], ['dogu', 'Doğu yakası'], ['kuzey', 'Kuzey']];
const GELIR = ['', 'yoksul', 'dar gelirli', 'orta halli', 'hali vakti yerinde', 'varlıklı'];
const GUVENLIK = ['', 'tekin değil', 'gece dikkat ister', 'idare eder', 'güvenli', 'çok güvenli'];
const KIP_ADI = { toplu: 'Toplu taşıma', yuruyus: 'Yürüyerek', taksi: 'Taksi' };
const fiyatIsareti = n => '₺'.repeat(n);
// "26:00" → "02:00" (gece yarısını geçen kapanış)
const saat24 = s => { const [a, b] = s.split(':').map(Number); return `${String(a % 24).padStart(2, '0')}:${String(b).padStart(2, '0')}`; };

let kap = null;
let gorunur = false;

const veri = () => oyun.veri;
const d = () => oyun.durumAl();

function satir(ad, alt, eylem, sag = null) {
  return h('button', { class: 'satir', onclick: eylem },
    h('span', { class: 'satir-metin' }, h('span', {}, ad), alt ? h('span', { class: 'satir-alt' }, alt) : null),
    sag ?? h('span', { class: 'satir-ok', html: IKON.ok }));
}

function mekanAlt(m) {
  const kapali = mekanKapaliMi(d(), m);
  const tur = veri().dunya.mekanlar.mekanTurleri[m.tur];
  if (kapali) return `${tur} · ${kapali.replace(/\.$/, '')}`;
  return `${tur} · açık, ${veri().gezi.kalabalikAdlari[mekanKalabaligi(d(), m)]} · ${fiyatIsareti(m.fiyat)}`;
}

// Bir mekanın bilgi paneli; buradaysan "Gir", başka semtteyse "Git ve gir"
function mekanPaneli(m) {
  const burada = d().konum.semt === m.semt;
  const icinde = d().konum.mekan === m.id;
  const kapali = mekanKapaliMi(d(), m);
  const fiyatlar = m.hizmetler.map(hz => {
    const t = veri().gezi.mekanAksiyonlari[hz];
    if (!t) return null;
    const f = mekanAksiyonFiyati(veri(), d(), m, hz);
    return h('div', { class: 'ozet-satir' }, h('span', {}, t.adlar?.[m.tur] ?? t.ad), h('span', { class: 'soluk' }, f ? para(f) : '—'));
  }).filter(Boolean);
  const saatler = m.saatler.her_zaman ? 'Her zaman açık' : `${m.saatler.acilis}–${saat24(m.saatler.kapanis)}`;
  let panel;
  const alt = [];
  if (icinde) alt.push(h('p', { class: 'soluk kucuk' }, 'Şu an buradasın.'));
  else if (burada) {
    alt.push(h('button', { class: 'dugme birincil', 'aria-disabled': kapali ? 'true' : null, onclick: () => {
      if (kapali) { bilgiGoster(m.ad, kapali); return; }
      panel.kapat();
      disaridanHamle('mekanaGir', () => oyun.mekanaGir(m.id));
    } }, `${ek(m.ad, 'e', { iyelik: m.iyelik })} gir`));
  } else alt.push(...yolDugmeleri(m.semt, () => panel.kapat(), m));
  panel = panelAc({
    baslik: m.ad,
    icerik: h('div', {},
      h('p', { class: 'soluk kucuk' }, `${veri().dunya.mekanlar.mekanTurleri[m.tur]} · ${semtBul(veri().dunya, m.semt).ad} · ${saatler}`),
      h('p', { class: 'panel-metin' }, m.tasvir),
      h('p', { class: 'panel-metin soluk' }, m.gecmis),
      fiyatlar.length ? h('h3', { class: 'bolum-baslik' }, 'Fiyatlar') : null,
      fiyatlar,
      !kapali && burada ? burdakiler(m) : null,
      kapali ? h('p', { class: 'secenek-sebep' }, kapali) : null),
    altBilgi: h('div', { class: 'dugme-yigini' }, alt),
  });
}

// Şu an mekanda göze çarpanlar (yalnızca bulunduğun semtte; içeri girince onlarla konuşabilirsin)
function burdakiler(m) {
  const l = oyun.mekandakiler(m);
  if (!l.length) return null;
  return h('div', {}, h('h3', { class: 'bolum-baslik' }, 'Şu an burada'),
    h('p', { class: 'panel-metin' }, l.map(x => x.ad).join(' · ')));
}

// Bir semte gitme seçenekleri (toplu / yürüyüş / taksi), her biri süre ve ücretle
function yolDugmeleri(hedef, kapat, mekan = null) {
  const s = oyun.yolculukSecenekleri(hedef);
  const dugmeler = [];
  for (const kip of ['toplu', 'yuruyus', 'taksi']) {
    const y = s[kip];
    if (!y) continue;
    const yetmez = y.ucret > d().para;
    const bilgi = [sureYaz(y.toplamDakika), y.ucret ? para(y.ucret) : null].filter(Boolean).join(' · ');
    dugmeler.push(h('button', { class: 'secenek', 'aria-disabled': yetmez ? 'true' : null, onclick: () => {
      if (yetmez) { bilgiGoster(KIP_ADI[kip], `Cebinde ${para(y.ucret)} yok.`); return; }
      kapat();
      disaridanHamle('yolculuk', () => oyun.yolculuk(hedef, kip, mekan?.id ?? null));
    } },
    h('span', { class: 'secenek-metin' }, `${KIP_ADI[kip]} · ${bilgi}`),
    kip === 'toplu' ? h('span', { class: 'secenek-alt' }, yolOzeti(veri(), y)) : null));
  }
  if (!s.toplu) dugmeler.unshift(h('p', { class: 'soluk kucuk' }, 'Bu saatte toplu taşıma yok.'));
  return dugmeler;
}

function semtPaneli(id) {
  const s = semtBul(veri().dunya, id);
  const burada = d().konum.semt === id;
  const sakinAdlari = [...s.sakinler].sort((a, b) => b.agirlik - a.agirlik).slice(0, 4).map(x => veri().dunya.semtler.sakinTurleri[x.tur].toLowerCase());
  let panel;
  const mekanlar = semtMekanlari(veri().dunya, id);
  panel = panelAc({
    baslik: s.ad,
    icerik: h('div', {},
      h('p', { class: 'panel-metin' }, s.karakter),
      h('div', { class: 'ozet-satir' }, h('span', {}, 'Halk'), h('span', { class: 'soluk' }, GELIR[s.sosyo.gelir])),
      h('div', { class: 'ozet-satir' }, h('span', {}, 'Güvenlik'), h('span', { class: 'soluk' }, GUVENLIK[s.sosyo.guvenlik])),
      h('div', { class: 'ozet-satir' }, h('span', {}, 'Kira'), h('span', { class: 'soluk' }, s.sosyo.kiraKatsayisi >= 1.5 ? 'çok pahalı' : s.sosyo.kiraKatsayisi >= 1.1 ? 'pahalı' : s.sosyo.kiraKatsayisi >= 0.8 ? 'orta' : 'ucuz')),
      h('h3', { class: 'bolum-baslik' }, 'Kimler yaşıyor'),
      h('p', { class: 'panel-metin' }, sakinAdlari.join(', ')),
      h('h3', { class: 'bolum-baslik' }, 'Bilinen yerler'),
      h('p', { class: 'panel-metin' }, s.unluYerler.map(u => u.ad).join(' · ')),
      h('h3', { class: 'bolum-baslik' }, 'Mekanlar'),
      h('div', { class: 'kart-liste' }, mekanlar.map(m => satir(m.ad, mekanAlt(m), () => mekanPaneli(m))))),
    altBilgi: burada ? null : h('div', { class: 'dugme-yigini' }, yolDugmeleri(id, () => panel.kapat())),
  });
}

function ciz() {
  if (!kap || !d()) return;
  const v = veri(), du = d();
  const semt = semtBul(v.dunya, du.konum.semt);
  const hava = oyun.durumCubuguVerisi().hava;
  const mekanlar = semtMekanlari(v.dunya, du.konum.semt);
  const gundem = (du.dunya?.gundem || []).slice(-5).reverse();
  const digerleri = YAKALAR.map(([yaka, ad]) => [ad, v.dunya.sehir.semtler.filter(s => s.yaka === yaka && s.id !== du.konum.semt)]);

  bosalt(kap, h('div', { class: 'sayfa-kaydir' },
    h('div', { class: 'sayfa-ust' },
      h('h1', {}, semt.ad),
      h('p', { class: 'soluk' }, [oyun.konumMetni(), hava].filter(Boolean).join(' · '))),
    h('div', { class: 'kart sehir-kart' },
      h('p', {}, semt.ozet),
      h('p', { class: 'soluk' }, semt.atmosfer[dilim(du.zaman.dakika).id]),
      h('button', { class: 'dugme kucuk-dugme', onclick: () => semtPaneli(semt.id) }, 'Semt hakkında')),
    h('h2', { class: 'bolum-baslik' }, `${ek(semt.ad, 'de', { iyelik: semt.iyelik })} gidilecek yerler`),
    h('div', { class: 'kart-liste' }, mekanlar.map(m => satir(m.ad + (du.konum.mekan === m.id ? ' · buradasın' : ''), mekanAlt(m), () => mekanPaneli(m)))),
    h('h2', { class: 'bolum-baslik' }, 'Şehirde bugün'),
    h('div', { class: 'kart' }, gundem.length
      ? gundem.map(g => h('p', { class: 'gundem' }, h('span', { class: 'soluk kucuk' }, g.iso.slice(8, 10) + '.' + g.iso.slice(5, 7) + ' · '), g.metin))
      : h('p', { class: 'soluk' }, 'Henüz kulağına bir şey gelmedi. Günler geçtikçe şehrin gündemi burada birikir.')),
    ...digerleri.flatMap(([ad, semtler]) => [
      h('h2', { class: 'bolum-baslik' }, ad),
      h('div', { class: 'kart-liste' }, semtler.map(s => satir(s.ad, yolAlti(s.id), () => semtPaneli(s.id)))),
    ])));
}

function yolAlti(hedef) {
  const s = oyun.yolculukSecenekleri(hedef);
  const y = [s.toplu, s.yuruyus].filter(Boolean).sort((a, b) => a.toplamDakika - b.toplamDakika)[0];
  if (!y) return '';
  return `${y.kip === 'toplu' ? 'toplu' : 'yürüyerek'} ${sureYaz(y.toplamDakika)}${y.ucret ? ' · ' + para(y.ucret) : ''}`;
}

export const sehirEkrani = {
  olustur(k) {
    kap = k;
    oyun.dinle(() => { if (gorunur) ciz(); });
  },
  goster() { gorunur = true; ciz(); },
  gizle() { gorunur = false; },
  tekrarDokunus() { kap?.querySelector('.sayfa-kaydir')?.scrollTo({ top: 0, behavior: 'smooth' }); },
};
