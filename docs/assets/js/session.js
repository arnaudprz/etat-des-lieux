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

// --------------------------------------------------- mémoire durable du résultat

/**
 * Le dernier état des lieux terminé, gardé d'une visite à l'autre.
 *
 * sessionStorage disparaît à la fermeture de l'onglet : quelqu'un qui revient
 * le lendemain devait tout refaire. On garde donc le lien du résultat dans
 * localStorage. Ce lien ne contient que des chiffres de réponses, aucune donnée
 * personnelle, et il ne quitte jamais le navigateur.
 */
const CLE_RESULTAT = 'greatly_edl_resultat';

/** Retient le lien du résultat affiché. */
export function memoriserResultat(adresse) {
  try {
    localStorage.setItem(CLE_RESULTAT, adresse);
  } catch (e) { /* stockage refusé : on s'en passe */ }
}

/** Le dernier résultat connu sur cet appareil, ou null. */
export function resultatMemorise() {
  try {
    const v = localStorage.getItem(CLE_RESULTAT);
    return v && v.includes('#') ? v : null;
  } catch (e) {
    return null;
  }
}

/** Oublie le résultat mémorisé. */
export function oublierResultat() {
  try {
    localStorage.removeItem(CLE_RESULTAT);
  } catch (e) { /* rien à faire */ }
}

/**
 * Le profil, gardé d'une visite à l'autre.
 *
 * Il n'est pas dans le lien : sans ça, revenir sur « la première partie »
 * demandait de tout ressaisir dès que l'onglet avait été fermé. Ces réponses
 * restent sur l'appareil et ne sont jamais relues depuis le serveur, qui les
 * conserve sans aucun moyen de les rattacher à quelqu'un.
 */
const CLE_PROFIL = 'greatly_edl_profil';

/** Retient le profil saisi. */
export function memoriserProfil(profil, role) {
  try {
    localStorage.setItem(CLE_PROFIL, JSON.stringify({ profil, role }));
  } catch (e) { /* stockage refusé : on s'en passe */ }
}

/** Le dernier profil connu sur cet appareil, ou null. */
export function profilMemorise() {
  try {
    const brut = localStorage.getItem(CLE_PROFIL);
    if (!brut) return null;
    const v = JSON.parse(brut);
    return v && v.profil ? v : null;
  } catch (e) {
    return null;
  }
}

/**
 * Empreinte du dernier questionnaire envoyé au serveur.
 *
 * Revenir sur ses réponses et revalider sans rien changer créait une seconde
 * ligne identique en base. On retient donc ce qui a été envoyé, et on ne
 * renvoie pas deux fois la même chose.
 */
const CLE_ENVOI = 'greatly_edl_dernier_envoi';

/** Vrai si ce questionnaire a déjà été envoyé tel quel. */
export function dejaEnvoye(empreinte) {
  try {
    return localStorage.getItem(CLE_ENVOI) === empreinte;
  } catch (e) {
    return false;
  }
}

/** Retient l'empreinte du questionnaire envoyé. */
export function retenirEnvoi(empreinte) {
  try {
    localStorage.setItem(CLE_ENVOI, empreinte);
  } catch (e) { /* rien à faire */ }
}
