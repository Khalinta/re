// Gizli geliştirici paneli: Daha Fazla → Sürüm satırına 7 kez dokununca açılır.
// Her değişiklik oyun.js'teki geliştirici işlevleriyle yapılır (geri alınabilir + hemen kaydedilir).
import { h, bosalt } from '../ui/dom.js';
import { panelAc, onayIste, bilgiGoster, enUstPaneliKapat } from '../ui/panel.js';
import { sekmeyeGec } from '../ui/arayuz.js';
import { menuyuGoster, paragraflariGoster, yeniOyunuGoster } from '../ui/ekranlar/simdi.js';
import * as oyun from '../oyun.js';
import * as kayit from '../kayit.js';
import { hatalar as hataListesi, raporuKopyala, guvenli } from '../hata.js';
import { seedDuzenle } from '../core/rng.js';
import { bayrakKoy, bayrakKaldir, bayrakKalanSure, sayacYaz } from '../core/bayrak.js';
import { tarihAl } from '../core/zaman.js';
import { tarih, saat, sure as sureYaz, para } from '../core/format.js';
import { kodaCevir } from '../core/aktarim.js';
import { zarfla } from '../core/kayitbicim.js';
import { sirala } from '../core/tr.js';
import { panoyaKopyala } from '../ui/ekranlar/aktarim.js';
import { kisiGuncel, hayatOlayiTetikle } from '../core/npchayat.js';
import { flortDurumu, hitapSec, kusak } from '../core/sohbet.js';
import { npcTanimi } from '../core/npc.js';
import { kisiKarti, kartMetni } from '../core/kart.js';

const BOLUMLER = [['genel', 'Genel'], ['durum', 'Durum'], ['olaylar', 'Olaylar'], ['bayraklar', 'Bayrak'], ['npc', 'NPC'], ['hatalar', 'Hata']];
let aktifBolum = 'genel';
let govde;

const d = () => oyun.durumAl();
const zamanYaz = dk => { const t = tarihAl(d().zaman.baslangic, dk); return `${tarih(t, { gunAdi: false })} ${saat(dk)}`; };

// "true" -> true, "12" -> 12, diğerleri metin
function degerCoz(s) {
  const t = String(s).trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t !== '' && !Number.isNaN(Number(t.replace(',', '.')))) return Number(t.replace(',', '.'));
  return t;
}

