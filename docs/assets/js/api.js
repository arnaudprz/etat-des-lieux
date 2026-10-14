/**
 * Appels à la base (Supabase, fonctions public.edl_*, migration 24).
 *
 * Plus de Google (Arnaud, 12 octobre 2026) : chaque action est une fonction de la base, appelée en POST avec la clé publique.
 * Le public ne peut que déposer (réponse, événement, demande d'étude) et lire deux totaux (compteur, agrégats) : il n'a aucun
 * accès aux tables.
 *
 * En mode démo, aucune requête ne sort : les réponses sont simulées. C'est ce qui
 * permet de parcourir tout le site en local, sans backend.
 */

import { SUPABASE_URL, SUPABASE_CLE, COMPTEUR_REPLI, modeDemo } from './config.js?v=71';

const ENTETES = () => ({ apikey: SUPABASE_CLE, Authorization: 'Bearer ' + SUPABASE_CLE, 'Content-Type': 'application/json' });
const adresse = (fonction) => SUPABASE_URL + '/rest/v1/rpc/' + fonction;

/** Appelle une fonction de la base. Ne lève jamais : renvoie { ok: false } en cas d'échec. */
async function appeler(fonction, charge, options = {}) {
  if (modeDemo() || !SUPABASE_URL) return { ok: true, demo: true };
  try {
    const r = await fetch(adresse(fonction), { method: 'POST', headers: ENTETES(), body: JSON.stringify(charge || {}), ...options });
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
 * dépend pas du serveur. Attendre la réponse du serveur avant de l'afficher
 * imposait plusieurs secondes d'écran figé, pour rien.
 *
 * `keepalive` laisse la requête se terminer après le changement de page : on
 * navigue tout de suite, l'enregistrement se fait derrière.
 */
export function envoyerReponse(reponse) {
  if (modeDemo() || !SUPABASE_URL) return;
  try {
    fetch(adresse('edl_repondre'), {
      method: 'POST',
      headers: ENTETES(),
      body: JSON.stringify({ p: reponse }),
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
  return appeler('edl_evenement', { p_type: type, p_session: session });
}

/**
 * Enregistre une demande d'étude complète.
 * Stockée dans une table séparée, jamais reliée aux réponses ni à la session.
 * Aucun e-mail n'est envoyé.
 */
export function envoyerContact(contact) {
  return appeler('edl_contact', { p: contact });
}

/** Le compteur de l'accueil. Retombe sur la valeur de repli si l'API ne répond pas. */
export async function compteur() {
  const r = await appeler('edl_compteur');
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
  const r = await appeler('edl_agregats');
  if (!r || r.ok !== true) return null;
  return r;
}
