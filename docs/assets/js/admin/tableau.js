/**
 * Le tableau de bord : assemblage des sections et recalcul à chaque filtre.
 *
 * L'ordre des sections suit le cahier des charges, section 8.
 */

import { chargerContenu } from '../contenu.js';
import { modeDemo, ID_CLIENT_GOOGLE } from '../config.js';
import { $, el, vider, typographierPage } from '../parcours/commun.js';
import { filtrer, filtresVides } from './agregats.js';
import { installerFiltres } from './filtres.js';
import {
  jetonGarde, garderJeton, oublierJeton, emailDuJeton,
  chargerDonnees, chargerContacts, lienExport,
} from './auth.js';

import { section, nombre } from './vues/briques.js';
import { afficherIndicateurs } from './vues/indicateurs.js';
import { afficherEssentiel } from './vues/essentiel.js';
import { afficherFondations } from './vues/fondations.js';
import { afficherRepondants } from './vues/repondants.js';
import { afficherEntonnoir } from './vues/entonnoir.js';
import { afficherContacts } from './vues/contacts.js';
import { afficherDimensions, titreDimensions } from './vues/dimensions.js';
import { afficherCartes } from './vues/cartes.js';
import { afficherAffirmations, bascule } from './vues/affirmations.js';
import { afficherComparaison, titreComparaison } from './vues/comparaison.js';
import { afficherResultats, titreResultats } from './vues/resultats.js';

const etat = {
  contenu: null,
  donnees: null,
  contacts: [],
  filtres: filtresVides(),
  roleAffirmations: 'membre',
  sections: {},
};

// ------------------------------------------------------------------ montage

/** Construit la charpente des sections, une fois pour toutes. */
function monterSections(hote) {
  const s = {};

  s.essentiel = section(
    'Ce que disent les réponses',
    'Une lecture qui se met à jour avec les filtres. Elle décrit des perceptions, pas des causes.',
    { classe: 'section-admin--avant', surTitre: "L'essentiel" }
  );

  s.fondations = section(
    'Les 4 conditions des Fondations',
    'Part des réponses « En bonne partie » ou « Pleinement » sur les affirmations qui correspondent à chaque condition.'
  );

  s.repondants = section('Qui a répondu', '');

  s.entonnoir = section(
    "Du premier clic à l'état des lieux",
    "Où les personnes s'arrêtent dans le parcours. Les événements de visite ne "
      + 'portent aucun profil : seule la période s’applique ici, pas les autres filtres.'
  );

  const boutonExport = el('a', {
    classe: 'bouton-secondaire',
    texte: 'Exporter les contacts (CSV)',
    attrs: { href: '#', download: '' },
  });
  s.contacts = section('Demandes de l’étude complète', '', { action: boutonExport });
  s.contacts.bouton = boutonExport;

  s.dimensions = section('Les dimensions en couleurs', 'Part des répondants dans chaque couleur, par dimension.');

  s.cartes = section(
    'Les cartes d’ensemble reçues',
    'Part des répondants selon la carte qui ouvre leur état des lieux.'
  );

  const basculeRole = bascule(etat.roleAffirmations, (role) => {
    etat.roleAffirmations = role;
    afficherAffirmations(s.affirmations.corps, filtrees(), etat.contenu, role);
    typographierPage(s.affirmations.corps);
  });
  s.affirmations = section(
    'Toutes les réponses, affirmation par affirmation',
    'Pour chaque affirmation, la part des répondants qui le vivent déjà, le détail '
      + 'des 4 réponses, et ce que souhaitent le plus ceux qui répondent Pas encore ou Un peu.',
    { action: basculeRole }
  );

  s.comparaison = section(
    'Managers et membres',
    'Part des réponses « En bonne partie » ou « Pleinement », de 0 à 100 %. À droite, l’écart en points.'
  );

  s.resultats = section(
    'Le lien avec les résultats',
    "Part des répondants qui disent que leur équipe obtient les résultats qu'elle vise "
      + '(affirmation 16), selon que la dimension est installée (Bien enraciné ou En croissance) '
      + 'ou à construire (En germe ou À semer). Un lien observé entre des perceptions, pas une cause.'
  );

  [
    s.essentiel, s.fondations, s.repondants, s.entonnoir, s.contacts,
    s.dimensions, s.cartes, s.affirmations, s.comparaison, s.resultats,
  ].forEach((x) => hote.appendChild(x.noeud));

  // L'essentiel porte un sur-titre, comme dans la maquette.
  const surTitre = el('span', { classe: 'section-admin__surtitre', texte: "L'essentiel" });
  s.essentiel.noeud.querySelector('.section-admin__entete').prepend(surTitre);

  etat.sections = s;
}

