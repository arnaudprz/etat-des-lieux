/**
 * Résultat.
 *
 * Tout est calculé dans le navigateur à partir du lien personnel : le serveur
 * n'est jamais interrogé pour relire un résultat, et le hash ne lui est jamais
 * envoyé. Aucun chiffre n'apparaît : ni note, ni pourcentage, ni moyenne.
 */

import { chargerContenu } from '../contenu.js';
import { calculer } from '../calcul.js';
import { decoder } from '../lien.js';
import { medaillon, icone, chemin } from '../illustration-niveau.js';
import { parDimension, pourLesResultats, auMoinsUneIdee } from '../envies.js';
import { envoyerContact } from '../api.js';
import {
  $, el, texte, vider, signalerModeDemo, typographierPage,
  messageErreur, annoncer, evenement,
} from './commun.js';

function afficherEnsemble(resultat) {
  // Le médaillon suit le niveau de la carte calculée par calcul.js.
  const image = $('[data-medaillon]');
  if (image) image.src = chemin(medaillon(resultat.carte.niveau));

  const etiquette = $('[data-etiquette]');
  etiquette.style.background = resultat.carte.niveauHex;
  etiquette.style.color = resultat.carte.niveauTexte;
  texte(etiquette, resultat.carte.etiquette);

  texte($('[data-carte-titre]'), resultat.carte.titre);

  // La carte se lit d'une traite : le texte, puis la phrase d'appui, puis la
  // phrase de forme, dans le même paragraphe. L'ordre suit le simulateur.
  const phrases = [resultat.carte.texte, resultat.appui, resultat.forme].filter(Boolean);
  texte($('[data-carte-texte]'), phrases.join(' '));
}

/**
 * L'encadré des idées de la personne.
 *
 * Rien d'autre que le surtitre et la phrase : ce sont des idées, pas des
 * problèmes. On ne console pas, on ne conseille pas, on ne suppose rien.
 */
function encadreIdees(phrase, titre) {
  return el('div', { classe: 'idees' }, [
    el('span', { classe: 'idees__titre', texte: titre }),
    el('p', { classe: 'idees__phrase serif', texte: phrase }),
  ]);
}

/**
 * Les bandes de couleur, empilées sur toute la largeur.
 *
 * En 4 colonnes côte à côte, le texte était serré et les hauteurs très
 * inégales. Une bande par niveau présent : les niveaux vides n'apparaissent
 * pas. Chaque bande porte son nom, ce qui rend la légende inutile.
 *
 * Les idées de la personne apparaissent là où elles se rapportent : sous la
 * phrase de la dimension concernée, dans sa bande.
 */
function afficherBandes(resultat, contenu, idees) {
  const hote = $('[data-bandes]');
  vider(hote);

  resultat.colonnes.forEach((c) => {
    const corps = el('div', { classe: 'bande__corps' });

    c.dimensions.forEach((d) => {
      corps.appendChild(
        el('div', { classe: 'bande__ligne', attrs: { 'data-dimension': d.cle } }, [
          el('span', { classe: 'bande__nom', texte: d.nom }),
          el('div', { classe: 'bande__droite' }, [
            el('span', { classe: 'bande__phrase', texte: d.phrase }),
            idees[d.cle] ? encadreIdees(idees[d.cle], contenu.envies.titre) : null,
          ]),
        ])
      );
    });

    const entete = el('div', {
      classe: 'bande__entete',
      style: { background: c.niveau.hex, color: c.niveau.texte },
    }, [
      // Décorative : le nom du niveau est juste à côté.
      el('img', {
        classe: 'bande__pousse',
        attrs: { src: chemin(icone(c.niveau.cle)), alt: '', 'aria-hidden': 'true' },
      }),
      el('span', { classe: 'bande__niveau', texte: c.niveau.nom }),
    ]);

    hote.appendChild(el('div', { classe: 'bande' }, [entete, corps]));
  });
}

/**
 * « Garder mon résultat » : sur mobile, le lien personnel arrive très bas,
 * après les colonnes de couleur et le bloc Greatly. Ce raccourci l'amène
 * directement à l'écran.
 */
function brancherRaccourciLien() {
  const bouton = $('[data-garder]');
  const cible = $('#lien-personnel');
  if (!bouton || !cible) return;

  bouton.addEventListener('click', () => {
    const douceur = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto' : 'smooth';
    cible.scrollIntoView({ behavior: douceur, block: 'start' });
    const champ = $('[data-lien]');
    if (champ) champ.focus({ preventScroll: true });
  });
}

