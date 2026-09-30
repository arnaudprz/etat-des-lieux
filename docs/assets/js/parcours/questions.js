/**
 * Les 16 affirmations, chacune avec sa question « J'aimerais… ».
 *
 * Règle : toute réponse « Pas encore » ou « Un peu » ouvre immédiatement, sous
 * les boutons de la même carte, sa question et ses choix. Sans limite de nombre.
 * « En bonne partie » ou « Pleinement » la referment.
 *
 * L'ouverture d'un encadré ne dépend que de la réponse à son affirmation :
 * aucune réponse ailleurs ne peut en ouvrir, fermer ou vider un autre. C'est ce
 * qui supprime les sauts de page et les choix perdus des versions précédentes.
 * Voir DECISIONS.md.
 *
 * Aucun chiffre n'est affiché : ni valeur de réponse, ni numéro, ni pourcentage.
 */

import { chargerContenu, texteAffirmation, relance as relancePour } from '../contenu.js';
import { NB_AFFIRMATIONS, ouvreUneRelance, relancesAEnvoyer } from '../calcul.js';
import { lienResultat } from '../lien.js';
import { lire, ecrire } from '../session.js';
import { envoyerReponse } from '../api.js';
import {
  $, $$, el, texte, vider, signalerModeDemo, typographierPage,
  messageErreur, annoncer, evenement,
} from './commun.js';

/** Clé de la valeur « Autre » dans une relance, telle qu'enregistrée. */
const AUTRE = 'autre';

/** Durée de l'ouverture d'un encadré. */
const OUVERTURE_MS = 200;

const etat = {
  role: 'membre',
  reponses: new Array(NB_AFFIRMATIONS).fill(null),
  /**
   * Les choix cochés, gardés même quand l'encadré se referme : s'il se rouvre,
   * les cases réapparaissent. Seules les relances des réponses finales 0 ou 1
   * sont envoyées.
   */
  relances: {},
  commence: false,
};

let contenu = null;

/** Les blocs de relance, indexés par numéro d'affirmation. */
const blocs = new Map();

// ---------------------------------------------------------------- outillage

function animationsReduites() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    return false;
  }
}

const douceur = () => (animationsReduites() ? 'auto' : 'smooth');

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

// ----------------------------------------------------------------- échelle

