/**
 * Les 4 conditions des Fondations : part qui les vit déjà.
 */

import { el, vider } from '../../parcours/commun.js';
import { fondations } from '../agregats.js';
import { part, nombre, tropPetit } from './briques.js';

/** « Affirmations 1, 2, 5 et 6 ». */
function listerNumeros(numeros) {
  if (numeros.length === 1) return `Affirmation ${numeros[0]}`;
  const debut = numeros.slice(0, -1).join(', ');
  return `Affirmations ${debut} et ${numeros[numeros.length - 1]}`;
}

export function afficherFondations(hote, reponses, contenu) {
  vider(hote);
  const grille = el('div', { classe: 'quatre' });

  fondations(reponses, contenu).forEach((f) => {
    const corps = f.mesure
      ? [
          el('span', { classe: 'bloc-chiffre__valeur serif', texte: part(f.mesure.part) }),
          el('span', { classe: 'bloc-chiffre__precision', texte: listerNumeros(f.numeros) }),
          el('span', {
            classe: 'bloc-chiffre__precision',
            texte: `${nombre(f.mesure.effectif)} répondants`,
          }),
        ]
      : [tropPetit()];

    grille.appendChild(
      el('div', { classe: 'bloc-chiffre' }, [
        el('span', { classe: 'bloc-chiffre__nom', texte: f.nom }),
        ...corps,
      ])
    );
  });

  hote.appendChild(grille);
}
