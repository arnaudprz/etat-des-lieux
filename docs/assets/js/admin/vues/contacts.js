/**
 * Demandes de l'étude complète.
 *
 * Ces coordonnées arrivent par une requête distincte de celle des réponses :
 * aucune réponse d'API ne met côte à côte un questionnaire et une identité.
 */

import { el, vider } from '../../parcours/commun.js';
import { pourcent } from '../agregats.js';
import { nombre, part } from './briques.js';

/** Nombre de demandes visibles avant de déplier. L'export contient tout. */
const APERCU = 5;

/** « 29 sept. » */
function jourCourt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function rangee(c) {
  return el('tr', {}, [
    el('td', { texte: `${c.prenom || ''} ${c.nom || ''}`.trim() }),
    el('td', { texte: c.entreprise || '' }),
    el('td', { texte: c.email || '' }),
    el('td', { texte: jourCourt(c.date) }),
  ]);
}

/**
 * @param {number} nombreEnLigne les réponses en ligne, et non le total : une
 *   réponse papier ne peut pas avoir donné lieu à une demande d'étude.
 */
export function afficherContacts(hote, contacts, nombreEnLigne, sousTitre) {
  vider(hote);

  const total = contacts.length;
  if (sousTitre) {
    const p = nombreEnLigne
      ? `, soit ${part(pourcent(total, nombreEnLigne))} des réponses en ligne`
      : '';
    sousTitre.textContent = `${nombre(total)} personnes${p}. `
      + 'Ces coordonnées ne sont jamais reliées aux réponses.';
  }

  if (total === 0) {
    hote.appendChild(el('p', { classe: 'trop-petit', texte: 'Aucune demande pour le moment.' }));
    return;
  }

  const corps = el('tbody');
  contacts.slice(0, APERCU).forEach((c) => corps.appendChild(rangee(c)));

  const tableau = el('table', { classe: 'tableau' }, [
    el('thead', {}, [
      el('tr', {}, [
        el('th', { texte: 'Nom' }),
        el('th', { texte: 'Entreprise' }),
        el('th', { texte: 'E-mail' }),
        el('th', { texte: 'Date' }),
      ]),
    ]),
    corps,
  ]);

  hote.appendChild(el('div', { classe: 'tableau-defilant' }, [tableau]));

  if (total <= APERCU) return;

  let deplie = false;
  const bouton = el('button', {
    classe: 'bouton-secondaire',
    texte: `Voir les ${nombre(total)} demandes`,
    attrs: { type: 'button', 'aria-expanded': 'false' },
  });

  bouton.addEventListener('click', () => {
    deplie = !deplie;
    vider(corps);
    (deplie ? contacts : contacts.slice(0, APERCU)).forEach((c) => corps.appendChild(rangee(c)));
    bouton.textContent = deplie
      ? 'Réduire la liste'
      : `Voir les ${nombre(total)} demandes`;
    bouton.setAttribute('aria-expanded', String(deplie));
  });

  hote.appendChild(el('div', { classe: 'deplier' }, [bouton]));
}
