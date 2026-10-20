// Başlangıç hikayesi motoru (adım 3.3). Yeni oyunda karakterin kim olduğunu, buraya nasıl geldiğini,
// kime borçlu olduğunu, elinde ne kaldığını ve geride kimleri bıraktığını seed'den üretir.
// İskelet bir arketipten (data/hikaye/arketipler.json) gelir; her parça seed'le seçilir ve birleştirilir.
// Karakterin kendisi (görünüş, kişilik, memleket, ağız) NPC motoruyla üretilir (kimlik 'oyuncu').
// Geçmişten gelen kişiler k:<rol> kimliğiyle gerçek NPC olur; figür bağlantıları dünya kitabındaki figürün kendisidir.
// Sonuç kayda bir kez yazılır (durum.karakter + durum.hikaye): veri sonradan değişse de hikâyen değişmez.
import { Rng } from './rng.js';
import { npcUret, npcKaydet, sabitNpcSablonlari, SIMDIKI_YIL } from './npc.js';
import { olayYili } from './dunya.js';
import { sablonUygula } from './metin.js';
import { yuvarla } from './ekonomi.js';
import { para as paraYaz } from './format.js';
import { bayrakKoy } from './bayrak.js';

export const OYUNCU = 'oyuncu';
const DISARIDAKI_SAKINLER = ['beyaz_yaka', 'serbest_meslek', 'esnaf', 'kucuk_memur', 'fabrika_iscisi'];
const AILE_ROLLERI = new Set(['anne', 'baba', 'kardes', 'cocuk', 'akraba']);

const aralikO = (r, [a, b]) => a + r.sayi() * (b - a);
const agirlikli = (r, nesne) => r.agirlikliSec(Object.entries(nesne).filter(([, a]) => a > 0).map(([k, a]) => ({ k, agirlik: a })))?.k;
const iki = n => String(n).padStart(2, '0');
const donemBul = (isimler, y) => isimler.donemler.find(x => y >= x.bas && y <= x.bit) ?? (y < isimler.donemler[0].bas ? isimler.donemler[0] : isimler.donemler[isimler.donemler.length - 1]);

// Arketipin kancaları yaşın alt sınırını yükseltir: olay anında en az 'olaydaYas' yaşında olmalı
export function arketipYasAraligi(a, dunya) {
  let [en, ust] = a.yas;
  const cizelge = dunya?.sehir?.zamanCizelgesi || [];
  for (const k of a.kancalar || []) {
    const olay = cizelge.find(o => (o.kancalar || []).includes(k.kanca));
    if (olay) en = Math.max(en, SIMDIKI_YIL - olayYili(olay) + k.olaydaYas);
  }
  return [en, ust];
}

// Bugüne göre doğum tarihi: yaşı tam 'yas' olacak şekilde (doğum günü bu yıl geçmiş ya da bugün)
function dogumTarihi(r, yas, baslangic) {
  const [y, a, g] = baslangic.split('-').map(Number);
  const bugun = Date.UTC(y, a - 1, g);
  const yilBasi = Date.UTC(y, 0, 1);
  const gunSayisi = Math.round((bugun - yilBasi) / 864e5);
  const d = new Date(yilBasi + r.aralik(0, gunSayisi) * 864e5);
  return `${y - yas}-${iki(d.getUTCMonth() + 1)}-${iki(d.getUTCDate())}`;
}

const karakter0 = (r, a) => r.sec(a.eskiMeslek ?? ['—']);
const cocukMeslegi = yas => yas < 6 ? 'okul çağında değil' : yas < 14 ? 'ilkokul / ortaokul öğrencisi' : yas < 18 ? 'lise öğrencisi' : null;

function semtSec(r, dunya, sakinTuru, evSemt) {
  const semtler = dunya?.semtler?.semtler || [];
  if (!sakinTuru) return r.olasilik(0.35) ? evSemt : r.sec(semtler).id;
  const uygun = semtler.filter(s => s.sakinler.some(x => x.tur === sakinTuru));
  return uygun.length ? r.agirlikliSec(uygun.map(s => ({ id: s.id, agirlik: s.sakinler.find(x => x.tur === sakinTuru).agirlik }))).id : evSemt;
}

