/**
 * Tests du calcul de l'état des lieux.
 * Aucune dépendance : node --test tests/
 *
 * La référence est maquette/Simulateur.dc.html. Les 4 préréglages du simulateur
 * sont rejoués en bas de fichier.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  arrondir,
  reponsesValides,
  niveauDimension,
  dimensionsClassees,
  moyenneEnsemble,
  cartePourMoyenne,
  carteEnsemble,
  phraseForme,
  phraseAppui,
  colonnes,
  affirmationsRelancees,
  ouvreUneRelance,
  relancesAEnvoyer,
  calculer,
  NB_AFFIRMATIONS,
} from '../docs/assets/js/calcul.js';

import { encoder, decoder, lienResultat, VERSION } from '../docs/assets/js/lien.js';

const ici = dirname(fileURLToPath(import.meta.url));
const contenu = JSON.parse(
  readFileSync(join(ici, '..', 'docs', 'assets', 'data', 'contenu.json'), 'utf8')
);

// ------------------------------------------------------------------- outillage

/**
 * Construit 16 réponses à partir d'une valeur de niveau par dimension :
 * chaque affirmation de la dimension reçoit cette valeur. La moyenne des
 * affirmations 1 à 15 vaut alors exactement la moyenne pondérée du simulateur.
 */
function depuisNiveaux(valeurs, q16 = 0) {
  const r = new Array(NB_AFFIRMATIONS).fill(0);
  contenu.dimensions.forEach((d, i) => {
    d.affirmations.forEach((n) => {
      r[n - 1] = valeurs[i];
    });
  });
  r[NB_AFFIRMATIONS - 1] = q16;
  return r;
}

/** Les valeurs de niveau des 8 dimensions, dans l'ordre de contenu.json. */
function niveauxDe(reponses) {
  return dimensionsClassees(reponses, contenu).map((d) => d.valeur);
}

/** Le simulateur indexe les niveaux à l'envers : index 0 vaut 3, index 3 vaut 0. */
function depuisIndicesSimulateur(indices, q16 = 0) {
  return depuisNiveaux(indices.map((i) => 3 - i), q16);
}

// -------------------------------------------------------------------- arrondi

describe('arrondi', () => {
  test('arrondit à l’entier le plus proche', () => {
    assert.equal(arrondir(0), 0);
    assert.equal(arrondir(1.2), 1);
    assert.equal(arrondir(1.49), 1);
    assert.equal(arrondir(2.4), 2);
    assert.equal(arrondir(2.9), 3);
  });

  test('les égalités vont vers le haut : 1,5 donne 2', () => {
    assert.equal(arrondir(0.5), 1);
    assert.equal(arrondir(1.5), 2);
    assert.equal(arrondir(2.5), 3);
  });
});

describe('niveau d’une dimension', () => {
  test('moyenne arrondie des affirmations de la dimension', () => {
    // La confiance porte sur Q11, Q12, Q13.
    const r = new Array(NB_AFFIRMATIONS).fill(0);
    r[10] = 3; r[11] = 2; r[12] = 2; // moyenne 2,33 donne 2
    assert.equal(niveauDimension(r, [11, 12, 13]), 2);
  });

  test('une égalité sur une dimension à 2 affirmations monte : 1 et 2 donnent 2', () => {
    const r = new Array(NB_AFFIRMATIONS).fill(0);
    r[0] = 1; r[1] = 2; // moyenne 1,5
    assert.equal(niveauDimension(r, [1, 2]), 2);
  });

  test('0 et 1 donnent 1', () => {
    const r = new Array(NB_AFFIRMATIONS).fill(0);
    r[0] = 0; r[1] = 1; // moyenne 0,5
    assert.equal(niveauDimension(r, [1, 2]), 1);
  });

  test('2 et 3 donnent 3', () => {
    const r = new Array(NB_AFFIRMATIONS).fill(0);
    r[0] = 2; r[1] = 3; // moyenne 2,5
    assert.equal(niveauDimension(r, [1, 2]), 3);
  });

  test('chaque dimension reçoit la phrase de son niveau', () => {
    const dims = dimensionsClassees(depuisNiveaux([3, 2, 1, 0, 3, 2, 1, 0]), contenu);
    const cles = ['enracine', 'croissance', 'germe', 'semer', 'enracine', 'croissance', 'germe', 'semer'];
    dims.forEach((d, i) => {
      assert.equal(d.niveau.cle, cles[i]);
      assert.equal(d.phrase, contenu.dimensions[i].phrases[cles[i]]);
    });
  });
});

