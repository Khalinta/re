// "Şimdi" ekranı: anlatım akışı (üst) + kısayollar ve seçenekler (alt, başparmak bölgesi).
import { h } from '../dom.js';
import { IKON } from '../ikonlar.js';
import { Anlatim } from '../anlatim.js';
import { secenekleriGoster } from '../secenekler.js';
import { onayIste, bilgiGoster } from '../panel.js';
import { sure as sureYaz, saat } from '../../core/format.js';
import { ek } from '../../core/tr.js';
import * as oyun from '../../oyun.js';
import { guvenli } from '../../hata.js';
import { sekmeyeGec } from '../arayuz.js';
import { yeniHayatSec } from './yenihayat.js';

// Hamle hata verirse: hata paneli açılır; "Devam et" menüyü yeniden kurar.
const hataSecenekleri = () => ({ yenidenDene: () => menuyuGoster(), yenidenBaslat: () => location.reload() });

let anlatim, secenekKap, serbestKap;

export const simdiEkrani = {
  olustur(kap) {
    const anlatimKap = h('div', { class: 'anlatim' });
    secenekKap = h('div', { class: 'secenekler' });
    serbestKap = h('div', { class: 'serbest' });
    const kisayollar = h('div', { class: 'kisayollar' },
      kisayol(IKON.uyu, 'Uyu', uyu),
      kisayol(IKON.is, 'İşe git', () => bilgiGoster('İşe git', 'Henüz bir işin yok. İş sistemi Faz 4\'te geliyor.'), true),
      kisayol(IKON.tekrar, 'Rutini tekrarla', () => bilgiGoster('Rutini tekrarla', 'Bir hafta boyunca günlük rutinini tekrarlar; bir olay çıkarsa durur. İş ve olay sistemleriyle birlikte gelecek.'), true),
    );
    kap.append(anlatimKap, h('div', { class: 'alt-bolge' }, kisayollar, serbestKap, secenekKap));
    anlatim = new Anlatim(anlatimKap);
  },
  tekrarDokunus() { anlatim?.enAlta(true); },
};

function kisayol(ikon, metin, eylem, soluk = false) {
  return h('button', { class: 'kisayol' + (soluk ? ' soluk' : ''), onclick: eylem },
    h('span', { html: ikon }), h('span', {}, metin));
}

// Kayıttan dönüldüğünde geçmiş anlatımı anında (yazma efekti olmadan) geri koyar
export function gecmisiYukle(paragraflar) {
  anlatim.temizle();
  anlatim.ekle(paragraflar);
  anlatim.atla();
  anlatim.enAlta();
}

// Etkin oyunu (kayıttan yüklenmiş) ekrana koyar
export async function oyunuGoster() {
  gecmisiYukle(oyun.durumAl().anlatim);
  await anlatim.sira;
  anlatim.enAlta();
  menuyuGoster();
}

// Yeni oyun başlatır ve girişi yazar. Seçim verilmediyse önce yeni hayat ekranı (başlangıç tipi, cinsiyet, ad).
export async function yeniOyunuGoster(secenek = {}) {
  anlatim.temizle();
  secenekKap.replaceChildren();
  if (!secenek.secim) secenek = { ...secenek, ...(await yeniHayatSec({ seed: secenek.seed })) };
  oyun.yeniOyun(secenek);
  await anlatim.sira;
  menuyuGoster();
}

export function paragraflariGoster(paragraflar) {
  return anlatim.ekle(paragraflar);
}

