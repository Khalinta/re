// Kayıtlar paneli: 3 yuva, yedekler, depolama durumu.
import { h, bosalt } from '../dom.js';
import { panelAc, onayIste, bilgiGoster, enUstPaneliKapat } from '../panel.js';
import { para, tarih, saat, onceMetni } from '../../core/format.js';
import { tarihAl, gunNo } from '../../core/zaman.js';
import * as kayit from '../../kayit.js';
import * as oyun from '../../oyun.js';
import { oyunuGoster, yeniOyunuGoster } from './simdi.js';
import { sekmeyeGec } from '../arayuz.js';

function ozetSatiri(o) {
  if (!o) return '';
  const t = tarihAl(o.baslangic, o.dakika);
  return `${gunNo(o.dakika) + 1}. gün · ${tarih(t, { gunAdi: false })} ${saat(o.dakika)} · ${para(o.para)}`;
}

export async function kayitlariGoster() {
  const govde = h('div', { class: 'kayitlar' }, h('p', { class: 'soluk' }, 'Yükleniyor…'));
  panelAc({ baslik: 'Kayıtlar', icerik: govde });
  await ciz(govde);
}

async function ciz(govde) {
  const depo = kayit.depoAl();
  const ozetler = await depo.yuvaOzetleri();
  const aktif = kayit.aktifYuva();
  const bilgi = kayit.depolamaBilgisi();

  const kartlar = ozetler.map(y => {
    const benim = y.yuva === aktif;
    const dugmeler = [];
    if (y.bos) {
      dugmeler.push(dugme('Burada yeni oyun başlat', () => yeniOyun(y.yuva, false), 'birincil'));
    } else {
      if (!benim && !y.bozuk) dugmeler.push(dugme('Bu oyuna geç', () => gec(y.yuva), 'birincil'));
      dugmeler.push(dugme('Yedekler', () => yedekleriGoster(y.yuva, govde)));
      dugmeler.push(dugme('Yeni oyun', () => yeniOyun(y.yuva, true)));
      if (!benim) dugmeler.push(dugme('Sil', () => sil(y.yuva, govde), 'tehlikeli-metin'));
    }
    return h('div', { class: 'yuva-kart' + (benim ? ' aktif' : '') },
      h('div', { class: 'yuva-ust' },
        h('b', {}, `Yuva ${y.yuva}`),
        benim ? h('span', { class: 'rozet' }, 'Oynanıyor') : null,
        y.bozuk ? h('span', { class: 'rozet kotu' }, 'Okunamadı') : null),
      y.bos ? h('div', { class: 'soluk' }, 'Boş')
        : y.bozuk ? h('div', { class: 'soluk' }, 'Bu yuvadaki kayıt okunamadı. Yedeklerden geri getirebilirsin.')
          : h('div', {},
            h('div', {}, y.ozet.ad),
            h('div', { class: 'soluk kucuk' }, ozetSatiri(y.ozet)),
            h('div', { class: 'soluk kucuk' }, 'Son kayıt: ' + onceMetni(y.kayitZamani))),
      h('div', { class: 'yuva-dugmeler' }, dugmeler));
  });

  const depolama = h('div', { class: 'kart depolama-kart' },
    h('div', { class: 'ozet-satir' }, h('span', {}, 'Kayıt yeri'),
      h('span', { class: 'soluk' }, bilgi.anaTuru === 'indexeddb' ? 'Telefon içi veritabanı + yedek kopya' : 'Yalnızca tarayıcı deposu')),
    h('div', { class: 'ozet-satir' }, h('span', {}, 'Kalıcı depolama'),
      h('span', { class: bilgi.kalici ? 's-iyi' : 's-orta' }, bilgi.kalici ? 'İzin verildi ✓' : 'İzin verilmedi')),
    bilgi.kalici ? null : h('p', { class: 'soluk kucuk' },
      'Telefon yer darlığında bu uygulamanın verisini silebilir. Ana ekrana eklenmiş uygulamada bu çok nadirdir; yine de arada bir kaydını dışa aktarman iyi olur (dışa aktarma bir sonraki güncellemede geliyor).'),
    bilgi.kalici ? null : dugme('İzni tekrar iste', async () => {
      const ok = await kayit.kaliciTekrarIste();
      bilgiGoster('Kalıcı depolama', ok ? 'İzin verildi. Kayıtların artık daha güvende.' : 'Tarayıcı izni yine vermedi. Bu genellikle uygulama ana ekrana eklenince düzelir.');
      ciz(govde);
    }));

  bosalt(govde, kartlar, h('h2', { class: 'bolum-baslik' }, 'Depolama'), depolama);
}

