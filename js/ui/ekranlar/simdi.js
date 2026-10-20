// "Şimdi" ekranı: anlatım akışı (üst) + kısayollar ve seçenekler (alt, başparmak bölgesi).
// DİKKAT: Bu dosyadaki sahne geçici bir DENEMEDİR (adım 1.4). Adım 1.5'te gerçek oyun durumu
// ve zaman sistemi bağlanınca deneme kısmı kaldırılacak.
import { h } from '../dom.js';
import { IKON } from '../ikonlar.js';
import { Anlatim } from '../anlatim.js';
import { secenekleriGoster } from '../secenekler.js';
import { onayIste, bilgiGoster } from '../panel.js';
import { saat, tarih, tarihKisa, GUNLER } from '../../core/format.js';
import { Rng } from '../../core/rng.js';

let anlatim, secenekKap, durumGuncelle;

export const simdiEkrani = {
  olustur(kap) {
    const anlatimKap = h('div', { class: 'anlatim' });
    secenekKap = h('div', { class: 'secenekler' });
    const kisayollar = h('div', { class: 'kisayollar' },
      kisayol(IKON.uyu, 'Uyu', () => uyu()),
      kisayol(IKON.is, 'İşe git', () => bilgiGoster('İşe git', 'Henüz bir işin yok. İş sistemi Faz 4\'te geliyor.'), true),
      kisayol(IKON.tekrar, 'Rutini tekrarla', () => bilgiGoster('Rutini tekrarla', 'Bir hafta boyunca günlük rutinini tekrarlar; bir olay çıkarsa durur. Zaman sistemiyle (1.5) birlikte gelecek.'), true),
    );
    kap.append(anlatimKap, h('div', { class: 'alt-bolge' }, kisayollar, secenekKap));
    anlatim = new Anlatim(anlatimKap);
  },
  tekrarDokunus() { anlatim?.enAlta(true); },
};

function kisayol(ikon, metin, eylem, soluk = false) {
  return h('button', { class: 'kisayol' + (soluk ? ' soluk' : ''), onclick: eylem },
    h('span', { html: ikon }), h('span', {}, metin));
}

// ---------------- DENEME SAHNESİ (1.5'te kaldırılacak) ----------------

const BASLANGIC = Date.UTC(2026, 9, 20);
const deneme = { dakika: 8 * 60 + 15, para: 1250, enerji: 62, ruh: 55, aclik: 40, stres: 45, hijyen: 70, saglik: 82 };
const rng = Rng.akis('deneme-sahnesi', 'pencere');

const dilimAdi = d => { const s = Math.floor((d % 1440) / 60); return s >= 6 && s < 12 ? 'Sabah' : s < 17 && s >= 12 ? 'Öğle' : s >= 17 && s < 22 ? 'Akşam' : 'Gece'; };
const tarihAl = () => new Date(BASLANGIC + deneme.dakika * 60000);

function durumVerisi() {
  const t = tarihAl();
  return {
    saat: saat(deneme.dakika), gunKisa: tarihKisa(t), tarihUzun: tarih(t), dilim: dilimAdi(deneme.dakika),
    para: deneme.para, enerji: deneme.enerji, ruh: deneme.ruh,
    ayrinti: [
      { ad: 'Sağlık', deger: deneme.saglik },
      { ad: 'Enerji', deger: deneme.enerji },
      { ad: 'Açlık', deger: deneme.aclik, ters: true },
      { ad: 'Hijyen', deger: deneme.hijyen },
      { ad: 'Ruh hali', deger: deneme.ruh },
      { ad: 'Stres', deger: deneme.stres, ters: true },
    ],
  };
}

function gecir(dk, degisim = {}) {
  deneme.dakika += dk;
  for (const [k, v] of Object.entries(degisim)) deneme[k] = k === 'para' ? deneme[k] + v : Math.max(0, Math.min(100, deneme[k] + v));
  durumGuncelle?.(durumVerisi());
}

const PENCERE = [
  'Karşı apartmanda biri balkona çamaşır asıyor. Mandalları ağzına almış, bir yandan da telefonla kavga ediyor.',
  'Sokakta simitçi bağırıyor. Sesi her sabah biraz daha kısık geliyor sanki.',
  'Bir kedi, park etmiş bir arabanın kaputunda güneşleniyor. Dünyanın en dertsiz canlısı.',
  'Çöp kamyonu geçiyor; arkasından iki çocuk koşuyor, neden koştuklarını kendileri de bilmiyor.',
];

