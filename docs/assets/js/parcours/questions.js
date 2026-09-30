/**
 * Les 16 affirmations, puis un court écran de relances.
 *
 * Les relances ne s'affichent plus sous les affirmations pendant qu'on répond.
 * Elles se recalculaient à chaque réponse : un encadré déjà rempli pouvait
 * disparaître plus haut sans prévenir, et une réponse « Pas du tout » donnée en
 * bas de page faisait apparaître un encadré tout en haut, hors de l'écran.
 * Voir DECISIONS.md.
 *
 * La version affichée, membre ou manager, suit le rôle choisi au profil.
 * Aucun chiffre n'est affiché : ni valeur de réponse, ni numéro, ni pourcentage.
 */

import { chargerContenu, texteAffirmation, relance as relancePour } from '../contenu.js';
import { NB_AFFIRMATIONS, affirmationsRelancees } from '../calcul.js';
import { lienResultat } from '../lien.js';
import { lire, ecrire } from '../session.js';
import { envoyerReponse } from '../api.js';
import {
  $, $$, el, vider, signalerModeDemo, typographierPage,
  messageErreur, evenement,
} from './commun.js';

/** Clé de la valeur « Autre » dans une relance, telle qu'enregistrée. */
const AUTRE = 'autre';

/** Le défilement doit être instantané pour qui demande moins d'animation. */
function douceur() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  } catch (e) {
    return 'auto';
  }
}

/** Amène une affirmation à l'écran, juste sous l'en-tête. */
function amenerAEcran(n) {
  const carte = $(`[data-affirmation="${n}"]`);
  if (carte) carte.scrollIntoView({ behavior: douceur(), block: 'start' });
  return carte;
}

/** Le numéro de la première affirmation encore sans réponse. */
function premiereSansReponse(reponses, depuis = 1) {
  for (let n = depuis; n <= NB_AFFIRMATIONS; n += 1) {
    if (!Number.isInteger(reponses[n - 1])) return n;
  }
  for (let n = 1; n < depuis; n += 1) {
    if (!Number.isInteger(reponses[n - 1])) return n;
  }
  return null;
}

const etat = {
  role: 'membre',
  reponses: new Array(NB_AFFIRMATIONS).fill(null),
  relances: {},      // { "3": [0, 2, "autre"] }
  commence: false,
};

let contenu = null;

// ------------------------------------------------------------------- écrans

/** Bascule entre les deux écrans, sans changer d'URL. */
function montrerEcran(nom) {
  $$('[data-ecran]').forEach((section) => {
    section.hidden = section.dataset.ecran !== nom;
  });
  const titre = $(`[data-ecran="${nom}"] .titre-page`);
  if (titre) {
    titre.setAttribute('tabindex', '-1');
    titre.focus({ preventScroll: true });
  }
  window.scrollTo({ top: 0, behavior: 'auto' });
}

// ----------------------------------------------------------------- échelle

function echelle(n, surChoix) {
  const groupe = el('div', {
    classe: 'echelle',
    attrs: { role: 'group', 'aria-label': `Votre réponse à l'affirmation ${n}` },
  });
  contenu.echelle.forEach((cran) => {
    const bouton = el('button', {
      classe: 'echelle__choix',
      texte: cran.libelle,
      attrs: { type: 'button', 'aria-pressed': 'false', 'data-valeur': cran.valeur },
    });
    bouton.addEventListener('click', () => {
      Array.from(groupe.children).forEach((b) => b.setAttribute('aria-pressed', 'false'));
      bouton.setAttribute('aria-pressed', 'true');
      surChoix(cran.valeur);
    });
    groupe.appendChild(bouton);
  });
  return groupe;
}

// ---------------------------------------------------------------- relances

/**
 * Un encadré de relance, pour l'écran de fin.
 * Les choix sont des lignes pleine largeur : en pilules, ils passaient sur
 * 2 lignes sur mobile et devenaient illisibles.
 */
