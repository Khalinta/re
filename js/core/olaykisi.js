// Olaylarda tanıdık (3.12): bir olay "kisi" seçicisi taşıyorsa, tanıdıklarından şartı tutan biri seçilir ve olay onunla
// yaşanır (seni arar, borç ister, eve davet eder...). Seçilen kişi bağlama girer: koşul ve etkilerde "kisi",
// metinde {kisi.ad}, {kisi.hitap} (sana nasıl hitap ettiği), {kisi.dert}.
// Seçici: { "yakinlikMin", "yakinlikMax", "gerginlikMin", "numara": true, "tur": ["flort","sevgili"], "turDegil": [...],
//           "yasMin", "yasMax", "dertVar": true, "durum": [...], "medeni": [...],
//           "arzuMin", "arzuMax", "kiskanc": true (başka biriyle flörtünü duydu, henüz konuşmadınız) }  (3.14)
import { kisiGuncel } from './npchayat.js';
import { hitapSec } from './sohbet.js';
import { dertMetni } from './npc.js';

const kucukBas = s => s ? s[0].toLocaleLowerCase('tr') + s.slice(1) : s;

function tutar(durum, veri, id, k, s) {
  if (k.tanisildi === undefined || k.degisim?.yok || k.disarida) return false;
  if (durum.sohbet?.npc === id) return false;
  const y = k.iliski?.yakinlik ?? 0;
  if (s.yakinlikMin !== undefined && y < s.yakinlikMin) return false;
  if (s.yakinlikMax !== undefined && y > s.yakinlikMax) return false;
  if (s.gerginlikMin !== undefined && (k.iliski?.gerginlik ?? 0) < s.gerginlikMin) return false;
  if (s.numara && !k.numara) return false;
  if (s.tur && !s.tur.includes(k.iliskiTuru)) return false;
  if (s.turDegil && s.turDegil.includes(k.iliskiTuru)) return false;
  if (s.arzuMin !== undefined && (k.iliski?.arzu ?? 0) < s.arzuMin) return false;
  if (s.arzuMax !== undefined && (k.iliski?.arzu ?? 0) > s.arzuMax) return false;
  if (s.kiskanc && !(k.duydugu && !k.duydugu.konustu)) return false;
  const n = kisiGuncel(durum, veri, id);
  if (!n || n.yok) return false;
  if (s.yasMin !== undefined && n.yas < s.yasMin) return false;
  if (s.yasMax !== undefined && n.yas > s.yasMax) return false;
  if (s.dertVar && !n.dert) return false;
  if (s.durum && !s.durum.includes(n.durum)) return false;
  if (s.medeni && !s.medeni.includes(n.medeni)) return false;
  return true;
}

// Döner: olay bağlamı ({ npc: { kisi }, degisken: { kisi } }) ya da kimse uymuyorsa null
export function olayKisisi(durum, veri, secici, rng) {
  const adaylar = Object.entries(durum.npcler || {})
    .filter(([id, k]) => tutar(durum, veri, id, k, secici))
    .map(([id, k]) => ({ id, agirlik: 1 + Math.max(0, k.iliski?.yakinlik ?? 0) / 10 }));
  if (!adaylar.length) return null;
  const id = rng.agirlikliSec(adaylar).id;
  const n = kisiGuncel(durum, veri, id);
  return {
    npc: { kisi: id },
    degisken: { kisi: { ad: n.hitapAdi, hitap: hitapSec(durum, veri, n), dert: kucukBas(dertMetni(n, veri) ?? ''), cinsiyet: n.cinsiyet } },
  };
}
