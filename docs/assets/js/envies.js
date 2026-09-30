/**
 * Les idées de la personne, reformulées.
 *
 * Module pur : aucun accès au DOM, aucun appel réseau.
 *
 * Quand la personne répond « Pas encore » ou « Un peu », elle coche ce qu'elle
 * aimerait. On lui rend ces idées dans son résultat, sous la dimension qu'elles
 * concernent. Ce sont des idées, pas des problèmes : on ne console pas, on ne
 * conseille pas, on ne suppose rien. Voir DECISIONS.md.
 *
 * Tous les textes viennent de contenu.json > envies. Rien n'est écrit en dur.
 */

import { AUTRE } from './lien.js';

/** L'affirmation des résultats n'appartient à aucune dimension. */
export const AFFIRMATION_RESULTATS = 16;

/** Les fragments d'une affirmation, dans la version du rôle. */
export function fragments(contenu, n, role) {
  const parAffirmation = contenu.envies.fragments[String(n)];
  if (!parAffirmation) return null;
  return parAffirmation[role] || parAffirmation.membre || null;
}

/**
 * Relie des fragments : « a », « a et b », « a, b et c ».
 * Majuscule au premier mot, point final.
 */
export function assembler(morceaux) {
  if (morceaux.length === 0) return '';
  const liste = morceaux.length === 1
    ? morceaux[0]
    : `${morceaux.slice(0, -1).join(', ')} et ${morceaux[morceaux.length - 1]}`;
  return `${liste.charAt(0).toUpperCase()}${liste.slice(1)}.`;
}

/**
 * Les fragments d'une affirmation, pour les choix cochés.
 * « Autre » n'a pas de texte : il vient en dernier, et seul il ne donne rien.
 */
function fragmentsDesChoix(contenu, n, role, choix) {
  const disponibles = fragments(contenu, n, role);
  if (!disponibles) return { textes: [], autre: false };

  const textes = [];
  let autre = false;

  choix.forEach((c) => {
    if (c === AUTRE) { autre = true; return; }
    const texte = disponibles[c];
    if (texte) textes.push(texte);
  });

  return { textes, autre };
}

/**
 * La phrase d'un ensemble d'affirmations, dans leur ordre.
 *
 * @param {number[]} numeros les affirmations à regrouper
 * @param {Object} relances { numéro: [choix] }
 * @returns {string} la phrase, ou une chaîne vide s'il n'y a rien à dire
 */
export function phrase(contenu, numeros, relances, role) {
  const morceaux = [];
  let autre = false;

  numeros
    .slice()
    .sort((a, b) => a - b)
    .forEach((n) => {
      const choix = relances[n];
      if (!Array.isArray(choix) || choix.length === 0) return;
      const trouve = fragmentsDesChoix(contenu, n, role, choix);
      morceaux.push(...trouve.textes);
      if (trouve.autre) autre = true;
    });

  // « Autre » seul, pour tout l'ensemble : la personne a une idée à préciser.
  if (morceaux.length === 0) return autre ? contenu.envies.autre_seul : '';

  if (autre) morceaux.push(contenu.envies.autre);
  return assembler(morceaux);
}

/**
 * Les idées à montrer, dimension par dimension.
 *
 * @param {Array} dimensions les dimensions classées, dans l'ordre d'affichage
 * @returns {Object} { cleDimension: phrase } pour les dimensions concernées
 */
export function parDimension(contenu, relances, role) {
  const sortie = {};
  contenu.dimensions.forEach((d) => {
    const texte = phrase(contenu, d.affirmations, relances, role);
    if (texte) sortie[d.cle] = texte;
  });
  return sortie;
}

/**
 * Les idées portées par l'affirmation 16.
 *
 * Elle n'appartient à aucune dimension et n'apparaît donc dans aucune bande :
 * ses idées vont dans un encadré à part, sous la dernière bande.
 */
export function pourLesResultats(contenu, relances, role) {
  return phrase(contenu, [AFFIRMATION_RESULTATS], relances, role);
}

/** Vrai si la personne a coché au moins une idée quelque part. */
export function auMoinsUneIdee(relances) {
  return Object.values(relances || {}).some((c) => Array.isArray(c) && c.length > 0);
}