// -------------------------------------------------------- seuils de la carte

describe('seuils de la carte d’ensemble', () => {
  const nom = (m) => cartePourMoyenne(m, contenu).niveau;

  test('les bornes exactes', () => {
    assert.equal(nom(2.5), 'enracine');
    assert.equal(nom(2.49), 'croissance');
    assert.equal(nom(1.75), 'croissance');
    assert.equal(nom(1.74), 'germe');
    assert.equal(nom(1), 'germe');
    assert.equal(nom(0.99), 'semer');
  });

  test('les extrêmes', () => {
    assert.equal(nom(3), 'enracine');
    assert.equal(nom(0), 'semer');
  });

  test('le Q16 n’entre pas dans la moyenne', () => {
    const bas = depuisNiveaux([2, 2, 2, 2, 2, 2, 2, 2], 0);
    const haut = depuisNiveaux([2, 2, 2, 2, 2, 2, 2, 2], 3);
    assert.equal(moyenneEnsemble(bas), 2);
    assert.equal(moyenneEnsemble(haut), 2);
    assert.equal(carteEnsemble(bas, contenu).niveau, carteEnsemble(haut, contenu).niveau);
  });

  test('la moyenne porte bien sur 15 affirmations', () => {
    assert.equal(moyenneEnsemble(depuisNiveaux([3, 3, 3, 3, 3, 3, 3, 3], 0)), 3);
    assert.equal(moyenneEnsemble(depuisNiveaux([0, 0, 0, 0, 0, 0, 0, 0], 3)), 0);
  });
});

// ------------------------------------------------------------ phrase de forme

describe('phrase de forme', () => {
  const forme = (valeurs) => phraseForme(dimensionsClassees(depuisNiveaux(valeurs), contenu), contenu);

  test('homogène quand toutes les dimensions sont au même niveau', () => {
    assert.equal(forme([2, 2, 2, 2, 2, 2, 2, 2]), contenu.phrases_forme.homogene);
    assert.equal(forme([0, 0, 0, 0, 0, 0, 0, 0]), contenu.phrases_forme.homogene);
    assert.equal(forme([3, 3, 3, 3, 3, 3, 3, 3]), contenu.phrases_forme.homogene);
  });

  test('contrastée à partir de 2 niveaux d’écart', () => {
    assert.equal(forme([3, 3, 3, 3, 3, 3, 3, 1]), contenu.phrases_forme.contraste);
    assert.equal(forme([3, 0, 2, 2, 2, 2, 2, 2]), contenu.phrases_forme.contraste);
  });

  test('rien quand l’écart est d’un seul niveau', () => {
    assert.equal(forme([3, 3, 3, 3, 3, 3, 3, 2]), '');
    assert.equal(forme([1, 0, 1, 1, 1, 1, 1, 1]), '');
  });
});

// ------------------------------------------------------------ phrase d'appui

describe('phrase d’appui', () => {
  const appui = (valeurs) => phraseAppui(dimensionsClassees(depuisNiveaux(valeurs), contenu), contenu);
  const nom = (i) => contenu.dimensions[i].nom;
  const min = (s) => s.charAt(0).toLowerCase() + s.slice(1);

  test('1 dimension en tête : elle est nommée', () => {
    // Seule « Ce qu'on vise ensemble » est bien enracinée.
    assert.equal(appui([3, 2, 2, 2, 2, 2, 2, 2]), `Ce qui vous porte le plus : ${min(nom(0))}.`);
  });

  test('2 dimensions en tête : reliées par « et »', () => {
    assert.equal(
      appui([3, 3, 2, 2, 2, 2, 2, 2]),
      `Ce qui vous porte le plus : ${min(nom(0))} et ${min(nom(1))}.`
    );
  });

  test('3 dimensions en tête : pas de phrase d’appui', () => {
    assert.equal(appui([3, 3, 3, 2, 2, 2, 2, 2]), '');
  });

  test('0 dimension en tête car le regard est homogène', () => {
    assert.equal(appui([2, 2, 2, 2, 2, 2, 2, 2]), '');
    assert.equal(appui([3, 3, 3, 3, 3, 3, 3, 3]), '');
  });

  test('0 dimension en tête car le meilleur niveau reste En germe', () => {
    assert.equal(appui([1, 0, 0, 0, 0, 0, 0, 0]), '');
    assert.equal(appui([1, 1, 0, 0, 0, 0, 0, 0]), '');
  });

  test('le meilleur niveau En croissance suffit', () => {
    assert.equal(appui([2, 1, 1, 1, 1, 1, 1, 1]), `Ce qui vous porte le plus : ${min(nom(0))}.`);
  });

  test('le nom de la dimension passe en minuscule initiale', () => {
    assert.ok(appui([3, 2, 2, 2, 2, 2, 2, 2]).includes("ce qu'on vise ensemble"));
  });
});

