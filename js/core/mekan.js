// Mekanlar: açık mı, ne kadar kalabalık, kimler gelir, ne konuşulur (adım 2.5) ve veri denetimi.
import { dilim } from './zaman.js';
import { saatDakika } from './ulasim.js';

const KIMLIK = /^[a-z][a-z0-9_]*$/;
const IYELIK_SUPHESI = /[ıiuü]$/; // K47
const KONU = /^(figur|orgut|sirket|kurum|mekan):([a-z][a-z0-9_]*)$/;
const DILIM_IDLERI = ['sabah', 'ogle', 'aksam', 'gece'];
const gunDk = t => ((t % 1440) + 1440) % 1440;

const mekanlar = dunya => dunya?.mekanlar?.mekanlar || [];
export const mekanBul = (dunya, id) => mekanlar(dunya).find(m => m.id === id) ?? null;

// t: oyun dakikası ya da günün dakikası; haftaGunu: 0 = pazar … 6 = cumartesi (t'nin ait olduğu takvim günü)
// Gece yarısını geçen saatler önceki günün mesaisidir: cumartesi 26:00'ya kadar açık bir bar pazar 01:00'de açıktır.
export function acikMi(mekan, t, haftaGunu) {
  if (mekan.saatler.her_zaman) return true;
  const dk = gunDk(t);
  const ac = saatDakika(mekan.saatler.acilis), kap = saatDakika(mekan.saatler.kapanis);
  const kapali = g => (mekan.kapaliGunler || []).includes(((g % 7) + 7) % 7);
  if (dk >= ac && dk < kap && !kapali(haftaGunu)) return true;
  return kap > 1440 && dk < kap - 1440 && !kapali(haftaGunu - 1);
}

// 0 (boş) – 3 (tıklım tıklım); kapalıysa null
export function kalabalik(mekan, t, haftaGunu) {
  return acikMi(mekan, t, haftaGunu) ? mekan.kalabalik[dilim(gunDk(t)).id] : null;
}

// Semtteki mekanlar; isteğe bağlı süzgeçler: o an açık olanlar, tür, hizmet
export function semtMekanlari(dunya, semt, { t, haftaGunu, tur, hizmet } = {}) {
  return mekanlar(dunya).filter(m => m.semt === semt
    && (t === undefined || acikMi(m, t, haftaGunu))
    && (!tur || m.tur === tur)
    && (!hizmet || m.hizmetler.includes(hizmet)));
}

// Bir konu (ör. 'figur:kaan_tanriverdi') hakkında hangi mekanlarda ne konuşuluyor
export function konuDedikodulari(dunya, konu) {
  return mekanlar(dunya).flatMap(m => (m.dedikodular || []).filter(d => d.konu === konu).map(d => ({ ...d, mekan: m.id })));
}

// Bir figürün sık görüldüğü mekanlar
export const figurMekanlari = (dunya, figur) => mekanlar(dunya).filter(m => m.mudavimler?.includes(figur));

