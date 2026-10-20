// NPC üretim motoru (adım 3.1). Bir NPC'nin bütün arka planı (ad, yaş, memleket, ağız, eğitim, meslek,
// aile, kişilik, alışkanlık, tuhaflık, dert, hayal, sır, gizli özellikler, şehrin tarihindeki izleri)
// oyun seed'i + NPC kimliğinden belirlenimli üretilir (K4, K11): kayda yazılmaz, her seferinde aynı çıkar.
// Kayda yalnızca değişenler yazılır (durum.npcler[id]: ilişki, anılar, katman...).
// sablon: sabit bilgiler (figür ve mekan sahiplerinde ad, yaş, cinsiyet, sakin türü...); verilmeyenler üretilir.
// Veri: data/npc/{isimler,memleket,kisilik,hayat}.json → veri.npc
import { Rng } from './rng.js';
import { olayYili } from './dunya.js';
import { ek } from './tr.js';

export const SIMDIKI_YIL = 2026;
export const KATMANLAR = ['arka_plan', 'tanidik', 'onemli', 'ana'];
const EKSENLER = ['disadonuk', 'uyumlu', 'sorumlu', 'dengeli', 'acik'];

// { a: 2, b: 1 } → ağırlıklı seçim
const agirlikli = (rng, nesne) => rng.agirlikliSec(Object.entries(nesne).filter(([, a]) => a > 0).map(([k, a]) => ({ k, agirlik: a })))?.k;
// 1–5 arası, ortaya yakın (iki zarın ortalaması gibi)
const eksenCek = rng => Math.max(1, Math.min(5, Math.round((rng.aralik(1, 5) + rng.aralik(1, 5)) / 2 + (rng.sayi() - 0.5))));

function kosulTutar(k, b) {
  if (k.yasMin !== undefined && b.yas < k.yasMin) return false;
  if (k.yasMax !== undefined && b.yas > k.yasMax) return false;
  if (k.gelirMin !== undefined && b.gelir < k.gelirMin) return false;
  if (k.gelirMax !== undefined && b.gelir > k.gelirMax) return false;
  if (k.cinsiyet && k.cinsiyet !== b.cinsiyet) return false;
  if (k.sakinTurleri && !k.sakinTurleri.includes(b.sakinTuru)) return false;
  if (k.semtler && !k.semtler.includes(b.semt)) return false;
  if (k.medeni && !k.medeni.includes(b.medeni)) return false;
  if (k.durum && !k.durum.includes(b.durum)) return false;
  if (k.gocmus !== undefined && k.gocmus !== b.gocmus) return false;
  if (k.kanca && !b.kancalar?.includes(k.kanca)) return false;
  if (k.acikMin !== undefined && b.eksenler?.acik < k.acikMin) return false;
  if (k.uyumluMin !== undefined && b.eksenler?.uyumlu < k.uyumluMin) return false;
  return true;
}
const uygunlar = (liste, b) => liste.filter(x => kosulTutar(x, b));

function donemBul(isimler, dogumYili) {
  const d = isimler.donemler;
  return d.find(x => dogumYili >= x.bas && dogumYili <= x.bit) ?? (dogumYili < d[0].bas ? d[0] : d[d.length - 1]);
}

// "Remzi Usta" → { ad: 'Remzi', lakap: 'Usta' }; "Hacı Mahir Sarıkaya" → { ad: 'Mahir', soyad: 'Sarıkaya', unvan: 'Hacı' }
function adCoz(tam, isimler) {
  const parca = tam.replace(/^(Av\.|Dr\.)\s*/, '').split(/\s+/);
  const lakaplar = new Set([...isimler.lakaplar.erkek, ...isimler.lakaplar.kadin, 'Bey', 'Ağa']);
  const unvanlar = new Set(['Hacı', 'Müdür', 'Muhtar', 'Kaptan', 'Pideci', 'Aşçı', 'Çaycı', 'Kahveci', 'Natır', 'Dokumacı', 'Garip', 'Dernek', 'Başkanı']);
  const sonuc = { tam };
  while (parca.length > 1 && unvanlar.has(parca[0])) sonuc.unvan = [sonuc.unvan, parca.shift()].filter(Boolean).join(' ');
  if (parca.length > 1 && lakaplar.has(parca[parca.length - 1])) sonuc.lakap = parca.pop();
  sonuc.ad = parca.shift();
  if (parca.length) sonuc.soyad = parca.join(' ');
  return sonuc;
}

