/**
 * Accès au tableau de bord : connexion Google, puis liste d'adresses autorisées.
 *
 * Le front obtient de Google un jeton d'identité (un JWT signé par Google) et
 * le transmet. On ne le décode pas soi-même : on le fait vérifier par Google,
 * qui contrôle la signature et l'expiration, puis on contrôle ce qui nous
 * regarde : qu'il a été émis pour notre site, et pour une adresse vérifiée.
 *
 * Qui entre :
 *   - le propriétaire, toujours, pour qu'il ne puisse pas s'enfermer dehors ;
 *   - les adresses de l'onglet `acces` du classeur, une par ligne.
 * Retirer une ligne ferme l'accès aussitôt : la liste est relue à chaque appel.
 */

/** L'identifiant OAuth du site. Public par nature : il figure aussi dans le front. */
var ID_CLIENT_GOOGLE = '1082440100848-sgfqrci3ni8atjo9kek8enb8ng1dudcm.apps.googleusercontent.com';

/** Toujours autorisé. */
var PROPRIETAIRE = 'arnaudprz@gmail.com';

var EMETTEURS_GOOGLE = ['accounts.google.com', 'https://accounts.google.com'];

/**
 * L'adresse de la personne connectée, si elle a le droit d'entrer.
 * @returns {string} l'adresse, ou '' si l'accès est refusé.
 */
function adminConnecte(jeton) {
  var email = emailDuJeton(jeton);
  if (!email) return '';
  return adresseAutorisee(email) ? email : '';
}

/** Vrai si l'adresse figure parmi les autorisées, sans tenir compte de la casse. */
function adresseAutorisee(email) {
  var cherchee = normaliserEmail(email);
  if (!cherchee) return false;
  return adressesAutorisees().indexOf(cherchee) !== -1;
}

/** Le propriétaire, plus l'onglet `acces`, créé vide au premier passage. */
function adressesAutorisees() {
  onglet(ONGLETS.acces, COLONNES.acces);
  var liste = [normaliserEmail(PROPRIETAIRE)];
  lignes(ONGLETS.acces).forEach(function (l) {
    var e = normaliserEmail(l.email);
    if (e && liste.indexOf(e) === -1) liste.push(e);
  });
  return liste;
}

function normaliserEmail(e) {
  return String(e == null ? '' : e).trim().toLowerCase();
}

/**
 * L'adresse portée par un jeton valide, ou '' sinon.
 *
 * Le résultat est gardé en cache jusqu'à l'expiration du jeton : on évite un
 * aller-retour chez Google à chaque filtre changé. Le cache ne garde que
 * l'adresse, la liste d'autorisation, elle, est toujours relue.
 */
function emailDuJeton(jeton) {
  if (!ID_CLIENT_GOOGLE || !jeton || typeof jeton !== 'string') return '';
  // Un JWT a trois segments ; le dernier, la signature, le rend unique.
  var segments = jeton.split('.');
  if (segments.length !== 3 || jeton.length > 4096) return '';

  var cache = CacheService.getScriptCache();
  var cleCache = 'jeton-' + segments[2].slice(-120);
  var connu = cache.get(cleCache);
  if (connu) return connu;

  var infos = verifierAupresDeGoogle(jeton);
  if (!infos) return '';

  var maintenant = Math.floor(Date.now() / 1000);
  var expire = Number(infos.exp);
  if (!(expire > maintenant)) return '';
  if (infos.aud !== ID_CLIENT_GOOGLE) return '';
  if (EMETTEURS_GOOGLE.indexOf(infos.iss) === -1) return '';
  if (String(infos.email_verified) !== 'true') return '';

  var email = normaliserEmail(infos.email);
  if (!email) return '';

  var duree = Math.min(expire - maintenant, 3600);
  if (duree > 0) cache.put(cleCache, email, duree);
  return email;
}

/** Le contenu du jeton, tel que Google l'atteste. null s'il est refusé. */
function verifierAupresDeGoogle(jeton) {
  try {
    var r = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(jeton),
      { muteHttpExceptions: true }
    );
    if (r.getResponseCode() !== 200) return null;
    return JSON.parse(r.getContentText());
  } catch (err) {
    Logger.log('verifierAupresDeGoogle : ' + err);
    return null;
  }
}

/**
 * À lancer une fois dans l'éditeur, après ajout de la connexion Google :
 * c'est ce qui fait demander à Google l'autorisation d'appeler l'extérieur.
 * Crée au passage l'onglet `acces`.
 */
function autoriserConnexionGoogle() {
  var r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=test', { muteHttpExceptions: true });
  adressesAutorisees();
  Logger.log('Google répond ' + r.getResponseCode() + ' (400 attendu) · onglet acces prêt.');
}
