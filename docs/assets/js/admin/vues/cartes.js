/**
 * Les cartes d'ensemble reçues : part des répondants par carte.
 */

import { el, vider } from '../../parcours/commun.js';
import { cartesRecues } from '../agregats.js';
import { nombre, part, tropPetit } from './briques.js';

export function afficherCartes(hote, reponses, contenu) {
  vider(hote);

  const lignes = cartesRecues(reponses, contenu);
  if (lignes.length === 0) {
    hote.appendChild(tropPetit());
    return;
  }

  const grille = el('div', { classe: 'quatre' });
  lignes.forEach((l) => {
    grille.appendChild(
      el('div', { classe: 'carte-recue' }, [
        el('div', {
          classe: 'carte-recue__entete',
          texte: l.niveau.nom,
          style: { background: l.niveau.hex, color: l.niveau.texte },
        }),
        el('div', { classe: 'carte-recue__corps' }, [
          el('span', { classe: 'carte-recue__valeur serif', texte: part(l.part) }),
          el('span', { classe: 'carte-recue__nom', texte: l.carte.titre }),
          el('span', { classe: 'carte-recue__precision', texte: `${nombre(l.effectif)} répondants` }),
        ]),
      ])
    );
  });
  hote.appendChild(grille);
}
