import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

// ESLint makinede kuruluysa kodu denetler (kurulu değilse atlanır; oyun için gerekli değil)
let eslintVar = true;
try { execSync('eslint --version', { stdio: 'ignore' }); } catch { eslintVar = false; }

test('kod denetimi (eslint): gölgelenen/tanımsız/kullanılmayan adlar yok', { skip: !eslintVar && 'eslint kurulu değil' }, () => {
  let cikti = '';
  try { cikti = execSync('eslint js sw.js', { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' }); } catch (e) { cikti = (e.stdout || '') + (e.stderr || ''); }
  assert.equal(cikti.trim(), '', cikti);
});
