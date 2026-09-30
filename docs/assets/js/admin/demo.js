/**
 * Données fictives du mode démo.
 *
 * Permet de parcourir tout le tableau de bord sans backend. Le tirage est
 * reproductible : la même graine donne toujours les mêmes chiffres, pour qu'une
 * démonstration ne change pas d'une fois sur l'autre.
 *
 * Ces données ne sortent jamais du navigateur et ne ressemblent à aucune
 * personne réelle.
 */

import { NB_AFFIRMATIONS } from '../calcul.js';

/** Générateur pseudo-aléatoire simple, pour un tirage reproductible. */
function tirage(graine) {
  let etat = graine >>> 0;
  return function suivant() {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}

/** Choisit une valeur selon des poids. */
function selonPoids(aleatoire, valeurs, poids) {
  const total = poids.reduce((a, b) => a + b, 0);
  let seuil = aleatoire() * total;
  for (let i = 0; i < valeurs.length; i += 1) {
    seuil -= poids[i];
    if (seuil <= 0) return valeurs[i];
  }
  return valeurs[valeurs.length - 1];
}

/** Une réponse de 0 à 3, tirée autour d'un penchant. */
function reponse(aleatoire, penchant) {
  const poids = [
    Math.max(0.05, 1.6 - penchant),
    Math.max(0.1, 1.3 - penchant * 0.5),
    0.6 + penchant * 0.7,
    0.2 + penchant * 0.8,
  ];
  return selonPoids(aleatoire, [0, 1, 2, 3], poids);
}

/** Les 2 affirmations les plus réservées, comme dans le parcours. */
function plusReservees(reponses) {
  return reponses
    .map((valeur, i) => ({ n: i + 1, valeur }))
    .filter((a) => a.valeur <= 1)
    .sort((a, b) => a.valeur - b.valeur || a.n - b.n)
    .slice(0, 2)
    .map((a) => a.n);
}

/** Construit un jeu de réponses fictives. */
export function reponsesFictives(contenu, nombre = 412, graine = 20260930) {
  const aleatoire = tirage(graine);
  const p = contenu.profil;
  const lignes = [];

  for (let i = 0; i < nombre; i += 1) {
    const estManager = aleatoire() < 0.23;
    const role = estManager ? 'manager' : 'membre';

    // Les managers voient leur équipe un peu plus installée que les membres.
    const penchantGeneral = aleatoire() * 1.1 + (estManager ? 0.55 : 0);

    const reponses = [];
    for (let n = 1; n <= NB_AFFIRMATIONS; n += 1) {
      // La circulation de l'info et la connaissance des autres ressortent moins.
      const malus = (n >= 3 && n <= 4) || (n >= 7 && n <= 8) ? 0.45 : 0;
      reponses.push(reponse(aleatoire, Math.max(0, penchantGeneral - malus)));
    }

    const relances = {};
    plusReservees(reponses).forEach((n) => {
      const affirmation = contenu.affirmations.find((a) => a.n === n);
      const def = affirmation && affirmation.relance ? affirmation.relance[role] : null;
      if (!def) return;
      const combien = aleatoire() < 0.35 ? 1 : 2;
      const choisis = new Set();
      while (choisis.size < combien) {
        // Le premier choix sort plus souvent, pour qu'un souhait se détache.
        const idx = aleatoire() < 0.4 ? 0 : Math.floor(aleatoire() * def.choix.length);
        choisis.add(idx);
      }
      relances[n] = Array.from(choisis);
    });

    const jours = Math.floor(aleatoire() * 45);
    const date = new Date(Date.UTC(2026, 8, 30) - jours * 86400000)
      .toISOString()
      .slice(0, 10);

    lignes.push({
      date,
      source: aleatoire() < 0.12 ? 'papier' : 'en_ligne',
      version: 'v1',
      role,
      genre: selonPoids(aleatoire, p.genre.choix.concat(['']), [48, 43, 1, 4, 8]),
      taille_entreprise: selonPoids(aleatoire, p.taille_entreprise.choix, [5, 17, 33, 20, 14, 10]),
      secteur: selonPoids(
        aleatoire,
        p.secteur.choix,
        [3, 15, 3, 4, 3, 18, 7, 4, 6, 5, 2, 8, 11, 12, 6, 5, 3, 4, 3, 2]
      ),
      taille_equipe: selonPoids(aleatoire, p.taille_equipe.choix, [24, 54, 23]),
      reponses,
      relances,
    });
  }

  return lignes;
}

/** Un jeu de contacts fictifs, sans ressemblance avec personne. */
export function contactsFictifs(nombre = 87, graine = 7) {
  const aleatoire = tirage(graine);
  const prenoms = ['Camille', 'Sacha', 'Inès', 'Lucas', 'Nour', 'Théo', 'Maya', 'Yann'];
  const noms = ['Durand', 'Lefèvre', 'Moreau', 'Bertin', 'Caron', 'Dubois', 'Renard'];
  const maisons = ['Atelier du Nord', 'Maison Verte', 'Groupe Bélier', 'Cabinet Lys'];

  const sortie = [];
  for (let i = 0; i < nombre; i += 1) {
    const prenom = prenoms[Math.floor(aleatoire() * prenoms.length)];
    const nom = noms[Math.floor(aleatoire() * noms.length)];
    const entreprise = maisons[Math.floor(aleatoire() * maisons.length)];
    const jours = Math.floor(aleatoire() * 45);
    sortie.push({
      date: new Date(Date.UTC(2026, 8, 30) - jours * 86400000).toISOString().slice(0, 10),
      prenom,
      nom,
      entreprise,
      email: `${prenom.toLowerCase()}.${nom.toLowerCase()}@exemple.fr`,
      consentement: 'oui',
    });
  }
  return sortie.sort((a, b) => b.date.localeCompare(a.date));
}

/** Tout ce que l'API renverrait, en fictif. */
export function donneesFictives(contenu) {
  const reponses = reponsesFictives(contenu);
  const termine = reponses.length;
  return {
    ok: true,
    demo: true,
    genere_le: '2026-09-30',
    reponses,
    entonnoir: {
      visite: 1240,
      commence: 580,
      termine,
      lien_copie: Math.round(termine * 0.56),
    },
    nombre_contacts: 87,
    compteur: termine + 255,
  };
}
