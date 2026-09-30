/**
 * Calculs du tableau de bord.
 *
 * Module pur : pas de DOM, pas de réseau. Tout arrive en paramètre, ce qui le
 * rend testable (voir tests/agregats.test.js).
 *
 * Règle d'anonymat : aucun chiffre calculé sur moins de K_MINI personnes n'est
 * renvoyé. Les fonctions concernées renvoient null, et les vues affichent
 * « Pas assez de réponses pour ce groupe ».
 */

import { niveauDimension, DERNIERE_AFFIRMATION_RESULTAT, cartePourMoyenne } from '../calcul.js';

/** En dessous de ce nombre de personnes, on n'affiche aucun chiffre. */
export const K_MINI = 3;

/**
 * Les valeurs de réponse qui disent « je le vis déjà » :
 * En bonne partie et Pleinement.
 */
const ACCORD = [2, 3];

/** Les deux échelles de réponse. */
export const ECHELLE_PAPIER = 'v1-accord';
export const ECHELLE_EN_LIGNE = 'v2-evolution';

/**
 * Vrai si le jeu mélange les deux échelles.
 *
 * Les réponses papier ont été données avec une échelle d'accord, de « Pas du
 * tout » à « Tout à fait ». Les valeurs sont les mêmes, mais les mots changent :
 * quand les deux se côtoient dans un même chiffre, il faut le dire.
 */
export function melangeDesEchelles(reponses) {
  let papier = false;
  let enLigne = false;
  reponses.forEach((r) => {
    if ((r.echelle || ECHELLE_EN_LIGNE) === ECHELLE_PAPIER) papier = true;
    else enLigne = true;
  });
  return papier && enLigne;
}

/** La mention à afficher quand les deux échelles se côtoient. */
export const MENTION_ECHELLES =
  "Les réponses papier ont été données avec une échelle d'accord "
  + '(de Pas du tout à Tout à fait).';

/** Vrai si le groupe est assez grand pour qu'on en publie un chiffre. */
export function assezDeMonde(effectif) {
  return effectif >= K_MINI;
}

/** Pourcentage arrondi à l'unité. */
export function pourcent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

// ------------------------------------------------------------------- filtres

/** L'état de filtre qui ne retire rien. */
export function filtresVides() {
  return {
    source: 'toutes',
    periode: 'tout',
    role: 'tous',
    taille_entreprise: 'toutes',
    secteur: 'tous',
    genre: 'tous',
    taille_equipe: 'toutes',
  };
}

/** Retire les réponses plus anciennes que `jours`. */
function dansLaPeriode(ligne, jours, aujourdhui) {
  if (!jours) return true;
  if (!ligne.date) return true;
  const limite = new Date(aujourdhui);
  limite.setDate(limite.getDate() - jours);
  return new Date(ligne.date) >= limite;
}

/** Applique les filtres aux réponses. */
export function filtrer(reponses, filtres, aujourdhui = new Date()) {
  const f = { ...filtresVides(), ...filtres };
  const jours = { '7': 7, '30': 30 }[f.periode] || 0;

  return reponses.filter((r) => {
    if (f.source !== 'toutes' && r.source !== f.source) return false;
    if (f.role !== 'tous' && r.role !== f.role) return false;
    if (f.taille_entreprise !== 'toutes' && r.taille_entreprise !== f.taille_entreprise) return false;
    if (f.secteur !== 'tous' && r.secteur !== f.secteur) return false;
    if (f.taille_equipe !== 'toutes' && r.taille_equipe !== f.taille_equipe) return false;
    if (f.genre !== 'tous') {
      const g = r.genre || '';
      if (f.genre === 'sans_reponse' ? g !== '' : g !== f.genre) return false;
    }
    return dansLaPeriode(r, jours, aujourdhui);
  });
}

// --------------------------------------------------------------- affirmations

/**
 * Le détail d'une affirmation : la part de chaque réponse et la part d'accord.
 * @returns null si le groupe compte moins de K_MINI personnes.
 */
export function detailAffirmation(reponses, n) {
  const valeurs = reponses
    .map((r) => r.reponses[n - 1])
    .filter((v) => Number.isInteger(v));
  if (!assezDeMonde(valeurs.length)) return null;

  const compte = [0, 0, 0, 0];
  valeurs.forEach((v) => { compte[v] += 1; });
  const total = valeurs.length;
  const accord = compte[2] + compte[3];

  return {
    effectif: total,
    compte,
    parts: compte.map((c) => pourcent(c, total)),
    accord: pourcent(accord, total),
    effectifAccord: accord,
    effectifDesaccord: total - accord,
  };
}