function blocRelance(n) {
  const def = relancePour(contenu, n, etat.role);
  if (!def) return null;

  const idIntitule = `relance-${n}-intitule`;
  const cases = [];

  const choix = el('div', { classe: 'relance__choix' });
  const valeurs = def.choix.map((_, i) => i).concat([AUTRE]);
  const libelles = def.choix.concat([contenu.relance.autre]);

  libelles.forEach((libelle, i) => {
    const valeur = valeurs[i];
    const entree = el('input', {
      attrs: { type: 'checkbox', name: `relance_q${n}`, value: String(valeur) },
    });
    entree.dataset.valeur = String(valeur);
    entree.addEventListener('change', () => {
      const cochees = cases.filter((c) => c.checked).map((c) => c.dataset.valeur);
      if (cochees.length > contenu.relance.max_choix) {
        entree.checked = false;
        return;
      }
      etat.relances[n] = cochees.map((v) => (v === AUTRE ? AUTRE : Number(v)));
      if (etat.relances[n].length === 0) delete etat.relances[n];
      limiterChoix(cases);
      sauver();
    });
    cases.push(entree);
    choix.appendChild(el('label', { classe: 'choix choix--ligne' }, [entree, libelle]));
  });

  const cadre = el('div', {
    classe: 'carte relance',
    attrs: { role: 'group', 'aria-labelledby': idIntitule },
  }, [
    // On rappelle l'affirmation : sans elle, le souhait ne veut rien dire.
    el('p', { classe: 'relance__affirmation', texte: texteAffirmation(contenu, n, etat.role) }),
    el('p', { classe: 'relance__question', attrs: { id: idIntitule } }, [
      def.debut,
      el('span', { classe: 'relance__sous-titre', texte: contenu.relance.sous_titre }),
    ]),
    choix,
  ]);

  return { cadre, cases, n };
}

/** Désactive les choix non cochés dès que le maximum est atteint. */
function limiterChoix(cases) {
  const atteint = cases.filter((c) => c.checked).length >= contenu.relance.max_choix;
  cases.forEach((c) => { c.disabled = atteint && !c.checked; });
}

/**
 * Construit l'écran de relances à partir des réponses en cours.
 * @returns {boolean} faux si aucune affirmation n'est assez réservée.
 */
function construireRelances() {
  const retenues = affirmationsRelancees(etat.reponses, contenu);
  const hote = $('[data-formulaire-relances]');
  vider(hote);

  // Les choix d'une affirmation qui n'est plus retenue n'ont plus lieu d'être.
  Object.keys(etat.relances).forEach((n) => {
    if (!retenues.includes(Number(n))) delete etat.relances[n];
  });

  if (retenues.length === 0) return false;

  // Affichées dans l'ordre des affirmations, plus naturel à lire.
  retenues.slice().sort((a, b) => a - b).forEach((n) => {
    const bloc = blocRelance(n);
    if (!bloc) return;
    const dejaChoisis = (etat.relances[n] || []).map(String);
    bloc.cases.forEach((c) => { c.checked = dejaChoisis.includes(c.dataset.valeur); });
    limiterChoix(bloc.cases);
    hote.appendChild(bloc.cadre);
  });

  typographierPage(hote);
  return true;
}

// ------------------------------------------------------------------ l'écran

function sauver() {
  ecrire({ reponses: etat.reponses, relances: etat.relances });
}

function repondues() {
  return etat.reponses.filter((v) => Number.isInteger(v)).length;
}

/**
 * La jauge de progression. Aucun chiffre n'est affiché.
 *
 * « Continuer » reste cliquable même incomplet : au clic, il amène à la
 * première affirmation sans réponse plutôt que de rester inerte sans rien dire.
 */
function majProgression() {
  const jauge = $('[data-jauge]');
  if (jauge) jauge.style.width = `${(repondues() / NB_AFFIRMATIONS) * 100}%`;
}

