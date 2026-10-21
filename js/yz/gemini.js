// Google Gemini istemcisi (3.9 eki): tarayıcıdan doğrudan REST (generateContent), kullanıcının kendi anahtarıyla.
// Ücretsiz katmanda dakikalık/günlük istek sınırı var; aşılınca 'sinir' hatası döner, oyun yazılı sohbete düşmez, bekletir.
// Güvenlik filtreleri en gevşek düzeyde (BLOCK_NONE): içerik kuralları sistem metninde (yetişkin içerik serbest;
// 18 yaş altı ve gerçek dünyada uygulanabilir suç yöntemi kesin yasak). Google kendi tarafında yine de engelleyebilir.
// Doğrudan değil, istemci.js üzerinden çağrılır.
import { CEVAP_SEMASI, cevabiCoz } from '../core/yz.js';
import { etkin, harcamaEkle } from './ayar.js';

const TABAN = 'https://generativelanguage.googleapis.com';
const GUVENLIK = ['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT']
  .map(category => ({ category, threshold: 'BLOCK_NONE' }));

// Tek istek. Döner: { yanit } ya da { hata, mesaj, durum }
async function iste(govde) {
  const a = etkin();
  let r;
  try {
    r = await fetch(`${a.taban || TABAN}/v1beta/models/${encodeURIComponent(a.model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': a.anahtar },
      body: JSON.stringify(govde),
      signal: globalThis.AbortSignal?.timeout?.(60000),
    });
  } catch {
    return { hata: 'ag', mesaj: 'Bağlantı kurulamadı (internet?).' };
  }
  let j = null;
  try { j = await r.json(); } catch { /* gövde yok */ }
  if (r.ok) return { yanit: j ?? {}, model: a.model };
  const m = j?.error?.message ?? '';
  const durum = j?.error?.status ?? '';
  if (r.status === 429 || durum === 'RESOURCE_EXHAUSTED') return { hata: 'sinir', mesaj: 'Ücretsiz kullanım sınırı doldu; bir dakika bekle (günlük sınır dolduysa yarın).' };
  if (r.status === 401 || r.status === 403 || /api key/i.test(m)) return { hata: 'anahtar', mesaj: 'Gemini anahtarı geçersiz ya da yetkisiz.' };
  if (r.status === 404) return { hata: 'diger', mesaj: `Model bulunamadı (${a.model}); Ayarlar'dan başka bir Gemini modeli seç.` };
  return { hata: 'diger', mesaj: `Hata ${r.status}: ${m.slice(0, 200)}`, durum: r.status, ham: m };
}

const metniAl = y => (y.candidates?.[0]?.content?.parts || []).filter(p => !p.thought && typeof p.text === 'string').map(p => p.text).join('');
const harca = (y, model) => {
  const u = y.usageMetadata;
  if (u) harcamaEkle(model, { input_tokens: u.promptTokenCount ?? 0, output_tokens: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0) });
};

export async function sohbetIstegi({ sistem, kullanici }) {
  const govde = {
    systemInstruction: { parts: sistem.map(text => ({ text })) },
    contents: [{ role: 'user', parts: [{ text: kullanici }] }],
    generationConfig: { responseMimeType: 'application/json', responseJsonSchema: CEVAP_SEMASI, maxOutputTokens: 8192 },
    safetySettings: GUVENLIK,
  };
  let s = await iste(govde);
  // Model şemayı kabul etmezse (eski/küçük model): şemayı metinle ver, JSON yine zorunlu
  if (s.hata && s.durum === 400 && /schema/i.test(s.ham ?? '')) {
    delete govde.generationConfig.responseJsonSchema;
    govde.contents[0].parts[0].text += `\n\nCevabı yalnızca şu JSON şemasına uyan tek bir JSON nesnesi olarak ver:\n${JSON.stringify(CEVAP_SEMASI)}`;
    s = await iste(govde);
  }
  if (s.hata) return { hata: s.hata, mesaj: s.mesaj };
  const y = s.yanit;
  harca(y, s.model);
  if (y.promptFeedback?.blockReason) return { hata: 'ret', mesaj: 'Google bu konuşmayı engelledi.' };
  const bitis = y.candidates?.[0]?.finishReason;
  if (['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII'].includes(bitis)) return { hata: 'ret', mesaj: 'Google bu cevabı engelledi; başka türlü söylemeyi dene.' };
  const cevap = cevabiCoz(metniAl(y));
  if (!cevap || !cevap.konusma) return { hata: 'bicim', mesaj: bitis === 'MAX_TOKENS' ? 'Cevap yarım kaldı.' : 'Cevap okunamadı.' };
  return { cevap, model: y.modelVersion ?? s.model };
}

// Ayarlar ekranındaki "Bağlantıyı dene"
export async function baglantiDene() {
  const s = await iste({ contents: [{ role: 'user', parts: [{ text: 'Tek kelimeyle "tamam" yaz.' }] }], generationConfig: { maxOutputTokens: 200 } });
  if (s.hata) return { tamam: false, mesaj: s.mesaj };
  harca(s.yanit, s.model);
  return { tamam: true, model: s.yanit.modelVersion ?? s.model };
}
