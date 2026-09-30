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
 * Les bandes de couleur, empilés sur toute la largeur.
 *
 * En 4 colonnes côte à côte, le texte était serré et les hauteurs très
 * inégales. Une bande par niveau présent : les niveaux vides n'apparaissent
 * pas. Chaque bande porte son nom, ce qui rend la légende inutile.
 */
function afficherBandeaux(resultat) {
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
  afficherBandeaux(resultat);
  brancherRaccourciLien();
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
