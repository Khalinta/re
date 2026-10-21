// Claude ile serbest sohbet — çekirdek (adım 3.9). Ağ çağrısı yok; yalnızca:
//  - modele verilecek kurallar (sistem metni) ve kişiye özgü bağlam (kişi kartı + hafıza + sahne)
//  - cevabın JSON şeması (yapılandırılmış çıktı)
//  - cevabın oyuna uygulanması: ilişki değişimleri sınırlı, olaylar oyunun kurallarıyla denetlenir,
//    yeni olgular olgu kilidinden geçer (kartla çelişen reddedilir).
// Ağ tarafı js/yz/istemci.js'te. Kurallar: PROJE.md K63.
import { kisiKarti, kartMetni } from './kart.js';
import { hafizaMetni, bildigiSirlar, olguEkle, ozetEkle } from './hafiza.js';
import { flortUygun, flortEngeli, ilgi, oturumBitir } from './sohbet.js';
import { fizikTarifi } from './npc.js';
import { dilim, gunNo, gunDakikasi, tarihAl, yas as yasHesapla } from './zaman.js';
import { semtBul } from './dunya.js';
import { mekanBul } from './mekan.js';
import { kisi, mekandakiler, gorunus } from './insanlar.js';
import { saat as saatYaz, tarih } from './format.js';

// Sağlayıcılar: Claude (ücretli, kendi anahtarınla) ve Google Gemini (ücretsiz katmanı var). Fiyatlar 1M token başına $.
// Gemini modelleri takma adla (…-latest): Google yeni sürüm çıkardıkça kendiliğinden güncel kalır.
export const MODELLER = [
  { id: 'claude-opus-5-5', saglayici: 'claude', ad: 'Opus 5.5', not: 'en iyi konuşma, en pahalı', girdi: 4, cikti: 20 },
  { id: 'claude-sonnet-5-5', saglayici: 'claude', ad: 'Sonnet 5.5', not: 'çok iyi, yarı fiyatına', girdi: 2, cikti: 10 },
  { id: 'claude-haiku-5-5', saglayici: 'claude', ad: 'Haiku 5.5', not: 'en ucuz; daha sade', girdi: 0.1, cikti: 0.5 },
  { id: 'gemini-flash-latest', saglayici: 'gemini', ad: 'Flash', not: 'ücretsiz katmanda; iyi denge', girdi: 0, cikti: 0 },
  { id: 'gemini-flash-lite-latest', saglayici: 'gemini', ad: 'Flash-Lite', not: 'ücretsiz katmanda; en hızlı, daha sade, sınırı daha geniş', girdi: 0, cikti: 0 },
  { id: 'gemini-pro-latest', saglayici: 'gemini', ad: 'Pro', not: 'en iyisi; ücretsiz katmanda kapalı ya da çok sınırlı olabilir', girdi: 0, cikti: 0 },
];
export const SAGLAYICILAR = {
  claude: { ad: 'Claude', varsayilan: 'claude-sonnet-5-5', ipucu: 'sk-ant-…' },
  gemini: { ad: 'Gemini (ücretsiz)', varsayilan: 'gemini-flash-latest', ipucu: 'AIza…' },
};
export const VARSAYILAN_MODEL = SAGLAYICILAR.claude.varsayilan;

// Bir isteğin yaklaşık maliyeti ($), usage alanlarından
export function maliyet(model, usage = {}) {
  const m = MODELLER.find(x => x.id === model) ?? MODELLER.find(x => model?.startsWith(x.id)) ?? (String(model).startsWith('gemini') ? { girdi: 0, cikti: 0 } : MODELLER[0]);
  const girdi = (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) * 1.25 + (usage.cache_read_input_tokens ?? 0) * 0.1;
  return (girdi * m.girdi + (usage.output_tokens ?? 0) * m.cikti) / 1e6;
}

