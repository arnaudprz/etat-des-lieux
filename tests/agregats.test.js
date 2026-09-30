/**
 * Tests des calculs du tableau de bord.
 * Le seuil d'anonymat k >= 3 est la règle la plus importante : aucun chiffre ne
 * doit sortir d'un groupe plus petit.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  K_MINI, assezDeMonde, pourcent, filtrer, filtresVides,
  detailAffirmation, partAccord, souhaitLePlusChoisi,
  repartitionDimensions, cartesRecues, fondations,
  repartitionProfil, classementSecteurs, nombreSecteurs,
  comparaisonRoles, lienResultats, indicateurs,
} from '../docs/assets/js/admin/agregats.js';

import { essentiel, ceQuiPorte, deuxRegards, lienAvecLesResultats } from '../docs/assets/js/admin/analyse.js';

const ici = dirname(fileURLToPath(import.meta.url));
const contenu = JSON.parse(
  readFileSync(join(ici, '..', 'docs', 'assets', 'data', 'contenu.json'), 'utf8')
);

// ------------------------------------------------------------------- fabrique

let compteur = 0;
function ligne(modifications = {}) {
  compteur += 1;
  return {
    date: '2026-09-20',
    source: 'en_ligne',
    version: 'v1',
    role: 'membre',
    genre: 'Une femme',
    taille_entreprise: '50 à 299 salariés',
    secteur: 'Santé',
    taille_equipe: '6 à 12 personnes',
    reponses: new Array(16).fill(2),
    relances: {},
    ...modifications,
  };
}

/** n lignes identiques. */
function groupe(n, modifications = {}) {
  return Array.from({ length: n }, () => ligne(modifications));
}

// ----------------------------------------------------------------- généralités

describe('outillage', () => {
  test('le seuil d’anonymat vaut 3', () => {
    assert.equal(K_MINI, 3);
    assert.equal(assezDeMonde(2), false);
    assert.equal(assezDeMonde(3), true);
  });

  test('les pourcentages sont arrondis à l’unité', () => {
    assert.equal(pourcent(1, 3), 33);
    assert.equal(pourcent(2, 3), 67);
    assert.equal(pourcent(0, 0), 0);
    assert.equal(pourcent(1, 1), 100);
  });
});

// --------------------------------------------------------------------- filtres

describe('filtres', () => {
  const jeu = [
    ...groupe(3, { role: 'manager', secteur: 'Santé' }),
    ...groupe(4, { role: 'membre', secteur: 'Immobilier', source: 'papier' }),
    ...groupe(2, { role: 'membre', secteur: 'Santé', genre: '' }),
  ];

  test('sans filtre, tout passe', () => {
    assert.equal(filtrer(jeu, filtresVides()).length, 9);
  });

  test('filtre par rôle', () => {
    assert.equal(filtrer(jeu, { role: 'manager' }).length, 3);
    assert.equal(filtrer(jeu, { role: 'membre' }).length, 6);
  });

  test('filtre par source', () => {
    assert.equal(filtrer(jeu, { source: 'papier' }).length, 4);
    assert.equal(filtrer(jeu, { source: 'en_ligne' }).length, 5);
  });

  test('filtre par secteur', () => {
    assert.equal(filtrer(jeu, { secteur: 'Santé' }).length, 5);
  });

  test('« sans réponse » retrouve les genres laissés vides', () => {
    assert.equal(filtrer(jeu, { genre: 'sans_reponse' }).length, 2);
    assert.equal(filtrer(jeu, { genre: 'Une femme' }).length, 7);
  });

  test('les filtres se combinent', () => {
    assert.equal(filtrer(jeu, { role: 'membre', secteur: 'Santé' }).length, 2);
  });

  test('filtre par période', () => {
    const aujourdhui = new Date('2026-09-30');
    const recents = groupe(2, { date: '2026-09-28' });
    const vieux = groupe(3, { date: '2026-01-15' });
    const tout = recents.concat(vieux);
    assert.equal(filtrer(tout, { periode: '7' }, aujourdhui).length, 2);
    assert.equal(filtrer(tout, { periode: '30' }, aujourdhui).length, 2);
    assert.equal(filtrer(tout, { periode: 'tout' }, aujourdhui).length, 5);
  });
});

