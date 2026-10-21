// Gemini istemcisi (3.9 eki): istek biçimi ve hata eşlemesi — ağ taklit edilir
import test from 'node:test';
import assert from 'node:assert/strict';

const depo = new Map();
globalThis.localStorage = { getItem: k => depo.get(k) ?? null, setItem: (k, v) => depo.set(k, String(v)), removeItem: k => depo.delete(k) };
const { ayarDegistir, etkin, hazirMi, harcama } = await import('../js/yz/ayar.js');
const { sohbetIstegi, baglantiDene } = await import('../js/yz/istemci.js');
const { CEVAP_SEMASI } = await import('../js/core/yz.js');

const cevap = { eylem: 'Gülüyor.', konusma: 'Olur, neden olmasın?', sonuclar: { yakinlik: 1, guven: 0, cekim: 1, gerginlik: 0 }, olaylar: [], olgular: [], oyuncuHakkinda: [], ozet: 'Takıldılar.', oneriler: ['a', 'b', 'c'] };
let istekler = [];
function sahte(...yanitlar) {
  istekler = [];
  globalThis.fetch = async (url, o) => {
    istekler.push({ url, o, govde: JSON.parse(o.body) });
    const y = yanitlar.shift();
    if (y === 'ag') throw new TypeError('Failed to fetch');
    return { ok: y.durum === 200, status: y.durum, json: async () => y.govde };
  };
}
const basarili = metin => ({ durum: 200, govde: { candidates: [{ content: { parts: [{ text: 'düşünce', thought: true }, { text: metin }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 4000, candidatesTokenCount: 300 }, modelVersion: 'gemini-x' } });
const istek = { sistem: ['KURALLAR', 'KART'], kullanici: 'OYUNCU: selam' };

test('ayar: iki sağlayıcının anahtarı ayrı tutulur; etkin olan seçilene göre', () => {
  ayarDegistir({ anahtar: 'sk-ant-1', gAnahtar: '', saglayici: 'gemini' });
  assert.equal(hazirMi(), false, 'gemini anahtarı yokken hazır değil');
  ayarDegistir({ gAnahtar: 'AIza-test' });
  assert.deepEqual([etkin().saglayici, etkin().anahtar, etkin().model], ['gemini', 'AIza-test', 'gemini-flash-latest']);
  ayarDegistir({ gModel: 'claude-opus-5-5' });
  assert.equal(etkin().model, 'gemini-flash-latest', 'başka sağlayıcının modeli seçilemez');
  ayarDegistir({ saglayici: 'claude' });
  assert.equal(etkin().anahtar, 'sk-ant-1');
  ayarDegistir({ saglayici: 'gemini' });
});

test('istek biçimi: anahtar başlıkta, sistem metni, JSON şeması, gevşek güvenlik; düşünce bölümleri atlanır; ücret 0', async () => {
  sahte(basarili('```json\n' + JSON.stringify(cevap) + '\n```'));
  const r = await sohbetIstegi(istek);
  assert.equal(r.cevap.konusma, 'Olur, neden olmasın?');
  const { url, o, govde } = istekler[0];
  assert.match(url, /\/v1beta\/models\/gemini-flash-latest:generateContent$/);
  assert.equal(o.headers['x-goog-api-key'], 'AIza-test');
  assert.ok(!url.includes('AIza'), 'anahtar adreste değil');
  assert.deepEqual(govde.systemInstruction.parts.map(p => p.text), ['KURALLAR', 'KART']);
  assert.deepEqual(govde.generationConfig.responseJsonSchema, CEVAP_SEMASI);
  assert.ok(govde.safetySettings.some(s => s.category === 'HARM_CATEGORY_SEXUALLY_EXPLICIT' && s.threshold === 'BLOCK_NONE'));
  assert.equal(harcama().toplam, 0);
  assert.ok(harcama().istek >= 1);
});

test('şemayı kabul etmeyen model: şema metinle verilip yeniden denenir', async () => {
  sahte({ durum: 400, govde: { error: { message: 'Invalid JSON payload: responseJsonSchema not supported', status: 'INVALID_ARGUMENT' } } }, basarili(JSON.stringify(cevap)));
  const r = await sohbetIstegi(istek);
  assert.ok(r.cevap);
  assert.equal(istekler.length, 2);
  assert.ok(!istekler[1].govde.generationConfig.responseJsonSchema && istekler[1].govde.contents[0].parts[0].text.includes('JSON şemasına'));
});

test('hatalar: sınır, anahtar, ağ, engelleme, yarım cevap', async () => {
  sahte({ durum: 429, govde: { error: { message: 'quota', status: 'RESOURCE_EXHAUSTED' } } });
  assert.equal((await sohbetIstegi(istek)).hata, 'sinir');
  sahte({ durum: 400, govde: { error: { message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } } });
  assert.equal((await sohbetIstegi(istek)).hata, 'anahtar');
  sahte('ag');
  assert.equal((await sohbetIstegi(istek)).hata, 'ag');
  sahte({ durum: 200, govde: { promptFeedback: { blockReason: 'PROHIBITED_CONTENT' } } });
  assert.equal((await sohbetIstegi(istek)).hata, 'ret');
  sahte({ durum: 200, govde: { candidates: [{ content: { parts: [{ text: '{"konusma": "yar' }] }, finishReason: 'MAX_TOKENS' }] } });
  const y = await sohbetIstegi(istek);
  assert.equal(y.hata, 'bicim');
  assert.match(y.mesaj, /yarım/);
  sahte(basarili('tamam'));
  assert.equal((await baglantiDene()).tamam, true);
});
