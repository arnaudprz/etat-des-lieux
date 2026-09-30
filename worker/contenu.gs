/**
 * Valeurs autorisées, extraites de contenu.json.
 *
 * FICHIER GÉNÉRÉ : ne pas modifier à la main.
 * Régénérer avec : node scripts/generer-contenu-gs.mjs
 *
 * Source : contenu.json version 2026-09-30
 */

/** Nombre d'affirmations du questionnaire. */
var NB_AFFIRMATIONS = 16;

/** Valeur de réponse la plus haute. Les réponses vont de 0 à cette valeur. */
var VALEUR_MAX = 3;

/** Versions de questionnaire acceptées. */
var VERSIONS = ['v1'];

/** Rôles acceptés. */
var ROLES = ['membre', 'manager'];

/** Sources acceptées pour une ligne de réponses. */
var SOURCES = ['en_ligne', 'papier'];

/** Règles des relances. */
var RELANCE_MAX_CHOIX = 2;
var RELANCE_MAX_AFFIRMATIONS = 2;
var RELANCE_SEUIL_VALEUR_MAX = 1;
var RELANCE_AUTRE = "autre";

/** Nombre de réponses papier connues avant tout import. */
var PAPIER_BASE_DEFAUT = 255;

/** Choix acceptés pour chaque champ de profil. Le rôle est traité à part. */
var CHOIX_PROFIL = {
  "role": [
    "Le manager",
    "Un membre de l'équipe"
  ],
  "genre": [
    "Une femme",
    "Un homme",
    "Non binaire",
    "Je préfère ne pas répondre"
  ],
  "taille_entreprise": [
    "1 à 9 salariés",
    "10 à 49 salariés",
    "50 à 299 salariés",
    "300 à 999 salariés",
    "1 000 à 4 999 salariés",
    "5 000 salariés et plus"
  ],
  "secteur": [
    "Agriculture et agroalimentaire",
    "Industrie et production",
    "Énergie, eau et environnement",
    "BTP et construction",
    "Commerce de gros",
    "Commerce de détail et distribution",
    "Transport et logistique",
    "Hôtellerie, restauration et tourisme",
    "Numérique, télécoms et médias",
    "Banque, finance et assurance",
    "Immobilier",
    "Professions juridiques et du chiffre",
    "Conseil et services aux entreprises",
    "Santé",
    "Médico-social et action sociale",
    "Éducation et formation",
    "Culture, sport et loisirs",
    "Administration publique",
    "Associations et économie sociale et solidaire",
    "Autre"
  ],
  "taille_equipe": [
    "2 à 5 personnes",
    "6 à 12 personnes",
    "13 personnes et plus"
  ]
};

/** Nombre de choix proposés par relance, par rôle puis par affirmation. */
var NB_CHOIX_RELANCE = {
  "membre": {
    "1": 5,
    "2": 4,
    "3": 5,
    "4": 5,
    "5": 4,
    "6": 5,
    "7": 5,
    "8": 5,
    "9": 5,
    "10": 5,
    "11": 5,
    "12": 5,
    "13": 5,
    "14": 5,
    "15": 5,
    "16": 5
  },
  "manager": {
    "1": 5,
    "2": 4,
    "3": 5,
    "4": 5,
    "5": 4,
    "6": 5,
    "7": 5,
    "8": 5,
    "9": 5,
    "10": 5,
    "11": 5,
    "12": 5,
    "13": 5,
    "14": 5,
    "15": 5,
    "16": 5
  }
};
