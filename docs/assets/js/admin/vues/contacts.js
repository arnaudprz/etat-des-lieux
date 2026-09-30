/**
 * Demandes de l'étude complète.
 *
 * Ces coordonnées arrivent par une requête distincte de celle des réponses :
 * aucune réponse d'API ne met côte à côte un questionnaire et une identité.
 */

import { el, vider } from '../../parcours/commun.js';
import { pourcent } from '../agregats.js';
import { nombre, part } from './briques.js';

/** Nombre de demandes affichées. L'export contient toujours la totalité. */
const MAX_LIGNES = 15;

/** « 29 sept. » */
function jourCourt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function afficherContacts(hote, contacts, nombreRepondants, sousTitre) {
  vider(hote);

  const total = contacts.length;
  if (sousTitre) {
    const p = nombreRepondants ? `, soit ${part(pourcent(total, nombreRepondants))} des répondants` : '';
    sousTitre.textContent = `${nombre(total)} personnes${p}. `
      + 'Ces coordonnées ne sont jamais reliées aux réponses.';
  }

  if (total === 0) {
    hote.appendChild(el('p', { classe: 'trop-petit', texte: 'Aucune demande pour le moment.' }));
    return;
  }

  const corps = el('tbody');
  contacts.slice(0, MAX_LIGNES).forEach((c) => {
    corps.appendChild(
      el('tr', {}, [
        el('td', { texte: `${c.prenom || ''} ${c.nom || ''}`.trim() }),
        el('td', { texte: c.entreprise || '' }),
        el('td', { texte: c.email || '' }),
        el('td', { texte: jourCourt(c.date) }),
      ])
    );
  });

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

  if (total > MAX_LIGNES) {
    hote.appendChild(
      el('p', {
        classe: 'section-admin__soustitre',
        texte: `Les ${MAX_LIGNES} demandes les plus récentes sont affichées. `
          + `L'export contient les ${nombre(total)}.`,
      })
    );
  }
}
