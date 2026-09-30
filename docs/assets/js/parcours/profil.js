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

// --------------------------------------------------------- liste des secteurs

/** Nombre de lignes visibles avant que la liste ne défile sur elle-même. */
const LIGNES_VISIBLES = 6;

/**
 * Le choix du secteur.
 *
 * La liste vit dans le flux, sous le champ de recherche, et non en
 * surimpression : elle recouvrait la suite du formulaire et le bouton
 * « Continuer ». Une fois le secteur choisi, la liste se referme et laisse une
 * pastille avec un lien « Modifier ».
 */
function champSecteur(definition, surChoix) {
  const bloc = el('div', { classe: 'champ', attrs: { 'data-champ': 'secteur' } });
  const idIntitule = 'intitule-secteur';

  bloc.appendChild(el('p', {
    classe: 'champ__intitule',
    texte: definition.question,
    attrs: { id: idIntitule },
  }));

  // Ce qui est montré quand un secteur est déjà choisi.
  const choisi = el('div', { classe: 'secteur-choisi' });
  const pastilleChoisi = el('span', { classe: 'secteur-choisi__valeur' });
  const modifier = el('button', {
    classe: 'lien-discret',
    texte: 'Modifier',
    attrs: { type: 'button' },
  });
  choisi.appendChild(pastilleChoisi);
  choisi.appendChild(modifier);
  choisi.hidden = true;

  // La recherche et la liste.
  const recherche = el('div', { classe: 'recherche' });
  recherche.innerHTML =
    '<svg class="recherche__loupe" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" '
    + 'fill="none" stroke="#6B6460" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    + '<circle cx="11" cy="11" r="7"></circle><line x1="16.5" y1="16.5" x2="21" y2="21"></line></svg>';

  const champ = el('input', {
    classe: 'champ-texte',
    attrs: {
      id: 'secteur', type: 'text', role: 'combobox', autocomplete: 'off',
      'aria-autocomplete': 'list', 'aria-controls': 'secteurs', 'aria-expanded': 'true',
      'aria-labelledby': idIntitule,
      placeholder: 'Rechercher, par exemple santé',
    },
  });
  recherche.appendChild(champ);

  const liste = el('ul', {
    classe: 'secteurs',
    attrs: { id: 'secteurs', role: 'listbox', 'aria-labelledby': idIntitule },
  });

  // Le nombre de résultats est annoncé, jamais affiché.
  const annonce = el('p', {
    classe: 'lecteur-ecran',
    attrs: { role: 'status', 'aria-live': 'polite' },
  });

  const zone = el('div', { classe: 'secteur-recherche' }, [recherche, liste, annonce]);

  const tous = definition.choix.filter((x) => x !== 'Autre');
  const autre = definition.choix.includes('Autre') ? 'Autre' : null;

  let survol = -1;
  let visibles = [];
  let valeur = null;

  /** Met en gras les lettres trouvées. */
  function surligner(texte, requete) {
    if (!requete) return [texte];
    const sans = normaliser(texte);
    const debut = sans.indexOf(requete);
    if (debut < 0) return [texte];
    return [
      texte.slice(0, debut),
      el('strong', { texte: texte.slice(debut, debut + requete.length) }),
      texte.slice(debut + requete.length),
    ];
  }

  function fermer(secteur) {
    valeur = secteur;
    texte(pastilleChoisi, secteur);
    choisi.hidden = false;
    zone.hidden = true;
    champ.setAttribute('aria-expanded', 'false');
    surChoix(secteur);
    modifier.focus({ preventScroll: true });
  }

  function rouvrir() {
    choisi.hidden = true;
    zone.hidden = false;
    champ.setAttribute('aria-expanded', 'true');
    champ.value = '';
    survol = -1;
    dessiner();
    champ.focus({ preventScroll: true });
  }

  function dessiner() {
    const requete = normaliser(champ.value.trim());
    const trouves = tous.filter((x) => requete === '' || normaliser(x).includes(requete));

    // « Autre » accompagne la liste, mais ne la remplit pas : sans cela, une
    // recherche sans résultat n'aurait jamais l'air vide.
    visibles = trouves.length > 0 && autre ? trouves.concat([autre]) : trouves;

    vider(liste);

    if (visibles.length === 0) {
      liste.appendChild(el('li', { classe: 'secteurs__vide' }, [
        el('span', { texte: 'Aucun secteur ne correspond.' }),
        (() => {
          const b = el('button', {
            classe: 'bouton-doux',
            texte: 'Choisir Autre',
            attrs: { type: 'button' },
          });
          b.addEventListener('click', () => fermer(autre || 'Autre'));
          return b;
        })(),
      ]));
      annonce.textContent = 'Aucun secteur ne correspond.';
      return;
    }

    visibles.forEach((secteur, i) => {
      const bouton = el('button', {
        classe: 'secteurs__choix',
        attrs: {
          type: 'button', id: `secteur-${i}`, tabindex: '-1',
          'data-secteur': secteur,
        },
      }, [
        el('span', { classe: 'secteurs__rond', attrs: { 'aria-hidden': 'true' } }),
        el('span', { classe: 'secteurs__nom' }, surligner(secteur, requete)),
      ]);
      bouton.addEventListener('click', () => fermer(secteur));

      liste.appendChild(el('li', {
        classe: 'secteurs__ligne' + (i === survol ? ' secteurs__ligne--survol' : ''),
        attrs: { role: 'option', 'aria-selected': String(secteur === valeur) },
      }, [bouton]));
    });

    annonce.textContent = visibles.length === 1
      ? '1 secteur proposé.'
      : `${visibles.length} secteurs proposés.`;
  }

  function deplacer(pas) {
    if (visibles.length === 0) return;
    survol = (survol + pas + visibles.length) % visibles.length;
    dessiner();
    champ.setAttribute('aria-activedescendant', `secteur-${survol}`);
    const actif = liste.children[survol];
    if (actif && actif.scrollIntoView) actif.scrollIntoView({ block: 'nearest' });
  }

  champ.addEventListener('input', () => {
    survol = -1;
    dessiner();
  });

  champ.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); deplacer(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); deplacer(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (survol >= 0) fermer(visibles[survol]);
      else if (visibles.length === 1) fermer(visibles[0]);
    } else if (e.key === 'Escape') {
      champ.value = '';
      survol = -1;
      dessiner();
    }
  });

  modifier.addEventListener('click', rouvrir);

  bloc.appendChild(choisi);
  bloc.appendChild(zone);
  liste.style.setProperty('--lignes-visibles', String(LIGNES_VISIBLES));
  dessiner();

  return {
    bloc,
    champ,
    /** Rétablit un secteur déjà choisi, au retour en arrière. */
    retablir(secteur) {
      if (secteur) fermer(secteur);
    },
  };
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
    if (cle === 'secteur') { secteur.retablir(valeur); return; }
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
