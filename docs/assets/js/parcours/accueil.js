/**
 * Accueil : le compteur, les 8 dimensions, le nuancier et l'aperçu.
 * Tous les noms viennent de contenu.json ; les textes de présentation sont dans
 * le HTML, repris mot pour mot de maquette/Main.dc.html.
 */

import { chargerContenu } from '../contenu.js';
import { compteur } from '../api.js';
import { $, el, texte, signalerModeDemo, evenement, typographierPage } from './commun.js';

/** Les 3 exemples de l'aperçu, désignés par clé de dimension et clé de niveau. */
const APERCU = [
  { dimension: 'vise', niveau: 'croissance' },
  { dimension: 'sait', niveau: 'germe' },
  { dimension: 'manager', niveau: 'enracine' },
];

function remplirApercu(contenu, hote) {
  APERCU.forEach(({ dimension, niveau }) => {
    const d = contenu.dimensions.find((x) => x.cle === dimension);
    const n = contenu.niveaux.find((x) => x.cle === niveau);
    if (!d || !n) return;
    hote.appendChild(
      el('div', { classe: 'apercu__ligne' }, [
        el('span', { texte: d.nom }),
        el('span', { classe: `pastille pastille--${n.cle}`, texte: n.nom }),
      ])
    );
  });
}

function remplirNuancier(contenu, hote) {
  contenu.niveaux.forEach((n) => {
    hote.appendChild(el('span', { classe: `pastille pastille--${n.cle}`, texte: n.nom }));
  });
}

function remplirDimensions(contenu, hote) {
  contenu.dimensions.forEach((d) => {
    hote.appendChild(el('div', { classe: 'carte', texte: d.nom }));
  });
}

async function afficherCompteur() {
  const cible = $('[data-compteur]');
  if (!cible) return;
  const total = await compteur();
  texte(cible, String(total));
}

async function demarrer() {
  signalerModeDemo();

  // On ne touche pas au parcours en cours : revenir en arrière doit conserver
  // les réponses déjà données (SPEC 4.3). La session est effacée après l'envoi.
  evenement('visite');

  const contenu = await chargerContenu();
  remplirApercu(contenu, $('[data-apercu]'));
  remplirNuancier(contenu, $('[data-nuancier]'));
  remplirDimensions(contenu, $('[data-dimensions]'));
  typographierPage();

  afficherCompteur();
}

demarrer();
