// Henüz yapılmamış sekmeler için yer tutucu ekranlar: Telefon, Şehir, Hayatım.
// Her satır dokununca hangi fazda geleceğini söyler.
import { h } from '../dom.js';
import { IKON } from '../ikonlar.js';
import { bilgiGoster } from '../panel.js';

function liste(baslik, aciklama, satirlar) {
  return {
    olustur(kap) {
      kap.append(h('div', { class: 'sayfa-kaydir' },
        h('div', { class: 'sayfa-ust' }, h('h1', {}, baslik), h('p', { class: 'soluk' }, aciklama)),
        h('div', { class: 'kart-liste' }, satirlar.map(([ad, alt, faz]) =>
          h('button', { class: 'satir', onclick: () => bilgiGoster(ad, `${alt}\n\nBu bölüm ${faz} içinde geliyor.`) },
            h('span', { class: 'satir-metin' }, h('span', {}, ad), h('span', { class: 'satir-alt' }, alt)),
            h('span', { class: 'satir-ok', html: IKON.ok }))))));
    },
  };
}

export const telefonEkrani = liste('Telefon', 'Rehber, mesajlar ve şehrin dedikodusu cebinde.', [
  ['Mesajlar', 'Tanıdıklar kendiliğinden de yazar.', 'Faz 4'],
  ['Rehber', 'Tanıştığın herkes, ilişkinle birlikte.', 'Faz 4'],
  ['Aramalar', 'Gelen, giden, cevapsız.', 'Faz 4'],
  ['Akış', 'Tanıdıkların paylaşımları.', 'Faz 4'],
  ['Haberler', 'Şehirde olup bitenler; içinde fırsatlar da saklı.', 'Faz 2 ve Faz 4'],
  ['Banka', 'Hesap, kart, kredi, borçlar.', 'Faz 4'],
]);

export const sehirEkrani = liste('Şehir', 'Nereye gideceğine sen karar verirsin.', [
  ['Semtler', 'Her birinin kendi karakteri, kirası, insanı.', 'Faz 2'],
  ['Mekanlar', 'Kahvehaneler, lokantalar, atölyeler, barlar.', 'Faz 2'],
  ['Ulaşım', 'Hatlar, duraklar, süreler, ücretler.', 'Faz 2'],
  ['İş ilanları', 'Kapılar zor açılır ama açılır.', 'Faz 4'],
]);

export const hayatimEkrani = liste('Hayatım', 'Kim olduğun, neyin olduğu, kimin olduğu.', [
  ['Karakter', 'Geçmişin, güçlü yanların, kusurların.', 'Faz 3'],
  ['Beceriler', 'Kullandıkça gelişir.', 'Faz 4'],
  ['Envanter', 'Elinde kalanlar.', 'Faz 4'],
  ['İlişkiler', 'Yakınlık, güven, saygı, çekim, gerginlik.', 'Faz 4'],
  ['Günlük', 'Hayatının kendi ağzından kaydı.', 'Faz 6'],
]);
