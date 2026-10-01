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
 * Enregistre un questionnaire terminé, sans faire attendre personne.
 *
 * Le résultat est calculé dans le navigateur, à partir des réponses : il ne
 * dépend pas du serveur. Attendre la réponse d'Apps Script avant de l'afficher
 * imposait plusieurs secondes d'écran figé, pour rien.
 *
 * `keepalive` laisse la requête se terminer après le changement de page : on
 * navigue tout de suite, l'enregistrement se fait derrière.
 */
export function envoyerReponse(reponse) {
  if (modeDemo() || !API_URL) return;
  try {
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'reponse', ...reponse }),
      keepalive: true,
    }).catch(() => { /* l'enregistrement ne doit jamais bloquer le parcours */ });
  } catch (e) { /* idem */ }
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

/**
 * Les agrégats publics, pour la mise en perspective du résultat.
 *
 * Ne renvoie que des parts, jamais une réponse individuelle. S'ils ne sont pas
 * disponibles, le résultat s'affiche sans les phrases de comparaison : cette
 * fonction ne lève jamais.
 */
export async function agregatsPublics() {
  const r = await lire({ action: 'agregats' });
  if (!r || r.ok !== true) return null;
  return r;
}

/** Les données du tableau de bord. Réservé aux comptes Google autorisés. */
export function donneesAdmin(jeton) {
  return lire({ action: 'donnees', jeton });
}

/** L'URL du CSV des contacts. Réservé aux comptes Google autorisés. */
export function urlContactsCsv(jeton) {
  if (!API_URL) return '';
  const url = new URL(API_URL);
  url.searchParams.set('action', 'contacts_csv');
  url.searchParams.set('jeton', jeton);
  return url.href;
}
