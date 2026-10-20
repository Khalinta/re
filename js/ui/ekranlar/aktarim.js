// Dışa / içe aktarma panelleri.
import { h } from '../dom.js';
import { panelAc, onayIste, bilgiGoster, enUstPaneliKapat } from '../panel.js';
import { para, tarih, saat, sayi } from '../../core/format.js';
import { tarihAl, gunNo } from '../../core/zaman.js';
import { kodaCevir, iceAktarilaniCoz, dosyaIcerigi, dosyaAdi } from '../../core/aktarim.js';
import { ek } from '../../core/tr.js';
import * as kayit from '../../kayit.js';
import * as oyun from '../../oyun.js';
import { oyunuGoster } from './simdi.js';
import { sekmeyeGec } from '../arayuz.js';

export async function panoyaKopyala(metin) {
  try {
    await navigator.clipboard.writeText(metin);
    return true;
  } catch {
    // Eski yol: geçici bir metin alanını seçip kopyala
    const t = h('textarea', { style: { position: 'fixed', top: '-1000px', opacity: '0' } });
    t.value = metin;
    document.body.append(t);
    t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    t.remove();
    return ok;
  }
}

// Dosyayı iPhone paylaşım menüsüyle (Dosyalar'a Kaydet) ya da indirme olarak verir
export async function dosyaVer(ad, icerik, tur = 'application/json') {
  const dosya = new File([icerik], ad, { type: tur });
  if (navigator.canShare?.({ files: [dosya] })) {
    try { await navigator.share({ files: [dosya], title: ad }); return 'paylasildi'; } catch (e) {
      if (e?.name === 'AbortError') return 'vazgecildi';
    }
  }
  const url = URL.createObjectURL(dosya);
  const a = h('a', { href: url, download: ad });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'indirildi';
}

function ozetMetni(o) {
  const t = tarihAl(o.baslangic, o.dakika);
  return `${o.ad} · ${gunNo(o.dakika) + 1}. gün · ${tarih(t, { gunAdi: false })} ${saat(o.dakika)} · ${para(o.para)}`;
}

export async function disaAktarGoster(n) {
  if (n === kayit.aktifYuva()) await kayit.hemenKaydet();
  const zarf = await kayit.depoAl().enIyiZarf(n);
  if (!zarf) { bilgiGoster('Dışa aktar', 'Bu yuvada dışa aktarılacak sağlam bir kayıt yok.'); return; }
  const kod = await kodaCevir(zarf);
  const alan = h('textarea', { class: 'kod-alani', readonly: true, rows: 5, 'aria-label': 'Kayıt kodu' });
  alan.value = kod;
  alan.addEventListener('focus', () => alan.select());
  const durumYazi = h('p', { class: 'soluk kucuk' }, `${sayi(kod.length)} karakter. Bu kodu bir nota ya da kendine mesaj olarak sakla; aynı oyunu başka cihazda da açabilirsin.`);
  panelAc({
    baslik: `Yuva ${n} · Dışa aktar`,
    icerik: h('div', {}, h('p', {}, ozetMetni(zarf.ozet)), alan, durumYazi),
    altBilgi: h('div', { class: 'dugme-yigini' },
      h('button', { class: 'dugme birincil', onclick: async e => {
        const ok = await panoyaKopyala(kod);
        e.target.textContent = ok ? 'Kopyalandı ✓' : 'Kopyalanamadı — kutuya dokunup elle kopyala';
      } }, 'Kodu kopyala'),
      h('button', { class: 'dugme', onclick: async e => {
        const s = await dosyaVer(dosyaAdi(zarf, n), dosyaIcerigi(zarf));
        if (s === 'indirildi') e.target.textContent = 'İndirildi ✓';
        if (s === 'paylasildi') e.target.textContent = 'Kaydedildi ✓';
      } }, 'Dosya olarak kaydet')),
  });
}

export function iceAktarGoster(kayitlariYenile) {
  const alan = h('textarea', { class: 'kod-alani', rows: 5, placeholder: 'YND1.… ile başlayan kodu buraya yapıştır', 'aria-label': 'Kayıt kodu', autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false' });
  const dosyaGirdi = h('input', { type: 'file', accept: '.json,application/json,text/plain', hidden: true });
  const hata = h('p', { class: 'eksi kucuk', hidden: true });
  let p;

  const coz = async metin => {
    hata.hidden = true;
    try {
      const { durum } = await iceAktarilaniCoz(metin);
      p.kapat();
      yuvaSec(durum, kayitlariYenile);
    } catch (e) {
      hata.textContent = e.message;
      hata.hidden = false;
    }
  };
  dosyaGirdi.addEventListener('change', async () => {
    const f = dosyaGirdi.files?.[0];
    if (f) coz(await f.text());
    dosyaGirdi.value = '';
  });

  p = panelAc({
    baslik: 'İçe aktar',
    icerik: h('div', {}, h('p', { class: 'soluk kucuk' }, 'Daha önce dışa aktardığın kodu yapıştır ya da kayıt dosyasını seç. Hangi yuvaya yükleneceğini sonra seçeceksin.'), alan, hata, dosyaGirdi),
    altBilgi: h('div', { class: 'dugme-yigini' },
      h('button', { class: 'dugme birincil', onclick: () => coz(alan.value) }, 'Kodu aç'),
      h('button', { class: 'dugme', onclick: () => dosyaGirdi.click() }, 'Dosyadan seç')),
  });
}

async function yuvaSec(durum, kayitlariYenile) {
  const ozetler = await kayit.depoAl().yuvaOzetleri();
  const o = { ad: durum.karakter.ad, baslangic: durum.zaman.baslangic, dakika: durum.zaman.dakika, para: durum.para };
  let p;
  const dugmeler = ozetler.map(y => h('button', { class: 'dugme', onclick: async () => {
    if (!y.bos) {
      const ok = await onayIste({ baslik: `${ek('Yuva ' + y.yuva, 'e')} yüklensin mi?`, metin: 'Bu yuvadaki oyunun şu anki hali önce yedeklenecek; Yedekler\'den geri getirebilirsin.', evet: 'Yükle', hayir: 'Vazgeç' });
      if (!ok) return;
    }
    try {
      if (y.yuva === kayit.aktifYuva()) await kayit.hemenKaydet();
      await kayit.depoAl().iceAktar(y.yuva, durum);
      p.kapat();
      const simdiOyna = await onayIste({ baslik: 'Yüklendi', metin: `Kayıt ${ek('Yuva ' + y.yuva, 'e')} yazıldı. Şimdi bu oyuna geçilsin mi?`, evet: 'Oyuna geç', hayir: 'Kayıtlarda kal' });
      if (simdiOyna) {
        kayit.aktifYuvaYap(y.yuva);
        kayit.yuvaHazirla(y.yuva);
        kayit.askiyaAl(false);
        const s = await kayit.yukle(y.yuva);
        oyun.durumYukle(s.durum);
        while (enUstPaneliKapat());
        sekmeyeGec('simdi');
        oyunuGoster();
      } else kayitlariYenile?.();
    } catch (e) { bilgiGoster('Yüklenemedi', e.message); }
  } }, `Yuva ${y.yuva}`, h('span', { class: 'soluk kucuk' }, y.bos ? ' · boş' : y.bozuk ? ' · okunamıyor' : ' · dolu (yedeklenir)')));
  p = panelAc({
    baslik: 'Hangi yuvaya?',
    icerik: h('div', {}, h('p', {}, 'Kayıt sağlam ✓'), h('p', { class: 'soluk' }, ozetMetni(o))),
    altBilgi: h('div', { class: 'dugme-yigini' }, dugmeler),
  });
}