/** Remplace le titre d'une section, quand il dit le constat. */
function retitrer(bloc, titre) {
  const h = bloc.noeud.querySelector('.section-admin__titre');
  if (h) h.textContent = titre;
}

// ------------------------------------------------------------------- rendu

function filtrees() {
  return filtrer(etat.donnees.reponses, etat.filtres);
}

function rendre() {
  const reponses = filtrees();
  const contenu = etat.contenu;
  const s = etat.sections;

  // Une réponse papier n'a ni parcours en ligne ni lien personnel : quand on ne
  // regarde que le papier, l'entonnoir et les demandes d'étude n'ont plus d'objet.
  const papierSeul = etat.filtres.source === 'papier';
  const enLigne = reponses.filter((r) => r.source === 'en_ligne').length;

  afficherIndicateurs($('[data-indicateurs]'), reponses, etat.donnees.entonnoir, contenu, etat.filtres);
  afficherEssentiel(s.essentiel.corps, reponses, contenu);
  afficherFondations(s.fondations.corps, reponses, contenu);
  afficherRepondants(s.repondants.corps, reponses, contenu);

  s.entonnoir.noeud.hidden = papierSeul;
  if (!papierSeul) {
    afficherEntonnoir(
      s.entonnoir.corps,
      etat.donnees.entonnoir,
      etat.contacts.length || etat.donnees.nombre_contacts
    );
  }

  s.contacts.noeud.hidden = papierSeul;
  if (!papierSeul) {
    afficherContacts(
      s.contacts.corps,
      etat.contacts,
      enLigne,
      s.contacts.noeud.querySelector('.section-admin__soustitre')
    );
  }

  retitrer(s.dimensions, titreDimensions(reponses, contenu));
  afficherDimensions(s.dimensions.corps, reponses, contenu);

  afficherCartes(s.cartes.corps, reponses, contenu);
  afficherAffirmations(s.affirmations.corps, reponses, contenu, etat.roleAffirmations);

  retitrer(s.comparaison, titreComparaison(reponses, contenu));
  afficherComparaison(s.comparaison.corps, reponses, contenu);

  retitrer(s.resultats, titreResultats(reponses, contenu));
  afficherResultats(s.resultats.corps, reponses, contenu);

  typographierPage(document.querySelector('main'));
}

// ------------------------------------------------------------------ l'accès

/** Messages affichés sous le bouton Google, selon la raison du refus. */
const MESSAGES_ACCES = {
  connexion: 'La connexion a expiré. Reconnectez-vous.',
  refuse: (email) => `Le compte ${email || 'choisi'} n’a pas accès au tableau de bord. Connectez-vous avec un compte autorisé.`,
  reseau: 'Le tableau de bord ne répond pas. Réessayez dans un instant.',
  google: 'La connexion Google n’a pas pu se charger. Vérifiez qu’aucun bloqueur ne l’empêche, puis rechargez.',
  config: 'La connexion Google n’est pas encore configurée.',
};

function direAcces(code, email) {
  const message = $('[data-message-acces]');
  const texte = MESSAGES_ACCES[code];
  message.textContent = typeof texte === 'function' ? texte(email) : texte || '';
  message.hidden = !texte;
}

/** Attend la bibliothèque Google, chargée en async. null si elle ne vient pas. */
function attendreGoogle(delai = 8000) {
  return new Promise((resoudre) => {
    const debut = Date.now();
    (function verifier() {
      if (window.google?.accounts?.id) return resoudre(window.google.accounts.id);
      if (Date.now() - debut > delai) return resoudre(null);
      setTimeout(verifier, 100);
    })();
  });
}

/** Affiche le bouton « Se connecter avec Google », et essaie chaque jeton reçu. */
/** L'accueil prend toute la page ; l'en-tête du tableau revient avec lui. */
function montrerAccueil(visible) {
  $('[data-acces]').hidden = !visible;
  $('[data-entete]').hidden = visible;
}