// ------------------------------------------------------- le seuil d'anonymat

describe('anonymat k >= 3', () => {
  test('le détail d’une affirmation est refusé à 2 personnes', () => {
    assert.equal(detailAffirmation(groupe(2), 1), null);
    assert.notEqual(detailAffirmation(groupe(3), 1), null);
  });

  test('la part d’accord est refusée à 2 personnes', () => {
    assert.equal(partAccord(groupe(2), [1, 2]), null);
    assert.notEqual(partAccord(groupe(3), [1, 2]), null);
  });

  test('la répartition des dimensions est vide à 2 personnes', () => {
    assert.deepEqual(repartitionDimensions(groupe(2), contenu), []);
    assert.equal(repartitionDimensions(groupe(3), contenu).length, 8);
  });

  test('les cartes d’ensemble sont vides à 2 personnes', () => {
    assert.deepEqual(cartesRecues(groupe(2), contenu), []);
    assert.equal(cartesRecues(groupe(3), contenu).length, 4);
  });

  test('les 4 conditions ne donnent aucun chiffre à 2 personnes', () => {
    const f = fondations(groupe(2), contenu);
    assert.equal(f.length, 4);
    assert.ok(f.every((x) => x.mesure === null));
  });

  test('la comparaison des rôles exige 3 personnes de chaque côté', () => {
    const jeu = groupe(3, { role: 'manager' }).concat(groupe(2, { role: 'membre' }));
    const c = comparaisonRoles(jeu, contenu);
    assert.ok(c.every((x) => x.membres === null));
    assert.ok(c.every((x) => x.ecart === null));
  });

  test('« L’essentiel » ne produit rien à 2 personnes', () => {
    assert.deepEqual(essentiel(groupe(2), contenu), []);
  });

  test('le souhait le plus choisi exige 3 personnes concernées', () => {
    const avec = { reponses: new Array(16).fill(0), relances: { 1: [0] } };
    assert.equal(souhaitLePlusChoisi(groupe(2, avec), 1, 'membre', contenu), null);
    assert.notEqual(souhaitLePlusChoisi(groupe(3, avec), 1, 'membre', contenu), null);
  });
});

// -------------------------------------------------------------- affirmations

describe('détail d’une affirmation', () => {
  test('compte les 4 réponses et la part d’accord', () => {
    const jeu = [
      ...groupe(2, { reponses: new Array(16).fill(3) }),
      ...groupe(3, { reponses: new Array(16).fill(2) }),
      ...groupe(3, { reponses: new Array(16).fill(1) }),
      ...groupe(2, { reponses: new Array(16).fill(0) }),
    ];
    const d = detailAffirmation(jeu, 1);
    assert.equal(d.effectif, 10);
    assert.deepEqual(d.compte, [2, 3, 3, 2]);
    assert.equal(d.accord, 50);            // 3 « En bonne partie » + 2 « Pleinement »
    assert.equal(d.effectifAccord, 5);
    assert.equal(d.effectifDesaccord, 5);
  });

  test('le souhait le plus choisi est celui qui revient le plus', () => {
    const jeu = [
      ...groupe(3, { reponses: new Array(16).fill(0), relances: { 1: [2] } }),
      ...groupe(2, { reponses: new Array(16).fill(0), relances: { 1: [0] } }),
    ];
    const s = souhaitLePlusChoisi(jeu, 1, 'membre', contenu);
    assert.equal(s.libelle, contenu.affirmations[0].relance.membre.choix[2]);
    assert.equal(s.nombre, 3);
    assert.equal(s.effectif, 5);
    assert.equal(s.part, 60);
    assert.equal(s.debut, 'J’aimerais…'.replace('’', "'"));
  });

  test('« Autre » est nommé correctement', () => {
    const jeu = groupe(4, { reponses: new Array(16).fill(0), relances: { 1: ['autre'] } });
    const s = souhaitLePlusChoisi(jeu, 1, 'membre', contenu);
    assert.equal(s.libelle, contenu.relance.autre);
  });
});