export const OLAYLAR = ['numara_verdi', 'bulusmayi_kabul_etti', 'kalkip_gitti', 'sir_anlatti', 'dert_anlatti', 'hayal_anlatti', 'kirildi', 'iltifata_karsilik_verdi'];
const ALANLAR = ['medeni', 'meslek', 'memleket', 'yas', 'cocuk', 'kardes', 'es', 'anne', 'baba', 'semt', 'yeni'];

// Cevap şeması (yapılandırılmış çıktı): her alan zorunlu, fazlası yok
export const CEVAP_SEMASI = {
  type: 'object',
  additionalProperties: false,
  required: ['eylem', 'konusma', 'sonuclar', 'olaylar', 'olgular', 'oyuncuHakkinda', 'ozet', 'oneriler'],
  properties: {
    eylem: { type: 'string', description: 'Konuşmadan önceki kısa beden dili / hareket, üçüncü şahıs, şimdiki zaman (boş olabilir). Örn: "Gözlerini kaçırıp gülümsüyor."' },
    konusma: { type: 'string', description: 'Kişinin söylediği sözler, tırnaksız, kendi ağzından.' },
    sonuclar: {
      type: 'object', additionalProperties: false, required: ['yakinlik', 'guven', 'cekim', 'gerginlik'],
      properties: { yakinlik: { type: 'integer' }, guven: { type: 'integer' }, cekim: { type: 'integer' }, gerginlik: { type: 'integer' } },
    },
    olaylar: { type: 'array', items: { type: 'string', enum: OLAYLAR } },
    olgular: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['hakkinda', 'alan', 'deger', 'metin'],
        properties: { hakkinda: { type: 'string', description: '"kendi" ya da sözü geçen kişinin adı' }, alan: { type: 'string', enum: ALANLAR }, deger: { type: 'string' }, metin: { type: 'string', description: 'Tam cümleyle olgu, üçüncü şahıs.' } },
      },
    },
    oyuncuHakkinda: { type: 'array', items: { type: 'string' }, description: 'Oyuncunun bu konuşmada kendisi hakkında açıkladıkları (kısa cümleler).' },
    ozet: { type: 'string', description: 'Bu alışverişin tek cümlelik özeti (kişinin hafızası için).' },
    oneriler: { type: 'array', items: { type: 'string' }, description: 'Oyuncunun söyleyebileceği 3 kısa, farklı tonda cevap önerisi.' },
  },
};

