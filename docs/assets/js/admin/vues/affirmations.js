/**
 * Toutes les réponses, affirmation par affirmation, avec la bascule
 * Membres / Managers.
 *
 * Ordre de lecture voulu : d'abord le constat (la part d'accord en grand), puis
 * le détail des 4 réponses, puis l'affirmation, puis ce que souhaitent ceux qui
 * ne sont pas d'accord.
 */

import { el, vider } from '../../parcours/commun.js';
import { detailAffirmation, souhaitLePlusChoisi } from '../agregats.js';
import { nombre, part, tropPetit } from './briques.js';

/** L'encadré sable : ce que souhaitent ceux qui ne sont pas d'accord. */
function encadreSouhait(souhait) {
  return el('div', { classe: 'souhait' }, [
    el('span', { classe: 'souhait__question' }, [
      'Ceux qui ne sont pas d’accord ont complété : ',
      el('strong', { texte: `« ${souhait.debut} »` }),
    ]),
    el('span', { classe: 'souhait__ligne' }, [
      el('span', { classe: 'souhait__intitule', texte: 'Le souhait le plus choisi :' }),
      el('span', { classe: 'souhait__choix', texte: souhait.libelle }),
      el('span', {
        classe: 'souhait__part',
        texte: `${part(souhait.part)} d’entre eux`,
        attrs: { title: `${nombre(souhait.nombre)} personnes sur ${nombre(souhait.effectif)}` },
      }),
      el('span', {
        classe: 'souhait__effectif',
        texte: `soit ${nombre(souhait.nombre)} personnes sur ${nombre(souhait.effectif)}`,
      }),
    ]),
  ]);
}

/** Une affirmation : le constat à gauche, le texte et le souhait à droite. */
function ligneAffirmation(affirmation, detail, souhait, role) {
  const gauche = el('div', { classe: 'affirmation-admin__constat' }, [
    el('span', { classe: 'affirmation-admin__part serif', texte: part(detail.accord) }),
    el('span', { classe: 'affirmation-admin__accord', texte: 'd’accord' }),
    el('div', {
      classe: 'affirmation-admin__piste',
      attrs: { title: `${part(detail.accord)} d’accord, soit ${nombre(detail.effectifAccord)} sur ${nombre(detail.effectif)}` },
    }, [
      el('div', { classe: 'affirmation-admin__jauge', style: { width: `${detail.accord}%` } }),
    ]),
    el('span', {
      classe: 'affirmation-admin__detail',
      texte: `Tout à fait ${part(detail.parts[3])} · Plutôt ${part(detail.parts[2])}`,
    }),
    el('span', {
      classe: 'affirmation-admin__detail',
      texte: `Plutôt pas ${part(detail.parts[1])} · Pas du tout ${part(detail.parts[0])}`,
    }),
    el('span', {
      classe: 'affirmation-admin__detail',
      texte: `${nombre(detail.effectif)} répondants`,
    }),
  ]);

  const droite = el('div', { classe: 'affirmation-admin__texte' }, [
    el('span', { classe: 'affirmation-admin__enonce', texte: affirmation[role] }),
    souhait ? encadreSouhait(souhait) : null,
  ]);

  return el('div', { classe: 'affirmation-admin' }, [gauche, droite]);
}

/**
 * Affiche toutes les affirmations pour un rôle.
 * @param {HTMLElement} hote
 * @param {Array} reponses déjà filtrées
 * @param {object} contenu
 * @param {'membre'|'manager'} role
 */
export function afficherAffirmations(hote, reponses, contenu, role) {
  vider(hote);

  const duRole = reponses.filter((r) => r.role === role);
  let groupeCourant = null;
  let quelqueChose = false;

  contenu.affirmations.forEach((a) => {
    const detail = detailAffirmation(duRole, a.n);
    if (!detail) return;
    quelqueChose = true;

    if (a.groupe !== groupeCourant) {
      groupeCourant = a.groupe;
      hote.appendChild(el('h3', { classe: 'groupe-admin', texte: a.groupe }));
    }

    const souhait = souhaitLePlusChoisi(duRole, a.n, role, contenu);
    hote.appendChild(ligneAffirmation(a, detail, souhait, role));
  });

  if (!quelqueChose) hote.appendChild(tropPetit());
}

/** La bascule Membres / Managers. */
export function bascule(roleCourant, surChangement) {
  const groupe = el('div', {
    classe: 'bascule',
    attrs: { role: 'group', 'aria-label': 'Version des affirmations' },
  });

  [['membre', 'Membres'], ['manager', 'Managers']].forEach(([valeur, libelle]) => {
    const bouton = el('button', {
      classe: 'bascule__bouton',
      texte: libelle,
      attrs: { type: 'button', 'aria-pressed': String(valeur === roleCourant) },
    });
    bouton.addEventListener('click', () => {
      Array.from(groupe.children).forEach((b) => b.setAttribute('aria-pressed', 'false'));
      bouton.setAttribute('aria-pressed', 'true');
      surChangement(valeur);
    });
    groupe.appendChild(bouton);
  });

  return groupe;
}
