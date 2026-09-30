/**
 * État des lieux d'équipe Greatly · backend Apps Script
 * Routeur des requêtes et outillage commun.
 *
 * Le front envoie tout en POST avec Content-Type: text/plain, ce qui évite la
 * requête preflight CORS. Les lectures publiques passent en GET.
 *
 * Rien n'est jamais écrit dans le repo : toutes les données vivent dans le Sheet.
 */

/** Noms des onglets du classeur. */
var ONGLETS = {
  reponses: 'reponses',
  evenements: 'evenements',
  contacts: 'contacts',
  papier: 'papier'
};

/** Colonnes de l'onglet reponses, dans l'ordre. */
function colonnesReponses() {
  var c = ['id', 'date', 'source', 'echelle', 'version', 'role', 'genre',
           'taille_entreprise', 'secteur', 'taille_equipe'];
  for (var i = 1; i <= NB_AFFIRMATIONS; i++) c.push('q' + i);
  for (var j = 1; j <= NB_AFFIRMATIONS; j++) c.push('relance_q' + j);
  c.push('ref_papier');
  return c;
}

var COLONNES = {
  evenements: ['date', 'session', 'type'],
  contacts: ['date', 'prenom', 'nom', 'entreprise', 'email', 'consentement']
};

// ------------------------------------------------------------------ routage

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, erreur: 'Requête vide.' });
    }
    if (!souslePlafond()) {
      return json({ ok: false, erreur: 'Trop de requêtes. Réessayez dans une minute.' });
    }

    var corps = JSON.parse(e.postData.contents);
    switch (corps.action) {
      case 'reponse':   return json(enregistrerReponse(corps));
      case 'evenement': return json(enregistrerEvenement(corps));
      case 'contact':   return json(enregistrerContact(corps));
      default:          return json({ ok: false, erreur: 'Action inconnue.' });
    }
  } catch (err) {
    Logger.log('doPost : ' + err);
    return json({ ok: false, erreur: 'Erreur serveur.' });
  }
}

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};

    // Lectures publiques. Elles ne renvoient que des totaux et des parts.
    if (p.action === 'compteur') return json(compteurPublic());
    if (p.action === 'agregats') return json(agregatsPublics());

    // Lectures protégées par clé.
    if (p.action === 'donnees') {
      if (!cleValide(p.cle)) return json({ ok: false, erreur: 'Clé invalide.' });
      return json(donneesTableauDeBord());
    }
    if (p.action === 'contacts_csv') {
      if (!cleValide(p.cle)) return texte('Clé invalide.');
      return csv(contactsCsv(), 'contacts-etat-des-lieux.csv');
    }

    return texte('État des lieux d’équipe Greatly · API active');
  } catch (err) {
    Logger.log('doGet : ' + err);
    return json({ ok: false, erreur: 'Erreur serveur.' });
  }
}

// --------------------------------------------------------------- outillage

function json(donnees) {
  return ContentService.createTextOutput(JSON.stringify(donnees))
    .setMimeType(ContentService.MimeType.JSON);
}

function texte(s) {
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT);
}

function csv(contenu, nomFichier) {
  return ContentService.createTextOutput(contenu)
    .setMimeType(ContentService.MimeType.CSV)
    .downloadAsFile(nomFichier);
}

function proprietes() {
  return PropertiesService.getScriptProperties();
}

/** La clé d'administration, gardée dans les Script Properties, jamais dans le code. */
function cleValide(cle) {
  var attendue = proprietes().getProperty('ADMIN_KEY');
  if (!attendue || !cle) return false;
  if (String(cle).length !== attendue.length) return false;
  // Comparaison à temps constant, pour ne rien laisser deviner.
  var ecart = 0;
  for (var i = 0; i < attendue.length; i++) {
    ecart |= attendue.charCodeAt(i) ^ String(cle).charCodeAt(i);
  }
  return ecart === 0;
}

/**
 * Limitation simple : un plafond d'écritures par minute, tous visiteurs confondus.
 * Apps Script ne donne pas l'adresse du client, on ne peut donc pas limiter par
 * personne. Le champ piège du formulaire complète cette protection.
 */
function souslePlafond() {
  var plafond = Number(proprietes().getProperty('PLAFOND_PAR_MINUTE') || 120);
  var cache = CacheService.getScriptCache();
  var cle = 'debit-' + Math.floor(Date.now() / 60000);
  var n = Number(cache.get(cle) || 0) + 1;
  cache.put(cle, String(n), 120);
  return n <= plafond;
}

/** Ouvre le classeur lié au script. */
function classeur() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/** Récupère un onglet, en le créant avec ses en-têtes s'il manque. */
function onglet(nom, entetes) {
  var s = classeur().getSheetByName(nom);
  if (!s) {
    s = classeur().insertSheet(nom);
    if (entetes) s.appendRow(entetes);
    return s;
  }
  if (entetes && s.getLastRow() === 0) s.appendRow(entetes);
  return s;
}

/**
 * Toutes les lignes d'un onglet, en objets indexés par en-tête.
 * `lignesDe` est le même service, sous un nom qui ne risque pas d'être masqué
 * par une variable locale.
 */
function lignesDe(nom) {
  return lignes(nom);
}

function lignes(nom) {
  var s = classeur().getSheetByName(nom);
  if (!s || s.getLastRow() < 2) return [];
  var valeurs = s.getDataRange().getValues();
  var entetes = valeurs.shift();
  return valeurs.map(function (ligne) {
    var o = {};
    entetes.forEach(function (cle, i) { o[cle] = ligne[i]; });
    return o;
  });
}

/** La date du jour, sans l'heure : on n'a pas besoin de savoir quand. */
function aujourdhui() {
  return Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
}

/** Identifiant aléatoire, sans lien avec quoi que ce soit. */
function identifiant() {
  return Utilities.getUuid();
}

/** Découpe une chaîne en respectant une longueur maximale. */
function tronquer(valeur, maximum) {
  return String(valeur == null ? '' : valeur).trim().slice(0, maximum);
}
