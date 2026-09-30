/**
 * « L'essentiel » : les constats rédigés, et les questions à creuser.
 */

import { el, vider } from '../../parcours/commun.js';
import { essentiel, A_CREUSER } from '../analyse.js';
import { tropPetit } from './briques.js';

/** Couleur d'en-tête de chaque constat, par clé de niveau. */
function couleurs(contenu, cle) {
  const n = contenu.niveaux.find((x) => x.cle === cle);
  return n ? { fond: n.hex, texte: n.texte } : { fond: 'var(--sauge)', texte: '#FFFFFF' };
}

export function afficherEssentiel(hote, reponses, contenu) {
  vider(hote);

  const constats = essentiel(reponses, contenu);
  if (constats.length === 0) {
    hote.appendChild(tropPetit());
    return;
  }

  const grille = el('div', { classe: 'constats' });
  constats.forEach((c) => {
    const { fond, texte } = couleurs(contenu, c.niveau);
    grille.appendChild(
      el('div', { classe: 'constat' }, [
        el('div', {
          classe: 'constat__entete',
          texte: c.titre,
          style: { background: fond, color: texte },
        }),
        el('p', { classe: 'constat__texte', texte: c.texte }),
      ])
    );
  });
  hote.appendChild(grille);

  hote.appendChild(
    el('div', { classe: 'a-creuser' }, [
      el('span', { classe: 'a-creuser__titre', texte: 'À creuser' }),
      el('ul', {}, A_CREUSER.map((q) => el('li', { texte: q }))),
    ])
  );
}
