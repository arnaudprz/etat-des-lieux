import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifier } from '../scripts/verifier-versions.mjs';

test('une seule version pour toutes les pages et tous les imports (V de config.js)', () => {
  const { V, fautes } = verifier();
  assert.deepEqual(fautes, [], 'version ' + V);
});
