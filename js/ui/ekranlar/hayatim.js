// "Hayatım" ekranı: karakter (3.3), tanıdıklarım (3.2), duyduklarım (2.8) + gelecek bölümlerin yer tutucuları.
import { h, bosalt } from '../dom.js';
import { IKON } from '../ikonlar.js';
import { bilgiGoster, panelAc } from '../panel.js';
import * as oyun from '../../oyun.js';
import { mekanBul } from '../../core/mekan.js';
import { gunNo } from '../../core/zaman.js';
import { para } from '../../core/format.js';
import { ek } from '../../core/tr.js';

const GELECEK = [
  ['Beceriler', 'Kullandıkça gelişir.', 'Faz 4'],
  ['Envanter', 'Elinde kalanlar.', 'Faz 4'],
  ['Günlük', 'Hayatının kendi ağzından kaydı.', 'Faz 6'],
];

let kap = null, gorunur = false;

const satir = (ad, alt, eylem) => h('button', { class: 'satir', onclick: eylem },
  h('span', { class: 'satir-metin' }, h('span', {}, ad), h('span', { class: 'satir-alt' }, alt)),
  h('span', { class: 'satir-ok', html: IKON.ok }));

function onceYaz(gun) {
  const fark = gunNo(oyun.durumAl().zaman.dakika) - gun;
  return fark <= 0 ? 'bugün' : fark === 1 ? 'dün' : `${fark} gün önce`;
}

function duyduklarimPaneli() {
  const liste = oyun.duyulanlar();
  panelAc({
    baslik: 'Duyduklarım',
    icerik: h('div', {},
      h('p', { class: 'soluk kucuk' }, 'Kulak verdiğinde ve insanların ağzını aradığında duyduklarını burada biriktirirsin. Hepsi doğru değil; hangisinin doğru olduğunu zamanla anlarsın.'),
      liste.length
        ? liste.map(d => h('div', { class: 'duyulan' },
          h('p', { class: 'panel-metin' }, '“' + d.metin + '”'),
          h('p', { class: 'soluk kucuk' }, `${d.kaynakAd ? d.kaynakAd + ' anlattı · ' : ''}${mekanBul(oyun.veri.dunya, d.mekan)?.ad ?? ''} · ${onceYaz(d.gun)}`)))
        : h('p', {}, 'Henüz bir şey duymadın. Bir kahveye otur, etrafa kulak ver.')),
  });
}

const KATMAN_ADI = { tanidik: 'tanıdık', onemli: 'yakın', ana: 'hayatında önemli', arka_plan: 'tanıdık' };
const yakinlikAdi = y => y >= 40 ? 'dost' : y >= 20 ? 'arkadaş' : y >= 8 ? 'ısınıyorsunuz' : 'yeni tanıştınız';

