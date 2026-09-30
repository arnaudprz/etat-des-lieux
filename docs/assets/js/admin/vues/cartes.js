/**
 * Les cartes d'ensemble reçues : part des répondants par carte.
 */

import { el, vider } from '../../parcours/commun.js';
import { cartesRecues } from '../agregats.js';
import { medaillon, chemin } from '../../illustration-niveau.js';
import { nombre, part, tropPetit } from './briques.js';

/** Le tableau de bord vit un niveau plus bas que les pages du parcours. */
const DEPUIS_ADMIN = '../';

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
          style: { background: l.niveau.hex, color: l.niveau.texte },
        }, [
          el('span', { texte: l.niveau.nom }),
          // Décorative : le nom du niveau est juste à côté.
          el('img', {
            classe: 'carte-recue__pousse',
            attrs: {
              src: DEPUIS_ADMIN + chemin(medaillon(l.niveau.cle)),
              alt: '', 'aria-hidden': 'true',
            },
          }),
        ]),
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
