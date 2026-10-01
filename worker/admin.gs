/**
 * Données du tableau de bord privé.
 *
 * Réservé aux comptes Google autorisés (voir acces.gs).
 *
 * Cette réponse ne contient jamais de contacts : les coordonnées passent par
 * l'action `contacts_csv`, séparée, pour qu'aucune réponse d'API ne mette côte à
 * côte un questionnaire et une identité.
 *
 * L'identifiant de ligne n'est pas renvoyé non plus : le tableau de bord n'en a
 * pas besoin, et ce qui ne sort pas ne peut pas fuir.
 */

/** Les lignes de réponses, débarrassées de leur identifiant. */
function reponsesAnonymes() {
  return lignes(ONGLETS.reponses).map(function (r) {
    var q = [];
    var relances = {};
    for (var i = 1; i <= NB_AFFIRMATIONS; i++) {
      var v = r['q' + i];
      q.push(v === '' || v == null ? null : Number(v));

      var brut = r['relance_q' + i];
      if (brut !== '' && brut != null) {
        relances[i] = String(brut).split('|').map(function (c) {
          return c === RELANCE_AUTRE ? RELANCE_AUTRE : Number(c);
        });
      }
    }
    return {
      date: formaterJour(r.date),
      source: r.source,
      echelle: r.echelle || ECHELLE_EN_LIGNE,
      version: r.version,
      role: r.role,
      genre: r.genre || '',
      taille_entreprise: r.taille_entreprise || '',
      secteur: r.secteur || '',
      taille_equipe: r.taille_equipe || '',
      reponses: q,
      relances: relances
    };
  });
}

/** Une date de cellule ramenée à une chaîne « aaaa-mm-jj ». */
function formaterJour(valeur) {
  if (valeur instanceof Date) {
    return Utilities.formatDate(valeur, 'Europe/Paris', 'yyyy-MM-dd');
  }
  return String(valeur || '');
}

/**
 * L'entonnoir : le nombre de visites distinctes à chaque étape.
 * On compte les sessions, pas les lignes, pour qu'un rechargement ne gonfle rien.
 */
function entonnoir() {
  var vus = {
    visite: {}, commence: {}, termine: {},
    lien_copie: {}, partage_accueil: {}, garder_page: {}
  };
  lignes(ONGLETS.evenements).forEach(function (e) {
    var type = e.type;
    if (!vus[type]) return;
    vus[type][String(e.session)] = true;
  });
  return {
    visite: Object.keys(vus.visite).length,
    commence: Object.keys(vus.commence).length,
    termine: Object.keys(vus.termine).length,
    lien_copie: Object.keys(vus.lien_copie).length,
    partage_accueil: Object.keys(vus.partage_accueil).length,
    garder_page: Object.keys(vus.garder_page).length
  };
}

/** Le nombre de demandes d'étude complète, sans aucun détail nominatif. */
function nombreContacts() {
  var s = classeur().getSheetByName(ONGLETS.contacts);
  if (!s || s.getLastRow() < 2) return 0;
  return s.getLastRow() - 1;
}

/** Tout ce dont le tableau de bord a besoin, sauf les contacts. */
function donneesTableauDeBord() {
  return {
    ok: true,
    genere_le: aujourdhui(),
    reponses: reponsesAnonymes(),
    entonnoir: entonnoir(),
    nombre_contacts: nombreContacts(),
    compteur: compteurPublic().total
  };
}