function kosulUyar(k, ben, a) {
  if (!k) return true;
  for (const [e, deger] of Object.entries(k)) {
    if (e === 'tip') { if (a.tip !== deger) return false; continue; }
    if (e === 'etiket') { if (!deger.some(x => a.etiketler.includes(x))) return false; continue; }
    const [en, ust] = deger;
    if (ben.eksenler[e] < en || ben.eksenler[e] > ust) return false;
  }
  return true;
}

function karisikSec(r, liste, n) {
  const h = [...liste], s = [];
  while (s.length < n && h.length) s.push(h.splice(r.aralik(0, h.length - 1), 1)[0]);
  return s;
}

// İç sesin tonu: her tonun puan kuralları; en yüksek puan (eşitlikte seed)
function icSesSec(r, b, ben, a, hata) {
  let enIyi = null;
  for (const [id, t] of Object.entries(b.icSes)) {
    let p = r.sayi() * 0.5;
    for (const [e, kural] of Object.entries(t.puan)) {
      if (e === 'tip') { if (a.tip === kural[0]) p += kural[1]; continue; }
      const [esik, puan] = kural;
      const x = e === 'hata' ? hata : ben.eksenler[e];
      if (esik >= 0 ? x >= esik : x <= -esik) p += puan;
    }
    if (!enIyi || p > enIyi.p) enIyi = { id, p };
  }
  const t = b.icSes[enIyi.id];
  return { ton: enIyi.id, ad: t.ad, ornekler: t.ornekler };
}

