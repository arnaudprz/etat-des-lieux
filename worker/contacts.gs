/**
 * Demandes de l'étude complète.
 *
 * Ces coordonnées sont la seule donnée personnelle collectée. Elles vivent dans
 * une feuille séparée et ne portent aucun identifiant de réponse ni de visite :
 * il n'existe aucun moyen, même technique, de les relier à un questionnaire.
 *
 * Aucun e-mail n'est envoyé par ce script.
 */

/** Forme d'adresse acceptée. Volontairement permissive. */
function emailPlausible(valeur) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valeur);
}

/** Enregistre une demande d'étude complète. */
function enregistrerContact(corps) {
  // Champ piège : un robot le remplit, une personne ne le voit pas.
  // On répond ok pour ne pas lui apprendre qu'il a été repéré.
  if (tronquer(corps.site, 200) !== '') return { ok: true };

  if (corps.consentement !== true) return { ok: false, erreur: 'Consentement requis.' };

  var contact = {
    prenom: tronquer(corps.prenom, 80),
    nom: tronquer(corps.nom, 80),
    entreprise: tronquer(corps.entreprise, 120),
    email: tronquer(corps.email, 160).toLowerCase()
  };

  if (!contact.prenom || !contact.nom || !contact.entreprise) {
    return { ok: false, erreur: 'Coordonnées incomplètes.' };
  }
  if (!emailPlausible(contact.email)) return { ok: false, erreur: 'Adresse invalide.' };

  onglet(ONGLETS.contacts, COLONNES.contacts).appendRow([
    aujourdhui(),
    contact.prenom,
    contact.nom,
    contact.entreprise,
    contact.email,
    'oui'
  ]);

  return { ok: true };
}

/**
 * Les contacts au format CSV.
 *
 * Servi par une action distincte de `donnees` : le script ne renvoie jamais les
 * contacts et les réponses dans une même réponse d'API.
 */
function contactsCsv() {
  var toutes = lignes(ONGLETS.contacts);
  var entetes = COLONNES.contacts;
  var sortie = [entetes.join(',')];

  toutes.forEach(function (c) {
    sortie.push(entetes.map(function (cle) {
      return champCsv(c[cle]);
    }).join(','));
  });

  return sortie.join('\r\n');
}

/** Échappe un champ CSV. La date est remise au format jour. */
function champCsv(valeur) {
  if (valeur == null) return '';
  var s = (valeur instanceof Date)
    ? Utilities.formatDate(valeur, 'Europe/Paris', 'yyyy-MM-dd')
    : String(valeur);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
