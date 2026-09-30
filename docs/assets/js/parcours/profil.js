/**
 * Profil : rôle, genre, taille d'entreprise, secteur, taille d'équipe.
 * Tous les intitulés et tous les choix viennent de contenu.json > profil.
 *
 * Le rôle détermine la version des affirmations (membre ou manager).
 * « Continuer » reste inactif tant qu'un champ obligatoire manque.
 */

import { chargerContenu } from '../contenu.js';
import { lire, ecrire } from '../session.js';
import {
  $, el, texte, vider, signalerModeDemo, typographierPage,
  messageErreur, normaliser,
} from './commun.js';

/** Les champs obligatoires, dans l'ordre d'affichage. */
const OBLIGATOIRES = ['role', 'taille_entreprise', 'secteur', 'taille_equipe'];

/** Ce qui manque, dit avec des mots simples. */
const NOMMER = {
  role: 'votre rôle',
  taille_entreprise: 'la taille de votre entreprise',
  secteur: "votre secteur d'activité",
  taille_equipe: 'la taille de votre équipe',
};

/** « a, b et c » : une énumération qui se lit à voix haute. */
function enumerer(elements) {
  if (elements.length <= 1) return elements.join('');
  return `${elements.slice(0, -1).join(', ')} et ${elements[elements.length - 1]}`;
}

/** Le rôle choisi, ramené à la clé utilisée partout ailleurs. */
function roleDepuisChoix(contenu, valeur) {
  return valeur === contenu.profil.role.choix[0] ? 'manager' : 'membre';
}

const etat = { role: null, genre: null, taille_entreprise: null, secteur: null, taille_equipe: null };

// ------------------------------------------------------------- champs à pilules

/**
 * Un bloc de choix à pastilles.
 *
 * Ni <fieldset> ni <legend> : le navigateur les sort du flux, et WebKit ignorait
 * l'écart déclaré sous l'intitulé, qui se retrouvait collé à ses choix.
 * Un role="radiogroup" avec aria-labelledby donne la même accessibilité, et se
 * met en page comme n'importe quel bloc.
 *
 * @param {string} cle nom du champ
 * @param {object} definition la question et ses choix, issus de contenu.json
 * @param {Function} surChoix appelée avec la valeur choisie
 * @param {boolean} deuxColonnes range les pastilles sur 2 colonnes égales
 */
function groupePilules(cle, definition, surChoix, deuxColonnes = false) {
  const idIntitule = `intitule-${cle}`;

  const intitule = el('p', { classe: 'champ__intitule', attrs: { id: idIntitule } });
  intitule.appendChild(document.createTextNode(definition.question));
  if (definition.facultatif) {
    intitule.appendChild(el('span', { classe: 'champ__facultatif', texte: ' (facultatif)' }));
  }

  const pilules = el('div', {
    classe: 'pilules' + (deuxColonnes ? ' pilules--colonnes' : ''),
    attrs: { role: 'radiogroup', 'aria-labelledby': idIntitule },
  });
  definition.choix.forEach((choix) => {
    const entree = el('input', { attrs: { type: 'radio', name: cle, value: choix } });
    entree.addEventListener('change', () => surChoix(choix));
    pilules.appendChild(el('label', { classe: 'pilule' }, [entree, choix]));
  });

  return el('div', { classe: 'champ', attrs: { 'data-champ': cle } }, [intitule, pilules]);
}

// --------------------------------------------------------- combobox du secteur

/**
 * Champ de recherche des secteurs : combobox accessible, recherche insensible
 * aux accents et à la casse. « Autre » reste toujours proposé.
 */
function champSecteur(definition, surChoix) {
  const bloc = el('div', { classe: 'champ', attrs: { 'data-champ': 'secteur' } });
  bloc.appendChild(
    el('label', {
      classe: 'champ__intitule',
      texte: definition.question,
      attrs: { for: 'secteur' },
    })
  );

  const enveloppe = el('div', { classe: 'recherche' });
  enveloppe.innerHTML =
    '<svg class="recherche__loupe" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" ' +
    'fill="none" stroke="#6B6460" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="11" cy="11" r="7"></circle><line x1="16.5" y1="16.5" x2="21" y2="21"></line></svg>';

  const champ = el('input', {
    classe: 'champ-texte',
    attrs: {
      id: 'secteur', type: 'text', role: 'combobox', autocomplete: 'off',
      'aria-autocomplete': 'list', 'aria-controls': 'secteurs', 'aria-expanded': 'false',
      placeholder: definition.placeholder,
    },
  });

  const liste = el('ul', {
    classe: 'recherche__liste',
    attrs: { id: 'secteurs', role: 'listbox', 'aria-label': 'Secteurs' },
  });
  liste.hidden = true;

  // « Autre » est toujours proposé, quelle que soit la recherche.
  const tous = definition.choix.filter((s) => s !== 'Autre');
  const autre = definition.choix.includes('Autre') ? 'Autre' : null;

  let ouverte = false;
  let survol = -1;
  let visibles = [];

  function ouvrir(etatOuvert) {
    ouverte = etatOuvert;
    liste.hidden = !etatOuvert;
    champ.setAttribute('aria-expanded', String(etatOuvert));
    if (!etatOuvert) survol = -1;
  }

  function choisir(valeur) {
    champ.value = valeur;
    surChoix(valeur);
    ouvrir(false);
    champ.removeAttribute('aria-activedescendant');
  }

  function dessiner() {
    const q = normaliser(champ.value.trim());
    visibles = tous.filter((s) => q === '' || normaliser(s).includes(q));
    if (autre) visibles.push(autre);

    vider(liste);
    if (visibles.length === 0) {
      liste.appendChild(el('li', { classe: 'recherche__vide', texte: 'Aucun secteur ne correspond.' }));
      return;
    }
    visibles.forEach((s, i) => {
      const bouton = el('button', {
        classe: 'recherche__option',
        texte: s,
        attrs: { type: 'button', id: `secteur-${i}`, tabindex: '-1' },
      });
      bouton.addEventListener('click', () => choisir(s));
      const ligne = el('li', {
        attrs: { role: 'option', 'aria-selected': String(i === survol) },
      }, [bouton]);
      liste.appendChild(ligne);
    });
  }

  function surligner(delta) {
    if (!ouverte) { ouvrir(true); dessiner(); }
    if (visibles.length === 0) return;
    survol = (survol + delta + visibles.length) % visibles.length;
    dessiner();
    champ.setAttribute('aria-activedescendant', `secteur-${survol}`);
    const actif = liste.children[survol];
    if (actif && actif.scrollIntoView) actif.scrollIntoView({ block: 'nearest' });
  }

  champ.addEventListener('input', () => {
    surChoix(null);
    survol = -1;
    ouvrir(true);
    dessiner();
  });
  champ.addEventListener('focus', () => { ouvrir(true); dessiner(); });
  champ.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); surligner(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); surligner(-1); }
    else if (e.key === 'Enter') {
      if (ouverte && survol >= 0) { e.preventDefault(); choisir(visibles[survol]); }
    } else if (e.key === 'Escape') { ouvrir(false); }
  });

  document.addEventListener('click', (e) => {
    if (!enveloppe.contains(e.target)) ouvrir(false);
  });

  enveloppe.appendChild(champ);
  enveloppe.appendChild(liste);
  bloc.appendChild(enveloppe);
  return { bloc, champ, dessiner };
}

