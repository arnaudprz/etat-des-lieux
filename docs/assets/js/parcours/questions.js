/**
 * Les 16 affirmations et leurs relances.
 *
 * La version affichée (membre ou manager) suit le rôle choisi au profil : il n'y
 * a pas de bascule ici, contrairement à la maquette qui sert d'aperçu.
 *
 * Aucun chiffre n'est affiché : ni valeur de réponse, ni numéro d'affirmation,
 * ni pourcentage de progression.
 */

import { chargerContenu, texteAffirmation, relance as relancePour } from '../contenu.js';
import { NB_AFFIRMATIONS, affirmationsRelancees } from '../calcul.js';
import { lienResultat } from '../lien.js';
import { lire, ecrire } from '../session.js';
import { envoyerReponse } from '../api.js';
import {
  $, el, vider, signalerModeDemo, typographierPage,
  messageErreur, evenement,
} from './commun.js';

/** Clé de la valeur « Autre » dans une relance, telle qu'enregistrée. */
const AUTRE = 'autre';

const etat = {
  role: 'membre',
  reponses: new Array(NB_AFFIRMATIONS).fill(null),
  relances: {},      // { "3": [0, 2, "autre"] }
  commence: false,
};

let contenu = null;
/** Les blocs de relance, indexés par numéro d'affirmation. */
const blocsRelance = new Map();

// ----------------------------------------------------------------- une échelle

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

// ----------------------------------------------------------------- une relance

/**
 * Construit l'encadré de relance d'une affirmation. Caché par défaut : il
 * n'apparaît que si l'affirmation fait partie des 2 plus réservées.
 */
function blocRelance(n) {
  const def = relancePour(contenu, n, etat.role);
  if (!def) return null;

  const cadre = el('fieldset', { classe: 'relance' });
  cadre.hidden = true;

  const legende = el('legend', { classe: 'relance__question' });
  legende.appendChild(document.createTextNode(def.debut));
  legende.appendChild(el('span', {
    classe: 'relance__sous-titre',
    texte: contenu.relance.sous_titre,
  }));
  cadre.appendChild(legende);

  const choix = el('div', { classe: 'relance__choix' });
  const cases = [];
  const valeurs = def.choix.map((_, i) => i).concat([AUTRE]);
  const libelles = def.choix.concat([contenu.relance.autre]);

  libelles.forEach((libelle, i) => {
    const valeur = valeurs[i];
    const entree = el('input', {
      attrs: { type: 'checkbox', name: `relance_q${n}`, value: String(valeur) },
    });
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
    entree.dataset.valeur = String(valeur);
    cases.push(entree);
    choix.appendChild(el('label', { classe: 'choix' }, [entree, libelle]));
  });

  cadre.appendChild(choix);
  return { cadre, cases };
}

/** Désactive les choix non cochés dès que le maximum est atteint. */
function limiterChoix(cases) {
  const atteint = cases.filter((c) => c.checked).length >= contenu.relance.max_choix;
  cases.forEach((c) => { c.disabled = atteint && !c.checked; });
}

/** Décoche et oublie les choix d'une relance qui disparaît. */
function viderRelance(n) {
  const bloc = blocsRelance.get(n);
  if (!bloc) return;
  bloc.cases.forEach((c) => { c.checked = false; c.disabled = false; });
  delete etat.relances[n];
}

/**
 * Recalcule les 2 affirmations les plus réservées et met les encadrés à jour.
 * Les relances qui sortent de la sélection sont effacées.
 */
function majRelances() {
  const retenues = affirmationsRelancees(etat.reponses, contenu);
  blocsRelance.forEach((bloc, n) => {
    const visible = retenues.includes(n);
    if (!visible && !bloc.cadre.hidden) viderRelance(n);
    bloc.cadre.hidden = !visible;
  });
}

// ------------------------------------------------------------------- l'écran

function sauver() {
  ecrire({ reponses: etat.reponses, relances: etat.relances });
}

function repondues() {
  return etat.reponses.filter((v) => Number.isInteger(v)).length;
}

function majProgression(bouton) {
  const n = repondues();
  const jauge = $('[data-jauge]');
  if (jauge) jauge.style.width = `${(n / NB_AFFIRMATIONS) * 100}%`;
  const complet = n === NB_AFFIRMATIONS;
  bouton.disabled = !complet;
  bouton.setAttribute('aria-disabled', String(!complet));
}

function construire(formulaire, bouton) {
  let groupeCourant = null;

  contenu.affirmations.forEach((a) => {
    if (a.groupe !== groupeCourant) {
      groupeCourant = a.groupe;
      formulaire.appendChild(el('h2', { classe: 'groupe', texte: a.groupe }));
    }

    const carte = el('div', { classe: 'carte affirmation' });
    carte.appendChild(el('p', {
      classe: 'affirmation__texte',
      texte: texteAffirmation(contenu, a.n, etat.role),
    }));

    carte.appendChild(echelle(a.n, (valeur) => {
      if (!etat.commence) {
        etat.commence = true;
        evenement('commence');
      }
      etat.reponses[a.n - 1] = valeur;
      majRelances();
      majProgression(bouton);
      sauver();
      messageErreur($('#message'), '');
    }));

    const bloc = blocRelance(a.n);
    if (bloc) {
      blocsRelance.set(a.n, bloc);
      carte.appendChild(bloc.cadre);
    }

    formulaire.appendChild(carte);
  });
}

/** Rétablit un questionnaire déjà commencé. */
function retablir(formulaire) {
  const memoire = lire();
  if (Array.isArray(memoire.reponses) && memoire.reponses.length === NB_AFFIRMATIONS) {
    etat.reponses = memoire.reponses.slice();
    etat.commence = etat.reponses.some((v) => Number.isInteger(v));
    const echelles = Array.from(formulaire.querySelectorAll('.echelle'));
    echelles.forEach((groupe, i) => {
      const valeur = etat.reponses[i];
      if (!Number.isInteger(valeur)) return;
      Array.from(groupe.children).forEach((b) => {
        b.setAttribute('aria-pressed', String(Number(b.dataset.valeur) === valeur));
      });
    });
  }

  etat.relances = { ...(memoire.relances || {}) };
  majRelances();
  Object.entries(etat.relances).forEach(([n, choix]) => {
    const bloc = blocsRelance.get(Number(n));
    if (!bloc || bloc.cadre.hidden) { delete etat.relances[n]; return; }
    bloc.cases.forEach((c) => {
      c.checked = choix.map(String).includes(c.dataset.valeur);
    });
    limiterChoix(bloc.cases);
  });
}

// ------------------------------------------------------------------- l'envoi

async function envoyer() {
  const memoire = lire();
  // Le hash du lien personnel n'est jamais envoyé : seules les réponses partent.
  const charge = {
    version: 'v1',
    role: etat.role,
    profil: memoire.profil || {},
    reponses: etat.reponses,
    relances: etat.relances,
  };
  await envoyerReponse(charge);
  evenement('termine');
}

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
  const bouton = $('[data-voir]');
  vider(formulaire);
  construire(formulaire, bouton);
  retablir(formulaire);
  majProgression(bouton);
  typographierPage();

  formulaire.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (repondues() < NB_AFFIRMATIONS) {
      // Le message visible porte role="alert" : inutile de l'annoncer deux fois.
      messageErreur($('#message'), 'Il reste des affirmations sans réponse.');
      return;
    }
    bouton.disabled = true;
    await envoyer();
    location.href = lienResultat(etat.role, etat.reponses);
  });
}

demarrer();
