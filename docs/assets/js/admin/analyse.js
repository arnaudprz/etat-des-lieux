/**
 * « L'essentiel » : les constats rédigés automatiquement par des règles.
 *
 * Module pur, testable. Les phrases décrivent des perceptions, jamais des
 * causes, et ne portent jamais de jugement sur les personnes.
 *
 * Un constat dont le groupe compte moins de K_MINI personnes n'est pas produit :
 * la carte correspondante ne s'affiche pas.
 */

import {
  K_MINI, assezDeMonde, partAccord, souhaitLePlusChoisi,
  comparaisonRoles, lienResultats, detailAffirmation,
} from './agregats.js';
import { minusculeInitiale, majusculeInitiale } from '../typo.js';

/** Les questions ouvertes du bas de « L'essentiel ». Reprises de la maquette. */
export const A_CREUSER = [
  "L'écart entre managers et membres est-il le même dans toutes les tailles d'entreprise ?",
  "Les secteurs où l'info circule le moins sont-ils aussi ceux où les résultats perçus sont les plus bas ?",
  'Les réponses papier racontent-elles la même chose que les réponses en ligne ?',
];

/** Relie des noms de dimension par « et », en minuscule initiale. */
function etPuis(noms) {
  return noms.map(minusculeInitiale).join(' et ');
}

/** La part de chaque dimension vécue En bonne partie ou Pleinement, classée. */
function dimensionsClassees(reponses, contenu) {
  return contenu.dimensions
    .map((d) => ({ nom: d.nom, cle: d.cle, mesure: partAccord(reponses, d.affirmations) }))
    .filter((x) => x.mesure !== null)
    .sort((a, b) => b.mesure.part - a.mesure.part);
}

/**
 * Le souhait le plus choisi pour une affirmation, dans la version du rôle le
 * mieux représenté parmi ceux qui ont répondu à cette relance.
 */
function souhaitDominant(reponses, n, contenu) {
  const candidats = ['membre', 'manager']
    .map((role) => {
      const duRole = reponses.filter((r) => r.role === role);
      const souhait = souhaitLePlusChoisi(duRole, n, role, contenu);
      return souhait ? { role, ...souhait } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.effectif - a.effectif);
  return candidats[0] || null;
}

/** L'affirmation que le moins de personnes vivent déjà. */
function affirmationLaMoinsInstallee(reponses, contenu) {
  const mesurees = contenu.affirmations
    .map((a) => ({ n: a.n, detail: detailAffirmation(reponses, a.n) }))
    .filter((x) => x.detail !== null)
    .sort((a, b) => a.detail.accord - b.detail.accord);
  return mesurees[0] || null;
}

// ------------------------------------------------------------ les 4 constats

/** Ce qui porte les équipes : les 2 dimensions les plus installées. */
export function ceQuiPorte(reponses, contenu) {
  const classees = dimensionsClassees(reponses, contenu);
  if (classees.length < 2) return null;
  const tete = classees.slice(0, 2);
  return {
    titre: 'Ce qui porte les équipes',
    niveau: 'enracine',
    // La liste ouvre la phrase : sa première lettre reprend une majuscule.
    texte: `${majusculeInitiale(etPuis(tete.map((d) => d.nom)))} sont les plus installés : `
      + `${tete[0].mesure.part} % des répondants y répondent En bonne partie ou Pleinement. `
      + `C'est la base sur laquelle les équipes peuvent s'appuyer.`,
  };
}

/** Ce qui peut grandir : les 2 dimensions les moins installées, et un souhait. */
export function ceQuiPeutGrandir(reponses, contenu) {
  const classees = dimensionsClassees(reponses, contenu);
  if (classees.length < 2) return null;
  const queue = classees.slice(-2).reverse(); // la moins installée d'abord

  let texte = `${majusculeInitiale(etPuis(queue.map((d) => d.nom)))} sont les moins installés `
    + `(${queue[0].mesure.part} % et ${queue[1].mesure.part} % le vivent déjà).`;

  const moins = affirmationLaMoinsInstallee(reponses, contenu);
  if (moins) {
    const souhait = souhaitDominant(reponses, moins.n, contenu);
    if (souhait) {
      texte += ` Chez ceux qui répondent Pas encore ou Un peu, le souhait le plus exprimé est `
        + `« ${souhait.libelle} » (${souhait.part} %, soit ${souhait.nombre} personnes).`;
    }
  }

  return { titre: 'Ce qui peut grandir', niveau: 'semer', texte };
}

/** Deux regards différents : l'écart entre managers et membres. */
export function deuxRegards(reponses, contenu) {
  const ecarts = comparaisonRoles(reponses, contenu).filter((c) => c.ecart !== null);
  if (ecarts.length === 0) return null;

  const managers = reponses.filter((r) => r.role === 'manager').length;
  const membres = reponses.filter((r) => r.role === 'membre').length;
  if (!assezDeMonde(managers) || !assezDeMonde(membres)) return null;

  const parEcart = ecarts.slice().sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart));
  const deux = parEcart.slice(0, 2);
  const tousPlusHaut = ecarts.every((c) => c.ecart > 0);

  const ouverture = tousPlusHaut
    ? 'Les managers voient leur équipe plus installée que les membres sur toutes les dimensions.'
    : 'Managers et membres ne voient pas les mêmes choses.';

  const detail = deux.length >= 2
    ? `L'écart le plus fort porte sur ${minusculeInitiale(deux[0].nom)} `
      + `(${Math.abs(deux[0].ecart)} points), puis sur ${minusculeInitiale(deux[1].nom)} `
      + `(${Math.abs(deux[1].ecart)} points).`
    : `L'écart le plus fort porte sur ${minusculeInitiale(deux[0].nom)} `
      + `(${Math.abs(deux[0].ecart)} points).`;

  return {
    titre: 'Deux regards différents',
    niveau: 'croissance',
    texte: `${ouverture} ${detail}`,
  };
}

/** Le lien avec les résultats : l'écart le plus marqué au Q16. */
export function lienAvecLesResultats(reponses, contenu) {
  const liens = lienResultats(reponses, contenu).filter((l) => l.ecart !== null);
  if (liens.length === 0) return null;

  const fort = liens.slice().sort((a, b) => b.ecart - a.ecart)[0];
  return {
    titre: 'Le lien avec les résultats',
    niveau: 'germe',
    texte: `Là où ${minusculeInitiale(fort.nom)} est installé, `
      + `${fort.installee.part} % disent que leur équipe atteint ses résultats, `
      + `contre ${fort.aConstruire.part} % ailleurs. `
      + `C'est l'écart le plus marqué des ${liens.length} dimensions mesurées.`,
  };
}

/**
 * Les constats disponibles, dans l'ordre d'affichage.
 * Ceux qui manquent de monde sont simplement absents.
 */
export function essentiel(reponses, contenu) {
  if (!assezDeMonde(reponses.length)) return [];
  return [
    ceQuiPorte(reponses, contenu),
    ceQuiPeutGrandir(reponses, contenu),
    deuxRegards(reponses, contenu),
    lienAvecLesResultats(reponses, contenu),
  ].filter(Boolean);
}

/** Le message affiché quand un groupe est trop petit. */
export const TROP_PETIT = 'Pas assez de réponses pour ce groupe';

export { K_MINI };
