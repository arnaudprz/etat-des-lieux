/**
 * Configuration du front.
 * Seul fichier à modifier après un déploiement du backend.
 */

/** URL de l'application web Apps Script. Vide tant que le backend n'est pas déployé. */
export const API_URL = 'https://script.google.com/macros/s/AKfycbxxpB0S-UJCxRvsxEJs2zG80FbEwZxXg8f2nx1XWBnYoLb8mfFClvZzSwdrvh6YwThm/exec';

/** Version du questionnaire. Sert de préfixe au lien personnel et de colonne dans le Sheet. */
export const VERSION_QUESTIONNAIRE = 'v1';

/** Cache-buster des imports. À incrémenter à chaque déploiement. */
export const V = 27;

/** Valeur affichée par le compteur si l'API ne répond pas. */
export const COMPTEUR_REPLI = 255;

/**
 * Identifiant OAuth du site, pour la connexion Google du tableau de bord.
 * Public par nature. Le même figure dans worker/acces.gs.
 */
export const ID_CLIENT_GOOGLE = '1082440100848-sgfqrci3ni8atjo9kek8enb8ng1dudcm.apps.googleusercontent.com';

/** Clé de session du jeton Google du tableau de bord (jamais persisté au-delà de l'onglet). */
export const CLE_SESSION_ADMIN = 'greatly_edl_admin';

/** Clé de sauvegarde du parcours en cours. */
export const CLE_SESSION_PARCOURS = 'greatly_edl_parcours';

/**
 * Mode démo : tout le site se parcourt sans backend, avec des données fictives
 * dans le tableau de bord. Actif si l'URL porte ?demo=1, ou tant qu'aucune API
 * n'est configurée (c'est le cas de la version locale).
 */
export function modeDemo() {
  try {
    if (new URLSearchParams(location.search).get('demo') === '1') return true;
  } catch (e) { /* environnement sans location */ }
  return API_URL === '';
}
