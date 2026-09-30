/**
 * L'illustration qui correspond à un niveau.
 *
 * Module pur : aucune dépendance au DOM, pour que la correspondance soit
 * testable (voir tests/illustrations.test.js).
 *
 * Les illustrations sont décoratives : le nom du niveau est toujours écrit en
 * toutes lettres à côté. Elles sont chargées en image et non insérées dans la
 * page, car chacune porte ses propres identifiants de découpe, qui entreraient
 * en conflit si plusieurs vivaient dans le même document.
 */

/** Dossier des illustrations, depuis une page à la racine de docs/. */
export const DOSSIER = 'assets/img';

/** Le médaillon de la carte d'ensemble, pour une clé de niveau. */
export function medaillon(cleNiveau) {
  return `scene-${cleNiveau}.svg`;
}

/** La petite pousse de l'en-tête d'une colonne de couleur. */
export function icone(cleNiveau) {
  return `icone-${cleNiveau}.svg`;
}

/** Le chemin complet d'une illustration. */
export function chemin(fichier) {
  return `${DOSSIER}/${fichier}`;
}