// Sabit kurallar (önbelleğe alınır; içinde değişken bilgi yok)
export const SISTEM = `Sen "Yeniden" adlı Türkçe bir hayat simülasyonunda, Karaliman adlı kurgusal bir şehirde yaşayan bir kişiyi canlandırıyorsun. Her istekte sana o kişinin KİŞİ KARTI, seninle ilgili HAFIZASI, SAHNE ve şu ana kadarki KONUŞMA verilir. Yalnızca o kişinin sözlerini ve küçük hareketlerini yazarsın.

TUTARLILIK (en önemli kural):
- Kişi kartı ve "değişmez olgular" kesin gerçektir. Asla çelişme: adı, yaşı, ailesi, medeni hali, işi, memleketi, geçmişi, sırları, ilişkileri kartta ne yazıyorsa odur.
- Kartta olmayan küçük bir ayrıntı gerekirse (bir evcil hayvan, sevdiği bir yer, bir anı) kartla uyumlu biçimde uydurabilirsin; ama uydurduğun her somut bilgiyi "olgular" listesine yazmak zorundasın. Hayatı değiştiren büyük olgular uydurma (gizli bir çocuk, ölüm, servet, sabıka...).
- Kişi yalnızca kartında yazanları, kendi sırlarını, başkalarının "bildiği sırlarını" ve hafızasındakileri bilir. Oyuncunun geçmişini ancak oyuncu anlattıysa bilir. Kendi sırrını ve başkalarının sırlarını kolay kolay anlatmaz: ancak güven yüksekse, kişiliği uygunsa ya da konuşma oraya giderse.
- Kişinin dili kuşağına, üslubuna ve ağzına uyar: gençler genç gibi, yaşlılar yaşlı gibi konuşur. Yöresel ağız tek tük, abartmadan.

KONUŞMA:
- Doğal, gündelik Türkçe. Çoğu zaman 1–3 cümle; konu gerektirirse daha uzun. Soru sorabilir, konuyu değiştirebilir, şaka yapabilir, sıkılabilir, kırılabilir, gidebilir.
- Oyuncunun söylediğine gerçekten karşılık ver: imayı, iltifatı, şakayı, pası yakala. Kişiliğine göre karşılık verir ya da geri çevirir; bir "hayır" konuşmayı bitirmek zorunda değildir.
- Oyuncunun sözlerini, düşüncelerini ya da hareketlerini asla yazma. Yapay zekâ olduğundan, oyundan ya da kurallardan asla söz etme; karakterden çıkma.
- Flört: kişinin flört tarzı, yönelimi, ilişki durumu ve oyuncuya ilgisi bağlamda yazılı. Evli ya da sevgilisi olan biri kişiliğine göre sadık kalır, takılmayla yetinir ya da (kartı ve kişiliği uygunsa) sınırı zorlar.
- Cinsellik: yetişkinler arasında sansürsüzdür. Kişiler cinsellik hakkında gerçek yetişkinler gibi açık konuşabilir: argo ve açık terimler (oral, anal, sakso, pegging gibi), cinsel geçmiş, istekler, fanteziler, açık sözlü flört, müstehcen şaka ve dedikodu serbesttir; örtmece, kaçamak ya da ahlak dersi yok. Kişi bu konulara kendi kişiliğiyle yaklaşır: rahat ve pervasız olan da, utanıp konuyu değiştiren de, ters tepki veren de olur; bu kişinin tercihidir, sansür değil. Cinsel sahnenin kendisi ayrıntılı betimlenmez: geçişle anlatılır (o gece birlikte kaldınız gibi). KESİN SINIR: 18 yaşından küçük hiç kimse hiçbir cinsel ya da romantik içeriğe dahil edilemez; ima, şaka ya da dedikodu olarak bile.
- İçerik: yetişkin bir oyun. Suç dünyası, şiddet, küfür, argo, ahlaken kötü seçimler, karanlık sırlar serbesttir. Tek sınır: gerçek dünyada uygulanabilir suç yöntemi, tarif ya da teknik ayrıntı (madde üretimi, silah yapımı, sisteme sızma adımları gibi) verilmez; kişi böyle bir şeyi ya bilmez ya da geçiştirir, sohbet insanlara ve sonuçlara odaklanır.

SONUÇLAR (dürüst ol, küçük tut):
- sonuclar: bu alışverişin ilişkiye etkisi, her biri −5 ile +5 arası (çoğu zaman 0–2).
- olaylar: yalnızca gerçekten olduysa. numara_verdi: kişi numarasını verdi. bulusmayi_kabul_etti: bir akşam buluşmayı kabul etti. kalkip_gitti: sohbeti bitirip ayrıldı. sir_anlatti: kendi sırrını anlattı. dert_anlatti / hayal_anlatti: kendi derdini / hayalini anlattı. kirildi: incindi ya da öfkelendi. iltifata_karsilik_verdi: ilgiyle karşılık verdi.
- oneriler: oyuncunun söyleyebileceği 3 kısa cevap; farklı tonlarda (örneğin içten, şakacı, cesur).`;

// Sahne: yer, saat, kalabalık, yanındakiler
function sahneMetni(durum, veri, id) {
  const dk = durum.zaman.dakika;
  const t = tarihAl(durum.zaman.baslangic, dk);
  const m = durum.konum?.mekan && durum.konum.mekan !== 'ev' ? mekanBul(veri.dunya, durum.konum.mekan) : null;
  const semt = semtBul(veri.dunya, durum.konum?.semt);
  const kal = m ? (m.kalabalik?.[dilim(dk).id] ?? 0) : 0;
  const digerleri = m ? mekandakiler(durum, veri, m, kal).filter(x => x !== id).slice(0, 4).map(x => { const n = kisi(veri, durum.seed, x); return n ? (durum.npcler?.[x]?.tanisildi !== undefined ? n.hitapAdi : gorunus(n, veri)) : null; }).filter(Boolean) : [];
  return `${tarih(t)}, saat ${saatYaz(gunDakikasi(dk))} (${dilim(dk).ad.toLocaleLowerCase('tr')}). ${m ? `${m.ad} (${semt?.ad ?? ''}); ${['bomboş', 'sakin', 'kalabalık', 'tıklım tıklım'][kal]}.` : semt?.ad ?? ''}${digerleri.length ? ' Etrafta: ' + digerleri.join(', ') + '.' : ''}`;
}

