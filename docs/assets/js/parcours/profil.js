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

/** Le rôle choisi, ramené à la clé utilisée partout ailleurs. */
function roleDepuisChoix(contenu, valeur) {
  return valeur === contenu.profil.role.choix[0] ? 'manager' : 'membre';
}

const etat = { role: null, genre: null, taille_entreprise: null, secteur: null, taille_equipe: null };

// ------------------------------------------------------------- champs à pilules

function groupePilules(cle, definition, surChoix) {
  const bloc = el('fieldset', { classe: 'champ' });
  const intitule = el('legend', { classe: 'champ__intitule' });
  intitule.appendChild(document.createTextNode(definition.question));
  if (definition.facultatif) {
    intitule.appendChild(el('span', { classe: 'champ__facultatif', texte: ' (facultatif)' }));
  }
  bloc.appendChild(intitule);

  const pilules = el('div', { classe: 'pilules' });
  definition.choix.forEach((choix) => {
    const entree = el('input', { attrs: { type: 'radio', name: cle, value: choix } });
    entree.addEventListener('change', () => surChoix(choix));
    const etiquette = el('label', { classe: 'pilule' }, [entree, choix]);
    pilules.appendChild(etiquette);
  });
  bloc.appendChild(pilules);
  return bloc;
}

// --------------------------------------------------------- combobox du secteur

/**
 * Champ de recherche des secteurs : combobox accessible, recherche insensible
 * aux accents et à la casse. « Autre » reste toujours proposé.
 */
function champSecteur(definition, surChoix) {
  const bloc = el('div', { classe: 'champ' });
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

function majBouton(bouton) {
  const reste = manquants();
  const pret = reste.length === 0;
  bouton.disabled = !pret;
  bouton.setAttribute('aria-disabled', String(!pret));
}

async function demarrer() {
  signalerModeDemo();
  const contenu = await chargerContenu();
  const p = contenu.profil;

  texte($('[data-titre]'), p.titre);
  texte($('[data-intro]'), p.texte);

  const formulaire = $('[data-formulaire]');
  const bouton = $('[data-continuer]');
  const message = $('#message');

  const suivi = (cle) => (valeur) => {
    etat[cle] = valeur;
    majBouton(bouton);
    messageErreur(message, '');
  };

  formulaire.appendChild(groupePilules('role', p.role, suivi('role')));
  formulaire.appendChild(groupePilules('genre', p.genre, suivi('genre')));
  formulaire.appendChild(groupePilules('taille_entreprise', p.taille_entreprise, suivi('taille_entreprise')));
  const secteur = champSecteur(p.secteur, suivi('secteur'));
  formulaire.appendChild(secteur.bloc);
  formulaire.appendChild(groupePilules('taille_equipe', p.taille_equipe, suivi('taille_equipe')));

  // Rétablit un profil déjà saisi, pour que le retour en arrière ne perde rien.
  const memoire = lire().profil || {};
  Object.entries(memoire).forEach(([cle, valeur]) => {
    if (!valeur) return;
    etat[cle] = valeur;
    if (cle === 'secteur') { secteur.champ.value = valeur; return; }
    const entree = formulaire.querySelector(`input[name="${cle}"][value="${CSS.escape(valeur)}"]`);
    if (entree) entree.checked = true;
  });

  majBouton(bouton);
  typographierPage();

  formulaire.addEventListener('submit', (e) => {
    e.preventDefault();
    const reste = manquants();
    if (reste.length > 0) {
      const intitules = {
        role: p.role.question,
        taille_entreprise: p.taille_entreprise.question,
        secteur: p.secteur.question,
        taille_equipe: p.taille_equipe.question,
      };
      const liste = reste.map((c) => intitules[c]).join(', ');
      const m = reste.length === 1
        ? `Il reste une question à renseigner : ${liste}.`
        : `Il reste des questions à renseigner : ${liste}.`;
      // Le message visible porte role="alert" : il est déjà annoncé. Une
      // seconde zone aria-live le ferait lire deux fois.
      messageErreur(message, m);
      return;
    }
    ecrire({
      role: roleDepuisChoix(contenu, etat.role),
      profil: { ...etat },
    });
    location.href = 'questions.html';
  });
}

demarrer();
