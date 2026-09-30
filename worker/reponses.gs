/**
 * Enregistrement des questionnaires terminés et des événements d'entonnoir.
 *
 * Validation stricte : tout ce qui ne correspond pas exactement aux valeurs
 * autorisées de contenu.gs est rejeté, sans message détaillé.
 */

/** Vrai si la valeur figure dans la liste. */
function dansListe(valeur, liste) {
  return liste.indexOf(valeur) >= 0;
}

/**
 * Valide et normalise 16 réponses.
 * @return {number[]|null} le tableau, ou null si quoi que ce soit cloche.
 */
function reponsesValides(brut) {
  if (!Array.isArray(brut) || brut.length !== NB_AFFIRMATIONS) return null;
  var sorties = [];
  for (var i = 0; i < brut.length; i++) {
    var v = Number(brut[i]);
    if (!isFinite(v) || Math.floor(v) !== v || v < 0 || v > VALEUR_MAX) return null;
    sorties.push(v);
  }
  return sorties;
}

/**
 * Valide les relances.
 *
 * Règles : au plus RELANCE_MAX_AFFIRMATIONS affirmations relancées, au plus
 * RELANCE_MAX_CHOIX choix chacune, et seules les affirmations dont la réponse ne
 * dépasse pas le seuil peuvent en porter une. Les indices doivent exister.
 *
 * @return {Object|null} objet { numero: [choix] }, ou null si invalide.
 */
function relancesValides(brut, reponses, role) {
  if (brut == null) return {};
  if (typeof brut !== 'object' || Array.isArray(brut)) return null;

  var numeros = Object.keys(brut);
  if (numeros.length > RELANCE_MAX_AFFIRMATIONS) return null;

  var sortie = {};
  for (var i = 0; i < numeros.length; i++) {
    var n = Number(numeros[i]);
    if (!isFinite(n) || n < 1 || n > NB_AFFIRMATIONS) return null;
    if (reponses[n - 1] > RELANCE_SEUIL_VALEUR_MAX) return null;

    var choix = brut[numeros[i]];
    if (!Array.isArray(choix)) return null;
    if (choix.length > RELANCE_MAX_CHOIX) return null;

    var maximum = (NB_CHOIX_RELANCE[role] || {})[String(n)];
    if (maximum == null) return null;

    var propres = [];
    for (var k = 0; k < choix.length; k++) {
      var c = choix[k];
      if (c === RELANCE_AUTRE) { propres.push(RELANCE_AUTRE); continue; }
      var idx = Number(c);
      if (!isFinite(idx) || Math.floor(idx) !== idx || idx < 0 || idx >= maximum) return null;
      propres.push(idx);
    }
    // Pas deux fois le même choix.
    var vus = {};
    for (var m = 0; m < propres.length; m++) {
      var cle = String(propres[m]);
      if (vus[cle]) return null;
      vus[cle] = true;
    }
    if (propres.length > 0) sortie[n] = propres;
  }
  return sortie;
}

/**
 * Valide le profil. Seul le genre est facultatif ; les autres champs doivent
 * porter une valeur de la liste.
 */
function profilValide(brut) {
  var p = brut || {};
  var sortie = {};
  var obligatoires = ['role', 'taille_entreprise', 'secteur', 'taille_equipe'];

  for (var i = 0; i < obligatoires.length; i++) {
    var cle = obligatoires[i];
    var v = tronquer(p[cle], 120);
    if (!dansListe(v, CHOIX_PROFIL[cle])) return null;
    sortie[cle] = v;
  }

  var genre = tronquer(p.genre, 120);
  if (genre !== '' && !dansListe(genre, CHOIX_PROFIL.genre)) return null;
  sortie.genre = genre;

  return sortie;
}

/** Enregistre un questionnaire terminé. */
function enregistrerReponse(corps) {
  if (!dansListe(corps.version, VERSIONS)) return { ok: false, erreur: 'Version inconnue.' };
  if (!dansListe(corps.role, ROLES)) return { ok: false, erreur: 'Rôle inconnu.' };

  var reponses = reponsesValides(corps.reponses);
  if (!reponses) return { ok: false, erreur: 'Réponses invalides.' };

  var profil = profilValide(corps.profil);
  if (!profil) return { ok: false, erreur: 'Profil invalide.' };

  var relances = relancesValides(corps.relances, reponses, corps.role);
  if (!relances) return { ok: false, erreur: 'Relances invalides.' };

  ecrireReponse({
    source: 'en_ligne',
    echelle: ECHELLE_EN_LIGNE,
    version: corps.version,
    role: corps.role,
    profil: profil,
    reponses: reponses,
    relances: relances,
    ref_papier: ''
  });

  // Le compteur change : son cache n'a plus lieu d'être.
  CacheService.getScriptCache().remove('compteur');

  return { ok: true };
}

/**
 * Écrit une ligne dans l'onglet reponses.
 * Sert aussi à l'import papier, d'où le paramètre `source`.
 */
function ecrireReponse(donnees) {
  var entetes = colonnesReponses();
  var feuille = onglet(ONGLETS.reponses, entetes);

  var ligne = {};
  ligne.id = identifiant();
  ligne.date = donnees.date || aujourdhui();
  ligne.source = donnees.source;
  ligne.echelle = donnees.echelle || ECHELLE_EN_LIGNE;
  ligne.version = donnees.version;
  ligne.role = donnees.role;
  ligne.genre = donnees.profil.genre || '';
  ligne.taille_entreprise = donnees.profil.taille_entreprise || '';
  ligne.secteur = donnees.profil.secteur || '';
  ligne.taille_equipe = donnees.profil.taille_equipe || '';
  ligne.ref_papier = donnees.ref_papier || '';

  for (var i = 1; i <= NB_AFFIRMATIONS; i++) {
    ligne['q' + i] = donnees.reponses[i - 1];
    var choix = donnees.relances[i];
    ligne['relance_q' + i] = choix ? choix.join('|') : '';
  }

  feuille.appendRow(entetes.map(function (cle) { return ligne[cle]; }));
}

/**
 * Enregistre un événement d'entonnoir.
 * Ne contient que la date, un identifiant de visite aléatoire et le type.
 */
function enregistrerEvenement(corps) {
  var types = ['visite', 'commence', 'termine', 'lien_copie'];
  if (!dansListe(corps.type, types)) return { ok: false, erreur: 'Type inconnu.' };

  var session = tronquer(corps.session, 64);
  if (session === '') return { ok: false, erreur: 'Visite inconnue.' };

  onglet(ONGLETS.evenements, COLONNES.evenements)
    .appendRow([aujourdhui(), session, corps.type]);

  return { ok: true };
}

/**
 * Compteur public : réponses papier plus réponses en ligne terminées.
 *
 * Tant qu'aucune ligne papier n'est importée, on prend la valeur de base. Dès
 * qu'il y en a, on compte les lignes réelles : jamais de double comptage.
 * Mis en cache 10 minutes.
 */
function compteurPublic() {
  var cache = CacheService.getScriptCache();
  var garde = cache.get('compteur');
  if (garde) return { ok: true, total: Number(garde) };

  var base = Number(proprietes().getProperty('PAPIER_BASE') || PAPIER_BASE_DEFAUT);
  var toutes = lignes(ONGLETS.reponses);

  var papier = 0;
  var enLigne = 0;
  toutes.forEach(function (r) {
    if (r.source === 'papier') papier++;
    else if (r.source === 'en_ligne') enLigne++;
  });

  var total = (papier > 0 ? papier : base) + enLigne;
  cache.put('compteur', String(total), 600);
  return { ok: true, total: total };
}