function brancherCopie() {
  const champ = $('[data-lien]');
  const bouton = $('[data-copier]');
  champ.value = location.href;

  // Le partage du téléphone, pour se l'envoyer par message. Absent sur
  // ordinateur, où l'astuce des favoris le remplace.
  const partager = $('[data-partager]');
  if (partager && typeof navigator.share === 'function') {
    partager.hidden = false;
    partager.addEventListener('click', async () => {
      try {
        await navigator.share({
          title: 'Mon état des lieux',
          text: 'Mon état des lieux d’équipe',
          url: location.href,
        });
      } catch (e) { /* partage refusé ou annulé : rien à faire */ }
    });
  } else {
    const astuce = $('[data-astuce]');
    if (astuce) astuce.hidden = false;
  }

  bouton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(champ.value);
    } catch (e) {
      // Repli quand l'API Clipboard est refusée : on sélectionne pour un copier manuel.
      champ.focus();
      champ.select();
    }
    texte(bouton, 'Lien copié');
    annoncer('Lien copié');
    evenement('lien_copie');
    window.setTimeout(() => texte(bouton, 'Copier le lien'), 2500);
  });
}

/** « a, b et c » : une énumération qui se lit à voix haute. */
function enumerer(elements) {
  if (elements.length <= 1) return elements.join('');
  return `${elements.slice(0, -1).join(', ')} et ${elements[elements.length - 1]}`;
}

/**
 * Faire connaître l'état des lieux.
 *
 * Seule la page d'accueil est partagée : jamais l'URL du résultat, jamais le
 * hash, qui porte les réponses de la personne. Pas d'invitation d'équipe, pas
 * de formulaire : un simple partage.
 */
function brancherPartage(contenu) {
  const bouton = $('[data-partager-accueil]');
  const texteBloc = $('[data-partage-texte]');
  if (!bouton) return;

  const p = contenu.engagement.partage;
  texte(texteBloc, p.texte);
  texte(bouton, p.bouton);

  // L'accueil, sans requête ni hash : on repart de l'adresse de cette page.
  const accueil = new URL('index.html', location.href);
  accueil.hash = '';
  accueil.search = '';
  const adresse = accueil.href;

  bouton.addEventListener('click', async () => {
    evenement('partage_accueil');

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: p.titre_partage, text: p.phrase_partage, url: adresse });
        return;
      } catch (e) { /* partage refusé ou annulé : on retombe sur la copie */ }
    }

    try {
      await navigator.clipboard.writeText(adresse);
    } catch (e) { /* presse-papiers refusé : le message reste juste, l'adresse est visible */ }
    texte(bouton, p.copie);
    annoncer(p.copie);
    window.setTimeout(() => texte(bouton, p.bouton), 2500);
  });
}

/** Le raccourci de mise en favoris, selon la plateforme quand on la reconnaît. */
function raccourciFavoris(contenu) {
  const r = contenu.engagement.retour;
  let plateforme = '';
  try {
    plateforme = (navigator.userAgentData && navigator.userAgentData.platform)
      || navigator.platform || '';
  } catch (e) { /* plateforme inconnue */ }

  if (/mac/i.test(plateforme)) return r.raccourci_mac;
  if (/win|linux|cros/i.test(plateforme)) return r.raccourci_pc;
  return r.raccourci_inconnu;
}

/**
 * Le bandeau « Revenez bientôt sur votre lien ».
 *
 * Le bouton garde la page : partage du téléphone là où il existe, copie du lien
 * ailleurs. Ici c'est bien l'adresse du résultat qu'on garde, contrairement au
 * partage de l'accueil juste au-dessus.
 */
function brancherRetour(contenu) {
  const bouton = $('[data-garder-page]');
  if (!bouton) return;

  const r = contenu.engagement.retour;
  const pousse = $('[data-retour-pousse]');
  if (pousse) pousse.src = chemin(icone('germe'));
  texte($('[data-retour-titre]'), r.titre);
  texte($('[data-retour-texte]'), r.texte);
  texte(bouton, r.bouton);

  const partageDispo = typeof navigator.share === 'function';
  const raccourci = $('[data-retour-raccourci]');

  // Le raccourci clavier n'a de sens que là où il y a un clavier.
  if (raccourci && !partageDispo) {
    texte(raccourci, raccourciFavoris(contenu));
    raccourci.hidden = false;
  }

  bouton.addEventListener('click', async () => {
    evenement('garder_page');

    if (partageDispo) {
      try {
        await navigator.share({
          title: r.titre_partage,
          text: r.phrase_partage,
          url: location.href,
        });
        return;
      } catch (e) { /* partage refusé ou annulé : on retombe sur la copie */ }
    }

    try {
      await navigator.clipboard.writeText(location.href);
    } catch (e) { /* presse-papiers refusé : le lien reste visible plus haut */ }
    texte(bouton, r.copie);
    annoncer(r.copie);
    window.setTimeout(() => texte(bouton, r.bouton), 3500);
  });
}

