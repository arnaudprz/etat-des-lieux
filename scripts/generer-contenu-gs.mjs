/**
 * Génère worker/contenu.gs à partir de docs/assets/data/contenu.json.
 *
 * Apps Script ne peut pas lire le JSON du repo : les valeurs autorisées doivent
 * vivre dans le projet Apps Script. Les générer évite que les deux dérivent.
 *
 * À relancer après toute modification de contenu.json :
 *   node scripts/generer-contenu-gs.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const contenu = JSON.parse(
  readFileSync(join(racine, 'docs', 'assets', 'data', 'contenu.json'), 'utf8')
);

const j = (x) => JSON.stringify(x, null, 2).replace(/\n/g, '\n');

/** Nombre de choix de relance, par rôle puis par numéro d'affirmation. */
const nbChoix = { membre: {}, manager: {} };
contenu.affirmations.forEach((a) => {
  if (!a.relance) return;
  ['membre', 'manager'].forEach((role) => {
    if (a.relance[role]) nbChoix[role][a.n] = a.relance[role].choix.length;
  });
});

const sortie = `/**
 * Valeurs autorisées, extraites de contenu.json.
 *
 * FICHIER GÉNÉRÉ : ne pas modifier à la main.
 * Régénérer avec : node scripts/generer-contenu-gs.mjs
 *
 * Source : contenu.json version ${contenu.version}
 */

/** Nombre d'affirmations du questionnaire. */
var NB_AFFIRMATIONS = ${contenu.affirmations.length};

/** Valeur de réponse la plus haute. Les réponses vont de 0 à cette valeur. */
var VALEUR_MAX = ${Math.max(...contenu.echelle.map((e) => e.valeur))};

/** Versions de questionnaire acceptées. */
var VERSIONS = ['v1'];

/** Rôles acceptés. */
var ROLES = ['membre', 'manager'];

/** Sources acceptées pour une ligne de réponses. */
var SOURCES = ['en_ligne', 'papier'];

/** Règles des relances. */
var RELANCE_MAX_CHOIX = ${contenu.relance.max_choix};
var RELANCE_MAX_AFFIRMATIONS = ${contenu.relance.max_affirmations};
var RELANCE_SEUIL_VALEUR_MAX = ${contenu.relance.seuil_valeur_max};
var RELANCE_AUTRE = ${JSON.stringify('autre')};

/** Nombre de réponses papier connues avant tout import. */
var PAPIER_BASE_DEFAUT = ${contenu.compteur_papier};

/** Choix acceptés pour chaque champ de profil. Le rôle est traité à part. */
var CHOIX_PROFIL = ${j({
  role: contenu.profil.role.choix,
  genre: contenu.profil.genre.choix,
  taille_entreprise: contenu.profil.taille_entreprise.choix,
  secteur: contenu.profil.secteur.choix,
  taille_equipe: contenu.profil.taille_equipe.choix,
})};

/** Nombre de choix proposés par relance, par rôle puis par affirmation. */
var NB_CHOIX_RELANCE = ${j(nbChoix)};
`;

writeFileSync(join(racine, 'worker', 'contenu.gs'), sortie, 'utf8');
console.log(`worker/contenu.gs généré depuis contenu.json (version ${contenu.version})`);
