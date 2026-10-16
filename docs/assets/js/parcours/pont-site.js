/**
 * Le pont entre les pages du site (copiées telles quelles depuis la préprod, 13 octobre 2026) et le vrai état des lieux.
 *
 * Les maquettes du site font tout le parcours dans le navigateur. On ne les recode pas (Arnaud : « tu vas pas tout
 * recoder ») : on branche seulement la fin. Quand les 16 réponses sont là, la maquette appelle window.__edlFin(state) au
 * lieu de montrer son écran de résultat ; on enregistre alors les réponses dans Supabase, comme questions.js, et on ouvre
 * la vraie page de résultat.
 *
 * Sur l'accueil, on compte une visite ; sur le questionnaire, un début de parcours.
 */
// Les fichiers changés pour le rôle solo portent leur version : un navigateur qui gardait l'ancien lien.js en cache
// ne savait pas fabriquer un lien solo, et « Voir mon résultat » ne faisait rien (13 octobre 2026).
import '../entete.js?v=262';
import { chargerContenu, codesActifs } from '../contenu.js?v=262';
import { relancesAEnvoyer } from '../calcul.js?v=262';
import { lienResultat } from '../lien.js?v=262';
import { envoyerReponse, compteur } from '../api.js?v=262';
import { ecrire, dejaEnvoye, retenirEnvoi } from '../session.js?v=262';
import { evenement } from './commun.js?v=262';

const page = document.documentElement.dataset.edl || '';

// ---------------------------------------------------------------- l'habillage
// Les maquettes se redessinent elles-mêmes : on les retouche à chaque rendu, sans toucher à leur code.

const norm = (t) => t.replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();

// Les textes de l'accueil, réécrits dans notre thèse (Arnaud, 13 octobre 2026) : la confiance, le soutien et la cohésion
// engagent une équipe ; la performance n'est pas un objectif, elle en est la conséquence. Pas de note, pas de jugement.
const TEXTES = {
  // Le grand titre porte la phrase de Greatly ; « La confiance, le soutien, la cohésion : ce qui engage. » passe dessous, en petit
  // (Arnaud, 14 octobre 2026 : « tu mets en gros dans la même forme Greatly éclaire…, et en dessous comme avant la confiance… »).
  // Le titre de l'accueil (Arnaud, 14 octobre 2026 : « je voudrais faire évoluer le header »), dans la forme d'origine : une
  // ligne fine, deux lignes grasses, la dernière surlignée.
  'Ce qui vous aide': 'Votre réussite se construit à plusieurs.',
  'à bien travailler': 'Nous en posons',
  'ensemble': 'les fondations',
  "En 2 minutes, voyez ce qui fonctionne déjà entre vous et ce qui peut encore évoluer. De quoi mettre des mots justes sur ce que vous vivez.":
    "Regardez votre équipe telle que vous la voyez : la confiance, le soutien, la cohésion, l’engagement. Puis découvrez ce que montrent toutes les réponses.", // sans dévoiler le résultat (Arnaud)
  // « Ce que vous y gagnez » parle aux équipes comme aux solos : on le lit avant de choisir son profil (Arnaud, 13 octobre 2026).
  'Un regard clair sur votre façon de travailler ensemble': 'Votre équipe ou votre activité, telle que vous la voyez : la confiance, le soutien, la cohésion',
  'Ce qui vous porte déjà': 'Vos réponses à côté de celles de personnes qui travaillent comme vous',
  'Ce qui peut encore évoluer': "Ce que montre l'étude : ce qui nourrit l'engagement",
  'Des mots pour en parler, avec vos collègues ou votre manager': 'Des mots pour en parler, avec votre équipe, votre manager ou votre collectif',
  // Comprendre, pas montrer ; regarder, pas vérifier (Arnaud, 15 octobre 2026, audit des wordings).
  'Une étude pour mieux éclairer les équipes': "Une étude pour comprendre ce qui nourrit l'engagement",
  "Vos réponses, anonymes et regroupées, aident nos intervenants à préparer des ateliers ancrés dans le vécu des équipes, et nos programmes à évoluer. L'étude complète est partagée avec ceux qui le souhaitent.":
    "Vos réponses restent anonymes. Regroupées, elles servent une étude qui regarde si, là où la confiance, le soutien et la cohésion sont là, on s'engage davantage et on atteint mieux ses objectifs. En équipe comme à son compte. L'étude complète est partagée avec ceux qui le souhaitent.", // texte validé le 13 octobre 2026 (ordinateur)
  // « Ce que vous recevez en 2 minutes » : quatre blocs ancrés dans ce que la personne vit vraiment (Arnaud, 13 octobre 2026).
  "Une lecture d'ensemble": 'Votre équipe, telle que vous la voyez',
  'En quelques lignes, la façon dont vous travaillez ensemble, vue depuis votre place.':
    "16 questions simples, comme « Je peux parler franchement à mon manager, y compris d'une erreur ». Pour la confiance, le soutien, la cohésion, puis l'engagement et la performance : un chiffre sur 100. Votre regard, pas une note.",
  'Huit repères, quatre niveaux': 'Ce qui engage une équipe',
  "Le cap commun, l'info, la confiance, le soutien… Chaque repère prend l'un des quatre niveaux, de « À construire » à « Bien installé ». Jamais de note.":
    "À côté de votre regard, celui de toutes les personnes qui ont répondu : là où la confiance, le soutien et la cohésion sont là, et là où ils manquent, combien de personnes sont engagées. Puis combien atteignent leurs objectifs : la performance vient après, elle n'est pas le point de départ.",
  'Une phrase pour chaque repère': 'Ce que vous aimeriez, ce que les autres demandent',
  'Ce qui est déjà là, et ce qui peut encore évoluer, dit simplement et sans jugement.':
    "Quand vous répondez « Pas encore » ou « Un peu », vous pouvez dire ce que vous aimeriez. Vous le retrouvez dans votre résultat, à côté de ce que demandent le plus les managers et les équipes. Sans jugement.",
  // La version téléphone a ses propres phrases.
  'En 2 minutes, voyez ce qui fonctionne déjà entre vous et ce qui peut encore évoluer. Anonyme, sans compte.':
    'Votre équipe telle que vous la voyez, à côté de toutes les réponses. Anonyme, sans compte.',
  'De « À construire » à « Bien installé ». Jamais de note.':
    'À côté de votre regard, toutes les réponses : là où la confiance, le soutien et la cohésion sont là, combien de personnes sont engagées. La performance vient après.',
  'Ce qui est déjà là, et ce qui peut encore évoluer, dit simplement.':
    'Ce que vous aimeriez, à côté de ce que demandent le plus les managers et les équipes.',
  'Un regard clair sur votre façon de travailler ensemble : ce qui vous porte déjà, ce qui peut encore évoluer, et des mots pour en parler.':
    "Votre équipe ou votre activité, telle que vous la voyez : la confiance, le soutien, la cohésion. À côté, ce que montrent toutes les réponses : ce qui nourrit l'engagement.",
  'Vos réponses, anonymes et regroupées, aident nos intervenants à préparer des ateliers ancrés dans le vécu des équipes, et nos programmes à évoluer.':
    "Vos réponses restent anonymes. Regroupées, elles servent une étude qui regarde si, là où la confiance, le soutien et la cohésion sont là, on s'engage davantage et on atteint mieux ses objectifs. En équipe comme à son compte. L'étude complète est partagée avec ceux qui le souhaitent.", // la même phrase sur téléphone
  // L'introduction du profil (Arnaud, 13 octobre 2026 : « ce texte n'est pas top »).
  "Pour lire vos réponses à côté de celles d'équipes qui vous ressemblent, quand elles seront assez nombreuses. Rien ne permet de vous identifier.":
    'Pour vous situer parmi toutes les réponses, en équipe ou à votre compte. Rien ne permet de vous identifier.',
  // Le titre de l'étape 1 parle aussi aux solos, et ne répète plus « Quelques mots » (Arnaud, 14 octobre 2026 : « ici soucis »).
  'sur votre équipe.': 'sur vous.',
  // Le rôle devient « Vous travaillez », avec trois choix (le troisième vient de window.__edlSolo).
  'Dans votre équipe, vous êtes': 'Vous travaillez',
  'Gardez votre résultat en favoris et retrouvez-le quand vous voulez. Sans compte, sans e-mail.':
    'Votre résultat tient dans un lien. Gardez-le pour y revenir quand vous voulez : sans compte, sans e-mail, sans votre nom.',
  'Gardez votre résultat et retrouvez-le quand vous voulez. Sans compte, sans e-mail.':
    'Votre résultat tient dans un lien. Gardez-le pour y revenir : sans compte, sans e-mail, sans votre nom.',
  'Comment vivez-vous': 'Comment voyez-vous ',
  // Bloc de fin : « Comment voyez-vous / votre travail ? », les deux lignes séparées par une espace (14e corrections).
  'le travail ensemble ?': 'votre travail ?',
  // Ce qui ne parlait qu'aux équipes, ouvert aussi aux solos (Arnaud, 13 octobre 2026 : « ok »).
  "État des lieux d'équipe · 2 minutes": 'État des lieux · 2 minutes',
  "Sur les travaux de Jody Hoffer Gittell, à l'université Brandeis : des objectifs partagés, des connaissances partagées et le respect mutuel aident une équipe à mieux travailler ensemble.":
    "Sur les travaux de Jody Hoffer Gittell, à l'université Brandeis : quand on vise le même objectif, qu'on sait ce que fait l'autre et qu'on se respecte, on travaille mieux ensemble. En équipe comme avec ses partenaires.",
  // Bloc « Anonyme » du bas de l'accueil (13 octobre 2026). Le lien de confidentialité qui suit reste à sa place.
  'Anonyme. Aucun compte à créer. Résultat immédiat. Vos réponses servent à calculer votre résultat et, regroupées, à publier une étude.':
    "Anonyme et sans compte : personne ne sait qui a répondu. Votre résultat s'affiche tout de suite. Vos réponses, regroupées avec les autres, nourrissent l'étude.",
  // Confidentialité : « Vos chiffres par mail » envoie désormais un mail, à la demande (Arnaud, 13 octobre 2026 : « go »).
  "Aucun e-mail automatique n'est envoyé par cet outil.":
    "Si vous demandez votre état des lieux par mail, nous gardons votre prénom, votre nom, votre e-mail et le lien de votre résultat, pour vous l'envoyer. Ce lien contient vos réponses : dans ce cas, et seulement dans ce cas, vos coordonnées sont reliées à ce que vous avez répondu. Nous savons aussi si le mail a été ouvert, grâce à notre service d'envoi. Ces informations ne servent à rien d'autre. Vous pouvez demander leur effacement à tout moment à arnaud@greatly.club.",
  // Confidentialité mise à jour avec les évolutions (Arnaud, 14 octobre 2026) : base Supabase au lieu du tableur Google,
  // chiffres par mail (lien relié aux coordonnées, mesure d'ouverture, prestataires), rôle solo, durée de conservation.
  "État des lieux d'équipe": 'État des lieux',
  // « 16 phrases », une seule façon de dire, dans la page aussi (Arnaud, 15 octobre 2026, audit des wordings).
  "Vos réponses aux 16 phrases, et les choix des questions de relance.":
    "Vos réponses aux 16 questions, et les choix des questions de relance. Si vous cochez « Autre », les quelques mots que vous écrivez (sans nom, s'il vous plaît).",
  "Les éléments de profil que vous indiquez : rôle dans l'équipe, genre si vous le souhaitez, taille de l'entreprise, secteur d'activité, taille de l'équipe.":
    "Les éléments de profil que vous indiquez : votre façon de travailler (en encadrant une équipe, au sein d'une équipe, ou en solo), genre si vous le souhaitez, taille de l'entreprise et de l'équipe (pas pour un solo), secteur d'activité.",
  "Aucun cookie publicitaire, aucun traceur d'audience tierce.":
    "Aucun cookie publicitaire, aucun traceur d'audience tierce. Seul le mail de résultat, si vous le demandez, indique s'il a été ouvert.",
  "Votre lien personnel contient vos réponses, sous forme abrégée, directement dans l'adresse. Il reste dans votre navigateur et n'est jamais envoyé à nos serveurs. Personne ne peut s'en servir pour retrouver votre nom.":
    "Votre lien personnel contient vos réponses, sous forme abrégée, directement dans l'adresse. Il reste dans votre navigateur et ne nous est pas envoyé, sauf si vous demandez votre état des lieux par mail (voir plus bas). Personne ne peut s'en servir pour retrouver votre nom.",
  "Si vous laissez votre prénom, votre nom, votre entreprise et votre e-mail professionnel pour recevoir l'étude complète, ces informations sont enregistrées dans un fichier séparé. Elles ne portent aucun identifiant de réponse ni de visite : il n'existe aucun moyen, même technique, de les relier à ce que vous avez répondu.":
    "Si vous laissez votre prénom, votre nom, votre entreprise et votre e-mail professionnel pour recevoir l'étude complète, ces informations sont enregistrées à part. Elles ne portent aucun identifiant de réponse ni de visite : il n'existe aucun moyen, même technique, de les relier à ce que vous avez répondu.",
  "Les réponses anonymes et les coordonnées sont stockées dans deux feuilles distinctes d'un tableur Google appartenant à Greatly, accessible aux seules personnes de Greatly qui en ont besoin.":
    "Les réponses anonymes et les coordonnées sont stockées séparément dans une base de données hébergée en Allemagne par Supabase, accessible aux seules personnes de Greatly qui en ont besoin. Si vous demandez votre état des lieux par mail, deux prestataires interviennent pour notre compte, uniquement pour cet envoi et sur des serveurs en Europe : Browserless, qui fabrique le PDF à partir du lien de votre résultat et de votre prénom, et Brevo, qui envoie le mail.",
  "Les coordonnées laissées pour recevoir l'étude sont conservées jusqu'à l'envoi de l'étude, puis trois ans au maximum.":
    "Les coordonnées laissées pour recevoir l'étude sont conservées jusqu'à l'envoi de l'étude, puis cinq ans au maximum. Celles laissées pour recevoir votre état des lieux par mail sont conservées cinq ans au plus après l'envoi.",
};
const TEXTES_N = Object.fromEntries(Object.entries(TEXTES).map(([k, v]) => [norm(k), v]));

let total = null;

