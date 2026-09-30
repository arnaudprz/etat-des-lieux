/**
 * La mise en perspective : « vous n'êtes pas seul ».
 *
 * Module pur : aucun accès au DOM, aucun appel réseau.
 *
 * Tant qu'il n'y a pas assez de répondants, rien ne s'affiche. C'est voulu :
 * une comparaison sur quelques dizaines de réponses ne dirait rien de juste, et
 * pourrait décourager à tort. Voir DECISIONS.md.
 *
 * Aucun chiffre, aucun pourcentage, aucun classement n'est montré : seulement
 * des phrases, et seulement quand elles sont fondées.
 */

/** Les niveaux considérés comme installés. */
const INSTALLE = [2, 3];

/** Les seuils, repris de contenu.json. */
export function seuils(contenu) {
  const c = (contenu.engagement && contenu.engagement.comparaison) || {};
  return {
    ensemble: c.seuil_ensemble != null ? c.seuil_ensemble : 100,
    segment: c.seuil_segment != null ? c.seuil_segment : 30,
  };
}

/**
 * Choisit sur quoi comparer : le segment de la personne s'il est assez fourni,
 * sinon l'ensemble, sinon rien.
 *
 * @param {Object} agregats la réponse de l'API : { ensemble, segments }
 * @param {Object} profil le profil de la personne
 * @returns {Object|null} { source, effectif, dimensions } ou null
 */
export function baseDeComparaison(agregats, profil, role, contenu) {
  if (!agregats || !agregats.ensemble) return null;
  const s = seuils(contenu);

  const cleSegment = cleDuSegment(profil, role);
  const segment = agregats.segments && agregats.segments[cleSegment];
  if (segment && segment.effectif >= s.segment) {
    return { source: 'segment', ...segment };
  }

  if (agregats.ensemble.effectif >= s.ensemble) {
    return { source: 'ensemble', ...agregats.ensemble };
  }

  return null;
}

/** La clé d'un segment : même secteur, même taille d'équipe, même rôle. */
export function cleDuSegment(profil, role) {
  const p = profil || {};
  return [p.secteur || '', p.taille_equipe || '', role || ''].join('|');
}

/**
 * Les dimensions les moins installées chez les autres répondants.
 * On retient celles dont la part installée est la plus faible.
 */
function moinsInstallees(base, combien = 3) {
  return Object.entries(base.dimensions || {})
    .map(([cle, parts]) => ({ cle, installee: partInstallee(parts) }))
    .sort((a, b) => a.installee - b.installee)
    .slice(0, combien)
    .map((d) => d.cle);
}

/** La part des répondants chez qui cette dimension est installée. */
function partInstallee(parts) {
  if (!parts) return 0;
  return INSTALLE.reduce((n, v) => n + (parts[v] || 0), 0);
}

/**
 * La phrase de mise en perspective d'une dimension, ou rien.
 *
 * @param {Object} dimension la dimension classée de la personne, avec sa valeur
 * @param {Object} base la base de comparaison
 */
export function phrasePour(dimension, base, contenu) {
  if (!base || !base.dimensions) return '';
  const parts = base.dimensions[dimension.cle];
  if (!parts) return '';

  const textes = contenu.engagement.comparaison;
  const chezLesAutres = partInstallee(parts);

  // Peu installée chez elle, et peu installée ailleurs aussi.
  if (dimension.valeur <= 1 && moinsInstallees(base).includes(dimension.cle)) {
    return textes.aussi_peu_installee;
  }

  // Bien enracinée chez elle, souvent en construction ailleurs.
  if (dimension.valeur === 3 && chezLesAutres < 0.5) {
    return textes.deja_la;
  }

  return '';
}

/**
 * Les phrases à montrer, par clé de dimension.
 * Vide tant que les seuils ne sont pas atteints, ou si l'API n'a pas répondu.
 */
export function phrases(dimensions, agregats, profil, role, contenu) {
  const base = baseDeComparaison(agregats, profil, role, contenu);
  if (!base) return {};

  const sortie = {};
  dimensions.forEach((d) => {
    const texte = phrasePour(d, base, contenu);
    if (texte) sortie[d.cle] = texte;
  });
  return sortie;
}

/** Vrai si la comparaison est active : le bandeau change alors de texte. */
export function comparaisonActive(agregats, profil, role, contenu) {
  return baseDeComparaison(agregats, profil, role, contenu) !== null;
}