export function npcUret(seed, id, sablon, veri) {
  const v = veri.npc, h = v.hayat;
  const rng = Rng.akis(seed, 'npc|' + id);
  const semtKaydi = veri.dunya?.semtler?.semtler?.find(s => s.id === sablon.semt);
  const b = { id, semt: sablon.semt, gelir: semtKaydi?.sosyo?.gelir ?? 3 };

  // Sakin türü, cinsiyet, yaş
  b.sakinTuru = sablon.sakinTuru ?? (semtKaydi ? rng.agirlikliSec(semtKaydi.sakinler).tur : '_varsayilan');
  b.cinsiyet = sablon.cinsiyet ?? (rng.olasilik(0.5) ? 'e' : 'k');
  const [yMin, yMax] = h.yasAraligi[b.sakinTuru] ?? h.yasAraligi._varsayilan;
  b.dogumYili = sablon.dogumYili ?? (sablon.yas !== undefined ? SIMDIKI_YIL - sablon.yas : SIMDIKI_YIL - Math.round(yMin + (rng.sayi() + rng.sayi()) / 2 * (yMax - yMin)));
  b.yas = SIMDIKI_YIL - b.dogumYili;

  // Memleket, köken, ağız
  const mw = v.memleket.sakinMemleket[b.sakinTuru] ?? v.memleket.sakinMemleket._varsayilan;
  b.yore = sablon.yore ?? agirlikli(rng, mw);
  b.gocmus = b.yore !== 'yerli';
  if (b.yore === 'yurtdisi') {
    b.ulke = agirlikli(rng, v.memleket.yurtdisiKokenler);
    b.memleket = v.memleket.yurtdisiUlkeAdi[b.ulke];
  } else b.memleket = rng.sec(v.memleket.yoreler[b.yore].iller);
  if (b.sakinTuru === 'mubadil_ailesi') b.koken = 'mubadil';
  else if (!b.gocmus && rng.olasilik(v.memleket.kokenOlasiligi)) b.koken = agirlikli(rng, v.memleket.kokenAgirlik);
  b.agiz = v.memleket.yoreler[b.yore].agiz;
  if (b.koken && b.koken !== 'mubadil') b.kokenAgiz = v.memleket.yoreler[b.koken]?.agiz;

  // Ad
  if (sablon.ad) Object.assign(b, adCoz(sablon.ad, v.isimler));
  if (sablon.soyad) b.soyad ??= sablon.soyad; // aileden gelen soyadı (başlangıç hikayesinin bağlantıları)
  if (!b.ad || !b.soyad) {
    if (b.yore === 'yurtdisi') {
      const y = v.isimler.yabanci[b.ulke];
      b.ad ??= rng.sec(y[b.cinsiyet === 'e' ? 'erkek' : 'kadin']);
      b.soyad ??= rng.sec(y.soyadlari);
    } else {
      const d = donemBul(v.isimler, b.dogumYili + (rng.olasilik(0.12) ? (rng.olasilik(0.5) ? 10 : -10) : 0));
      b.ad ??= rng.sec(d[b.cinsiyet === 'e' ? 'erkek' : 'kadin']);
      const yoreSoy = v.isimler.yoreSoyadlari[b.koken ?? b.yore];
      b.soyad ??= yoreSoy && rng.olasilik(0.4) ? rng.sec(yoreSoy) : rng.sec(v.isimler.soyadlari);
    }
  }
  b.tamAd = `${b.ad} ${b.soyad}`;
  b.hitapAdi = sablon.ad ?? b.ad;

  // Eğitim
  const donem = donemBul(v.isimler, b.dogumYili).id;
  const zorunlu = h.egitimZorunlu[b.sakinTuru];
  let ew = { ...h.egitimKusak[donem] };
  if (zorunlu) ew = Object.fromEntries(zorunlu.map(e => [e, (h.egitimKusak[donem][e] ?? 0.5) + 0.5]));
  else if (b.gelir >= 4) { ew.universite = (ew.universite ?? 0) * 2.5; ew.okumamis = 0; }
  else if (b.gelir <= 1) { ew.universite = (ew.universite ?? 0) * 0.3; }
  b.egitim = sablon.egitim ?? agirlikli(rng, ew);

  // Meslek
  const meslekler = uygunlar(h.meslekler[b.sakinTuru] ?? [{ ad: 'işçi', durum: 'calisiyor' }], b);
  const m = sablon.meslek ? { ad: sablon.meslek, durum: sablon.meslekDurumu ?? 'calisiyor' } : rng.sec(meslekler.length ? meslekler : h.meslekler[b.sakinTuru]);
  b.meslek = { ad: m.ad, durum: m.durum, isTuru: m.isTuru };
  if (b.meslek.durum === 'emekli' && b.yas < 50) b.meslek = { ad: 'işsiz', durum: 'issiz' };
  b.durum = b.meslek.durum;

  // Kişilik
  b.eksenler = Object.fromEntries(EKSENLER.map(e => [e, sablon.eksenler?.[e] ?? eksenCek(rng)]));
  const adaylar = v.kisilik.ozellikler.filter(o => Object.entries(o.kosul || {}).every(([e, [en, ust]]) => b.eksenler[e] >= en && b.eksenler[e] <= ust));
  b.ozellikler = [];
  const hedefSayi = rng.aralik(2, 3);
  const havuz = [...adaylar];
  while (b.ozellikler.length < hedefSayi && havuz.length) {
    const o = havuz.splice(rng.aralik(0, havuz.length - 1), 1)[0];
    if (b.ozellikler.some(x => x.zit?.includes(o.id) || o.zit?.includes(x.id))) continue;
    b.ozellikler.push(o);
  }
  b.ozellikler = b.ozellikler.map(o => o.id);
  b.uslup = b.yas < 30 && b.eksenler.disadonuk >= 3 ? 'argo'
    : ['esnaf', 'sanayi_esnafi'].includes(b.sakinTuru) ? 'esnaf'
      : ['universite', 'yuksek_lisans'].includes(b.egitim) && b.eksenler.acik >= 4 ? 'kitabi'
        : b.eksenler.uyumlu >= 4 ? 'kibar' : b.eksenler.uyumlu <= 2 ? 'sert' : 'sade';

  // Aile
  const a = h.aile;
  const mdl = a.medeni.find(x => b.yas <= x.yasMax);
  b.medeni = sablon.medeni ?? agirlikli(rng, mdl.agirlik);
  const aile = { medeni: b.medeni };
  if (['evli', 'dul', 'bosanmis'].includes(b.medeni) || b.medeni === 'sevgilili') {
    const esCins = b.cinsiyet === 'e' ? 'k' : 'e';
    const esYas = Math.max(18, b.yas + (b.cinsiyet === 'e' ? -rng.aralik(0, 6) : rng.aralik(0, 6)));
    const ed = donemBul(v.isimler, SIMDIKI_YIL - esYas);
    aile.es = { ad: b.yore === 'yurtdisi' ? rng.sec(v.isimler.yabanci[b.ulke][esCins === 'e' ? 'erkek' : 'kadin']) : rng.sec(ed[esCins === 'e' ? 'erkek' : 'kadin']), yas: esYas, cinsiyet: esCins };
  }
  const enFazlaCocuk = Math.max(0, Math.floor((b.yas - a.cocukYasFarkiMin) / 2));
  aile.cocuk = ['bekar', 'sevgilili'].includes(b.medeni) && rng.olasilik(0.9) ? 0 : Math.min(enFazlaCocuk, Number(agirlikli(rng, a.cocukAgirlik)));
  if (b.yas < 20) aile.cocuk = 0;
  const anneYas = b.yas + rng.aralik(18, 34), babaYas = anneYas + rng.aralik(0, 7);
  const yasiyor = y => y < 70 ? rng.olasilik(0.95) : y < 85 ? rng.olasilik(0.6) : y < 95 ? rng.olasilik(0.2) : false;
  aile.anne = { yasiyor: yasiyor(anneYas), yas: anneYas };
  aile.baba = { yasiyor: yasiyor(babaYas), yas: babaYas };
  aile.kardes = Number(agirlikli(rng, a.kardesAgirlik));
  aile.iliski = agirlikli(rng, a.iliskiler);
  b.aile = aile;

  // Şehrin tarihindeki izleri (kancalar): olay anında o yaşta olmalı
  b.kancalar = [];
  const cizelge = veri.dunya?.sehir?.zamanCizelgesi || [];
  for (const k of h.kancalar) {
    if (!kosulTutar({ ...k, kanca: undefined }, b)) continue; // kuralın 'kanca' alanı burada koşul değil, sonuçtur
    if (k.dogumMax !== undefined && b.dogumYili > k.dogumMax) continue;
    const olay = cizelge.find(o => (o.kancalar || []).includes(k.kanca));
    if (olay && olayYili(olay) - b.dogumYili < k.olaydaYas) continue;
    if (rng.olasilik(k.olasilik)) b.kancalar.push(k.kanca);
  }
  for (const kk of sablon.kancalar || []) if (!b.kancalar.includes(kk)) b.kancalar.push(kk);

  // Alışkanlık, tuhaflık, dert, hayal, sır
  const al = v.kisilik.alisanliklar.filter(x => kosulTutar(x, b));
  b.alisanliklar = [];
  for (let i = 0, n = rng.aralik(1, 2); i < n && al.length; i++) b.alisanliklar.push(al.splice(rng.agirlikliSec(al.map((x, j) => ({ j, agirlik: x.agirlik }))).j, 1)[0].id);
  b.tuhaflik = rng.sec(v.kisilik.tuhafliklar);
  b.tik = rng.sec(v.kisilik.konusmaTikleri);
  const sec = liste => { const u = uygunlar(liste, b); return u.length ? rng.agirlikliSec(u.map(x => ({ ...x, agirlik: x.agirlik ?? (x.kanca ? 6 : 1) }))).id : null; };
  b.dert = sablon.dert ?? sec(h.dertler);
  b.hayal = sablon.hayal ?? sec(h.hayaller);
  b.sir = sablon.sir ?? sec(h.sirlar);

  // Gizli özellikler
  b.gizli = [];
  for (const [g, t] of Object.entries(v.kisilik.gizliler)) {
    let p = t.taban * (t.carpan?.[b.sakinTuru] ?? 1);
    for (const o of b.ozellikler) p *= t.ozellikCarpan?.[o] ?? 1;
    if (rng.olasilik(Math.min(0.9, p))) b.gizli.push(g);
  }
  for (const g of sablon.gizli || []) if (!b.gizli.includes(g)) b.gizli.push(g);

  if (v.gorunus) b.fizik = fizikUret(seed, id, b, v.gorunus, sablon);
  if (sablon.tanim) b.tanim = sablon.tanim;
  if (sablon.figur) b.figur = sablon.figur;
  if (sablon.mekan) b.mekan = sablon.mekan;
  if (sablon.mekanMudavimi) b.mekanMudavimi = sablon.mekanMudavimi;
  return b;
}

