// Geliştirici aracı: sw.js içindeki önbellek listesini ve sürümünü günceller.
// Her dosya değişikliğinden sonra çalıştır:  node tools/sw-liste.mjs
// (tests/sw.test.js liste güncel değilse başarısız olur.)
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = fileURLToPath(new URL('..', import.meta.url));
const KLASORLER = ['css', 'js', 'data', 'icons'];
const KOK_DOSYALAR = ['index.html', 'manifest.webmanifest'];

function tara(klasor) {
  const sonuc = [];
  let girdiler;
  try { girdiler = readdirSync(join(KOK, klasor)); } catch { return sonuc; }
  for (const ad of girdiler) {
    if (ad.startsWith('.')) continue;
    const yol = join(klasor, ad);
    if (statSync(join(KOK, yol)).isDirectory()) sonuc.push(...tara(yol));
    else sonuc.push(yol.split('\\').join('/'));
  }
  return sonuc;
}

export function listeUret() {
  const dosyalar = [...KOK_DOSYALAR, ...KLASORLER.flatMap(tara)]
    .filter(d => !d.endsWith('.svg') || d === 'icons/ikon.svg')
    .sort();
  const ozet = createHash('sha256');
  for (const d of dosyalar) { ozet.update(d); ozet.update(readFileSync(join(KOK, d))); }
  const surum = 'yeniden-' + ozet.digest('hex').slice(0, 12);
  const govde = `// <otomatik>\nconst ONBELLEK_SURUMU = '${surum}';\nconst DOSYALAR = [\n  './',\n${dosyalar.map(d => `  './${d}',`).join('\n')}\n];\n// </otomatik>`;
  return govde;
}

export function swIcerik() {
  const sw = readFileSync(join(KOK, 'sw.js'), 'utf8');
  return sw.replace(/\/\/ <otomatik>[\s\S]*?\/\/ <\/otomatik>/, listeUret());
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(join(KOK, 'sw.js'), swIcerik());
  console.log('sw.js güncellendi:', listeUret().match(/yeniden-\w+/)[0]);
}
