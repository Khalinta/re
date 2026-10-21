// Etkiler: olay ve seçimlerin sonuçları. Bir sonuç birden çok sistemi aynı anda etkileyebilir.
// Etki listesi: [{ "para": -150 }, { "iliski": { "npc": "patron", "saygi": 10 } }, { "bayrak": "x" }, ...]
//
// Her etki tek anahtarlı bir nesnedir. Uygulayıcılar ETKILER tablosundadır; yeni etki = bir satır.
// İsteğe bağlı alanlar (npcler, itibar, suc, ...) yoksa ilk kullanıldığında oluşturulur.
// Döner: anlatıya eklenecek küçük sistem notları ve zincirlenecek olaylar.
import { bayrakKoy, bayrakKaldir, sayacEkle } from './bayrak.js';
import { sinirla, zamanGecir } from './simulasyon.js';
import { para as paraYaz } from './format.js';

export const SURE = { dakika: 1, saat: 60, gun: 1440, hafta: 10080, ay: 43200 };
export function sureDk(s) {
  if (typeof s === 'number') return s;
  if (!s || typeof s !== 'object') return 0;
  return Object.entries(s).reduce((t, [k, v]) => t + (SURE[k] ?? 0) * v, 0);
}

// "hk:yakin": başlangıç hikâyesinin kişisi (durum.hikaye.npc); başka adlar bağlamdan ya da olduğu gibi
const npcId = (ctx, ref) => (typeof ref === 'string' && ref.startsWith('hk:') ? ctx.durum?.hikaye?.npc?.[ref.slice(3)] : undefined) ?? ctx.baglam?.npc?.[ref] ?? ref;

function npcKaydi(d, id) {
  d.npcler ??= {};
  d.npcler[id] ??= { iliski: {}, anilar: [] };
  d.npcler[id].iliski ??= {};
  d.npcler[id].anilar ??= [];
  return d.npcler[id];
}

// "a.b.c" yolunu (ara nesneleri oluşturarak) yazar
export function yolYaz(nesne, yol, deger) {
  const p = yol.split('.');
  let x = nesne;
  for (let i = 0; i < p.length - 1; i++) {
    if (x[p[i]] === null || typeof x[p[i]] !== 'object') x[p[i]] = {};
    x = x[p[i]];
  }
  x[p.at(-1)] = deger;
}
const yolOku = (n, yol) => yol.split('.').reduce((x, k) => (x == null ? undefined : x[k]), n);

const ANI_SINIRI = 30;

