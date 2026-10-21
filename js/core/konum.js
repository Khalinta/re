// Konum ve gezinme (adım 2.8): oyuncu nerede (ev / sokak / mekan), oradan ne yapılabilir,
// semtler arası yolculuk, mekana girip çıkma, mekandaki aksiyonlar ve kulak verme.
// Konum = { semt, mekan }: mekan 'ev' (evde), bir mekan kimliği ya da null (sokakta).
import { zamanGecir, sinirla } from './simulasyon.js';
import { tarihAl, gunDakikasi, gunNo, isoTarih, dilim } from './zaman.js';
import { semtBul } from './dunya.js';
import { mekanBul, acikMi, kalabalik } from './mekan.js';
import { mekanKapanisi } from './ilerleme.js';
import { yolSecenekleri } from './ulasim.js';
import { gununHavasi, anlikHava, havaMetni } from './hava.js';
import { urunFiyati, fiyatBirimi } from './ekonomi.js';
import { metinCoz } from './metin.js';
import { cesitSec, cesitHavuzu, havuzAnahtari } from './cesit.js';
import { ek } from './tr.js';
import { para as paraYaz, sure as sureYaz } from './format.js';
import { aksiyonKaydet } from './durum.js';
import { Rng } from './rng.js';
import { mekandakiler, tanisildiMi, gorunus, kisi } from './insanlar.js';
import { tanis, yaninaOtur, sohbetKonulari, oturumGecerli, kisiDedikodusu, dedikoduKaydet } from './sohbet.js';

export const EVDE = 'ev';

export function evSec(seed, gezi) {
  const r = Rng.akis(seed, 'baslangic|ev');
  return { semt: r.sec(gezi.evAdaylari), tip: gezi.ev.tip, ad: gezi.ev.ad };
}

const haftaGunu = durum => tarihAl(durum.zaman.baslangic, durum.zaman.dakika).getUTCDay();
const adEk = (x, e) => ek(x.ad, e, { iyelik: x.iyelik });

export function havaSimdi(durum, veri, dk = durum.zaman.dakika) {
  if (!veri.hava) return null;
  const iso = isoTarih(tarihAl(durum.zaman.baslangic, dk));
  return anlikHava(gununHavasi(durum.seed, veri.dunya.sehir.cografya.iklim, veri.hava, iso), gunDakikasi(dk));
}

