#!/usr/bin/env node
/**
 * Une seule version pour tout le parcours (13 octobre 2026) : V dans docs/assets/js/config.js. Chaque import interne des
 * modules et chaque script ou feuille de style des pages doit porter ?v=V. Un navigateur qui garde un ancien fichier en
 * cache ne peut alors jamais le mélanger aux nouveaux. À lancer avant chaque livraison (il est aussi dans npm test).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const DOCS = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const tous = (d, ext) => readdirSync(d).flatMap((f) => { const p = join(d, f);
  if (statSync(p).isDirectory()) return f === '_astro' ? [] : tous(p, ext); return p.endsWith(ext) ? [p] : []; });

export function verifier() {
  const V = /export const V = (\d+);/.exec(readFileSync(join(DOCS, 'assets/js/config.js'), 'utf8'))[1];
  const fautes = [];
  for (const f of tous(join(DOCS, 'assets/js'), '.js')) {
    const s = readFileSync(f, 'utf8');
    for (const m of s.matchAll(/(?:from|import\()\s*'(\.{1,2}\/[^']+)'/g)) {
      if (m[1].includes('?t=')) continue; // le nouvel essai à neuf de pont-site.js
      if (!m[1].endsWith('?v=' + V)) fautes.push(`${relative(DOCS, f)} importe ${m[1]}`);
    }
  }
  for (const f of tous(DOCS, '.html')) {
    const s = readFileSync(f, 'utf8');
    for (const m of s.matchAll(/(?:src|href)="([^"]*assets\/(?:js|css)\/[^"]+)"/g)) {
      if (!m[1].endsWith('?v=' + V)) fautes.push(`${relative(DOCS, f)} charge ${m[1]}`);
    }
  }
  return { V, fautes };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { V, fautes } = verifier();
  console.log(fautes.length ? `Version ${V} : ${fautes.length} écart(s)\n` + fautes.join('\n') : `Tout est en version ${V}.`);
  process.exit(fautes.length ? 1 : 0);
}