const dugme = (metin, eylem, tur = '') => h('button', { class: 'dugme kucuk-dugme ' + tur, onclick: eylem }, metin);
const girdi = (ozellik = {}) => h('input', { class: 'dev-girdi', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', ...ozellik });
const satir = (...c) => h('div', { class: 'dev-satir' }, ...c);
const baslik = m => h('h3', { class: 'dev-baslik' }, m);
const bos = m => h('p', { class: 'soluk kucuk' }, m);

function yenile() { if (govde) ciz(); }

export function gelistiriciPaneliAc() {
  const sekmeler = h('div', { class: 'segment dev-sekmeler', role: 'tablist' });
  const sekmeleriCiz = () => bosalt(sekmeler, BOLUMLER.map(([id, ad]) =>
    h('button', { role: 'tab', 'aria-checked': String(id === aktifBolum), onclick: () => { aktifBolum = id; sekmeleriCiz(); ciz(); } }, ad)));
  sekmeleriCiz();
  govde = h('div', { class: 'dev-govde' });
  panelAc({ baslik: 'Geliştirici paneli', icerik: h('div', {}, sekmeler, govde), sinif: 'gelistirici', kapaninca: () => { govde = null; } });
  ciz();
}

function ciz() {
  if (!d()) { bosalt(govde, bos('Etkin oyun yok.')); return; }
  const f = { genel, durum: durumBolumu, olaylar, bayraklar, npc: npcBolumu, hatalar }[aktifBolum];
  bosalt(govde, f());
}

// Şimdi ekranına dönüp yeni anlatımı ve menüyü göster
async function simdiyeDon() {
  while (enUstPaneliKapat());
  sekmeyeGec('simdi');
  await paragraflariGoster([]);
  menuyuGoster();
}

// ------------------------------------------------------------- Genel

function genel() {
  const durum = d();
  const seedGirdi = girdi({ placeholder: 'Seed (boşsa rastgele)', value: '' });
  const tarihGirdi = girdi({ type: 'date', value: durum.zaman.baslangic });
  const zamanDugmesi = (ad, dk) => dugme(ad, () => { oyun.zamanAtla(dk, { simule: simule.checked }); yenile(); });
  const simule = h('input', { type: 'checkbox', id: 'dev-simule' });
  return [
    baslik('Oyun'),
    satir(h('span', {}, 'Seed: ', h('b', {}, durum.seed)), dugme('Kopyala', async e => { e.target.textContent = (await panoyaKopyala(durum.seed)) ? 'Kopyalandı ✓' : 'Olmadı'; })),
    satir(h('span', { class: 'soluk kucuk' }, `Yuva ${kayit.aktifYuva()} · başlangıç ${durum.zaman.baslangic} · şimdi ${zamanYaz(durum.zaman.dakika)}`)),
    satir(dugme('Kayıt kodunu kopyala', async e => { e.target.textContent = (await panoyaKopyala(await kodaCevir(zarfla(durum)))) ? 'Kopyalandı ✓' : 'Olmadı'; })),
    baslik('Belirli bir seed ile yeni oyun'),
    seedGirdi, tarihGirdi,
    satir(dugme('Bu yuvada yeni oyun başlat', async () => {
      const ok = await onayIste({ baslik: 'Yeni oyun', metin: 'Bu yuvadaki oyun önce yedeklenecek.', evet: 'Başlat', hayir: 'Vazgeç' });
      if (!ok) return;
      await kayit.hemenKaydet();
      const n = kayit.aktifYuva();
      await kayit.depoAl().yedekAl(n);
      kayit.yuvaHazirla(n);
      while (enUstPaneliKapat());
      sekmeyeGec('simdi');
      yeniOyunuGoster({ seed: seedGirdi.value.trim() ? seedDuzenle(seedGirdi.value) : undefined, baslangic: tarihGirdi.value || undefined });
    }, 'birincil')),
    baslik('Zaman atlat'),
    satir(zamanDugmesi('+1 saat', 60), zamanDugmesi('+1 gün', 1440), zamanDugmesi('+1 hafta', 10080), zamanDugmesi('+1 ay', 43200)),
    satir(h('label', { for: 'dev-simule', class: 'dev-etiket' }, simule, ' Simüle et (açlık, enerji... de değişsin)')),
    baslik('Etkin olay'),
    durum.aktifOlay
      ? satir(h('span', {}, `${durum.aktifOlay.id} / ${durum.aktifOlay.sahne}`), dugme('İptal et', () => { oyun.aktifOlayiIptal(); simdiyeDon(); }, 'tehlikeli-metin'))
      : bos('Yok.'),
  ];
}

// ------------------------------------------------------------- Durum

function durumBolumu() {
  const durum = d();
  const paraGirdi = girdi({ type: 'number', inputmode: 'decimal', placeholder: 'Tutar', value: '1000' });
  const sim = oyun.veri.sim.durumlar;
  const durumlar = Object.keys(durum.durumlar).map(k => {
    const deger = h('span', { class: 'dev-deger' }, String(Math.round(durum.durumlar[k])));
    const kaydirici = h('input', { type: 'range', min: 0, max: 100, step: 1, value: Math.round(durum.durumlar[k]), class: 'dev-kaydirici' });
    kaydirici.addEventListener('input', () => { deger.textContent = kaydirici.value; });
    kaydirici.addEventListener('change', () => oyun.gelistiriciDegistir(x => { x.durumlar[k] = Number(kaydirici.value); }, `${sim[k]?.ad || k} = ${kaydirici.value}`));
    return h('div', { class: 'dev-durum' }, h('div', { class: 'dev-satir' }, h('span', {}, sim[k]?.ad || k), deger), kaydirici);
  });
  const beceriler = sirala(Object.keys(durum.beceriler)).map(k => {
    const g = girdi({ type: 'number', value: durum.beceriler[k], class: 'dev-girdi dev-kucuk' });
    g.addEventListener('change', () => { oyun.gelistiriciDegistir(x => { x.beceriler[k] = Math.max(0, Math.min(100, Number(g.value))); }, `beceri ${k} = ${g.value}`); });
    return satir(h('span', {}, k), g);
  });
  const yeniBeceri = girdi({ placeholder: 'yeni beceri adı (ör. yemek)' });
  const yeniDeger = girdi({ type: 'number', value: '30', class: 'dev-girdi dev-kucuk' });
  return [
    baslik('Para · ' + para(durum.para)),
    paraGirdi,
    satir(
      dugme('+ Ekle', () => { oyun.gelistiriciDegistir(x => { x.para += Number(paraGirdi.value) || 0; }, `+${para(Number(paraGirdi.value) || 0)}`); yenile(); }, 'birincil'),
      dugme('− Çıkar', () => { oyun.gelistiriciDegistir(x => { x.para -= Number(paraGirdi.value) || 0; }, `−${para(Number(paraGirdi.value) || 0)}`); yenile(); })),
    baslik('Durumlar'),
    ...durumlar,
    baslik('Beceriler'),
    ...(beceriler.length ? beceriler : [bos('Henüz beceri yok.')]),
    satir(yeniBeceri, yeniDeger),
    satir(dugme('Beceri ekle', () => {
      const ad = yeniBeceri.value.trim();
      if (!ad) return;
      oyun.gelistiriciDegistir(x => { x.beceriler[ad] = Math.max(0, Math.min(100, Number(yeniDeger.value) || 0)); }, `beceri ${ad} = ${yeniDeger.value}`);
      yenile();
    })),
  ];
}

// ------------------------------------------------------------- Olaylar

function olaylar() {
  const ara = girdi({ type: 'search', placeholder: 'Olay ara (kimlik, başlık, etiket)' });
  const liste = h('div', {});
  const listeCiz = () => {
    const q = ara.value.trim().toLocaleLowerCase('tr-TR');
    const tum = oyun.olayListesi('*').filter(x => !q || [x.o.id, x.o.baslik, ...(x.o.etiketler || [])].join(' ').toLocaleLowerCase('tr-TR').includes(q));
    bosalt(liste, tum.length ? sirala(tum, x => x.o.id).map(x => h('div', { class: 'dev-kart' },
      h('div', { class: 'dev-satir' },
        h('span', {}, h('b', { class: x.uygun ? 's-iyi' : 's-kotu' }, x.uygun ? '✓ ' : '✗ '), x.o.id),
        h('span', { class: 'soluk kucuk' }, x.o.tetik || 'otomatik')),
      x.o.baslik ? h('div', { class: 'soluk kucuk' }, x.o.baslik + (x.o.yay ? ' · yay: ' + x.o.yay : '')) : null,
      h('div', { class: 'yuva-dugmeler' },
        dugme('Neden?', () => bilgiGoster(x.o.id, x.uygun ? `Şu an çıkabilir (ağırlık ${x.agirlik}).` : 'Çıkamaz:\n\n• ' + x.nedenler.join('\n• '))),
        dugme('Koşulsuz tetikle', async () => {
          const s = await guvenli('gelistirici:tetikle', () => oyun.olayiZorla(x.o.id));
          if (s) simdiyeDon();
        }, 'birincil')))) : [bos('Eşleşen olay yok.')]);
  };
  ara.addEventListener('input', listeCiz);
  listeCiz();

  const durum = d();
  const zl = durum.zamanlayicilar.map((z, i) => h('div', { class: 'dev-kart' },
    h('div', {}, h('b', {}, z.olay), h('span', { class: 'soluk kucuk' }, ` · ${zamanYaz(z.zaman)} (${z.zaman > durum.zaman.dakika ? sureYaz(z.zaman - durum.zaman.dakika) + ' sonra' : 'vakti geldi'})`)),
    z.kosul ? h('div', { class: 'soluk kucuk' }, 'koşul: ' + JSON.stringify(z.kosul)) : null,
    h('div', { class: 'yuva-dugmeler' },
      dugme('Şimdi çalıştır', async () => { const s = await guvenli('gelistirici:zamanlayici', () => oyun.zamanlayiciCalistir(i)); if (s) simdiyeDon(); }),
      dugme('Sil', () => { oyun.gelistiriciDegistir(x => { x.zamanlayicilar.splice(i, 1); }, `zamanlayıcı silindi: ${z.olay}`); yenile(); }, 'tehlikeli-metin'))));
  const yaylar = Object.entries(durum.yaylar || {}).map(([id, y]) => h('div', { class: 'dev-kart' },
    h('div', {}, h('b', {}, (oyun.veri.yaylar?.[id]?.ad || id)), h('span', { class: 'soluk kucuk' }, ` · ${y.bitti ? 'bitti: ' + y.bitti.sonuc : 'aşama: ' + y.asama}`)),
    h('div', { class: 'soluk kucuk' }, 'geçmiş: ' + (y.gecmis || []).join(' → ')),
    h('div', { class: 'yuva-dugmeler' }, dugme('Sıfırla', () => { oyun.gelistiriciDegistir(x => { delete x.yaylar[id]; }, `yay sıfırlandı: ${id}`); yenile(); }, 'tehlikeli-metin'))));
  return [baslik('Olaylar'), ara, liste, baslik('Zamanlayıcılar'), ...(zl.length ? zl : [bos('Yok.')]), baslik('Hikaye yayları'), ...(yaylar.length ? yaylar : [bos('Yok.')])];
}

// ------------------------------------------------------------- Bayraklar

function bayraklar() {
  const durum = d();
  const b = durum.bayraklar;
  const silDugme = (ad, npc) => dugme('Sil', () => { oyun.gelistiriciDegistir(x => bayrakKaldir(x, ad, { npc }), `bayrak silindi: ${ad}`); yenile(); }, 'tehlikeli-metin');
  const kalici = sirala(Object.keys(b.kalici)).map(ad => satir(h('span', {}, `${ad} = ${JSON.stringify(b.kalici[ad])}`), silDugme(ad)));
  const sureli = sirala(Object.keys(b.sureli)).map(ad => satir(h('span', {}, `${ad} = ${JSON.stringify(b.sureli[ad].deger)} `, h('span', { class: 'soluk kucuk' }, `(${bayrakKalanSure(durum, ad) !== null ? sureYaz(bayrakKalanSure(durum, ad)) + ' kaldı' : 'doldu'})`)), silDugme(ad)));
  const npcB = Object.entries(b.npc).flatMap(([npc, bl]) => Object.entries(bl).map(([ad, v]) => satir(h('span', {}, `npc ${npc}: ${ad} = ${JSON.stringify(v)}`), silDugme(ad, npc))));
  const sayaclar = sirala(Object.keys(durum.sayaclar)).map(ad => {
    const g = girdi({ type: 'number', value: durum.sayaclar[ad], class: 'dev-girdi dev-kucuk' });
    g.addEventListener('change', () => oyun.gelistiriciDegistir(x => sayacYaz(x, ad, Number(g.value)), `sayaç ${ad} = ${g.value}`));
    return satir(h('span', {}, ad), g);
  });
  const ad = girdi({ placeholder: 'bayrak adı' });
  const deger = girdi({ placeholder: 'değer (true, sayı, metin)', value: 'true' });
  const sure = girdi({ type: 'number', placeholder: 'süre (gün, boşsa kalıcı)' });
  const npcGirdi = girdi({ placeholder: 'NPC kimliği (isteğe bağlı)' });
  return [
    baslik('Kalıcı'), ...(kalici.length ? kalici : [bos('Yok.')]),
    baslik('Süreli'), ...(sureli.length ? sureli : [bos('Yok.')]),
    baslik('NPC\'ye özel'), ...(npcB.length ? npcB : [bos('Yok.')]),
    baslik('Sayaçlar'), ...(sayaclar.length ? sayaclar : [bos('Yok.')]),
    baslik('Bayrak ekle'), ad, deger, sure, npcGirdi,
    satir(dugme('Ekle', () => {
      const a = ad.value.trim();
      if (!a) return;
      const gun = Number(sure.value);
      oyun.gelistiriciDegistir(x => bayrakKoy(x, a, degerCoz(deger.value), { sure: gun > 0 ? gun * 1440 : undefined, npc: npcGirdi.value.trim() || undefined }), `bayrak ${a} = ${deger.value}`);
      yenile();
    }, 'birincil')),
  ];
}

// ------------------------------------------------------------- NPC

function npcBolumu() {
  const durum = d(), veri = oyun.veri;
  const npcler = durum.npcler || {};
  const sb = veri.npc.sohbet;
  const degistir = (id, ad, x) => { oyun.gelistiriciDegistir(y => { const k = y.npcler[id]; k.iliski[ad] = (k.iliski[ad] ?? 0) + x; }, `${id} ${ad} ${x > 0 ? '+' : ''}${x}`); yenile(); };
  const olaySec = id => {
    const s = h('select', { class: 'dev-girdi' }, veri.npc.hayatOlaylari.olaylar.map(o => h('option', { value: o.id }, o.id)));
    return satir(s, dugme('Yaşat', () => { oyun.gelistiriciDegistir(y => hayatOlayiTetikle(y, veri, id, s.value), `${id}: ${s.value}`); yenile(); }));
  };
  const kart = (id, k) => {
    const n = kisiGuncel(durum, veri, id);
    if (!n) return h('div', { class: 'dev-kart' }, id);
    const f = flortDurumu(durum, veri, id);
    return h('div', { class: 'dev-kart' },
      h('div', {}, h('b', {}, `${n.tamAd} `), h('span', { class: 'soluk kucuk' }, `${id} · ${n.yas} · ${kusak(n, sb)} · ${n.uslup} · ${n.medeni}${k.iliskiTuru ? ' · ' + k.iliskiTuru : ''}${n.yok ? ' · ' + n.yok : ''}`)),
      h('div', { class: 'kucuk' }, npcTanimi(n, veri)),
      h('div', { class: 'kucuk' }, Object.entries(k.iliski || {}).map(([a, v]) => `${a} ${v}`).join(' · ') || 'ilişki değeri yok'),
      h('div', { class: 'kucuk soluk' }, `hitap: ${hitapSec(durum, veri, n)} · flört: ${f.uygun ? 'uygun' : 'yaş uygun değil'}${f.engel ? ' (engel: ' + f.engel + ')' : ''} · ilgi ${f.ilgi} · yönelim ${f.yonelim}${k.numara ? ' · numara var' : ''}${k.randevu !== undefined ? ' · buluşma günü ' + (k.randevu + 1) : ''}`),
      h('div', { class: 'kucuk soluk' }, `bildiği: ${Object.keys(k.bilinen || {}).join(', ') || '—'}`),
      ...(k.hayat || []).map(x => h('div', { class: 'kucuk' }, `${x.gun + 1}. gün: ${x.id}${x.meslek ? ' (' + x.meslek + ')' : ''}${x.bilinen ? '' : ' — henüz bilmiyorsun'}`)),
      ...(k.anilar || []).slice(-4).map(a => h('div', { class: 'soluk kucuk' }, `${zamanYaz(a.zaman ?? a.z ?? 0)}: ${a.metin}`)),
      (() => {
        const kutu = h('pre', { class: 'kucuk dev-kart-metin', style: { whiteSpace: 'pre-wrap', display: 'none' } });
        return h('div', {}, dugme('Kişi kartı', e => { if (!kutu.textContent) kutu.textContent = kartMetni(kisiKarti(durum, veri, id)); kutu.style.display = kutu.style.display === 'none' ? 'block' : 'none'; e.target.textContent = kutu.style.display === 'none' ? 'Kişi kartı' : 'Kartı gizle'; }), kutu);
      })(),
      satir(dugme('Yakınlık +20', () => degistir(id, 'yakinlik', 20)), dugme('Çekim +20', () => degistir(id, 'cekim', 20)), dugme('Gerginlik 0', () => degistir(id, 'gerginlik', -(k.iliski.gerginlik ?? 0)))),
      olaySec(id));
  };
  const tanidik = Object.entries(npcler).filter(([, k]) => k.tanisildi !== undefined);
  const diger = Object.entries(npcler).filter(([, k]) => k.tanisildi === undefined);
  const m = durum.konum?.mekan && durum.konum.mekan !== 'ev' ? oyun.veri.dunya.mekanlar.mekanlar.find(x => x.id === durum.konum.mekan) : null;
  const burada = m ? oyun.mekandakiler(m) : [];
  return [
    bos('Kişiler seed\'den üretilir; kayıtta yalnızca ilişkiler, anılar, öğrendikleri ve hayatlarındaki değişiklikler durur.'),
    m ? baslik(`Şu an ${m.ad}`) : null,
    ...burada.map(x => { const n = oyun.kisiBilgisi(x.id); return h('div', { class: 'kucuk' }, `${x.ad} — ${x.id} · ${n.yas} · ${n.cinsiyet} · ${n.medeni} · ilgi ${n.ilgi} · ${n.yonelim}${n.engel ? ' · engel ' + n.engel : ''}`); }),
    baslik(`Tanıdıklar (${tanidik.length})`),
    ...(tanidik.length ? tanidik.map(([id, k]) => kart(id, k)) : [bos('Henüz tanışılan kimse yok.')]),
    diger.length ? baslik(`Kayıtta olup tanışmadıkların (${diger.length})`) : null,
    ...diger.map(([id, k]) => h('div', { class: 'dev-kart kucuk' }, `${id} · ${Object.entries(k.iliski || {}).map(([a, v]) => `${a} ${v}`).join(' · ')}`)),
  ].filter(Boolean);
}

// ------------------------------------------------------------- Hatalar

function hatalar() {
  const liste = hataListesi().slice().reverse();
  const kayitH = kayit.hatalar.slice().reverse();
  return [
    satir(dugme('Hata raporunu kopyala', async e => { const s = await raporuKopyala(); e.target.textContent = s.tamam ? 'Kopyalandı ✓' : 'Olmadı'; }, 'birincil'),
      dugme('Deneme hatası', () => guvenli('gelistirici:deneme', () => { throw new Error('Geliştirici panelinden deneme hatası'); }, { yenidenDene: () => {} }))),
    baslik(`Yakalanan hatalar (${liste.length})`),
    ...(liste.length ? liste.map(x => h('div', { class: 'dev-kart' },
      h('div', { class: x.ciddi ? 's-kotu' : '' }, `${x.ciddi ? 'CİDDİ · ' : ''}${x.kaynak || x.tur}`),
      h('div', { class: 'kucuk hata-ayrinti' }, x.mesaj),
      h('div', { class: 'soluk kucuk' }, x.zaman))) : [bos('Yok.')]),
    baslik(`Kayıt sistemi uyarıları (${kayitH.length})`),
    ...(kayitH.length ? kayitH.map(x => h('div', { class: 'dev-kart kucuk' }, `${x.zaman}: ${x.mesaj} — ${x.hata}`)) : [bos('Yok.')]),
  ];
}

// Sürüm satırına art arda 7 dokunuş
export function yediDokunusKur(el, altYazi, normalMetin) {
  let sayi = 0, zamanlayici = null;
  el.addEventListener('click', () => {
    sayi++;
    clearTimeout(zamanlayici);
    zamanlayici = setTimeout(() => { sayi = 0; altYazi.textContent = normalMetin; }, 2500);
    if (sayi >= 7) { sayi = 0; altYazi.textContent = normalMetin; gelistiriciPaneliAc(); return; }
    if (sayi >= 4) altYazi.textContent = `${normalMetin} · ${7 - sayi} dokunuş kaldı`;
  });
}