// Oyuncunun dışarıdan görünen hali (kişinin bilebileceği kadarı)
function oyuncuMetni(durum, veri, id) {
  const c = durum.karakter || {};
  const k = durum.npcler?.[id];
  const yas = c.dogum ? yasHesapla(c.dogum, tarihAl(durum.zaman.baslangic, durum.zaman.dakika)) : null;
  const g = c.fizik?.sac && veri.npc.gorunus ? fizikTarifi({ ...c, ozellikler: c.ozellikler ?? [] }, veri.npc.gorunus).split('. ').slice(0, 3).join('. ') + '.' : '';
  return `Karşındaki: ${k?.tanisildi !== undefined ? c.ad ?? 'oyuncu' : 'henüz adını bilmediğin biri'}, ${c.cinsiyet === 'k' ? 'kadın' : c.cinsiyet === 'e' ? 'erkek' : ''}${yas ? `, ${yas} yaşlarında` : ''}. ${g}`;
}

// Flört bilgisi (kişinin oyuncuya bakışı; model buna göre karşılık verir)
function flortMetni(durum, veri, id) {
  const k = durum.npcler?.[id], n = kisi(veri, durum.seed, id, k?.sablon);
  if (!flortUygun(durum, veri, n)) return 'Oyuncuyla arasında romantik bir ihtimal yok (yaş farkı ya da yaş).';
  const engel = flortEngeli(durum, veri, n);
  const ig = ilgi(durum, veri, n, k);
  const ilgiAd = ig >= 45 ? 'oyuncudan çok hoşlanıyor' : ig >= 22 ? 'oyuncudan hoşlanıyor' : ig >= 6 ? 'oyuncuya biraz ilgi duyuyor' : ig >= -10 ? 'oyuncuya romantik ilgisi yok' : 'oyuncudan hiç hoşlanmadı';
  return `${engel === 'evli' ? 'Hayatında biri var (kartta yazılı). ' : engel === 'yonelim' ? 'Oyuncunun cinsiyetine romantik ilgi duymaz. ' : ''}${ilgiAd}.`;
}

// Bu an oyunun kurallarının izin verdikleri (istekte modele söylenir, cevapta aynı kurallarla denetlenir)
function izinler(durum, veri, id) {
  const k = durum.npcler?.[id] || { iliski: {} }, n = kisi(veri, durum.seed, id, k.sablon);
  const ig = ilgi(durum, veri, n, k), engel = flortEngeli(durum, veri, n), uygun = flortUygun(durum, veri, n);
  return {
    ig, engel, uygun,
    numara: !!k.numara || uygun || (k.iliski?.yakinlik ?? 0) >= 25,
    bulusma: uygun && !engel && ig >= veri.npc.flort.esikler.davet - 15,
    flort: uygun && engel !== 'yonelim',
  };
}

function izinMetni(durum, veri, id) {
  const z = izinler(durum, veri, id);
  const evet = x => x ? 'OLABİLİR' : 'OLAMAZ';
  return [
    `Numarasını vermesi: ${evet(z.numara)}${durum.npcler?.[id]?.numara ? ' (zaten verdi)' : ''}.`,
    `Bir akşam buluşmayı kabul etmesi: ${evet(z.bulusma)}.`,
    `Flörte ilgiyle karşılık vermesi: ${evet(z.flort)}.`,
    'OLAMAZ olan bir şeyi konuşmada da yapma: kibarca geçiştir, erteler ya da reddeder.',
  ].join('\n');
}

