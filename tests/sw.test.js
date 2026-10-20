import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { swIcerik } from '../tools/sw-liste.mjs';

test('sw.js önbellek listesi ve sürümü güncel (değilse: node tools/sw-liste.mjs)', () => {
  const mevcut = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.equal(mevcut, swIcerik());
});