async function demanderConnexion(code, email) {
  montrerAccueil(true);
  if (code) direAcces(code, email);

  if (!ID_CLIENT_GOOGLE) return direAcces('config');
  const gis = await attendreGoogle();
  if (!gis) return direAcces('google');

  gis.initialize({
    client_id: ID_CLIENT_GOOGLE,
    auto_select: true,
    cancel_on_tap_outside: false,
    callback: async ({ credential }) => {
      direAcces(null);
      const resultat = await ouvrir(credential);
      if (resultat.ok) return;
      montrerAccueil(true);
      direAcces(resultat.code, resultat.email);
    },
  });
  gis.renderButton($('[data-bouton-google]'), {
    theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', locale: 'fr',
  });
  // Après un refus de compte, on ne repropose pas d'office le même.
  if (code !== 'refuse') gis.prompt();
}

// ---------------------------------------------------------------- démarrage

async function ouvrir(jeton) {
  attente(true);
  // Les deux requêtes partent ensemble : chacune coûte une à deux secondes
  // côté Apps Script, les enchaîner doublait l'attente.
  const contacts = chargerContacts(jeton);
  const resultat = await chargerDonnees(etat.contenu, jeton);
  attente(false);
  if (!resultat.ok) {
    oublierJeton();
    return resultat;
  }

  if (!modeDemo()) {
    garderJeton(jeton);
    const sortir = $('[data-deconnexion]');
    sortir.hidden = false;
    sortir.title = emailDuJeton(jeton);
  }
  etat.donnees = resultat.donnees;
  montrerAccueil(false);
  $('[data-tableau]').hidden = false;
  rendre();

  // Les contacts complètent le tableau quand ils arrivent, sans le retenir.
  etat.contacts = await contacts;
  const bouton = etat.sections.contacts.bouton;
  bouton.href = lienExport(etat.contacts);
  bouton.setAttribute('download', 'contacts-etat-des-lieux.csv');
  bouton.removeAttribute('aria-disabled');
  if (etat.contacts.length) rendre();
  return { ok: true };
}

/** Ce que dit l'écran d'attente, à mesure qu'elle se prolonge. */
const MESSAGES_ATTENTE = [
  'Nous chargeons les derniers résultats…',
  'Nous rassemblons les réponses de chaque équipe…',
  'Nous calculons les moyennes et les écarts…',
  'Encore un instant…',
];

let minuterieAttente = null;

/** L'écran d'attente, qui remplace la carte d'accès pendant que l'API répond. */
function attente(active) {
  const ecran = $('[data-chargement]');
  const message = $('[data-chargement-message]');
  clearInterval(minuterieAttente);
  ecran.hidden = !active;
  if (!active) return;

  montrerAccueil(false);
  let i = 0;
  message.textContent = MESSAGES_ATTENTE[0];
  minuterieAttente = setInterval(() => {
    if (i >= MESSAGES_ATTENTE.length - 1) return clearInterval(minuterieAttente);
    i += 1;
    message.style.opacity = '0';
    setTimeout(() => {
      message.textContent = MESSAGES_ATTENTE[i];
      message.style.opacity = '';
    }, 300);
  }, 2200);
}

async function demarrer() {
  etat.contenu = await chargerContenu();

  if (modeDemo()) {
    const badge = $('[data-badge]');
    badge.textContent = 'Mode démo, données fictives';
    badge.hidden = false;
  }

  monterSections($('[data-sections]'));

  installerFiltres($('[data-filtres]'), etat.contenu, (filtres) => {
    etat.filtres = filtres;
    rendre();
  });

  $('[data-deconnexion]').addEventListener('click', () => {
    oublierJeton();
    // Sans quoi Google reconnecterait aussitôt le même compte.
    window.google?.accounts?.id?.disableAutoSelect();
    location.reload();
  });

  if (modeDemo()) {
    await ouvrir('');
    return;
  }

  const garde = jetonGarde();
  if (garde) {
    const resultat = await ouvrir(garde);
    if (resultat.ok) return;
    return demanderConnexion(resultat.code === 'connexion' ? null : resultat.code, resultat.email);
  }

  oublierJeton();
  demanderConnexion();
}

demarrer();
