/**
 * Import des réponses papier.
 *
 * On saisit les réponses dans l'onglet `papier`, puis on lance `importerPapier`
 * depuis l'éditeur Apps Script. Chaque ligne est vérifiée comme si elle arrivait
 * du formulaire. Les lignes déjà importées sont reconnues par leur `ref_papier`
 * et ignorées : relancer l'import ne crée jamais de doublon.
 *
 * Le profil et les relances sont facultatifs sur papier.
 */

/** Colonnes attendues dans l'onglet papier. */
function colonnesPapier() {
  var c = ['ref_papier', 'date', 'role', 'genre',
           'taille_entreprise', 'secteur', 'taille_equipe'];
  for (var i = 1; i <= NB_AFFIRMATIONS; i++) c.push('q' + i);
  for (var j = 1; j <= NB_AFFIRMATIONS; j++) c.push('relance_q' + j);
  return c;
}

/** Prépare l'onglet papier avec ses en-têtes. À lancer une fois. */
function preparerOngletPapier() {
  onglet(ONGLETS.papier, colonnesPapier());
  return 'Onglet « papier » prêt.';
}

/** Les références papier déjà présentes dans l'onglet reponses. */
function refsDejaImportees() {
  var vues = {};
  lignes(ONGLETS.reponses).forEach(function (r) {
    var ref = String(r.ref_papier || '').trim();
    if (ref !== '') vues[ref] = true;
  });
  return vues;
}

/** Le profil d'une ligne papier. Chaque champ absent reste vide. */
function profilPapier(ligne) {
  var sortie = { genre: '', taille_entreprise: '', secteur: '', taille_equipe: '' };
  var champs = ['genre', 'taille_entreprise', 'secteur', 'taille_equipe'];
  for (var i = 0; i < champs.length; i++) {
    var cle = champs[i];
    var v = tronquer(ligne[cle], 120);
    if (v === '') continue;
    if (!dansListe(v, CHOIX_PROFIL[cle])) return null;
    sortie[cle] = v;
  }
  return sortie;
}

/** Les relances d'une ligne papier, reprises des colonnes relance_qN. */
function relancesPapier(ligne, reponses, role) {
  var brut = {};
  for (var i = 1; i <= NB_AFFIRMATIONS; i++) {
    var valeur = String(ligne['relance_q' + i] == null ? '' : ligne['relance_q' + i]).trim();
    if (valeur === '') continue;
    brut[i] = valeur.split('|').map(function (c) {
      var t = c.trim();
      return t === RELANCE_AUTRE ? RELANCE_AUTRE : Number(t);
    });
  }
  return relancesValides(brut, reponses, role);
}

/**
 * Copie l'onglet papier vers l'onglet reponses.
 * À lancer depuis l'éditeur Apps Script.
 *
 * @return {string} un compte rendu lisible.
 */
function importerPapier() {
  var aImporter = lignes(ONGLETS.papier);
  if (aImporter.length === 0) return 'Rien à importer : l’onglet « papier » est vide.';

  var deja = refsDejaImportees();
  var importees = 0;
  var ignorees = 0;
  var refusees = [];

  aImporter.forEach(function (ligne, index) {
    var numero = index + 2; // ligne 1 = en-têtes
    var ref = String(ligne.ref_papier || '').trim();

    if (ref === '') { refusees.push(numero + ' : ref_papier manquante'); return; }
    if (deja[ref]) { ignorees++; return; }

    var role = tronquer(ligne.role, 20);
    if (!dansListe(role, ROLES)) { refusees.push(numero + ' : rôle « ' + role + ' »'); return; }

    var brutes = [];
    for (var i = 1; i <= NB_AFFIRMATIONS; i++) brutes.push(ligne['q' + i]);
    var reponses = reponsesValides(brutes);
    if (!reponses) { refusees.push(numero + ' : réponses incomplètes ou hors de 0 à 3'); return; }

    var profil = profilPapier(ligne);
    if (!profil) { refusees.push(numero + ' : profil hors des choix connus'); return; }

    var relances = relancesPapier(ligne, reponses, role);
    if (!relances) { refusees.push(numero + ' : relances invalides'); return; }

    ecrireReponse({
      source: 'papier',
      // Les réponses papier ont été recueillies avec l'échelle d'accord.
      echelle: ECHELLE_PAPIER,
      version: VERSIONS[0],
      role: role,
      profil: profil,
      reponses: reponses,
      relances: relances,
      date: formaterJour(ligne.date) || aujourdhui(),
      ref_papier: ref
    });

    deja[ref] = true; // protège aussi des doublons à l'intérieur du même onglet
    importees++;
  });

  CacheService.getScriptCache().remove('compteur');

  var rapport = importees + ' ligne(s) importée(s), '
    + ignorees + ' déjà présente(s), '
    + refusees.length + ' refusée(s).';
  if (refusees.length > 0) rapport += '\n\nLignes refusées :\n' + refusees.join('\n');

  Logger.log(rapport);
  return rapport;
}
