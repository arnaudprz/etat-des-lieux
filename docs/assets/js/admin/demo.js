/**
 * Données fictives du mode démo.
 *
 * Permet de parcourir tout le tableau de bord sans backend. Le tirage est
 * reproductible : la même graine donne toujours les mêmes chiffres, pour qu'une
 * démonstration ne change pas d'une fois sur l'autre.
 *
 * Les ordres de grandeur sont calés sur ceux de la maquette, pour qu'on puisse
 * juger la mise en page et les textes de « L'essentiel » sur des chiffres
 * plausibles. Mesurer avec : node scripts/verif/calibrer-demo.mjs
 *
 * Ces données ne sortent jamais du navigateur et ne ressemblent à aucune
 * personne réelle.
 */

import { NB_AFFIRMATIONS, DERNIERE_AFFIRMATION_RESULTAT } from '../calcul.js';

/** Part des réponses saisies sur papier. */
const PART_PAPIER = 0.14;

/** Part de managers parmi les répondants. */
const PART_MANAGERS = 0.23;

/**
 * Répartition visée des cartes d'ensemble, par rôle, dans l'ordre
 * Bien enraciné, En croissance, En germe, À semer.
 *
 * Pondérée par PART_MANAGERS, elle donne l'ensemble visé : 12, 41, 34 et 13 %.
 * Les managers voient leur équipe plus installée que les membres, ce qui nourrit
 * le constat « Deux regards différents ».
 */
const CIBLE_CARTES = {
  manager: [0.28, 0.50, 0.19, 0.03],
  membre: [0.072, 0.383, 0.385, 0.160],
};

/** Les bornes de moyenne de chaque carte, de la plus installée à la moins. */
const BORNES = [
  { min: 2.5, max: 3 },
  { min: 1.75, max: 2.5 },
  { min: 1, max: 1.75 },
  { min: 0, max: 1 },
];

/** Les affirmations qui ressortent moins, pour que deux dimensions se détachent. */
const MOINS_INSTALLEES = [3, 4, 7, 8];