export function denemeyiBaslat(guncelleFn) {
  durumGuncelle = guncelleFn;
  durumGuncelle(durumVerisi());
  const t = tarihAl();
  anlatim.ekle(
    { tur: 'ayrac', metin: `${GUNLER[t.getUTCDay()]}, ${dilimAdi(deneme.dakika).toLocaleLowerCase('tr-TR')}` },
    'Bu bir deneme sahnesi. Gerçek hikaye henüz yazılmadı; burada ekranın nasıl çalıştığını görüyorsun.',
    { tur: 'icses', metin: 'İnsan kendi hayatının provasını izliyormuş gibi hissediyor.' },
  ).then(menu);
}

function menu() {
  secenekleriGoster(secenekKap, [
    { metin: 'Pencereden dışarı bak', maliyet: { dakika: 5 } },
    { metin: 'Çay demle', maliyet: { dakika: 15, enerji: -5 }, alt: 'Demlik çatlak ama iş görür.' },
    { metin: 'Bakkaldan simit al', maliyet: { dakika: 20, para: 15 } },
    { metin: 'Uzun bir şey oku', maliyet: { dakika: 30 }, alt: 'Kaydırmayı ve yazı hızını dener.' },
    { metin: 'Önemli bir karar ver', alt: 'Alttan açılan onay panelini dener.' },
    { metin: 'Komşunun kapısını çal', devreDisi: true, sebep: 'Saat daha çok erken; ayıp olur.' },
  ], sec);
}

async function sec(s) {
  anlatim.ekle({ tur: 'secim', metin: s.metin });
  if (s.metin.startsWith('Pencere')) {
    gecir(5, { ruh: 2 });
    await anlatim.ekle(rng.sec(PENCERE));
  } else if (s.metin.startsWith('Çay')) {
    gecir(15, { enerji: 5, ruh: 3 });
    await anlatim.ekle('Demlik fokurdarken mutfağı ince bir koku sarıyor.', { tur: 'konusma', konusan: 'İç ses', metin: 'Tavşan kanı olsun bari. Hayat zaten açık.' }, { tur: 'sistem', metin: '+5 enerji' });
  } else if (s.metin.startsWith('Bakkal')) {
    gecir(20, { para: -15, aclik: -15 });
    await anlatim.ekle(
      { tur: 'konusma', konusan: 'Bakkal Hüsnü', metin: 'Hoş geldin evladım. Simit sıcak, yeni geldi. Çay da var istersen, ocakta.' },
      'Simidi alıp çıkıyorsun. Susamın yarısı daha merdivenlerde dökülüyor.',
      { tur: 'sistem', metin: '−15 ₺' });
  } else if (s.metin.startsWith('Uzun')) {
    gecir(30, { stres: -5 });
    await anlatim.ekle(
      'Raftaki eski kitabı alıyorsun. Kapağı yıpranmış, sayfaların kenarı sararmış. İlk sayfada birinin el yazısıyla bir not var: "Her şey bittiğinde, aslında yeni başlar." Kimin yazdığını hatırlamıyorsun.',
      'Okudukça dışarıdaki sesler uzaklaşıyor. Bir paragrafı üç kez okuyorsun, çünkü aklın sürekli başka yere kayıyor: ödenmemiş faturalara, aranmamış telefonlara, geçen yılın bu zamanına.',
      'Sonra bir cümle seni yakalıyor ve bırakmıyor. Kitabı kapatıp bir süre tavana bakıyorsun.',
      { tur: 'icses', metin: 'Belki de mesele hiç düşmemek değil, nasıl kalktığın.' });
  } else if (s.metin.startsWith('Önemli')) {
    const evet = await onayIste({ baslik: 'Kararını ver', metin: 'Bu bir deneme. Gerçek oyunda burada geri dönüşü olmayan kararlar olacak.', evet: 'Kararımı verdim', hayir: 'Biraz daha düşüneyim' });
    await anlatim.ekle(evet ? 'Derin bir nefes alıyorsun. Karar verildi; artık geri dönüş yok.' : 'Acele etmemeye karar veriyorsun. Bazı kararlar bekleyebilir.');
  }
  menu();
}

async function uyu() {
  const sabah = (Math.floor(deneme.dakika / 1440) + 1) * 1440 + 7 * 60;
  const ok = await onayIste({ baslik: 'Uyu', metin: 'Sabah 07:00\'ye kadar uyuyacaksın.', evet: 'Uyu', hayir: 'Vazgeç' });
  if (!ok) return;
  gecir(sabah - deneme.dakika, { enerji: 40, aclik: 20, hijyen: -10 });
  const t = tarihAl();
  await anlatim.ekle({ tur: 'ayrac', metin: `${GUNLER[t.getUTCDay()]}, sabah` }, 'Gözünü açtığında perdenin aralığından ince bir ışık sızıyor.');
  menu();
}
