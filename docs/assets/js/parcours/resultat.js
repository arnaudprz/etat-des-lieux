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
import { envoyerContact } from '../api.js';
import {
  $, el, texte, vider, signalerModeDemo, typographierPage,
  messageErreur, annoncer, evenement,
} from './commun.js';

function afficherEnsemble(resultat) {
  const etiquette = $('[data-etiquette]');
  etiquette.style.background = resultat.carte.niveauHex;
  etiquette.style.color = resultat.carte.niveauTexte;
  texte(etiquette, resultat.carte.etiquette);

  texte($('[data-carte-titre]'), resultat.carte.titre);
  texte($('[data-carte-texte]'), resultat.carte.texte);

  // L'ordre suit le simulateur : la phrase d'appui, puis la phrase de forme.
  const appui = $('[data-appui]');
  if (resultat.appui) { texte(appui, resultat.appui); appui.hidden = false; }

  const forme = $('[data-forme]');
  if (resultat.forme) { texte(forme, resultat.forme); forme.hidden = false; }
}

/** La légende des 4 couleurs : chaque couleur porte toujours son nom écrit. */
function afficherLegende(contenu) {
  const hote = $('[data-legende]');
  vider(hote);
  contenu.niveaux.forEach((n) => {
    hote.appendChild(
      el('span', {}, [
        el('span', { classe: 'temoin', style: { background: n.hex }, attrs: { 'aria-hidden': 'true' } }),
        n.nom,
      ])
    );
  });
}

/** Les colonnes de couleur. Les colonnes vides ne sont pas affichées. */
function afficherColonnes(resultat) {
  const hote = $('[data-colonnes]');
  vider(hote);
  resultat.colonnes.forEach((c) => {
    const corps = el('div', { classe: 'colonne__corps' });
    c.dimensions.forEach((d) => {
      corps.appendChild(
        el('div', { classe: 'colonne__item' }, [
          el('span', { classe: 'colonne__nom', texte: d.nom }),
          el('span', { classe: 'colonne__phrase', texte: d.phrase }),
        ])
      );
    });
    hote.appendChild(
      el('div', { classe: 'colonne' }, [
        el('div', {
          classe: 'colonne__entete',
          texte: c.niveau.nom,
          style: { background: c.niveau.hex, color: c.niveau.texte },
        }),
        corps,
      ])
    );
  });
}

function brancherCopie() {
  const champ = $('[data-lien]');
  const bouton = $('[data-copier]');
  champ.value = location.href;

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
    if (!contact.prenom) manque.push('le prénom');
    if (!contact.nom) manque.push('le nom');
    if (!contact.entreprise) manque.push("l'entreprise");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) manque.push("l'e-mail professionnel");
    if (!contact.consentement) manque.push('votre accord');

    if (manque.length > 0) {
      const m = `Il manque ${manque.join(', ')}.`;
      messageErreur(message, m);
      annoncer(m);
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

  const lu = decoder(location.hash);
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

  $('[data-resultat]').hidden = false;
  afficherEnsemble(resultat);
  afficherLegende(contenu);
  afficherColonnes(resultat);
  brancherCopie();
  brancherEtude();
  typographierPage();
}

/**
 * Toute la page découle du hash. S'il change (lien collé, favori rouvert, retour
 * arrière du navigateur), on recharge : plus sûr que de reconstruire à la main.
 */
window.addEventListener('hashchange', () => location.reload());

demarrer();