// ------------------------------------------------------------------ dış görünüş (3.2b)
// Ayrı bir akıştan üretilir: görünüş eklemek, NPC'nin geri kalanını değiştirmez.
const esikAdi = (liste, x) => liste.find(([e]) => x <= e)?.[1] ?? liste[liste.length - 1][1];
const yasOrani = (liste, yas) => liste.find(([e]) => yas <= e)?.[1] ?? liste[liste.length - 1][1];

const yasaUygun = (x, yas) => (x.yasMin === undefined || yas >= x.yasMin) && (x.yasMax === undefined || yas <= x.yasMax);
function fizikUret(seed, id, b, g, sablon) {
  const r = Rng.akis(seed, 'npc|' + id + '|gorunus');
  const c = b.cinsiyet;
  const yapiW = Object.fromEntries(Object.entries(g.yapi[c]).map(([k, a]) => [k, (g.yapiYas[k] && b.yas < g.yapiYas[k]) ? a * 0.2 : a]));
  const f = { boy: agirlikli(r, g.boy[c]), yapi: agirlikli(r, yapiW) };
  const kir = r.olasilik(yasOrani(g.sacKir, b.yas));
  const stiller = g.sacStil[c].filter(st => { const y = g.sacStilYas[st]; return y === undefined || (y > 0 ? b.yas >= y : b.yas <= -y); });
  const bc = g.basortusu;
  const ulkeCarpan = b.yore !== 'yurtdisi' ? 1 : ['suriye', 'afganistan'].includes(b.ulke) ? 2 : 0.1;
  f.basortusu = c === 'k' && r.olasilik(Math.min(0.95, bc.taban * yasOrani(bc.yasCarpan, b.yas) * (bc.sakinCarpan[b.sakinTuru] ?? 1) * ulkeCarpan));
  f.sac = { renk: kir ? (b.yas > 65 ? 'bembeyaz' : 'kır') : agirlikli(r, g.sacRenk), stil: r.sec(stiller.length ? stiller : g.sacStil[c]) };
  f.goz = agirlikli(r, g.goz);
  f.ten = agirlikli(r, g.ten);
  f.yuz = r.sec(g.yuz.filter(x => yasaUygun(x, b.yas))).metin;
  if (c === 'e') f.sakal = b.yas < 18 ? null : kir && r.olasilik(0.5) ? 'kır bıyıklı' : agirlikli(r, g.sakal);
  f.gozluk = r.olasilik(yasOrani(g.gozlukYas, b.yas));
  f.isaret = r.olasilik(g.isaretOlasiligi) ? r.sec(g.isaretler.filter(x => yasaUygun(x, b.yas))).metin : null;
  f.ses = r.sec(g.ses);
  f.giyim = r.sec(g.giyim[b.sakinTuru] ?? g.giyim._varsayilan);
  f.bakim = b.ozellikler.includes('titiz') ? 'özenli' : b.ozellikler.includes('gosterisci') ? 'gösterişli' : b.ozellikler.includes('daginik') ? 'dağınık'
    : b.durum === 'issiz' && r.olasilik(0.4) ? 'yorgun düşmüş' : r.sec(['özenli', 'temiz pak', 'temiz pak', 'salaş']);
  f.durus = r.sec(g.duruslar);
  // Çekicilik: ortalamaya yakın (üç zarın ortalaması); yaşla biraz düşer, bakım etkiler
  let ck = (r.aralik(1, 10) + r.aralik(1, 10) + r.aralik(1, 10)) / 3;
  ck -= Math.max(0, b.yas - 45) / 18;
  ck += { 'özenli': 0.6, 'gösterişli': 0.4, 'dağınık': -0.8, 'yorgun düşmüş': -0.6 }[f.bakim] ?? 0;
  f.cekicilik = sablon.cekicilik ?? Math.max(1, Math.min(10, Math.round(ck)));
  let kz = (b.eksenler.disadonuk + b.eksenler.dengeli) * 0.7 + r.aralik(0, 3) - 0.5;
  if (b.ozellikler.includes('gururlu') || b.ozellikler.includes('gosterisci')) kz += 1;
  if (f.cekicilik >= 8) kz += 0.7;
  f.karizma = sablon.karizma ?? Math.max(1, Math.min(10, Math.round(kz)));
  // İlk izlenim: dışa vuran yan (her zaman doğru değil)
  const oz = b.ozellikler;
  f.izlenim = oz.includes('kavgaci') || (b.eksenler.uyumlu <= 2 && ['iri yarı', 'geniş omuzlu'].includes(f.yapi)) ? 'tehlike'
    : oz.includes('kurnaz') && r.olasilik(0.6) ? 'kurnaz'
      : oz.includes('gosterisci') ? 'gosteris'
        : oz.includes('sakaci') ? 'neseli'
          : b.eksenler.uyumlu >= 4 && b.eksenler.disadonuk >= 4 ? 'sicak'
            : b.eksenler.dengeli <= 2 && b.dert ? 'huzunlu'
              : f.karizma <= 3 ? 'silik'
                : b.eksenler.disadonuk <= 2 ? 'mesafe' : 'guven';
  f.izlenimMetni = r.sec(g.izlenim[f.izlenim]);
  return f;
}

