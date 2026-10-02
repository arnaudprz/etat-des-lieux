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
import { envoyerContact, agregatsPublics } from '../api.js';
import { lire as lireSession, ecrire as ecrireSession, memoriserResultat, profilMemorise } from '../session.js';
import { phrases as phrasesComparaison, comparaisonActive } from '../comparaison.js';
import {
  $, el, texte, vider, signalerModeDemo, typographierPage,
  messageErreur, installerEtapes, annoncer, evenement,
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
/**
 * Les phrases de mise en perspective, ajoutées sous les phrases de dimension.
 *
 * Elles n'arrivent qu'au-delà des seuils, et jamais avec un chiffre. Si les
 * agrégats ne sont pas disponibles, il ne se passe simplement rien.
 */
function afficherComparaison(dimensions, agregats, profil, role, contenu) {
  const textes = phrasesComparaison(dimensions, agregats, profil, role, contenu);

  Object.entries(textes).forEach(([cle, texteDim]) => {
    const ligne = document.querySelector(`[data-dimension="${cle}"] .bande__droite`);
    if (!ligne) return;
    ligne.appendChild(el('p', { classe: 'bande__perspective', texte: texteDim }));
  });

  // Le bandeau ne promet plus : il constate.
  if (comparaisonActive(agregats, profil, role, contenu)) {
    texte($('[data-retour-texte]'), contenu.engagement.retour.texte_actif);
  }
}

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
  // Mise en page F : les niveaux installés ou en croissance forment « Vos
  // appuis », ceux qui existent par moments ou restent à semer « Vos envies ».
  // Une section sans niveau n'apparaît pas, et son lien de sommaire non plus.
  const parties = [
    { hote: $('[data-appuis-niveaux]'), section: $('[data-appuis]'), garde: (v) => v >= 2 },
    { hote: $('[data-envies-niveaux]'), section: $('[data-envies]'), garde: (v) => v <= 1 },
  ];
  parties.forEach(({ hote, section, garde }) => {
    vider(hote);
    const colonnes = resultat.colonnes.filter((c) => garde(c.niveau.valeur));
    section.hidden = colonnes.length === 0;
    colonnes.forEach((c) => hote.appendChild(bandeNiveau(c, contenu, idees)));
  });
}

/** Une bande de niveau : son nom, puis ses dimensions et leurs idées. */
function bandeNiveau(c, contenu, idees) {
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

  return el('div', { classe: 'bande', attrs: { 'data-niveau': c.niveau.cle } }, [entete, corps]);
}

/**
 * Le sommaire de la barre (900px et plus) : quatre liens vers les bandes, le
 * lien de la bande la plus visible marqué comme courant.
 *
 * Une bande absente (pas d'appuis, pas d'envies) n'a pas de lien. Le clic fait
 * défiler doucement (instantanément si les animations sont réduites) et donne
 * le focus au titre de la bande, pour qui navigue au clavier.
 */
function installerSommaire(contenu) {
  const nav = $('[data-sommaire]');
  const bouton = $('[data-sommaire-bouton]');
  const s = contenu.resultat && contenu.resultat.sommaire;
  if (!nav || !s) return;

  nav.setAttribute('aria-label', s.aria);
  texte(bouton, s.bouton);
  nav.hidden = false;
  bouton.hidden = false;

  const liens = Array.from(nav.querySelectorAll('[data-vers]'));
  const presents = liens.filter((a) => {
    const cible = document.getElementById(a.dataset.vers);
    texte(a, s[a.dataset.vers]);
    a.hidden = !cible || cible.hidden;
    return !a.hidden;
  });
  const bandes = presents.map((a) => document.getElementById(a.dataset.vers));

  const barre = $('header.entete');
  const mesurer = () => {
    document.documentElement.style.setProperty('--hauteur-sommaire', `${Math.round(barre.getBoundingClientRect().height)}px`);
  };
  mesurer();
  window.addEventListener('resize', mesurer);

  const marquer = (id) => presents.forEach((a) => {
    if (a.dataset.vers === id) a.setAttribute('aria-current', 'location');
    else a.removeAttribute('aria-current');
  });
  marquer('ensemble');

  // La bande la plus visible sous la barre devient la courante.
  const recalculer = () => {
    const haut = barre.getBoundingClientRect().bottom;
    let meilleure = null;
    let surface = 0;
    bandes.forEach((b) => {
      const r = b.getBoundingClientRect();
      const visible = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, haut);
      if (visible > surface) { surface = visible; meilleure = b; }
    });
    if (meilleure) marquer(meilleure.id);
  };
  if ('IntersectionObserver' in window) {
    const seuils = Array.from({ length: 21 }, (_, i) => i / 20);
    const observateur = new IntersectionObserver(recalculer, { threshold: seuils });
    bandes.forEach((b) => observateur.observe(b));
  }
  window.addEventListener('scroll', () => window.requestAnimationFrame(recalculer), { passive: true });

  const douceur = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
  presents.forEach((a) => a.addEventListener('click', (e) => {
    const cible = document.getElementById(a.dataset.vers);
    if (!cible) return;
    e.preventDefault();
    cible.scrollIntoView({ behavior: douceur(), block: 'start' });
    const titre = cible.querySelector('h2');
    if (titre) titre.focus({ preventScroll: true });
    marquer(cible.id);
  }));
  bouton.addEventListener('click', (e) => {
    const cible = $('#lien-personnel');
    if (!cible) return;
    e.preventDefault();
    cible.scrollIntoView({ behavior: douceur(), block: 'start' });
  });
}