function kisiPaneli(t) {
  const satirlar = [
    h('p', { class: 'panel-metin' }, t.tanim),
    t.gorunus ? h('p', { class: 'panel-metin soluk' }, t.gorunus) : null,
    h('div', { class: 'ozet-satir' }, h('span', {}, 'Aranız'), h('span', { class: 'soluk' }, t.gerginlik >= 4 ? 'gergin' : `${yakinlikAdi(t.yakinlik)} · ${KATMAN_ADI[t.katman] ?? ''}`)),
    t.iliskiTuru || t.numara ? h('div', { class: 'ozet-satir' }, h('span', {}, 'Aranızda'), h('span', { class: 'soluk' }, t.iliskiTuru === 'sevgili' ? 'sevgilin' : t.iliskiTuru === 'flort' ? 'flörtleşiyorsunuz' : 'numarası sende')) : null,
    t.flortEngel ? h('div', { class: 'ozet-satir' }, h('span', {}, 'Bildiğin'), h('span', { class: 'soluk' }, t.flortEngel === 'evli' ? 'hayatında biri var' : 'sana o gözle bakmıyor')) : null,
    t.gecmis ? h('div', { class: 'ozet-satir' }, h('span', {}, 'Geçmişinden'), h('span', { class: 'soluk' }, t.gecmis)) : null,
    t.disarida ? h('div', { class: 'ozet-satir' }, h('span', {}, 'Nerede'), h('span', { class: 'soluk' }, 'şehir dışında')) : null,
    t.nerede ? h('div', { class: 'ozet-satir' }, h('span', {}, 'Tanıştığınız yer'), h('span', { class: 'soluk' }, mekanBul(oyun.veri.dunya, t.nerede)?.ad ?? '')) : null,
    t.dert ? h('p', { class: 'panel-metin' }, h('b', {}, 'Derdi: '), t.dert) : null,
    t.hayal ? h('p', { class: 'panel-metin' }, h('b', {}, 'Hayali: '), t.hayal) : null,
    t.tuhaflik ? h('p', { class: 'panel-metin soluk' }, t.tuhaflik) : null,
    t.anilar?.length ? h('h3', { class: 'bolum-baslik' }, 'Birlikte') : null,
    ...(t.anilar || []).slice().reverse().map(a => h('p', { class: 'soluk kucuk' }, a.metin)),
  ];
  panelAc({ baslik: t.tamAd, icerik: h('div', {}, satirlar) });
}

const EGITIM = { okumamis: 'okula gitmedin', ilkokul: 'ilkokul mezunusun', ortaokul: 'ortaokul mezunusun', lise: 'lise mezunusun', meslek_lisesi: 'meslek lisesi mezunusun', universite: 'üniversite mezunusun', yuksek_lisans: 'yüksek lisans yaptın' };
const bolum = (baslik, ...icerik) => [h('h3', { class: 'bolum-baslik' }, baslik), ...icerik.flat().filter(Boolean)];
const metin = (m, sinif = 'panel-metin') => h('p', { class: sinif }, m);

function karakterPaneli() {
  const b = oyun.karakterBilgisi();
  const c = b.karakter, hk = b.hikaye;
  const nereli = c.yore && c.yore !== 'yerli' ? `aslen ${ek(c.memleket, 'li')}` : 'Karalimanlısın';
  const icerik = [
    metin(`${b.yas} yaşındasın, ${nereli}. ${EGITIM[c.egitim] ? EGITIM[c.egitim][0].toLocaleUpperCase('tr') + EGITIM[c.egitim].slice(1) : ''}${c.eskiMeslek ? `; eskiden ${c.eskiMeslek}.` : '.'}`),
    b.ozellikler.length ? metin(`İnsanlar seni ${b.ozellikler.join(', ')} biri olarak bilir.`, 'panel-metin soluk') : null,
  ];
  if (!hk) {
    icerik.push(metin('Bu oyun hikâye motorundan önce başladı; geçmişin yazılmadı. Yeni bir oyunda kim olduğun ve buraya nasıl geldiğin baştan belli olur.', 'soluk kucuk'));
    return panelAc({ baslik: c.tamAd ?? c.ad, icerik: h('div', {}, icerik) });
  }
  const kisiler = oyun.tanidiklarim().filter(t => hk.baglantilar.some(x => x.id === t.id));
  icerik.push(
    ...bolum('Aynada', b.gorunus ? metin(b.gorunus) : null),
    ...bolum('Buraya nasıl geldin', hk.zincir.map(z => h('p', { class: 'panel-metin' }, h('b', {}, z.yil + ' · '), z.metin))),
    ...bolum('Güçlü yanların', hk.gucluYanlar.map(x => h('p', { class: 'panel-metin' }, h('b', {}, x.ad[0].toLocaleUpperCase('tr') + x.ad.slice(1) + '. '), x.metin))),
    ...bolum('Kusurların', hk.kusurlar.map(x => h('p', { class: 'panel-metin' }, h('b', {}, x.ad[0].toLocaleUpperCase('tr') + x.ad.slice(1) + '. '), x.metin))),
    ...bolum('İç sesin', metin(`Kafanın içindeki ses ${hk.icSes.ad}.`, 'panel-metin soluk'), metin('“' + hk.icSes.ornekler[0] + '”')),
    ...bolum('Borçların', hk.borclar.length ? hk.borclar.map(x => h('div', { class: 'ozet-satir' }, h('span', {}, x.ad), h('span', { class: 'soluk' }, para(x.tutar) + (x.aylik ? ' / ay' : '')))) : metin('Kimseye borcun yok. Bu şehirde az kişi bunu söyleyebilir.', 'soluk kucuk')),
    hk.alacaklar.length ? bolum('Alacakların', hk.alacaklar.map(x => h('div', { class: 'ozet-satir' }, h('span', {}, x.ad), h('span', { class: 'soluk' }, para(x.tutar))))) : [],
    ...bolum('Elinde kalanlar', hk.kalanlar.map(x => h('div', { class: 'ozet-satir' }, h('span', {}, x.ad), h('span', { class: 'soluk' }, x.deger ? '≈ ' + para(x.deger) : 'parayla ölçülmez')))),
    ...bolum('Geçmişinden insanlar', kisiler.length ? kisiler.map(t => satir(t.tamAd, (t.gecmis ?? '') + (t.disarida ? ' · şehir dışında' : ''), () => kisiPaneli(t))) : metin('Geride kimse kalmadı; ya da sen kimseyi bırakmadın.', 'soluk kucuk')),
    ...bolum('Sırların', hk.sirlar.map(x => metin(x))),
    ...bolum('Anıların', hk.anilar.map(x => metin(x, 'panel-metin soluk'))),
    ...bolum('Açık uçlar', hk.iplikler.map(x => metin('· ' + x.metin, 'panel-metin'))),
  );
  panelAc({ baslik: c.tamAd ?? c.ad, icerik: h('div', {}, icerik) });
}

