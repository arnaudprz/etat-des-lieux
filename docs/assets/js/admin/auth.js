/**
 * Accès au tableau de bord.
 *
 * La clé est saisie une fois et gardée en sessionStorage : elle disparaît à la
 * fermeture de l'onglet. Elle n'est jamais écrite dans l'URL ni dans le repo.
 *
 * En mode démo, aucune clé n'est demandée et aucune requête ne sort.
 */

import { CLE_SESSION_ADMIN, modeDemo } from '../config.js';
import { donneesAdmin, urlContactsCsv } from '../api.js';
import { donneesFictives, contactsFictifs } from './demo.js';

/** Lit la clé gardée pour cet onglet. */
export function cleGardee() {
  try {
    return sessionStorage.getItem(CLE_SESSION_ADMIN) || '';
  } catch (e) {
    return '';
  }
}

/** Garde la clé pour cet onglet. */
export function garderCle(cle) {
  try {
    sessionStorage.setItem(CLE_SESSION_ADMIN, cle);
  } catch (e) { /* stockage refusé : la clé sera redemandée */ }
}

/** Oublie la clé. */
export function oublierCle() {
  try {
    sessionStorage.removeItem(CLE_SESSION_ADMIN);
  } catch (e) { /* rien à faire */ }
}

/**
 * Charge les données du tableau de bord.
 * @returns {Promise<{ok: boolean, donnees?: object, erreur?: string}>}
 */
export async function chargerDonnees(contenu, cle) {
  if (modeDemo()) return { ok: true, donnees: donneesFictives(contenu) };

  const reponse = await donneesAdmin(cle);
  if (!reponse || reponse.ok !== true) {
    return { ok: false, erreur: 'Clé refusée, ou API injoignable.' };
  }
  return { ok: true, donnees: reponse };
}

/**
 * Charge les contacts, dans une requête séparée des réponses.
 * C'est ce qui garantit qu'aucune réponse d'API ne met côte à côte un
 * questionnaire et une identité.
 */
export async function chargerContacts(cle) {
  if (modeDemo()) return contactsFictifs();

  const url = urlContactsCsv(cle);
  if (!url) return [];
  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    return lireCsv(await r.text());
  } catch (e) {
    return [];
  }
}

/** L'adresse de téléchargement du CSV, pour le bouton d'export. */
export function lienExport(cle) {
  return modeDemo() ? '' : urlContactsCsv(cle);
}

/** Lit un CSV simple, en respectant les guillemets. */
export function lireCsv(texte) {
  const lignes = texte.trim().split(/\r?\n/);
  if (lignes.length < 2) return [];
  const entetes = decouper(lignes[0]);
  return lignes.slice(1).map((l) => {
    const champs = decouper(l);
    const o = {};
    entetes.forEach((cle, i) => { o[cle] = champs[i] || ''; });
    return o;
  });
}

function decouper(ligne) {
  const champs = [];
  let courant = '';
  let entreGuillemets = false;

  for (let i = 0; i < ligne.length; i += 1) {
    const c = ligne[i];
    if (entreGuillemets) {
      if (c === '"' && ligne[i + 1] === '"') { courant += '"'; i += 1; }
      else if (c === '"') entreGuillemets = false;
      else courant += c;
    } else if (c === '"') entreGuillemets = true;
    else if (c === ',') { champs.push(courant); courant = ''; }
    else courant += c;
  }
  champs.push(courant);
  return champs;
}
