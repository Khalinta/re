// Tanıdıkların kendi hayatı (adım 3.6): sen görmezken de iş bulurlar, ayrılırlar, evlenirler, hastalanırlar, taşınırlar.
// Her oyun günü, tanıştığın her kişi için olasılıkla bir olay (data/npc/hayat_olaylari.json). Değişen hal kayda yazılır
// (npcler[id].degisim) ve seed'den üretilen kişinin üstüne giydirilir (kisiGuncel). Sen bunu ya o kişinin ağzından
// (yanına oturunca) ya da ortak tanıdıklardan dedikodu olarak öğrenirsin; öğrenene kadar Tanıdıklarım'da görünmez.
import { Rng } from './rng.js';
import { kisi } from './insanlar.js';
import { rngAl } from './durum.js';
import { tarihAl } from './zaman.js';

const metinDegerleri = (x, n) => ({ meslek: x.meslek ?? n.meslek.ad });

// Seed'den üretilen kişi + hayatında olan değişiklikler
export function kisiGuncel(durum, veri, id) {
  const k = durum.npcler?.[id];
  const n = kisi(veri, durum.seed, id, k?.sablon);
  if (!n || !k?.degisim) return n;
  const d = k.degisim;
  const g = { ...n };
  if (d.meslek) { g.meslek = { ...n.meslek, ...d.meslek }; g.durum = d.meslek.durum; }
  if (d.medeni) { g.medeni = d.medeni; g.aile = { ...n.aile, medeni: d.medeni }; }
  if (d.cocuk) g.aile = { ...(g.aile ?? n.aile), cocuk: (n.aile.cocuk ?? 0) + d.cocuk };
  if ('dert' in d) g.dert = d.dert;
  if ('hayal' in d) g.hayal = d.hayal;
  if ('sir' in d) g.sir = d.sir;
  // Aile (3.11): anne/baba vefatı, kardeşle küsmek/barışmak — kişi kartının aile ağacı da buna göre çizilir
  for (const rol of ['anne', 'baba']) if (d[rol + 'Vefat']) g.aile = { ...(g.aile ?? n.aile), [rol]: { ...n.aile[rol], yasiyor: false, vefatYili: d[rol + 'Vefat'] } };
  if (d.aileIliski) g.aile = { ...(g.aile ?? n.aile), iliski: d.aileIliski };
  if (d.yok) g.yok = d.yok;
  return g;
}

function kosulTutar(n, k, kosul = {}) {
  if (kosul.durum && !kosul.durum.includes(n.durum)) return false;
  if (kosul.medeni && !kosul.medeni.includes(n.medeni)) return false;
  if (kosul.yasMin !== undefined && n.yas < kosul.yasMin) return false;
  if (kosul.yasMax !== undefined && n.yas > kosul.yasMax) return false;
  if (kosul.cocukMax !== undefined && (n.aile?.cocuk ?? 0) > kosul.cocukMax) return false;
  if (kosul.dertVar && !n.dert) return false;
  if (kosul.dertYok && n.dert) return false;
  if (kosul.iliskiYok && k.iliskiTuru) return false;
  // 3.11: aile, cinsiyet, gelir, hayal
  if (kosul.cocukMin !== undefined && (n.aile?.cocuk ?? 0) < kosul.cocukMin) return false;
  if (kosul.kardesMin !== undefined && (n.aile?.kardes ?? 0) < kosul.kardesMin) return false;
  if (kosul.anneSag && n.aile?.anne?.yasiyor === false) return false;
  if (kosul.babaSag && n.aile?.baba?.yasiyor === false) return false;
  if (kosul.aileIliski && !kosul.aileIliski.includes(n.aile?.iliski)) return false;
  if (kosul.cinsiyet && kosul.cinsiyet !== n.cinsiyet) return false;
  if (kosul.gelirMax !== undefined && (n.gelir ?? 3) > kosul.gelirMax) return false;
  if (kosul.hayalVar && !n.hayal) return false;
  if (kosul.yore && !kosul.yore.includes(n.yore)) return false;
  return true;
}

