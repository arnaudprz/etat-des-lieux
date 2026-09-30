/**
 * Mémoire du parcours en cours.
 *
 * sessionStorage, pour que les réponses survivent à un retour en arrière mais
 * disparaissent à la fermeture de l'onglet. Toutes les lectures et écritures
 * sont protégées : un navigateur en navigation privée qui refuse le stockage ne
 * doit pas casser le parcours.
 */

import { CLE_SESSION_PARCOURS } from './config.js';

const VIDE = { role: null, profil: {}, reponses: [], relances: {}, session: null };

/** Lit l'état du parcours. Renvoie toujours un objet exploitable. */
export function lire() {
  try {
    const brut = sessionStorage.getItem(CLE_SESSION_PARCOURS);
    if (!brut) return { ...VIDE };
    return { ...VIDE, ...JSON.parse(brut) };
  } catch (e) {
    return { ...VIDE };
  }
}

/** Fusionne des champs dans l'état du parcours. */
export function ecrire(champs) {
  const etat = { ...lire(), ...champs };
  try {
    sessionStorage.setItem(CLE_SESSION_PARCOURS, JSON.stringify(etat));
  } catch (e) { /* stockage refusé : le parcours continue sans mémoire */ }
  return etat;
}

/** Efface l'état du parcours. */
export function effacer() {
  try {
    sessionStorage.removeItem(CLE_SESSION_PARCOURS);
  } catch (e) { /* rien à faire */ }
}

/**
 * Identifiant aléatoire de la visite, pour l'entonnoir.
 * Ne contient aucune donnée personnelle et ne sert qu'à relier visite, début et
 * fin d'un même passage. Jamais associé aux réponses enregistrées.
 */
export function idVisite() {
  const etat = lire();
  if (etat.session) return etat.session;
  let id;
  try {
    id = crypto.randomUUID();
  } catch (e) {
    id = 'v' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  ecrire({ session: id });
  return id;
}