/** La part qui vit déjà un ensemble d'affirmations, toutes réponses confondues. */
export function partAccord(reponses, numeros) {
  let total = 0;
  let accord = 0;
  reponses.forEach((r) => {
    numeros.forEach((n) => {
      const v = r.reponses[n - 1];
      if (!Number.isInteger(v)) return;
      total += 1;
      if (ACCORD.includes(v)) accord += 1;
    });
  });
  if (!assezDeMonde(reponses.length)) return null;
  return { part: pourcent(accord, total), effectif: reponses.length };
}

/**
 * Le souhait le plus choisi parmi ceux qui ont répondu Pas encore ou Un peu à
 * une affirmation, et la part que ce souhait représente parmi eux.
 *
 * La part se calcule sur les personnes qui ont répondu 0 ou 1 **et** coché au
 * moins un choix : ce sont les seules à avoir pu exprimer un souhait.
 */
export function souhaitLePlusChoisi(reponses, n, role, contenu) {
  const affirmation = contenu.affirmations.find((a) => a.n === n);
  const relance = affirmation && affirmation.relance ? affirmation.relance[role] : null;
  if (!relance) return null;

  const concernes = reponses.filter((r) => {
    const valeur = r.reponses[n - 1];
    const aRepondufaible = Number.isInteger(valeur) && valeur <= 1;
    return aRepondufaible && r.relances && Array.isArray(r.relances[n]) && r.relances[n].length > 0;
  });
  if (!assezDeMonde(concernes.length)) return null;

  const compte = new Map();
  concernes.forEach((r) => {
    r.relances[n].forEach((choix) => {
      compte.set(choix, (compte.get(choix) || 0) + 1);
    });
  });
  if (compte.size === 0) return null;

  let meilleur = null;
  compte.forEach((nombre, choix) => {
    if (!meilleur || nombre > meilleur.nombre) meilleur = { choix, nombre };
  });

  const libelle = meilleur.choix === 'autre'
    ? contenu.relance.autre
    : relance.choix[meilleur.choix];
  if (libelle == null) return null;

  return {
    debut: relance.debut,
    libelle,
    nombre: meilleur.nombre,
    part: pourcent(meilleur.nombre, concernes.length),
    effectif: concernes.length,
  };
}

// ----------------------------------------------------------------- dimensions

/** Le niveau de chaque dimension, pour une réponse. */
export function niveauxDe(ligne, contenu) {
  const sortie = {};
  contenu.dimensions.forEach((d) => {
    sortie[d.cle] = niveauDimension(ligne.reponses, d.affirmations);
  });
  return sortie;
}

/**
 * Pour chaque dimension, la part des répondants dans chaque couleur.
 * @returns [] si le groupe est trop petit.
 */
export function repartitionDimensions(reponses, contenu) {
  if (!assezDeMonde(reponses.length)) return [];
  return contenu.dimensions.map((d) => {
    const compte = { 3: 0, 2: 0, 1: 0, 0: 0 };
    reponses.forEach((r) => { compte[niveauDimension(r.reponses, d.affirmations)] += 1; });
    const total = reponses.length;
    return {
      cle: d.cle,
      nom: d.nom,
      effectif: total,
      niveaux: contenu.niveaux.map((niv) => ({
        niveau: niv,
        effectif: compte[niv.valeur],
        part: pourcent(compte[niv.valeur], total),
      })),
      // Sert au classement « ce qui porte » et « ce qui peut grandir ».
      partInstallee: pourcent(compte[3] + compte[2], total),
    };
  });
}

/** La part de répondants par carte d'ensemble reçue. */
export function cartesRecues(reponses, contenu) {
  if (!assezDeMonde(reponses.length)) return [];
  const compte = new Map();
  reponses.forEach((r) => {
    const m = r.reponses
      .slice(0, DERNIERE_AFFIRMATION_RESULTAT)
      .reduce((a, b) => a + b, 0) / DERNIERE_AFFIRMATION_RESULTAT;
    const carte = cartePourMoyenne(m, contenu);
    compte.set(carte.niveau, (compte.get(carte.niveau) || 0) + 1);
  });
  return contenu.cartes_ensemble.map((c) => {
    const niveau = contenu.niveaux.find((n) => n.cle === c.niveau);
    const effectif = compte.get(c.niveau) || 0;
    return { carte: c, niveau, effectif, part: pourcent(effectif, reponses.length) };
  });
}

/** Les 4 conditions des Fondations : part qui les vit déjà. */
export function fondations(reponses, contenu) {
  const noms = {
    confiance: 'La confiance',
    soutien: 'Le soutien',
    cohesion: 'La cohésion',
    engagement: "L'engagement",
  };
  return Object.entries(contenu.fondations).map(([cle, numeros]) => ({
    cle,
    nom: noms[cle] || cle,
    numeros,
    mesure: partAccord(reponses, numeros),
  }));
}

// -------------------------------------------------------------- qui a répondu

