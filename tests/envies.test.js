/**
 * Les idées de la personne, reformulées.
 * node --test tests/envies.test.js
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  fragments, assembler, phrase, parDimension, pourLesResultats, auMoinsUneIdee,
} from '../docs/assets/js/envies.js';

const ici = dirname(fileURLToPath(import.meta.url));
const contenu = JSON.parse(
  readFileSync(join(ici, '..', 'docs', 'assets', 'data', 'contenu.json'), 'utf8')
);

/** 16 réponses toutes réservées : toutes les relances sont permises. */
const RESERVEES = new Array(16).fill(0);

describe('les fragments', () => {
  test('chaque affirmation a autant de fragments que de choix, dans les 2 versions', () => {
    contenu.affirmations.forEach((a) => {
      ['membre', 'manager'].forEach((role) => {
        const choix = a.relance[role].choix;
        const textes = fragments(contenu, a.n, role);
        assert.notEqual(textes, null, `Q${a.n} ${role} : aucun fragment`);
        assert.equal(
          textes.length, choix.length,
          `Q${a.n} ${role} : ${textes.length} fragments pour ${choix.length} choix`
        );
      });
    });
  });

  test('la version manager reprend celle du membre quand elle n’existe pas', () => {
    // Seules les affirmations 4, 6, 10 et 12 ont des choix manager différents.
    const propres = contenu.affirmations
      .filter((a) => contenu.envies.fragments[String(a.n)].manager)
      .map((a) => a.n);
    assert.deepEqual(propres, [4, 6, 10, 12]);
    assert.deepEqual(fragments(contenu, 1, 'manager'), fragments(contenu, 1, 'membre'));
    assert.notDeepEqual(fragments(contenu, 4, 'manager'), fragments(contenu, 4, 'membre'));
  });

  test('aucun fragment ne commence par une majuscule ni ne finit par un point', () => {
    // Ce sont des groupes nominaux : ils doivent s'enchaîner dans une phrase.
    contenu.affirmations.forEach((a) => {
      ['membre', 'manager'].forEach((role) => {
        fragments(contenu, a.n, role).forEach((f) => {
          assert.equal(f.charAt(0), f.charAt(0).toLowerCase(), `Q${a.n} ${role} : « ${f} »`);
          assert.ok(!f.endsWith('.'), `Q${a.n} ${role} : « ${f} »`);
        });
      });
    });
  });
});

describe('assembler une phrase', () => {
  test('un seul fragment', () => {
    assert.equal(assembler(['un cap commun']), 'Un cap commun.');
  });

  test('deux fragments, reliés par « et »', () => {
    assert.equal(assembler(['un cap commun', 'des priorités claires']),
      'Un cap commun et des priorités claires.');
  });

  test('trois fragments : virgules puis « et »', () => {
    assert.equal(assembler(['a', 'b', 'c']), 'A, b et c.');
  });

  test('quatre fragments', () => {
    assert.equal(assembler(['a', 'b', 'c', 'd']), 'A, b, c et d.');
  });

  test('aucun fragment ne donne rien', () => {
    assert.equal(assembler([]), '');
  });
});

