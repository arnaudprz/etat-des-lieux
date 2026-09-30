/**
 * Briques communes des vues du tableau de bord.
 * Tous les graphiques sont en HTML et CSS : aucune bibliothèque.
 * Chaque barre porte un `title` qui donne l'effectif et la part au survol.
 */

import { el } from '../../parcours/commun.js';
import { TROP_PETIT } from '../analyse.js';

/** Un nombre à la française, avec espaces insécables. */
export function nombre(n) {
  return Number(n || 0).toLocaleString('fr-FR').replace(/ | | /g, ' ');
}

/** Un pourcentage entier. */
export function part(n) {
  return `${Math.round(n)} %`;
}

/** Une section en carte, avec son titre et son sous-titre. */
export function section(titre, sousTitre, options = {}) {
  const entete = el('div', { classe: 'section-admin__entete' }, [
    el('h2', { classe: 'section-admin__titre', texte: titre }),
    sousTitre ? el('p', { classe: 'section-admin__soustitre', texte: sousTitre }) : null,
  ]);

  const haut = options.action
    ? el('div', { classe: 'section-admin__haut' }, [entete, options.action])
    : entete;

  const corps = el('div', { classe: 'section-admin__corps' });
  const noeud = el('section', {
    classe: 'carte section-admin' + (options.classe ? ` ${options.classe}` : ''),
  }, [haut, corps]);

  return { noeud, corps };
}

/** Le message affiché à la place d'un chiffre calculé sur trop peu de monde. */
export function tropPetit() {
  return el('p', { classe: 'trop-petit', texte: TROP_PETIT });
}

/** La légende des 4 niveaux. Chaque couleur porte toujours son nom écrit. */
export function legendeNiveaux(contenu) {
  return el(
    'div',
    { classe: 'legende-admin' },
    contenu.niveaux.map((n) =>
      el('span', {}, [
        el('span', { classe: 'temoin', style: { background: n.hex }, attrs: { 'aria-hidden': 'true' } }),
        n.nom,
      ])
    )
  );
}

/**
 * Une barre empilée.
 * @param {Array<{libelle: string, effectif: number, part: number, couleur: string, texte?: string}>} tranches
 */
export function barreEmpilee(tranches, prefixe = '') {
  const barre = el('div', { classe: 'barre-empilee' });
  tranches.forEach((t) => {
    if (t.part <= 0) return;
    const titre = `${prefixe}${prefixe ? ' · ' : ''}${t.libelle} : ${nombre(t.effectif)} (${part(t.part)})`;
    barre.appendChild(
      el('div', {
        classe: 'barre-empilee__tranche',
        // Une tranche trop fine ne peut pas porter son chiffre lisiblement.
        texte: t.part >= 8 ? part(t.part) : '',
        attrs: { title: titre, 'aria-label': titre },
        style: { width: `${t.part}%`, background: t.couleur, color: t.texte || '#1A1A1A' },
      })
    );
  });
  return barre;
}

/** La légende chiffrée sous une barre empilée. */
export function legendeChiffree(tranches) {
  return el(
    'div',
    { classe: 'legende-chiffree' },
    tranches.map((t) =>
      el('span', {}, [
        el('span', { classe: 'puce', style: { background: t.couleur }, attrs: { 'aria-hidden': 'true' } }),
        `${t.libelle} `,
        el('span', { classe: 'legende-chiffree__valeur', texte: `${nombre(t.effectif)} · ${part(t.part)}` }),
      ])
    )
  );
}

/** Une ligne « intitulé, barre, valeur ». */
export function ligneBarre(libelle, largeur, valeur, options = {}) {
  const titre = options.titre || `${libelle} : ${valeur}`;
  return el('div', { classe: 'ligne-barre' }, [
    el('span', { classe: 'ligne-barre__nom', texte: libelle }),
    el('div', { classe: 'ligne-barre__piste' }, [
      el('div', {
        classe: 'ligne-barre__jauge',
        attrs: { title: titre, 'aria-label': titre },
        style: { width: `${Math.max(0, Math.min(100, largeur))}%`, background: options.couleur || 'var(--croissance)' },
      }),
    ]),
    el('span', { classe: 'ligne-barre__valeur', texte: valeur }),
  ]);
}

/**
 * Une ligne de tableau de bord en grille : intitulé à gauche, contenu à droite.
 *
 * La variante compacte sert aux longues listes de barres, où la bordure et la
 * marge verticale de la ligne standard rendraient la section interminable.
 */
export function rangee(libelle, contenu, options = {}) {
  const classe = options.compacte ? 'rangee rangee--compacte' : 'rangee';
  return el('div', { classe }, [
    el('span', { classe: 'rangee__nom', texte: libelle }),
    el('div', { classe: 'rangee__corps' }, contenu),
  ]);
}
