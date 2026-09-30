/**
 * La mise en perspective « vous n'êtes pas seul ».
 * Rien ne doit s'afficher tant que les seuils ne sont pas atteints.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  seuils, cleDuSegment, baseDeComparaison, phrasePour, phrases, comparaisonActive,
} from '../docs/assets/js/comparaison.js';
import { dimensionsClassees, NB_AFFIRMATIONS } from '../docs/assets/js/calcul.js';

const ici = dirname(fileURLToPath(import.meta.url));
const contenu = JSON.parse(
  readFileSync(join(ici, '..', 'docs', 'assets', 'data', 'contenu.json'), 'utf8')
);

const PROFIL = { secteur: 'Santé', taille_equipe: '6 à 12 personnes' };
const CLE = cleDuSegment(PROFIL, 'membre');

/** Des parts par dimension : `installees` est la part en 2 ou 3. */
function dimensionsAvec(installees) {
  const sortie = {};
  contenu.dimensions.forEach((d) => {
    const part = installees[d.cle] != null ? installees[d.cle] : 0.6;
    sortie[d.cle] = { 0: (1 - part) / 2, 1: (1 - part) / 2, 2: part / 2, 3: part / 2 };
  });
  return sortie;
}

function agregats({ ensemble = null, segment = null } = {}) {
  return {
    ok: true,
    ensemble: ensemble && { effectif: ensemble.effectif, dimensions: dimensionsAvec(ensemble.parts || {}) },
    segments: segment
      ? { [CLE]: { effectif: segment.effectif, dimensions: dimensionsAvec(segment.parts || {}) } }
      : {},
  };
}

describe('les seuils', () => {
  test('ceux de contenu.json : 100 pour l’ensemble, 30 par segment', () => {
    assert.deepEqual(seuils(contenu), { ensemble: 100, segment: 30 });
  });

  test('99 réponses ne suffisent pas, 100 oui', () => {
    assert.equal(baseDeComparaison(agregats({ ensemble: { effectif: 99 } }), PROFIL, 'membre', contenu), null);
    const base = baseDeComparaison(agregats({ ensemble: { effectif: 100 } }), PROFIL, 'membre', contenu);
    assert.equal(base.source, 'ensemble');
  });

  test('29 dans le segment ne suffisent pas, 30 oui', () => {
    const sous = agregats({ ensemble: { effectif: 500 }, segment: { effectif: 29 } });
    assert.equal(baseDeComparaison(sous, PROFIL, 'membre', contenu).source, 'ensemble');

    const juste = agregats({ ensemble: { effectif: 500 }, segment: { effectif: 30 } });
    assert.equal(baseDeComparaison(juste, PROFIL, 'membre', contenu).source, 'segment');
  });

  test('un segment fourni passe avant l’ensemble', () => {
    const a = agregats({ ensemble: { effectif: 5000 }, segment: { effectif: 40 } });
    const base = baseDeComparaison(a, PROFIL, 'membre', contenu);
    assert.equal(base.source, 'segment');
    assert.equal(base.effectif, 40);
  });

  test('un segment d’un autre profil ne sert pas', () => {
    const a = agregats({ ensemble: { effectif: 50 }, segment: { effectif: 40 } });
    const autre = { secteur: 'Immobilier', taille_equipe: '2 à 5 personnes' };
    // Ni le segment (ce n'est pas le sien), ni l'ensemble (50 < 100).
    assert.equal(baseDeComparaison(a, autre, 'membre', contenu), null);
  });

  test('le rôle fait partie du segment', () => {
    const a = agregats({ ensemble: { effectif: 50 }, segment: { effectif: 40 } });
    assert.equal(baseDeComparaison(a, PROFIL, 'manager', contenu), null);
    assert.notEqual(baseDeComparaison(a, PROFIL, 'membre', contenu), null);
  });
});

describe('quand l’API ne répond pas', () => {
  test('aucune phrase, et aucune erreur', () => {
    [null, undefined, {}, { ok: false }, { ok: true, ensemble: null, segments: {} }].forEach((a) => {
      assert.equal(baseDeComparaison(a, PROFIL, 'membre', contenu), null);
      assert.deepEqual(phrases([], a, PROFIL, 'membre', contenu), {});
      assert.equal(comparaisonActive(a, PROFIL, 'membre', contenu), false);
    });
  });
});

describe('les phrases', () => {
  const reponses = (valeurs) => {
    const r = new Array(NB_AFFIRMATIONS).fill(2);
    contenu.dimensions.forEach((d, i) => {
      if (valeurs[i] == null) return;
      d.affirmations.forEach((n) => { r[n - 1] = valeurs[i]; });
    });
    return r;
  };

  test('une dimension peu installée chez elle et ailleurs reçoit sa phrase', () => {
    // « Comment l'info circule » est la moins installée partout.
    const dims = dimensionsClassees(reponses([2, 2, 2, 0, 2, 2, 2, 2]), contenu);
    const a = agregats({ ensemble: { effectif: 200, parts: { info: 0.2, sait: 0.3, place: 0.35 } } });
    const sortie = phrases(dims, a, PROFIL, 'membre', contenu);
    assert.equal(sortie.info, contenu.engagement.comparaison.aussi_peu_installee);
  });

  test('une dimension bien enracinée chez elle, en construction ailleurs', () => {
    const dims = dimensionsClassees(reponses([3, 2, 2, 2, 2, 2, 2, 2]), contenu);
    const a = agregats({ ensemble: { effectif: 200, parts: { vise: 0.3 } } });
    const sortie = phrases(dims, a, PROFIL, 'membre', contenu);
    assert.equal(sortie.vise, contenu.engagement.comparaison.deja_la);
  });

  test('une dimension bien enracinée et répandue ailleurs n’a rien à dire', () => {
    const dims = dimensionsClassees(reponses([3, 2, 2, 2, 2, 2, 2, 2]), contenu);
    const a = agregats({ ensemble: { effectif: 200, parts: { vise: 0.9 } } });
    assert.equal(phrases(dims, a, PROFIL, 'membre', contenu).vise, undefined);
  });

  test('sous le seuil, aucune phrase malgré des écarts nets', () => {
    const dims = dimensionsClassees(reponses([3, 2, 2, 0, 2, 2, 2, 2]), contenu);
    const a = agregats({ ensemble: { effectif: 99, parts: { info: 0.1, vise: 0.2 } } });
    assert.deepEqual(phrases(dims, a, PROFIL, 'membre', contenu), {});
  });

  test('aucune phrase ne contient de chiffre', () => {
    const dims = dimensionsClassees(reponses([3, 2, 2, 0, 2, 2, 2, 2]), contenu);
    const a = agregats({ ensemble: { effectif: 200, parts: { info: 0.1, vise: 0.2 } } });
    Object.values(phrases(dims, a, PROFIL, 'membre', contenu)).forEach((p) => {
      assert.ok(!/\d/.test(p), p);
      assert.ok(!/[—–]/.test(p), p);
    });
  });
});

describe('le bandeau de retour', () => {
  test('reste au texte d’attente sous les seuils', () => {
    assert.equal(comparaisonActive(agregats({ ensemble: { effectif: 99 } }), PROFIL, 'membre', contenu), false);
  });

  test('passe au texte actif au-delà', () => {
    assert.equal(comparaisonActive(agregats({ ensemble: { effectif: 100 } }), PROFIL, 'membre', contenu), true);
  });
});