// ---------------------------------------------------------------- dimensions

describe('dimensions et cartes', () => {
  test('chaque répondant est rangé dans une seule couleur par dimension', () => {
    const jeu = groupe(5);
    repartitionDimensions(jeu, contenu).forEach((d) => {
      const total = d.niveaux.reduce((n, x) => n + x.effectif, 0);
      assert.equal(total, 5, `la dimension ${d.cle} ne range pas tout le monde`);
    });
  });

  test('des réponses toutes à 2 donnent 100 % en croissance', () => {
    const d = repartitionDimensions(groupe(4), contenu)[0];
    const croissance = d.niveaux.find((n) => n.niveau.cle === 'croissance');
    assert.equal(croissance.part, 100);
    assert.equal(d.partInstallee, 100);
  });

  test('les cartes d’ensemble couvrent tous les répondants', () => {
    const jeu = groupe(3, { reponses: new Array(16).fill(3) })
      .concat(groupe(3, { reponses: new Array(16).fill(0) }));
    const cartes = cartesRecues(jeu, contenu);
    assert.equal(cartes.reduce((n, c) => n + c.effectif, 0), 6);
    assert.equal(cartes.find((c) => c.carte.niveau === 'enracine').effectif, 3);
    assert.equal(cartes.find((c) => c.carte.niveau === 'semer').effectif, 3);
  });

  test('le Q16 ne change pas la carte d’ensemble', () => {
    const bas = new Array(16).fill(2); bas[15] = 0;
    const haut = new Array(16).fill(2); haut[15] = 3;
    const a = cartesRecues(groupe(3, { reponses: bas }), contenu);
    const b = cartesRecues(groupe(3, { reponses: haut }), contenu);
    assert.deepEqual(a.map((x) => x.effectif), b.map((x) => x.effectif));
  });
});

// ------------------------------------------------------------- qui a répondu

describe('qui a répondu', () => {
  test('la répartition d’un profil suit l’ordre de contenu.json', () => {
    const jeu = groupe(3, { taille_equipe: '13 personnes et plus' })
      .concat(groupe(2, { taille_equipe: '2 à 5 personnes' }));
    const r = repartitionProfil(jeu, 'taille_equipe', contenu.profil.taille_equipe.choix);
    assert.deepEqual(r.map((x) => x.libelle), ['2 à 5 personnes', '13 personnes et plus']);
    assert.equal(r[0].effectif, 2);
    assert.equal(r[1].part, 60);
  });

  test('les genres non renseignés deviennent « Sans réponse »', () => {
    const jeu = groupe(2, { genre: '' }).concat(groupe(3));
    const r = repartitionProfil(jeu, 'genre', contenu.profil.genre.choix);
    const sans = r.find((x) => x.libelle === 'Sans réponse');
    assert.equal(sans.effectif, 2);
  });

  test('les secteurs sont classés et les plus petits regroupés', () => {
    const jeu = [
      ...groupe(5, { secteur: 'Santé' }),
      ...groupe(4, { secteur: 'Immobilier' }),
      ...groupe(3, { secteur: 'BTP et construction' }),
      ...groupe(2, { secteur: 'Commerce de gros' }),
      ...groupe(1, { secteur: 'Énergie, eau et environnement' }),
    ];
    const s = classementSecteurs(jeu, 3);
    assert.deepEqual(s.map((x) => x.libelle), [
      'Santé', 'Immobilier', 'BTP et construction', 'Autres secteurs (2)',
    ]);
    assert.equal(s[3].effectif, 3);
    assert.equal(nombreSecteurs(jeu), 5);
  });
});

// ---------------------------------------------------------- rôles et résultats

describe('managers face aux membres', () => {
  test('l’écart se calcule en points', () => {
    const managers = groupe(3, { role: 'manager', reponses: new Array(16).fill(3) });
    const membres = groupe(3, { role: 'membre', reponses: new Array(16).fill(0) });
    const c = comparaisonRoles(managers.concat(membres), contenu)[0];
    assert.equal(c.managers.part, 100);
    assert.equal(c.membres.part, 0);
    assert.equal(c.ecart, 100);
  });
});