/** Générateur pseudo-aléatoire simple, pour un tirage reproductible. */
function tirage(graine) {
  let etat = graine >>> 0;
  return function suivant() {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}

/** Choisit un indice selon des poids. */
function indiceSelonPoids(aleatoire, poids) {
  const total = poids.reduce((a, b) => a + b, 0);
  let seuil = aleatoire() * total;
  for (let i = 0; i < poids.length; i += 1) {
    seuil -= poids[i];
    if (seuil <= 0) return i;
  }
  return poids.length - 1;
}

/** Choisit une valeur selon des poids. */
function selonPoids(aleatoire, valeurs, poids) {
  return valeurs[indiceSelonPoids(aleatoire, poids)];
}

/**
 * Une réponse de 0 à 3, tirée en cloche autour d'une cible.
 * L'écart type garde de la variété dans le détail des 4 réponses.
 */
function reponseAutourDe(aleatoire, cible) {
  const ecart = 0.9;
  const poids = [0, 1, 2, 3].map((v) => Math.exp(-((v - cible) ** 2) / (2 * ecart * ecart)));
  return selonPoids(aleatoire, [0, 1, 2, 3], poids);
}

/** La moyenne des affirmations qui entrent dans la carte d'ensemble. */
function moyenneCarte(reponses) {
  let somme = 0;
  for (let i = 0; i < DERNIERE_AFFIRMATION_RESULTAT; i += 1) somme += reponses[i];
  return somme / DERNIERE_AFFIRMATION_RESULTAT;
}

/** L'indice de carte que produit un jeu de réponses. */
function carteDe(reponses) {
  const m = moyenneCarte(reponses);
  return BORNES.findIndex((b) => m >= b.min);
}

/**
 * Un jeu de 16 réponses dont la carte d'ensemble tombe dans `carteVisee`.
 *
 * On tire autour d'une cible, puis on retire si la carte n'est pas la bonne.
 * Quelques essais suffisent ; au-delà on garde le dernier tirage, pour que la
 * fonction se termine toujours.
 */
function reponsesPourCarte(aleatoire, carteVisee) {
  const borne = BORNES[carteVisee];
  let reponses = null;

  for (let essai = 0; essai < 40; essai += 1) {
    // Une cible à l'intérieur de la tranche, un peu resserrée pour viser juste.
    const marge = (borne.max - borne.min) * 0.15;
    const cible = borne.min + marge + aleatoire() * (borne.max - borne.min - 2 * marge);

    reponses = [];
    for (let n = 1; n <= NB_AFFIRMATIONS; n += 1) {
      const malus = MOINS_INSTALLEES.includes(n) ? 0.5 : 0;
      reponses.push(reponseAutourDe(aleatoire, Math.max(0, Math.min(3, cible - malus))));
    }
    if (carteDe(reponses) === carteVisee) return reponses;
  }
  return reponses;
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

/**
 * Les choix de relance d'une affirmation.
 *
 * Tirage uniforme, et une seule réponse dans 6 cas sur 10 : c'est ce qui place
 * le souhait le plus choisi dans la fourchette de la maquette, autour de 30 à
 * 45 %. Un souhait écrasant ne dirait rien d'intéressant.
 */
function choixRelance(aleatoire, nbChoix) {
  const combien = aleatoire() < 0.6 ? 1 : 2;
  const choisis = new Set();
  let garde = 0;
  while (choisis.size < combien && garde < 20) {
    garde += 1;
    // « Autre » reste marginal, comme dans la réalité.
    if (aleatoire() < 0.07) choisis.add('autre');
    else choisis.add(Math.floor(aleatoire() * nbChoix));
  }
  return Array.from(choisis);
}

/** Construit un jeu de réponses fictives. */
export function reponsesFictives(contenu, nombre = 412, graine = 20260930) {
  const aleatoire = tirage(graine);
  const p = contenu.profil;
  const lignes = [];

  for (let i = 0; i < nombre; i += 1) {
    const role = aleatoire() < PART_MANAGERS ? 'manager' : 'membre';
    const carteVisee = indiceSelonPoids(aleatoire, CIBLE_CARTES[role]);
    const reponses = reponsesPourCarte(aleatoire, carteVisee);

    const relances = {};
    plusReservees(reponses).forEach((n) => {
      const affirmation = contenu.affirmations.find((a) => a.n === n);
      const def = affirmation && affirmation.relance ? affirmation.relance[role] : null;
      if (!def) return;
      relances[n] = choixRelance(aleatoire, def.choix.length);
    });

    const jours = Math.floor(aleatoire() * 45);
    const date = new Date(Date.UTC(2026, 8, 30) - jours * 86400000)
      .toISOString()
      .slice(0, 10);

    const source = aleatoire() < PART_PAPIER ? 'papier' : 'en_ligne';

    lignes.push({
      date,
      source,
      // Le papier a été recueilli avec l'ancienne échelle d'accord.
      echelle: source === 'papier' ? 'v1-accord' : 'v2-evolution',
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

/**
 * Tout ce que l'API renverrait, en fictif.
 *
 * L'entonnoir ne compte que le parcours en ligne : le nombre de questionnaires
 * terminés vaut exactement le nombre de réponses en ligne, jamais le total.
 */
export function donneesFictives(contenu) {
  const reponses = reponsesFictives(contenu);
  const enLigne = reponses.filter((r) => r.source === 'en_ligne').length;

  return {
    ok: true,
    demo: true,
    genere_le: '2026-09-30',
    reponses,
    entonnoir: {
      visite: Math.round(enLigne * 3.5),
      commence: Math.round(enLigne * 1.64),
      termine: enLigne,
      lien_copie: Math.round(enLigne * 0.56),
    },
    nombre_contacts: 87,
    compteur: enLigne + 255,
  };
}