export const cekicilikAdi = (n, g) => esikAdi(n.cinsiyet === 'e' ? g.cekicilikAdlariErkek : g.cekicilikAdlari, n.fizik.cekicilik);
export const karizmaAdi = (n, g) => esikAdi(g.karizmaAdlari, n.fizik.karizma);

// Uzun tarif (tanışınca ve kişi panelinde)
export function fizikTarifi(n, g) {
  const f = n.fizik;
  if (!f) return '';
  const kim = n.cinsiyet === 'e' ? 'bir adam' : 'bir kadın';
  const sac = f.basortusu ? 'başörtülü' : f.sac.stil === 'kel' ? 'kel' : `${f.sac.renk} saçları ${f.sac.stil}`;
  const p1 = `${bas(f.boy)}, ${f.yapi} ${kim}; ${sac}, ${f.goz} gözlü, ${f.ten}${f.sakal ? ', ' + f.sakal : ''}${f.gozluk ? ', gözlüklü' : ''}.`;
  const p2 = [`${bas(f.yuz)}${f.isaret ? ', ' + f.isaret : ''}.`, `${bas(f.giyim)}, ${g.bakimAdlari?.[f.bakim] ?? f.bakim}.`, `${bas(f.ses)}.`].join(' ');
  const p3 = `${bas(cekicilikAdi(n, g))}, ${karizmaAdi(n, g)} biri. ${f.izlenimMetni}`;
  return `${p1} ${p2} ${p3}`;
}
const bas = s => s ? s[0].toLocaleUpperCase('tr') + s.slice(1) : s;

