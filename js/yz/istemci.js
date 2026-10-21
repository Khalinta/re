// Yapay zekâ istemcisi (3.9): seçili sağlayıcıya (Claude ya da Gemini) yönlendirir.
// Her ikisi de aynı sözleşmeyi uygular:
//   sohbetIstegi({ sistem, kullanici }) → { cevap, model } | { hata: 'anahtar' | 'ag' | 'sinir' | 'ret' | 'bicim' | 'diger', mesaj }
//   baglantiDene() → { tamam, model } | { tamam: false, mesaj }
// Sağlayıcı modülü ancak gerektiğinde yüklenir (Claude SDK'sı büyük).
import { etkin } from './ayar.js';

const modul = () => etkin().saglayici === 'gemini' ? import('./gemini.js') : import('./claude.js');

export async function sohbetIstegi(istek) { return (await modul()).sohbetIstegi(istek); }
export async function baglantiDene() { return (await modul()).baglantiDene(); }