// Mekan şu an girilebilir mi? Döner: null (girilebilir) ya da sebep metni
export function mekanKapaliMi(durum, mekan) {
  const gecici = mekanKapanisi(durum, mekan.id);
  if (gecici) return `Bugün kapalı (${gecici}).`;
  if (!acikMi(mekan, durum.zaman.dakika, haftaGunu(durum))) {
    return mekan.saatler.her_zaman ? 'Kapalı.' : `Kapalı. Saatleri: ${mekan.saatler.acilis}–${saatYaz(mekan.saatler.kapanis)}${(mekan.kapaliGunler || []).length ? ' (bazı günler kapalı)' : ''}.`;
  }
  return null;
}
const saatYaz = s => { const [h, m] = s.split(':').map(Number); return `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };

export const mekanKalabaligi = (durum, mekan) => kalabalik(mekan, durum.zaman.dakika, haftaGunu(durum)) ?? 0;

export function konumMetni(durum, veri) {
  const k = durum.konum;
  const semt = semtBul(veri.dunya, k.semt);
  if (k.mekan === EVDE) return `Evde · ${semt.ad}`;
  if (k.mekan) return `${mekanBul(veri.dunya, k.mekan).ad} · ${semt.ad}`;
  return `${semt.ad} · sokakta`;
}

// Mekanın bir hizmeti hangi ürünle ücretlenir (kafede çay değil kahve, büfede yemek değil döner...)
export function mekanUrunu(gezi, eko, mekan, hizmet) {
  const s = gezi.urunSecimi[hizmet];
  if (s) return s[mekan.tur] ?? s.varsayilan;
  return eko.hizmetUrun[hizmet] ?? null;
}

export function mekanAksiyonFiyati(veri, durum, mekan, hizmet) {
  const tanim = veri.gezi.mekanAksiyonlari[hizmet];
  if (!tanim || tanim.ucretsiz) return 0;
  const urun = mekanUrunu(veri.gezi, veri.ekonomi, mekan, hizmet);
  return urun ? urunFiyati(veri.ekonomi, durum, urun, mekan.fiyat) : 0;
}

// Bulunulan yere göre aksiyonlar: [{ id, ad, alt?, maliyet, tamam, sebep? }]
export function baglamAksiyonlari(durum, veri) {
  const k = durum.konum, g = veri.gezi, s = g.sureler;
  const liste = [];
  const ekle = (id, ad, maliyet, sebep, alt) => liste.push({ id, ad, alt, maliyet, tamam: !sebep, sebep });
  if (k.mekan === EVDE) {
    ekle('gezi:cik', 'Dışarı çık', { dakika: s.evdenCik });
  } else if (k.mekan && durum.sohbet && veri.npc?.sohbet && oturumGecerli(durum, veri)) {
    // Biriyle sohbet ederken yalnızca konular (ve kalkmak)
    for (const x of sohbetKonulari(durum, veri)) ekle('sohbet:' + x.konu, x.ad, { dakika: x.dakika });
  } else if (k.mekan) {
    const m = mekanBul(veri.dunya, k.mekan);
    const kapali = mekanKapaliMi(durum, m);
    for (const hz of m.hizmetler) {
      const t = g.mekanAksiyonlari[hz];
      if (!t) continue;
      const f = mekanAksiyonFiyati(veri, durum, m, hz);
      const sebep = kapali ? 'Kapanıyor; çıkman gerek.' : f > durum.para ? `Cebinde ${paraYaz(f)} yok.` : null;
      ekle('mekan:' + hz, t.adlar?.[m.tur] ?? t.ad, { dakika: t.sure, para: f || undefined }, sebep);
    }
    // Burada şu an kimler var (3.2): tanıdıklarla sohbet, tanımadıklarla tanışma (en çok 3 kişi)
    if (veri.npc?.sohbet && !kapali) {
      const kal = mekanKalabaligi(durum, m);
      const burada = mekandakiler(durum, veri, m, kal).slice(0, 3);
      const kisa = burada.map(id => gorunus(kisi(veri, durum.seed, id), veri));
      for (const [i, id] of burada.entries()) {
        const n = kisi(veri, durum.seed, id);
        if (!n) continue;
        const etiket = kisa.filter(x => x === kisa[i]).length > 1 ? gorunus(n, veri, true) : kisa[i];
        if (tanisildiMi(durum, id)) ekle('npc:otur:' + id, `${ek(n.hitapAdi, 'in')} yanına otur`, { dakika: veri.npc.sohbet.sure.otur });
        else ekle('npc:tanis:' + id, 'Tanış: ' + etiket, { dakika: veri.npc.sohbet.sure.tanis }, durum.bilgi?.retler?.[id] === gunNo(durum.zaman.dakika) ? 'Bugün bir kere denedin; üstüne gitme.' : null);
      }
    }
    const kv = g.kulakVer;
    ekle('mekan:kulak', kv.ad, { dakika: kv.sure }, kapali ? 'Kapanıyor; çıkman gerek.' : mekanKalabaligi(durum, m) === 0 ? 'Etrafta konuşacak kimse yok.'
      : !konusulacaklar(durum, veri, m).length ? 'Burada bugün yeni bir şey konuşulmuyor.' : null);
    ekle('gezi:cik', 'Dışarı çık', { dakika: s.mekandanCik });
  } else {
    if (durum.ev && k.semt === durum.ev.semt) ekle('gezi:eve', 'Eve dön', { dakika: s.eveGir });
    else if (durum.ev) {
      const yol = enHizliYol(durum, veri, durum.ev.semt);
      ekle('gezi:evegit', 'Eve git', yol ? { dakika: yol.toplamDakika + s.eveGir, para: yol.ucret || undefined } : {}, yol ? null : 'Eve gidecek yol bulamadın.', yol ? yolOzeti(veri, yol) : null);
    }
  }
  return liste;
}

// --------------------------------------------------------------------- yolculuk

export function yolculukSecenekleri(durum, veri, hedef) {
  const hava = havaSimdi(durum, veri);
  return yolSecenekleri(veri.dunya.ulasim, durum.konum.semt, hedef, {
    t: durum.zaman.dakika, haftaSonu: [0, 6].includes(haftaGunu(durum)), firtina: !!hava?.firtina,
    asgariUcret: fiyatBirimi(veri.ekonomi, durum),
  });
}

export function enHizliYol(durum, veri, hedef) {
  const s = yolculukSecenekleri(durum, veri, hedef);
  const adaylar = [s.toplu, s.yuruyus].filter(Boolean);
  return adaylar.sort((a, b) => a.toplamDakika - b.toplamDakika)[0] ?? null;
}

// "Dolmuş Tabakhane → İstasyon · M2 İstasyon → Marina"
export function yolOzeti(veri, yol) {
  const ad = id => semtBul(veri.dunya, id).ad;
  return yol.adimlar.map(a => a.tur === 'hat' ? `${a.hatKisa} ${ad(a.nereden)} → ${ad(a.nereye)}` : a.tur === 'taksi' ? 'Taksi' : `Yürüyüş ${ad(a.nereden)} → ${ad(a.nereye)}`).join(' · ') || 'Buradasın';
}

// Düz havuzlarda son kullanılanlar bir süre gelmez (3.18)
function yaz(metin, rng, ctx, tur = 'anlati') {
  const m = ctx?.durum && cesitHavuzu(metin) ? cesitSec(ctx.durum, havuzAnahtari(metin), metin, rng) : metin;
  return metinCoz(m, rng, ctx).map(p => ({ ...p, tur: p.tur === 'anlati' ? tur : p.tur }));
}

// Semtten semte gider. kip: toplu | yuruyus | taksi. Döner: { tamam, sebep?, paragraflar }
export function yolculukYap(durum, veri, rng, hedef, kip) {
  const g = veri.gezi;
  const semt = semtBul(veri.dunya, hedef);
  if (!semt) throw new Error('Bilinmeyen semt: ' + hedef);
  if (hedef === durum.konum.semt) return { tamam: false, sebep: 'Zaten buradasın.' };
  const yol = yolculukSecenekleri(durum, veri, hedef)[kip];
  if (!yol) return { tamam: false, sebep: kip === 'toplu' ? 'Şu saatte toplu taşımayla gidilmiyor.' : 'Yol bulunamadı.' };
  if (yol.ucret > durum.para) return { tamam: false, sebep: `Cebinde ${paraYaz(yol.ucret)} yok.` };

  const ctx = { durum, veri, baglam: { degisken: { semt } } };
  const paragraflar = [{ tur: 'secim', metin: `${adEk(semt, 'e')} git` }];
  if (durum.konum.mekan) paragraflar.push(...yaz(durum.konum.mekan === EVDE ? g.metinler.evdenCik : g.metinler.mekandanCik, rng, ctx));
  paragraflar.push(...yaz(g.metinler.yolculuk[kip], rng, ctx));
  const havaBas = havaSimdi(durum, veri);
  const yuruyusDk = yol.adimlar.filter(a => a.tur === 'yuruyus').reduce((t, a) => t + a.dakika, 0);
  zamanGecir(durum, yol.toplamDakika, 'normal', veri.sim);
  const d = durum.durumlar;
  if (yuruyusDk) d.enerji = sinirla(d.enerji - yuruyusDk / g.yuruyusEnerjiDk);
  if (yuruyusDk >= 10 && havaBas?.yagiyor) {
    for (const [k2, v] of Object.entries(g.yagmurdaYuruyus)) d[k2] = sinirla(d[k2] + v);
    paragraflar.push(...yaz(g.metinler.yagmurdaIslandin, rng, ctx, 'icses'));
  }
  durum.para -= yol.ucret;
  durum.konum = { semt: hedef, mekan: null };
  paragraflar.push({ tur: 'sistem', metin: [yolOzeti(veri, yol), sureYaz(yol.toplamDakika), yol.ucret ? '−' + paraYaz(yol.ucret) : null].filter(Boolean).join(' · ') });
  paragraflar.push(...varisMetni(durum, veri, rng, semt));
  aksiyonKaydet(durum, 'git:' + hedef, { kip });
  return { tamam: true, paragraflar };
}

function varisMetni(durum, veri, rng, semt) {
  const dl = gunDakikasi(durum.zaman.dakika);
  const p = [{ tur: 'anlati', metin: semt.atmosfer[dilim(dl).id] }];
  const hava = havaSimdi(durum, veri);
  if (hava && (hava.yagiyor || hava.firtina || hava.durum === 'sisli')) p.push(...yaz(havaMetni(veri.hava, hava, dl), rng, { durum, veri }));
  return p;
}

// --------------------------------------------------------------------- yerel hareketler

export function mekanaGir(durum, veri, rng, mekanId) {
  const g = veri.gezi;
  const m = mekanBul(veri.dunya, mekanId);
  if (!m) throw new Error('Bilinmeyen mekan: ' + mekanId);
  if (m.semt !== durum.konum.semt) return { tamam: false, sebep: `${m.ad} başka bir semtte.` };
  if (durum.konum.mekan === m.id) return { tamam: false, sebep: 'Zaten buradasın.' };
  const kapali = mekanKapaliMi(durum, m);
  if (kapali) return { tamam: false, sebep: kapali };
  const ctx = { durum, veri, baglam: { degisken: { mekan: m } } };
  const paragraflar = [{ tur: 'secim', metin: `${adEk(m, 'e')} gir` }];
  if (durum.konum.mekan) paragraflar.push(...yaz(durum.konum.mekan === EVDE ? g.metinler.evdenCik : g.metinler.mekandanCik, rng, ctx));
  zamanGecir(durum, g.sureler.mekanaGir + (durum.konum.mekan ? g.sureler.mekandanCik : 0), 'normal', veri.sim);
  durum.konum = { semt: m.semt, mekan: m.id };
  // İlk ziyarette mekanın tasviri, sonra yalnızca kalabalığı
  durum.bilgi.gidilen ??= {};
  if (!durum.bilgi.gidilen[m.id]) paragraflar.push({ tur: 'anlati', metin: m.tasvir });
  durum.bilgi.gidilen[m.id] = gunNo(durum.zaman.dakika);
  paragraflar.push(...yaz(g.kalabalikMetinleri[mekanKalabaligi(durum, m)], rng, ctx));
  aksiyonKaydet(durum, 'gir:' + m.id);
  return { tamam: true, paragraflar };
}

export function disariCik(durum, veri, rng) {
  const g = veri.gezi;
  if (!durum.konum.mekan) return { tamam: false, sebep: 'Zaten dışarıdasın.' };
  const evden = durum.konum.mekan === EVDE;
  const paragraflar = [{ tur: 'secim', metin: 'Dışarı çık' }, ...yaz(evden ? g.metinler.evdenCik : g.metinler.mekandanCik, rng, { durum, veri })];
  zamanGecir(durum, evden ? g.sureler.evdenCik : g.sureler.mekandanCik, 'normal', veri.sim);
  durum.konum = { semt: durum.konum.semt, mekan: null };
  const hava = havaSimdi(durum, veri);
  if (hava && (hava.yagiyor || hava.firtina)) paragraflar.push(...yaz(havaMetni(veri.hava, hava, gunDakikasi(durum.zaman.dakika)), rng, { durum, veri }));
  aksiyonKaydet(durum, 'cik');
  return { tamam: true, paragraflar };
}

export function eveGir(durum, veri, rng) {
  const g = veri.gezi;
  if (durum.konum.semt !== durum.ev.semt) return { tamam: false, sebep: 'Evin başka semtte.' };
  if (durum.konum.mekan === EVDE) return { tamam: false, sebep: 'Zaten evdesin.' };
  const paragraflar = [{ tur: 'secim', metin: 'Eve dön' }];
  if (durum.konum.mekan) paragraflar.push(...yaz(g.metinler.mekandanCik, rng, { durum, veri }));
  zamanGecir(durum, g.sureler.eveGir + (durum.konum.mekan ? g.sureler.mekandanCik : 0), 'normal', veri.sim);
  durum.konum = { semt: durum.ev.semt, mekan: EVDE };
  paragraflar.push(...yaz(g.metinler.eveGir, rng, { durum, veri }));
  aksiyonKaydet(durum, 'eve');
  return { tamam: true, paragraflar };
}

// --------------------------------------------------------------------- mekanda

export function mekanAksiyonuYap(durum, veri, rng, hizmet) {
  const m = mekanBul(veri.dunya, durum.konum.mekan);
  if (!m || durum.konum.mekan === EVDE) return { tamam: false, sebep: 'Bir mekanda değilsin.' };
  const secenek = baglamAksiyonlari(durum, veri).find(a => a.id === 'mekan:' + hizmet);
  if (!secenek) return { tamam: false, sebep: 'Burada olmaz.' };
  if (!secenek.tamam) return { tamam: false, sebep: secenek.sebep };
  const ctx = { durum, veri, baglam: { degisken: { mekan: m } } };
  if (hizmet === 'kulak') return kulakVer(durum, veri, rng, m, ctx);

  const t = veri.gezi.mekanAksiyonlari[hizmet];
  const f = mekanAksiyonFiyati(veri, durum, m, hizmet);
  const paragraflar = [{ tur: 'secim', metin: secenek.ad }];
  zamanGecir(durum, t.sure, t.tur || 'normal', veri.sim);
  const d = durum.durumlar;
  for (const [k, v] of Object.entries(t.etki || {})) if (k in d) d[k] = sinirla(d[k] + v);
  durum.para -= f;
  paragraflar.push(...yaz(t.metin, rng, ctx));
  if (f) paragraflar.push({ tur: 'sistem', metin: '−' + paraYaz(f) });
  aksiyonKaydet(durum, 'mekan:' + hizmet, { mekan: m.id });
  return { tamam: true, paragraflar };
}

// Mekanda henüz duyulmamış ne konuşuluyor: mekanın dedikoduları + şehrin son günlerdeki gündemi
// (Faz 1 telefon testi: dedikodular bitince "kulak ver" saatlerce boşa gidiyordu; artık seçenek kapanır.)
const haberAnahtari = g => `${g.gun}|${g.id ?? g.tur}`;
export function konusulacaklar(durum, veri, m) {
  const duyulan = durum.bilgi?.dedikodular || {}, haberler = durum.bilgi?.haberler || {};
  const bugun = gunNo(durum.zaman.dakika);
  const kisiHakkinda = veri.npc?.dedikodu && mekanKalabaligi(durum, m) >= 1 && (durum.bilgi?.kulakKisi?.[m.id + '|' + bugun] ?? 0) < veri.gezi.kulakVer.kisiGunluk
    ? [{ tur: 'kisi' }] : [];
  return [
    ...kisiHakkinda,
    ...(m.dedikodular || []).filter(d => !duyulan[d.id]).map(d => ({ tur: 'dedikodu', d })),
    ...(durum.dunya?.gundem || []).filter(g => bugun - g.gun <= veri.gezi.kulakVer.haberGun && !(haberAnahtari(g) in haberler)).map(g => ({ tur: 'haber', g })),
  ];
}

// Mekandaki biriyle tanış ya da sohbet et: hamle kimliği 'tanis:<npc>' / 'konus:<npc>'
export function insanHamlesi(durum, veri, rng, hamle) {
  const m = mekanBul(veri.dunya, durum.konum.mekan);
  if (!m || durum.konum.mekan === EVDE) return { tamam: false, sebep: 'Bir mekanda değilsin.' };
  const kapali = mekanKapaliMi(durum, m);
  if (kapali) return { tamam: false, sebep: 'Kapanıyor; çıkman gerek.' };
  const i = hamle.indexOf(':');
  const tur = hamle.slice(0, i), id = hamle.slice(i + 1);
  const kal = mekanKalabaligi(durum, m);
  return tur === 'tanis' ? tanis(durum, veri, rng, m, kal, id) : yaninaOtur(durum, veri, rng, m, kal, id);
}

// Duyulmamış bir şeyi duyma şansı kalabalığa göre; önce mekanın kendi dedikoduları
function kulakVer(durum, veri, rng, m, ctx) {
  const kv = veri.gezi.kulakVer, mt = veri.gezi.metinler;
  const paragraflar = [{ tur: 'secim', metin: kv.ad }];
  const olasilik = kv.olasilik[mekanKalabaligi(durum, m)] ?? 0;
  zamanGecir(durum, kv.sure, 'dinlenme', veri.sim);
  durum.bilgi.dedikodular ??= {};
  durum.bilgi.haberler ??= {};
  const havuz = konusulacaklar(durum, veri, m);
  const dedikodu = havuz.filter(x => x.tur === 'dedikodu');
  // Kulak misafiri olunan konuşmaların çoğu insanlar hakkında (3.5): mekandaki birinin ağzından
  const kisiVar = havuz.some(x => x.tur === 'kisi');
  const duydu = havuz.length > 0 && rng.olasilik(olasilik);
  const digerVar = havuz.some(x => x.tur !== 'kisi');
  let kd = null, konusanKisi = null;
  if (duydu && kisiVar && (!digerVar || rng.olasilik(kv.kisiOnceligi))) {
    const konusan = mekandakiler(durum, veri, m, mekanKalabaligi(durum, m)).map(id => kisi(veri, durum.seed, id)).filter(Boolean);
    konusanKisi = konusan.length ? rng.sec(konusan) : null;
    if (konusanKisi) kd = kisiDedikodusu(durum, veri, konusanKisi, m, rng);
  }
  if (kd) {
    dedikoduKaydet(durum, kd, m, null);
    const anahtar = m.id + '|' + gunNo(durum.zaman.dakika);
    durum.bilgi.kulakKisi = { [anahtar]: (durum.bilgi.kulakKisi?.[anahtar] ?? 0) + 1 };
    paragraflar.push(...yaz(mt.kulakVerGiris, rng, ctx));
    const kim = gorunus(konusanKisi, veri);
    paragraflar.push({ tur: 'konusma', konusan: kim[0].toLocaleUpperCase('tr') + kim.slice(1), metin: kd.metin });
    paragraflar.push({ tur: 'sistem', metin: 'Duyduklarına eklendi' });
  } else if (duydu && digerVar) {
    const x = dedikodu.length && (dedikodu.length === havuz.filter(y => y.tur !== 'kisi').length || rng.olasilik(kv.dedikoduOnceligi)) ? rng.sec(dedikodu) : rng.sec(havuz.filter(y => y.tur === 'haber'));
    if (x.tur === 'dedikodu') {
      durum.bilgi.dedikodular[x.d.id] = { gun: gunNo(durum.zaman.dakika), mekan: m.id };
      paragraflar.push(...yaz(mt.kulakVerGiris, rng, ctx));
      paragraflar.push({ tur: 'konusma', konusan: rng.sec(mt.konusanlar), metin: x.d.metin });
      paragraflar.push({ tur: 'sistem', metin: 'Duyduklarına eklendi' });
    } else {
      durum.bilgi.haberler[haberAnahtari(x.g)] = gunNo(durum.zaman.dakika);
      paragraflar.push(...yaz(mt.haberGiris, rng, ctx));
      paragraflar.push({ tur: 'konusma', konusan: rng.sec(mt.konusanlar), metin: x.g.metin });
    }
    if (!konusulacaklar(durum, veri, m).length) paragraflar.push(...yaz(mt.kulakVerBitti, rng, ctx, 'icses'));
  } else paragraflar.push(...yaz(mt.kulakVerBos, rng, ctx));
  aksiyonKaydet(durum, 'kulak', { mekan: m.id });
  return { tamam: true, paragraflar };
}

// Duyulan dedikodular, en yeniden eskiye: [{ id, metin, mekan, gun }]
export function duyulanlar(durum, veri) {
  const hepsi = new Map((veri.dunya.mekanlar?.mekanlar || []).flatMap(m => (m.dedikodular || []).map(d => [d.id, d])));
  return Object.entries(durum.bilgi?.dedikodular || {})
    .map(([id, b]) => ({ id, metin: b.metin ?? hepsi.get(id)?.metin, mekan: b.mekan, gun: b.gun, kaynak: b.kaynak, kaynakAd: b.kaynak ? kisi(veri, durum.seed, b.kaynak)?.hitapAdi : null, kisi: b.kisi }))
    .filter(x => x.metin)
    .sort((a, b) => b.gun - a.gun);
}
