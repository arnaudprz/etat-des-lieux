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
import { icone, chemin } from '../illustration-niveau.js';
import { lire, ecrire, dejaEnvoye, retenirEnvoi } from '../session.js';
import { envoyerReponse } from '../api.js';
import {
  $, $$, el, texte, vider, signalerModeDemo, typographierPage,
  messageErreur, installerEtapes, annoncer, evenement,
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

/** Durée du rappel « Deux réponses au plus », quand on touche une 3e case. */
const RAPPEL_MAXIMUM_MS = 1500;

/** Rappelle la limite : le sous-titre ressort un instant, et il est annoncé. */
function signalerMaximum(sousTitre) {
  sousTitre.classList.add('relance__sous-titre--rappel');
  annoncer(contenu.relance.sous_titre);
  window.clearTimeout(sousTitre.rappel);
  sousTitre.rappel = window.setTimeout(
    () => sousTitre.classList.remove('relance__sous-titre--rappel'),
    RAPPEL_MAXIMUM_MS
  );
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
  const sousTitre = el('span', { classe: 'relance__sous-titre', texte: contenu.relance.sous_titre });

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
    const ligne = el('label', { classe: 'choix choix--ligne' }, [
      entree,
      el('span', { classe: 'choix__texte', texte: libelle }),
    ]);
    // Une case grisée ne réagit pas : sans ce signal, la 3e case était
    // refusée en silence.
    ligne.addEventListener('click', () => {
      if (entree.disabled) signalerMaximum(sousTitre);
    });
    choix.appendChild(ligne);
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
      sousTitre,
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

/** Le stade atteint, selon le nombre de réponses données. */
function palier(n) {
  const paliers = contenu.engagement.progression.paliers;
  return paliers.find((p) => n <= p.jusqua) || paliers[paliers.length - 1];
}

/**
 * La progression, et le récapitulatif du bas. Aucun chiffre de réponse.
 *
 * La pousse de gauche grandit avec l'avancée, l'arbre de droite est le but.
 * Ce n'est pas un score : la jauge garde sa couleur sauge et ne reprend jamais
 * les couleurs du résultat. Les lecteurs d'écran reçoivent l'avancée en toutes
 * lettres.
 */
function majProgression() {
  const n = repondues();
  const jauge = $('[data-jauge]');
  if (jauge) jauge.style.width = `${(n / NB_AFFIRMATIONS) * 100}%`;

  const stade = palier(n);
  const pousse = $('[data-pousse]');
  if (pousse) {
    const source = chemin(icone(stade.niveau));
    const premierAffichage = !pousse.getAttribute('src');
    if (pousse.getAttribute('src') !== source) {
      // Au premier affichage il n'y a rien à fondre : on pose l'image.
      if (premierAffichage || animationsReduites()) {
        pousse.src = source;
      } else {
        // Fondu court au changement de stade.
        pousse.classList.add('progression__pousse--change');
        window.setTimeout(() => {
          pousse.src = source;
          pousse.classList.remove('progression__pousse--change');
        }, 200);
      }
    }
  }

  const barre = $('[data-barre]');
  if (barre) {
    barre.setAttribute('aria-valuenow', String(n));
    barre.setAttribute('aria-label', contenu.engagement.progression.etiquette);
    barre.setAttribute('aria-valuetext', `Avancée : ${stade.avancee}`);
  }

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

/** L'encadré « Ce qu'on cherche à comprendre », avant la première affirmation. */
function afficherCadre() {
  const hote = $('[data-cadre]');
  const cadre = contenu.engagement.cadre;
  vider(hote);
  hote.appendChild(el('span', { classe: 'surtitre', texte: cadre.surtitre }));
  hote.appendChild(
    el('ul', { classe: 'cadre-etude__lignes' }, cadre.lignes.map((l) =>
      el('li', {}, [el('strong', { texte: l.debut }), l.suite])))
  );
}

/** Ce qui attend la personne, juste avant le bouton final. */
function afficherAnnonce() {
  const hote = $('[data-avant-resultat]');
  const a = contenu.engagement.avant_resultat;
  vider(hote);
  hote.appendChild(el('p', { classe: 'avant-resultat__promesse serif', texte: a.promesse }));
  hote.appendChild(el('p', { classe: 'avant-resultat__mention', texte: a.mention }));
}

/** La ligne « Pourquoi on s'y intéresse » d'un groupe. */
function pourquoi(groupe) {
  const texteGroupe = contenu.engagement.pourquoi[groupe];
  if (!texteGroupe) return null;
  return el('p', { classe: 'contexte-groupe' }, [
    el('span', {
      classe: 'contexte-groupe__prefixe',
      texte: `${contenu.engagement.pourquoi_prefixe} · `,
    }),
    texteGroupe,
  ]);
}

/** Le bandeau de mi-parcours, après le groupe qui le précède. */
function miParcours() {
  const mi = contenu.engagement.mi_parcours;
  return el('div', { classe: 'mi-parcours' }, [
    el('img', {
      classe: 'mi-parcours__pousse',
      attrs: { src: chemin(icone('croissance')), alt: '', 'aria-hidden': 'true' },
    }),
    el('p', { texte: mi.texte }),
  ]);
}

function construire(formulaire) {
  let groupeCourant = null;

  contenu.affirmations.forEach((a) => {
    if (a.groupe !== groupeCourant) {
      // Le bandeau de mi-parcours se glisse avant le groupe qui suit celui
      // désigné par contenu.json.
      if (groupeCourant === contenu.engagement.mi_parcours.apres_groupe) {
        formulaire.appendChild(miParcours());
      }
      groupeCourant = a.groupe;
      formulaire.appendChild(el('h2', { classe: 'groupe', texte: a.groupe }));
      const ligne = pourquoi(a.groupe);
      if (ligne) formulaire.appendChild(ligne);
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
  const envoi = {
    version: 'v1',
    role: etat.role,
    profil: memoire.profil || {},
    reponses: etat.reponses,
    relances,
  };

  // Revenir sur ses réponses puis revalider sans rien changer créait une
  // seconde ligne identique en base, et faussait le compteur. On n'envoie donc
  // que ce qui diffère du dernier envoi.
  const empreinte = JSON.stringify(envoi);
  if (!dejaEnvoye(empreinte)) {
    // Pas de `await` : la requête part et se termine toute seule pendant que le
    // résultat s'affiche.
    envoyerReponse(envoi);
    retenirEnvoi(empreinte);
  }
  evenement('termine');
  // Le lien porte aussi les idées, pour que le résultat les montre à chaque visite.
  location.href = lienResultat(etat.role, etat.reponses, relances);
}

// ---------------------------------------------------------------- démarrage

async function demarrer() {
  signalerModeDemo();
  contenu = await chargerContenu();
  installerEtapes(contenu);

  const memoire = lire();
  if (!memoire.role) {
    // Sans profil, la version des affirmations est indéterminée.
    location.replace('profil.html');
    return;
  }
  etat.role = memoire.role;

  texte($('[data-titre]'), contenu.questions.titre);
  texte($('[data-intro]'), contenu.questions.intro);

  const but = $('[data-but]');
  if (but) but.src = chemin(icone(contenu.engagement.progression.but));

  afficherCadre();
  afficherAnnonce();

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