export function mekanDogrula(dunya, semtIdler, olayIdler) {
  const h = [];
  const d = dunya.mekanlar;
  const sakinTurleri = dunya.semtler?.sakinTurleri || null;
  const ref = {
    figur: id => !!dunya.figurler?.figurler.some(x => x.id === id),
    orgut: id => !!dunya.orgutler?.orgutler.some(x => x.id === id),
    sirket: id => !!dunya.sirketler?.sirketler.some(x => x.id === id),
    kurum: id => !!dunya.kurumlar?.kurumlar.some(x => x.id === id),
    mekan: id => d.mekanlar.some(x => x.id === id),
  };
  const idler = new Set();
  const dedikoduIdler = new Set();
  const semtSayisi = new Map();
  for (const [i, m] of d.mekanlar.entries()) {
    const y = `mekan ${m.id}`;
    if (!KIMLIK.test(m.id || '')) h.push(`mekanlar[${i}]: id biçimi "${m.id}"`);
    if (idler.has(m.id)) h.push(`${y}: kimlik iki kez`);
    idler.add(m.id);
    if (!m.ad) h.push(`${y}: ad yok`);
    if (IYELIK_SUPHESI.test(m.ad || '') && m.iyelik === undefined) h.push(`${y}: "${m.ad}" iyelikli olabilir, "iyelik" alanı yazılmalı`);
    if (!d.mekanTurleri?.[m.tur]) h.push(`${y}: bilinmeyen tür "${m.tur}"`);
    if (!semtIdler.has(m.semt)) h.push(`${y}: bilinmeyen semt "${m.semt}"`);
    semtSayisi.set(m.semt, (semtSayisi.get(m.semt) || 0) + 1);
    if (m.yer && dunya.semtler) {
      const semt = dunya.semtler.semtler.find(s => s.id === m.semt);
      if (!semt?.unluYerler?.some(u => u.id === m.yer)) h.push(`${y}: "${m.yer}" ${m.semt} semtinin ünlü yerlerinden değil`);
    }

    const sahipTurleri = ['figur', 'sirket', 'kurum', 'tohum'].filter(k => m.sahip?.[k]);
    if (sahipTurleri.length !== 1) h.push(`${y}: sahip tam olarak bir tane olmalı (figur / sirket / kurum / tohum)`);
    else if (sahipTurleri[0] === 'tohum') {
      const t = m.sahip.tohum;
      if (!t.ad || !t.tanim || !['e', 'k'].includes(t.cinsiyet) || !(Number.isInteger(t.yas) && t.yas >= 16 && t.yas <= 95)) h.push(`${y}: tohum sahip (ad, cinsiyet, yaş 16–95, tanım) eksik`);
      if (sakinTurleri && !sakinTurleri[t.sakinTuru]) h.push(`${y}: tohumun sakin türü bilinmiyor "${t.sakinTuru}"`);
    } else {
      const [tur] = sahipTurleri;
      if (!ref[tur](m.sahip[tur])) h.push(`${y}: bilinmeyen sahip ${tur} "${m.sahip[tur]}"`);
      if (tur === 'sirket') {
        const s = dunya.sirketler?.sirketler.find(x => x.id === m.sahip.sirket);
        if (s && s.durum !== 'aktif') h.push(`${y}: sahibi batık şirket`);
        if (s?.paravan && m.gizli?.orgut !== s.paravan) h.push(`${y}: sahibi ${s.id} ${s.paravan} paravanı; gizli.orgut aynı olmalı`);
      }
    }

    const st = m.saatler || {};
    if (!st.her_zaman) {
      const ac = saatDakika(st.acilis), kap = saatDakika(st.kapanis);
      if (!(ac >= 0 && ac < 1440 && kap > ac && kap <= ac + 1440)) h.push(`${y}: açılış/kapanış biçimi ya da sırası`);
    }
    const kg = m.kapaliGunler || [];
    if (kg.some(g => !Number.isInteger(g) || g < 0 || g > 6) || new Set(kg).size !== kg.length || kg.length >= 7) h.push(`${y}: kapaliGunler 0–6 arası, tekrarsız ve en az bir gün açık olmalı`);
    if (!(Number.isInteger(m.fiyat) && m.fiyat >= 1 && m.fiyat <= 5)) h.push(`${y}: fiyat 1–5 olmalı`);
    if (!m.hizmetler?.length) h.push(`${y}: hizmet yok`);
    for (const x of m.hizmetler || []) if (!d.hizmetler?.[x]) h.push(`${y}: bilinmeyen hizmet "${x}"`);
    if (!m.musteri?.length) h.push(`${y}: müşteri profili yok`);
    if (sakinTurleri) for (const x of m.musteri || []) if (!sakinTurleri[x]) h.push(`${y}: bilinmeyen müşteri türü "${x}"`);
    for (const dl of DILIM_IDLERI) if (!(Number.isInteger(m.kalabalik?.[dl]) && m.kalabalik[dl] >= 0 && m.kalabalik[dl] <= 3)) h.push(`${y}: kalabalik.${dl} 0–3 olmalı`);
    if (!m.tasvir || !m.gecmis) h.push(`${y}: tasvir ve geçmiş gerekli`);
    for (const f of m.mudavimler || []) if (!ref.figur(f)) h.push(`${y}: bilinmeyen müdavim "${f}"`);
    for (const o of m.olaylar || []) if (!olayIdler.has(o)) h.push(`${y}: zaman çizelgesinde olmayan olay "${o}"`);
    for (const dd of m.dedikodular || []) {
      if (!KIMLIK.test(dd.id || '') || dedikoduIdler.has(dd.id)) h.push(`${y}: dedikodu kimliği "${dd.id}" geçersiz ya da tekrar`);
      dedikoduIdler.add(dd.id);
      if (!dd.metin || typeof dd.dogru !== 'boolean') h.push(`${y}: dedikodu ${dd.id}: metin ve dogru (true/false) gerekli`);
      const k = KONU.exec(dd.konu || '');
      if (dd.konu && (!k || !ref[k[1]](k[2]))) h.push(`${y}: dedikodu ${dd.id}: konu geçersiz "${dd.konu}"`);
    }
    if (!m.firsatlar?.length) h.push(`${y}: fırsat yok`);
    for (const f of m.firsatlar || []) if (!d.firsatTurleri?.[f.tur] || !f.aciklama) h.push(`${y}: fırsat "${f.tur}" bilinmiyor ya da açıklamasız`);
    if (m.gizli && (!ref.orgut(m.gizli.orgut) || !m.gizli.aciklama)) h.push(`${y}: gizli bağ örgütü ya da açıklaması geçersiz`);
  }
  for (const s of semtIdler) if ((semtSayisi.get(s) || 0) < 2) h.push(`semt ${s}: en az iki mekan olmalı`);
  return h;
}
