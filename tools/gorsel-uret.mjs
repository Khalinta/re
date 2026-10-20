// Geliştirici aracı: icons/ikon.svg'den PNG ikonları ve iPhone açılış ekranlarını üretir.
// Çalıştırma: NODE_PATH=$(npm root -g) node tools/gorsel-uret.mjs   (Playwright + Chromium gerekir; oyun bunu kullanmaz)
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const svg = readFileSync(new URL('../icons/ikon.svg', import.meta.url), 'utf8');
const ARKA = '#1b1916';

// [genişlik, yükseklik, css genişlik, css yükseklik, piksel oranı]
export const ACILIS_EKRANLARI = [
  [1320, 2868, 440, 956, 3], [1206, 2622, 402, 874, 3], [1290, 2796, 430, 932, 3],
  [1179, 2556, 393, 852, 3], [1284, 2778, 428, 926, 3], [1170, 2532, 390, 844, 3],
  [1125, 2436, 375, 812, 3], [1242, 2688, 414, 896, 3], [828, 1792, 414, 896, 2],
  [1242, 2208, 414, 736, 3], [750, 1334, 375, 667, 2],
];

const tarayici = await chromium.launch();
const sayfa = await tarayici.newPage();

async function ciz(gen, yuk, html, dosya) {
  await sayfa.setViewportSize({ width: gen, height: yuk });
  await sayfa.setContent(`<html><body style="margin:0;background:${ARKA};width:${gen}px;height:${yuk}px;overflow:hidden">${html}</body></html>`);
  writeFileSync(new URL('../icons/' + dosya, import.meta.url), await sayfa.screenshot({ type: 'png' }));
  console.log('icons/' + dosya);
}

const tam = b => `<div style="width:${b}px;height:${b}px">${svg.replace('<svg ', `<svg width="${b}" height="${b}" `)}</div>`;
// Maskelenebilir ikon: içerik ortadaki %70'lik güvenli alanda
const maskeli = b => `<div style="width:${b}px;height:${b}px;display:grid;place-items:center">${svg.replace('<svg ', `<svg width="${Math.round(b * 0.78)}" height="${Math.round(b * 0.78)}" `)}</div>`;

await ciz(180, 180, tam(180), 'apple-touch-icon.png');
await ciz(192, 192, tam(192), 'ikon-192.png');
await ciz(512, 512, tam(512), 'ikon-512.png');
await ciz(512, 512, maskeli(512), 'ikon-maskeli-512.png');
await ciz(32, 32, tam(32), 'favicon-32.png');

for (const [g, y] of ACILIS_EKRANLARI) {
  const b = Math.round(g * 0.42);
  await ciz(g, y, `<div style="width:100%;height:100%;display:grid;place-items:center"><div style="margin-top:-${Math.round(y * 0.06)}px">${svg.replace('<svg ', `<svg width="${b}" height="${b}" `).replace('<rect width="512" height="512" fill="#1b1916"/>', '')}</div></div>`, `acilis-${g}x${y}.png`);
}

await tarayici.close();
