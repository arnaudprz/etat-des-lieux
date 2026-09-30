/**
 * Les 4 indicateurs du haut : répondants, complétion, secteurs, liens copiés.
 */

import { el, vider } from '../../parcours/commun.js';
import { indicateurs } from '../agregats.js';
import { nombre, part } from './briques.js';

function tuile(intitule, valeur, precision) {
  return el('div', { classe: 'carte tuile' }, [
    el('span', { classe: 'tuile__intitule', texte: intitule }),
    el('span', { classe: 'tuile__valeur serif', texte: valeur }),
    el('span', { classe: 'tuile__precision', texte: precision }),
  ]);
}

export function afficherIndicateurs(hote, reponses, entonnoir, contenu) {
  const i = indicateurs(reponses, entonnoir, contenu);
  vider(hote);

  hote.appendChild(tuile(
    'Répondants',
    nombre(i.repondants),
    `dont ${nombre(i.managers)} managers et ${nombre(i.membres)} membres`
  ));

  hote.appendChild(tuile(
    'Taux de complétion',
    i.completion === null ? 'Non mesuré' : part(i.completion),
    i.completion === null
      ? 'aucun questionnaire commencé n’a encore été enregistré'
      : `${nombre(i.termines)} terminés sur ${nombre(i.commences)} commencés`
  ));

  hote.appendChild(tuile(
    'Secteurs représentés',
    nombre(i.secteurs),
    `sur ${nombre(i.secteursPossibles)} dans la liste`
  ));

  hote.appendChild(tuile(
    'Liens personnels copiés',
    nombre(i.liensCopies),
    i.partLiensCopies === null ? 'aucun répondant' : `${part(i.partLiensCopies)} des répondants`
  ));
}
