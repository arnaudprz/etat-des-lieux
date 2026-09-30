/**
 * Les indicateurs du haut : répondants, complétion, secteurs, liens copiés.
 *
 * Deux indicateurs ne décrivent que le parcours en ligne, puisqu'une réponse
 * papier n'a ni questionnaire commencé ni lien personnel. Ils le disent sous
 * leur chiffre, et disparaissent quand on ne regarde que le papier.
 */

import { el, vider } from '../../parcours/commun.js';
import { indicateurs } from '../agregats.js';
import { nombre, part, mentionEchelles } from './briques.js';

function tuile(intitule, valeur, precisions) {
  return el('div', { classe: 'carte tuile' }, [
    el('span', { classe: 'tuile__intitule', texte: intitule }),
    el('span', { classe: 'tuile__valeur serif', texte: valeur }),
    ...(Array.isArray(precisions) ? precisions : [precisions])
      .filter(Boolean)
      .map((t) => el('span', { classe: 'tuile__precision', texte: t })),
  ]);
}

/**
 * @param {object} filtres l'état des filtres, pour savoir si on ne regarde que
 *   le papier : les indicateurs du parcours en ligne n'ont alors plus de sens.
 */
export function afficherIndicateurs(hote, reponses, entonnoir, contenu, filtres = {}) {
  const i = indicateurs(reponses, entonnoir, contenu);
  const papierSeul = filtres.source === 'papier';
  vider(hote);

  hote.appendChild(tuile('Répondants', nombre(i.repondants), [
    `dont ${nombre(i.managers)} managers et ${nombre(i.membres)} membres`,
    `dont ${nombre(i.enLigne)} en ligne et ${nombre(i.papier)} papier`,
  ]));

  if (!papierSeul) {
    hote.appendChild(tuile(
      'Taux de complétion',
      i.completion === null ? 'Non mesuré' : part(i.completion),
      [
        i.completion === null
          ? 'aucun questionnaire commencé n’a encore été enregistré'
          : `${nombre(i.termines)} terminés sur ${nombre(i.commences)} commencés`,
        'parcours en ligne seulement',
      ]
    ));
  }

  hote.appendChild(tuile(
    'Secteurs représentés',
    nombre(i.secteurs),
    `sur ${nombre(i.secteursPossibles)} dans la liste`
  ));

  // Quand les deux échelles se côtoient, on le dit sous les chiffres.
  const mention = mentionEchelles(reponses);
  if (mention) hote.appendChild(mention);

  if (!papierSeul) {
    hote.appendChild(tuile(
      'Liens personnels copiés',
      nombre(i.liensCopies),
      [
        i.partLiensCopies === null
          ? 'aucune réponse en ligne'
          : `${part(i.partLiensCopies)} des réponses en ligne`,
        'parcours en ligne seulement',
      ]
    ));
  }
}
