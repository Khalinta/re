// Hafıza ve olgu kilidi (adım 3.8). Yapay zekâ sohbetinin (3.9) tutarlı kalması için:
//  - Her kişinin seninle ilgili hafızası: konuşma özetleri ve önemli anlar (npcler[id].hafiza.ozetler)
//  - Olgu kilidi: konuşmada ortaya çıkan YENİ bir bilgi (kişinin kendisi, ailesi, başkaları hakkında) bir kez
//    kayda geçer ve bir daha değişmez (npcler[id].hafiza.olgular). Önce kişi kartıyla çelişip çelişmediği denetlenir;
//    çelişen olgu reddedilir (kart her zaman kazanır).
//  - Kim kimin sırrını biliyor: belirlenimli (çok yakın arkadaş, gizli ilişki, bazen eski sevgili ya da arkadaş);
//    dedikoduda bir sırrı yalnızca onu bilen biri anlatır.
import { Rng } from './rng.js';
import { gunNo } from './zaman.js';
import { kisi, tanisiyorMu } from './insanlar.js';
import { bagTuru, kisiKarti, olguGuncelMi, olguIzi as izi, DEGISEBILIR } from './kart.js';

export const SINIR = { ozet: 30, olgu: 40 };

const kayit = (durum, id) => {
  durum.npcler ??= {};
  const k = (durum.npcler[id] ??= { iliski: {}, anilar: [] });
  k.hafiza ??= { ozetler: [], olgular: [] };
  return k;
};

// Kişinin seninle ilgili hafızasına bir satır (konuşma özeti, önemli an)
export function ozetEkle(durum, id, metin) {
  const h = kayit(durum, id).hafiza;
  h.ozetler.push({ gun: gunNo(durum.zaman.dakika), metin });
  if (h.ozetler.length > SINIR.ozet) h.ozetler.splice(0, h.ozetler.length - SINIR.ozet);
}

// ------------------------------------------------------------------ sırlar: kim biliyor

// n, t'nin sırrını biliyor mu? (belirlenimli; iki kişi arasındaki bağa göre)
export function sirriBiliyorMu(veri, seed, n, tid) {
  if (n === tid) return true;
  const nasil = tanisiyorMu(veri, seed, n, tid);
  if (!nasil) return false; // birbirini tanımayan sırrını da bilmez
  const tur = bagTuru(veri, seed, n, tid, nasil);
  if (tur === 'kanka' || tur === 'gizli_iliski') return true;
  const p = { eski_sevgili: 0.6, arkadas: 0.15, komsu: 0.08, is: 0.05, kus: 0.25 }[tur] ?? 0;
  return Rng.akis(seed, `sir|${n}|${tid}`).sayi() < p;
}

// ------------------------------------------------------------------ olgu kilidi

const normal = s => String(s ?? '').toLocaleLowerCase('tr').replace(/[^a-zçğıöşü0-9 ]/g, '').trim();
const MEDENI = { bekar: ['bekar', 'bekâr', 'yalnız'], sevgilili: ['sevgilili', 'sevgilisi var', 'birlikte', 'ilişkisi var'], evli: ['evli'], bosanmis: ['boşanmış', 'bosanmis', 'ayrılmış'], dul: ['dul', 'eşini kaybetmiş'] };

// Olgu: { hakkinda: 'kendi' | 'oyuncu' | <kişi kimliği>, alan, deger, metin }
// alan: medeni | meslek | memleket | yas | cocuk | kardes | es | anne | baba | semt | yeni (serbest, yeni bilgi)
// Döner: { tamam, sebep }
export function olguDenetle(kart, olgu) {
  const d = olgu.deger;
  const ret = sebep => ({ tamam: false, sebep });
  switch (olgu.alan) {
    case 'medeni': {
      const tutan = Object.entries(MEDENI).find(([, l]) => l.some(x => normal(d).includes(normal(x))))?.[0];
      return !tutan || tutan === kart.medeni ? { tamam: true } : ret(`medeni hali ${kart.medeni}, '${d}' değil`);
    }
    case 'meslek': {
      const issizDiyor = /işsiz|issiz|çalışmıyor|boşta/.test(normal(d));
      if (issizDiyor !== (kart.durum === 'issiz')) return ret(`meslek durumu ${kart.durum} (${kart.meslek})`);
      return { tamam: true };
    }
    case 'memleket': {
      const yerli = kart.yore === 'yerli';
      const ok = normal(d).includes(normal(kart.memleket)) || (yerli && normal(d).includes('karaliman'));
      return ok ? { tamam: true } : ret(`memleketi ${yerli ? 'Karaliman' : kart.memleket}`);
    }
    case 'yas': return Math.abs(Number(d) - kart.yas) <= 1 ? { tamam: true } : ret(`yaşı ${kart.yas}`);
    case 'cocuk': return Number(d) === kart.aile.cocuklar.length ? { tamam: true } : ret(`${kart.aile.cocuklar.length} çocuğu var`);
    case 'kardes': return Number(d) === kart.aile.kardesler.length ? { tamam: true } : ret(`${kart.aile.kardesler.length} kardeşi var`);
    case 'es': case 'anne': case 'baba': {
      const p = kart.aile[olgu.alan];
      if (!p) return ret(`${olgu.alan} yok`);
      return normal(d).includes(normal(p.ad)) ? { tamam: true } : ret(`${olgu.alan} adı ${p.ad}`);
    }
    case 'semt': return { tamam: true };
    case 'yeni': return d || olgu.metin ? { tamam: true } : ret('boş olgu');
    default: return ret(`bilinmeyen alan ${olgu.alan}`);
  }
}