// --------------------------------------------------------------------- écran

function manquants() {
  return OBLIGATOIRES.filter((cle) => !etat[cle]);
}

/** Retire toutes les mises en évidence. */
function oublierLesManques(formulaire) {
  Array.from(formulaire.querySelectorAll('.champ--manquant'))
    .forEach((c) => c.classList.remove('champ--manquant'));
}

/**
 * Montre ce qui manque : les champs concernés passent en bordure sauge et le
 * premier est amené à l'écran. Un bouton simplement inactif n'explique rien.
 */
function montrerLesManques(formulaire, reste) {
  oublierLesManques(formulaire);
  reste.forEach((cle) => {
    const champ = formulaire.querySelector(`[data-champ="${cle}"]`);
    if (champ) champ.classList.add('champ--manquant');
  });

  const premier = formulaire.querySelector(`[data-champ="${reste[0]}"]`);
  if (!premier) return;

  const douceur = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto' : 'smooth';
  premier.scrollIntoView({ behavior: douceur, block: 'center' });

  const premierChoix = premier.querySelector('input, .champ-texte');
  if (premierChoix) premierChoix.focus({ preventScroll: true });
}

async function demarrer() {
  signalerModeDemo();
  const contenu = await chargerContenu();
  const p = contenu.profil;

  texte($('[data-titre]'), p.titre);
  texte($('[data-intro]'), p.texte);

  const formulaire = $('[data-formulaire]');
  const message = $('#message');

  const suivi = (cle) => (valeur) => {
    etat[cle] = valeur;
    const champ = formulaire.querySelector(`[data-champ="${cle}"]`);
    if (champ && valeur) champ.classList.remove('champ--manquant');
    if (manquants().length === 0) messageErreur(message, '');
  };

  formulaire.appendChild(groupePilules('role', p.role, suivi('role')));
  formulaire.appendChild(groupePilules('genre', p.genre, suivi('genre')));
  // Les tranches de taille sont courtes et nombreuses : sur mobile, une par
  // ligne donnait une liste interminable.
  formulaire.appendChild(groupePilules('taille_entreprise', p.taille_entreprise, suivi('taille_entreprise'), true));
  const secteur = champSecteur(p.secteur, suivi('secteur'));
  formulaire.appendChild(secteur.bloc);
  formulaire.appendChild(groupePilules('taille_equipe', p.taille_equipe, suivi('taille_equipe'), true));

  // Rétablit un profil déjà saisi, pour que le retour en arrière ne perde rien.
  const memoire = lire().profil || {};
  Object.entries(memoire).forEach(([cle, valeur]) => {
    if (!valeur) return;
    etat[cle] = valeur;
    if (cle === 'secteur') { secteur.champ.value = valeur; return; }
    const entree = formulaire.querySelector(`input[name="${cle}"][value="${CSS.escape(valeur)}"]`);
    if (entree) entree.checked = true;
  });

  typographierPage();

  formulaire.addEventListener('submit', (e) => {
    e.preventDefault();
    const reste = manquants();
    if (reste.length > 0) {
      // Le message visible porte role="alert" : il est déjà annoncé aux lecteurs
      // d'écran, inutile d'ajouter une seconde zone aria-live.
      messageErreur(message, `Il reste à choisir : ${enumerer(reste.map((c) => NOMMER[c]))}.`);
      montrerLesManques(formulaire, reste);
      return;
    }
    oublierLesManques(formulaire);
    ecrire({
      role: roleDepuisChoix(contenu, etat.role),
      profil: { ...etat },
    });
    location.href = 'questions.html';
  });
}

demarrer();