function dugme(metin, eylem, tur = '') {
  return h('button', { class: 'dugme kucuk-dugme ' + tur, onclick: eylem }, metin);
}

function hepsiniKapat() { while (enUstPaneliKapat()); }

async function gec(n) {
  await kayit.hemenKaydet();
  const onceki = kayit.aktifYuva();
  kayit.aktifYuvaYap(n);
  kayit.yuvaHazirla(n);
  try {
    const s = await kayit.yukle(n);
    if (!s) throw new Error('Yuva boş');
    oyun.durumYukle(s.durum);
    hepsiniKapat();
    sekmeyeGec('simdi');
    oyunuGoster();
  } catch (e) {
    kayit.aktifYuvaYap(onceki);
    bilgiGoster('Geçilemedi', 'Bu kayıt açılamadı: ' + e.message);
  }
}

async function yeniOyun(n, dolu) {
  if (dolu) {
    const ok = await onayIste({
      baslik: `Yuva ${n}: yeni oyun`,
      metin: 'Bu yuvadaki oyunun son hali yedeklere alınacak (Yedekler\'den geri getirebilirsin), sonra yeni bir hayat başlayacak.',
      evet: 'Yeni oyun başlat', hayir: 'Vazgeç',
    });
    if (!ok) return;
  }
  await kayit.hemenKaydet();
  if (dolu) await kayit.depoAl().yedekAl(n);
  kayit.aktifYuvaYap(n);
  kayit.yuvaHazirla(n);
  kayit.askiyaAl(false);
  hepsiniKapat();
  sekmeyeGec('simdi');
  yeniOyunuGoster();
}

async function sil(n, govde) {
  const ok = await onayIste({
    baslik: `Yuva ${n} silinsin mi?`,
    metin: 'Son hali yedeklere alınır; fikrini değiştirirsen Yedekler\'den geri getirebilirsin.',
    evet: 'Sil', hayir: 'Vazgeç', tehlikeli: true,
  });
  if (!ok) return;
  await kayit.depoAl().yuvaSil(n);
  ciz(govde);
}

async function yedekleriGoster(n, ustGovde) {
  const liste = await kayit.depoAl().yedekListesi(n);
  const govde = h('div', {});
  if (!liste.length) govde.append(h('p', { class: 'soluk' }, 'Bu yuva için henüz yedek yok. Yedekler oyun içinde her yeni günde ve her açılışta kendiliğinden alınır (en fazla 5).'));
  for (const y of liste) {
    govde.append(h('div', { class: 'yuva-kart' },
      h('div', {}, ozetSatiri(y.ozet)),
      h('div', { class: 'soluk kucuk' }, 'Alındı: ' + onceMetni(y.kayitZamani)),
      h('div', { class: 'yuva-dugmeler' }, dugme('Bu yedeğe dön', async () => {
        const ok = await onayIste({ baslik: 'Yedeğe dön', metin: 'Yuvanın şu anki hali önce yedeklenecek; sonra bu yedek yüklenecek.', evet: 'Yedeğe dön', hayir: 'Vazgeç' });
        if (!ok) return;
        try {
          await kayit.hemenKaydet();
          const d = await kayit.depoAl().yedektenDon(n, y.id);
          if (n === kayit.aktifYuva()) {
            kayit.yuvaHazirla(n);
            kayit.askiyaAl(false);
            oyun.durumYukle(d);
            hepsiniKapat();
            sekmeyeGec('simdi');
            oyunuGoster();
          } else {
            enUstPaneliKapat();
            ciz(ustGovde);
            bilgiGoster('Yedekten dönüldü', `Yuva ${n} bu yedeğe döndürüldü.`);
          }
        } catch (e) { bilgiGoster('Olmadı', 'Yedek açılamadı: ' + e.message); }
      }, 'birincil'))));
  }
  panelAc({ baslik: `Yuva ${n} · Yedekler`, icerik: govde });
}
