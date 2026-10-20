// Küçük DOM yardımcıları. Metinler her zaman textContent ile girer (HTML enjeksiyonu yok).

// h('button', { class: 'x', onclick: fn, dataset: { id: 1 }, 'aria-label': '...' }, 'metin', altEleman)
export function h(etiket, ozellik = {}, ...cocuklar) {
  const el = document.createElement(etiket);
  for (const [k, v] of Object.entries(ozellik || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v; // yalnızca kendi sabit içeriğimiz (ikon SVG'leri) için
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  ekle(el, cocuklar);
  return el;
}

function ekle(el, cocuklar) {
  for (const c of cocuklar.flat(Infinity)) {
    if (c === undefined || c === null || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function bosalt(el, ...cocuklar) {
  el.replaceChildren();
  ekle(el, cocuklar);
  return el;
}

export const $ = (s, kok = document) => kok.querySelector(s);
export const $$ = (s, kok = document) => [...kok.querySelectorAll(s)];

export const hareketAzMi = () => document.documentElement.dataset.hareket === 'azalt';
