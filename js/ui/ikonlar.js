// Satır içi SVG ikonlar (çizgi stili, currentColor). Hepsi 24x24.
const s = ic => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ic}</svg>`;

export const IKON = {
  simdi: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  telefon: s('<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>'),
  sehir: s('<path d="M3 21h18"/><path d="M5 21V10l5-3v14"/><path d="M10 21V4h6v17"/><path d="M16 21v-8h3v8"/><path d="M12.5 8h1M12.5 11h1M12.5 14h1"/>'),
  hayatim: s('<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5"/>'),
  dahaFazla: s('<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>'),
  enerji: s('<path d="M13 2.5 5.5 13.5H12l-1 8 7.5-11H12z"/>'),
  ruh: s('<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.5c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8"/><path d="M9 9.5h.01M15 9.5h.01"/>'),
  saat: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  para: s('<path d="M8 4v16"/><path d="M5.5 11.5 12 9M5.5 15.5 12 13"/><path d="M8 20c5 0 9-3.5 9-8"/>'),
  ok: s('<path d="m9 6 6 6-6 6"/>'),
  kapat: s('<path d="M6 6l12 12M18 6 6 18"/>'),
  uyu: s('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  is: s('<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5v2"/><path d="M3.5 12.5h17"/>'),
  tekrar: s('<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>'),
};