// Olayı kişiye uygular; döner: kayda geçen olay
export function hayatOlayiUygula(durum, veri, id, olayId, gun, rng) {
  const H = veri.npc.hayatOlaylari;
  const o = H.olaylar.find(x => x.id === olayId);
  const k = durum.npcler[id], n = kisiGuncel(durum, veri, id);
  const d = (k.degisim ??= {});
  const kayit = { gun, id: o.id, bilinen: false };
  const dg = o.degisim || {};
  if (dg.meslekDurumu) {
    if (['calisiyor', 'kendi'].includes(dg.meslekDurumu)) {
      const uygun = m => m.durum === dg.meslekDurumu && (m.yasMin === undefined || n.yas >= m.yasMin) && (m.yasMax === undefined || n.yas <= m.yasMax);
      let liste = (veri.npc.hayat.meslekler[n.sakinTuru] || []).filter(uygun);
      if (!liste.length) liste = Object.values(veri.npc.hayat.meslekler).flat().filter(uygun);
      const m = liste.length ? rng.sec(liste) : { ad: dg.meslekDurumu === 'kendi' ? 'esnaf' : 'işçi' };
      d.meslek = { ad: m.ad, durum: dg.meslekDurumu, isTuru: m.isTuru };
      kayit.meslek = m.ad;
    } else if (dg.meslekDurumu === 'emekli') {
      const ad = `emekli ${n.meslek.ad.replace(/^emekli /, '')}`;
      d.meslek = { ad, durum: 'emekli' };
      kayit.meslek = ad;
    } else d.meslek = { ad: 'işsiz', durum: dg.meslekDurumu };
  }
  if (dg.ebeveynVefat) d[dg.ebeveynVefat + 'Vefat'] = tarihAl(durum.zaman.baslangic, gun * 1440).getUTCFullYear();
  if (dg.aileIliski) d.aileIliski = dg.aileIliski;
  if ('hayal' in dg) d.hayal = dg.hayal;
  if (dg.sirKalkar?.includes(n.sir)) d.sir = null; // barışan kişinin 'kardeşiyle küs' sırrı kalmaz
  if (dg.medeni) d.medeni = dg.medeni;
  if (dg.cocuk) d.cocuk = (d.cocuk ?? 0) + dg.cocuk;
  if ('dert' in dg) d.dert = dg.dert;
  if (dg.yok) d.yok = dg.yok;
  k.hayat = [...(k.hayat || []), kayit].slice(-12);
  return kayit;
}

// Bir oyun gününü işler (dünya ilerlerken her gün için çağrılır)
export function npcHayatGunu(durum, veri, gun) {
  const H = veri.npc?.hayatOlaylari;
  if (!H || !durum.npcler) return [];
  const rng = rngAl(durum, 'npcHayat');
  const olan = [];
  for (const [id, k] of Object.entries(durum.npcler)) {
    if (k.tanisildi === undefined || k.degisim?.yok || id.startsWith('f:')) continue; // figürlerin hayatı dünya kitabında yazılı
    const n = kisiGuncel(durum, veri, id);
    if (!n) continue;
    const adaylar = H.olaylar.filter(o => kosulTutar(n, k, o.kosul)).map(o => ({ id: o.id, agirlik: o.olasilik }));
    const toplam = adaylar.reduce((t, x) => t + x.agirlik, 0);
    if (!adaylar.length || !rng.olasilik(Math.min(H.gunlukTavan, toplam))) continue;
    olan.push({ npc: id, ...hayatOlayiUygula(durum, veri, id, rng.agirlikliSec(adaylar).id, gun, rng) });
  }
  return olan;
}

// Henüz öğrenmediğin hayat olayları
export const bilinmeyenOlaylar = k => (k?.hayat || []).filter(x => !x.bilinen);

// Öğrendiklerin: Tanıdıklarım için kısa satırlar
export function bilinenOlaylar(durum, veri, id) {
  const k = durum.npcler?.[id], H = veri.npc?.hayatOlaylari;
  if (!H) return [];
  const n = kisi(veri, durum.seed, id, k?.sablon);
  return (k?.hayat || []).filter(x => x.bilinen).map(x => {
    const o = H.olaylar.find(y => y.id === x.id);
    return { gun: x.gun, metin: o.ozet.replace('{meslek}', metinDegerleri(x, n).meslek) };
  });
}

// Kişinin kendi ağzından haber metni (kuşağa göre havuz) ya da başkasının ağzından dedikodu metni için ham şablon
export function haberSablonu(veri, x, kusak, rng, dedikodu = false) {
  const o = veri.npc.hayatOlaylari.olaylar.find(y => y.id === x.id);
  const liste = dedikodu ? o.dedikodu : (o.haber?.[kusak] || []);
  return liste.length ? rng.sec(liste) : null;
}

// Geliştirici: belirli bir olayı hemen yaşat
export function hayatOlayiTetikle(durum, veri, id, olayId) {
  const r = Rng.akis(durum.seed, `tetik|${id}|${durum.zaman.dakika}`);
  return hayatOlayiUygula(durum, veri, id, olayId, Math.floor(durum.zaman.dakika / 1440), r);
}