export const ETKILER = {
  // { "para": -150 }  (eksi harcama, artı kazanç)
  para: (v, ctx, notlar) => {
    ctx.durum.para = Math.round((ctx.durum.para + v) * 100) / 100;
    notlar.push((v < 0 ? '−' : '+') + paraYaz(Math.abs(v)));
  },
  // { "durum": { "enerji": -10, "ruh": 5 } }
  durum: (v, ctx) => {
    const d = ctx.durum.durumlar;
    for (const [k, x] of Object.entries(v)) if (k in d) d[k] = sinirla(d[k] + x);
  },
  // { "beceri": { "yemek": 2 } }
  beceri: (v, ctx) => {
    for (const [k, x] of Object.entries(v)) ctx.durum.beceriler[k] = sinirla((ctx.durum.beceriler[k] ?? 0) + x);
  },
  // { "bayrak": "ad" } | { "bayrak": { "ad": "x", "deger": 2, "sure": { "gun": 3 }, "npc": "patron" } }
  bayrak: (v, ctx) => {
    const o = typeof v === 'string' ? { ad: v } : v;
    bayrakKoy(ctx.durum, o.ad, o.deger ?? true, {
      sure: o.sure !== undefined ? sureDk(o.sure) : undefined,
      npc: o.npc !== undefined ? npcId(ctx, o.npc) : undefined,
    });
  },
  // { "bayrakKaldir": "ad" } | { "bayrakKaldir": { "ad": "x", "npc": "patron" } }
  bayrakKaldir: (v, ctx) => {
    const o = typeof v === 'string' ? { ad: v } : v;
    bayrakKaldir(ctx.durum, o.ad, { npc: o.npc !== undefined ? npcId(ctx, o.npc) : undefined });
  },
  // { "sayac": { "kahve": 1 } } | { "sayac": { "ad": "borc", "miktar": 500, "npc": "patron" } }
  sayac: (v, ctx) => {
    if ('ad' in v) sayacEkle(ctx.durum, v.ad, v.miktar ?? 1, { npc: v.npc !== undefined ? npcId(ctx, v.npc) : undefined });
    else for (const [k, x] of Object.entries(v)) sayacEkle(ctx.durum, k, x);
  },
  // { "iliski": { "npc": "patron", "saygi": 10, "guven": -5, "tur": "arkadas" } }
  iliski: (v, ctx) => {
    const { npc, tur, ...degerler } = v;
    const n = npcKaydi(ctx.durum, npcId(ctx, npc));
    for (const [k, x] of Object.entries(degerler)) n.iliski[k] = Math.max(-100, Math.min(100, (n.iliski[k] ?? 0) + x));
    if (tur) n.iliskiTuru = tur;
  },
  // { "ani": { "npc": "patron", "metin": "mutfağı yangından kurtardı", "duygu": 1 } }  NPC oyuncuyla ilgili bunu hatırlar
  ani: (v, ctx) => {
    const n = npcKaydi(ctx.durum, npcId(ctx, v.npc));
    n.anilar.push({ z: ctx.durum.zaman.dakika, metin: v.metin, ...(v.duygu !== undefined ? { duygu: v.duygu } : {}) });
    if (n.anilar.length > ANI_SINIRI) n.anilar.splice(0, n.anilar.length - ANI_SINIRI);
  },
  // { "eveDon": true }  (3.14) olayın sonunda evindesin (birlikte geçen geceden sonra); açık sohbet kapanır
  eveDon: (v, ctx) => {
    const d = ctx.durum;
    if (d.ev?.semt) d.konum = { semt: d.ev.semt, mekan: 'ev' };
    delete d.sohbet;
  },
  // { "numaraVer": { "npc": "kisi" } }  (3.16) numarası artık sende (peçeteni bulup yazdı)
  numaraVer: (v, ctx) => {
    const n = npcKaydi(ctx.durum, npcId(ctx, v.npc));
    n.numara = true;
    if (n.sahteNumara) n.sahteNumara.ogrendi = true;
  },
  // { "sahteOgrendi": { "npc": "kisi" } }  (3.16) verdiği numaranın yanlış olduğunu anladın
  sahteOgrendi: (v, ctx) => {
    const n = npcKaydi(ctx.durum, npcId(ctx, v.npc));
    if (n.sahteNumara) n.sahteNumara.ogrendi = true;
  },
  // { "partnerdenAyril": { "npc": "kisi" } }  (3.13) kişi senin için evliliğini/ilişkisini bitirir: boşanmış ya da bekâr olur,
  // gizli ilişki biter; Tanıdıklarım'da "Senin için ilişkisini bitirdi." (kisiGuncel uygular)
  partnerdenAyril: (v, ctx) => {
    const n = npcKaydi(ctx.durum, npcId(ctx, v.npc));
    (n.degisim ??= {}).partnerdenAyrildi = true;
    n.gizli = false;
    n.hayat = [...(n.hayat || []), { gun: Math.floor(ctx.durum.zaman.dakika / 1440), id: 'partnerden_ayrildi', bilinen: true }].slice(-12);
  },
  // { "itibar": { "genel": 2, "semt": { "eski_carsi": 3, "_ev": 1 }, "sektor": { "hizmet": 1 } } }
  itibar: (v, ctx) => {
    const d = ctx.durum;
    d.itibar ??= { genel: 0, semt: {}, sektor: {} };
    const ekle = (o, k, x) => { o[k] = Math.max(-100, Math.min(100, (o[k] ?? 0) + x)); };
    if (v.genel) ekle(d.itibar, 'genel', v.genel);
    // '_ev': evinin semti, '_konum': şu an bulunduğun semt (3.12)
    for (const [k, x] of Object.entries(v.semt || {})) {
      const semt = k === '_ev' ? d.ev?.semt : k === '_konum' ? d.konum?.semt : k;
      if (semt) ekle(d.itibar.semt, semt, x);
    }
    for (const [k, x] of Object.entries(v.sektor || {})) ekle(d.itibar.sektor, k, x);
  },
  // { "zamanla": { "sure": { "hafta": 3 }, "olay": "patronun_teklifi", "baglam": true,
  //               "kosul": { "bayrak": "aidat_borcu" }, "kosulTutmazsa": "iptal" | "bekle" } }   gecikmeli sonuç
  // Vakti gelince koşul (varsa) tutarsa olay başlar; tutmazsa varsayılan olarak iptal olur.
  zamanla: (v, ctx) => {
    ctx.durum.zamanlayicilar.push({
      zaman: ctx.durum.zaman.dakika + sureDk(v.sure),
      olay: v.olay,
      ...(v.baglam && ctx.baglam ? { baglam: ctx.baglam } : {}),
      ...(ctx.olayId ? { kaynak: ctx.olayId } : {}),
      ...(v.kosul !== undefined ? { kosul: v.kosul } : {}),
      ...(v.kosulTutmazsa ? { kosulTutmazsa: v.kosulTutmazsa } : {}),
    });
    ctx.durum.zamanlayicilar.sort((a, b) => a.zaman - b.zaman);
  },
  // { "zaman": 30 } | { "zaman": { "saat": 2 } }  olayın içinde zaman geçer (durumlar da değişir)
  zaman: (v, ctx) => {
    const dk = sureDk(v);
    if (dk > 0 && ctx.veri?.sim) ctx.uyarilar.push(...zamanGecir(ctx.durum, dk, 'normal', ctx.veri.sim));
    else ctx.durum.zaman.dakika += dk;
  },
  // Hikaye yayı: { "yay": { "id": "apartman_borcu", "asama": "borclu" } }  (yay yoksa başlatır)
  yay: (v, ctx) => {
    const y = ((ctx.durum.yaylar ??= {})[v.id] ??= { asama: null, basladi: ctx.durum.zaman.dakika, gecmis: [] });
    y.asama = v.asama;
    y.guncellendi = ctx.durum.zaman.dakika;
    y.gecmis.push(v.asama);
    if (y.gecmis.length > 30) y.gecmis.shift();
  },
  // { "yayBitir": { "id": "apartman_borcu", "sonuc": "odendi" } }
  yayBitir: (v, ctx) => {
    const y = ((ctx.durum.yaylar ??= {})[v.id] ??= { asama: null, basladi: ctx.durum.zaman.dakika, gecmis: [] });
    y.bitti = { sonuc: v.sonuc, z: ctx.durum.zaman.dakika };
  },

  // { "olay": "sonraki_olay" }  bu olay bitince hemen başlar (zincir)
  olay: (v, ctx) => { ctx.zincir.push(v); },
  // { "gunluk": "Bugün Hüsnü Amca'nın dükkânında..." }
  gunluk: (v, ctx) => {
    ctx.durum.gunluk.push({ z: ctx.durum.zaman.dakika, metin: v });
    if (ctx.durum.gunluk.length > 500) ctx.durum.gunluk.shift();
  },
  // { "not": "+1 güven" }  anlatıya küçük sistem notu
  not: (v, ctx, notlar) => { notlar.push(v); },

  // Genel yol: { "deger": { "yol": "suc.aranma", "ekle": 1 } } | { "deger": { "yol": "x.y", "yaz": "metin" } }
  deger: (v, ctx) => {
    if ('yaz' in v) yolYaz(ctx.durum, v.yol, v.yaz);
    if ('ekle' in v) {
      let x = (yolOku(ctx.durum, v.yol) ?? 0) + v.ekle;
      if (v.min !== undefined) x = Math.max(v.min, x);
      if (v.max !== undefined) x = Math.min(v.max, x);
      yolYaz(ctx.durum, v.yol, x);
    }
  },

  // ---- Suç dünyası kısa yazımları (sistemler Faz 4'te) ----
  // { "aranma": 1 }  (0–5 arası)
  aranma: (v, ctx) => {
    const s = (ctx.durum.suc ??= {});
    s.aranma = Math.max(0, Math.min(5, (s.aranma ?? 0) + v));
  },
  // { "karaPara": 5000 }
  karaPara: (v, ctx) => {
    const s = (ctx.durum.suc ??= {});
    s.karaPara = Math.max(0, (s.karaPara ?? 0) + v);
  },
  // { "sabika": { "tur": "hirsizlik" } }
  sabika: (v, ctx) => {
    const s = (ctx.durum.suc ??= {});
    (s.sabika ??= []).push({ tur: v.tur, z: ctx.durum.zaman.dakika, ...(v.not ? { not: v.not } : {}) });
  },
  // { "orgut": { "id": "demirciler", "uye": true, "guven": 5, "rutbe": 1, "korku": 3 } }
  orgut: (v, ctx) => {
    const s = (ctx.durum.suc ??= {});
    const o = ((s.orgutler ??= {})[v.id] ??= { uye: false, rutbe: 0, guven: 0 });
    for (const [k, x] of Object.entries(v)) {
      if (k === 'id') continue;
      if (typeof x === 'number') o[k] = (o[k] ?? 0) + x; else o[k] = x;
    }
  },
};