function echelle(n, surChoix) {
  const groupe = el('div', {
    classe: 'echelle',
    attrs: { role: 'group', 'aria-label': `Votre réponse à l'affirmation ${n}` },
  });
  contenu.echelle.forEach((cran) => {
    const bouton = el('button', {
      classe: 'echelle__choix',
      attrs: { type: 'button', 'aria-pressed': 'false', 'data-valeur': cran.valeur },
    }, [
      // Une coche discrète : la couleur ne doit pas être le seul repère.
      el('span', { classe: 'echelle__coche', attrs: { 'aria-hidden': 'true' } }),
      el('span', { classe: 'echelle__libelle', texte: cran.libelle }),
    ]);
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

/** Désactive les choix non cochés dès que le maximum est atteint. */
function limiterChoix(cases) {
  const atteint = cases.filter((c) => c.checked).length >= contenu.relance.max_choix;
  cases.forEach((c) => { c.disabled = atteint && !c.checked; });
}

/**
 * L'encadré d'une affirmation. Construit une fois, montré ou caché ensuite.
 * Pas de <fieldset> ni de <legend> : un role="group" avec aria-labelledby
 * donne la même accessibilité sans les bizarreries de mise en page.
 */
function construireRelance(n, surChoixSuivant) {
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

  const suivant = el('button', {
    classe: 'lien-discret relance__suivant',
    texte: 'Question suivante',
    attrs: { type: 'button' },
  });
  suivant.addEventListener('click', () => surChoixSuivant(n));

  const corps = el('div', {
    classe: 'relance',
    attrs: { role: 'group', 'aria-labelledby': idIntitule },
  }, [
    el('p', { classe: 'relance__question', attrs: { id: idIntitule } }, [
      el('strong', { texte: def.debut }),
      el('span', { classe: 'relance__sous-titre', texte: contenu.relance.sous_titre }),
    ]),
    choix,
    suivant,
  ]);

  // L'enveloppe porte l'animation de hauteur : rien ne bouge au-dessus.
  const enveloppe = el('div', { classe: 'relance-enveloppe' }, [corps]);
  enveloppe.hidden = true;

  return { enveloppe, corps, cases, n };
}

/** Ouvre ou ferme l'encadré d'une affirmation, avec une courte animation. */
function basculerRelance(n, ouvert) {
  const bloc = blocs.get(n);
  if (!bloc) return;
  const { enveloppe, corps } = bloc;

  if (ouvert === !enveloppe.hidden) return; // déjà dans le bon état

  if (ouvert) {
    enveloppe.hidden = false;
    // On rétablit les choix gardés en mémoire.
    const dejaChoisis = (etat.relances[n] || []).map(String);
    bloc.cases.forEach((c) => { c.checked = dejaChoisis.includes(c.dataset.valeur); });
    limiterChoix(bloc.cases);

    if (animationsReduites()) {
      enveloppe.style.height = 'auto';
    } else {
      const hauteur = corps.getBoundingClientRect().height;
      enveloppe.style.height = '0px';
      enveloppe.style.transition = `height ${OUVERTURE_MS}ms ease`;
      requestAnimationFrame(() => { enveloppe.style.height = `${hauteur}px`; });
      window.setTimeout(() => { enveloppe.style.height = 'auto'; }, OUVERTURE_MS + 30);
    }
    annoncer('Une question en plus s’est ouverte');
  } else {
    // Les choix restent en mémoire : seul l'affichage se referme.
    enveloppe.hidden = true;
    enveloppe.style.height = '';
  }
}

/** Montre l'encadré en entier s'il dépasse du bas de l'écran. */
function rendreVisible(n) {
  const bloc = blocs.get(n);
  if (!bloc || bloc.enveloppe.hidden) return;
  window.setTimeout(() => {
    const bas = bloc.corps.getBoundingClientRect().bottom;
    const debord = bas - window.innerHeight + 16;
    if (debord > 0) window.scrollBy({ top: debord, behavior: douceur() });
  }, OUVERTURE_MS + 50);
}

// ------------------------------------------------------------------ l'écran

function sauver() {
  ecrire({ reponses: etat.reponses, relances: etat.relances });
}

function repondues() {
  return etat.reponses.filter((v) => Number.isInteger(v)).length;
}

/** La jauge, et le récapitulatif du bas. Aucun chiffre de réponse. */
function majProgression() {
  const n = repondues();
  const jauge = $('[data-jauge]');
  if (jauge) jauge.style.width = `${(n / NB_AFFIRMATIONS) * 100}%`;

  const recap = $('[data-recapitulatif]');
  if (!recap) return;
  const reste = NB_AFFIRMATIONS - n;
  vider(recap);
  if (reste === 0) {
    texte(recap, contenu.questions.recapitulatif_complet);
    recap.classList.remove('recapitulatif--reste');
    return;
  }
  recap.classList.add('recapitulatif--reste');
  const lien = el('button', {
    classe: 'lien-discret',
    texte: 'Aller à la première',
    attrs: { type: 'button' },
  });
  lien.addEventListener('click', () => montrerLesManques());
  recap.appendChild(document.createTextNode(
    reste === 1 ? 'Il reste 1 affirmation' : `Il reste ${reste} affirmations`
  ));
  recap.appendChild(lien);
}

/** Amène à la première affirmation sans réponse et la met en évidence. */
function montrerLesManques() {
  const premiere = premiereSansReponse(etat.reponses);
  if (!premiere) return;
  const carte = amenerAEcran(premiere);
  if (!carte) return;
  carte.classList.add('affirmation--manquante');
  const premierChoix = carte.querySelector('.echelle__choix');
  if (premierChoix) premierChoix.focus({ preventScroll: true });
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
      const premiereFois = !Number.isInteger(etat.reponses[a.n - 1]);
      etat.reponses[a.n - 1] = valeur;
      carte.classList.remove('affirmation--manquante');
      majProgression();
      sauver();
      messageErreur($('#message'), '');

      const reserve = ouvreUneRelance(valeur, contenu);
      basculerRelance(a.n, reserve);

      if (reserve) {
        // On reste sur la carte : la question qui vient de s'ouvrir se lit ici.
        rendreVisible(a.n);
        return;
      }
      if (premiereFois) {
        const suivante = premiereSansReponse(etat.reponses, a.n + 1);
        if (suivante) window.setTimeout(() => amenerAEcran(suivante), 120);
      }
    }));

    const bloc = construireRelance(a.n, (n) => {
      const suivante = premiereSansReponse(etat.reponses, n + 1) || Math.min(n + 1, NB_AFFIRMATIONS);
      amenerAEcran(suivante);
    });
    if (bloc) {
      blocs.set(a.n, bloc);
      carte.appendChild(bloc.enveloppe);
    }

    formulaire.appendChild(carte);
  });
}

/** Rétablit un questionnaire déjà commencé. */
function retablir(formulaire) {
  const memoire = lire();
  etat.relances = { ...(memoire.relances || {}) };

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

  // Chaque encadré suit la réponse de son affirmation, et rien d'autre.
  blocs.forEach((bloc, n) => {
    const ouvert = ouvreUneRelance(etat.reponses[n - 1], contenu);
    bloc.enveloppe.hidden = !ouvert;
    if (!ouvert) return;
    const dejaChoisis = (etat.relances[n] || []).map(String);
    bloc.cases.forEach((c) => { c.checked = dejaChoisis.includes(c.dataset.valeur); });
    limiterChoix(bloc.cases);
  });
}

// ------------------------------------------------------------------- l'envoi

async function allerAuResultat() {
  const memoire = lire();
  // Seules les relances des réponses qui les ouvrent encore partent.
  const relances = relancesAEnvoyer(etat.reponses, etat.relances, contenu);

  // Le hash du lien personnel n'est jamais envoyé : seules les réponses partent.
  await envoyerReponse({
    version: 'v1',
    role: etat.role,
    profil: memoire.profil || {},
    reponses: etat.reponses,
    relances,
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

  texte($('[data-titre]'), contenu.questions.titre);
  texte($('[data-intro]'), contenu.questions.intro);

  const formulaire = $('[data-formulaire]');
  const voir = $('[data-voir]');
  texte(voir, contenu.questions.bouton);

  vider(formulaire);
  construire(formulaire);
  retablir(formulaire);
  majProgression();
  typographierPage(document.querySelector('main'));

  formulaire.addEventListener('submit', async (e) => {
    e.preventDefault();
    const reste = NB_AFFIRMATIONS - repondues();
    if (reste > 0) {
      messageErreur($('#message'), reste === 1
        ? 'Il reste une affirmation sans réponse.'
        : `Il en reste ${reste} sans réponse.`);
      montrerLesManques();
      return;
    }
    voir.disabled = true;
    await allerAuResultat();
  });
}

demarrer();