/** Le nombre de répondants par valeur d'un champ de profil. */
export function repartitionProfil(reponses, champ, choix, libelleVide = 'Sans réponse') {
  const compte = new Map();
  reponses.forEach((r) => {
    const v = r[champ] || libelleVide;
    compte.set(v, (compte.get(v) || 0) + 1);
  });
  const ordre = choix.concat([libelleVide]);
  return ordre
    .filter((v) => compte.has(v))
    .map((v) => ({
      libelle: v,
      effectif: compte.get(v),
      part: pourcent(compte.get(v), reponses.length),
    }));
}

/** Le classement des secteurs, les plus petits regroupés. */
export function classementSecteurs(reponses, garder = 6) {
  const compte = new Map();
  reponses.forEach((r) => {
    const s = r.secteur || 'Non précisé';
    compte.set(s, (compte.get(s) || 0) + 1);
  });
  const ranges = Array.from(compte.entries())
    .map(([libelle, effectif]) => ({ libelle, effectif }))
    .sort((a, b) => b.effectif - a.effectif || a.libelle.localeCompare(b.libelle, 'fr'));

  const tete = ranges.slice(0, garder);
  const reste = ranges.slice(garder);
  if (reste.length > 0) {
    tete.push({
      libelle: `Autres secteurs (${reste.length})`,
      effectif: reste.reduce((n, s) => n + s.effectif, 0),
    });
  }
  return tete.map((s) => ({ ...s, part: pourcent(s.effectif, reponses.length) }));
}

/** Le nombre de secteurs distincts représentés. */
export function nombreSecteurs(reponses) {
  const vus = new Set();
  reponses.forEach((r) => { if (r.secteur) vus.add(r.secteur); });
  return vus.size;
}

// -------------------------------------------------- managers face aux membres

/**
 * Pour chaque dimension, la part d'accord des managers et celle des membres,
 * et l'écart en points. Un groupe trop petit donne null.
 */
export function comparaisonRoles(reponses, contenu) {
  const managers = reponses.filter((r) => r.role === 'manager');
  const membres = reponses.filter((r) => r.role === 'membre');

  return contenu.dimensions.map((d) => {
    const a = partAccord(managers, d.affirmations);
    const b = partAccord(membres, d.affirmations);
    return {
      cle: d.cle,
      nom: d.nom,
      managers: a,
      membres: b,
      ecart: a && b ? a.part - b.part : null,
    };
  });
}

// ----------------------------------------------------------- le lien avec Q16

/**
 * Pour chaque dimension : la part d'accord au Q16 quand la dimension est
 * installée (Bien enraciné ou En croissance), comparée aux autres.
 */
export function lienResultats(reponses, contenu) {
  const Q16 = 16;
  return contenu.dimensions.map((d) => {
    const installee = [];
    const aConstruire = [];
    reponses.forEach((r) => {
      const niveau = niveauDimension(r.reponses, d.affirmations);
      (niveau >= 2 ? installee : aConstruire).push(r);
    });

    const mesure = (groupe) => {
      if (!assezDeMonde(groupe.length)) return null;
      const accord = groupe.filter((r) => ACCORD.includes(r.reponses[Q16 - 1])).length;
      return { part: pourcent(accord, groupe.length), effectif: groupe.length };
    };

    const a = mesure(installee);
    const b = mesure(aConstruire);
    return {
      cle: d.cle,
      nom: d.nom,
      installee: a,
      aConstruire: b,
      ecart: a && b ? a.part - b.part : null,
    };
  });
}

// ------------------------------------------------------------------ résumés

/**
 * Les indicateurs du haut de page.
 *
 * Deux d'entre eux ne concernent que le parcours en ligne : une réponse papier
 * n'a ni lien personnel ni questionnaire commencé. On les rapporte donc aux
 * réponses en ligne, jamais au total.
 */
export function indicateurs(reponses, entonnoir, contenu) {
  const managers = reponses.filter((r) => r.role === 'manager').length;
  const membres = reponses.filter((r) => r.role === 'membre').length;
  const enLigne = reponses.filter((r) => r.source === 'en_ligne').length;
  const papier = reponses.filter((r) => r.source === 'papier').length;

  const complete = entonnoir && entonnoir.commence
    ? pourcent(entonnoir.termine, entonnoir.commence)
    : null;

  return {
    repondants: reponses.length,
    managers,
    membres,
    enLigne,
    papier,
    completion: complete,
    termines: entonnoir ? entonnoir.termine : 0,
    commences: entonnoir ? entonnoir.commence : 0,
    secteurs: nombreSecteurs(reponses),
    secteursPossibles: contenu.profil.secteur.choix.length,
    liensCopies: entonnoir ? entonnoir.lien_copie : 0,
    // Rapporté aux réponses en ligne : une réponse papier n'a pas de lien.
    partLiensCopies: entonnoir && enLigne
      ? pourcent(entonnoir.lien_copie, enLigne)
      : null,
  };
}
