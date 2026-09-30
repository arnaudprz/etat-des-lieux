/**
 * Managers et membres comparés, dimension par dimension.
 * Deux points sur une même règle de 0 à 100 %, et l'écart en points à droite.
 */

import { el, vider } from '../../parcours/commun.js';
import { comparaisonRoles } from '../agregats.js';
import { nombre, part, rangee, tropPetit } from './briques.js';
import { minusculeInitiale } from '../../typo.js';

/** Un titre qui dit le constat. */
export function titreComparaison(reponses, contenu) {
  const lignes = comparaisonRoles(reponses, contenu).filter((c) => c.ecart !== null);
  if (lignes.length === 0) return 'Managers et membres';
  const positifs = lignes.filter((c) => c.ecart > 0).length;
  if (positifs === lignes.length) {
    return 'Les managers voient leur équipe plus installée que les membres';
  }
  if (positifs === 0) {
    return 'Les membres voient leur équipe plus installée que les managers';
  }
  const fort = lignes.slice().sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart))[0];
  return `L'écart entre les deux regards est le plus fort sur ${minusculeInitiale(fort.nom)}`;
}

function regle(ligne) {
  const a = ligne.managers.part;
  const b = ligne.membres.part;
  const gauche = Math.min(a, b);
  const largeur = Math.abs(a - b);

  return el('div', { classe: 'regle' }, [
    el('div', { classe: 'regle__axe', attrs: { 'aria-hidden': 'true' } }),
    el('div', {
      classe: 'regle__ecart',
      attrs: { 'aria-hidden': 'true' },
      style: { left: `${gauche}%`, width: `${largeur}%` },
    }),
    el('div', {
      classe: 'regle__point regle__point--membres',
      attrs: { title: `Membres : ${part(b)} (${nombre(ligne.membres.effectif)} personnes)` },
      style: { left: `calc(${b}% - 7px)` },
    }),
    el('div', {
      classe: 'regle__point regle__point--managers',
      attrs: { title: `Managers : ${part(a)} (${nombre(ligne.managers.effectif)} personnes)` },
      style: { left: `calc(${a}% - 7px)` },
    }),
  ]);
}

export function afficherComparaison(hote, reponses, contenu) {
  vider(hote);

  const lignes = comparaisonRoles(reponses, contenu);
  const mesurables = lignes.filter((c) => c.ecart !== null);
  if (mesurables.length === 0) {
    hote.appendChild(tropPetit());
    return;
  }

  const managers = reponses.filter((r) => r.role === 'manager').length;
  const membres = reponses.filter((r) => r.role === 'membre').length;

  hote.appendChild(
    el('div', { classe: 'legende-admin' }, [
      el('span', {}, [
        el('span', { classe: 'puce puce--ronde', style: { background: 'var(--enracine)' }, attrs: { 'aria-hidden': 'true' } }),
        `Managers (${nombre(managers)})`,
      ]),
      el('span', {}, [
        el('span', { classe: 'puce puce--ronde', style: { background: 'var(--semer)' }, attrs: { 'aria-hidden': 'true' } }),
        `Membres (${nombre(membres)})`,
      ]),
    ])
  );

  lignes.forEach((c) => {
    if (c.ecart === null) {
      hote.appendChild(rangee(c.nom, [tropPetit()]));
      return;
    }
    hote.appendChild(
      el('div', { classe: 'rangee rangee--trois' }, [
        el('span', { classe: 'rangee__nom', texte: c.nom }),
        regle(c),
        el('span', {
          classe: 'rangee__valeur',
          texte: `${Math.abs(c.ecart)} pts`,
        }),
      ])
    );
  });
}
