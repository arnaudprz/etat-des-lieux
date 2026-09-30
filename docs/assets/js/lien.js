/**
 * Le lien personnel.
 *
 * Module pur : aucun accès au DOM, aucun appel réseau.
 *
 * Format : resultat.html#v1-{r}{16 chiffres}, où r vaut « m » pour un membre de
 * l'équipe et « g » pour le manager. Exemple : #v1-m2211220023212212
 *
 * Le hash ne contient rien d'autre : ni identifiant, ni profil, ni relances, ni
 * date. Il n'est jamais envoyé au serveur, et ne permet pas de retrouver la ligne
 * correspondante dans le Sheet. La version « v1 » permet de faire évoluer le
 * questionnaire plus tard sans casser les anciens liens.
 */

import { NB_AFFIRMATIONS, VALEUR_MAX, reponsesValides } from './calcul.js';

/** Version du format de lien produite par ce code. */
export const VERSION = 'v1';

/** Page qui lit le lien. */
export const PAGE_RESULTAT = 'resultat.html';

/** Lettre du hash pour chaque rôle. */
const LETTRE = { membre: 'm', manager: 'g' };
const ROLE = { m: 'membre', g: 'manager' };

const MOTIF = new RegExp(`^(v\\d+)-([mg])([0-${VALEUR_MAX}]{${NB_AFFIRMATIONS}})$`);

/** Les rôles acceptés. */
export function rolesConnus() {
  return Object.keys(LETTRE);
}

/**
 * Encode un rôle et 16 réponses en jeton de hash, sans le dièse.
 * @returns {string} par exemple « v1-m2211220023212212 »
 */
export function encoder(role, reponses) {
  const lettre = LETTRE[role];
  if (!lettre) throw new Error(`Rôle inconnu : ${role}`);
  if (!reponsesValides(reponses)) {
    throw new Error('Réponses invalides : 16 entiers de 0 à 3 attendus.');
  }
  return `${VERSION}-${lettre}${reponses.join('')}`;
}

/**
 * Décode un jeton de hash. Accepte le dièse en tête et les espaces autour.
 * @returns {{version: string, role: string, reponses: number[]}|null} null si le
 *   jeton est absent, mal formé, ou d'une version inconnue.
 */
export function decoder(hash) {
  if (typeof hash !== 'string') return null;
  const jeton = hash.trim().replace(/^#/, '');
  const m = MOTIF.exec(jeton);
  if (!m) return null;
  const [, version, lettre, chiffres] = m;
  if (version !== VERSION) return null;
  return {
    version,
    role: ROLE[lettre],
    reponses: chiffres.split('').map(Number),
  };
}

/** L'URL relative du résultat, à utiliser pour la redirection et pour la copie. */
export function lienResultat(role, reponses) {
  return `${PAGE_RESULTAT}#${encoder(role, reponses)}`;
}

/** L'URL absolue du résultat, celle que le répondant garde en favoris. */
export function lienAbsolu(role, reponses, base) {
  return new URL(lienResultat(role, reponses), base).href;
}