// secim: { tip: 'zirveden'|'dipten', cinsiyet: 'e'|'k', ad, arketip }; secenek: { baslangic: 'YYYY-AA-GG' }
export function karakterUret(seed, secim = {}, veri, { baslangic = '2026-10-20' } = {}) {
  const A = veri.hikaye.arketipler.arketipler, B = veri.hikaye.bilesenler;
  const eko = veri.ekonomi;
  const AU = eko.asgariUcret;
  const r = Rng.akis(seed, 'hikaye');
  const uyarilar = [];

  // Arketip: istenen tipten, ağırlığa göre (nadirler ender)
  const adaylar = A.filter(a => (!secim.tip || a.tip === secim.tip) && (!secim.cinsiyet || !a.cinsiyet || a.cinsiyet === secim.cinsiyet));
  const a = (secim.arketip && A.find(x => x.id === secim.arketip)) || r.agirlikliSec(adaylar);
  const [yMin, yMax] = arketipYasAraligi(a, veri.dunya);
  const yas = r.aralik(yMin, yMax);
  const cinsiyet = a.cinsiyet ?? secim.cinsiyet ?? (r.olasilik(0.5) ? 'e' : 'k');
  const dogum = dogumTarihi(r, yas, baslangic);
  const dogumYili = Number(dogum.slice(0, 4));
  const hata = aralikO(r, a.hata ?? [0.3, 0.7]);

  // Ev
  const evTip = a.ev?.tip ?? 'oda';
  const ev = { semt: r.sec(a.ev?.semtler ?? ['bezhane']), tip: evTip, ad: r.sec(B.ev[evTip] ?? B.ev.oda) };

  // Hangi bağlantılar var (olasılık); medeni hal bağlantılara uyar
  const secilenBag = (a.baglantilar || []).filter(b => r.olasilik(b.olasilik ?? 1));
  const esVar = secilenBag.some(b => b.esMi);
  let medeni = esVar ? 'bosanmis' : agirlikli(r, B.medeni.find(m => yas <= m.yasMax).agirlik);
  if (medeni === 'dul' && yas < 35) medeni = 'bekar';

  // Memleket: yurt dışı kökeni yok (hikâyeler Türkiye'den biri için yazıldı)
  const sakinTuru = r.sec(a.sakinTuru ?? ['_varsayilan']);
  const mw = { ...(veri.npc.memleket.sakinMemleket[sakinTuru] ?? veri.npc.memleket.sakinMemleket._varsayilan) };
  delete mw.yurtdisi;
  const yore = agirlikli(r, mw) ?? 'yerli';

  // Karakterin kendisi: NPC motoru
  const sablon = {
    semt: ev.semt, sakinTuru, cinsiyet, yas, yore, medeni, meslek: 'işsiz', meslekDurumu: 'issiz',
    kancalar: (a.kancalar || []).map(k => k.kanca),
  };
  if (secim.ad) sablon.ad = secim.ad;
  if (a.egitim) {
    // Kuşağına uymayan eğitim olmaz (1995 sonrası doğanlar en az ortaokul)
    const kusak = veri.npc.hayat.egitimKusak[donemBul(veri.npc.isimler, dogumYili).id] ?? {};
    const uygun = a.egitim.filter(e => kusak[e] > 0);
    sablon.egitim = r.sec(uygun.length ? uygun : a.egitim);
  }
  const ben = npcUret(seed, OYUNCU, sablon, veri);
  ben.kancalar = ben.kancalar.filter(k => sablon.kancalar.includes(k) || B.oyuncuKancalari.includes(k));
  const aile = structuredClone(ben.aile);
  aile.medeni = medeni;
  if (medeni !== 'bosanmis' && medeni !== 'dul') delete aile.es;
  aile.cocuk = 0; // hikâyede adı geçmeyen çocuk olmaz: çocuk bağlantısı varsa aşağıda eklenir
  if (a.aile?.bilinmiyor) { aile.anne = { bilinmiyor: true }; aile.baba = { bilinmiyor: true }; aile.kardes = 0; aile.iliski = 'yok'; }

  // Hikâye değişkenleri: havuzdan seçilenler
  const h = {};
  for (const [k, liste] of Object.entries(a.havuz || {})) {
    const x = r.sec(liste);
    h[k] = typeof x === 'string' ? x : x.ad;
    if (x.olen) aile[x.olen] = { ...aile[x.olen], yasiyor: false };
  }

  // Bağlantılar: geçmişten gelen kişiler (NPC şablonları)
  const sabitler = sabitNpcSablonlari(veri.dunya);
  const baglantilar = [];
  for (const b of secilenBag) {
    if (b.figur) {
      const s = sabitler[b.figur];
      if (!s) { uyarilar.push(`bilinmeyen figür ${b.figur}`); continue; }
      baglantilar.push({ id: b.figur, rol: b.rol, etiket: b.ad, figur: true, sablon: s, iliski: { ...b.iliski }, nerede: 'karaliman' });
      h[b.rol] = s.ad;
      continue;
    }
    const cins = b.cinsiyet === 'ayni' ? cinsiyet : b.cinsiyet === 'karsi' ? (cinsiyet === 'e' ? 'k' : 'e') : b.cinsiyet ?? (r.olasilik(0.5) ? 'e' : 'k');
    const bYas = b.cocukMu ? r.aralik(1, Math.max(1, yas - 21)) : Math.max(b.aile ? 6 : 17, Math.min(92, yas + r.aralik(...(b.yasFarki ?? [-5, 5]))));
    const s = { cinsiyet: cins, yas: bYas, semt: b.nerede === 'karaliman' ? semtSec(r, veri.dunya, b.sakinTuru, ev.semt) : undefined };
    if (b.sakinTuru) s.sakinTuru = b.sakinTuru;
    else if (b.nerede === 'disarida') s.sakinTuru = r.sec(DISARIDAKI_SAKINLER); // şehir dışında: semtten çıkarılamaz
    if (b.aile) { s.soyad = ben.soyad; s.yore = ben.yore; }
    if (b.kancalar) s.kancalar = b.kancalar;
    const cm = cocukMeslegi(bYas);
    if (cm) { s.meslek = cm; s.meslekDurumu = 'ogrenci'; s.medeni = 'bekar'; s.sakinTuru ??= 'ogrenci'; }
    if (b.esMi) s.medeni = r.olasilik(0.65) ? 'bosanmis' : 'evli';
    if (b.rol === 'anne' || b.rol === 'baba') s.medeni = aile[b.rol === 'anne' ? 'baba' : 'anne']?.yasiyor === false ? 'dul' : 'evli';
    const id = 'k:' + b.rol;
    const n = npcUret(seed, id, s, veri);
    baglantilar.push({ id, rol: b.rol, etiket: b.ad, sablon: s, iliski: { ...b.iliski }, nerede: b.nerede ?? 'karaliman', aile: !!b.aile });
    h[b.rol] = n.hitapAdi;
    // Ailenin NPC motorundaki hali bağlantılarla çelişmesin
    if (b.rol === 'anne' || b.rol === 'baba') aile[b.rol] = { yasiyor: true, yas: bYas };
    if (b.rol === 'kardes') aile.kardes = Math.max(1, aile.kardes || 0);
    if (b.cocukMu) aile.cocuk = Math.max(1, aile.cocuk || 0);
    if (b.esMi) aile.es = { ad: n.ad, yas: n.yas, cinsiyet: n.cinsiyet, eski: true };
  }

  // Zincir: yıllar eskiden yeniye, hiçbiri gelecekte değil
  const hikaye = [];
  let onceki = -Infinity;
  for (const z of a.zincir) {
    let yil = z.yil ?? (z.yas ? dogumYili + r.aralik(...z.yas) : SIMDIKI_YIL - r.aralik(...z.yilOnce));
    if (z.yasMin !== undefined && yil - dogumYili < z.yasMin) yil = dogumYili + z.yasMin;
    yil = Math.min(SIMDIKI_YIL, Math.max(yil, onceki));
    onceki = yil;
    const liste = Array.isArray(z.metin) ? z.metin : (r.olasilik(hata) ? z.metin.hata : z.metin.talih);
    const ctx = { baglam: { degisken: { h, y: String(yil), yasO: yil - dogumYili, yas } } };
    hikaye.push({ yil, metin: sablonUygula(r.sec(liste), ctx, r, uyarilar) });
  }

  // Borçlar ve alacaklar (₺, oyunun başındaki fiyatlarla)
  const aileBag = baglantilar.find(b => b.aile && !b.figur && b.rol !== 'cocuk');
  const esBag = baglantilar.find(b => b.rol === 'eski_es');
  const borclar = [];
  for (const b of a.borclar || []) {
    if (!r.olasilik(b.olasilik ?? 1)) continue;
    const x = { kime: b.kime, ad: b.ad, tutar: yuvarla(aralikO(r, b.miktar) * AU) };
    if (b.aylik) x.aylik = true;
    if (b.orgut) x.orgut = b.orgut;
    const npc = b.npc ?? (b.kime === 'aile' ? aileBag?.id : b.kime === 'nafaka' ? esBag?.id : undefined);
    if (npc) x.npc = npc;
    borclar.push(x);
  }
  const alacaklar = (a.alacaklar || []).map(b => ({ kimden: b.kimden, ad: b.ad, tutar: yuvarla(aralikO(r, b.miktar) * AU) }));
  const para = yuvarla(Math.max(B.paraEnAz, aralikO(r, a.para ?? [0.02, 0.1])) * AU);

  // Elde kalanlar, sırlar, anılar
  const kalanlar = karisikSec(r, a.kalanlar || [], 2).map(([id, ad, deger]) => ({ id, ad, deger: deger ? yuvarla(deger * AU) : 0 }));
  const sirlar = karisikSec(r, a.sirlar || [], r.olasilik(0.3) ? 2 : 1);
  const anilar = karisikSec(r, a.anilar || [], 2);

  // Güçlü yanlar, kusurlar, iç ses
  const gucluYanlar = karisikSec(r, B.gucluYanlar.filter(x => kosulUyar(x.kosul, ben, a)), 2).map(({ id, ad, metin }) => ({ id, ad, metin }));
  const kusurlar = karisikSec(r, B.kusurlar.filter(x => kosulUyar(x.kosul, ben, a)), 2).map(({ id, ad, metin }) => ({ id, ad, metin }));
  const icSes = icSesSec(r, B, ben, a, hata);

  // Açık uçlar (iplikler): sonradan olaylar bunlara bağlanır (3.4)
  const adi = id => baglantilar.find(b => b.id === id) ? h[baglantilar.find(b => b.id === id).rol] : sabitler[id]?.ad;
  const sab = (m, d) => sablonUygula(m, { baglam: { degisken: d } }, r, uyarilar);
  const iplikler = [];
  for (const [i, b] of borclar.entries()) {
    const tutar = paraYaz(b.tutar);
    const metin = b.aylik ? sab(B.iplikler.borcAylik, { tutar, ad: b.ad })
      : b.npc && adi(b.npc) ? sab(B.iplikler.borcNpc, { kisi: adi(b.npc), tutar })
        : sab(B.iplikler.borc, { kime: B.kimeAdlari[b.kime] ?? b.kime, tutar });
    iplikler.push({ id: 'borc:' + i, tur: 'borc', metin, ...(b.npc ? { npc: b.npc } : {}) });
  }
  for (const [i, x] of alacaklar.entries()) iplikler.push({ id: 'alacak:' + i, tur: 'alacak', metin: sab(B.iplikler.alacak, { kimden: adi(x.kimden) ?? x.kimden, tutar: paraYaz(x.tutar) }), npc: x.kimden });
  for (const b of baglantilar) {
    const rol = b.figur ? h[b.rol] : { ad: b.etiket.split(';')[0], ozel: false }; // etiket büyük harfle başlasa da özel ad değil
    const tur = b.nerede === 'disarida' ? 'kisiDisarida' : (b.iliski.gerginlik ?? 0) >= 15 ? 'kisiGergin' : (b.iliski.yakinlik ?? 0) >= 40 ? 'kisiYakin' : null;
    if (tur) iplikler.push({ id: 'kisi:' + b.rol, tur: 'kisi', metin: sab(B.iplikler[tur], { rol }), npc: b.id });
  }
  if (sirlar.length) iplikler.push({ id: 'sir', tur: 'sir', metin: B.iplikler.sir });

  // Seçilen metinlerde adı geçen aile üyeleri ailede de olsun
  const secilenMetin = [...hikaye.map(z => z.metin), ...sirlar, ...anilar, ...kalanlar.map(x => x.ad), ...borclar.map(x => x.ad)].join(' ');
  if (/kardeş/i.test(secilenMetin) && !aile.anne?.bilinmiyor) aile.kardes = Math.max(1, aile.kardes || 0);

  // Olaylar için: hikâyenin kişilerine roller (npc: "hk:yakin") ve şablon değişkenleri ({hk.yakin})
  const ilkParca = e => (e ?? '').split(';')[0];
  const sehirde = baglantilar.filter(b => b.nerede === 'karaliman' && !b.figur);
  const yakin = [...sehirde].sort((x, y) => (y.iliski.yakinlik ?? 0) - (x.iliski.yakinlik ?? 0)).find(b => (b.iliski.yakinlik ?? 0) >= 20 && (b.iliski.gerginlik ?? 0) < 15);
  const gergin = [...baglantilar.filter(b => b.nerede === 'karaliman')].sort((x, y) => (y.iliski.gerginlik ?? 0) - (x.iliski.gerginlik ?? 0)).find(b => (b.iliski.gerginlik ?? 0) >= 15 && b !== yakin);
  const disarida = baglantilar.find(b => b.nerede === 'disarida' && (b.iliski.gerginlik ?? 0) < 15); // seni merak eden biri (dolandıran ortak değil)
  const alacakli = [...borclar].sort((x, y) => y.tutar - x.tutar).find(b => b.npc && !b.aylik && b.kime !== 'aile');
  const npcRolleri = {};
  const degisken = { ...h, eskiMeslek: karakter0(r, a), borcToplam: paraYaz(borclar.reduce((t, b) => t + (b.aylik ? 0 : b.tutar), 0)), borcVar: borclar.length > 0,
    gunIdare: Math.max(1, Math.floor(para / (AU * B.gunlukMasraf))), kalan: kalanlar[0]?.ad, kalanDeger: kalanlar[0]?.deger ? paraYaz(kalanlar[0].deger) : null,
    ani: anilar[0], sir: sirlar[0], icSes: icSes.ornekler[1] ?? icSes.ornekler[0], icSesTon: icSes.ad };
  for (const [ad, b] of Object.entries({ yakin, gergin, disarida })) {
    if (!b) continue;
    npcRolleri[ad] = b.id;
    degisken[ad] = b.figur ? b.sablon.ad : h[b.rol];
    degisken[ad + 'Rol'] = ilkParca(b.etiket);
  }
  if (alacakli) {
    npcRolleri.alacakli = alacakli.npc;
    degisken.alacakli = adi(alacakli.npc);
    degisken.alacakliTutar = paraYaz(alacakli.tutar);
    degisken.alacakliBorc = alacakli.ad;
  }

  const karakter = {
    ad: ben.ad, soyad: ben.soyad, tamAd: ben.tamAd, cinsiyet, dogum, memleket: ben.memleket, yore: ben.yore, agiz: ben.agiz, koken: ben.koken,
    egitim: ben.egitim, eskiMeslek: degisken.eskiMeslek, sakinTuru, eksenler: ben.eksenler, ozellikler: ben.ozellikler,
    alisanliklar: ben.alisanliklar, tuhaflik: ben.tuhaflik, tik: ben.tik, kancalar: ben.kancalar, fizik: ben.fizik, aile, uslup: ben.uslup,
  };
  return {
    karakter, para, ev,
    hikaye: {
      arketip: a.id, arketipAdi: a.ad, tip: a.tip, nadir: !!a.nadir, hata: Math.round(hata * 100) / 100,
      zincir: hikaye, borclar, alacaklar, kalanlar, sirlar, anilar, gucluYanlar, kusurlar, icSes, iplikler,
      baglantilar: baglantilar.map(({ id, rol, etiket, nerede, figur }) => ({ id, rol, etiket: etiket ?? null, nerede, figur: !!figur })),
      bayraklar: a.bayraklar || [], etiketler: a.etiketler, npc: npcRolleri, degisken,
    },
    _baglantilar: baglantilar,
    _uyarilar: uyarilar,
  };
}