describe('le lien avec le Q16', () => {
  test('compare la part d’accord au Q16 selon l’installation de la dimension', () => {
    const haut = new Array(16).fill(3);
    const bas = new Array(16).fill(0);
    const jeu = groupe(4, { reponses: haut }).concat(groupe(4, { reponses: bas }));
    const l = lienResultats(jeu, contenu)[0];
    assert.equal(l.installee.part, 100);
    assert.equal(l.aConstruire.part, 0);
    assert.equal(l.ecart, 100);
  });

  test('un côté trop petit ne donne aucun écart', () => {
    const jeu = groupe(5, { reponses: new Array(16).fill(3) })
      .concat(groupe(2, { reponses: new Array(16).fill(0) }));
    const l = lienResultats(jeu, contenu)[0];
    assert.notEqual(l.installee, null);
    assert.equal(l.aConstruire, null);
    assert.equal(l.ecart, null);
  });
});

// ------------------------------------------------------------- indicateurs

describe('indicateurs', () => {
  test('comptent les rôles et le taux de complétion', () => {
    const jeu = groupe(3, { role: 'manager' }).concat(groupe(7, { role: 'membre' }));
    const i = indicateurs(jeu, { visite: 100, commence: 20, termine: 10, lien_copie: 5 }, contenu);
    assert.equal(i.repondants, 10);
    assert.equal(i.managers, 3);
    assert.equal(i.membres, 7);
    assert.equal(i.completion, 50);
    assert.equal(i.partLiensCopies, 50);
    assert.equal(i.secteursPossibles, 20);
  });

  test('aucun questionnaire commencé ne donne pas de taux', () => {
    const i = indicateurs(groupe(3), { visite: 0, commence: 0, termine: 0, lien_copie: 0 }, contenu);
    assert.equal(i.completion, null);
  });
});

// -------------------------------------------------------------- « L'essentiel »

describe('« L’essentiel »', () => {
  const jeu = [
    ...groupe(20, { role: 'manager', reponses: new Array(16).fill(3) }),
    ...groupe(20, { role: 'membre', reponses: new Array(16).fill(1) }),
  ];

  test('produit les 4 constats quand il y a assez de monde', () => {
    const c = essentiel(jeu, contenu);
    assert.equal(c.length, 4);
    assert.deepEqual(c.map((x) => x.titre), [
      'Ce qui porte les équipes',
      'Ce qui peut grandir',
      'Deux regards différents',
      'Le lien avec les résultats',
    ]);
  });

  test('chaque constat est une phrase, majuscule en tête et point final', () => {
    essentiel(jeu, contenu).forEach((c) => {
      assert.equal(c.texte.charAt(0), c.texte.charAt(0).toUpperCase(), c.titre);
      assert.ok(c.texte.trim().endsWith('.'), c.titre);
    });
  });

  test('aucun constat ne contient de tiret cadratin', () => {
    essentiel(jeu, contenu).forEach((c) => {
      assert.ok(!/[—–]/.test(c.texte), c.titre);
    });
  });

  test('« Deux regards différents » disparaît s’il manque un des deux groupes', () => {
    const seulement = groupe(10, { role: 'membre' });
    assert.equal(deuxRegards(seulement, contenu), null);
    assert.ok(!essentiel(seulement, contenu).some((c) => c.titre === 'Deux regards différents'));
  });

  test('« Ce qui porte » nomme deux dimensions', () => {
    const varie = [
      ...groupe(10, { reponses: [3, 3, 0, 0, 3, 3, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1] }),
    ];
    const c = ceQuiPorte(varie, contenu);
    assert.ok(c.texte.includes('Ce qu’on vise ensemble'.replace('’', "'")) || c.texte.includes("Ce qu'on vise ensemble"));
    assert.ok(c.texte.includes(' et '));
  });

  test('« Le lien avec les résultats » cite l’écart le plus marqué', () => {
    const c = lienAvecLesResultats(jeu, contenu);
    assert.ok(c.texte.includes('%'));
    assert.ok(c.texte.includes('contre'));
  });
});
