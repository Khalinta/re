// Hata raporu: kullanıcının tek tıkla kopyalayıp geliştiriciye yapıştıracağı metin.
// Saf fonksiyon: tüm girdiler dışarıdan verilir (tarayıcı bilgisi, durum, hatalar, kayıt kodu).
import { tarihAl, gunNo, dilim } from './zaman.js';
import { saat, tarih, para } from './format.js';

const RAPOR_ONEKI = '=== YENİDEN HATA RAPORU ===';

function zamanYaz(d, dk) {
  if (!d?.zaman?.baslangic || typeof dk !== 'number') return String(dk);
  const t = tarihAl(d.zaman.baslangic, dk);
  return `${gunNo(dk) + 1}.gün ${tarih(t, { gunAdi: false, yil: false })} ${saat(dk)}`;
}

function kisalt(s, n) {
  s = String(s ?? '');
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// girdi = { oyunSurumu, kayitSurumu, cihaz: {...}, durum, hatalar: [...], kayitHatalari: [...], kod, olusturma: Date }
export function raporOlustur(g) {
  const d = g.durum;
  const satirlar = [RAPOR_ONEKI];
  const ekle = (...x) => satirlar.push(...x);
  ekle(`Oluşturma: ${(g.olusturma || new Date()).toISOString()}`);
  ekle(`Oyun sürümü: ${g.oyunSurumu} · Kayıt sürümü: ${d?.kayitSurumu ?? g.kayitSurumu ?? '?'} · Seed: ${d?.seed ?? '(oyun yok)'}`);

  ekle('', '--- Cihaz ---');
  for (const [k, v] of Object.entries(g.cihaz || {})) ekle(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);

  ekle('', `--- Hatalar (${(g.hatalar || []).length}) ---`);
  if (!(g.hatalar || []).length) ekle('(yok)');
  for (const [i, h] of (g.hatalar || []).entries()) {
    ekle(`#${i + 1} [${h.zaman}] ${h.ciddi ? 'CİDDİ ' : ''}${h.tur || 'hata'}${h.kaynak ? ' @' + h.kaynak : ''}: ${h.mesaj}`);
    if (h.oyunZamani !== undefined && d) ekle(`   oyun zamanı: ${zamanYaz(d, h.oyunZamani)}`);
    if (h.yigin) ekle(...String(h.yigin).split('\n').slice(0, 15).map(s => '   ' + s.trim()));
  }
  if ((g.kayitHatalari || []).length) {
    ekle('', `--- Kayıt sistemi uyarıları (${g.kayitHatalari.length}) ---`);
    for (const h of g.kayitHatalari) ekle(`[${h.zaman}] ${h.mesaj}: ${h.hata}`);
  }

  if (d) {
    ekle('', '--- Durum özeti ---');
    ekle(`Zaman: ${zamanYaz(d, d.zaman.dakika)} (${dilim(d.zaman.dakika).ad}) · başlangıç ${d.zaman.baslangic}`);
    ekle(`Karakter: ${d.karakter?.ad ?? '?'} · Para: ${para(d.para)}`);
    if (d.konum) ekle(`Konum: ${d.konum.semt} / ${d.konum.mekan ?? 'sokak'} · ev: ${d.ev?.semt ?? '?'}`);
    ekle('Durumlar: ' + Object.entries(d.durumlar || {}).map(([k, v]) => `${k} ${Math.round(v)}`).join(', '));
    const beceri = Object.entries(d.beceriler || {});
    if (beceri.length) ekle('Beceriler: ' + beceri.map(([k, v]) => `${k} ${Math.round(v * 10) / 10}`).join(', '));
    ekle(`Etkin olay: ${d.aktifOlay ? `${d.aktifOlay.id} / ${d.aktifOlay.sahne}` : 'yok'}`);
    const b = d.bayraklar || {};
    ekle(`Bayraklar: kalıcı ${Object.keys(b.kalici || {}).join(', ') || '-'} | süreli ${Object.keys(b.sureli || {}).join(', ') || '-'} | NPC ${Object.keys(b.npc || {}).length}`);
    if ((d.zamanlayicilar || []).length) ekle('Zamanlayıcılar: ' + d.zamanlayicilar.map(z => `${z.olay}@${zamanYaz(d, z.zaman)}`).join(', '));
    const yay = Object.entries(d.yaylar || {});
    if (yay.length) ekle('Yaylar: ' + yay.map(([k, y]) => `${k}=${y.bitti ? 'bitti:' + y.bitti.sonuc : y.asama}`).join(', '));
    if (d.suc) ekle('Suç: ' + JSON.stringify(d.suc));
    ekle(`Olay geçmişi: ${Object.entries(d.olayGecmisi || {}).map(([k, v]) => `${k}×${v.kez}`).join(', ') || '-'}`);

    const ak = d.aksiyonGecmisi || [];
    ekle('', `--- Son ${Math.min(50, ak.length)} hamle ---`);
    for (const a of ak.slice(-50)) ekle(`${zamanYaz(d, a.z)}  ${a.id}${a.a ? ' ' + JSON.stringify(a.a) : ''}`);

    const an = d.anlatim || [];
    ekle('', '--- Son anlatım ---');
    for (const p of an.slice(-8)) ekle(`[${p.tur}] ${kisalt(p.metin, 160)}`);
  }

  if (g.kod) {
    ekle('', '--- Kayıt kodu (sorunu birebir yeniden oluşturmak için) ---', g.kod);
  }
  ekle('=== RAPOR SONU ===');
  return satirlar.join('\n');
}