// Le nombre de personnes, en grand à droite du haut de l'accueil (Arnaud, 13 octobre 2026), à la place de la montagne.
// Sur téléphone, sous le bouton. Le petit compteur à côté du bouton disparaît.
// Le nombre ne flotte plus seul (Arnaud, 13 octobre 2026) : une carte posée à côté du texte, à sa hauteur, où le chiffre
// monte doucement pendant que les points se posent, un point par personne.
let anime = 0; // 0 : pas encore lancé ; 1 : en cours ou fini (on ne rejoue pas l'animation après un nouveau rendu)
const calme = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const peindre = (b, n) => {
  b.querySelector('.edl-nombre__chiffre').textContent = n.toLocaleString('fr-FR');
  const pts = b.querySelectorAll('.edl-nombre__points i'); const par = Number(b.dataset.par || 1);
  pts.forEach((x, k) => x.classList.toggle('on', k < Math.ceil(n / par)));
};
const lancer = (b) => {
  if (anime) { peindre(b, total); return; }
  anime = 1;
  if (calme()) { peindre(b, total); return; }
  const t0 = performance.now(), duree = 1800;
  const pas = (t) => { const x = Math.min(1, (t - t0) / duree); const e = 1 - Math.pow(1 - x, 3);
    const live = document.querySelector('.edl-nombre'); if (live) peindre(live, Math.round(total * e));
    if (x < 1) requestAnimationFrame(pas); };
  requestAnimationFrame(pas);
};
const nombre = () => {
  const m = [...document.querySelectorAll('[data-maquette]')].find((x) => x.getClientRects().length); if (!m) return;
  const hero = m.querySelector('section'); if (!hero) return;
  m.querySelectorAll('span').forEach((sp) => { if (/personnes ont déjà participé/.test(sp.textContent || '') && sp.closest('section') === hero && !sp.closest('.edl-nombre')) sp.style.display = 'none'; });
  if (total == null) return;
  let b = hero.querySelector('.edl-nombre');
  if (!b) {
    const mobile = m.dataset.maquette === 'MEtatDesLieux';
    // Au-delà de 400 personnes, un point en vaut plusieurs, en chiffres ronds (5, 10, 20, 50…) : la grille garde la même
    // taille et se lit d'un coup d'œil, à 1 000 comme à 10 000 (Arnaud : « quand tu en auras 1000 ? »).
    const PAS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
    const par = PAS.find((x) => total / x <= 400) || Math.ceil(total / 400);
    const nb = Math.ceil(total / par);
    b = document.createElement('div'); b.className = 'edl-nombre' + (mobile ? ' edl-nombre--mobile' : ''); b.dataset.par = par;
    b.innerHTML = '<span class="edl-nombre__sur">L’étude en cours</span>'
      + '<span class="edl-nombre__chiffre">0</span>'
      + '<span class="edl-nombre__texte">personnes ont répondu à l’état des lieux.</span>'
      + '<span class="edl-nombre__points" aria-hidden="true">' + '<i></i>'.repeat(nb) + '</span>'
      + '<span class="edl-nombre__legende">' + (par === 1 ? 'Chaque point, une personne.' : 'Chaque point, ' + par.toLocaleString('fr-FR') + ' personnes.') + '</span>';
    if (mobile) { const cta = [...hero.children].find((c) => c.querySelector('a, button')); (cta || hero.lastChild).after(b); }
    else {
      const hote = hero.querySelector(':scope > div[style*="position:relative"]') || hero;
      hote.classList.add('edl-hero'); hero.classList.add('edl-hero-section'); hote.appendChild(b);
    }
    if (anime) peindre(b, total);
  }
  // Sous le titre, en petit : la fin du mantra (Arnaud, 14 octobre 2026). Le titre en porte le début (TEXTES).
  const h1 = hero.querySelector('h1');
  if (h1 && !(h1.nextElementSibling && h1.nextElementSibling.classList.contains('edl-signature'))) {
    hero.querySelectorAll('.edl-signature').forEach((x) => x.remove());
    const sg = document.createElement('p'); sg.className = 'edl-signature';
    sg.textContent = 'Greatly éclaire celles et ceux qui, ensemble, font rayonner leur entreprise.';
    h1.after(sg);
  }
  // Une petite frise des trois étapes, sous le haut de page, dans la même DA que la carte du nombre (Arnaud, 13 octobre 2026).
  if (!m.querySelector('.edl-frise')) {
    const f = document.createElement('ol'); f.className = 'edl-frise';
    f.innerHTML = [
      ['Votre façon de travailler', 'En équipe ou à votre compte, la taille de l’entreprise, le secteur.'],
      // « 16 questions, deux minutes » (Arnaud, 16 octobre 2026) : « questions » partout, plus « phrases ».
      ['16 questions, deux minutes', 'Pour chacune, de « Pas encore » à « Pleinement ».'],
      ['Votre état des lieux', 'Votre regard, comparé à des centaines de réponses.'],
    ].map(([t, d], k) => '<li><span class="edl-frise__num">' + (k + 1) + '</span><span class="edl-frise__titre">' + t + '</span><span class="edl-frise__texte">' + d + '</span></li>').join('');
    const nb = hero.querySelector('.edl-nombre');
    if (m.dataset.maquette === 'MEtatDesLieux') f.classList.add('edl-frise--mobile');
    // Juste sous le titre « Ce que vous y gagnez, ce que nous y gagnons » (Arnaud, 15 octobre 2026) : on sait d'abord ce qu'on y gagne, puis
    // comment ça se passe. Sinon, à l'ancienne place, sous le haut de page.
    const gains = [...m.querySelectorAll('h2')].find((h) => /ce que nous y gagnons/i.test(h.textContent || ''));
    if (gains) {
      f.classList.add('edl-frise--gains');
      // Une seule rangée en tête (Arnaud, 15 octobre 2026 : « une superposition de blocs ») : le titre à gauche, les trois étapes
      // en colonne à droite ; dessous, l'échange « pour vous / pour nous » sur la même grille.
      if (m.dataset.maquette !== 'MEtatDesLieux') {
        const tete = document.createElement('div'); tete.className = 'edl-pour-tete';
        gains.before(tete); tete.append(gains, f); f.classList.add('edl-frise--colonne');
        const sec = tete.closest('section'); if (sec) sec.classList.add('edl-pour');
        // Les deux colonnes se répondent : « Pour vous » reçoit, comme « Pour Greatly », sa phrase en titre.
        const cols = sec && sec.querySelector(':scope > div:not(.edl-pour-tete)');
        const [g, d] = cols ? [...cols.children] : [];
        const modele = d && d.children[1];
        if (g && modele && !g.querySelector('.edl-pour-titre')) {
          const t = modele.cloneNode(false); t.classList.add('edl-pour-titre'); t.textContent = 'Votre état des lieux, en deux minutes';
          g.children[0].after(t);
        }
      } else gains.after(f);
    }
    else if (m.dataset.maquette === 'MEtatDesLieux') nb.after(f); else nb.parentElement.appendChild(f);
  }
  if ('IntersectionObserver' in window && !anime) {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); lancer(b); } }); io.observe(b);
  } else if (!anime) lancer(b);
};
// « Greatly, ce n'est pas… » (Arnaud, 14 octobre 2026) : sous « Ce que vous y gagnez », un bloc qui pose le concept, et un
// bouton vers la page qui reprend les dix phrases (/greatly-ce-n-est-pas.html). Mêmes composants que l'accueil.
const FLECHE = '<span class="edl-pas__rond" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#0C1011" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>';
const blocPas = () => {
  const m = [...document.querySelectorAll('[data-maquette]')].find((x) => x.getClientRects().length); if (!m) return;
  const gagnez = [...m.querySelectorAll('section')].find((x) => /^Ce que vous y gagnez/.test(norm(x.textContent || ''))); if (!gagnez) return;
  // Dans la section, tout en bas, et non entre deux sections : la maquette réutiliserait le bloc pour redessiner les siennes.
  if (gagnez.querySelector(':scope > .edl-pas')) return;
  m.querySelectorAll('.edl-pas').forEach((x) => x.remove());
  const b = document.createElement('section'); b.className = 'edl-pas' + (m.dataset.maquette === 'MEtatDesLieux' ? ' edl-pas--mobile' : '');
  // À gauche le titre et le bouton ; à droite, une carte de points dans la DA de « L'étude en cours » (Arnaud, 14 octobre 2026 :
  // « l'idée du bloc au-dessus avec les points ») : en bas, les fondations (bleu-vert) ; dessus, des colonnes vert vif qui montent,
  // la réussite qu'on construit. Les fondations se posent d'abord, puis les colonnes montent.
  const COL = 30, FOND = 3, HAUT = [3, 5, 4, 6, 8, 7, 5, 6, 9, 8, 6, 7, 10, 9, 7, 8, 11, 10, 8, 9, 12, 11, 9, 10, 13, 12, 11, 12, 14, 13];
  const RANGS = FOND + Math.max(...HAUT); let pts = '';
  for (let r = RANGS - 1; r >= 0; r--) for (let c = 0; c < COL; c++) {
    const t = r < FOND ? 'f' : r - FOND < HAUT[c] ? 'r' : '';
    pts += '<i' + (t ? ' class="' + t + '" style="--d:' + (t === 'f' ? c * 12 : 500 + c * 45 + (r - FOND) * 55) + 'ms"' : '') + '></i>'; }
  b.innerHTML = '<div class="edl-pas__texte"><span class="edl-pas__sur">Notre approche</span>'
    + '<h2><span class="edl-pas__leger">Greatly,</span><span class="edl-pas__gras">ce n’est pas…</span></h2>'
    + '<a class="edl-pas__bouton" href="/greatly-ce-n-est-pas.html">Découvrir notre approche' + FLECHE + '</a></div>'
    + '<div class="edl-pas__carte"><span class="edl-pas__carte-sur">Notre façon de faire</span>'
    + '<span class="edl-pas__points" aria-hidden="true" style="--col:' + COL + '">' + pts + '</span>'
    + '<span class="edl-pas__legende"><span><i class="r"></i>Votre réussite, que vous construisez</span><span><i class="f"></i>Les fondations, que nous posons avec vous</span></span></div>';
  const lancerPoints = () => b.classList.add('edl-pas--anime');
  if (calme() || !('IntersectionObserver' in window)) lancerPoints();
  else { const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); lancerPoints(); } }, { threshold: 0.3 }); io.observe(b); }
  // Sans la liste à droite (Arnaud, 14 octobre 2026 : « je mettrais pas à droite les infos ») : elles sont sur la page.
  gagnez.appendChild(b);
};

// « Autre » : quelques mots (Arnaud, 14 octobre 2026, retour d'une répondante : « je ne pouvais pas compléter avec du
// texte »). Quand « Autre » est coché, un champ s'ouvre juste dessous ; ce qu'on y écrit est gardé (même si la maquette se
// redessine, même après un rechargement) et part avec les réponses (edl_repondre, migration 34). 140 caractères, sans nom.
const AUTRES = (() => { try { return JSON.parse(sessionStorage.getItem('edl_autres') || '{}') || {}; } catch (e) { return {}; } })();
const garderAutres = () => { try { sessionStorage.setItem('edl_autres', JSON.stringify(AUTRES)); } catch (e) { /* rien */ } };
const champsAutre = () => {
  document.querySelectorAll('[data-maquette] [id^="a"]').forEach((q) => {
    const n = (q.id.match(/^a(\d+)$/) || [])[1]; if (!n) return;
    const b = [...q.querySelectorAll('button[role="checkbox"]')].find((x) => norm(x.textContent || '') === 'Autre');
    const champ = q.querySelector('.edl-autre');
    if (!b || b.getAttribute('aria-checked') !== 'true') { if (champ) champ.remove(); return; }
    if (champ && champ.previousElementSibling === b) return;
    if (champ) champ.remove();
    const i = document.createElement('input');
    i.className = 'edl-autre'; i.type = 'text'; i.maxLength = 140; i.autocomplete = 'off';
    i.placeholder = 'En quelques mots, sans nom s’il vous plaît'; i.setAttribute('aria-label', 'Précisez votre idée');
    i.value = AUTRES[n] || '';
    i.addEventListener('input', () => { AUTRES[n] = i.value; garderAutres(); });
    ['click', 'keydown', 'keyup', 'pointerdown'].forEach((t) => i.addEventListener(t, (e) => e.stopPropagation()));
    b.after(i);
  });
};

const retoucher = () => {
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    // Typographie française (responsive, 16 octobre 2026) : espace insécable avant ? ! : ; » et après «, pour qu'aucun signe ne
    // passe seul à la ligne (Lexique des règles typographiques de l'Imprimerie nationale). Seulement les espaces ordinaires.
    if (n.nodeValue && /[ ][?!:;»]|«[ ]/.test(n.nodeValue) && !(n.parentElement && n.parentElement.closest('script, style, textarea, input'))) n.nodeValue = n.nodeValue.replace(/ ([?!:;»])/g, '\u00a0$1').replace(/« /g, '«\u00a0');
    const t = norm(n.nodeValue || ''); if (!t) continue;
    if (TEXTES_N[t]) { const v = n.nodeValue.match(/^\s*/)[0] + TEXTES_N[t] + n.nodeValue.match(/\s*$/)[0]; if (n.nodeValue !== v) n.nodeValue = v; }
    else if (total != null && t === '255' && n.parentElement && /participé/.test(n.parentElement.parentElement?.textContent || '')) n.nodeValue = String(total);
  }
  // L'exemple de résultat de la maquette (huit sommets, quatre niveaux) n'existe plus : on le retire.
  // Ces blocs et le petit compteur sont aussi retirés du HTML de base, qui porte déjà les textes de TEXTES : moteurs, aperçus
  // et premier affichage disent la même chose que la page (Arnaud, 15 octobre 2026, audit des wordings). On garde ce filet.
  document.querySelectorAll('[data-maquette] section').forEach((s) => {
    const t = norm(s.textContent || '');
    // « Ce que vous recevez en 2 minutes » ne sert à rien (Arnaud, 13 octobre 2026) : retiré aussi.
    if (/^(Huit sommets|Un exemple ?de résultat|Ce que vous ?recevez)/.test(t)) s.style.display = 'none';
  });
  // Le paragraphe « En 2 minutes, regardez votre équipe… » sous le titre est retiré (Arnaud, 13 octobre 2026) : la
  // signature de Greatly le remplace.
  if (page === 'accueil') document.querySelectorAll('[data-maquette] section:first-of-type p').forEach((x) => {
    if (/^(En 2 minutes|Regardez votre équipe|Votre équipe telle que vous la voyez)/.test(norm(x.textContent || '')) && x.style.display !== 'none') x.style.display = 'none';
  });
  if (page === 'accueil') { nombre(); blocPas(); }
  if (page === 'accueil' && document.querySelector('[data-maquette] .edl-nombre')) document.documentElement.classList.add('edl-pret');
  // « vous » surligné en vert vif dans le titre de l'étape 1, comme le titre de l'accueil (Arnaud, 14 octobre 2026).
  if (page === 'questionnaire') document.querySelectorAll('[data-maquette] h1 span, [data-maquette] h2 span').forEach((x) => {
    if (x.children.length === 0 && norm(x.textContent || '') === 'sur vous.') x.innerHTML = 'sur <span class="g-peps edl-vous">vous</span>.';
  });
  if (page === 'questionnaire') champsAutre();
  // Un titre dont un mot est plus large que l'écran (« confidentialité » sur téléphone) se réduit jusqu'à ce que le mot tienne
  // entier, sans césure (responsive, 16 octobre 2026).
  if (matchMedia('(max-width: 600px)').matches) document.querySelectorAll('[data-maquette] :is(h1, h2) > span').forEach((x) => {
    if (!x.getClientRects().length || x.dataset.edlAjuste === String(innerWidth)) return;
    const boite = x.closest('h1, h2'); const large = boite.clientWidth; if (!large) return;
    x.style.removeProperty('font-size'); x.style.setProperty('overflow-wrap', 'normal'); x.style.setProperty('word-break', 'normal'); x.style.setProperty('white-space', 'normal');
    let t = parseFloat(getComputedStyle(x).fontSize); let n = 0;
    while (x.scrollWidth > large + 1 && n < 30) { t *= 0.95; x.style.setProperty('font-size', t + 'px', 'important'); n += 1; }
    x.dataset.edlAjuste = String(innerWidth);
  });
  if (page === 'questionnaire' && typeof etapesProfil === 'function') etapesProfil();
  // Le pied du questionnaire sur une ligne, sans la politique de confidentialité (Arnaud, 15 octobre 2026 : « pas utile à cette étape »).
  if (page === 'questionnaire') document.querySelectorAll('footer.g-pied2 a[href*="confidentialite"]').forEach((a) => {
    // Les « · » qui précédaient les liens retirés disparaissent avec eux.
    let n = a.previousSibling;
    while (n && (n.nodeType === 3 || (n.nodeType === 1 && n.tagName === 'A'))) {
      if (n.nodeType === 3 && /·\s*$/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/\s*·\s*$/, '');
      n = n.previousSibling;
    }
    const br = a.parentElement && a.parentElement.querySelector('br'); if (br && br.previousSibling && br.previousSibling.nodeType === 3 && !/·\s*$/.test(br.previousSibling.nodeValue)) br.previousSibling.nodeValue += ' · ';
  });

  if (page === 'questionnaire' && typeof etapesPhrases === 'function') etapesPhrases();
  if (page === 'questionnaire' && typeof friseEtapes === 'function') friseEtapes();
  if (page === 'questionnaire') document.documentElement.classList.add('edl-pret');
  // « Retour » plus discret (Arnaud, 15 octobre 2026 : « trop gros ») : un lien secondaire, pas un second bouton.
  if (page === 'questionnaire') document.querySelectorAll('[data-maquette] a, [data-maquette] button').forEach((x) => {
    if (!x.classList.contains('edl-retour') && /^Retour$/.test(norm(x.textContent || ''))) x.classList.add('edl-retour');
    if (!x.classList.contains('edl-cta-tourne') && /^Continuer/.test(norm(x.textContent || '')) && x.querySelector('svg')) x.classList.add('edl-cta-tourne');
  });
  if (page === 'questionnaire') {
    // Un solo ne répond pas à la taille de l'équipe : le bloc disparaît tant que « À votre compte » est choisi.
    const t = [...document.querySelectorAll('[data-maquette] *')].filter((x) => x.children.length === 0 && /^Taille de votre équipe/.test(norm(x.textContent || '')));
    t.forEach((x) => { let b = x.parentElement; while (b && !b.querySelector('button')) b = b.parentElement;
      if (b) b.toggleAttribute('data-edl-cache', window.__edlRole === 2); }); // un attribut, pour ne jamais toucher au style de la maquette
  }
  if (page === 'questionnaire') {
    const tel = matchMedia('(max-width: 1023px)').matches;
    document.querySelectorAll('[data-maquette] [id^="a"]').forEach((q) => {
      const idees = [...q.children].find((c) => c.tagName === 'DIV' && /var\(--k14\)/.test(c.getAttribute('style') || ''));
      if (!idees) return;
      const boutons = [...q.querySelectorAll(':scope > div > button[aria-pressed]')];
      const i = boutons.findIndex((b) => b.getAttribute('aria-pressed') === 'true');
      const o = tel && i >= 0 ? String((i + 1) * 10 + 5) : '';
      if (idees.style.order !== o) idees.style.order = o;
    });
  }
};

