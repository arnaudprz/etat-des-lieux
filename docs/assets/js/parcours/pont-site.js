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
import { chargerContenu } from '../contenu.js?v=35';
import { relancesAEnvoyer } from '../calcul.js?v=35';
import { lienResultat } from '../lien.js?v=35';
import { envoyerReponse, compteur } from '../api.js?v=35';
import { ecrire, dejaEnvoye, retenirEnvoi } from '../session.js?v=35';
import { evenement } from './commun.js?v=35';

const page = document.documentElement.dataset.edl || '';

// ---------------------------------------------------------------- l'habillage
// Les maquettes se redessinent elles-mêmes : on les retouche à chaque rendu, sans toucher à leur code.

const norm = (t) => t.replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();

// Les textes de l'accueil, réécrits dans notre thèse (Arnaud, 13 octobre 2026) : la confiance, le soutien et la cohésion
// engagent une équipe ; la performance n'est pas un objectif, elle en est la conséquence. Pas de note, pas de jugement.
const TEXTES = {
  'Ce qui vous aide': 'La confiance, le soutien,',
  'à bien travailler': 'la cohésion :',
  'ensemble': 'ce qui engage',
  "En 2 minutes, voyez ce qui fonctionne déjà entre vous et ce qui peut encore évoluer. De quoi mettre des mots justes sur ce que vous vivez.":
    "Regardez votre équipe telle que vous la voyez : la confiance, le soutien, la cohésion, l’engagement. Puis découvrez ce que montrent toutes les réponses.", // sans dévoiler le résultat (Arnaud)
  // « Ce que vous y gagnez » parle aux équipes comme aux solos : on le lit avant de choisir son profil (Arnaud, 13 octobre 2026).
  'Un regard clair sur votre façon de travailler ensemble': 'Votre équipe ou votre activité, telle que vous la voyez : la confiance, le soutien, la cohésion',
  'Ce qui vous porte déjà': 'Vos réponses à côté de celles de personnes qui travaillent comme vous',
  'Ce qui peut encore évoluer': "Ce que montre l'étude : ce qui nourrit l'engagement",
  'Des mots pour en parler, avec vos collègues ou votre manager': 'Des mots pour en parler, avec votre équipe, votre manager ou votre collectif',
  'Une étude pour mieux éclairer les équipes': "Une étude pour montrer ce qui nourrit l'engagement",
  "Vos réponses, anonymes et regroupées, aident nos intervenants à préparer des ateliers ancrés dans le vécu des équipes, et nos programmes à évoluer. L'étude complète est partagée avec ceux qui le souhaitent.":
    "Vos réponses restent anonymes. Regroupées, elles servent une étude qui vérifie une idée simple : quand la confiance, le soutien et la cohésion sont là, on s'engage davantage, et les résultats suivent. En équipe comme à son compte. L'étude complète est partagée avec ceux qui le souhaitent.", // texte validé le 13 octobre 2026 (ordinateur)
  // « Ce que vous recevez en 2 minutes » : quatre blocs ancrés dans ce que la personne vit vraiment (Arnaud, 13 octobre 2026).
  "Une lecture d'ensemble": 'Votre équipe, telle que vous la voyez',
  'En quelques lignes, la façon dont vous travaillez ensemble, vue depuis votre place.':
    "16 phrases simples, comme « Je peux parler franchement à mon manager, y compris d'une erreur ». Pour la confiance, le soutien, la cohésion, puis l'engagement et la performance : un chiffre sur 100. Votre regard, pas une note.",
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
    "Vos réponses restent anonymes. Regroupées, elles servent une étude qui vérifie une idée simple : quand la confiance, le soutien et la cohésion sont là, on s'engage davantage, et les résultats suivent. En équipe comme à son compte. L'étude complète est partagée avec ceux qui le souhaitent.", // la même phrase sur téléphone
  // L'introduction du profil (Arnaud, 13 octobre 2026 : « ce texte n'est pas top »).
  "Pour lire vos réponses à côté de celles d'équipes qui vous ressemblent, quand elles seront assez nombreuses. Rien ne permet de vous identifier.":
    'Quelques mots pour vous situer parmi toutes les réponses, en équipe ou à votre compte. Rien ne permet de vous identifier.',
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
  // La signature de Greatly, juste sous le titre (Arnaud, 13 octobre 2026).
  const h1 = hero.querySelector('h1');
  if (h1 && !(h1.nextElementSibling && h1.nextElementSibling.classList.contains('edl-signature'))) {
    hero.querySelectorAll('.edl-signature').forEach((x) => x.remove());
    const sg = document.createElement('p'); sg.className = 'edl-signature';
    sg.textContent = 'Greatly éclaire les dirigeants, les talents clés et les équipes qui font rayonner l’entreprise.';
    h1.after(sg);
  }
  // Une petite frise des trois étapes, sous le haut de page, dans la même DA que la carte du nombre (Arnaud, 13 octobre 2026).
  if (!hero.querySelector('.edl-frise')) {
    const f = document.createElement('ol'); f.className = 'edl-frise';
    f.innerHTML = [
      ['Votre façon de travailler', 'En équipe ou à votre compte, la taille de l’entreprise, le secteur.'],
      ['16 phrases', 'Pour chacune, de « Pas encore » à « Pleinement ». Environ 2 minutes.'],
      ['Votre état des lieux', 'Votre regard, comparé à des centaines de réponses.'],
    ].map(([t, d], k) => '<li><span class="edl-frise__num">' + (k + 1) + '</span><span class="edl-frise__titre">' + t + '</span><span class="edl-frise__texte">' + d + '</span></li>').join('');
    const nb = hero.querySelector('.edl-nombre');
    if (m.dataset.maquette === 'MEtatDesLieux') { f.classList.add('edl-frise--mobile'); nb.after(f); } else nb.parentElement.appendChild(f);
  }
  if ('IntersectionObserver' in window && !anime) {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); lancer(b); } }); io.observe(b);
  } else if (!anime) lancer(b);
};
const retoucher = () => {
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    const t = norm(n.nodeValue || ''); if (!t) continue;
    if (TEXTES_N[t]) { const v = n.nodeValue.match(/^\s*/)[0] + TEXTES_N[t] + n.nodeValue.match(/\s*$/)[0]; if (n.nodeValue !== v) n.nodeValue = v; }
    else if (total != null && t === '255' && n.parentElement && /participé/.test(n.parentElement.parentElement?.textContent || '')) n.nodeValue = String(total);
  }
  // L'exemple de résultat de la maquette (huit sommets, quatre niveaux) n'existe plus : on le retire.
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
  if (page === 'accueil') nombre();
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
  // Aucun lien vers les nouveaux sites de Greatly ni vers les préprods (Arnaud, 13 octobre 2026). La politique de
  // confidentialité renvoie à celle de l'état des lieux ; les autres liens (rendez-vous, mentions…) disparaissent.
  // Le logo GREATLY reste en haut à gauche, et ramène à l'accueil de l'état des lieux (la maquette le remet à chaque rendu).
  document.querySelectorAll('[data-maquette] header a').forEach((a) => { if (a.getAttribute('href') !== '/') a.setAttribute('href', '/'); });
  document.querySelectorAll('a[href]').forEach((a) => {
    const h = a.getAttribute('href') || '';
    if (!/arnaudprz\.github\.io|(^|\/\/)(www\.)?greatly\.club/.test(h)) return;
    if (/confidentialit/i.test(a.textContent || '')) { a.setAttribute('href', '/etat-des-lieux/confidentialite/'); return; }
    a.style.display = 'none';
    const n = a.nextSibling; // le séparateur « · » qui suivait le lien retiré
    if (n && n.nodeType === 3 && /^\s*·\s*$/.test(n.nodeValue)) n.nodeValue = '';
  });
};