// O günkü hali (gün gün değişir): "dalgın, bardağı soğumuş"
export function gununHali(seed, n, gun, g) {
  const r = Rng.akis(seed, `hal|${n.id}|${gun}`);
  const w = { keyifli: 2 + (n.ozellikler.includes('sakaci') ? 3 : 0), dalgin: 1.5 + (n.dert ? 1 : 0), gergin: 1 + (n.eksenler.dengeli <= 2 ? 2 : 0), yorgun: 1.5 + (n.durum === 'calisiyor' ? 1 : 0), bekleyen: 0.8, sohbetli: n.eksenler.disadonuk >= 4 ? 2.5 : 0.5 };
  const tur = agirlikli(r, w);
  return { tur, metin: r.sec(g.haller[tur]) };
}

// Kısa tanım: "64 yaşında, Karalimanlı (ailesi Trabzonlu), emekli kaynakçı; ağzı sıkı, inatçı."
export function npcTanimi(n, veri) {
  const v = veri.npc;
  const nereli = n.yore === 'yurtdisi' ? `${ek(n.memleket, 'den')} gelmiş` : n.gocmus ? ek(n.memleket, 'li') : 'Karalimanlı';
  const koken = n.koken === 'mubadil' ? ' (mübadil ailesinden)' : n.koken ? ` (ailesi ${v.memleket.yoreler[n.koken].ad} kökenli)` : '';
  const oz = n.ozellikler.map(o => v.kisilik.ozellikler.find(x => x.id === o)?.ad).filter(Boolean).join(', ');
  return `${n.yas} yaşında, ${nereli}${koken}, ${n.meslek.ad}${oz ? '; ' + oz : ''}.`;
}