/** Les textes fixes de la mise en page F, lus dans contenu.json > resultat. */
function remplirTextes(contenu) {
  const r = contenu.resultat;
  if (!r) return;
  texte($('[data-resultat-intro]'), r.intro);
  ['appuis', 'envies'].forEach((cle) => {
    texte($(`[data-${cle}-surtitre]`), r[cle].surtitre);
    texte($(`[data-${cle}-titre]`), r[cle].titre);
    texte($(`[data-${cle}-intro]`), r[cle].intro);
  });
  texte($('[data-revenir-surtitre]'), r.revenir.surtitre);
  texte($('[data-pied-rh]'), r.pied_rh);
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
/** « a, b et c » : une énumération qui se lit à voix haute. */
function enumerer(elements) {
  if (elements.length <= 1) return elements.join('');
  return `${elements.slice(0, -1).join(', ')} et ${elements[elements.length - 1]}`;
}

/** Le raccourci de mise en favoris, selon la plateforme quand on la reconnaît. */
function raccourciFavoris(contenu) {
  const r = contenu.engagement.retour;
  let plateforme = '';
  try {
    plateforme = (navigator.userAgentData && navigator.userAgentData.platform)
      || navigator.platform || '';
  } catch (e) { /* plateforme inconnue */ }

  if (/mac/i.test(plateforme)) return r.favoris_mac;
  if (/win|linux|cros/i.test(plateforme)) return r.favoris_pc;
  return r.favoris_inconnu;
}

/**
 * Garder son résultat.
 *
 * Un seul bloc, une seule action principale : copier son lien. Là où le
 * téléphone sait partager, un second bouton permet de se l'envoyer. L'URL
 * brute reste disponible, repliée, et le raccourci de favoris n'apparaît que
 * là où il y a un clavier.
 */
function brancherGarder(contenu) {
  const r = contenu.engagement.retour;

  const pousse = $('[data-retour-pousse]');
  if (pousse) pousse.src = chemin(icone('germe'));
  texte($('[data-retour-titre]'), r.titre);
  texte($('[data-retour-texte]'), r.texte);
  texte($('[data-voir-lien]'), r.voir);

  const champ = $('[data-lien]');
  if (champ) champ.value = location.href;

  const copier = $('[data-copier]');
  texte(copier, r.copier);
  copier.addEventListener('click', async () => {
    let reussi = true;
    try {
      await navigator.clipboard.writeText(location.href);
    } catch (e) {
      // Repli quand l'API Clipboard est refusée : on déplie le champ et on
      // sélectionne, pour un copier manuel.
      reussi = false;
      const details = $('.lien-perso__details');
      if (details) details.open = true;
      if (champ) { champ.focus(); champ.select(); }
    }

    // Ne jamais annoncer une copie qui n'a pas eu lieu : on croyait avoir son
    // lien, on collait le contenu précédent du presse-papiers, et on repartait
    // de zéro sans comprendre pourquoi.
    const dire = reussi ? r.copie : r.echec_copie;
    texte(copier, dire);
    annoncer(dire);
    if (reussi) evenement('lien_copie');
    window.setTimeout(() => texte(copier, r.copier), reussi ? 2500 : 5000);
  });

  const partageDispo = typeof navigator.share === 'function';
  const envoyer = $('[data-partager]');
  if (envoyer && partageDispo) {
    texte(envoyer, r.envoyer);
    envoyer.hidden = false;
    envoyer.addEventListener('click', async () => {
      evenement('garder_page');
      try {
        await navigator.share({ title: r.titre_partage, text: r.phrase_partage, url: location.href });
      } catch (e) { /* partage refusé ou annulé : rien à faire */ }
    });
  }

  // Le raccourci clavier n'a de sens que là où il y a un clavier : pas sur un
  // téléphone, même quand il ne sait pas partager.
  const favoris = $('[data-retour-raccourci]');
  const pointeurFin = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  if (favoris && !partageDispo && pointeurFin) {
    texte(favoris, raccourciFavoris(contenu));
    favoris.hidden = false;
  }
}

/**
 * Faire découvrir l'état des lieux.
 *
 * Seule la page d'accueil est partagée : jamais l'URL du résultat, jamais le
 * hash, qui porte les réponses de la personne. Pas d'invitation d'équipe, pas
 * de formulaire : un simple partage.
 */
function brancherPartage(contenu) {
  const bouton = $('[data-partager-accueil]');
  if (!bouton) return;

  const p = contenu.engagement.partage;
  texte($('[data-partage-question]'), p.question);
  texte($('[data-partage-texte]'), p.texte);
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
    } catch (e) { /* presse-papiers refusé : le message reste juste */ }
    texte(bouton, p.copie);
    annoncer(p.copie);
    window.setTimeout(() => texte(bouton, p.bouton), 2500);
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

/**
 * « Modifier mes réponses » : repart du questionnaire, déjà rempli.
 *
 * Les réponses viennent du lien, pas de la mémoire de l'onglet : le bouton
 * fonctionne donc aussi sur un lien reçu ou rouvert des jours plus tard.
 */
function brancherModifier(contenu, lu) {
  const bouton = $('[data-modifier]');
  if (!bouton) return;
  texte(bouton, contenu.engagement.retour.modifier);
  bouton.hidden = false;
  bouton.addEventListener('click', () => {
    ecrireSession({ role: lu.role, reponses: lu.reponses, relances: lu.relances });
    location.href = 'questions.html';
  });

  // La première partie, le profil : rien n'y ramenait une fois le résultat
  // affiché. Elle n'est pas dans le lien, on la reprend donc là où elle a été
  // gardée sur l'appareil.
  const versProfil = $('[data-modifier-profil]');
  const memoire = profilMemorise();
  if (versProfil && memoire && contenu.engagement.retour.profil) {
    texte(versProfil, contenu.engagement.retour.profil);
    versProfil.hidden = false;
    versProfil.addEventListener('click', () => {
      ecrireSession({
        role: memoire.role || lu.role,
        profil: memoire.profil,
        reponses: lu.reponses,
        relances: lu.relances,
      });
      location.href = 'profil.html';
    });
  }
}

async function demarrer() {
  signalerModeDemo();
  const contenu = await chargerContenu();
  installerEtapes(contenu);

  // contenu permet de vérifier que les indices de choix existent vraiment.
  const lu = decoder(location.hash, contenu);
  if (!lu) {
    $('[data-sans-resultat]').hidden = false;
    typographierPage();
    return;
  }

  const brut = calculer(lu.reponses, contenu, lu.role);
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

  // Cet état des lieux devient celui de l'appareil : revenir sur le site le
  // proposera au lieu de tout faire refaire.
  memoriserResultat(location.href);
  brancherModifier(contenu, lu);

  $('[data-resultat]').hidden = false;
  remplirTextes(contenu);
  afficherEnsemble(resultat);
  afficherBandes(resultat, contenu, idees);
  installerSommaire(contenu);

  // L'affirmation 16 n'a pas de dimension : ses idées vont sous la dernière bande.
  const hoteResultats = $('[data-idees-resultats]');
  vider(hoteResultats);
  if (ideesResultats) {
    hoteResultats.appendChild(encadreIdees(ideesResultats, contenu.envies.resultats_titre));
  }

  // Une seule ligne sobre, et seulement s'il y a des idées à montrer.
  const ligne = $('[data-ligne-idees]');
  if (auMoinsUneIdee(lu.relances) && (Object.keys(idees).length > 0 || ideesResultats)) {
    // Un manager lit une phrase écrite pour lui, s'il y en a une.
    const finale = (lu.role === 'manager' && contenu.envies.phrase_finale_manager)
      || contenu.envies.phrase_finale;
    texte(ligne, finale);
    ligne.hidden = false;
  }
  /**
   * La mise en perspective arrive après coup : la page ne l'attend pas.
   *
   * Le lien ne porte pas le profil, et ne doit pas le porter : c'est une donnée
   * de la personne. On le lit dans la session tant qu'elle dure, ce qui permet
   * la comparaison à un profil proche juste après avoir répondu. En revenant
   * plus tard par le lien, la session a disparu et l'on compare à l'ensemble.
   */
  agregatsPublics()
    .then((agregats) => {
      const profil = lireSession().profil || {};
      afficherComparaison(resultat.dimensions, agregats, profil, lu.role, contenu);
    })
    .catch(() => { /* sans agrégats, le résultat reste complet */ });

  brancherRaccourciLien();
  brancherGarder(contenu);
  brancherPartage(contenu);
  brancherEtude();
  typographierPage();
}

/**
 * Les liens d'ancre de la page (« Qui sommes-nous », le sommaire) ne doivent
 * jamais toucher au hash : il porte les réponses, et le remplacer par
 * « #lecture » effaçait le résultat. On fait défiler jusqu'à la cible, sans
 * changer l'adresse.
 */
document.addEventListener('click', (e) => {
  const lien = e.target.closest && e.target.closest('a[href^="#"]');
  if (!lien || e.defaultPrevented) return;
  const cible = document.getElementById(lien.getAttribute('href').slice(1));
  if (!cible) return;
  e.preventDefault();
  const douceur = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  cible.scrollIntoView({ behavior: douceur, block: 'start' });
});

/**
 * Toute la page découle du hash. S'il change (lien collé, favori rouvert, retour
 * arrière du navigateur), on recharge : plus sûr que de reconstruire à la main.
 */
window.addEventListener('hashchange', () => location.reload());

demarrer();
