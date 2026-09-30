/**
 * Les dimensions en barres empilées : part des répondants dans chaque couleur.
 * Le titre de la section dit le constat.
 */

import { el, vider } from '../../parcours/commun.js';
import { repartitionDimensions } from '../agregats.js';
import { barreEmpilee, legendeNiveaux, rangee, tropPetit } from './briques.js';
import { minusculeInitiale } from '../../typo.js';

/** Un titre qui dit le constat, construit depuis les données. */
export function titreDimensions(reponses, contenu) {
  const lignes = repartitionDimensions(reponses, contenu);
  if (lignes.length === 0) return 'Les dimensions en couleurs';
  const classees = lignes.slice().sort((a, b) => a.partInstallee - b.partInstallee);
  const deux = classees.slice(0, 2);
  if (deux.length < 2) return 'Les dimensions en couleurs';
  return `${deux[0].nom} et ${minusculeInitiale(deux[1].nom)} sont les moins installés`;
}

export function afficherDimensions(hote, reponses, contenu) {
  vider(hote);

  const lignes = repartitionDimensions(reponses, contenu);
  if (lignes.length === 0) {
    hote.appendChild(tropPetit());
    return;
  }

  hote.appendChild(legendeNiveaux(contenu));

  lignes.forEach((d) => {
    const tranches = d.niveaux.map((n) => ({
      libelle: n.niveau.nom,
      effectif: n.effectif,
      part: n.part,
      couleur: n.niveau.hex,
      texte: n.niveau.texte,
    }));
    hote.appendChild(rangee(d.nom, [barreEmpilee(tranches, d.nom)], { compacte: true }));
  });
}
