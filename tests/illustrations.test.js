/**
 * L'illustration doit suivre le niveau calculé, pour les 4 niveaux.
 * Et le fichier correspondant doit exister.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { medaillon, icone, chemin } from '../docs/assets/js/illustration-niveau.js';
import { calculer, NB_AFFIRMATIONS } from '../docs/assets/js/calcul.js';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = join(ici, '..');
const contenu = JSON.parse(
  readFileSync(join(racine, 'docs', 'assets', 'data', 'contenu.json'), 'utf8')
);

/** 16 réponses toutes à la même valeur. */
const toutes = (v) => new Array(NB_AFFIRMATIONS).fill(v);

describe('illustration du niveau', () => {
  test('chaque niveau a son médaillon et son icône, présents sur le disque', () => {
    contenu.niveaux.forEach((n) => {
      [medaillon(n.cle), icone(n.cle)].forEach((fichier) => {
        const complet = join(racine, 'docs', chemin(fichier));
        assert.ok(existsSync(complet), `${fichier} manque pour le niveau ${n.cle}`);
      });
    });
  });

  test('les 4 niveaux donnent 4 médaillons différents', () => {
    const vus = new Set(contenu.niveaux.map((n) => medaillon(n.cle)));
    assert.equal(vus.size, 4);
  });

  /**
   * La correspondance de bout en bout : des réponses donnent une carte, la
   * carte donne un niveau, le niveau donne une illustration.
   */
  test('le médaillon suit la carte calculée, pour les 4 niveaux', () => {
    const attendu = [
      { reponses: toutes(3), niveau: 'enracine' },
      { reponses: toutes(2), niveau: 'croissance' },
      { reponses: toutes(1), niveau: 'germe' },
      { reponses: toutes(0), niveau: 'semer' },
    ];
    attendu.forEach(({ reponses, niveau }) => {
      const resultat = calculer(reponses, contenu);
      assert.equal(resultat.carte.niveau, niveau);
      assert.equal(medaillon(resultat.carte.niveau), `scene-${niveau}.svg`);
    });
  });

  test('chaque colonne de couleur reçoit l’icône de son niveau', () => {
    // Un regard contrasté, pour obtenir plusieurs colonnes à la fois.
    const reponses = [3, 3, 0, 0, 2, 2, 1, 1, 3, 0, 2, 2, 2, 1, 1, 2];
    const resultat = calculer(reponses, contenu);
    assert.ok(resultat.colonnes.length > 1, 'il faut plusieurs colonnes pour ce test');
    resultat.colonnes.forEach((c) => {
      assert.equal(icone(c.niveau.cle), `icone-${c.niveau.cle}.svg`);
    });
  });

  test('les illustrations ne portent plus de métadonnées', () => {
    contenu.niveaux.forEach((n) => {
      const svg = readFileSync(join(racine, 'docs', chemin(medaillon(n.cle))), 'utf8');
      assert.ok(!svg.includes('<metadata>'), `${n.cle} porte encore ses métadonnées`);
      assert.ok(svg.includes('aria-hidden="true"'), `${n.cle} n'est pas marquée décorative`);
    });
  });
});