const style = document.createElement('style');
style.textContent = [
  // Plus de menu en haut (Arnaud, 13 octobre 2026) : le logo seul.
  '[data-maquette] header nav, [data-maquette] header > div > div, [data-maquette] header > button { display: none !important; }',
  // Ni les liens du pied de page : il garde le logo et les mentions légales.
  '[data-maquette] footer > div:not(:last-child), [data-maquette] footer > details, [data-maquette] footer > p:not(:last-child) { display: none !important; }',
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
  '.edl-signature { margin: 0.25rem 0 0; font-family: "Bricolage Grotesque", sans-serif; font-weight: 500; font-size: 1.25rem; line-height: 1.35; color: #23545B; max-width: 34rem; }',
  '[data-maquette="MEtatDesLieux"] .edl-signature { font-size: 1.0625rem; margin: 12px 0 0; }',
  '.edl-frise { flex: 1 1 100%; list-style: none; margin: 0.5rem 0 0; padding: 1.75rem 2rem; border-radius: 1.5rem; background: #FFFFFF; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2rem; position: relative; animation: edlMonte .8s .15s cubic-bezier(.2,.7,.2,1) both; }',
  '.edl-frise li { position: relative; display: flex; flex-direction: column; gap: 0.375rem; }',
  '.edl-frise li:not(:last-child)::after { content: ""; position: absolute; top: 1rem; left: 2.75rem; right: -1.25rem; height: 2px; background: #DCE8EA; }',
  '.edl-frise__num { width: 2rem; height: 2rem; border-radius: 999px; background: #23545B; color: #FFFFFF; display: inline-flex; align-items: center; justify-content: center; font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 1rem; margin-bottom: 0.5rem; }',
  '.edl-frise li:last-child .edl-frise__num { background: #B4F25C; color: #0C1011; }',
  '.edl-frise__titre { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 1.25rem; letter-spacing: -0.02em; color: #0C1011; }',
  '.edl-frise__texte { font-size: 1rem; line-height: 1.45; color: #455051; }',
  '.edl-frise--mobile { grid-template-columns: 1fr; gap: 1.25rem; margin: 12px 0 6px; padding: 22px 20px; }',
  '.edl-frise--mobile li { padding-left: 3rem; }',
  '.edl-frise--mobile .edl-frise__num { position: absolute; left: 0; top: 0; margin: 0; }',
  '.edl-frise--mobile li:not(:last-child)::after { top: 2.5rem; bottom: -1rem; left: 0.9375rem; right: auto; width: 2px; height: auto; }',
  // La carte du nombre : à droite du texte, à sa hauteur, sans flotter.
  '.edl-hero-section { min-height: 0 !important; }',
  '.edl-hero { display: flex; align-items: stretch; justify-content: space-between; gap: 3rem; padding-bottom: 4.5rem !important; }',
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
      if (c.relance && c.relance.solo) a.relance.solo = { debut: c.relance.solo.debut, choix: c.relance.solo.choix };
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
      taille_entreprise: choix(P.taille_entreprise.choix, st.te),
      secteur: st.secteur || null,
      // Un solo n'a pas d'équipe : la taille d'équipe reste vide.
      taille_equipe: role === 'solo' ? '' : choix(P.taille_equipe.choix, st.teq),
    };
    const reponses = Array.from({ length: 16 }, (_, k) => Number(st.ans[k + 1]));
    const relances = relancesAEnvoyer(reponses, st.rel || {}, contenu);
    ecrire({ role, profil });

    const envoi = { version: 'v1', role, profil, reponses, relances };
    const empreinte = JSON.stringify(envoi);
    if (!dejaEnvoye(empreinte)) { envoyerReponse(envoi); retenirEnvoi(empreinte); }
    evenement('termine');
    // En démonstration (?demo=1), on le reste jusqu'au résultat.
    const demo = new URLSearchParams(location.search).get('demo') === '1' ? '?demo=1' : '';
    location.href = '/' + fabriquer(role, reponses, relances).replace('#', demo + '#');
  };
}