function brancherEtude() {
  const formulaire = $('[data-etude]');
  const message = $('[data-message-etude]');

  formulaire.addEventListener('submit', async (e) => {
    e.preventDefault();
    const donnees = new FormData(formulaire);

    // Champ piège rempli : on fait comme si, sans rien enregistrer.
    if (String(donnees.get('site') || '').trim() !== '') {
      remercier(formulaire);
      return;
    }

    const contact = {
      prenom: String(donnees.get('prenom') || '').trim(),
      nom: String(donnees.get('nom') || '').trim(),
      entreprise: String(donnees.get('entreprise') || '').trim(),
      email: String(donnees.get('email') || '').trim(),
      consentement: donnees.get('consentement') === 'on',
    };

    const manque = [];
    if (!contact.prenom) manque.push('votre prénom');
    if (!contact.nom) manque.push('votre nom');
    if (!contact.entreprise) manque.push('votre entreprise');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) manque.push('votre e-mail professionnel');
    if (!contact.consentement) manque.push('votre accord');

    if (manque.length > 0) {
      // Le message visible porte role="alert" : il est déjà annoncé aux lecteurs
      // d'écran. Une seconde zone aria-live le ferait lire deux fois.
      messageErreur(message, `Il nous manque encore : ${enumerer(manque)}.`);
      return;
    }

    messageErreur(message, '');
    const bouton = formulaire.querySelector('button[type="submit"]');
    bouton.disabled = true;

    // Les coordonnées partent seules, sans aucun identifiant de réponse ni de
    // session : elles ne peuvent pas être reliées au questionnaire.
    await envoyerContact(contact);
    remercier(formulaire);
  });
}

/** Message de confirmation chaleureux. Aucun e-mail n'est envoyé. */
function remercier(formulaire) {
  const merci = el('div', { classe: 'carte bloc' }, [
    el('h2', { classe: 'bloc__titre', texte: 'Merci, c’est noté' }),
    el('p', {
      texte: "Nous vous enverrons l'étude complète dès qu'elle paraîtra. "
        + 'Vos coordonnées restent séparées de vos réponses, qui demeurent anonymes.',
    }),
  ]);
  formulaire.replaceWith(merci);
  annoncer("Merci, votre demande d'étude complète est enregistrée.");
}

async function demarrer() {
  signalerModeDemo();
  const contenu = await chargerContenu();

  // contenu permet de vérifier que les indices de choix existent vraiment.
  const lu = decoder(location.hash, contenu);
  if (!lu) {
    $('[data-sans-resultat]').hidden = false;
    typographierPage();
    return;
  }

  const brut = calculer(lu.reponses, contenu);
  const niveauCarte = contenu.niveaux.find((n) => n.cle === brut.carte.niveau);
  const resultat = {
    ...brut,
    carte: {
      ...brut.carte,
      niveauHex: niveauCarte ? niveauCarte.hex : 'var(--voile)',
      niveauTexte: niveauCarte ? niveauCarte.texte : 'var(--encre)',
    },
  };

  // Les idées viennent du lien : elles suivent la personne à chaque visite.
  const idees = parDimension(contenu, lu.relances, lu.role);
  const ideesResultats = pourLesResultats(contenu, lu.relances, lu.role);

  $('[data-resultat]').hidden = false;
  afficherEnsemble(resultat);
  afficherBandes(resultat, contenu, idees);

  // L'affirmation 16 n'a pas de dimension : ses idées vont sous la dernière bande.
  const hoteResultats = $('[data-idees-resultats]');
  vider(hoteResultats);
  if (ideesResultats) {
    hoteResultats.appendChild(encadreIdees(ideesResultats, contenu.envies.resultats_titre));
  }

  // Une seule ligne sobre, et seulement s'il y a des idées à montrer.
  const ligne = $('[data-ligne-idees]');
  if (auMoinsUneIdee(lu.relances) && (Object.keys(idees).length > 0 || ideesResultats)) {
    texte(ligne, contenu.envies.phrase_finale);
    ligne.hidden = false;
  }
  brancherRaccourciLien();
  brancherCopie();
  brancherPartage(contenu);
  brancherRetour(contenu);
  brancherEtude();
  typographierPage();
}

/**
 * Toute la page découle du hash. S'il change (lien collé, favori rouvert, retour
 * arrière du navigateur), on recharge : plus sûr que de reconstruire à la main.
 */
window.addEventListener('hashchange', () => location.reload());

demarrer();
