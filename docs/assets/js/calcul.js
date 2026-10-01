/**
 * Calcul de l'état des lieux.
 *
 * Module pur : aucun accès au DOM, aucun appel réseau. Tout arrive en paramètre,
 * ce qui le rend testable avec node --test (voir tests/calcul.test.js).
 *
 * La logique de référence est maquette/Simulateur.dc.html, qui fait foi
 * (voir DECISIONS.md, « Règle de calcul qui fait foi »).
 *
 * Vocabulaire : une « valeur de niveau » va de 3 (Bien enraciné) à 0 (À semer),
 * comme le champ `valeur` de contenu.json > niveaux. Le simulateur, lui, indexe
 * les niveaux dans l'autre sens ; les comparaisons sont donc inversées ici.
 */

import { minusculeInitiale } from './typo.js';

/** Nombre d'affirmations du questionnaire. */
export const NB_AFFIRMATIONS = 16;

/**
 * Dernière affirmation qui entre dans le résultat.
 * Le Q16 (« Mon équipe obtient les résultats qu'elle vise. ») n'apparaît jamais
 * côté répondant : il sert seulement à la modélisation dans le tableau de bord.
 */
export const DERNIERE_AFFIRMATION_RESULTAT = 15;

/** Valeur de réponse la plus haute (Pleinement). */
export const VALEUR_MAX = 3;

// ---------------------------------------------------------------- utilitaires

/** Arrondi à l'entier le plus proche, les égalités vers le haut : 1,5 donne 2. */
export function arrondir(x) {
  return Math.floor(x + 0.5);
}

function moyenne(valeurs) {
  return valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
}

/** Vrai si `reponses` est bien 16 entiers de 0 à 3. */
export function reponsesValides(reponses) {
  return (
    Array.isArray(reponses) &&
    reponses.length === NB_AFFIRMATIONS &&
    reponses.every((v) => Number.isInteger(v) && v >= 0 && v <= VALEUR_MAX)
  );
}

// ------------------------------------------------------- niveau des dimensions

/**
 * Valeur de niveau d'une dimension : moyenne des réponses de ses affirmations,
 * arrondie à l'entier le plus proche, les égalités vers le haut.
 *
 * @param {number[]} reponses tableau de 16 valeurs de 0 à 3
 * @param {number[]} numeros numéros d'affirmation de la dimension, à partir de 1
 */
export function niveauDimension(reponses, numeros) {
  return arrondir(moyenne(numeros.map((n) => reponses[n - 1])));
}

/**
 * Les 8 dimensions, dans l'ordre de contenu.json, avec leur niveau et la phrase
 * qui correspond à ce niveau.
 */
export function dimensionsClassees(reponses, contenu) {
  return contenu.dimensions.map((d) => {
    const valeur = niveauDimension(reponses, d.affirmations);
    const niveau = contenu.niveaux.find((n) => n.valeur === valeur);
    return {
      cle: d.cle,
      nom: d.nom,
      valeur,
      niveau,
      phrase: d.phrases[niveau.cle],
    };
  });
}

// -------------------------------------------------------- carte d'ensemble

/**
 * Moyenne cachée des affirmations 1 à 15. Le Q16 est exclu.
 * Cette moyenne n'est jamais affichée au répondant.
 */
export function moyenneEnsemble(reponses) {
  return moyenne(reponses.slice(0, DERNIERE_AFFIRMATION_RESULTAT));
}

/**
 * La carte d'ensemble qui correspond à une moyenne, par seuil décroissant :
 * 2,5 Bien enraciné · 1,75 En croissance · 1 En germe · sinon À semer.
 *
 * Exposé à part de `carteEnsemble` pour pouvoir tester les bornes exactes des
 * seuils, qu'aucun jeu de 15 réponses entières ne peut produire.
 */
export function cartePourMoyenne(moyenneCachee, contenu) {
  const cartes = contenu.cartes_ensemble
    .slice()
    .sort((a, b) => b.seuil_min - a.seuil_min);
  return cartes.find((c) => moyenneCachee >= c.seuil_min) || cartes[cartes.length - 1];
}

/**
 * Le niveau de la carte d'ensemble, à partir des 8 dimensions et avec la même
 * règle d'arrondi qu'elles (égalités vers le haut).
 *
 * L'ancienne règle prenait la moyenne brute des affirmations 1 à 15 avec des
 * seuils 2,5 / 1,75 / 1 : les dimensions étaient tirées vers le haut, le titre
 * vers le bas, et le titre pouvait contredire les bandeaux (6 dimensions en
 * croissance sous « Une équipe en germe »). Voir DECISIONS.md, « Règle de
 * calcul qui fait foi ». `moyenneEnsemble` et `cartePourMoyenne` restent pour
 * les tests de bornes, mais ne décident plus de la carte du répondant.
 */
export function niveauEnsemble(dimensions) {
  return arrondir(moyenne(dimensions.map((d) => d.valeur)));
}

