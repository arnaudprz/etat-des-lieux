/**
 * Configuration du front.
 * Seul fichier à modifier après un déploiement du backend.
 */

/**
 * La base : Supabase, projet greatly-intervenants, schéma etat_des_lieux (Arnaud, 12 octobre 2026 : « je ne veux plus
 * utiliser Google pour l'état des lieux »). On n'y entre que par les fonctions public.edl_* (migration 24).
 * La clé est la clé publique, faite pour être vue. Vide : tout le site tourne en démonstration.
 */
export const SUPABASE_URL = 'https://fmwkevzgpybdrkmjdmsu.supabase.co';
export const SUPABASE_CLE = 'sb_publishable_uEyhTVQfjBecgO5wZiwtzw_BPxuktUH';

/** Version du questionnaire. Sert de préfixe au lien personnel et de colonne dans le Sheet. */
export const VERSION_QUESTIONNAIRE = 'v1';

/** Cache-buster des imports. À incrémenter à chaque déploiement. */
export const V = 227;

/** Valeur affichée par le compteur si l'API ne répond pas. */
export const COMPTEUR_REPLI = 255;

/** Clé de sauvegarde du parcours en cours. */
export const CLE_SESSION_PARCOURS = 'greatly_edl_parcours';

/**
 * Mode démo : tout le site se parcourt sans backend, avec des données fictives
 * dans le tableau de bord. Actif si l'URL porte ?demo=1, ou si aucune base n'est
 * configurée.
 */
export function modeDemo() {
  try {
    if (new URLSearchParams(location.search).get('demo') === '1') return true;
  } catch (e) { /* environnement sans location */ }
  return SUPABASE_URL === '';
}
