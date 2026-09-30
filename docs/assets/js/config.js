/**
 * Configuration du front.
 * Seul fichier à modifier après un déploiement du backend.
 */

/** URL de l'application web Apps Script. Vide tant que le backend n'est pas déployé. */
export const API_URL = '';

/** Version du questionnaire. Sert de préfixe au lien personnel et de colonne dans le Sheet. */
export const VERSION_QUESTIONNAIRE = 'v1';

/** Cache-buster des imports. À incrémenter à chaque déploiement. */
export const V = 5;

/** Valeur affichée par le compteur si l'API ne répond pas. */
export const COMPTEUR_REPLI = 255;

/** Clé de session du tableau de bord (jamais persistée au-delà de l'onglet). */
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