export const dertMetni = (n, veri) => veri.npc.hayat.dertler.find(d => d.id === n.dert)?.metin ?? null;
export const hayalMetni = (n, veri) => veri.npc.hayat.hayaller.find(d => d.id === n.hayal)?.metin ?? null;
export const sirMetni = (n, veri) => veri.npc.hayat.sirlar.find(d => d.id === n.sir)?.metin ?? null;

// ------------------------------------------------------------------ kayıt (yalnızca değişenler)

export function npcKaydiAl(durum, id) { return durum.npcler?.[id] ?? null; }

// NPC ile ilk temas: kayda girer (sablon + katman), ilişki değerleri sıfırdan başlar
export function npcKaydet(durum, id, sablon, { katman = 'arka_plan', gun = 0 } = {}) {
  durum.npcler ??= {};
  const k = durum.npcler[id] ??= { iliski: {}, anilar: [] };
  k.sablon ??= sablon;
  k.katman ??= katman;
  k.ilk ??= gun;
  k.iliski ??= {};
  k.anilar ??= [];
  return k;
}

// Önem katmanı yalnızca yükselir (bir kasiyer ilgilendikçe önemli bir karaktere dönüşebilir)
export function katmanYukselt(durum, id, katman) {
  const k = durum.npcler?.[id];
  if (!k) return;
  if (KATMANLAR.indexOf(katman) > KATMANLAR.indexOf(k.katman ?? 'arka_plan')) k.katman = katman;
}

// Kayıttaki NPC'nin tam hali: seed'den üretilmiş arka plan + kaydedilmiş değişenler
export function npcAl(durum, veri, id) {
  const k = npcKaydiAl(durum, id);
  if (!k?.sablon) return null;
  return { ...npcUret(durum.seed, id, k.sablon, veri), katman: k.katman, iliski: k.iliski, anilar: k.anilar };
}