// Bir kişiyle serbest sohbetin isteği: { sistem: [kurallar, kişi kartı], kullanici: bağlam + konuşma + oyuncunun yeni sözü }
export function istekHazirla(durum, veri, id, oyuncuSozu) {
  const kart = kisiKarti(durum, veri, id);
  const sirlar = bildigiSirlar(veri, durum.seed, id, kart.ag);
  const o = durum.sohbet || {};
  const gecmis = (o.yz || []).map(x => `${x.kim === 'oyuncu' ? 'OYUNCU' : kart.ad.toLocaleUpperCase('tr')}: ${x.metin}`).join('\n');
  const sabir = (o.kalan ?? 5) <= 1 ? '\nNOT: Kişi sıkılmaya başladı ya da gitmesi gerekiyor; birazdan sohbeti bitirmek isteyecek.' : '';
  // Kişi kartı oturum boyunca değişmez: ayrı bir sistem bloğu (önbelleğe alınır); değişenler kullanıcı mesajında
  const kartBlok = ['=== KİŞİ KARTI ===', kartMetni(kart), sirlar.length ? `Bildiği başkalarının sırları (kolay anlatmaz): ${sirlar.join(' | ')}` : null].filter(Boolean).join('\n');
  const kullanici = [
    '=== ROMANTİK DURUM ===', flortMetni(durum, veri, id),
    '=== OYUN KURALLARI (şu an) ===', izinMetni(durum, veri, id),
    '=== HAFIZA (oyuncuyla) ===', hafizaMetni(durum, veri, id),
    '=== SAHNE ===', sahneMetni(durum, veri, id), oyuncuMetni(durum, veri, id),
    '=== KONUŞMA ===', gecmis || '(Yeni oturdunuz.)',
    `OYUNCU: ${oyuncuSozu}${sabir}`,
    `\n${kart.ad} olarak cevap ver.`,
  ].filter(Boolean).join('\n');
  return { sistem: [SISTEM, kartBlok], kullanici, ad: kart.ad };
}

const sinirla = (x, a = -5, b = 5) => Math.max(a, Math.min(b, Math.round(Number(x) || 0)));

