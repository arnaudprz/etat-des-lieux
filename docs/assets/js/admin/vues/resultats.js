/**
 * Le lien avec le Q16.
 *
 * Pour chaque dimension : la part de répondants qui disent que leur équipe
 * obtient les résultats qu'elle vise, selon que la dimension est installée ou
 * à construire. Un lien observé entre des perceptions, pas une cause.
 */

import { el, vider } from '../../parcours/commun.js';
import { lienResultats } from '../agregats.js';
import { nombre, part, rangee, tropPetit } from './briques.js';
import { minusculeInitiale } from '../../typo.js';

/** Un titre qui dit le constat. */
export function titreResultats(reponses, contenu) {
  const lignes = lienResultats(reponses, contenu).filter((l) => l.ecart !== null);
  if (lignes.length === 0) return 'Le lien avec les résultats';
  const positifs = lignes.filter((l) => l.ecart > 0).length;
  if (positifs === lignes.length) {
    return 'Là où une dimension est installée, les résultats perçus suivent plus souvent';
  }
  const fort = lignes.slice().sort((a, b) => b.ecart - a.ecart)[0];
  return `Le lien avec les résultats est le plus net sur ${minusculeInitiale(fort.nom)}`;
}

function barre(libelle, mesure, couleur) {
  if (!mesure) {
    return el('div', { classe: 'duo__ligne' }, [tropPetit()]);
  }
  const titre = `${libelle} : ${part(mesure.part)} (${nombre(mesure.effectif)} personnes)`;
  return el('div', { classe: 'duo__ligne' }, [
    el('div', { classe: 'duo__piste' }, [
      el('div', {
        classe: 'duo__jauge',
        attrs: { title: titre, 'aria-label': titre },
        style: { width: `${mesure.part * 0.85}%`, background: couleur },
      }),
    ]),
    el('span', { classe: 'duo__valeur', texte: part(mesure.part) }),
  ]);
}

export function afficherResultats(hote, reponses, contenu) {
  vider(hote);

  const lignes = lienResultats(reponses, contenu);
  if (lignes.every((l) => !l.installee && !l.aConstruire)) {
    hote.appendChild(tropPetit());
    return;
  }

  hote.appendChild(
    el('div', { classe: 'legende-admin' }, [
      el('span', {}, [
        el('span', { classe: 'temoin', style: { background: 'var(--enracine)' }, attrs: { 'aria-hidden': 'true' } }),
        'Dimension installée',
      ]),
      el('span', {}, [
        el('span', { classe: 'temoin', style: { background: 'var(--semer)' }, attrs: { 'aria-hidden': 'true' } }),
        'Dimension à construire',
      ]),
    ])
  );

  lignes.forEach((l) => {
    hote.appendChild(
      rangee(l.nom, [
        el('div', { classe: 'duo' }, [
          barre('Dimension installée', l.installee, 'var(--enracine)'),
          barre('Dimension à construire', l.aConstruire, 'var(--semer)'),
        ]),
      ])
    );
  });
}