describe('la phrase d’une dimension', () => {
  test('reprend les fragments des choix cochés, dans l’ordre des affirmations', () => {
    // « Ce qu'on vise ensemble » porte les affirmations 1 et 2.
    const relances = { 2: [0], 1: [1] };
    const attendu = assembler([
      contenu.envies.fragments['1'].membre[1],
      contenu.envies.fragments['2'].membre[0],
    ]);
    assert.equal(phrase(contenu, [1, 2], relances, 'membre'), attendu);
  });

  test('deux choix sur la même affirmation donnent deux fragments', () => {
    const relances = { 7: [0, 4] };
    const attendu = assembler([
      contenu.envies.fragments['7'].membre[0],
      contenu.envies.fragments['7'].membre[4],
    ]);
    assert.equal(phrase(contenu, [7, 8], relances, 'membre'), attendu);
  });

  test('« Autre » avec d’autres choix vient en dernier', () => {
    const p = phrase(contenu, [1, 2], { 1: [0, 'autre'] }, 'membre');
    assert.ok(p.endsWith(`et ${contenu.envies.autre}.`), p);
    assert.ok(p.startsWith(contenu.envies.fragments['1'].membre[0].charAt(0).toUpperCase()), p);
  });

  test('« Autre » seul donne la phrase à préciser', () => {
    assert.equal(phrase(contenu, [1, 2], { 1: ['autre'] }, 'membre'), contenu.envies.autre_seul);
  });

  test('aucun choix ne donne rien', () => {
    assert.equal(phrase(contenu, [1, 2], {}, 'membre'), '');
    assert.equal(phrase(contenu, [1, 2], { 1: [] }, 'membre'), '');
  });

  test('la version manager est utilisée quand elle diffère', () => {
    // L'affirmation 4 appartient à « Ce qu'on sait les uns des autres ».
    const membre = phrase(contenu, [3, 4], { 4: [0] }, 'membre');
    const manager = phrase(contenu, [3, 4], { 4: [0] }, 'manager');
    assert.notEqual(membre, manager);
    assert.equal(manager, assembler([contenu.envies.fragments['4'].manager[0]]));
  });

  test('chaque phrase est une phrase : majuscule en tête, point final', () => {
    contenu.dimensions.forEach((d) => {
      const relances = {};
      d.affirmations.forEach((n) => { relances[n] = [0]; });
      const p = phrase(contenu, d.affirmations, relances, 'membre');
      assert.equal(p.charAt(0), p.charAt(0).toUpperCase(), d.cle);
      assert.ok(p.endsWith('.'), d.cle);
      assert.ok(!/[—–]/.test(p), `${d.cle} : tiret cadratin`);
    });
  });
});

describe('les idées par dimension', () => {
  test('ne renvoie que les dimensions concernées', () => {
    const relances = { 1: [0], 7: [1] };
    const sortie = parDimension(contenu, relances, 'membre');
    assert.deepEqual(Object.keys(sortie).sort(), ['info', 'vise']);
  });

  test('l’affirmation 16 n’entre dans aucune dimension', () => {
    const sortie = parDimension(contenu, { 16: [0] }, 'membre');
    assert.deepEqual(Object.keys(sortie), []);
  });

  test('l’affirmation 16 a son propre encadré', () => {
    const p = pourLesResultats(contenu, { 16: [0, 2] }, 'membre');
    assert.equal(p, assembler([
      contenu.envies.fragments['16'].membre[0],
      contenu.envies.fragments['16'].membre[2],
    ]));
  });

  test('sans idée sur l’affirmation 16, pas d’encadré', () => {
    assert.equal(pourLesResultats(contenu, { 1: [0] }, 'membre'), '');
  });

  test('toutes les dimensions peuvent avoir leurs idées à la fois', () => {
    const relances = {};
    for (let n = 1; n <= 16; n += 1) relances[n] = [0];
    const sortie = parDimension(contenu, relances, 'membre');
    assert.equal(Object.keys(sortie).length, 8);
  });
});

describe('y a-t-il une idée quelque part', () => {
  test('oui dès qu’un choix est coché', () => {
    assert.equal(auMoinsUneIdee({ 3: [0] }), true);
    assert.equal(auMoinsUneIdee({ 3: ['autre'] }), true);
  });

  test('non si tout est vide', () => {
    assert.equal(auMoinsUneIdee({}), false);
    assert.equal(auMoinsUneIdee({ 3: [] }), false);
    assert.equal(auMoinsUneIdee(null), false);
  });
});

describe('les textes de la section envies', () => {
  test('tous les textes attendus sont là', () => {
    ['titre', 'autre', 'autre_seul', 'resultats_titre', 'phrase_finale'].forEach((cle) => {
      assert.ok(contenu.envies[cle], `envies.${cle} manque`);
    });
  });

  test('aucun texte ne contient de tiret cadratin', () => {
    const tous = [
      contenu.envies.titre, contenu.envies.autre, contenu.envies.autre_seul,
      contenu.envies.resultats_titre, contenu.envies.phrase_finale,
    ].concat(
      Object.values(contenu.envies.fragments).flatMap((f) => Object.values(f).flat())
    );
    tous.forEach((t) => assert.ok(!/[—–]/.test(t), `« ${t} »`));
  });
});
