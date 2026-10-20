// Aksiyon döngüsü: bir aksiyonun yapılabilirliğini kontrol eder, uygular, anlatımını üretir.
// Her aksiyon zaman ve (çoğu) enerji harcar. Tanımlar data/aksiyonlar.json'da.
import { zamanGecir, uykuPlani, uykuDuzeniGuncelle, sinirla } from './simulasyon.js';
import { dilim } from './zaman.js';
import { aksiyonKaydet } from './durum.js';
import { kosulAcikla, nedenTutmadi } from './kosul.js';
import { sureliTemizle } from './bayrak.js';
import { para as paraYaz, sure as sureYaz } from './format.js';
import { metinCoz } from './metin.js';

// Döner: { tamam: true } ya da { tamam: false, sebep: '...', teknik?: [...] }
// a.kosul (koşul dili) tutmazsa oyuncuya a.kosulSebep gösterilir; teknik neden geliştirici paneli içindir.
export function aksiyonDurumu(durum, a, simCfg, veri = { sim: simCfg }) {
  const d = durum.durumlar;
  if (a.kosul !== undefined) {
    const ag = kosulAcikla(a.kosul, { durum, veri });
    if (!ag.tamam) return { tamam: false, sebep: a.kosulSebep || 'Şu an olmaz.', teknik: nedenTutmadi(ag) };
  }
  if (a.dilimler && !a.dilimler.includes(dilim(durum.zaman.dakika).id)) {
    const s = dilim(durum.zaman.dakika).id;
    return { tamam: false, sebep: s === 'gece' ? 'Gecenin bu saatinde olmaz.' : 'Şu saatte uygun değil.' };
  }
  if (a.para && durum.para < a.para) return { tamam: false, sebep: `Cebinde ${paraYaz(a.para)} yok.` };
  if (a.enerji && d.enerji < a.enerji) return { tamam: false, sebep: 'Buna enerjin kalmadı.' };
  if (a.ozel === 'uyku') {
    const plan = uykuPlani(durum.zaman.dakika, simCfg);
    if (!plan.gece && d.enerji > 70) return { tamam: false, sebep: 'Uykun yok. Gün ortasında tavana bakarak yatmanın anlamı yok.' };
    if (plan.gece && d.enerji > 92 && d.stres < 60) return { tamam: false, sebep: 'Hiç uykun yok.' };
  }
  return { tamam: true };
}

// Seçenek kartında gösterilecek bedel
export function aksiyonMaliyeti(durum, a, simCfg) {
  if (a.ozel === 'uyku') return { dakika: uykuPlani(durum.zaman.dakika, simCfg).sure };
  return { dakika: a.sure, para: a.para, enerji: a.enerji };
}


// Aksiyonu uygular, durumu değiştirir.
// Döner: { paragraflar: [{ tur, metin }], uyarilar: [...] }
export function aksiyonUygula(durum, a, simCfg, rng, veri = { sim: simCfg }) {
  const d = durum.durumlar;
  const ctx = { durum, veri };
  const yaz = (metin, tur = 'anlati') => metinCoz(metin, rng, ctx).map(p => ({ ...p, tur: p.tur === 'anlati' ? tur : p.tur }));
  const paragraflar = [{ tur: 'secim', metin: a.ad }];
  let uyarilar = [];

  if (a.ozel === 'uyku') {
    const bas = durum.zaman.dakika;
    const plan = uykuPlani(bas, simCfg);
    const stresli = d.stres >= simCfg.uyku.stresliUykuEsik;
    const enerjiOnce = d.enerji;
    paragraflar.push(...yaz(stresli ? a.metin.stresli : plan.gece ? a.metin.gece : a.metin.gunduz));
    uyarilar = zamanGecir(durum, plan.sure, 'uyku', simCfg);
    if (stresli) d.enerji = sinirla(enerjiOnce + (d.enerji - enerjiOnce) * simCfg.uyku.stresliUykuVerim);
    const duzenli = uykuDuzeniGuncelle(durum, bas, plan.sure, simCfg);
    paragraflar.push({ tur: 'sistem', metin: `${sureYaz(plan.sure)} uyudun${duzenli ? ' · düzenli' : ''}` });
    if (plan.gece) paragraflar.push(...yaz(a.metin.uyanis));
    // Uyanınca sadece hâlâ geçerli olan uyarıları göster (gece acıkmak gibi)
    uyarilar = uyarilar.filter(u => u.durum === 'aclik');
  } else {
    if (a.para) durum.para -= a.para;
    if (a.enerji) d.enerji = sinirla(d.enerji - a.enerji);
    uyarilar = zamanGecir(durum, a.sure || 0, a.tur || 'normal', simCfg);
    for (const [k, v] of Object.entries(a.etki || {})) if (k in d) d[k] = sinirla(d[k] + v);
    paragraflar.push(...yaz(a.metin));
    if (a.para) paragraflar.push({ tur: 'sistem', metin: '−' + paraYaz(a.para) });
    // Etki sonrası artık geçersiz olan uyarıları at (yemekten sonra "acıktın" denmesin)
    uyarilar = uyarilar.filter(u => {
      const v = d[u.durum];
      return u.yukari !== undefined ? v >= u.yukari : v <= u.asagi;
    });
  }

  for (const u of uyarilar) paragraflar.push(...yaz(u.metin, 'icses'));
  sureliTemizle(durum);
  aksiyonKaydet(durum, a.id);
  return { paragraflar: paragraflar.filter(p => p.metin), uyarilar };
}
