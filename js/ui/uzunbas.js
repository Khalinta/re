// Uzun basma: hover yerine bilgi göstermenin yolu.
//   uzunBas(el, () => bilgiGoster('Enerji', '...'))
// Uzun basma tetiklenirse ardından gelen normal tıklama yutulur.
const SURE = 450;      // ms
const TOLERANS = 10;   // px — parmak bu kadar kayarsa iptal

export function uzunBas(el, eylem) {
  let zamanlayici = null, x = 0, y = 0, tetiklendi = false;

  el.addEventListener('pointerdown', e => {
    tetiklendi = false;
    x = e.clientX; y = e.clientY;
    zamanlayici = setTimeout(() => {
      tetiklendi = true;
      el.classList.remove('basiliyor');
      eylem(e);
    }, SURE);
    el.classList.add('basiliyor');
  });
  const iptal = () => { clearTimeout(zamanlayici); zamanlayici = null; el.classList.remove('basiliyor'); };
  el.addEventListener('pointermove', e => {
    if (zamanlayici && (Math.abs(e.clientX - x) > TOLERANS || Math.abs(e.clientY - y) > TOLERANS)) iptal();
  });
  el.addEventListener('pointerup', iptal);
  el.addEventListener('pointercancel', iptal);
  el.addEventListener('pointerleave', iptal);
  el.addEventListener('contextmenu', e => e.preventDefault());
  el.addEventListener('click', e => {
    if (tetiklendi) { e.stopImmediatePropagation(); e.preventDefault(); tetiklendi = false; }
  }, true);
}
