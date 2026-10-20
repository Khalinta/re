// Tarayıcı depoları: IndexedDB (ana) ve localStorage (yansı). KayitDeposu bunları kullanır.
// IndexedDB açılamazsa (bazı gizli sekmeler) yedekleri de localStorage'da tutan bir ana depo kullanılır.

const DB_ADI = 'yeniden';
const DB_SURUMU = 1;
const LS_YUVA = n => `yeniden.kayit.${n}`;
const LS_YEDEK = n => `yeniden.yedek.${n}`;

function istek(r) {
  return new Promise((coz, red) => { r.onsuccess = () => coz(r.result); r.onerror = () => red(r.error); });
}

function islemBitti(tx) {
  return new Promise((coz, red) => {
    tx.oncomplete = () => coz();
    tx.onerror = () => red(tx.error || new Error('IndexedDB işlemi başarısız'));
    tx.onabort = () => red(tx.error || new Error('IndexedDB işlemi iptal edildi'));
  });
}

export async function idbAc() {
  if (!('indexedDB' in globalThis)) throw new Error('IndexedDB yok');
  const r = indexedDB.open(DB_ADI, DB_SURUMU);
  r.onupgradeneeded = () => {
    const db = r.result;
    if (!db.objectStoreNames.contains('yuvalar')) db.createObjectStore('yuvalar');
    if (!db.objectStoreNames.contains('yedekler')) {
      const s = db.createObjectStore('yedekler', { keyPath: 'id', autoIncrement: true });
      s.createIndex('yuva', 'yuva');
    }
  };
  const db = await new Promise((coz, red) => {
    r.onsuccess = () => coz(r.result);
    r.onerror = () => red(r.error);
    r.onblocked = () => red(new Error('IndexedDB başka bir sekme tarafından kilitli'));
    setTimeout(() => red(new Error('IndexedDB açılırken zaman aşımı')), 5000);
  });
  // Başka bir sekme yeni sürüm açarsa bağlantıyı bırak (sonraki işlemde yeniden açılır)
  db.onversionchange = () => db.close();
  return db;
}

export class IdbDepo {
  constructor(db) { this.db = db; }
  #tx(depo, mod = 'readonly') {
    // durability: 'strict' — yazma diske gerçekten inmeden "tamam" denmesin (destekleyen tarayıcılarda)
    try { return this.db.transaction(depo, mod, { durability: 'strict' }); } catch { return this.db.transaction(depo, mod); }
  }
  async yuvaAl(n) { return (await istek(this.#tx('yuvalar').objectStore('yuvalar').get(n))) ?? null; }
  async yuvaYaz(n, zarf) { const tx = this.#tx('yuvalar', 'readwrite'); tx.objectStore('yuvalar').put(zarf, n); await islemBitti(tx); }
  async yuvaSil(n) { const tx = this.#tx('yuvalar', 'readwrite'); tx.objectStore('yuvalar').delete(n); await islemBitti(tx); }
  async yedekEkle(n, zarf) {
    const tx = this.#tx('yedekler', 'readwrite');
    const r = tx.objectStore('yedekler').add({ yuva: n, zarf });
    await islemBitti(tx);
    return r.result;
  }
  async yedekler(n) { return istek(this.#tx('yedekler').objectStore('yedekler').index('yuva').getAll(n)); }
  async yedekSil(id) { const tx = this.#tx('yedekler', 'readwrite'); tx.objectStore('yedekler').delete(id); await islemBitti(tx); }
}

// localStorage yansısı: sadece yuvanın son hali
export class LsDepo {
  yuvaAl(n) {
    const ham = localStorage.getItem(LS_YUVA(n));
    if (ham === null) return null;
    try { return JSON.parse(ham); } catch { return ham; } // bozuksa ham metni ver; zarfAc reddeder
  }
  yuvaYaz(n, zarf) { localStorage.setItem(LS_YUVA(n), JSON.stringify(zarf)); }
  yuvaSil(n) { localStorage.removeItem(LS_YUVA(n)); }
}

// IndexedDB yoksa ana depo: yuva + yedekler localStorage'da
export class LsTamDepo extends LsDepo {
  constructor() { super(); this.yuvaOnEki = 'yeniden.lsana.'; }
  yuvaAl(n) { const h = localStorage.getItem(this.yuvaOnEki + n); if (h === null) return null; try { return JSON.parse(h); } catch { return h; } }
  yuvaYaz(n, z) { localStorage.setItem(this.yuvaOnEki + n, JSON.stringify(z)); }
  yuvaSil(n) { localStorage.removeItem(this.yuvaOnEki + n); }
  #liste(n) { try { return JSON.parse(localStorage.getItem(LS_YEDEK(n)) || '[]'); } catch { return []; } }
  yedekEkle(n, zarf) {
    const l = this.#liste(n);
    const id = Date.now() * 10 + l.length;
    l.push({ id, yuva: n, zarf });
    localStorage.setItem(LS_YEDEK(n), JSON.stringify(l));
    return id;
  }
  yedekler(n) { return this.#liste(n); }
  yedekSil(id) {
    for (let n = 1; n <= 3; n++) {
      const l = this.#liste(n);
      const y = l.filter(x => x.id !== id);
      if (y.length !== l.length) localStorage.setItem(LS_YEDEK(n), JSON.stringify(y));
    }
  }
}

// Kalıcı depolama: tarayıcıdan, yer darlığında bu sitenin verisini silmemesini ister.
export async function kaliciDurum() {
  const s = navigator.storage;
  if (!s?.persisted) return { destek: false, kalici: false };
  return { destek: true, kalici: await s.persisted() };
}

export async function kaliciIste() {
  const s = navigator.storage;
  if (!s?.persist) return { destek: false, kalici: false };
  try { return { destek: true, kalici: await s.persist() }; } catch { return { destek: true, kalici: false }; }
}

export async function alanBilgisi() {
  try { return await navigator.storage?.estimate?.() ?? null; } catch { return null; }
}