// Üretilen karakteri yeni oyunun durumuna işler: bağlantıları NPC kaydına, bayrakları kalıcı bayraklara
export function hikayeyiUygula(durum, k) {
  durum.hikaye = k.hikaye;
  for (const b of k._baglantilar) {
    const kayit = npcKaydet(durum, b.id, b.sablon, { katman: 'onemli', gun: 0 });
    kayit.tanisildi = 0;
    kayit.gecmis = b.rol;
    kayit.bilinen = { is: true, memleket: true };
    if (b.nerede === 'disarida') kayit.disarida = true;
    Object.assign(kayit.iliski, b.iliski);
    kayit.anilar.push({ zaman: 0, metin: 'geçmişten tanıdık' });
  }
  for (const f of k.hikaye.bayraklar) bayrakKoy(durum, f);
  if (k.hikaye.bayraklar.includes('sabika')) (durum.suc ??= {}).sabika = [{ tur: 'gecmis', z: 0, not: 'başlangıç hikâyesi' }];
  return durum;
}

// ------------------------------------------------------------------ denetim

export function hikayeVeriDogrula(veri) {
  const hatalar = [];
  const A = veri.hikaye.arketipler.arketipler, B = veri.hikaye.bilesenler;
  const dunya = veri.dunya;
  const semtler = new Set((dunya?.semtler?.semtler || []).map(s => s.id));
  const sakinler = new Set(Object.keys(dunya?.semtler?.sakinTurleri || {}));
  const kancalar = new Set((dunya?.sehir?.zamanCizelgesi || []).flatMap(o => o.kancalar || []));
  const sabitler = sabitNpcSablonlari(dunya);
  const egitimler = new Set(Object.keys(veri.npc.hayat.egitimKusak.d1995).concat(['okumamis', 'ilkokul', 'ortaokul', 'lise', 'meslek_lisesi', 'universite', 'yuksek_lisans']));
  const idler = new Set();
  for (const a of A) {
    const y = `arketip ${a.id}`;
    if (!/^[a-z][a-z0-9_]*$/.test(a.id) || idler.has(a.id)) hatalar.push(`${y}: kimlik`);
    idler.add(a.id);
    if (!['zirveden', 'dipten'].includes(a.tip)) hatalar.push(`${y}: tip`);
    if (!(a.agirlik > 0)) hatalar.push(`${y}: ağırlık`);
    for (const k of a.kancalar || []) if (!kancalar.has(k.kanca)) hatalar.push(`${y}: kanca ${k.kanca} zaman çizelgesinde yok`);
    const [en, ust] = arketipYasAraligi(a, dunya);
    if (!(en >= 18 && en <= ust && ust <= 70)) hatalar.push(`${y}: yaş aralığı (kancalarla) ${en}–${ust}`);
    for (const s of a.sakinTuru || []) if (!sakinler.has(s)) hatalar.push(`${y}: sakin türü ${s}`);
    for (const e of a.egitim || []) if (!egitimler.has(e)) hatalar.push(`${y}: eğitim ${e}`);
    for (const s of a.ev?.semtler || []) if (!semtler.has(s)) hatalar.push(`${y}: ev semti ${s}`);
    if (!veri.ekonomi.konut[a.ev?.tip]) hatalar.push(`${y}: konut tipi ${a.ev?.tip}`);
    if (!B.ev[a.ev?.tip]) hatalar.push(`${y}: ev adı yok (${a.ev?.tip})`);
    for (const b of a.borclar || []) {
      if (!B.kimeAdlari[b.kime]) hatalar.push(`${y}: borç alacaklısı ${b.kime}`);
      if (b.npc && !sabitler[b.npc]) hatalar.push(`${y}: borç NPC ${b.npc}`);
      if (b.orgut && !dunya.orgutler.orgutler.some(o => o.id === b.orgut)) hatalar.push(`${y}: örgüt ${b.orgut}`);
    }
    for (const b of a.alacaklar || []) if (!sabitler[b.kimden]) hatalar.push(`${y}: alacak NPC ${b.kimden}`);
    const roller = new Set();
    for (const b of a.baglantilar || []) {
      if (roller.has(b.rol)) hatalar.push(`${y}: aynı rol iki kez ${b.rol}`);
      roller.add(b.rol);
      if (b.figur && !sabitler[b.figur]) hatalar.push(`${y}: figür ${b.figur}`);
      if (!b.ad) hatalar.push(`${y}: bağlantı ${b.rol} adsız`);
      if (b.sakinTuru && !sakinler.has(b.sakinTuru)) hatalar.push(`${y}: bağlantı sakin türü ${b.sakinTuru}`);
      if (b.aile && !AILE_ROLLERI.has(b.rol)) hatalar.push(`${y}: aile bağlantısının rolü ${b.rol}`);
      for (const k of b.kancalar || []) if (!kancalar.has(k)) hatalar.push(`${y}: bağlantı kancası ${k}`);
    }
    const degiskenler = new Set([...Object.keys(a.havuz || {}), ...roller]);
    for (const [i, z] of a.zincir.entries()) {
      const kaynak = ['yil', 'yas', 'yilOnce'].filter(k => z[k] !== undefined);
      if (kaynak.length !== 1) hatalar.push(`${y}: zincir[${i}] yıl kaynağı tek olmalı`);
      const metinler = Array.isArray(z.metin) ? z.metin : [...(z.metin.hata || []), ...(z.metin.talih || [])];
      if (!metinler.length) hatalar.push(`${y}: zincir[${i}] metin yok`);
      for (const m of metinler) for (const [, ic] of m.matchAll(/\{([^{}]+)\}/g)) {
        const ad = ic.split('|')[0].trim();
        if (ad.startsWith('h.') ? !degiskenler.has(ad.slice(2)) : !['y', 'yasO', 'yas'].includes(ad)) hatalar.push(`${y}: zincir[${i}] bilinmeyen değişken ${ad}`);
      }
    }
    for (const k of ['kalanlar', 'sirlar', 'anilar', 'eskiMeslek']) if (!(a[k]?.length)) hatalar.push(`${y}: ${k} boş`);
  }
  const gy = new Set();
  for (const x of [...B.gucluYanlar, ...B.kusurlar]) {
    if (!/^[a-z][a-z0-9_]*$/.test(x.id) || gy.has(x.id)) hatalar.push(`bileşen kimliği ${x.id}`);
    gy.add(x.id);
  }
  for (const k of B.oyuncuKancalari) if (!kancalar.has(k)) hatalar.push(`oyuncu kancası ${k}`);
  return hatalar;
}
