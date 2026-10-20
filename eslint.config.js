// Kod denetimi (geliştirme aracı; oyun bunu kullanmaz). tests/lint.test.js çalıştırır.
// Amaç: gölgelenen adlar (1.11'de bulunan "kayit" hatası gibi), tanımsız adlar, kullanılmayan değişkenler.
const tarayici = ['window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage', 'indexedDB', 'fetch', 'Response', 'Request',
  'caches', 'self', 'screen', 'innerWidth', 'innerHeight', 'requestAnimationFrame', 'performance', 'console', 'setTimeout', 'clearTimeout',
  'setInterval', 'clearInterval', 'queueMicrotask', 'structuredClone', 'crypto', 'TextEncoder', 'TextDecoder', 'CompressionStream',
  'DecompressionStream', 'btoa', 'atob', 'URL', 'File', 'Blob', 'Event', 'Node', 'Intl', 'globalThis', 'getComputedStyle', 'matchMedia'];
const globals = Object.fromEntries(tarayici.map(g => [g, 'readonly']));

export default [
  {
    files: ['js/**/*.js', 'sw.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals },
    rules: {
      'no-undef': 'error',
      'no-shadow': ['error', { builtinGlobals: false, hoist: 'functions' }],
      'no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-const-assign': 'error',
      'no-self-assign': 'error',
    },
  },
  { files: ['sw.js'], languageOptions: { sourceType: 'script' } },
];