// ------------------------------------------------------------------ dünyadaki sabit NPC'ler

// Figürler ve mekanların tohum sahipleri: kimlikleri ve şablonları dünya kitabından gelir
export function sabitNpcSablonlari(dunya) {
  const s = {};
  for (const f of dunya?.figurler?.figurler || []) {
    s['f:' + f.id] = { ad: f.ad, cinsiyet: f.cinsiyet, dogumYili: f.dogumYili, semt: f.semt, figur: f.id, katman: 'onemli', meslek: f.unvan, meslekDurumu: 'calisiyor', yore: 'yerli', sakinTuru: figurSakinTuru(f, dunya) };
  }
  for (const m of dunya?.mekanlar?.mekanlar || []) {
    const t = m.sahip?.tohum;
    if (t) s['m:' + m.id] = { ad: t.ad, cinsiyet: t.cinsiyet, yas: t.yas, sakinTuru: t.sakinTuru, semt: m.semt, tanim: t.tanim, mekan: m.id, katman: 'tanidik', meslek: `${ek(m.ad, 'in', { iyelik: m.iyelik })} sahibi`, meslekDurumu: 'kendi' };
  }
  return s;
}

function figurSakinTuru(f, dunya) {
  const semt = dunya?.semtler?.semtler?.find(x => x.id === f.semt);
  if (f.orgut) return 'yeni_zengin';
  const zenginler = ['yamacevler', 'marina'];
  if (zenginler.includes(f.semt)) return 'zengin_aile';
  return semt ? [...semt.sakinler].sort((a, b) => b.agirlik - a.agirlik)[0].tur : '_varsayilan';
}

// ------------------------------------------------------------------ denetim

export function npcVeriDogrula(veri) {
  const h = [];
  const v = veri.npc;
  const sakinTurleri = Object.keys(veri.dunya?.semtler?.sakinTurleri || {});
  for (const t of sakinTurleri) {
    if (!v.hayat.meslekler[t]) h.push(`sakin türü ${t}: meslek listesi yok`);
    if (!v.hayat.yasAraligi[t]) h.push(`sakin türü ${t}: yaş aralığı yok`);
  }
  for (const [t, [a, b]] of Object.entries(v.hayat.yasAraligi)) if (!(a >= 14 && b > a && b <= 95)) h.push(`yasAraligi ${t} geçersiz`);
  for (const [t, w] of Object.entries(v.memleket.sakinMemleket)) for (const y of Object.keys(w)) if (!v.memleket.yoreler[y]) h.push(`sakinMemleket ${t}: bilinmeyen yöre ${y}`);
  for (const [y, yr] of Object.entries(v.memleket.yoreler)) if (!v.memleket.agizlar[yr.agiz]) h.push(`yöre ${y}: bilinmeyen ağız ${yr.agiz}`);
  for (const k of Object.keys(v.memleket.yurtdisiKokenler)) if (!v.isimler.yabanci[k]) h.push(`yurt dışı köken ${k}: isim havuzu yok`);
  const kancalar = new Set((veri.dunya?.sehir?.zamanCizelgesi || []).flatMap(o => o.kancalar || []));
  for (const k of v.hayat.kancalar) if (!kancalar.has(k.kanca)) h.push(`kanca ${k.kanca}: zaman çizelgesinde yok`);
  for (const liste of ['dertler', 'hayaller', 'sirlar']) {
    const ids = new Set();
    for (const x of v.hayat[liste]) {
      if (!/^[a-z][a-z0-9_]*$/.test(x.id) || ids.has(x.id)) h.push(`${liste}: kimlik "${x.id}"`);
      ids.add(x.id);
      if (!x.metin) h.push(`${liste} ${x.id}: metin yok`);
    }
  }
  const oz = new Set(v.kisilik.ozellikler.map(o => o.id));
  for (const o of v.kisilik.ozellikler) for (const z of o.zit || []) if (!oz.has(z)) h.push(`özellik ${o.id}: bilinmeyen zıt ${z}`);
  for (const d of v.isimler.donemler) if (d.erkek.length < 20 || d.kadin.length < 20) h.push(`isim dönemi ${d.id}: en az 20'şer ad olmalı`);
  return h;
}