// ---------------------------------------------------------------- colonnes

describe('colonnes de couleur', () => {
  test('seules les colonnes non vides sont renvoyées, dans l’ordre des niveaux', () => {
    const dims = dimensionsClassees(depuisNiveaux([3, 3, 1, 1, 1, 1, 1, 1]), contenu);
    const cols = colonnes(dims, contenu);
    assert.deepEqual(cols.map((c) => c.niveau.cle), ['enracine', 'germe']);
    assert.equal(cols[0].dimensions.length, 2);
    assert.equal(cols[1].dimensions.length, 6);
  });

  test('un regard homogène ne donne qu’une colonne, et les 8 dimensions y sont', () => {
    const dims = dimensionsClassees(depuisNiveaux([2, 2, 2, 2, 2, 2, 2, 2]), contenu);
    const cols = colonnes(dims, contenu);
    assert.equal(cols.length, 1);
    assert.equal(cols[0].dimensions.length, 8);
  });

  test('toutes les dimensions sont rangées une fois et une seule', () => {
    const dims = dimensionsClassees(depuisNiveaux([3, 2, 1, 0, 3, 2, 1, 0]), contenu);
    const cols = colonnes(dims, contenu);
    assert.equal(cols.reduce((n, c) => n + c.dimensions.length, 0), 8);
  });
});

// ---------------------------------------------------------------- relances

describe('relances', () => {
  const vide = () => new Array(NB_AFFIRMATIONS).fill(null);

  test('toute réponse Pas encore ou Un peu ouvre sa relance', () => {
    const r = new Array(NB_AFFIRMATIONS).fill(3);
    r[4] = 1; r[9] = 0; r[2] = 1;
    assert.deepEqual(affirmationsRelancees(r, contenu), [3, 5, 10]);
  });

  test('sans limite de nombre : 16 réponses réservées donnent 16 relances', () => {
    const toutes = affirmationsRelancees(new Array(NB_AFFIRMATIONS).fill(0), contenu);
    assert.equal(toutes.length, 16);
    assert.deepEqual(toutes, Array.from({ length: 16 }, (_, i) => i + 1));
  });

  test('renvoyées dans l’ordre des affirmations', () => {
    const r = new Array(NB_AFFIRMATIONS).fill(3);
    r[12] = 0; r[1] = 1; r[7] = 0;
    assert.deepEqual(affirmationsRelancees(r, contenu), [2, 8, 13]);
  });

  test('seules les valeurs 0 et 1 en ouvrent une', () => {
    const r = new Array(NB_AFFIRMATIONS).fill(2);
    assert.deepEqual(affirmationsRelancees(r, contenu), []);
    r[5] = 1;
    assert.deepEqual(affirmationsRelancees(r, contenu), [6]);
    r[5] = 3;
    assert.deepEqual(affirmationsRelancees(r, contenu), []);
  });

  test('ouvreUneRelance dit la même chose, réponse par réponse', () => {
    assert.equal(ouvreUneRelance(0, contenu), true);
    assert.equal(ouvreUneRelance(1, contenu), true);
    assert.equal(ouvreUneRelance(2, contenu), false);
    assert.equal(ouvreUneRelance(3, contenu), false);
    assert.equal(ouvreUneRelance(null, contenu), false);
  });

  test('les affirmations sans réponse sont ignorées', () => {
    const r = vide();
    r[0] = 1;
    assert.deepEqual(affirmationsRelancees(r, contenu), [1]);
  });

  test('la relance s’applique aussi à l’affirmation 16', () => {
    const r = new Array(NB_AFFIRMATIONS).fill(3);
    r[15] = 0;
    assert.deepEqual(affirmationsRelancees(r, contenu), [16]);
  });
});