function construire(formulaire) {
  let groupeCourant = null;

  contenu.affirmations.forEach((a) => {
    if (a.groupe !== groupeCourant) {
      groupeCourant = a.groupe;
      formulaire.appendChild(el('h2', { classe: 'groupe', texte: a.groupe }));
    }

    const carte = el('div', { classe: 'carte affirmation', attrs: { 'data-affirmation': a.n } });
    carte.appendChild(el('p', {
      classe: 'affirmation__texte',
      texte: texteAffirmation(contenu, a.n, etat.role),
    }));

    carte.appendChild(echelle(a.n, (valeur) => {
      if (!etat.commence) {
        etat.commence = true;
        evenement('commence');
      }
      // Une réponse déjà donnée qu'on change ne doit pas faire sauter la page.
      const premiereFois = !Number.isInteger(etat.reponses[a.n - 1]);
      etat.reponses[a.n - 1] = valeur;
      majProgression();
      sauver();
      messageErreur($('#message'), '');
      carte.classList.remove('affirmation--manquante');

      if (premiereFois) {
        const suivante = premiereSansReponse(etat.reponses, a.n + 1);
        if (suivante) window.setTimeout(() => amenerAEcran(suivante), 120);
      }
    }));

    formulaire.appendChild(carte);
  });
}

/** Rétablit un questionnaire déjà commencé. */
function retablir(formulaire) {
  const memoire = lire();
  if (Array.isArray(memoire.reponses) && memoire.reponses.length === NB_AFFIRMATIONS) {
    etat.reponses = memoire.reponses.slice();
    etat.commence = etat.reponses.some((v) => Number.isInteger(v));
    $$('.echelle', formulaire).forEach((groupe, i) => {
      const valeur = etat.reponses[i];
      if (!Number.isInteger(valeur)) return;
      Array.from(groupe.children).forEach((b) => {
        b.setAttribute('aria-pressed', String(Number(b.dataset.valeur) === valeur));
      });
    });
  }
  etat.relances = { ...(memoire.relances || {}) };
}

// ------------------------------------------------------------------- l'envoi

async function allerAuResultat() {
  const memoire = lire();
  // Le hash du lien personnel n'est jamais envoyé : seules les réponses partent.
  await envoyerReponse({
    version: 'v1',
    role: etat.role,
    profil: memoire.profil || {},
    reponses: etat.reponses,
    relances: etat.relances,
  });
  evenement('termine');
  location.href = lienResultat(etat.role, etat.reponses);
}

// ---------------------------------------------------------------- démarrage

async function demarrer() {
  signalerModeDemo();
  contenu = await chargerContenu();

  const memoire = lire();
  if (!memoire.role) {
    // Sans profil, la version des affirmations est indéterminée.
    location.replace('profil.html');
    return;
  }
  etat.role = memoire.role;

  const formulaire = $('[data-formulaire]');
  const continuer = $('[data-continuer]');
  vider(formulaire);
  construire(formulaire);
  retablir(formulaire);
  majProgression();
  typographierPage($('[data-ecran="affirmations"]'));

  // Des 16 affirmations vers les relances, ou directement vers le résultat.
  formulaire.addEventListener('submit', async (e) => {
    e.preventDefault();
    const reste = NB_AFFIRMATIONS - repondues();
    if (reste > 0) {
      messageErreur($('#message'), reste === 1
        ? 'Il reste une affirmation sans réponse.'
        : `Il en reste ${reste} sans réponse.`);
      const premiere = premiereSansReponse(etat.reponses);
      const carte = amenerAEcran(premiere);
      if (carte) {
        carte.classList.add('affirmation--manquante');
        const premierChoix = carte.querySelector('.echelle__choix');
        if (premierChoix) premierChoix.focus({ preventScroll: true });
      }
      return;
    }
    if (construireRelances()) {
      montrerEcran('relances');
      return;
    }
    continuer.disabled = true;
    await allerAuResultat();
  });

  // Des relances vers le résultat.
  $('[data-formulaire-relances]').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('[data-voir]').disabled = true;
    await allerAuResultat();
  });

  // « Passer » : on part au résultat sans envoyer de souhait.
  $('[data-passer]').addEventListener('click', async () => {
    etat.relances = {};
    sauver();
    $('[data-passer]').disabled = true;
    await allerAuResultat();
  });

  // « Retour » : on revient aux affirmations sans rien perdre.
  $('[data-retour-affirmations]').addEventListener('click', (e) => {
    e.preventDefault();
    montrerEcran('affirmations');
  });
}

demarrer();
