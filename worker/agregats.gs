/**
 * Les agrégats publics, pour la mise en perspective du résultat.
 *
 * C'est la seule lecture publique en dehors du compteur. Elle ne renvoie que
 * des parts, jamais une réponse individuelle, jamais un identifiant, jamais une
 * date. Un segment qui compte moins de SEUIL_SEGMENT personnes n'est pas
 * renvoyé du tout : on ne publie rien qui permettrait de remonter à quelqu'un.
 *
 * Mise en cache 6 heures : ces chiffres bougent lentement, et la page doit
 * rester rapide.
 */

/** Durée de vie du cache, en secondes. */
var AGREGATS_CACHE = 6 * 60 * 60;

/** En dessous, on ne publie rien pour ce segment. */
var SEUIL_SEGMENT = 30;

/** En dessous, on ne publie pas non plus l'ensemble. */
var SEUIL_ENSEMBLE = 100;

/** La clé d'un segment : même secteur, même taille d'équipe, même rôle. */
function cleDuSegment(ligne) {
  return [ligne.secteur || '', ligne.taille_equipe || '', ligne.role || ''].join('|');
}

/**
 * Le niveau d'une dimension pour une ligne : moyenne de ses affirmations,
 * arrondie à l'entier le plus proche, les égalités vers le haut.
 * Même règle que calcul.js côté navigateur.
 */
function niveauDimension(ligne, numeros) {
  var somme = 0;
  var compte = 0;
  for (var i = 0; i < numeros.length; i++) {
    var v = ligne['q' + numeros[i]];
    if (v === '' || v == null) return null;
    somme += Number(v);
    compte++;
  }
  if (compte === 0) return null;
  return Math.floor(somme / compte + 0.5);
}

/** Les parts par niveau, pour chaque dimension d'un groupe de lignes. */
function partsParDimension(lignes) {
  var sortie = {};
  DIMENSIONS.forEach(function (d) {
    var compte = { 0: 0, 1: 0, 2: 0, 3: 0 };
    var total = 0;
    lignes.forEach(function (l) {
      var niveau = niveauDimension(l, d.affirmations);
      if (niveau == null) return;
      compte[niveau]++;
      total++;
    });
    if (total === 0) return;
    var parts = {};
    // Des parts entre 0 et 1, arrondies au millième : pas de chiffre brut.
    [0, 1, 2, 3].forEach(function (v) {
      parts[v] = Math.round((compte[v] / total) * 1000) / 1000;
    });
    sortie[d.cle] = parts;
  });
  return sortie;
}

/**
 * Les agrégats publics.
 *
 * Seules les réponses en ligne entrent dans la comparaison : les réponses
 * papier ont été recueillies avec une autre échelle de mots.
 */
function agregatsPublics() {
  var cache = CacheService.getScriptCache();
  var garde = cache.get('agregats');
  if (garde) return JSON.parse(garde);

  var lignes = [];
  lignesDe(ONGLETS.reponses).forEach(function (l) {
    if (l.source === 'en_ligne') lignes.push(l);
  });

  var sortie = { ok: true, ensemble: null, segments: {} };

  if (lignes.length >= SEUIL_ENSEMBLE) {
    sortie.ensemble = {
      effectif: lignes.length,
      dimensions: partsParDimension(lignes)
    };
  }

  // Les segments assez fournis, et eux seuls.
  var parSegment = {};
  lignes.forEach(function (l) {
    var cle = cleDuSegment(l);
    if (!parSegment[cle]) parSegment[cle] = [];
    parSegment[cle].push(l);
  });

  Object.keys(parSegment).forEach(function (cle) {
    var groupe = parSegment[cle];
    if (groupe.length < SEUIL_SEGMENT) return;
    sortie.segments[cle] = {
      effectif: groupe.length,
      dimensions: partsParDimension(groupe)
    };
  });

  cache.put('agregats', JSON.stringify(sortie), AGREGATS_CACHE);
  return sortie;
}
