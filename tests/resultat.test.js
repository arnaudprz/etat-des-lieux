/**
 * Tests du contenu de la page résultat (passe 14, mise en page F).
 * node --test tests/
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ici = dirname(fileURLToPath(import.meta.url));
const brut = readFileSync(join(ici, '..', 'docs', 'assets', 'data', 'contenu.json'), 'utf8');

describe('contenu.json > resultat', () => {
  test('est un JSON valide, sans « a_noter »', () => {
    const contenu = JSON.parse(brut);
    assert.ok(contenu.resultat);
    assert.equal(contenu.resultat.a_noter, undefined);
    assert.ok(!brut.includes('"a_noter"'));
  });

  test('chacun des 5 thèmes correspond à une dimension, aucune utilisée deux fois', () => {
    const contenu = JSON.parse(brut);
    const themes = contenu.resultat.greatly.themes;
    assert.equal(themes.length, 5);
    const cles = new Set(contenu.dimensions.map((d) => d.cle));
    themes.forEach((t) => assert.ok(cles.has(t.dimension), `${t.nom} → ${t.dimension}`));
    assert.equal(new Set(themes.map((t) => t.dimension)).size, themes.length);
    themes.forEach((t) => assert.equal(t.niveau, undefined, `${t.nom} porte encore un niveau écrit en dur`));
  });

  test('aucun chiffre dans les textes des thèmes et du bloc Greatly', () => {
    const contenu = JSON.parse(brut);
    const g = contenu.resultat.greatly;
    const textes = [g.titre, g.texte, g.citation, g.temoignage.texte, g.temoignage.auteur]
      .concat(g.themes.flatMap((t) => [t.nom, t.texte, t.question]));
    textes.forEach((t) => assert.ok(!/[0-9%]/.test(t), t));
  });
});
