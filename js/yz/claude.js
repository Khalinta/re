// Claude API istemcisi (adım 3.9): tarayıcıdan doğrudan, kullanıcının kendi API anahtarıyla.
// Anahtar ve model seçimi yalnızca bu cihazda (localStorage) durur; oyun kaydına ve kayıt koduna girmez.
// Doğrudan değil, istemci.js üzerinden çağrılır (sağlayıcı seçimi).
// SDK: js/vendor/anthropic-sdk.mjs (@anthropic-ai/sdk 0.135.0, tek dosya; derleme adımı gerekmesin diye projede).
import Anthropic from '../vendor/anthropic-sdk.mjs';
import { CEVAP_SEMASI, cevabiCoz } from '../core/yz.js';
import { etkin, harcamaEkle } from './ayar.js';

function istemci() {
  const a = etkin();
  return { c: new Anthropic({ apiKey: a.anahtar, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 60000, ...(a.taban ? { baseURL: a.taban } : {}) }), model: a.model };
}

// Opus 5.5 ve Sonnet 5.5'te güvenlik reddine karşı sunucu tarafı yedek model (varsayılan yönlendirme)
const yedekli = model => ['claude-opus-5-5', 'claude-sonnet-5-5'].includes(model);

// Sohbet isteği. Döner: { cevap } ya da { hata: 'anahtar' | 'ag' | 'sinir' | 'ret' | 'bicim' | 'diger', mesaj }
export async function sohbetIstegi({ sistem, kullanici }) {
  const { c, model } = istemci();
  const params = {
    model,
    max_tokens: 4000,
    system: [{ type: 'text', text: sistem[0] }, { type: 'text', text: sistem[1], cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: kullanici }],
    output_config: { effort: 'low', format: { type: 'json_schema', schema: CEVAP_SEMASI } },
  };
  let yanit;
  try {
    yanit = yedekli(model)
      ? await c.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
      : await c.messages.create(params);
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return { hata: 'anahtar', mesaj: 'API anahtarı geçersiz ya da yetkisiz.' };
    if (e instanceof Anthropic.RateLimitError) return { hata: 'sinir', mesaj: 'Çok sık istek; biraz bekle.' };
    if (e instanceof Anthropic.APIConnectionError) return { hata: 'ag', mesaj: 'Bağlantı kurulamadı.' };
    if (e instanceof Anthropic.APIError) return { hata: 'diger', mesaj: `Hata ${e.status ?? ''}: ${e.message}` };
    return { hata: 'diger', mesaj: String(e?.message ?? e) };
  }
  if (yanit.usage) harcamaEkle(yanit.model ?? model, yanit.usage);
  if (yanit.stop_reason === 'refusal') return { hata: 'ret', mesaj: 'Model bu konuşmayı sürdürmedi.' };
  const metin = (yanit.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const cevap = cevabiCoz(metin);
  if (!cevap || !cevap.konusma) return { hata: 'bicim', mesaj: yanit.stop_reason === 'max_tokens' ? 'Cevap yarım kaldı.' : 'Cevap okunamadı.' };
  return { cevap, model: yanit.model ?? model };
}

// Ayarlar ekranındaki "Bağlantıyı dene"
export async function baglantiDene() {
  const { c, model } = istemci();
  try {
    const y = await c.messages.create({ model, max_tokens: 200, messages: [{ role: 'user', content: 'Tek kelimeyle "tamam" yaz.' }] });
    if (y.usage) harcamaEkle(y.model ?? model, y.usage);
    return { tamam: true, model: y.model ?? model };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { tamam: false, mesaj: 'Anahtar geçersiz.' };
    if (e instanceof Anthropic.APIConnectionError) return { tamam: false, mesaj: 'Bağlantı kurulamadı (internet?).' };
    return { tamam: false, mesaj: String(e?.message ?? e) };
  }
}