function tanidiklarimPaneli() {
  const liste = oyun.tanidiklarim();
  panelAc({
    baslik: 'Tanıdıklarım',
    icerik: h('div', {},
      h('p', { class: 'soluk kucuk' }, 'Tanıştığın insanlar. Sohbet ettikçe dertlerini, hayallerini öğrenirsin; onlar da sana anlattıklarını ve senin onlara anlattıklarını hatırlar.'),
      liste.length
        ? h('div', { class: 'kart-liste' }, liste.map(t => satir(t.ad, `${t.tanim.split(';')[0]} · ${yakinlikAdi(t.yakinlik)}`, () => kisiPaneli(t))))
        : h('p', {}, 'Henüz kimseyle tanışmadın. Bir mekana gir; orada kimler varsa seçeneklerde görünür.')),
  });
}

function ciz() {
  if (!kap || !oyun.durumAl()) return;
  const n = oyun.duyulanlar().length;
  bosalt(kap, h('div', { class: 'sayfa-kaydir' },
    h('div', { class: 'sayfa-ust' }, h('h1', {}, 'Hayatım'), h('p', { class: 'soluk' }, 'Kim olduğun, neyin olduğu, kimin olduğu.')),
    h('div', { class: 'kart-liste' },
      satir('Karakter', oyun.durumAl().karakter.tamAd ?? 'Kim olduğun, nereden geldiğin', karakterPaneli),
      satir('Tanıdıklarım', oyun.tanidiklarim().length ? `${oyun.tanidiklarim().length} kişi` : 'Henüz kimseyle tanışmadın', tanidiklarimPaneli),
      satir('Duyduklarım', n ? `${n} şey duydun` : 'Henüz bir şey duymadın', duyduklarimPaneli),
      ...GELECEK.map(([ad, alt, faz]) => satir(ad, alt, () => bilgiGoster(ad, `${alt}\n\nBu bölüm ${faz} içinde geliyor.`))))));
}

export const hayatimEkrani = {
  olustur(k) { kap = k; oyun.dinle(() => { if (gorunur) ciz(); }); },
  goster() { gorunur = true; ciz(); },
  gizle() { gorunur = false; },
};