describe('les relances envoyées', () => {
  test('seules celles des réponses encore réservées partent', () => {
    const r = new Array(NB_AFFIRMATIONS).fill(3);
    r[2] = 1;   // Q3 réservée
    r[6] = 0;   // Q7 réservée
    // Q10 a été réservée un moment, puis passée à Pleinement : ses choix
    // restent en mémoire mais ne doivent pas partir.
    const memoire = { 3: [0, 1], 7: ['autre'], 10: [2] };
    assert.deepEqual(relancesAEnvoyer(r, memoire, contenu), { 3: [0, 1], 7: ['autre'] });
  });

  test('une relance vide ne part pas', () => {
    const r = new Array(NB_AFFIRMATIONS).fill(0);
    assert.deepEqual(relancesAEnvoyer(r, { 1: [], 2: [0] }, contenu), { 2: [0] });
  });

  test('aucune réponse réservée ne donne aucune relance', () => {
    const r = new Array(NB_AFFIRMATIONS).fill(2);
    assert.deepEqual(relancesAEnvoyer(r, { 1: [0], 5: [1] }, contenu), {});
  });

  test('les 16 peuvent partir ensemble', () => {
    const r = new Array(NB_AFFIRMATIONS).fill(0);
    const memoire = {};
    for (let n = 1; n <= NB_AFFIRMATIONS; n += 1) memoire[n] = [0];
    assert.equal(Object.keys(relancesAEnvoyer(r, memoire, contenu)).length, 16);
  });
});

// ------------------------------------------------------------ garde-fous

describe('validation des réponses', () => {
  test('accepte 16 entiers de 0 à 3', () => {
    assert.ok(reponsesValides(new Array(NB_AFFIRMATIONS).fill(0)));
    assert.ok(reponsesValides(new Array(NB_AFFIRMATIONS).fill(3)));
  });

  test('refuse tout le reste', () => {
    assert.ok(!reponsesValides(new Array(15).fill(0)));
    assert.ok(!reponsesValides(new Array(17).fill(0)));
    assert.ok(!reponsesValides(new Array(NB_AFFIRMATIONS).fill(4)));
    assert.ok(!reponsesValides(new Array(NB_AFFIRMATIONS).fill(-1)));
    assert.ok(!reponsesValides(new Array(NB_AFFIRMATIONS).fill(null)));
    assert.ok(!reponsesValides(new Array(NB_AFFIRMATIONS).fill(1.5)));
    assert.ok(!reponsesValides('2211220023212212'));
  });

  test('calculer refuse des réponses incomplètes', () => {
    assert.throws(() => calculer(new Array(15).fill(2), contenu));
  });
});

// --------------------------------------------------- préréglages du simulateur

