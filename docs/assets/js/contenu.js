/**
 * Chargement de contenu.json, source unique de tous les textes.
 * Le fichier est lu une seule fois par page puis mis en cache mémoire.
 */

import { V } from './config.js';

let promesse = null;

/** Charge contenu.json. Renvoie toujours la même promesse. */
export function chargerContenu() {
  if (!promesse) {
    // Résolu depuis ce module, pas depuis la page : docs/admin/ est un niveau
    // plus bas et n'a pas le même chemin de base.
    promesse = fetch(new URL(`../data/contenu.json?v=${V}`, import.meta.url))
      .then((r) => {
        if (!r.ok) throw new Error(`contenu.json : ${r.status}`);
        return r.json();
      });
  }
  return promesse;
}

/** Retrouve une dimension par sa clé. */
export function dimension(contenu, cle) {
  return contenu.dimensions.find((d) => d.cle === cle);
}

/** Retrouve un niveau par sa valeur (3 enraciné, 2 croissance, 1 germe, 0 à semer). */
export function niveauParValeur(contenu, valeur) {
  return contenu.niveaux.find((n) => n.valeur === valeur);
}

/** Retrouve une affirmation par son numéro (1 à 16). */
export function affirmation(contenu, n) {
  return contenu.affirmations.find((a) => a.n === n);
}

/** Le texte d'une affirmation dans la version qui correspond au rôle. */
export function texteAffirmation(contenu, n, role) {
  const a = affirmation(contenu, n);
  return a ? a[role] : '';
}

/** La relance d'une affirmation dans la version qui correspond au rôle. */
export function relance(contenu, n, role) {
  const a = affirmation(contenu, n);
  return a && a.relance ? a.relance[role] : null;
}