const style = document.createElement('style');
style.textContent = [
  // Pas de menu sur téléphone pendant le questionnaire (Arnaud, 16 octobre 2026 : « pour ne pas polluer le parcours »).
  '@media (max-width: 51.25em) { html[data-edl="questionnaire"] .ent { display: none !important; } }',
  // Plus de montagne dans le haut de l'accueil, ni les trois mentions dessous (Anonyme, Aucun compte, Résultat immédiat).
  'html[data-edl="accueil"] [data-maquette] section:first-of-type > div:first-child[style*="position:absolute"] { display: none !important; }',
  'html[data-edl="accueil"] [data-maquette="MEtatDesLieux"] section:first-of-type > div[style*="position:relative;height"] { display: none !important; }',
  'html[data-edl="accueil"] [data-maquette] main > div[style*="background:#23545B"] { display: none !important; }',
  // « ce qui engage » reste d'un bloc sur téléphone.
  '[data-maquette="MEtatDesLieux"] h1 .g-peps { display: inline-block; white-space: nowrap; }',
  // Sur téléphone, le panneau « Votre avancée » du questionnaire ne colle plus en haut : il prenait la moitié de l'écran
  // et les questions passaient dessous (Arnaud, 13 octobre 2026). Il reste en tête de liste, puis défile avec le reste.
  // « Votre avancée » ne sert pas sur téléphone (Arnaud, 13 octobre 2026) : on le garde seulement sur ordinateur.
  '@media (max-width: 1023px) { html[data-edl="questionnaire"] [data-maquette] aside { display: none !important; } }',
  // Sur téléphone, le profil et les questions prennent toute la largeur, sans encadré, et les questions se lisent plus
  // gros (Arnaud, 13 octobre 2026).
  '@media (max-width: 1023px) {'
    + ' html[data-edl="questionnaire"] [data-maquette] div[style*="border-radius:1.75rem"][style*="border:var(--k3)"] { border: 0 !important; border-radius: 0 !important; background: transparent !important; padding: 0 !important; }'
    + ' html[data-edl="questionnaire"] [data-maquette] [id^="a"][style*="border-radius:1.5rem"] { border: 0 !important; border-top: 1px solid var(--k45) !important; border-radius: 0 !important; background: transparent !important; padding: 1.75rem 0 1.5rem !important; }'
    + ' html[data-edl="questionnaire"] [data-maquette] [id^="a"] p[style*="font-size:1.375rem"] { font-size: 1.6875rem !important; font-weight: 600 !important; line-height: 1.25 !important; }'
    // Les quatre réponses deviennent des éléments de la carte : les idées (« J'aimerais… ») peuvent alors s'ouvrir juste
    // sous le bouton choisi, « Pas encore » ou « Un peu », et pas sous les quatre (Arnaud, 13 octobre 2026).
    + ' html[data-edl="questionnaire"] [data-maquette] [id^="a"][style*="border-radius:1.5rem"] { gap: 0.625rem !important; }'
    + ' html[data-edl="questionnaire"] [data-maquette] [id^="a"] > div[style*="grid-template-columns:repeat(4"] { display: contents !important; }'
    + ' html[data-edl="questionnaire"] [data-maquette] [id^="a"] > p { margin-bottom: 0.5rem !important; }'
    + ' html[data-edl="questionnaire"] [data-maquette] [id^="a"] > * { order: 100; }'
    + ' html[data-edl="questionnaire"] [data-maquette] [id^="a"] > p:first-child { order: 0; }'
    + ' html[data-edl="questionnaire"] [data-maquette] [id^="a"] > div > button[aria-pressed]:nth-child(1) { order: 10; }'
    + ' html[data-edl="questionnaire"] [data-maquette] [id^="a"] > div > button[aria-pressed]:nth-child(2) { order: 20; }'
    + ' html[data-edl="questionnaire"] [data-maquette] [id^="a"] > div > button[aria-pressed]:nth-child(3) { order: 30; }'
    + ' html[data-edl="questionnaire"] [data-maquette] [id^="a"] > div > button[aria-pressed]:nth-child(4) { order: 40; }'
    // Des polices plus grandes : réponses, idées, profil.
    + ' html[data-edl="questionnaire"] [data-maquette] [id^="a"] button[aria-pressed] { font-size: 1.125rem !important; min-height: 3.5rem !important; }'
    + ' html[data-edl="questionnaire"] [data-maquette] [id^="a"] div[style*="var(--k14)"] button { font-size: 1.0625rem !important; }'
    + ' html[data-edl="questionnaire"] [data-maquette] [id^="a"] div[style*="var(--k14)"] strong { font-size: 1.1875rem !important; }'
    + ' html[data-edl="questionnaire"] [data-maquette] button[aria-pressed] { font-size: 1.0625rem !important; }'
    + ' }',
  '[data-edl-cache] { display: none !important; }',
  '.edl-hero { flex-wrap: wrap; }',
  // Avec le mantra, la ligne grasse « Vous construisez » est plus large : la carte de l'étude compte ses marges dans sa largeur
  // pour rester à droite (14 octobre 2026).
  '[data-maquette="EDL-Accueil"] .edl-nombre { box-sizing: border-box; }',
  // Le champ « Autre » : dans la DA des réponses, aligné sur le texte des idées.
  '.edl-autre { display: block; width: calc(100% - 2.25rem); box-sizing: border-box; margin: 0.25rem 0 0.5rem 2.25rem; min-height: 3rem; padding: 0.75rem 1rem !important; border: 1.5px solid #A0BFC3 !important; border-radius: 0.75rem !important; background: #FFFFFF !important; font: inherit; font-size: 1rem; color: #0C1011; }',
  '.edl-autre::placeholder { color: #697374; }',
  // Sur ordinateur, les idées sont sur deux colonnes : le champ « Autre » prend toute la largeur sous la liste, en grand
  // (Arnaud, 16 octobre 2026 : « l'encadré Autre est tout petit »).
  'html.edl-phrases .edl-ph > div > .edl-ph-carte .e-open .edl-autre { grid-column: 1 / -1; width: 100%; margin: 0.25rem 0 0.25rem; min-height: 3.25rem; font-size: 1rem !important; }',
  '.edl-autre:focus { outline: none; border-color: #23545B !important; box-shadow: 0 0 0 3px rgba(35,84,91,.15); }',
  '@media (max-width: 1023px) { .edl-autre { width: 100%; margin-left: 0; font-size: 1.0625rem; } }',
  // Le bloc « Greatly, ce n'est pas… » : aplat bleu-vert, titre en deux temps, la liste des dix, le mantra, la pilule à flèche.
  '.edl-pas { display: grid !important; grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr); gap: 3.5rem; align-items: stretch; overflow: hidden; margin: 4.5rem calc(-1 * max(3.5rem, 50vw - 35rem)) -4.5rem; padding: 4.5rem max(3.5rem, calc(50vw - 35rem)); background: #23545B; color: #FFFFFF; box-sizing: border-box; }',
  '.edl-pas__texte { display: flex; flex-direction: column; gap: 1.25rem; align-items: flex-start; }',
  '.edl-pas__sur { font-family: "DM Sans", sans-serif; font-size: 0.8125rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #B4F25C; }',
  '.edl-pas h2 { margin: 0; letter-spacing: -.04em; }',
  '.edl-pas__leger { display: block; font-family: "Instrument Serif", serif; font-style: italic; font-weight: 400; font-size: 3rem; line-height: 1.08; letter-spacing: -.01em; color: #C7D9DC; }',
  '.edl-pas__gras { display: block; font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 4.5rem; line-height: 1; color: #FFFFFF; }',
  '.edl-pas__texte { justify-content: center; }',
  '.edl-pas__carte { align-self: center; justify-self: end; width: 100%; max-width: 32rem; display: flex; flex-direction: column; gap: 1.25rem; padding: 2rem 2rem 1.75rem; border-radius: 1.5rem; background: #FFFFFF; color: #0C1011; box-sizing: border-box; }',
  // Le bloc « Greatly, ce n'est pas… » au ratio du haut de page (Arnaud, 15 octobre 2026 : « fais pareil ») : il remplit l'écran,
  // le texte domine à gauche, la carte reste compacte à droite.
  '@media (min-width: 1101px) {'
    + ' .edl-pas { grid-template-columns: minmax(0, 1fr) minmax(0, 36rem); gap: 3rem; align-items: center; min-height: calc(100svh - 69px); }'
    + ' .edl-pas__texte { gap: 1.5rem; }'
    + ' .edl-pas__leger { font-size: clamp(3.5rem, 5vw, 4.75rem); line-height: 1.02; }'
    + ' .edl-pas__gras { font-size: clamp(3.75rem, 5.6vw, 5.5rem); }'
    + ' .edl-pas__bouton { min-height: 4.75rem !important; font-size: 1.25rem !important; padding-left: 2.25rem !important; }'
    + ' .edl-pas__carte { max-width: 36rem; padding: 1.75rem 2rem 1.5rem; gap: 1rem; }'
    + ' }',
  '.edl-pas__carte-sur { font-family: "DM Sans", sans-serif; font-size: 0.75rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #23545B; }',
  '.edl-pas__points { display: grid; grid-template-columns: repeat(var(--col), minmax(0, 1fr)); gap: 4px; }',
  '.edl-pas__points i { display: block; aspect-ratio: 1; border-radius: 999px; background: #EEF4F5; transition: background-color .35s ease, transform .35s ease; transition-delay: var(--d, 0ms); transform: scale(.85); }',
  '.edl-pas--anime .edl-pas__points i.f { background: #23545B; transform: none; }',
  '.edl-pas--anime .edl-pas__points i.r { background: #B4F25C; transform: none; }',
  '.edl-pas__legende { display: flex; flex-direction: column; gap: 0.5rem; font-family: "DM Sans", sans-serif; font-size: 0.875rem; color: #455051; }',
  '.edl-pas__legende span { display: inline-flex; align-items: center; gap: 0.625rem; }',
  '.edl-pas__legende i { width: 0.625rem; height: 0.625rem; border-radius: 999px; flex-shrink: 0; } .edl-pas__legende i.f { background: #23545B; } .edl-pas__legende i.r { background: #B4F25C; }',
  '@media (prefers-reduced-motion: reduce) { .edl-pas__points i { transition: none !important; } }',
  '.edl-pas__mantra { margin: 0; line-height: 1.04; }',
  '.edl-pas__m1 { display: block; font-family: "Instrument Serif", serif; font-style: italic; font-weight: 400; font-size: 2.75rem; letter-spacing: -.01em; color: #C7D9DC; }',
  '.edl-pas__m2 { display: block; font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 3.25rem; letter-spacing: -.04em; color: #FFFFFF; }',
  '.edl-pas__surligne { background: linear-gradient(transparent 62%, #B4F25C 62%, #B4F25C 92%, transparent 92%); -webkit-box-decoration-break: clone; box-decoration-break: clone; }',
  '@media (max-width: 1100px) { .edl-pas { grid-template-columns: 1fr; gap: 2rem; } }',
  '.edl-pas__bouton { display: inline-flex; align-items: center; gap: 0.875rem; min-height: 4.25rem; padding: 0 0.6875rem 0 1.875rem; border-radius: 62.4375rem; background: #F4F2EA; color: #0C1011; font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 1.125rem; letter-spacing: -.01em; text-decoration: none; white-space: nowrap; box-sizing: border-box; }',
  '.edl-pas__rond { display: inline-flex; align-items: center; justify-content: center; width: 2.875rem; height: 2.875rem; border-radius: 62.4375rem; background: #B4F25C; flex-shrink: 0; transition: transform .2s ease; }',
  '.edl-pas__rond svg { width: 1.3125rem; height: 1.3125rem; display: block; }',
  '.edl-pas__bouton:hover .edl-pas__rond { transform: translateX(3px); }',
  '.edl-pas--mobile { display: block !important; margin: 40px -20px -48px; padding: 48px 20px; }',
  '.edl-pas--mobile .edl-pas__carte { margin-top: 28px; padding: 22px 20px 20px; } .edl-pas--mobile .edl-pas__points { gap: 3px; }',
  '@media (max-width: 1100px) { .edl-pas__carte { justify-self: start; } }',
  '.edl-pas--mobile .edl-pas__leger { font-size: 28px; } .edl-pas--mobile .edl-pas__gras { font-size: 34px; letter-spacing: -.045em; }',
  '.edl-pas--mobile .edl-pas__m1 { font-size: 24px; } .edl-pas--mobile .edl-pas__m2 { font-size: 28px; } .edl-pas--mobile .edl-pas__droite { margin-top: 24px; gap: 24px; } .edl-pas--mobile .edl-pas__bouton { min-height: 3.5rem; font-size: 1rem; padding-left: 1.375rem; white-space: normal; }',

  '[data-maquette="EDL-Accueil"] .edl-signature { max-width: 40rem; }',
  // Des lignes équilibrées : pas de mot seul en fin de phrase (« entreprise. », « plusieurs. »).
  '.edl-signature, html[data-edl="accueil"] [data-maquette] section:first-of-type h1 > span:first-child { text-wrap: balance; }',
  '.edl-signature { margin: 0.25rem 0 0; font-family: "Bricolage Grotesque", sans-serif; font-weight: 500; font-size: 1.25rem; line-height: 1.35; color: #23545B; max-width: 34rem; }',
  '[data-maquette="MEtatDesLieux"] .edl-signature { font-size: 1.0625rem; margin: 12px 0 0; }',
  '.edl-frise { flex: 1 1 100%; list-style: none; margin: 0.5rem 0 0; padding: 1.75rem 2rem; border-radius: 1.5rem; background: #FFFFFF; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2rem; position: relative; animation: edlMonte .8s .15s cubic-bezier(.2,.7,.2,1) both; }',
  '.edl-frise li { position: relative; display: flex; flex-direction: column; gap: 0.375rem; }',
  '.edl-frise li:not(:last-child)::after { content: ""; position: absolute; top: 1rem; left: 2.75rem; right: -1.25rem; height: 2px; background: #DCE8EA; }',
  '.edl-frise__num { width: 2rem; height: 2rem; border-radius: 999px; background: #23545B; color: #FFFFFF; display: inline-flex; align-items: center; justify-content: center; font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 1rem; margin-bottom: 0.5rem; }',
  '.edl-frise li:last-child .edl-frise__num { background: #B4F25C; color: #0C1011; }',
  '.edl-frise__titre { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 1.25rem; letter-spacing: -0.02em; color: #0C1011; }',
  '.edl-frise__texte { font-size: 1rem; line-height: 1.45; color: #455051; }',
  // Sous le titre, la frise ne fait plus « posée » (Arnaud, 15 octobre 2026) : sans cadre ni fond, elle se lit comme la suite du
  // titre ; un trait continu relie les trois étapes, les numéros sont de grands chiffres légers.
  '.edl-frise--gains { margin-top: 2.5rem; padding: 0 !important; border-radius: 0; background: none; animation: none; gap: 2.5rem; }',
  '.edl-frise--gains::before { content: ""; position: absolute; top: 1.75rem; left: 0; right: 0; height: 2px; background: #DCE8EA; }',
  '.edl-frise--gains li:not(:last-child)::after { display: none; }',
  '.edl-frise--gains .edl-frise__num { position: relative; width: 3.5rem; height: 3.5rem; margin-bottom: 1rem; font-size: 1.375rem; box-shadow: 0 0 0 0.5rem #FFFFFF; }',
  '.edl-frise--gains .edl-frise__titre { font-size: 1.5rem; }',
  '.edl-frise--gains .edl-frise__texte { font-size: 1.0625rem; max-width: 20rem; }',
  '.edl-frise--gains.edl-frise--mobile { gap: 1.5rem; }',
  // Le pied de page : le bouton passe sous le texte, à gauche, pour laisser voir la montagne à droite (Arnaud, 15 octobre 2026).
  '#rdv > div:not([style*="position:absolute"]) { flex-direction: column; align-items: flex-start !important; justify-content: flex-start !important; gap: 2rem !important; }',
  '#rdv > div:not([style*="position:absolute"]) > div:last-child { padding-bottom: 4.5rem !important; }',
  // La phrase sur l'anonymat, retirée du pied (Arnaud, 15 octobre 2026 : « pas utile ») ; la politique de confidentialité reste dans la barre du bas.
  '#rdv h2 + p { display: none !important; }',
  // Le logo GREATLY du pied, retiré aussi (Arnaud, 15 octobre 2026) : l'en-tête le porte déjà.
  '.g-pied2 :has(> span[style*="letter-spacing:.28em"]) { display: none !important; }',
  // « Vos réponses sont anonymes… » sous le questionnaire, retiré (Arnaud, 15 octobre 2026 : « déjà dans le footer »).
  'html[data-edl="questionnaire"] main + section:has(a[href*="confidentialite"]) { display: none !important; }',
  // Le profil en étapes (ordinateur) : l'introduction à gauche, une question à la fois à droite, sans défilement en 1200 × 800.
  'html.edl-pas-a-pas [data-maquette] div[style*="min-height:114.375rem"] { min-height: 100svh !important; }',
  'html.edl-pas-a-pas .edl-profil { max-width: 70rem !important; display: grid !important; grid-template-columns: minmax(0, 0.75fr) minmax(0, 1.25fr); column-gap: 3.5rem; align-items: start; padding: 1.75rem 0 1.5rem !important; }',
  'html.edl-pas-a-pas .edl-profil > div:first-child { grid-column: 1; grid-row: 1; align-self: stretch; min-height: 21rem; }',
  'html.edl-pas-a-pas .edl-profil > div:nth-child(2) { grid-column: 2; grid-row: 1; align-self: stretch; margin-top: 0 !important; justify-content: flex-start; }',
  'html.edl-pas-a-pas .edl-profil > div:nth-child(n+3) { grid-column: 2; grid-row: 2; margin-top: 1.5rem !important; }',
  'html.edl-pas-a-pas .edl-etape-cachee { display: none !important; }',
  // La mention « Facultatif » disparaît : chaque question est obligatoire.
  'html.edl-pas-a-pas .edl-profil > div:nth-child(2) h2 + span { display: none !important; }',
  // Plus de « Continuer » pendant les questions : le passage est automatique (Arnaud, 15 octobre 2026). Il reste « Retour ».
  'html.edl-pas-a-pas .edl-profil > div:nth-child(n+3) .edl-cta-tourne { display: none !important; }',
  '.edl-merci[hidden], .edl-passer[hidden] { display: none !important; }',
  '.edl-merci { display: flex; flex-direction: column; align-items: flex-start; gap: 1rem; animation: edlEtape .5s cubic-bezier(.2,.7,.2,1) both; }',
  '.edl-merci__titre { margin: 0; line-height: 1.05; }',
  '.edl-merci__titre .leger { display: block; font-family: "Instrument Serif", serif; font-style: italic; font-size: 2.5rem; color: #0C1011; }',
  '.edl-merci__titre .gras { display: block; font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 2.25rem; letter-spacing: -.03em; color: #0C1011; }',
  '.edl-merci__texte { margin: 0; font-size: 1.0625rem; line-height: 1.55; color: #455051; max-width: 28rem; }',
  '.edl-merci__cta { display: inline-flex; align-items: center; gap: 0.875rem; min-height: 4rem; margin-top: 0.75rem; padding: 0 0.625rem 0 1.75rem; border: 0; border-radius: 999px; background: #23545B; color: #FFFFFF; font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 1.125rem; cursor: pointer; }',
  '.edl-merci__rond { display: inline-flex; align-items: center; justify-content: center; width: 2.75rem; height: 2.75rem; border-radius: 999px; background: #B4F25C; }',
  '.edl-merci__rond svg { width: 1.25rem; height: 1.25rem; transform-origin: 50% 50%; animation: edlTourne 4s ease-in-out 1.5s infinite; }',
  '.edl-passer { align-self: flex-start; margin-top: 0.5rem; padding: 0; border: 0; background: none; font: 500 0.9375rem "DM Sans", sans-serif; color: #455051; text-decoration: underline; text-underline-offset: 0.25rem; cursor: pointer; }',
  // Des colonnes égales selon la question, le texte aligné pareil partout, jamais sur deux lignes ; la question en plus grand
  // (Arnaud, 15 octobre 2026 : « aligner les textes, hauteur, largeur »).
  'html.edl-pas-a-pas .edl-profil > div:nth-child(2) h2 { font-family: "Bricolage Grotesque", sans-serif !important; font-size: 1.625rem !important; font-weight: 800 !important; letter-spacing: -.02em; }',
  'html.edl-pas-a-pas .edl-profil > div:nth-child(2) > div > div:has(> h2) { margin-bottom: 0.5rem; }',
  'html.edl-pas-a-pas .edl-profil > div:nth-child(2) div[style*="display:grid"] { gap: 0.625rem !important; }',
  'html.edl-pas-a-pas .edl-profil > div:nth-child(2) div[style*="display:grid"] > button { position: relative; justify-content: center !important; text-align: center !important; white-space: nowrap; min-height: 3.25rem !important; padding: 0.375rem 1.75rem !important; }',
  // Le texte des réponses centré en hauteur et en largeur ; le point de sélection se place à gauche sans le décaler.
  'html.edl-pas-a-pas .edl-profil > div:nth-child(2) div[style*="display:grid"] > button > span[aria-hidden="true"] { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); }',
  'html.edl-pas-a-pas .edl-profil > div:nth-child(2) > div:first-child div[style*="display:grid"] { grid-template-columns: 1fr !important; }',
  'html.edl-pas-a-pas .edl-profil > div:nth-child(2) > div:not(:first-child):not(:has(input)) div[style*="display:grid"]:has(> :nth-child(3):last-child) { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }',
  'html.edl-pas-a-pas .edl-profil > div:nth-child(2) div[style*="display:grid"]:has(> :nth-child(4):last-child) { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }',
  'html.edl-pas-a-pas .edl-profil > div:nth-child(2) div[style*="display:grid"]:has(> :nth-child(6):last-child) { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }',
  // Des pastilles à la largeur de leur texte, jamais sur deux lignes (Arnaud, 15 octobre 2026), et une carte plus serrée pour
  // que le secteur tienne aussi sans défiler.
  'html.edl-pas-a-pas .edl-profil > div:nth-child(2) { padding: 2rem 2.25rem !important; }',
  // Le secteur garde ses deux colonnes (des intitulés longs), en un peu plus petit pour tenir sur une ligne.
  'html.edl-pas-a-pas .edl-profil > div:nth-child(2) > div:has(input) div[style*="display:grid"] { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)); }',
  'html.edl-pas-a-pas .edl-profil > div:nth-child(2) > div:has(input) div[style*="display:grid"] > button { font-size: 0.8125rem !important; min-height: 2.625rem !important; padding: 0 0.75rem !important; }',
  'html.edl-pas-a-pas .edl-profil > div:nth-child(2) > div:has(input) div[style*="display:grid"] { gap: 0.5rem !important; }',
  // « Voir tous les secteurs » : la carte s'agrandit et montre les 20 secteurs, sans défilement interne ; la recherche reste en
  // haut (points UX du 16 octobre 2026, qui remplacent la liste défilante du 15).
  'html.edl-pas-a-pas .edl-profil > div:nth-child(2) > div:has(input) div[style*="display:grid"]:has(> :nth-child(9)) > button { font-size: 0.8125rem !important; }',
  'html.edl-pas-a-pas .edl-profil > div:nth-child(2) > div:not(.edl-etape-cachee) { animation: edlEtape .5s cubic-bezier(.2,.7,.2,1) both; }',
  'html.edl-pas-a-pas .edl-etape-sortie { opacity: 0; transform: translateX(-10px); transition: opacity .28s ease, transform .28s ease; }',
  '@keyframes edlEtape { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: none; } }',
  '.edl-etape-manque { animation: edlSecoue .4s ease !important; }',
  '@keyframes edlSecoue { 0%, 100% { transform: none; } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }',
  '.edl-progres { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.5rem; }',
  '.edl-progres__texte { font-family: "DM Sans", sans-serif; font-size: 0.8125rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #23545B; }',
  '.edl-progres__points { display: flex; gap: 0.5rem; }',
  '.edl-progres__points i { width: 2.5rem; height: 0.375rem; border-radius: 999px; background: #DCE8EA; transition: background .25s ease; }',
  '.edl-progres__points i.fait { background: #23545B; }',
  '.edl-progres__points i.actif { background: #B4F25C; }',
  '@media (prefers-reduced-motion: reduce) { html.edl-pas-a-pas .edl-profil > div:nth-child(2) > div, .edl-etape-manque { animation: none !important; } }',
  // Le pied du questionnaire, ramené aux trois quarts puis encore de moitié (Arnaud, 15 octobre 2026).
  'html[data-edl="questionnaire"] footer.g-pied2 { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }',
  'html[data-edl="questionnaire"] footer.g-pied2 br, html[data-edl="questionnaire"] footer.g-pied2 a[href*="confidentialite"] { display: none !important; }',
  'html[data-edl="questionnaire"] footer.g-pied2 > div:last-child { margin-top: 0 !important; }',
  '.edl-retour { font-size: 0.9375rem !important; font-weight: 500 !important; color: #455051 !important; min-height: 0 !important; text-decoration-thickness: 1px !important; }',
  // La flèche de « Continuer » tourne légèrement, de temps en temps, et au survol (Arnaud, 15 octobre 2026).
  '.edl-cta-tourne svg { transform-origin: 50% 50%; animation: edlTourne 4s ease-in-out 1.5s infinite; }',
  '.edl-cta-tourne:hover svg { animation: none; transform: rotate(-10deg); transition: transform .25s ease; }',
  '@keyframes edlTourne { 0%, 82%, 100% { transform: rotate(0); } 88% { transform: rotate(-10deg); } 94% { transform: rotate(3deg); } }',
  '@media (prefers-reduced-motion: reduce) { .edl-cta-tourne svg { animation: none; } }',
  // Les 16 phrases en étapes (ordinateur) : la colonne « Votre avancée » laisse la place ; à gauche l'étape, le thème et son
  // « pourquoi » ; à droite la phrase et ses réponses ; le reste se cache.
  'html.edl-phrases [data-maquette] div[style*="min-height:114.375rem"] { min-height: 100svh !important; }',
  'html.edl-phrases [data-maquette] div[style*="grid-template-columns:16.75rem"] { display: block !important; padding: 1.75rem 0 1.5rem !important; }',
  'html.edl-phrases [data-maquette] div[style*="grid-template-columns:16.75rem"] > aside { display: none !important; }',
  'html.edl-phrases .edl-ph { display: grid !important; grid-template-columns: minmax(0, 0.75fr) minmax(0, 1.25fr); grid-template-rows: auto auto 1fr auto; column-gap: 3.5rem; align-items: start; }',
  // Les idées « J'aimerais… » s'ouvrent sous les réponses, en fondu ; la carte se resserre pour que tout tienne à l'écran,
  // sans défiler. Les réponses passent en ligne de quatre au-dessus du bloc bleu (Arnaud, 15 octobre 2026 ; essayé en colonne
  // le 16 au matin, Arnaud préfère la ligne de quatre).
  'html.edl-phrases .edl-ph > div > .edl-ph-carte .e-open { animation: edlOuvre .45s ease both; }',
  '@keyframes edlOuvre { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }',
  'html.edl-phrases .edl-ph > div > .edl-ph-carte:has(.e-open) { gap: 1.25rem; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-carte:has(.e-open) .e-opt { min-height: clamp(2.5rem, 6vh, 3.25rem) !important; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-carte:has(.e-open) > [role="group"]:not(.e-open) { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; gap: 0.5rem !important; }',
  // En ligne, les pastilles sont étroites : la couleur suffit à montrer la réponse choisie, la coche se retire.
  'html.edl-phrases .edl-ph > div > .edl-ph-carte:has(.e-open) .e-opt > svg { display: none !important; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-carte:has(.e-open) .e-opt { padding: 0.375rem 0.5rem !important; font-size: 0.9375rem !important; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-carte:has(.e-open) { padding-top: clamp(1.25rem, 3vh, 2rem) !important; padding-bottom: clamp(1.25rem, 3vh, 2rem) !important; gap: clamp(0.75rem, 2vh, 1.25rem) !important; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-carte:has(.e-open) > p:first-child { font-size: clamp(1.375rem, 3.2vh, 2rem) !important; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-carte .e-open { margin-top: 0 !important; padding: clamp(1rem, 2.6vh, 1.5rem) 1.75rem clamp(0.875rem, 2.2vh, 1.25rem) !important; gap: clamp(0.5rem, 1.6vh, 0.875rem) !important; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-carte .e-open > div:first-of-type { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: clamp(0.125rem, 0.8vh, 0.375rem) 2rem !important; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-carte .e-open .e-row { min-height: clamp(2.25rem, 6vh, 3rem) !important; margin: 0 !important; padding: 0.25rem 0 !important; gap: 0.75rem !important; font-size: 0.9375rem !important; line-height: 1.3 !important; align-items: center !important; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-carte .e-open > p { display: flex !important; justify-content: space-between; align-items: baseline; margin: 0 !important; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-carte .e-open > div:last-child { display: flex !important; justify-content: flex-end; }',
  '@media (prefers-reduced-motion: reduce) { html.edl-phrases .edl-ph > div > .edl-ph-carte .e-open { animation: none; } }',
  'html.edl-phrases .edl-ph > div:not(:first-child):not(.edl-merci2):not(.edl-ph-nav):not(.edl-progres) { display: contents !important; }',
  'html.edl-phrases .edl-ph > div:not(:first-child):not(.edl-merci2):not(.edl-ph-nav):not(.edl-progres) > :not(.edl-ph-carte):not(.edl-ph-tete) { display: none !important; }',
  'html.edl-phrases .edl-ph > div:first-child, html.edl-phrases .edl-ph > .edl-ph-nav, html.edl-phrases .edl-ph > .edl-merci2:not([hidden]) { display: flex !important; }',
  'html.edl-phrases .edl-ph > div:first-child { grid-column: 1; grid-row: 1; flex-direction: column; gap: 0.5rem; }',
  'html.edl-phrases .edl-ph > div:first-child > * { display: revert !important; }',
  'html.edl-phrases .edl-ph > div:first-child > :not(:first-child) { display: none !important; }',
  'html.edl-phrases.edl-phrases-fin .edl-ph > div:first-child > h1 { display: revert !important; margin-top: 0.75rem !important; }',
  // Plus de « Phrase X sur 16 » : les ronds des thèmes suffisent (Arnaud, 15 octobre 2026).
  'html.edl-phrases .edl-ph > .edl-progres { display: none !important; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-tete { display: flex !important; grid-column: 1; grid-row: 2; margin-top: 1.25rem; animation: edlEtape .5s cubic-bezier(.2,.7,.2,1) both; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-tete h2 { font-size: clamp(2.25rem, 3.4vw, 3rem) !important; line-height: 1.02 !important; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-carte { display: flex !important; flex-direction: column; justify-content: flex-start; gap: 1.5rem; grid-column: 2; grid-row: 1 / span 3; align-self: stretch; min-height: 22rem; padding: 2.25rem 2.5rem !important; scroll-margin-top: 0 !important; animation: edlEtape .5s cubic-bezier(.2,.7,.2,1) both; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-carte > p:first-child { font-family: "Bricolage Grotesque", sans-serif !important; font-size: 1.625rem !important; font-weight: 800 !important; line-height: 1.2 !important; letter-spacing: -.02em; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-carte > [role="group"]:not(.e-open) { display: grid !important; grid-template-columns: 1fr !important; gap: 0.5rem !important; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-carte .e-opt { position: relative; justify-content: center !important; text-align: center !important; white-space: nowrap; min-height: 2.875rem !important; padding: 0.375rem 1.75rem !important; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-carte .e-opt > svg { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); }',
  // Fenêtres très basses : tout se resserre encore, toujours sans défiler.
  '@media (max-height: 590px) { html.edl-phrases .edl-ph > div > .edl-ph-carte { padding-top: 1.25rem !important; padding-bottom: 1.25rem !important; gap: 0.875rem !important; } html.edl-phrases .edl-ph > div > .edl-ph-carte > p:first-child { font-size: 1.375rem !important; } html.edl-phrases .edl-ph > div > .edl-ph-carte .e-open .e-row { min-height: 2rem !important; } html.edl-phrases [data-maquette] div[style*="grid-template-columns:16.75rem"] { padding-top: 1rem !important; } }',
  'html.edl-phrases .edl-ph > div > .edl-ph-carte .e-open > div:first-of-type { display: grid !important; }',
  'html.edl-phrases .edl-ph > .edl-ph-nav { grid-column: 2; grid-row: 4; margin-top: 1.25rem; padding: 0 !important; border: 0 !important; justify-content: flex-start !important; }',
  'html.edl-phrases .edl-ph > .edl-ph-nav :is(a, button):not(.edl-retour) { display: none !important; }',
  'html.edl-phrases .edl-ph > .edl-ph-nav .edl-retour { display: inline-flex !important; }',
  'html.edl-phrases .edl-ph > .edl-merci2 { grid-column: 2; grid-row: 1 / span 3; flex-direction: column; align-items: flex-start; gap: 1rem; min-height: 22rem; padding: 2.25rem 2.5rem; border-radius: 1.5rem; border: 1px solid #DCE8EA; background: #FFFFFF; box-sizing: border-box; animation: edlEtape .5s cubic-bezier(.2,.7,.2,1) both; }',
  'html.edl-phrases .edl-ph > .edl-merci2[hidden] { display: none !important; }',
  '.edl-progres--phrases .edl-progres__points { gap: 0.25rem; }',
  '.edl-progres--phrases .edl-progres__points i { width: 1rem; }',
  '.edl-frise3 { display: flex; align-items: flex-start; margin-bottom: 0.25rem; }',
  '.edl-frise3__pas { position: relative; display: flex; flex: 1; max-width: 3.25rem; }',
  '.edl-frise3__pas i { position: relative; z-index: 1; width: 0.875rem; height: 0.875rem; border-radius: 999px; background: #DCE8EA; box-shadow: 0 0 0 4px #FFFFFF; }',
  '.edl-frise3__pas:not(:last-child)::after { content: ""; position: absolute; top: 0.375rem; left: 0.875rem; right: 0; height: 2px; background: #DCE8EA; }',
  '.edl-frise3__pas.fait i, .edl-frise3__pas.fait::after { background: #23545B !important; }',
  '.edl-frise3__pas.actif i { background: #B4F25C; box-shadow: 0 0 0 4px #FFFFFF, 0 0 0 5.5px #23545B; }',
  '.edl-frise3__pas:last-child { flex: 0 0 auto; }',
  'html.edl-phrases .edl-ph > div:first-child > .edl-frise3 { display: flex !important; order: -1; margin-bottom: 0.75rem; }',
  'html.edl-phrases .edl-ph > div:first-child > :first-child:not(.edl-frise3) { display: none !important; }',
  // Les 16 phrases dans la DA de l'accueil (proposition du 15 octobre 2026), sur fond blanc (Arnaud : « je n'aime pas le fond gris, mais j'adore le fonctionnement ») ; le texte
  // qui domine à gauche (les ronds des thèmes, le thème en titre en deux temps, son « pourquoi » en chapô), la carte blanche à
  // droite avec la phrase en grand.
  'html.edl-phrases main > section:has(.edl-ph) { background: #FFFFFF; min-height: calc(100svh - var(--edl-reste, 105px)); display: flex; align-items: flex-start; box-sizing: border-box; }',
  'html.edl-phrases main > section:has(.edl-ph) > div { width: 100%; padding: clamp(1.25rem, 4vh, 2.5rem) 0 !important; }',
  // Tout reste fixe d'une question à l'autre (Arnaud, 15 octobre 2026) : la frise, le thème et le haut de la carte ne bougent plus
  // quand la carte s'allonge ; elle grandit vers le bas.
  'html.edl-phrases .edl-ph { grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.25fr) !important; column-gap: 3.5rem !important; align-items: start !important; grid-template-rows: auto auto auto !important; }',
  'html.edl-phrases .edl-frise3__pas i { box-shadow: 0 0 0 4px #FFFFFF; background: #C7D9DC; }',
  'html.edl-phrases .edl-frise3__pas:not(:last-child)::after { background: #C7D9DC; }',
  'html.edl-phrases .edl-frise3__pas.actif i { box-shadow: 0 0 0 4px #FFFFFF, 0 0 0 5.5px #23545B; background: #B4F25C; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-tete { align-self: start; gap: 1.25rem !important; margin-top: 1.5rem !important; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-tete { height: 19rem; overflow: hidden; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-tete h2 { height: 9.75rem; overflow: hidden; flex-shrink: 0; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-tete p { max-height: 7.5rem; overflow: hidden; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-tete h2 { margin: 0 !important; font-size: clamp(2.75rem, 4.4vw, 4rem) !important; line-height: 1 !important; letter-spacing: -.04em !important; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-tete h2::before { content: attr(data-edl-theme); display: block; margin-bottom: 0.25rem; font-family: "Instrument Serif", serif; font-style: italic; font-weight: 400; font-size: clamp(1.75rem, 2.6vw, 2.5rem); letter-spacing: -.01em; color: #23545B; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-tete p { font-family: "Bricolage Grotesque", sans-serif !important; font-weight: 300 !important; font-size: clamp(1.0625rem, 1.5vw, 1.3125rem) !important; line-height: 1.5 !important; color: #455051 !important; max-width: 30rem; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-tete p strong, html.edl-phrases .edl-ph > div > .edl-ph-tete p > span:first-child { display: block; margin-bottom: 0.5rem; font-family: "DM Sans", sans-serif; font-weight: 700; font-size: 0.75rem; letter-spacing: .14em; text-transform: uppercase; color: #23545B; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-carte, html.edl-phrases .edl-ph > .edl-merci2 { border: 1px solid #DCE8EA !important; border-radius: 1.75rem !important; background: #FFFFFF !important; box-shadow: none !important; padding: clamp(1.75rem, 4vh, 2.75rem) clamp(2rem, 3vw, 2.75rem) !important; min-height: 0 !important; align-self: start !important; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-carte > p:first-child { font-size: clamp(1.625rem, 2.4vw, 2rem) !important; line-height: 1.15 !important; letter-spacing: -.025em !important; }',
  'html.edl-phrases .edl-ph > div > .edl-ph-carte .e-opt { min-height: 3.25rem !important; font-size: 1.0625rem !important; border-color: #C7D9DC !important; }',
  'html.edl-phrases .edl-ph > .edl-ph-nav { align-self: start; }',
  // Pas de césure dans les titres, les boutons et les réponses (Bringhurst ; Lexique IN) ; titres équilibrés, paragraphes soignés.
  '[data-maquette] :is(h1, h2, h3, button, .e-opt) { hyphens: manual !important; -webkit-hyphens: manual !important; }',
  // L'équilibrage des lignes seulement sur téléphone et tablette : l'ordinateur validé garde ses coupures.
  '@media (max-width: 1100px) { [data-maquette] :is(h1, h2, h3, button, .e-opt) { text-wrap: balance; } [data-maquette] p { text-wrap: pretty; } }',
  // ----------------------------------------------------------- téléphone et tablette (responsive, 16 octobre 2026)
  // Piste A « Respiration », retenue par le relecteur, avec la lumière de la piste C : une phrase posée au tiers supérieur, les
  // réponses en grandes cartes dans la zone du pouce (Steven Hoober), la progression en segments égaux (un par thème), le thème
  // en italique, le fond qui s'éclaircit à mesure qu'on avance ; les idées « J'aimerais… » dans un panneau qui monte du bas.
  '@media (max-width: 1100px) {'
    // Les 16 phrases.
    + ' html.edl-tel.edl-phrases main > section:has(.edl-ph) { display: block; padding: 0 var(--gouttiere, 1rem) !important; min-height: calc(100svh - var(--edl-reste, 105px)); background: linear-gradient(180deg, color-mix(in srgb, #EEF4F5 calc((1 - var(--avance, 0)) * 100%), #FFFFFF) 0%, #FFFFFF 55%) !important; }'
    + ' html.edl-tel.edl-phrases main > section:has(.edl-ph) > div { padding: 0 !important; max-width: 34rem !important; margin: 0 auto !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph { align-items: stretch !important; display: flex !important; flex-direction: column !important; min-height: calc(100svh - var(--edl-reste, 105px)); padding: .75rem 0 max(env(safe-area-inset-bottom), 1.25rem) !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > .edl-ph-nav { order: -2; margin: 0 0 .5rem !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div:first-child { order: -1; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-tete { order: 1; height: auto !important; margin-top: 1rem !important; gap: .5rem !important; animation: edlEtape var(--mvt-long, .4s) var(--courbe-douce, ease) both; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte { order: 2; flex: 1; display: flex !important; flex-direction: column; gap: 0 !important; min-height: 0 !important; margin-top: .75rem; padding: 0 !important; border: 0 !important; background: transparent !important; animation: edlEtape var(--mvt-long, .4s) var(--courbe-douce, ease) both; animation-delay: var(--decalage, 60ms); }'
    + ' html.edl-tel.edl-phrases .edl-ph > .edl-merci2:not([hidden]) { order: 2; flex: 1; margin-top: clamp(1rem, 6svh, 3rem); border: 0 !important; padding: 0 !important; background: transparent !important; }'
    // La frise devient huit segments égaux.
    + ' html.edl-tel.edl-phrases .edl-frise3 { display: flex !important; gap: 4px; width: 100%; margin: 0 !important; }'
    + ' html.edl-tel.edl-phrases .edl-frise3__pas { flex: 1 !important; max-width: none !important; height: 4px; border-radius: 999px; background: #DCE8EA; overflow: hidden; }'
    + ' html.edl-tel.edl-phrases .edl-frise3__pas::after, html.edl-tel.edl-phrases .edl-frise3__pas::before { display: none !important; }'
    + ' html.edl-tel.edl-phrases .edl-frise3__pas i { display: block; width: 0 !important; height: 100% !important; border-radius: inherit; box-shadow: none !important; background: #23545B !important; transition: width var(--mvt-long, .4s) var(--courbe-douce, ease); }'
    + ' html.edl-tel.edl-phrases .edl-frise3__pas.fait i { width: 100% !important; }'
    + ' html.edl-tel.edl-phrases .edl-frise3__pas.actif i { width: calc(var(--p-theme, 0) * 100%) !important; min-width: 6px; }'
    // Le thème en italique, le « pourquoi » en petit.
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-tete h2 { height: auto !important; font-family: "Instrument Serif", serif !important; font-style: italic !important; font-weight: 400 !important; font-size: var(--pas-2, 1.5rem) !important; line-height: 1.15 !important; letter-spacing: -.01em !important; color: #23545B !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-tete h2::before { display: none !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-tete p { max-height: none !important; font-family: "DM Sans", sans-serif !important; font-weight: 400 !important; font-size: var(--pas-m1, .875rem) !important; line-height: 1.5 !important; color: #455051 !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-tete p > span:first-child, html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-tete p strong { display: none !important; }'
    // La phrase, puis les réponses en bas, dans la zone du pouce.
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte > p:first-child { margin: 0 !important; font-family: "Bricolage Grotesque", sans-serif !important; font-weight: 800 !important; font-size: var(--pas-3, 1.75rem) !important; line-height: 1.15 !important; letter-spacing: -.025em !important; text-wrap: balance; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte > [role="group"]:not(.e-open) { margin-top: auto !important; padding-top: .5rem; display: grid !important; grid-template-columns: 1fr !important; gap: .5rem !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte:has(.e-open) > [role="group"]:not(.e-open) { grid-template-columns: 1fr !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-opt { order: 0 !important; min-height: 3.25rem !important; padding: .375rem 1.25rem !important; border: 1.5px solid #6E979C !important; border-radius: 1.125rem !important; background: #FFFFFF !important; font-size: var(--pas-0, 1rem) !important; transition: transform var(--mvt-court, .15s) var(--courbe-douce, ease), background var(--mvt-moyen, .25s), color var(--mvt-moyen, .25s); }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-opt:active { transform: scale(.975); }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-opt[aria-pressed="true"] { background: #23545B !important; border-color: #23545B !important; color: #FFFFFF !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-opt[aria-pressed="true"] svg { stroke: #FFFFFF !important; display: block !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-opt[aria-pressed="false"] { opacity: 1; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte:has(.e-opt[aria-pressed="true"]) .e-opt[aria-pressed="false"] { opacity: .5; }'
    // Les idées « J'aimerais… » : un panneau qui monte du bas, sur un voile clair.
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-open { position: fixed !important; left: 0; right: 0; bottom: 0; z-index: 60; max-height: 78svh; overflow: auto; margin: 0 !important; padding: 1.25rem var(--gouttiere, 1rem) max(env(safe-area-inset-bottom), 1rem) !important; border: 0 !important; border-radius: 1.5rem 1.5rem 0 0 !important; background: #FFFFFF !important; box-shadow: 0 0 0 100vmax rgba(238, 244, 245, .78), 0 -1rem 3rem rgba(14, 42, 47, .14); animation: edlFeuille var(--mvt-long, .4s) var(--courbe-douce, ease) both !important; }'

    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-open > p { display: flex !important; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: .25rem 1rem; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-open > p::before { content: attr(data-choix); flex-basis: 100%; font: 700 .75rem "DM Sans", sans-serif; letter-spacing: .12em; text-transform: uppercase; color: #23545B; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-open > p strong { font-family: "Bricolage Grotesque", sans-serif; font-size: var(--pas-1, 1.25rem); }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-open > p span { font-size: var(--pas-m1, .875rem) !important; color: #455051 !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-open > div:first-of-type { display: flex !important; flex-direction: column; gap: 0 !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-open .e-row { min-height: 2.75rem !important; padding: .375rem 0 !important; margin: 0 !important; font-size: var(--pas-0, 1rem) !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-open .e-row > span:first-child { border-color: #6E979C !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-open > div:last-child { display: block !important; margin-top: .75rem; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-open .e-lien { display: flex !important; align-items: center; justify-content: center; width: 100%; min-height: 3.5rem; border-radius: 999px !important; background: #23545B !important; color: #FFFFFF !important; text-decoration: none !important; font: 800 var(--pas-0, 1rem) "Bricolage Grotesque", sans-serif !important; }'
    // « Retour » en haut à gauche.
    + ' html.edl-tel.edl-phrases .edl-ph > .edl-ph-nav .edl-retour { font-size: .875rem !important; }'
    // Le profil, même principe.
    + ' html.edl-tel.edl-pas-a-pas [data-maquette] div[style*="min-height:114.375rem"] { min-height: 0 !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil { display: flex !important; flex-direction: column !important; min-height: calc(100svh - var(--edl-reste, 105px)); padding: .75rem 0 max(env(safe-area-inset-bottom), 1.25rem) !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:first-child { min-height: 0 !important; gap: .5rem !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:first-child h1 { font-size: var(--pas-4, 2rem) !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:first-child h1 span { font-size: 1em !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:first-child > p { font-size: var(--pas-0, 1rem) !important; margin: 0 !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-progres { order: -1; margin: 0 0 .75rem !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-progres__texte { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }'
    + ' html.edl-tel.edl-pas-a-pas .edl-progres__points { gap: 4px; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-progres__points i { flex: 1; width: auto !important; height: 4px !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-progres__points i.actif { background: #23545B !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) { flex: 1; display: flex !important; flex-direction: column; margin-top: clamp(1.25rem, 5svh, 2.5rem) !important; padding: 0 !important; border: 0 !important; background: transparent !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) > div:not(.edl-etape-cachee):not(.edl-merci):not(.edl-passer) { flex: 1; display: flex !important; flex-direction: column; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) h2 { font-size: var(--pas-3, 1.75rem) !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) div[style*="display:grid"] { margin-top: auto; padding-top: 1.5rem; grid-template-columns: 1fr !important; gap: .625rem !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) > div:has(input) div[style*="display:grid"] { margin-top: 1rem; padding-top: 0; grid-template-columns: 1fr !important; gap: .5rem !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) div[style*="display:grid"] > button { min-height: 3.5rem !important; border: 1.5px solid #6E979C !important; border-radius: 1.125rem !important; white-space: normal !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) > div:has(input) div[style*="display:grid"] > button { min-height: 2.875rem !important; font-size: .9375rem !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(n+3) { margin-top: 1rem !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-merci { flex: 1; justify-content: center; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-merci__cta { width: 100%; justify-content: space-between; }'
    + ' }',
  // Écrans bas (petit téléphone, paysage) : tout se resserre pour que la phrase et ses réponses tiennent.
  '@media (max-width: 1100px) and (max-height: 720px) {'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-tete p { display: -webkit-box !important; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-tete { margin-top: .75rem !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte > p:first-child { font-size: var(--pas-2, 1.5rem) !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-opt { min-height: 3rem !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte > [role="group"]:not(.e-open) { gap: .5rem !important; padding-top: 1rem; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) div[style*="display:grid"] > button { min-height: 3rem !important; }'
    + ' }',
  '@media (max-width: 1100px) and (max-height: 500px) {'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-tete p { display: none !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte > [role="group"]:not(.e-open) { grid-template-columns: 1fr 1fr !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:first-child > p, html.edl-tel.edl-pas-a-pas .edl-profil > div:first-child h1 { display: none !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) div[style*="display:grid"] { grid-template-columns: 1fr 1fr !important; }'
    + ' }',
  '.e-lien, .e-lien * { text-decoration-line: none !important; }',
  '.e-lien:focus:not(:focus-visible) { outline: none; }',
  // Mention légale du pied, sur téléphone : 4,44:1 et 11,5 px → plus claire et à 13 px (WCAG 1.4.3, responsive 16 octobre 2026).
  '[data-maquette] footer p[style*="rgba(244,242,234,.5)"] { color: rgba(244, 242, 234, .74) !important; font-size: .8125rem !important; }',
  // Second tour (relecteur, 16 octobre 2026) : le pied ne dépasse plus dans l'écran, la phrase posée au centre optique de l'espace
  // libre, le texte d'aide à 16 px, « Retour » en haut partout, une seule façon de compter, la tablette et le paysage à part.
  '@media (max-width: 1100px) {'
    + ' html.edl-tel.edl-phrases main > section:has(.edl-ph), html.edl-tel.edl-phrases .edl-ph { min-height: calc(100svh - var(--edl-entete, 69px)) !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph, html.edl-tel.edl-pas-a-pas .edl-profil { box-sizing: border-box !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil { min-height: calc(100svh - var(--edl-entete, 69px)) !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte > p:first-child { margin: auto 0 !important; padding: .75rem 0 1rem; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte > [role="group"]:not(.e-open) { margin-top: 0 !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-tete p { font-size: var(--pas-0, 1rem) !important; color: #455051 !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(n+3) { order: -2; margin: 0 0 .5rem !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:first-child > :first-child:not(h1):not(.edl-progres) { display: none !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) h2 { margin: auto 0 !important; padding: 1.5rem 0; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) div[style*="display:grid"] { margin-top: 0 !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) > div:has(input) h2 { margin: 0 !important; padding: 0 0 .75rem; }'
    + ' html.edl-tel :is(.edl-retour) { min-height: 2.75rem; display: inline-flex !important; align-items: center; }'
    + ' }',
  '@media (max-width: 1100px) and (max-height: 720px) { html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte > p:first-child { padding: .5rem 0 1rem; } html.edl-tel.edl-phrases .edl-ph { padding-bottom: max(env(safe-area-inset-bottom), .75rem) !important; } }',
  '@media (max-width: 1100px) and (max-height: 500px) { html.edl-tel.edl-phrases .edl-ph { padding-top: .25rem !important; } html.edl-tel.edl-phrases .edl-ph > .edl-ph-nav { margin-bottom: 0 !important; } html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-tete { margin-top: .25rem !important; } html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte > p:first-child { padding: .25rem 0 .75rem; } html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-opt { min-height: 2.75rem !important; } }',
  // Paysage : les quatre réponses sur une ligne, dans l'ordre de l'échelle (Nielsen n° 2).
  '@media (max-width: 1100px) and (max-height: 500px) { html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte > [role="group"]:not(.e-open), html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) div[style*="display:grid"]:not(:has(> :nth-child(5))) { grid-template-columns: repeat(4, 1fr) !important; } }',
  // Tablette : la colonne centrée en hauteur, la phrase près de ses réponses (on la tient par les côtés, Hoober).
  '@media (min-width: 700px) and (max-width: 1100px) and (min-height: 700px) {'
    + ' html.edl-tel.edl-phrases .edl-ph { justify-content: center; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte { flex: 0 0 auto; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte > p:first-child { margin: 0 !important; padding: 1.5rem 0 2rem; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil { justify-content: center; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) { flex: 0 0 auto; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) > div:not(.edl-etape-cachee) { flex: 0 0 auto !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) h2 { margin: 0 !important; }'
    + ' }',
  // ----------------------------------------------------------- points UX du formulaire (16 octobre 2026)
  // Les boutons ajoutés au panneau des idées n'existent que sur téléphone et tablette.
  '.edl-feuille-tete { display: none; }',
  '@media (max-width: 1100px) {'
    // 4. Le panneau des idées se ferme : la croix, la réponse choisie en haut (pour la changer), ou un toucher au-dessus.
    + ' html.edl-tel.edl-phrases .edl-ph-carte.edl-feuille-fermee .e-open { display: none !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-open > p::before { display: none !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-open { padding-top: calc(var(--feuille-tete, 64px) + 1.75rem) !important; overscroll-behavior: contain; }'
    + ' html.edl-tel.edl-phrases .edl-feuille-tete:not([hidden]) { display: grid; grid-template-columns: 1fr auto; align-items: start; gap: 12px 8px; position: fixed; left: 0; right: 0; z-index: 61; box-sizing: border-box; padding: 20px 8px 0 16px; animation: edlVoile .25s .3s both; }'
    + ' html.edl-tel.edl-phrases:has(.edl-ph-carte .e-open):not(:has(.edl-ph-carte.edl-feuille-fermee)), html.edl-tel.edl-phrases:has(.edl-ph-carte .e-open):not(:has(.edl-ph-carte.edl-feuille-fermee)) body { overflow: hidden; }'
    + ' html.edl-tel .edl-feuille-q { grid-column: 1 / -1; grid-row: 2; margin: 4px 0 0; font: 800 clamp(1.25rem, 5.4vw, 1.5rem)/1.2 "Bricolage Grotesque", sans-serif; letter-spacing: -.02em; color: #0C1011; text-wrap: balance; }'
    + ' html.edl-tel .edl-feuille-tete .edl-feuille-x { grid-column: 2; grid-row: 1; }'
    + ' html.edl-tel .edl-feuille-tete .edl-feuille-choix { grid-column: 1; grid-row: 1; justify-self: start; align-self: center; }'
    + ' html.edl-tel .edl-feuille-x { display: inline-flex; width: 44px; height: 44px; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: 999px; background: transparent; color: #23545B; cursor: pointer; }'
    + ' html.edl-tel .edl-feuille-x svg { width: 1.375rem; height: 1.375rem; }'
    // La réponse choisie, en petite étiquette (Arnaud, 16 octobre 2026 : « aussi gros que la question ») ; la zone tactile garde 44 px.
    + ' html.edl-tel .edl-feuille-choix { position: relative; display: inline-flex; align-items: center; gap: 6px; min-height: 30px; padding: 0 12px; border: 1px solid #C7D9DC; border-radius: 999px; background: #FFFFFF; color: #23545B; font: 700 max(.75rem, 12px) "DM Sans", sans-serif; letter-spacing: .12em; text-transform: uppercase; cursor: pointer; }'
    + ' html.edl-tel .edl-feuille-choix::after { content: ""; position: absolute; inset: -7px -4px; }'
    + ' html.edl-tel .edl-feuille-choix svg { width: .875rem; height: .875rem; flex-shrink: 0; }'
    // 5. Les choix du profil en bas de l'écran, comme les questions ; la question posée au centre de l'espace libre au-dessus.
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) > div:not(:has(input)) > div:has(> h2) { margin: auto 0 !important; padding: 1.5rem 0; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) > div:not(:has(input)) h2 { margin: 0 !important; padding: 0 !important; }'
    // 6. « Retour » : une zone de 44 × 44 avec sa flèche, détachée de la barre de progression.
    + ' html.edl-tel .edl-retour { min-height: 44px !important; min-width: 44px; gap: .375rem; padding: 0 .75rem 0 0 !important; margin-left: -.125rem; text-decoration: none !important; }'
    + ' html.edl-tel .edl-retour::before { content: ""; width: 1.125rem; height: 1.125rem; flex-shrink: 0; background: currentColor; -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23000%27 stroke-width=%272.2%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M19 12H5M11 6l-6 6 6 6%27/%3E%3C/svg%3E") center / contain no-repeat; mask: url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23000%27 stroke-width=%272.2%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M19 12H5M11 6l-6 6 6 6%27/%3E%3C/svg%3E") center / contain no-repeat; }'
    + ' html.edl-tel.edl-phrases .edl-ph > .edl-ph-nav, html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(n+3) { margin: 0 0 .75rem !important; }'
    // 7. « Thème 1 sur 8 » au-dessus du nom du thème, dans le style de l'ordinateur (italique, puis le thème en gras).
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-tete h2::before { display: block !important; margin: 0 0 .125rem !important; font-size: clamp(1.25rem, 5.3vw, 1.625rem) !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-tete h2 { font-family: "Bricolage Grotesque", sans-serif !important; font-style: normal !important; font-weight: 800 !important; font-size: clamp(1.5rem, 6.4vw, 2rem) !important; line-height: 1.1 !important; letter-spacing: -.025em !important; color: #0C1011 !important; }'
    // La question ne flotte plus au milieu de l'écran (Arnaud, 16 octobre 2026, piste B retenue) : un filet fin sous le thème,
    // et la question collée à ses réponses, ensemble dans la zone du pouce. Sans aplat de couleur.
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-tete { padding-bottom: 1.25rem; border-bottom: 1px solid #DCE8EA; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte > p:first-child { margin: auto 0 1.75rem !important; padding: 1.5rem 0 0 !important; font-size: clamp(1.75rem, 7.4vw, 2.25rem) !important; }'
    // 8. 16 px de marge partout, panneau des idées compris (en px : la maquette réduit la taille de base sur les petits écrans).
    + ' html.edl-tel.edl-phrases main > section:has(.edl-ph), html.edl-tel.edl-pas-a-pas main > section:has(.edl-profil) { padding-left: max(var(--gouttiere, 1rem), 16px) !important; padding-right: max(var(--gouttiere, 1rem), 16px) !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-open { padding-left: max(var(--gouttiere, 1rem), 16px) !important; padding-right: max(var(--gouttiere, 1rem), 16px) !important; }'
    // Le panneau occupe toute la largeur : l'animation d'entrée de la carte ne doit pas lui servir de cadre.
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte:has(.e-open) { animation: none !important; transform: none !important; }'
    + ' html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-open > div:first-of-type, html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte .e-open .e-row { padding-left: 0 !important; padding-right: 0 !important; margin-left: 0 !important; margin-right: 0 !important; }'
    // 9. Les tranches de salariés en deux colonnes, chacune sur une ligne ; la taille d'équipe aussi sur une ligne.
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) div[style*="display:grid"]:has(> :nth-child(6):last-child) { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) > div:not(:first-child):not(:has(input)) div[style*="display:grid"]:has(> :nth-child(3):last-child) { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) > div:not(:first-child):not(:has(input)) div[style*="display:grid"]:is(:has(> :nth-child(3):last-child), :has(> :nth-child(6):last-child)) > button { white-space: nowrap !important; padding: .25rem .5rem !important; }'
    // Pas de pied de page pendant le questionnaire sur téléphone (Arnaud, 16 octobre 2026 : « personne ne va cliquer dessus à
    // cet endroit ») : il apparaissait sous la barre d'adresse flottante de Safari. Les mentions restent sur l'accueil et le résultat.
    + ' html.edl-tel:is(.edl-phrases, .edl-pas-a-pas) [data-maquette] footer { display: none !important; }'
    // 10. « Merci, place à vos 16 questions » : le texte en haut, le bouton en bas, sous le pouce.
    + ' html.edl-tel.edl-pas-a-pas .edl-merci { justify-content: flex-start !important; padding-top: 1.5rem; }'
    + ' html.edl-tel.edl-pas-a-pas .edl-merci__cta { margin-top: auto; }'
    + ' }',
  // Tablette : la question du profil reste près de ses réponses (le centrage en hauteur ci-dessus prime).
  '@media (min-width: 700px) and (max-width: 1100px) and (min-height: 700px) { html.edl-tel.edl-pas-a-pas .edl-profil > div:nth-child(2) > div:not(:has(input)) > div:has(> h2) { margin: 0 !important; } html.edl-tel.edl-pas-a-pas .edl-merci { justify-content: center !important; } html.edl-tel.edl-pas-a-pas .edl-merci__cta { margin-top: 1rem; } }',
  // Piste B sur les écrans bas (petit téléphone) : tout tient sans défiler.
  '@media (max-width: 1100px) and (max-height: 620px) { html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-tete { padding-bottom: .75rem; } html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-carte > p:first-child { margin-bottom: 1rem !important; padding-top: .75rem !important; font-size: clamp(1.375rem, 6.6vw, 1.75rem) !important; } html.edl-tel.edl-phrases .edl-ph { padding-top: .25rem !important; padding-bottom: max(env(safe-area-inset-bottom), .25rem) !important; } html.edl-tel.edl-phrases .edl-ph > .edl-ph-nav { margin-bottom: .25rem !important; } html.edl-tel.edl-phrases .edl-ph > div > .edl-ph-tete { margin-top: .5rem !important; } }',
  '@keyframes edlFeuille { from { transform: translateY(100%); } to { transform: none; } }',
  '@keyframes edlVoile { from { opacity: 0; } }',
  '[data-maquette] [tabindex="-1"]:focus:not(:focus-visible), [data-maquette] p:focus:not(:focus-visible) { outline: none; }',
  '.edl-pour-tete { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr); gap: 3rem 5rem; align-items: center; }',
  '.edl-frise--colonne { margin: 0 !important; grid-template-columns: 1fr !important; gap: 1.25rem !important; }',
  '.edl-frise--colonne::before { top: 0.5rem; bottom: 3rem; left: 1.375rem; right: auto; width: 2px; height: auto; }',
  '.edl-frise--colonne li { display: grid !important; grid-template-columns: 2.75rem 1fr; column-gap: 1.25rem; row-gap: 0.125rem; align-items: start; }',
  '.edl-frise--colonne .edl-frise__num { grid-row: span 2; width: 2.75rem !important; height: 2.75rem !important; margin: 0 !important; font-size: 1.125rem !important; }',
  '.edl-frise--colonne .edl-frise__titre { font-size: 1.25rem !important; padding-top: 0.375rem; }',
  '.edl-frise--colonne .edl-frise__texte { font-size: 1rem !important; max-width: none !important; }',
  // L'échange : un seul filet en haut, un trait entre les deux colonnes, la liste sans séparateurs.
  '.edl-pour > div:not(.edl-pour-tete) { margin-top: 4rem !important; padding-top: 2.5rem; border-top: 2px solid #23545B; gap: 0 !important; }',
  '.edl-pour > div:not(.edl-pour-tete) > div { border-top: 0 !important; padding-top: 0 !important; }',
  '.edl-pour > div:not(.edl-pour-tete) > div + div { padding-left: 3.5rem !important; border-left: 1px solid #C7D9DC; }',
  '.edl-pour > div:not(.edl-pour-tete) > div:first-child { padding-right: 3.5rem !important; }',
  '.edl-pour-titre { display: block; margin: 0.75rem 0 1rem; }',
  '.edl-pour > div:not(.edl-pour-tete) > div:first-child > div > div { border: 0 !important; padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }',
  '@media (max-width: 1100px) { .edl-pour-tete { grid-template-columns: 1fr; } }',
  '.edl-frise--gains.edl-frise--mobile::before { top: 0; bottom: 4rem; left: 1.75rem; right: auto; width: 2px; height: auto; }',
  '.edl-frise--gains.edl-frise--mobile li { padding-left: 5rem; min-height: 3.5rem; }',
  '.edl-frise--mobile { grid-template-columns: 1fr; gap: 1.25rem; margin: 12px 0 6px; padding: 22px 20px; }',
  '.edl-frise--mobile li { padding-left: 3rem; }',
  '.edl-frise--mobile .edl-frise__num { position: absolute; left: 0; top: 0; margin: 0; }',
  '.edl-frise--mobile li:not(:last-child)::after { top: 2.5rem; bottom: -1rem; left: 0.9375rem; right: auto; width: 2px; height: auto; }',
  // La carte du nombre : à droite du texte, à sa hauteur, sans flotter.
  '.edl-hero-section { min-height: 0 !important; }',
  '.edl-hero { display: flex; align-items: stretch; justify-content: space-between; gap: 3rem; padding-bottom: 4.5rem !important; }',
  // La première phrase du titre, agrandie (retour d'entretien, 15 octobre 2026), passe sur deux lignes : la colonne du titre
  // se partage la largeur au lieu de pousser la carte de l'étude sous elle.
  '.edl-hero > div:first-child { flex: 1 1 0; min-width: 0; }',
  // Le texte de gauche passe devant la carte (Arnaud, 15 octobre 2026 : « le texte de gauche doit être plus mis en avant que
  // l'illustration à droite ») : la colonne du titre prend la place, la carte reste compacte et centrée.
  '@media (min-width: 1101px) {'
    + ' .edl-hero > div:first-child { flex: 1 1 0 !important; max-width: 46rem !important; }'
    + ' [data-maquette] .edl-hero h1 > span:first-child { font-size: clamp(3.5rem, 5vw, 4.75rem) !important; line-height: 1.02 !important; }'
    + ' [data-maquette] .edl-hero h1 > span:not(:first-child) { font-size: clamp(3.75rem, 5.6vw, 5.5rem) !important; }'
    + ' .edl-nombre { flex: 0 1 29rem !important; max-width: 30rem !important; align-self: center !important; padding: 1.75rem 2rem 1.5rem !important; gap: 0.5rem !important; }'
    + ' .edl-nombre__chiffre { font-size: clamp(4.25rem, 6vw, 5.75rem) !important; }'
    + ' .edl-nombre__texte { font-size: 1.0625rem !important; }'
    + ' .edl-nombre__points { flex: 0 0 auto; grid-template-columns: repeat(auto-fill, minmax(8px, 1fr)) !important; gap: 4px !important; margin-top: 0.5rem !important; }'
    + ' }',
  // La colonne de gauche, à la mesure de la carte (Arnaud, 15 octobre 2026 : « idem pour le gauche, faut optimiser ») : centrée
  // en hauteur, un titre plus grand, la phrase et le bouton plus présents.
  '@media (min-width: 1101px) {'
    + ' .edl-hero > div:first-child { justify-content: center; gap: 1.5rem !important; }'
    + ' .edl-hero .edl-signature { font-size: 1.375rem !important; line-height: 1.45 !important; }'
    + ' .edl-hero .g-cta { min-height: 4.75rem !important; font-size: 1.25rem !important; padding-left: 2.25rem !important; }'
    + ' }',
  // Le haut de page remplit exactement la fenêtre, sous l'en-tête (Arnaud, 15 octobre 2026 : « y'a une coupure ») : la section
  // suivante commence pile au bord de l'écran, au lieu d'y être coupée en deux.
  '@media (min-width: 1024px) { .edl-hero-section { min-height: calc(100svh - 69px) !important; display: flex; flex-direction: column; justify-content: center; } .edl-hero-section > .edl-hero { flex: 0 0 auto; width: 100%; box-sizing: border-box; padding-top: 1.5rem !important; padding-bottom: 2.5rem !important; } }',
  // Moins de vide entre le titre et la carte (Arnaud, 15 octobre 2026) : la carte prend la place qui reste, jusqu'à 32 rem.
  '@media (min-width: 1101px) { .edl-hero { gap: 3rem; } .edl-hero > div:first-child { flex: 1 1 26rem !important; max-width: 40rem !important; } .edl-nombre { flex: 1 1 22rem !important; max-width: 30rem; } }',
  // Écran d'ordinateur peu haut (1200 × 800, Arnaud, 15 octobre 2026) : le haut de page, la carte de l'étude et les trois étapes
  // tiennent ensemble dans la fenêtre, avec de l'air sous les étapes.
  '@media (min-width: 1024px) and (max-height: 860px) {'
    + ' .edl-hero { padding-top: 2rem !important; padding-bottom: 2.5rem !important; }'
    + ' .edl-hero > div:first-child { gap: 1rem !important; }'
    + ' .edl-nombre { padding: 1.5rem 1.75rem 1.25rem; }'
    + ' .edl-nombre__chiffre { font-size: 4.5rem; }'
    + ' .edl-nombre__texte { font-size: 1.125rem; }'
    + ' .edl-nombre__points { gap: 3px; margin-top: 0.5rem; }'
    + ' }',
  '.edl-nombre { flex: 0 1 25rem; align-self: center; display: flex; flex-direction: column; gap: 0.5rem; padding: 2rem 2rem 1.75rem; border-radius: 1.5rem; background: #FFFFFF; color: #0C1011; animation: edlMonte .8s cubic-bezier(.2,.7,.2,1) both; }',
  '@keyframes edlMonte { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }',
  '@media (prefers-reduced-motion: reduce) { .edl-nombre { animation: none; } .edl-nombre__points i { transition: none !important; } }',
  '.edl-nombre__sur { font-size: 0.75rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #23545B; }',
  '.edl-nombre__chiffre { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: clamp(4.5rem, 7vw, 6.5rem); line-height: 0.9; letter-spacing: -0.05em; font-variant-numeric: tabular-nums; margin-top: 0.25rem; }',
  '.edl-nombre__texte { font-family: "Bricolage Grotesque", sans-serif; font-weight: 300; font-size: 1.25rem; line-height: 1.35; color: #455051; }',
  '.edl-nombre__points { display: grid; grid-template-columns: repeat(auto-fill, minmax(7px, 1fr)); gap: 4px; margin-top: 1rem; }',
  '.edl-nombre__points i { display: block; aspect-ratio: 1; border-radius: 999px; background: #DCE8EA; transition: background-color .25s ease, transform .25s ease; }',
  '.edl-nombre__points i.on { background: #23545B; }',
  '.edl-nombre__legende { font-size: 0.8125rem; color: #697374; margin-top: 0.25rem; }',
  '@media (max-width: 1100px) { .edl-hero { flex-wrap: wrap; } .edl-nombre { flex-basis: 100%; align-self: auto; } }',
  '.edl-nombre--mobile { margin: 26px 0 6px; padding: 22px 20px 18px; }',
  '.edl-nombre--mobile .edl-nombre__chiffre { font-size: 4.25rem; }',
  '.edl-nombre--mobile .edl-nombre__texte { font-size: 1.0625rem; }',
].join('\n');
document.head.appendChild(style);


// ------------------------------------------------------------- le profil en étapes, sur ordinateur
// Arnaud, 15 octobre 2026 : « éviter les blocs les uns au-dessus des autres, faire des étapes sur desktop, pas sur mobile,
// en 5 étapes max, et ça doit tenir dans 1200 × 800 sans scroll ». Une question à la fois à droite, l'introduction et la
// progression à gauche ; un choix fait passer à la question suivante, « Retour » revient à la précédente. Les blocs cachés
// pour un solo (taille d'entreprise, d'équipe) ne comptent pas : 3 étapes pour un solo, 5 sinon.
// Toucher une réponse : une vibration très légère sur Android (jamais sur iPhone, où l'API n'existe pas), pour sentir qu'on a été
// entendu (responsive, 16 octobre 2026).
const vibrer = () => { try { if (TEL && TEL() && navigator.vibrate && !/iPhone|iPad|iPod/.test(navigator.userAgent)) navigator.vibrate(8); } catch (e) { /* rien */ } };
// Le retour du navigateur et le geste retour du téléphone reviennent à la question précédente sans rien perdre : chaque pas en
// avant ajoute une entrée d'historique, et revenir en arrière la consomme.
const pousserPas = (genre, n) => { try { history.pushState({ edl: genre, n }, ''); } catch (e) { /* rien */ } };
let etapeProfil = 0;
const PHRASES_PROFIL = {
  'Vous travaillez': 'Commençons par votre façon de travailler, telle que vous la vivez au quotidien.',
  'Vous êtes': 'Dites-nous en un peu plus sur vous. Vos réponses restent anonymes.',
  'Taille de votre entreprise': 'Grande ou petite structure, chaque contexte a ses atouts.',
  "Secteur d'activité": 'Votre secteur nous aide à mettre votre regard à côté de celui de personnes qui travaillent comme vous.',
  'Taille de votre équipe': 'Dernière question sur vous : la taille de votre équipe.',
  fin: 'Ces repères permettent de mettre votre regard à côté de celui de personnes qui vous ressemblent.',
};
// Depuis le travail responsive (16 octobre 2026), le pas-à-pas vaut aussi sur téléphone et tablette, avec sa propre mise en scène
// (html.edl-tel) : une question, une phrase à la fois, les réponses dans la zone du pouce (piste A « Respiration »).
const ORDI = () => true;
const TEL = () => matchMedia('(max-width: 1100px)').matches;
const carteProfil = () => {
  const m = [...document.querySelectorAll('[data-maquette]')].find((x) => x.getClientRects().length); if (!m) return null;
  return [...m.querySelectorAll('div[style*="padding:2.5rem 2.75rem"]')].find((c) => /^\s*Vous travaillez/.test(c.textContent || '')) || null;
};
const groupesProfil = (carte) => [...carte.children].filter((g) => !g.classList.contains('edl-merci') && !g.classList.contains('edl-passer') && !g.hasAttribute('data-edl-cache') && !/display:\s*none/.test(g.getAttribute('style') || ''));
// Changer de question : un léger fondu en sortie, puis la suivante arrive en fondu (Arnaud, 15 octobre 2026).
const focusTitre = (x) => { if (!x) return; if (!x.hasAttribute('tabindex')) x.setAttribute('tabindex', '-1'); x.focus({ preventScroll: true }); };
const allerEtape = (n, sansHistorique) => {
  if (!sansHistorique && n > etapeProfil) pousserPas('profil', n);
  const carte = carteProfil(); const g = carte && (groupesProfil(carte)[etapeProfil] || carte.querySelector(':scope > .edl-merci'));
  // Sur téléphone, chaque question s'ouvre en haut de l'écran (points UX du 16 octobre 2026) : rien ne reste coupé au-dessus.
  const poser = () => { etapeProfil = n; etapesProfil(); if (TEL()) { scrollTo(0, 0); focusTitre(document.querySelector('.edl-profil > div:nth-child(2) > div:not(.edl-etape-cachee) h2, .edl-merci:not([hidden]) .edl-merci__titre')); } };
  if (!g || calme()) { poser(); return; }
  g.classList.add('edl-etape-sortie');
  setTimeout(() => { g.classList.remove('edl-etape-sortie'); poser(); }, 280);
};
const etapesProfil = () => {
  const racine = document.documentElement;
  const carte = page === 'questionnaire' && ORDI() ? carteProfil() : null;
  racine.classList.toggle('edl-pas-a-pas', Boolean(carte));
  racine.classList.toggle('edl-tel', TEL());
  if (carte) { const m = carte.closest('[data-maquette]'); const h = m && m.querySelector('header'); if (h) racine.style.setProperty('--edl-entete', h.offsetHeight + 'px'); }
  if (!carte) return;
  const groupes = groupesProfil(carte); const nb = groupes.length; if (!nb) return;
  // Après la dernière question, une étape « Merci » dans la carte, avec son bouton (Arnaud, 15 octobre 2026).
  if (etapeProfil > nb) etapeProfil = nb;
  // Jamais l'étape « Merci » avec une réponse obligatoire manquante (un rôle décoché en revenant en arrière, par exemple) :
  // on revient à la première question sans réponse. À l'arrivée, on ouvre aussi sur la première question à remplir.
  // Chaque question est obligatoire (Arnaud, 15 octobre 2026) ; « Vous êtes » garde « Je préfère ne pas répondre ».
  const manque = groupes.findIndex((g) => !g.querySelector('[aria-pressed="true"], [aria-selected="true"]'));
  if (!etapesProfil.vu) { etapesProfil.vu = true; const premiere = groupes.findIndex((g) => !g.querySelector('[aria-pressed="true"], [aria-selected="true"]')); etapeProfil = premiere < 0 ? nb : premiere; }
  if (etapeProfil === nb && manque >= 0) etapeProfil = manque;
  const fin = etapeProfil === nb;
  [...carte.children].forEach((g) => { if (groupes.includes(g)) g.classList.toggle('edl-etape-cachee', groupes.indexOf(g) !== etapeProfil); });
  let merci = carte.querySelector(':scope > .edl-merci');
  if (!merci) {
    merci = document.createElement('div'); merci.className = 'edl-merci';
    merci.innerHTML = '<p class="edl-merci__titre"><span class="leger">Merci,</span> <span class="gras">place à vos 16 questions.</span></p>'
      + '<p class="edl-merci__texte">Environ 2 minutes, à votre rythme, pour obtenir votre état des lieux.</p>'
      + '<button type="button" class="edl-merci__cta">Commencer les 16 questions<span class="edl-merci__rond" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#0C1011" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></button>';
    carte.appendChild(merci);
  }
  merci.hidden = !fin;
  // « Vous êtes » est facultatif : un lien discret pour passer, puisque « Continuer » n'apparaît plus.
  let passer = carte.querySelector(':scope > .edl-passer');
  if (!passer) { passer = document.createElement('button'); passer.type = 'button'; passer.className = 'edl-passer'; passer.textContent = 'Passer cette question'; carte.appendChild(passer); }
  passer.hidden = true;
  const enveloppe = carte.parentElement; enveloppe.classList.add('edl-profil');
  const intro = enveloppe.firstElementChild;
  let prog = intro.querySelector(':scope > .edl-progres');
  if (!prog) { prog = document.createElement('div'); prog.className = 'edl-progres'; intro.appendChild(prog); }
  const html = '<span class="edl-progres__texte">' + (fin ? 'C’est prêt' : 'Question ' + (etapeProfil + 1) + ' sur ' + nb) + '</span><span class="edl-progres__points">'
    + groupes.map((_, k) => '<i class="' + (k < etapeProfil ? 'fait' : k === etapeProfil ? 'actif' : '') + '"></i>').join('') + '</span>';
  if (prog.innerHTML !== html) prog.innerHTML = html;
  // Une phrase par question, empathique, positive, sans négation (Arnaud, 15 octobre 2026), relue avec « Greatly, ce n'est pas… ».
  const q = fin ? 'fin' : norm((groupes[etapeProfil].querySelector('h2') || {}).textContent || '');
  const cle = Object.keys(PHRASES_PROFIL).find((k) => q.startsWith(k));
  const phrase = cle && PHRASES_PROFIL[cle];
  const para = intro.querySelector('p');
  if (para && phrase && para.textContent !== phrase) para.textContent = phrase;
};
if (page === 'questionnaire') {
  document.addEventListener('click', (e) => {
    if (!document.documentElement.classList.contains('edl-pas-a-pas')) return;
    const carte = carteProfil(); if (!carte) return;
    const b = e.target.closest('button, a'); if (!b) return;
    const groupes = groupesProfil(carte); const g = groupes[etapeProfil]; const nb = groupes.length;
    const t = norm(b.textContent || '');
    if (/^Voir tous les secteurs/.test(t)) { const y = scrollY; requestAnimationFrame(() => requestAnimationFrame(() => scrollTo(0, y))); return; }
    if (b.classList.contains('edl-merci__cta')) {
      // Le bouton de la carte lance la suite : le « Continuer » de la maquette, caché, fait le reste.
      const vrai = [...document.querySelectorAll('.edl-profil button, .edl-profil a')].find((x) => /^Continuer/.test(norm(x.textContent || '')));
      if (vrai) vrai.click();
      return;
    }
    if (b.classList.contains('edl-passer')) { allerEtape(etapeProfil + 1); return; }
    if (carte.contains(b)) {
      if (b.getAttribute('aria-pressed') === 'true' && g && g.contains(b)) { e.preventDefault(); e.stopImmediatePropagation(); if (etapeProfil < nb) allerEtape(etapeProfil + 1); return; }
      // Un choix fait passer à la question suivante, après un temps pour le voir coché (650 ms, Arnaud, 15 octobre 2026 : « trop rapide »).
      if (b.hasAttribute('aria-pressed') && g && g.contains(b)) vibrer();
      if (b.hasAttribute('aria-pressed') && g && g.contains(b) && etapeProfil < nb) {
        setTimeout(() => { if (b.getAttribute('aria-pressed') === 'true' && etapeProfil < groupesProfil(carte).length) allerEtape(etapeProfil + 1); }, 650);
      }
      return;
    }
    if (/^Continuer/.test(t) && etapeProfil < nb) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (g.querySelector('[aria-pressed="true"]')) allerEtape(etapeProfil + 1);
      else { g.classList.remove('edl-etape-manque'); void g.offsetWidth; g.classList.add('edl-etape-manque'); }
    } else if (/^Retour/.test(t) && etapeProfil > 0) {
      e.preventDefault(); e.stopImmediatePropagation(); if (history.state && history.state.edl === 'profil') history.back(); else allerEtape(etapeProfil - 1, true);
    }
  }, true);
  addEventListener('resize', () => etapesProfil());
}


// ------------------------------------------------------------- les 16 phrases en étapes, sur ordinateur
// Arnaud, 15 octobre 2026 : « le même principe sur desktop pour toutes les questions de Comment voyez-vous votre travail ?,
// étape par étape, avec le petit texte à gauche de chaque question et les réponses à droite ». À gauche, le thème de la phrase
// et son « pourquoi », avec la progression ; à droite, la phrase et ses réponses. Une réponse fait passer à la suivante, sauf
// quand les idées « J'aimerais… » s'ouvrent : on les choisit, puis « Question suivante ». À la fin, une étape « Merci ».
let etapePhrase = 0;
const zonePhrases = () => {
  const m = [...document.querySelectorAll('[data-maquette]')].find((x) => x.getClientRects().length || x.querySelector('#a1')); if (!m) return null;
  const a1 = m.querySelector('#a1'); return a1 ? a1.parentElement.parentElement : null;
};
const cartesPhrases = (w) => [...w.querySelectorAll(':scope > div > [id^="a"]')].filter((x) => /^a\d+$/.test(x.id) && !x.hasAttribute('data-edl-cache'));
const repondue = (c) => Boolean(c.querySelector('[role="group"]:not(.e-open) [aria-pressed="true"]') || c.querySelector(':scope > div > button[aria-pressed="true"]'));
const etapesPhrases = () => {
  const racine = document.documentElement;
  const w = page === 'questionnaire' && ORDI() ? zonePhrases() : null;
  const actif = Boolean(w && w.getClientRects().length);
  racine.classList.toggle('edl-phrases', actif);
  if (!actif) return;
  w.classList.add('edl-ph');
  // La hauteur de l'en-tête et du pied, pour que le fond remplisse l'écran sans le dépasser, à toutes les tailles.
  { const m = w.closest('[data-maquette]'); const h = m && m.querySelector('header'); const f = m && m.querySelector('footer.g-pied2'); const v = ((h ? h.offsetHeight : 69) + (f ? f.offsetHeight : 36)) + 'px'; if (document.documentElement.style.getPropertyValue('--edl-reste') !== v) document.documentElement.style.setProperty('--edl-reste', v);  const e = (h ? h.offsetHeight : 69) + 'px'; if (document.documentElement.style.getPropertyValue('--edl-entete') !== e) document.documentElement.style.setProperty('--edl-entete', e); }
  // La barre « Retour / Voir mon résultat » : le dernier bloc de la maquette, repéré une fois pour toutes.
  [...w.children].forEach((x) => x.classList.toggle('edl-ph-nav', !x.classList.contains('edl-merci2') && !x.classList.contains('edl-progres') && Boolean(x.querySelector('.edl-retour, a, button')) && /Retour/.test(x.textContent || '') && !x.querySelector('[id^="a"]')));
  const cartes = cartesPhrases(w); const nb = cartes.length; if (!nb) return;
  if (!etapesPhrases.vu) { etapesPhrases.vu = true; const k = cartes.findIndex((c) => !repondue(c)); etapePhrase = k < 0 ? nb : k; }
  if (etapePhrase > nb) etapePhrase = nb;
  const manque = cartes.findIndex((c) => !repondue(c));
  if (etapePhrase === nb && manque >= 0) etapePhrase = manque;
  const fin = etapePhrase === nb;
  const courante = cartes[etapePhrase];
  const tete = courante ? courante.parentElement.firstElementChild : null;
  w.querySelectorAll(':scope > div > *').forEach((x) => {
    x.classList.toggle('edl-ph-carte', x === courante);
    x.classList.toggle('edl-ph-tete', x === tete);
  });
  // L'étape « Merci » : dans la zone, à la place de la carte.
  let merci = w.querySelector(':scope > .edl-merci2');
  if (!merci) {
    merci = document.createElement('div'); merci.className = 'edl-merci2';
    merci.innerHTML = '<p class="edl-merci__titre"><span class="leger">Merci,</span> <span class="gras">votre état des lieux est prêt.</span></p>'
      + '<p class="edl-merci__texte">Vos réponses rejoignent l’étude, de façon anonyme. Découvrez votre regard, à côté de celui de personnes qui travaillent comme vous.</p>'
      + '<button type="button" class="edl-merci__cta edl-merci2__cta">Voir mon résultat<span class="edl-merci__rond" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#0C1011" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></button>';
    w.appendChild(merci);
  }
  merci.hidden = !fin;
  // La progression, sous l'étape.
  // La progression sous le thème, comme sur le profil : un bloc à elle, en fin de zone.
  let prog = w.querySelector(':scope > .edl-progres');
  if (!prog) { prog = document.createElement('div'); prog.className = 'edl-progres edl-progres--phrases'; w.appendChild(prog); }
  const html = '<span class="edl-progres__texte">' + (fin ? 'C’est prêt' : 'Phrase ' + (etapePhrase + 1) + ' sur ' + nb) + '</span><span class="edl-progres__points">'
    + cartes.map((_, k) => '<i class="' + (k < etapePhrase ? 'fait' : k === etapePhrase ? 'actif' : '') + '"></i>').join('') + '</span>';
  if (prog.innerHTML !== html) prog.innerHTML = html;
  racine.classList.toggle('edl-phrases-fin', fin);
  racine.style.setProperty('--avance', String(nb ? etapePhrase / nb : 0));
  // Le thème en cours se remplit phrase après phrase dans la frise du téléphone.
  if (courante) { const memes = cartes.filter((c) => c.parentElement === courante.parentElement); racine.style.setProperty('--p-theme', String(memes.indexOf(courante) / memes.length)); }
  // Le panneau des idées rappelle la réponse choisie (Nielsen n° 6 : reconnaître plutôt que se souvenir).
  if (courante) { const ch = courante.querySelector('.e-opt[aria-pressed="true"]'); const tete = courante.querySelector('.e-open > p'); if (tete && ch) { const v = norm(ch.textContent || ''); if (tete.dataset.choix !== v) tete.dataset.choix = v; } }
  // Sur téléphone, le panneau se ferme (points UX du 16 octobre 2026) : une croix, et la réponse choisie en bouton, en haut,
  // pour la changer. Les deux ramènent aux quatre réponses, la réponse en cours toujours cochée. Ils vivent hors de la maquette
  // (qui n'accepte pas d'éléments ajoutés dans son panneau), dans un bandeau posé sur le haut du panneau.
  bandeauFeuille(courante);
  // Le bloc de gauche ne bouge plus d'un thème à l'autre (Arnaud, 15 octobre 2026) : le titre a une hauteur fixe, et sa taille
  // s'ajuste s'il est plus long ; le « pourquoi » dessous aussi. Rien ne dépend de la longueur des textes.
  if (tete && TEL()) { tete.querySelectorAll('h2, p').forEach((x) => x.style.removeProperty('font-size')); }
  if (tete && !TEL()) requestAnimationFrame(() => {
    const ajuster = (x, max, min) => { if (!x) return; let t = max; x.style.setProperty('font-size', t + 'px', 'important');
      while (x.scrollHeight > x.clientHeight + 1 && t > min) { t -= 2; x.style.setProperty('font-size', t + 'px', 'important'); } };
    const h = tete.querySelector('h2'); const base = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    ajuster(h, Math.min(64, Math.max(44, innerWidth * 0.044)), 28);
    ajuster(tete.querySelector('p'), Math.min(21, Math.max(17, innerWidth * 0.015)), 14);
    void base;
  });
};
const bandeauFeuille = (courante) => {
  let t = document.querySelector('.edl-feuille-tete');
  const o = courante && courante.querySelector('.e-open'); const ch = courante && courante.querySelector('.e-opt[aria-pressed="true"]');
  const voir = Boolean(TEL() && o && ch && !courante.classList.contains('edl-feuille-fermee'));
  if (!t) {
    if (!voir) return;
    t = document.createElement('div'); t.className = 'edl-feuille-tete';
    t.innerHTML = '<p class="edl-feuille-q"></p><button type="button" class="edl-feuille-choix"><span></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>'
      + '<button type="button" class="edl-feuille-x" aria-label="Fermer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    t.hidden = true; document.body.appendChild(t);
  }
  const ouvre = voir && t.hidden !== false; t.hidden = !voir; if (!voir) return;
  if (ouvre) requestAnimationFrame(() => t.querySelector('.edl-feuille-choix').focus({ preventScroll: true }));
  // La réponse choisie, puis la question, en haut du panneau (Arnaud, 16 octobre 2026), au-dessus des idées.
  const q = courante.querySelector(':scope > p:first-child'); const tq = t.querySelector('.edl-feuille-q');
  if (q && tq.textContent !== q.textContent) tq.textContent = q.textContent;
  const v = norm(ch.textContent || ''); const r = t.querySelector('.edl-feuille-choix');
  if (r.firstChild.textContent !== v) { r.firstChild.textContent = v; r.setAttribute('aria-label', 'Changer de réponse : ' + v); }
  // Le bandeau suit le haut du panneau, compté depuis le bas (la hauteur ne dépend pas de l'animation d'entrée).
  // Le panneau garde la place du bandeau (sa hauteur dépend de la longueur de la question), puis le bandeau se pose en haut.
  const h = t.offsetHeight + 'px'; if (document.documentElement.style.getPropertyValue('--feuille-tete') !== h) document.documentElement.style.setProperty('--feuille-tete', h);
  const bas = (o.offsetHeight - t.offsetHeight) + 'px'; if (t.style.bottom !== bas) t.style.bottom = bas;
};
const allerPhrase = (n, sansHistorique) => {
  if (!sansHistorique && n > etapePhrase) pousserPas('phrase', n);
  const w = zonePhrases(); const c = w && (w.querySelector('.edl-ph-carte') || w.querySelector(':scope > .edl-merci2'));
  const poser = () => { etapePhrase = n; document.querySelectorAll('.edl-feuille-fermee').forEach((x) => x.classList.remove('edl-feuille-fermee')); etapesPhrases(); scrollTo(0, 0); if (TEL()) focusTitre(document.querySelector('.edl-ph-carte > p:first-child, .edl-merci2:not([hidden]) .edl-merci__titre')); };
  if (!c || calme()) { poser(); return; }
  c.classList.add('edl-etape-sortie');
  setTimeout(() => { c.classList.remove('edl-etape-sortie'); poser(); }, 280);
};
if (page === 'questionnaire') {
  document.addEventListener('click', (e) => {
    if (!document.documentElement.classList.contains('edl-phrases')) return;
    const w = zonePhrases(); if (!w) return;
    const b = e.target.closest('button, a'); if (!b) return;
    const cartes = cartesPhrases(w); const nb = cartes.length; const c = cartes[etapePhrase];
    const t = norm(b.textContent || '');
    if (b.classList.contains('edl-merci2__cta')) {
      const vrai = [...document.querySelectorAll('[data-maquette] button, [data-maquette] a')].find((x) => x.getClientRects().length === 0 && /^Voir mon résultat/.test(norm(x.textContent || ''))) ||
        [...document.querySelectorAll('[data-maquette] button, [data-maquette] a')].find((x) => /^Voir mon résultat/.test(norm(x.textContent || '')) && !x.classList.contains('edl-merci2__cta'));
      if (vrai) vrai.click();
      return;
    }
    if (c && c.contains(b)) {
      const reponse = b.classList.contains('e-opt') || (b.hasAttribute('aria-pressed') && !b.closest('.e-open'));
      // La réponse déjà choisie : rouvre le panneau des idées s'il a été fermé, sinon passe à la suivante.
      if (reponse && b.getAttribute('aria-pressed') === 'true') { e.preventDefault(); e.stopImmediatePropagation(); if (c.classList.contains('edl-feuille-fermee')) { c.classList.remove('edl-feuille-fermee'); bandeauFeuille(c); } else if (!c.querySelector('.e-open')) allerPhrase(etapePhrase + 1); return; }
      if (reponse) {
        c.classList.remove('edl-feuille-fermee');
        // Passer à « En bonne partie » ou « Pleinement » efface les idées cochées (points UX du 16 octobre 2026) : en revenant à
        // « Un peu », on repart d'une liste vierge. L'envoi n'en dépend pas : il ignore déjà les idées des réponses hautes.
        if (/^(En bonne partie|Pleinement)$/.test(t)) c.querySelectorAll('.e-open [role="checkbox"][aria-checked="true"]').forEach((x) => x.click());
        vibrer();
        setTimeout(() => { scrollTo(0, 0); if (b.getAttribute('aria-pressed') === 'true' && !c.querySelector('.e-open') && etapePhrase < nb) allerPhrase(etapePhrase + 1); }, 650);
        setTimeout(() => scrollTo(0, 0), 60);
        return;
      }
      if (/^Question suivante/.test(t)) { e.preventDefault(); e.stopImmediatePropagation(); allerPhrase(etapePhrase + 1); return; }
      return;
    }
    if (/^Retour$/.test(t) && etapePhrase > 0) { e.preventDefault(); e.stopImmediatePropagation(); if (history.state && history.state.edl === 'phrase') history.back(); else allerPhrase(etapePhrase - 1, true); }
  }, true);
  addEventListener('resize', () => etapesPhrases());
}


// ------------------------------------------------------------- la frise des thèmes (ordinateur, 16 phrases)
// En haut des 16 phrases, un petit rond par thème, reliés par un trait : on voit où l'on en est (Arnaud, 15 octobre 2026 :
// « la frise en haut seulement dans le questionnaire, avec les thèmes des questions »). Le profil garde « Étape 1 sur 3 ».
const friseEtapes = () => {
  if (page !== 'questionnaire' || !document.documentElement.classList.contains('edl-phrases')) return;
  const w = zonePhrases(); if (!w) return;
  const cartes = cartesPhrases(w);
  const themes = []; cartes.forEach((c) => { const h = c.parentElement.querySelector('h2'); const t = norm((h && h.textContent) || ''); if (t && !themes.includes(t)) themes.push(t); });
  const cour = w.querySelector('.edl-ph-tete h2'); const k = cour ? themes.indexOf(norm(cour.textContent || '')) : themes.length;
  if (cour) { const v = 'Thème ' + (k + 1) + ' sur ' + themes.length + ','; if (cour.dataset.edlTheme !== v) cour.dataset.edlTheme = v; }
  const intro = w.firstElementChild;
  let f = intro.querySelector(':scope > .edl-frise3');
  if (!f) { f = document.createElement('div'); f.className = 'edl-frise3'; f.setAttribute('aria-hidden', 'true'); intro.prepend(f); }
  const html = themes.map((t, n) => '<span class="edl-frise3__pas' + (n < k ? ' fait' : n === k ? ' actif' : '') + '" title="' + t.replace(/"/g, '&quot;') + '"><i></i></span>').join('');
  if (f.innerHTML !== html) f.innerHTML = html;
};

// Fermer le panneau des idées sur téléphone (points UX du 16 octobre 2026) : la croix, la réponse en haut du panneau, ou un
// toucher au-dessus du panneau. Ce toucher ne fait rien d'autre : il ne coche pas une réponse cachée sous le voile.
if (page === 'questionnaire') addEventListener('click', (e) => {
  if (!TEL() || !document.documentElement.classList.contains('edl-phrases')) return;
  const c = document.querySelector('.edl-ph-carte'); const o = c && c.querySelector('.e-open');
  if (!o || c.classList.contains('edl-feuille-fermee') || !o.getClientRects().length) return;
  if (o.contains(e.target) && !e.target.closest('.edl-feuille-x, .edl-feuille-choix')) return;
  e.preventDefault(); e.stopImmediatePropagation();
  c.classList.add('edl-feuille-fermee'); bandeauFeuille(c);
  const ch = c.querySelector('.e-opt[aria-pressed="true"]'); if (ch && e.target.closest('.edl-feuille-choix')) ch.focus({ preventScroll: true });
}, true);
if (page === 'questionnaire') addEventListener('keydown', (e) => {
  if (!TEL() || (e.key !== 'Escape' && e.key !== 'Tab')) return;
  const c = document.querySelector('.edl-ph-carte'); const o = c && c.querySelector('.e-open'); const t = document.querySelector('.edl-feuille-tete');
  if (!o || !t || t.hidden || c.classList.contains('edl-feuille-fermee')) return;
  if (e.key === 'Escape') { e.preventDefault(); c.classList.add('edl-feuille-fermee'); bandeauFeuille(c); const ch = c.querySelector('.e-opt[aria-pressed="true"]'); if (ch) ch.focus({ preventScroll: true }); return; }
  const l = [...t.querySelectorAll('button'), ...o.querySelectorAll('button, input, textarea, a[href]')].filter((x) => x.getClientRects().length);
  if (!l.length) return; const k = l.indexOf(document.activeElement);
  if (e.shiftKey && k <= 0) { e.preventDefault(); l[l.length - 1].focus(); } else if (!e.shiftKey && (k === l.length - 1 || k < 0)) { e.preventDefault(); l[0].focus(); }
});
if (page === 'questionnaire') addEventListener('popstate', (e) => {
  const st = e.state || {};
  if (document.documentElement.classList.contains('edl-phrases')) { const n = st.edl === 'phrase' ? st.n : 0; if (n !== etapePhrase) allerPhrase(n, true); }
  else if (document.documentElement.classList.contains('edl-pas-a-pas')) { const n = st.edl === 'profil' ? st.n : 0; if (n !== etapeProfil) allerEtape(n, true); }
});

let attente = null;
new MutationObserver(() => { if (attente) return; attente = requestAnimationFrame(() => { attente = null; retoucher(); }); })
  .observe(document.body, { childList: true, subtree: true, characterData: true });
// Un choix qui ne change que des attributs (une pastille cochée) ne réveille pas l'observateur : on retouche aussi après chaque clic.
document.addEventListener('click', () => setTimeout(retoucher, 0), true);
retoucher();
if (page === 'accueil') compteur().then((t) => { total = t; retoucher(); }).catch(() => {});

if (page === 'accueil') evenement('visite');

// ------------------------------------------------------------- le rôle solo
// Les maquettes appellent window.__edlSolo(données, état) à chaque rendu (scripts/solo-maquette.mjs). On y ajoute le
// troisième choix de rôle, et pour un solo ses phrases, ses idées « J'aimerais… » et ses titres de groupes, tirés de
// contenu.json. Pour un manager ou un membre, tout reste comme avant.
const LIBELLES_ROLES = ['En encadrant une équipe', "Au sein d'une équipe", 'En solo ou en profession libérale']; // repli, avant contenu.json
let C = null;
const pretContenu = chargerContenu().then((c) => { C = c; return c; });
window.__edlRole = -1;
window.__edlSolo = (D, st) => {
  try {
    window.__edlRole = st && st.role != null ? st.role : -1;
    if (!D || !D.profil) return;
    D.profil.roles = (C && C.profil.role.libelles) || LIBELLES_ROLES;
    if (!C || !Array.isArray(D.affirmations)) return;
    if (!D.__edlOrigine) D.__edlOrigine = { mi_apres: D.mi_apres, groupes: D.affirmations.map((a) => a.groupe) };
    const solo = window.__edlRole === 2;
    D.affirmations.forEach((a, k) => {
      const c = C.affirmations.find((x) => x.n === a.n); if (!c) return;
      a.solo = c.solo;
      a.relance = a.relance || {};
      // Seulement les idées encore proposées, dans leur ordre ; la maquette garde leur position, fin() la traduit en code
      // (Arnaud, 15 octobre 2026, profil solo recentré).
      if (c.relance && c.relance.solo) a.relance.solo = { debut: c.relance.solo.debut, choix: codesActifs(c.relance.solo).map((i) => c.relance.solo.choix[i]) };
      a.groupe = solo && c.groupe_solo ? c.groupe_solo : D.__edlOrigine.groupes[k];
    });
    if (solo) {
      D.pourquoi = Object.assign({}, D.pourquoi, C.pourquoi_solo || {});
      const k = D.__edlOrigine.groupes.lastIndexOf(D.__edlOrigine.mi_apres);
      D.mi_apres = k >= 0 ? D.affirmations[k].groupe : D.__edlOrigine.mi_apres;
    } else D.mi_apres = D.__edlOrigine.mi_apres;
  } catch (e) { /* le parcours ne doit jamais casser */ }
};

if (page === 'questionnaire') {
  evenement('commence');
  const pret = pretContenu;

  window.__edlFin = async (st) => {
    // Jamais un clic muet : si le lien ne se fabrique pas (un ancien lien.js resté en cache), on recharge lien.js à neuf
    // et on réessaie, sans perdre les réponses.
    try { await fin(st); } catch (e) {
      console.error('[edl] fin du parcours', e);
      try { const frais = await import('../lien.js?t=' + Date.now()); await fin(st, frais.lienResultat); } catch (e2) { console.error('[edl] nouvel essai', e2); }
    }
  };
  const fin = async (st, fabriquer = lienResultat) => {
    const contenu = await pret;
    const P = contenu.profil;
    // La maquette garde des positions dans les listes, le vrai parcours garde les libellés : on traduit.
    const choix = (liste, i) => (i != null && i >= 0 && liste[i] != null ? liste[i] : null);
    // Chaque position correspond à un rôle explicite : plus de « membre » par défaut (13 octobre 2026).
    const role = (P.role.cles || ['manager', 'membre', 'solo'])[st.role];
    // Un rôle qui ne correspond à aucune clé connue (un fichier ancien resté en cache, par exemple) : on n'enregistre rien,
    // et on recharge la page pour repartir avec les bons fichiers (13 octobre 2026).
    if (!role || !['manager', 'membre', 'solo'].includes(role)) { console.error('[edl] rôle inconnu', st.role); location.reload(); return; }
    const profil = {
      role: choix(P.role.choix, st.role),
      genre: choix(P.genre.choix, st.genre),
      // Un solo n'a ni équipe ni taille d'entreprise (13 octobre 2026 : « un solo, il est tout seul »).
      taille_entreprise: role === 'solo' ? '' : choix(P.taille_entreprise.choix, st.te),
      secteur: st.secteur || null,
      // Un solo n'a pas d'équipe : la taille d'équipe reste vide.
      taille_equipe: role === 'solo' ? '' : choix(P.taille_equipe.choix, st.teq),
    };
    const reponses = Array.from({ length: 16 }, (_, k) => Number(st.ans[k + 1]));
    // La maquette garde la position de l'idée dans la liste affichée ; on enregistre son code, qui ne change jamais
    // (Arnaud, 15 octobre 2026, profil solo recentré : « ne réutilise jamais un ancien code pour un autre texte »).
    const rel = {};
    Object.entries(st.rel || {}).forEach(([n, l]) => {
      const r = contenu.affirmations[Number(n) - 1] && contenu.affirmations[Number(n) - 1].relance;
      const codes = codesActifs(r && r[role]);
      rel[n] = Array.isArray(l) ? l.map((i) => (typeof i === 'number' ? codes[i] : i)).filter((i) => i != null) : l;
    });
    const relances = relancesAEnvoyer(reponses, rel, contenu);
    ecrire({ role, profil });

    // Les mots écrits après « Autre », seulement là où « Autre » est encore coché.
    const autres = {};
    Object.keys(relances).forEach((n) => { const t = String(AUTRES[n] || '').trim().slice(0, 140); if (t && (relances[n] || []).includes('autre')) autres[n] = t; });
    // Les réponses solo aux phrases recentrées portent leur propre version, pour les séparer des anciennes dans l'étude
    // (Arnaud, 15 octobre 2026, profil solo recentré). Managers et membres : rien ne change.
    const envoi = { version: role === 'solo' ? 'solo_v2' : 'v1', role, profil, reponses, relances, ...(Object.keys(autres).length ? { autres } : {}) };
    const empreinte = JSON.stringify(envoi);
    if (!dejaEnvoye(empreinte)) { envoyerReponse(envoi); retenirEnvoi(empreinte); }
    try { sessionStorage.removeItem('edl_autres'); } catch (e) { /* rien */ }
    evenement('termine');
    // En démonstration (?demo=1), on le reste jusqu'au résultat.
    const demo = new URLSearchParams(location.search).get('demo') === '1' ? '?demo=1' : '';
    location.href = '/' + fabriquer(role, reponses, relances).replace('#', demo + '#');
  };
}