describe('les 4 préréglages du simulateur', () => {
  const min = (s) => s.charAt(0).toLowerCase() + s.slice(1);

  test('« Exemple de la maquette » : en germe, contrasté, appui sur le soutien du manager', () => {
    const r = depuisIndicesSimulateur([1, 2, 1, 3, 1, 0, 1, 1]);
    assert.deepEqual(niveauxDe(r), [2, 1, 2, 0, 2, 3, 2, 2]);
    assert.equal(moyenneEnsemble(r).toFixed(4), (25 / 15).toFixed(4));
    const res = calculer(r, contenu);
    assert.equal(res.carte.niveau, 'germe');
    assert.equal(res.carte.titre, 'Une équipe en germe');
    assert.equal(res.appui, `Ce qui vous porte le plus : ${min(contenu.dimensions[5].nom)}.`);
    assert.equal(res.forme, contenu.phrases_forme.contraste);
  });

  test('« Équipe régulière » : en croissance, ni appui ni phrase de forme', () => {
    const r = depuisIndicesSimulateur([1, 1, 1, 2, 1, 1, 1, 1]);
    assert.deepEqual(niveauxDe(r), [2, 2, 2, 1, 2, 2, 2, 2]);
    assert.equal(moyenneEnsemble(r).toFixed(4), (28 / 15).toFixed(4));
    const res = calculer(r, contenu);
    assert.equal(res.carte.niveau, 'croissance');
    assert.equal(res.appui, '');
    assert.equal(res.forme, '');
  });

  test('« Tout bien enraciné » : homogène, une seule colonne', () => {
    const r = depuisIndicesSimulateur([0, 0, 0, 0, 0, 0, 0, 0], 3);
    const res = calculer(r, contenu);
    assert.equal(res.carte.niveau, 'enracine');
    assert.equal(res.carte.titre, 'Une équipe bien enracinée');
    assert.equal(res.appui, '');
    assert.equal(res.forme, contenu.phrases_forme.homogene);
    assert.equal(res.colonnes.length, 1);
    assert.equal(res.colonnes[0].niveau.cle, 'enracine');
  });

  test('« Tout à semer » : homogène, terrain prêt à semer', () => {
    const r = depuisIndicesSimulateur([3, 3, 3, 3, 3, 3, 3, 3]);
    const res = calculer(r, contenu);
    assert.equal(res.carte.niveau, 'semer');
    assert.equal(res.carte.titre, 'Un terrain prêt à semer');
    assert.equal(res.appui, '');
    assert.equal(res.forme, contenu.phrases_forme.homogene);
    assert.equal(res.colonnes.length, 1);
    assert.equal(res.colonnes[0].niveau.cle, 'semer');
  });
});

// ---------------------------------------------------------- le lien personnel

