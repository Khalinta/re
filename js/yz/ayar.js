// Yapay zekâ sohbeti ayarları ve harcama sayacı (adım 3.9). SDK'yı yüklemez: uygulama açılışında hafif kalsın.
// Anahtar yalnızca bu cihazda (localStorage); oyun kaydına ve kayıt koduna girmez.
import { VARSAYILAN_MODEL, SAGLAYICILAR, MODELLER, maliyet } from '../core/yz.js';

const AYAR = 'yeniden.yz';
const HARCAMA = 'yeniden.yz.harcama';

const oku = (anahtar, vars) => { try { return { ...vars, ...JSON.parse(localStorage.getItem(anahtar) || '{}') }; } catch { return { ...vars }; } };
const yaz = (anahtar, deger) => { try { localStorage.setItem(anahtar, JSON.stringify(deger)); } catch { /* yazılamadı */ } };

// anahtar/model: Claude'unki; gAnahtar/gModel: Gemini'ninki (iki anahtar ayrı ayrı saklanır, sağlayıcı değiştirince kaybolmaz)
export const ayarlar = () => oku(AYAR, { saglayici: 'claude', anahtar: '', model: VARSAYILAN_MODEL, gAnahtar: '', gModel: SAGLAYICILAR.gemini.varsayilan, acik: true, taban: '' });
export function ayarDegistir(degisim) { yaz(AYAR, { ...ayarlar(), ...degisim }); }

// Şu an kullanılan sağlayıcı, anahtarı ve modeli
export function etkin() {
  const a = ayarlar();
  const saglayici = SAGLAYICILAR[a.saglayici] ? a.saglayici : 'claude';
  const g = saglayici === 'gemini';
  let model = g ? a.gModel : a.model;
  if (!MODELLER.some(m => m.id === model && m.saglayici === saglayici)) model = SAGLAYICILAR[saglayici].varsayilan;
  return { saglayici, anahtar: g ? a.gAnahtar : a.anahtar, model, taban: a.taban, acik: a.acik };
}

// Serbest sohbet şu an kullanılabilir mi?
export function hazirMi() {
  const a = etkin();
  return !!(a.acik && a.anahtar && (typeof navigator === 'undefined' || navigator.onLine !== false));
}

// Bu ayki harcama ($) ve istek sayısı
export function harcama() {
  const ay = new Date().toISOString().slice(0, 7);
  const h = oku(HARCAMA, { ay, toplam: 0, istek: 0, sonGirdi: 0, sonCikti: 0 });
  return h.ay === ay ? h : { ay, toplam: 0, istek: 0, sonGirdi: 0, sonCikti: 0 };
}
export function harcamaEkle(model, usage) {
  const h = harcama();
  h.toplam += maliyet(model, usage);
  h.istek += 1;
  h.sonGirdi = (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);
  h.sonCikti = usage.output_tokens ?? 0;
  yaz(HARCAMA, h);
}

