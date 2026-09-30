/**
 * Le tableau de bord : assemblage des sections et recalcul à chaque filtre.
 *
 * L'ordre des sections suit le cahier des charges, section 8.
 */

import { chargerContenu } from '../contenu.js';
import { modeDemo } from '../config.js';
import { $, el, vider, typographierPage } from '../parcours/commun.js';
import { filtrer, filtresVides } from './agregats.js';
import { installerFiltres } from './filtres.js';
import { cleGardee, garderCle, oublierCle, chargerDonnees, chargerContacts, lienExport } from './auth.js';

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
    'Part des réponses « Plutôt » ou « Tout à fait » sur les affirmations qui correspondent à chaque condition.'
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
    "Pour chaque affirmation, la part des répondants d'accord, le détail des 4 réponses, "
      + "et ce que souhaitent le plus ceux qui ne sont pas d'accord.",
    { action: basculeRole }
  );

  s.comparaison = section(
    'Managers et membres',
    'Part des réponses « Plutôt » ou « Tout à fait », de 0 à 100 %. À droite, l’écart en points.'
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

/** Demande la clé, tant qu'elle n'est pas acceptée. */
function demanderCle(surCle) {
  const ecran = $('[data-acces]');
  const formulaire = $('[data-formulaire-cle]');
  const champ = $('#cle');
  const message = $('[data-message-cle]');

  ecran.hidden = false;
  champ.focus();

  formulaire.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cle = champ.value.trim();
    if (!cle) return;

    message.hidden = true;
    const bouton = formulaire.querySelector('button');
    bouton.disabled = true;

    const ok = await surCle(cle);
    bouton.disabled = false;
    if (ok) {
      ecran.hidden = true;
      return;
    }
    message.textContent = 'Clé refusée, ou API injoignable.';
    message.hidden = false;
    champ.select();
  });
}

// ---------------------------------------------------------------- démarrage

async function ouvrir(cle) {
  const resultat = await chargerDonnees(etat.contenu, cle);
  if (!resultat.ok) return false;

  garderCle(cle);
  etat.donnees = resultat.donnees;
  etat.contacts = await chargerContacts(cle);

  const lien = lienExport(cle, etat.contacts);
  const bouton = etat.sections.contacts.bouton;
  if (lien) {
    bouton.href = lien;
    bouton.setAttribute('download', 'contacts-etat-des-lieux.csv');
    bouton.removeAttribute('aria-disabled');
  } else {
    bouton.removeAttribute('href');
    bouton.setAttribute('aria-disabled', 'true');
    bouton.title = 'L’export sera disponible une fois l’API branchée.';
  }

  $('[data-tableau]').hidden = false;
  rendre();
  return true;
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
    oublierCle();
    location.reload();
  });

  if (modeDemo()) {
    await ouvrir('');
    return;
  }

  const gardee = cleGardee();
  if (gardee && (await ouvrir(gardee))) return;

  oublierCle();
  demanderCle(ouvrir);
}

demarrer();
