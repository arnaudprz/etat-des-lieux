/**
 * Appels à l'API.
 *
 * Tout part en POST avec Content-Type: text/plain, ce qui évite la requête
 * preflight CORS avec Apps Script (même choix que Greatly-retours).
 *
 * En mode démo, aucune requête ne sort : les réponses sont simulées. C'est ce qui
 * permet de parcourir tout le site en local, sans backend.
 */

import { API_URL, COMPTEUR_REPLI, modeDemo } from './config.js';

/** Envoie une action au backend. Ne lève jamais : renvoie { ok: false } en cas d'échec. */
async function poster(action, charge) {
  if (modeDemo() || !API_URL) return { ok: true, demo: true };
  try {
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...charge }),
    });
    if (!r.ok) return { ok: false, statut: r.status };
    return await r.json();
  } catch (e) {
    return { ok: false, erreur: String(e) };
  }
}

async function lire(params) {
  if (modeDemo() || !API_URL) return { ok: true, demo: true };
  try {
    const url = new URL(API_URL);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const r = await fetch(url, { method: 'GET' });
    if (!r.ok) return { ok: false, statut: r.status };
    return await r.json();
  } catch (e) {
    return { ok: false, erreur: String(e) };
  }
}

/**
 * Enregistre un questionnaire terminé.
 * Le hash du lien personnel n'est jamais envoyé : seules les réponses brutes,
 * le profil et les relances partent, sans identifiant de session.
 */
export function envoyerReponse(reponse) {
  return poster('reponse', reponse);
}

/**
 * Enregistre un événement d'entonnoir.
 * @param {'visite'|'commence'|'termine'|'lien_copie'|'partage_accueil'|'garder_page'} type
 * @param {string} session identifiant aléatoire propre à la visite
 */
export function envoyerEvenement(type, session) {
  return poster('evenement', { type, session });
}

/**
 * Enregistre une demande d'étude complète.
 * Stockée dans une feuille séparée, jamais reliée aux réponses ni à la session.
 * Aucun e-mail n'est envoyé.
 */
export function envoyerContact(contact) {
  return poster('contact', contact);
}

/** Le compteur de l'accueil. Retombe sur la valeur de repli si l'API ne répond pas. */
export async function compteur() {
  const r = await lire({ action: 'compteur' });
  if (r && typeof r.total === 'number') return r.total;
  return COMPTEUR_REPLI;
}

/** Les données du tableau de bord. Protégé par clé. */
export function donneesAdmin(cle) {
  return lire({ action: 'donnees', cle });
}

/** L'URL d'export CSV des contacts. Protégé par clé. */
export function urlContactsCsv(cle) {
  if (!API_URL) return '';
  const url = new URL(API_URL);
  url.searchParams.set('action', 'contacts_csv');
  url.searchParams.set('cle', cle);
  return url.href;
}
