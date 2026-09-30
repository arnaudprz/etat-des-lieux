/**
 * Le lien personnel.
 *
 * Module pur : aucun accès au DOM, aucun appel réseau.
 *
 * Deux versions coexistent.
 *
 * v1 : `resultat.html#v1-{r}{16 chiffres}`, les réponses seules.
 * v2 : `resultat.html#v2-{r}{16 chiffres}` suivi, pour chaque affirmation qui
 *      porte des idées, de `-{n}.{choix}`. `n` est le numéro de l'affirmation,
 *      les choix sont leurs indices dans contenu.json, « a » pour « Autre »,
 *      sans séparateur et deux au plus.
 *      Exemple : #v2-m2211220023232212-3.14-7.04-8.1-15.a
 *
 * `r` vaut « m » pour un membre de l'équipe et « g » pour le manager.
 *
 * Le hash ne contient aucune donnée personnelle : rien que des chiffres de
 * réponse et des indices de choix. Il n'est jamais envoyé au serveur, et ne
 * permet pas de retrouver la ligne correspondante dans le Sheet.
 *
 * Les liens v1 déjà créés restent lisibles : ils affichent le résultat sans les
 * idées. Un lien v2 dont la partie « idées » est mal formée affiche lui aussi le
 * résultat, sans les idées, plutôt que de refuser tout le lien.
 */

import { NB_AFFIRMATIONS, VALEUR_MAX, reponsesValides } from './calcul.js';

/** Version produite par ce code. */
export const VERSION = 'v2';

/** Versions que ce code sait lire. */
export const VERSIONS_LUES = ['v1', 'v2'];

/** Page qui lit le lien. */
export const PAGE_RESULTAT = 'resultat.html';

/** La marque de « Autre » dans le hash, et dans les relances enregistrées. */
export const AUTRE = 'autre';
const LETTRE_AUTRE = 'a';

/** Nombre de choix au plus par affirmation, si contenu.json ne le dit pas. */
const MAX_CHOIX_DEFAUT = 2;

/** Lettre du hash pour chaque rôle. */
const LETTRE = { membre: 'm', manager: 'g' };
const ROLE = { m: 'membre', g: 'manager' };

const BASE = new RegExp(`^(v\\d+)-([mg])([0-${VALEUR_MAX}]{${NB_AFFIRMATIONS}})$`);
const SEGMENT = new RegExp(`^(\\d{1,2})\\.([0-9${LETTRE_AUTRE}]{1,4})$`);

/** Les rôles acceptés. */
export function rolesConnus() {
  return Object.keys(LETTRE);
}

function maxChoix(contenu) {
  const regles = (contenu && contenu.relance) || {};
  return regles.max_choix != null ? regles.max_choix : MAX_CHOIX_DEFAUT;
}

/** Un choix, du hash vers sa valeur enregistrée. */
function lireChoix(lettre) {
  return lettre === LETTRE_AUTRE ? AUTRE : Number(lettre);
}

/** Un choix, de sa valeur enregistrée vers le hash. */
function ecrireChoix(valeur) {
  return valeur === AUTRE ? LETTRE_AUTRE : String(valeur);
}

// ------------------------------------------------------------------ encodage

/**
 * Encode un rôle, 16 réponses et les idées cochées en jeton de hash.
 *
 * Sans idée, on produit tout de même un lien v2 : c'est la version courante, et
 * un lien sans segment se relit exactement comme un v1.
 *
 * @param {'membre'|'manager'} role
 * @param {number[]} reponses 16 valeurs de 0 à 3
 * @param {Object} relances { numéro: [indices ou 'autre'] }
 */
export function encoder(role, reponses, relances = {}) {
  const lettre = LETTRE[role];
  if (!lettre) throw new Error(`Rôle inconnu : ${role}`);
  if (!reponsesValides(reponses)) {
    throw new Error('Réponses invalides : 16 entiers de 0 à 3 attendus.');
  }

  const segments = Object.keys(relances)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= NB_AFFIRMATIONS)
    .sort((a, b) => a - b)
    .map((n) => {
      const choix = relances[n];
      if (!Array.isArray(choix) || choix.length === 0) return null;
      return `-${n}.${choix.map(ecrireChoix).join('')}`;
    })
    .filter(Boolean)
    .join('');

  return `${VERSION}-${lettre}${reponses.join('')}${segments}`;
}

// ------------------------------------------------------------------ décodage

/**
 * Lit la partie « idées » d'un lien v2.
 * @returns {Object|null} { numéro: [choix] }, ou null si quoi que ce soit cloche.
 */
function lireRelances(morceaux, reponses, role, contenu) {
  const sortie = {};
  const vus = new Set();
  const plafond = maxChoix(contenu);

  for (const morceau of morceaux) {
    const m = SEGMENT.exec(morceau);
    if (!m) return null;

    const n = Number(m[1]);
    if (!Number.isInteger(n) || n < 1 || n > NB_AFFIRMATIONS) return null;
    if (vus.has(n)) return null;
    vus.add(n);

    // Une idée ne peut porter que sur une réponse réservée.
    if (reponses[n - 1] > 1) return null;

    const choix = m[2].split('').map(lireChoix);
    if (choix.length > plafond) return null;
    if (new Set(choix.map(String)).size !== choix.length) return null;

    if (contenu) {
      const affirmation = contenu.affirmations.find((a) => a.n === n);
      const relance = affirmation && affirmation.relance ? affirmation.relance[role] : null;
      if (!relance) return null;
      const hors = choix.some((c) => c !== AUTRE && (c < 0 || c >= relance.choix.length));
      if (hors) return null;
    }

    sortie[n] = choix;
  }
  return sortie;
}

/**
 * Décode un jeton de hash. Accepte le dièse en tête et les espaces autour.
 *
 * @param {string} hash
 * @param {Object} [contenu] pour vérifier que les indices de choix existent
 * @returns {{version, role, reponses, relances}|null} null si le jeton est
 *   absent, mal formé, ou d'une version inconnue. Une partie « idées » mal
 *   formée ne fait pas échouer le lien : elle est simplement ignorée.
 */
export function decoder(hash, contenu) {
  if (typeof hash !== 'string') return null;

  const jeton = hash.trim().replace(/^#/, '');
  const morceaux = jeton.split('-');
  // La base tient sur les deux premiers morceaux : « v2 » et « m2211… ».
  const base = BASE.exec(morceaux.slice(0, 2).join('-'));
  if (!base) return null;

  const [, version, lettre, chiffres] = base;
  if (!VERSIONS_LUES.includes(version)) return null;

  const reponses = chiffres.split('').map(Number);
  const role = ROLE[lettre];

  // Un v1 ne porte jamais d'idées, et un segment de trop le rendrait suspect.
  if (version === 'v1') {
    if (morceaux.length > 2) return null;
    return { version, role, reponses, relances: {} };
  }

  const relances = lireRelances(morceaux.slice(2), reponses, role, contenu);
  return { version, role, reponses, relances: relances || {} };
}

// --------------------------------------------------------------------- URL

/** L'URL relative du résultat, à utiliser pour la redirection et pour la copie. */
export function lienResultat(role, reponses, relances = {}) {
  return `${PAGE_RESULTAT}#${encoder(role, reponses, relances)}`;
}

/** L'URL absolue du résultat, celle que le répondant garde en favoris. */
export function lienAbsolu(role, reponses, relances, base) {
  return new URL(lienResultat(role, reponses, relances), base).href;
}