/** La carte d'ensemble d'un jeu de réponses. Le Q16 n'entre dans aucune dimension. */
export function carteEnsemble(reponses, contenu) {
  const valeur = niveauEnsemble(dimensionsClassees(reponses, contenu));
  const cle = contenu.niveaux.find((n) => n.valeur === valeur).cle;
  return contenu.cartes_ensemble.find((c) => c.niveau === cle);
}

// ------------------------------------------------- phrases de forme et d'appui

function bornes(dimensions) {
  const valeurs = dimensions.map((d) => d.valeur);
  return { haut: Math.max(...valeurs), bas: Math.min(...valeurs) };
}

/**
 * Phrase de forme, affichée après le texte de la carte :
 * toutes les dimensions au même niveau donne « homogène » ;
 * au moins 2 niveaux d'écart donne « contrasté » ; sinon rien.
 */
export function phraseForme(dimensions, contenu) {
  const { haut, bas } = bornes(dimensions);
  if (haut === bas) return contenu.phrases_forme.homogene;
  if (haut - bas >= 2) return contenu.phrases_forme.contraste;
  return '';
}

/**
 * Phrase d'appui « Ce qui vous porte le plus : x et y. », affichée si le meilleur
 * niveau est Bien enraciné ou En croissance, qu'au plus 2 dimensions le partagent,
 * et que le regard n'est pas homogène. Sinon chaîne vide.
 */
export function phraseAppui(dimensions, contenu) {
  const { haut, bas } = bornes(dimensions);
  if (haut === bas) return '';
  if (haut < 2) return '';
  const tetes = dimensions.filter((d) => d.valeur === haut);
  if (tetes.length > 2) return '';
  const noms = tetes.map((d) => minusculeInitiale(d.nom)).join(' et ');
  return contenu.phrases_forme.appui.replace('{dimensions}', noms);
}

// ------------------------------------------------------ colonnes de couleur

/**
 * Les colonnes de couleur, dans l'ordre de contenu.json (du plus installé au
 * moins installé). Les colonnes vides ne sont pas renvoyées.
 */
export function colonnes(dimensions, contenu) {
  return contenu.niveaux
    .map((niveau) => ({
      niveau,
      dimensions: dimensions.filter((d) => d.valeur === niveau.valeur),
    }))
    .filter((c) => c.dimensions.length > 0);
}

// ---------------------------------------------------------------- relances

/**
 * Le seuil en dessous duquel une affirmation ouvre sa question « J'aimerais… ».
 * Pas encore (0) et Un peu (1) l'ouvrent ; En bonne partie et Pleinement, non.
 */
export function seuilRelance(contenu) {
  const regles = (contenu && contenu.relance) || {};
  return regles.seuil_valeur_max != null ? regles.seuil_valeur_max : 1;
}

/** Vrai si cette réponse ouvre sa question « J'aimerais… ». */
export function ouvreUneRelance(valeur, contenu) {
  return Number.isInteger(valeur) && valeur <= seuilRelance(contenu);
}

/**
 * Les affirmations qui reçoivent une relance : toutes celles dont la réponse
 * est « Pas encore » ou « Un peu », sans limite de nombre.
 *
 * L'ancienne règle n'en retenait que les 2 plus réservées, ce qui faisait
 * disparaître un encadré déjà rempli quand on répondait plus bas. Voir
 * DECISIONS.md.
 *
 * Renvoyé dans l'ordre des affirmations. Les réponses manquantes sont ignorées,
 * ce qui permet d'appeler cette fonction pendant que le questionnaire se remplit.
 *
 * @returns {number[]} numéros d'affirmation, à partir de 1
 */
export function affirmationsRelancees(reponses, contenu) {
  return reponses
    .map((valeur, i) => ({ n: i + 1, valeur }))
    .filter((a) => ouvreUneRelance(a.valeur, contenu))
    .map((a) => a.n);
}

/**
 * Ne garde que les relances des affirmations dont la réponse finale les ouvre.
 * Les choix d'un encadré refermé restent en mémoire pendant la session, mais
 * ne partent pas.
 */
export function relancesAEnvoyer(reponses, relances, contenu) {
  const retenues = affirmationsRelancees(reponses, contenu);
  const sortie = {};
  retenues.forEach((n) => {
    const choix = relances[n];
    if (Array.isArray(choix) && choix.length > 0) sortie[n] = choix;
  });
  return sortie;
}

// ------------------------------------------------------------------ résultat

/**
 * Le résultat complet, prêt à afficher.
 * Ne contient aucun chiffre destiné au répondant : la moyenne reste interne.
 */
export function calculer(reponses, contenu) {
  if (!reponsesValides(reponses)) {
    throw new Error('Réponses invalides : 16 entiers de 0 à 3 attendus.');
  }
  const dimensions = dimensionsClassees(reponses, contenu);
  return {
    dimensions,
    carte: carteEnsemble(reponses, contenu),
    appui: phraseAppui(dimensions, contenu),
    forme: phraseForme(dimensions, contenu),
    colonnes: colonnes(dimensions, contenu),
  };
}