// Cevabı oyuna uygular. Döner: { paragraflar, reddedilen: [...], bitti }
export function cevabiUygula(durum, veri, id, oyuncuSozu, c, { randevuKur } = {}) {
  const k = durum.npcler[id], n = kisi(veri, durum.seed, id, k.sablon);
  const p = [];
  const reddedilen = [];
  if (c.eylem?.trim()) p.push({ tur: 'anlati', metin: c.eylem.trim() });
  if (c.konusma?.trim()) p.push({ tur: 'konusma', konusan: n.hitapAdi, metin: c.konusma.trim() });
  // İlişki: her değer −5…+5
  for (const ad of ['yakinlik', 'guven', 'cekim', 'gerginlik']) k.iliski[ad] = (k.iliski[ad] ?? 0) + sinirla(c.sonuclar?.[ad]);
  k.bilinen ??= {};
  // Olaylar oyunun kurallarıyla
  const z = izinler(durum, veri, id);
  let bitti = false;
  for (const e of new Set(c.olaylar || [])) {
    if (e === 'numara_verdi') {
      if (!z.numara) { reddedilen.push('numara: ilişki yeterince yakın değil'); continue; }
      if (!k.numara) { k.numara = true; k.anilar.push({ zaman: durum.zaman.dakika, metin: 'numarasını verdi' }); p.push({ tur: 'sistem', metin: `${n.hitapAdi} numarasını verdi` }); }
    } else if (e === 'bulusmayi_kabul_etti') {
      if (!z.bulusma) { reddedilen.push(`buluşma: kurallar izin vermiyor (ilgi ${Math.round(z.ig)}${z.engel ? ', ' + z.engel : ''})`); continue; }
      if (randevuKur && !(k.randevu >= gunNo(durum.zaman.dakika))) { randevuKur(durum, veri, id, n, k); p.push({ tur: 'sistem', metin: `Yarın akşam ${n.hitapAdi} ile buluşacaksın` }); }
    } else if (e === 'kalkip_gitti') bitti = true;
    else if (e === 'sir_anlatti') { k.bilinen.sir = true; k.anilar.push({ zaman: durum.zaman.dakika, metin: 'sana sırrını anlattı' }); }
    else if (e === 'dert_anlatti') k.bilinen.dert = true;
    else if (e === 'hayal_anlatti') k.bilinen.hayal = true;
    else if (e === 'kirildi') k.iliski.gerginlik = (k.iliski.gerginlik ?? 0) + 1;
    else if (e === 'iltifata_karsilik_verdi') {
      if (!z.flort) { reddedilen.push('flört karşılığı: uygun değil'); continue; }
      k.iliski.cekim = (k.iliski.cekim ?? 0) + 1;
    }
  }
  // Yeni olgular: kendisi ya da tanıdıkları hakkında (olgu kilidinden geçer)
  for (const o of c.olgular || []) {
    let hedef = id;
    if (o.hakkinda && !['kendi', 'kendisi', n.hitapAdi, n.ad].includes(o.hakkinda)) {
      const t = kisiKarti(durum, veri, id).ag.find(x => x.ad === o.hakkinda);
      if (!t) { reddedilen.push(`olgu: '${o.hakkinda}' tanıdıkları arasında yok`); continue; }
      hedef = t.id;
    }
    const s = olguEkle(durum, veri, hedef, { alan: o.alan, deger: o.deger, metin: o.metin }, id);
    if (!s.tamam) reddedilen.push(`olgu reddedildi (${o.alan}): ${s.sebep}`);
  }
  // Hafıza: oyuncunun açıkladıkları ve bu alışverişin özeti
  for (const x of c.oyuncuHakkinda || []) ozetEkle(durum, id, `Oyuncu kendisi hakkında: ${x}`);
  if (c.ozet) ozetEkle(durum, id, c.ozet);
  // Konuşma geçmişi (oturum içinde) ve öneriler
  const o = durum.sohbet;
  if (o) {
    o.yz = [...(o.yz || []), { kim: 'oyuncu', metin: oyuncuSozu }, { kim: 'npc', metin: [c.eylem, c.konusma].filter(Boolean).join(' ') }].slice(-24);
    o.oneriler = (c.oneriler || []).filter(x => typeof x === 'string' && x.trim()).slice(0, 3);
    o.kalan = (o.kalan ?? 5) - 0.5;
  }
  k.sohbet = (k.sohbet ?? 0) + 1;
  if (bitti) { p.push({ tur: 'sistem', metin: `${n.hitapAdi} sohbeti bitiriyor.` }); oturumBitir(durum); }
  return { paragraflar: p, reddedilen, bitti };
}

// Gelen JSON metnini çözer ve şemaya kabaca uydurur (eksik alan → boş)
export function cevabiCoz(metin) {
  let c;
  const s = String(metin ?? ''), bas = s.indexOf('{'), son = s.lastIndexOf('}');
  try { c = JSON.parse(bas >= 0 && son > bas ? s.slice(bas, son + 1) : s); } catch { return null; }
  if (!c || typeof c !== 'object') return null;
  return {
    eylem: typeof c.eylem === 'string' ? c.eylem : '',
    konusma: typeof c.konusma === 'string' ? c.konusma : '',
    sonuclar: c.sonuclar && typeof c.sonuclar === 'object' ? c.sonuclar : {},
    olaylar: Array.isArray(c.olaylar) ? c.olaylar.filter(x => OLAYLAR.includes(x)) : [],
    olgular: Array.isArray(c.olgular) ? c.olgular.filter(x => x && ALANLAR.includes(x.alan)) : [],
    oyuncuHakkinda: Array.isArray(c.oyuncuHakkinda) ? c.oyuncuHakkinda.filter(x => typeof x === 'string') : [],
    ozet: typeof c.ozet === 'string' ? c.ozet : '',
    oneriler: Array.isArray(c.oneriler) ? c.oneriler.filter(x => typeof x === 'string') : [],
  };
}