// Serbest sohbet (3.9): biriyle konuşurken, yapay zekâ açıksa yazma kutusu + önerilen cevaplar
let taslak = ''; // gönderilemeyen söz (sınır doldu, bağlantı koptu): kutuda kalır, yeniden yazmak gerekmez
function serbestCiz() {
  if (!oyun.serbestSohbetVar()) { serbestKap.replaceChildren(); return; }
  const girdi = h('textarea', { class: 'serbest-girdi', rows: '1', maxlength: '600', placeholder: 'Ne söylersin? (istediğini yaz)', enterkeyhint: 'send' });
  girdi.value = taslak;
  const gonder = h('button', { class: 'dugme birincil serbest-gonder', 'aria-label': 'Söyle' }, 'Söyle');
  const durumYazi = h('span', { class: 'serbest-durum soluk kucuk' });
  const yolla = async metin => {
    metin = (metin ?? girdi.value).trim();
    if (!metin) return;
    serbestKap.classList.add('bekliyor'); secenekKap.classList.add('kilitli');
    girdi.disabled = true; gonder.disabled = true; durumYazi.textContent = 'karşılık bekleniyor…';
    try {
      const s = await oyun.serbestKonus(metin);
      taslak = !s.tamam && s.hata ? metin : '';
      if (!s.tamam && s.hata === 'anahtar') bilgiGoster('Yapay zekâ', `${s.sebep}\n\nDaha Fazla → Yapay zekâ sohbeti bölümünden anahtarı kontrol et.`);
    } catch (e) {
      bilgiGoster('Yapay zekâ', 'Bir şey ters gitti: ' + (e?.message ?? e));
    }
    serbestKap.classList.remove('bekliyor'); secenekKap.classList.remove('kilitli');
    await anlatim.sira;
    menuyuGoster();
  };
  gonder.addEventListener('click', () => yolla());
  girdi.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); yolla(); } });
  girdi.addEventListener('input', () => { girdi.style.height = 'auto'; girdi.style.height = Math.min(120, girdi.scrollHeight) + 'px'; });
  const oneriler = oyun.serbestOneriler();
  serbestKap.replaceChildren(
    oneriler.length ? h('div', { class: 'serbest-oneriler' }, oneriler.map(o => h('button', { class: 'serbest-oneri', onclick: () => yolla(o) }, o))) : null,
    h('div', { class: 'serbest-satir' }, girdi, gonder), durumYazi);
}

export function menuyuGoster() {
  serbestCiz();
  if (oyun.aktifOlayVar()) { olayMenusu(); return; }
  const liste = oyun.aksiyonListesi().filter(x => !x.a.kisayol);
  secenekleriGoster(secenekKap, liste.map(x => ({
    id: x.a.id,
    metin: x.a.ad,
    alt: x.a.alt,
    maliyet: x.maliyet,
    devreDisi: !x.tamam,
    sebep: x.sebep,
  })), async s => {
    const sonuc = await guvenli('aksiyon:' + s.id, () => oyun.aksiyonYap(s.id), hataSecenekleri());
    if (!sonuc) return; // hata paneli açık; "Devam et" menüyü yeniden kurar
    if (!sonuc.tamam) bilgiGoster(s.metin, sonuc.sebep);
    await anlatim.sira;
    menuyuGoster();
  });
}

// Başka bir ekrandan (Şehir) yapılan hamle: başarılıysa Şimdi'ye geçilir ve anlatım orada akar
export async function disaridanHamle(etiket, is) {
  if (oyun.aktifOlayVar()) { bilgiGoster('Şimdi olmaz', 'Önce şu an olanla ilgilen.'); sekmeyeGec('simdi'); return; }
  const sonuc = await guvenli(etiket, is, hataSecenekleri());
  if (!sonuc) return;
  if (!sonuc.tamam) { bilgiGoster('Olmadı', sonuc.sebep); return; }
  sekmeyeGec('simdi');
  await anlatim.sira;
  menuyuGoster();
}

// Etkin olayın seçenekleri
function olayMenusu() {
  secenekleriGoster(secenekKap, oyun.olaySecenekleriAl().map(x => ({ ...x, ton: 'olay' })), async s => {
    const sonuc = await guvenli('olaySecenegi', () => oyun.olaySeceneginiYap(s.sira), hataSecenekleri());
    if (!sonuc) return;
    if (!sonuc.tamam) bilgiGoster(s.metin, sonuc.sebep);
    await anlatim.sira;
    menuyuGoster();
  });
}

async function uyu() {
  if (oyun.aktifOlayVar()) { bilgiGoster('Uyu', 'Önce şu an olanla ilgilen.'); return; }
  const a = oyun.aksiyonBul('uyu');
  const x = oyun.aksiyonListesi().find(y => y.a === a);
  if (!x.tamam) { bilgiGoster('Uyu', x.sebep); return; }
  const d = oyun.durumAl();
  const bitis = saat(d.zaman.dakika + x.maliyet.dakika);
  const ok = await onayIste({ baslik: 'Uyu', metin: `${ek(bitis, 'e')} kadar uyuyacaksın (${sureYaz(x.maliyet.dakika)}).`, evet: 'Uyu', hayir: 'Vazgeç' });
  if (!ok) return;
  secenekKap.classList.add('kilitli');
  const sonuc = await guvenli('aksiyon:uyu', () => oyun.aksiyonYap('uyu'), hataSecenekleri());
  if (!sonuc) return;
  await anlatim.sira;
  menuyuGoster();
}