// Etki listesini uygular. ctx = { durum, veri, baglam, olayId }
// Döner: { notlar: [metin], zincir: [olayId], uyarilar: [...] }
export function etkileriUygula(liste, ctx) {
  const notlar = [];
  const ic = { ...ctx, zincir: [], uyarilar: [] };
  for (const e of [].concat(liste || [])) {
    for (const [k, v] of Object.entries(e)) {
      const f = ETKILER[k];
      if (!f) throw new Error('Bilinmeyen etki: ' + k);
      f(v, ic, notlar);
    }
  }
  return { notlar, zincir: ic.zincir, uyarilar: ic.uyarilar };
}

// Veri dosyası doğrulaması
export function etkiDogrula(liste, yol = 'etki') {
  const h = [];
  [].concat(liste || []).forEach((e, i) => {
    if (!e || typeof e !== 'object' || Array.isArray(e)) { h.push(`${yol}[${i}]: nesne olmalı`); return; }
    for (const [k, v] of Object.entries(e)) {
      if (!ETKILER[k]) { h.push(`${yol}[${i}]: bilinmeyen etki "${k}"`); continue; }
      if (['para', 'aranma', 'karaPara'].includes(k) && typeof v !== 'number') h.push(`${yol}[${i}].${k}: sayı olmalı`);
      if (['durum', 'beceri'].includes(k) && (typeof v !== 'object' || Object.values(v).some(x => typeof x !== 'number'))) h.push(`${yol}[${i}].${k}: { ad: sayı } olmalı`);
      if (['iliski', 'ani'].includes(k) && v?.npc === undefined) h.push(`${yol}[${i}].${k}: npc gerekli`);
      if (k === 'ani' && typeof v?.metin !== 'string') h.push(`${yol}[${i}].ani: metin gerekli`);
      if (k === 'zamanla' && (typeof v?.olay !== 'string' || !sureDk(v.sure))) h.push(`${yol}[${i}].zamanla: olay ve sure gerekli`);
      if (k === 'orgut' && typeof v?.id !== 'string') h.push(`${yol}[${i}].orgut: id gerekli`);
      if (k === 'deger' && (typeof v?.yol !== 'string' || !('yaz' in v || 'ekle' in v))) h.push(`${yol}[${i}].deger: yol ve yaz/ekle gerekli`);
      if (k === 'yay' && (typeof v?.id !== 'string' || typeof v?.asama !== 'string')) h.push(`${yol}[${i}].yay: id ve asama gerekli`);
      if (k === 'yayBitir' && (typeof v?.id !== 'string' || typeof v?.sonuc !== 'string')) h.push(`${yol}[${i}].yayBitir: id ve sonuc gerekli`);
      if (k === 'zamanla' && v?.kosulTutmazsa && !['iptal', 'bekle'].includes(v.kosulTutmazsa)) h.push(`${yol}[${i}].zamanla: kosulTutmazsa iptal ya da bekle olmalı`);
    }
  });
  return h;
}