// Kişi hakkında kalıcı bir olgu ekler (kartla çelişmiyorsa). hakkinda: kişinin kimliği.
// Aynı alan için ikinci bir olgu (yeni dışında) eklenmez: ilk söylenen kalır (değişebilen alanda: kart değişmedikçe).
export function olguEkle(durum, veri, hakkinda, olgu, kaynak) {
  const kart = kisiKarti(durum, veri, hakkinda);
  if (!kart) return { tamam: false, sebep: 'kişi yok' };
  const den = olguDenetle(kart, olgu);
  if (!den.tamam) return den;
  const h = kayit(durum, hakkinda).hafiza;
  if (olgu.alan !== 'yeni' && h.olgular.some(x => x.alan === olgu.alan && olguGuncelMi(kart, x))) return { tamam: true, zaten: true };
  if (olgu.alan === 'yeni' && h.olgular.some(x => normal(x.metin) === normal(olgu.metin))) return { tamam: true, zaten: true };
  h.olgular.push({ alan: olgu.alan, deger: olgu.deger ?? null, metin: olgu.metin ?? String(olgu.deger), gun: gunNo(durum.zaman.dakika), kaynak, ...(DEGISEBILIR[olgu.alan] ? { iz: izi(kart, olgu.alan) } : {}) });
  if (h.olgular.length > SINIR.olgu) h.olgular.splice(0, h.olgular.length - SINIR.olgu);
  return { tamam: true };
}

// Yapay zekâya verilecek: bu kişinin seninle ilgili bildikleri ve hatırladıkları + kendisi hakkında kesinleşmiş olgular
export function hafizaMetni(durum, veri, id) {
  const k = durum.npcler?.[id];
  if (!k) return 'Seninle daha önce hiç konuşmadı.';
  const b = k.bilinen || {};
  const bildikleri = Object.keys(b).filter(x => x.startsWith('oyuncu_')).map(x => ({ memleket: 'nereli olduğunu', is: 'ne iş yaptığını', hikaye: 'geçmişini (buraya nasıl geldiğini)', semt: 'nerede oturduğunu', medeni: 'ilişki durumunu', yalan: 'sana bir yalan söylediğini değil, uydurma bir hikâye anlattığını (gerçeği bilmiyor)', flort: 'ona ilgi duyduğunu' }[x.slice(7)] ?? x.slice(7)));
  const h = k.hafiza || { ozetler: [], olgular: [] };
  const kart = h.olgular.length ? kisiKarti(durum, veri, id) : null;
  const guncel = h.olgular.filter(x => olguGuncelMi(kart, x)), eski = h.olgular.filter(x => !olguGuncelMi(kart, x));
  const kisiHakkinda = Object.entries(durum.bilgi?.dedikodular || {}).filter(([, d]) => d.kaynak === id && d.metin).map(([, d]) => d.metin);
  return [
    `Seninle ${k.sohbet ?? 0} kez sohbet etti. Yakınlık ${Math.round(k.iliski?.yakinlik ?? 0)}, güven ${k.iliski?.guven ?? 0}, gerginlik ${k.iliski?.gerginlik ?? 0}, çekim ${k.iliski?.cekim ?? 0}.${k.iliskiTuru ? ' İlişkiniz: ' + k.iliskiTuru + '.' : ''}${k.numara ? ' Numaranız birbirinizde.' : ''}`,
    bildikleri.length ? `Senin hakkında bildikleri: ${bildikleri.join(', ')}.` : 'Senin hakkında pek bir şey bilmiyor.',
    (k.anilar || []).length ? `Birlikte yaşadıklarınız: ${k.anilar.map(a => a.metin).join('; ')}.` : null,
    h.ozetler.length ? `Önceki konuşmalarınız: ${h.ozetler.map(x => `(${x.gun + 1}. gün) ${x.metin}`).join(' ')}` : null,
    kisiHakkinda.length ? `Sana daha önce anlattığı dedikodular: ${kisiHakkinda.join(' | ')}` : null,
    guncel.length ? `Kendisi hakkında konuşmalarda ortaya çıkmış, DEĞİŞMEZ olgular: ${guncel.map(x => x.metin).join('; ')}.` : null,
    eski.length ? `Eskiden doğruydu, artık değil (hayatı değişti; kişi kartındaki güncel durum geçerli): ${eski.map(x => `(${x.gun + 1}. gün söylemişti) ${x.metin}`).join('; ')}.` : null,
  ].filter(Boolean).join('\n');
}

// Kişinin başkalarının sırlarından bildikleri (yapay zekâ bunları ancak güvenirse anlatır)
export function bildigiSirlar(veri, seed, id, ag) {
  const sonuc = [];
  for (const x of ag) {
    const t = kisi(veri, seed, x.id);
    if (!t?.sir || !sirriBiliyorMu(veri, seed, id, x.id)) continue;
    const metin = veri.npc.hayat.sirlar.find(s => s.id === t.sir)?.metin;
    if (metin) sonuc.push(`${t.hitapAdi}: ${metin}`);
  }
  return sonuc;
}