describe('le lien personnel', () => {
  const r = [2, 2, 1, 1, 2, 2, 0, 0, 2, 3, 2, 1, 2, 2, 1, 2];

  test('encode le rôle et les 16 réponses', () => {
    assert.equal(encoder('membre', r), 'v2-m2211220023212212');
    assert.equal(encoder('manager', r), 'v2-g2211220023212212');
  });

  test('encode les idées cochées, dans l’ordre des affirmations', () => {
    const jeton = encoder('membre', r, { 8: [1], 3: [1, 4], 15: ['autre'] });
    assert.equal(jeton, 'v2-m2211220023212212-3.14-8.1-15.a');
  });

  test('une relance vide n’est pas encodée', () => {
    assert.equal(encoder('membre', r, { 3: [] }), 'v2-m2211220023212212');
  });

  test('aller et retour, avec et sans idées', () => {
    for (const role of ['membre', 'manager']) {
      for (const relances of [{}, { 3: [0] }, { 3: [1, 4], 7: [0, 'autre'] }]) {
        const lu = decoder('#' + encoder(role, r, relances), contenu);
        assert.equal(lu.role, role);
        assert.equal(lu.version, 'v2');
        assert.deepEqual(lu.reponses, r);
        assert.deepEqual(lu.relances, relances);
      }
    }
  });

  test('aller et retour sur des cas tirés au hasard', () => {
    // Un tirage reproductible : la même graine donne toujours les mêmes cas.
    let etat = 20260930;
    const suivant = () => { etat = (etat * 1664525 + 1013904223) >>> 0; return etat / 4294967296; };

    for (let essai = 0; essai < 200; essai += 1) {
      const role = suivant() < 0.5 ? 'membre' : 'manager';
      const reponses = Array.from({ length: NB_AFFIRMATIONS }, () => Math.floor(suivant() * 4));
      const relances = {};
      reponses.forEach((valeur, i) => {
        if (valeur > 1) return;              // seule une réponse réservée en porte
        if (suivant() < 0.35) return;        // les idées restent facultatives
        const n = i + 1;
        const dispo = contenu.affirmations.find((a) => a.n === n).relance[role].choix.length;
        const combien = suivant() < 0.5 ? 1 : 2;
        const choisis = new Set();
        while (choisis.size < combien) {
          choisis.add(suivant() < 0.12 ? 'autre' : Math.floor(suivant() * dispo));
        }
        relances[n] = Array.from(choisis);
      });

      const lu = decoder('#' + encoder(role, reponses, relances), contenu);
      assert.equal(lu.role, role, `essai ${essai}`);
      assert.deepEqual(lu.reponses, reponses, `essai ${essai}`);
      assert.deepEqual(lu.relances, relances, `essai ${essai}`);
    }
  });

  test('les 16 relances ouvertes tiennent dans le lien', () => {
    const toutes = new Array(NB_AFFIRMATIONS).fill(0);
    const relances = {};
    for (let n = 1; n <= NB_AFFIRMATIONS; n += 1) relances[n] = [0, 1];
    const lu = decoder('#' + encoder('membre', toutes, relances), contenu);
    assert.equal(Object.keys(lu.relances).length, 16);
    assert.deepEqual(lu.relances, relances);
  });

  test('un lien v1 reste lisible, sans les idées', () => {
    const lu = decoder('#v1-m2211220023212212', contenu);
    assert.equal(lu.version, 'v1');
    assert.equal(lu.role, 'membre');
    assert.deepEqual(lu.reponses, r);
    assert.deepEqual(lu.relances, {});
  });

  test('le hash ne contient que la version, le rôle et les réponses', () => {
    assert.equal(encoder('membre', r).length, 'v2-'.length + 1 + NB_AFFIRMATIONS);
  });

  test('refuse un hash mal formé', () => {
    assert.equal(decoder(''), null);
    assert.equal(decoder('#'), null);
    assert.equal(decoder('#v2-x2211220023212212'), null);   // rôle inconnu
    assert.equal(decoder('#v2-m221122002321221'), null);     // 15 chiffres
    assert.equal(decoder('#v2-m22112200232122123'), null);   // 17 chiffres
    assert.equal(decoder('#v2-m2211220023212214'), null);    // un 4
    assert.equal(decoder('#v9-m2211220023212212'), null);    // version inconnue
    assert.equal(decoder('#v1-m2211220023212212-3.1'), null); // un v1 ne porte pas d'idées
    assert.equal(decoder(null), null);
  });

  /**
   * Une partie « idées » mal formée ne doit pas emporter tout le lien : on
   * affiche le résultat sans les idées, plutôt qu'un message d'erreur.
   */
  test('un lien aux idées mal formées garde le résultat', () => {
    const cas = [
      ['#v2-m2211220023212212-3.147', 'plus de 2 choix'],
      ['#v2-m2211220023212212-1.0', 'relance sur une réponse En bonne partie'],
      ['#v2-m2211220023212212-3.9', 'indice inexistant'],
      ['#v2-m2211220023212212-99.1', 'affirmation inexistante'],
      ['#v2-m2211220023212212-3.1-3.2', 'deux fois la même affirmation'],
      ['#v2-m2211220023212212-3.11', 'deux fois le même choix'],
      ['#v2-m2211220023212212-nawak', 'segment illisible'],
    ];
    cas.forEach(([jeton, pourquoi]) => {
      const lu = decoder(jeton, contenu);
      assert.notEqual(lu, null, pourquoi);
      assert.deepEqual(lu.reponses, r, pourquoi);
      assert.deepEqual(lu.relances, {}, pourquoi);
    });
  });

  test('sans contenu, les indices ne sont pas vérifiés mais la forme l’est', () => {
    const lu = decoder('#v2-m2211220023212212-3.9');
    assert.deepEqual(lu.relances, { 3: [9] });
    assert.deepEqual(decoder('#v2-m2211220023212212-1.0').relances, {});
  });

  test('tolère l’absence de dièse et les espaces', () => {
    assert.ok(decoder('v2-m2211220023212212'));
    assert.ok(decoder('  #v2-m2211220023212212  '));
  });

  test('l’URL du résultat pointe vers resultat.html', () => {
    assert.equal(lienResultat('membre', r), 'resultat.html#v2-m2211220023212212');
    assert.equal(
      lienResultat('membre', r, { 3: [1] }),
      'resultat.html#v2-m2211220023212212-3.1'
    );
  });

  test('refuse d’encoder un rôle inconnu ou des réponses invalides', () => {
    assert.throws(() => encoder('patron', r));
    assert.throws(() => encoder('membre', new Array(15).fill(2)));
  });
});
