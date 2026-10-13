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
import { chargerContenu } from '../contenu.js';
import { relancesAEnvoyer } from '../calcul.js';
import { lienResultat } from '../lien.js';
import { envoyerReponse, compteur } from '../api.js';
import { ecrire, dejaEnvoye, retenirEnvoi } from '../session.js';
import { evenement } from './commun.js';

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
    "En 2 minutes, regardez votre équipe telle que vous la voyez : la confiance, le soutien, la cohésion, l’engagement. Puis découvrez ce que montrent toutes les réponses.", // sans dévoiler le résultat (Arnaud)
  'Un regard clair sur votre façon de travailler ensemble': 'Votre équipe telle que vous la voyez : la confiance, le soutien, la cohésion',
  'Ce qui vous porte déjà': 'Vos réponses à côté de celles de toutes les personnes qui ont répondu',
  'Ce qui peut encore évoluer': "Ce que montre l'étude : ce qui engage une équipe",
  'Une étude pour mieux éclairer les équipes': 'Une étude pour montrer ce qui engage les équipes',
  "Vos réponses, anonymes et regroupées, aident nos intervenants à préparer des ateliers ancrés dans le vécu des équipes, et nos programmes à évoluer. L'étude complète est partagée avec ceux qui le souhaitent.":
    "Vos réponses, anonymes et regroupées, nourrissent une étude : la confiance, le soutien et la cohésion vont-ils avec l'engagement ? Pour nous, la performance n'est pas un objectif : elle en est la conséquence. L'étude complète est partagée avec ceux qui le souhaitent.",
  "Une lecture d'ensemble": 'Votre équipe, thème par thème',
  'En quelques lignes, la façon dont vous travaillez ensemble, vue depuis votre place.':
    "La confiance, le soutien, la cohésion, puis l'engagement et la performance, tels que vous les voyez.",
  'Huit repères, quatre niveaux': "Ce que montre l'étude",
  "Le cap commun, l'info, la confiance, le soutien… Chaque repère prend l'un des quatre niveaux, de « À construire » à « Bien installé ». Jamais de note.":
    'À côté, toutes les réponses : là où la confiance, le soutien et la cohésion sont là, la part des personnes engagées, et celle qui atteint ses objectifs.',
  'Une phrase pour chaque repère': 'Ce que demandent les autres',
  'Ce qui est déjà là, et ce qui peut encore évoluer, dit simplement et sans jugement.':
    'Pour chaque thème, ce que demandent les managers et les équipes. Jamais de note, jamais de jugement.',
  // La version téléphone a ses propres phrases.
  'En 2 minutes, voyez ce qui fonctionne déjà entre vous et ce qui peut encore évoluer. Anonyme, sans compte.':
    'En 2 minutes, votre équipe telle que vous la voyez, à côté de toutes les réponses. Anonyme, sans compte.',
  'De « À construire » à « Bien installé ». Jamais de note.':
    'Là où la confiance, le soutien et la cohésion sont là, la part des personnes engagées.',
  'Ce qui est déjà là, et ce qui peut encore évoluer, dit simplement.':
    'Pour chaque thème, ce que demandent les managers et les équipes.',
  'Un regard clair sur votre façon de travailler ensemble : ce qui vous porte déjà, ce qui peut encore évoluer, et des mots pour en parler.':
    'Votre équipe telle que vous la voyez : la confiance, le soutien, la cohésion. À côté, ce que montrent toutes les réponses : ce qui engage une équipe.',
  'Vos réponses, anonymes et regroupées, aident nos intervenants à préparer des ateliers ancrés dans le vécu des équipes, et nos programmes à évoluer.':
    "Vos réponses, anonymes et regroupées, nourrissent une étude : la confiance, le soutien et la cohésion vont-ils avec l'engagement ? Pour nous, la performance n'est pas un objectif : elle en est la conséquence.",
  'Comment vivez-vous': 'Comment voyez-vous',
  'le travail ensemble ?': 'votre équipe ?',
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
    if (/^(Huit sommets|Un exemple ?de résultat)/.test(t)) s.style.display = 'none';
  });
  if (page === 'accueil') nombre();
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
retoucher();
if (page === 'accueil') compteur().then((t) => { total = t; retoucher(); }).catch(() => {});

if (page === 'accueil') evenement('visite');

if (page === 'questionnaire') {
  evenement('commence');
  const pret = chargerContenu();

  window.__edlFin = async (st) => {
    const contenu = await pret;
    const P = contenu.profil;
    // La maquette garde des positions dans les listes, le vrai parcours garde les libellés : on traduit.
    const choix = (liste, i) => (i != null && i >= 0 && liste[i] != null ? liste[i] : null);
    const role = st.role === 0 ? 'manager' : 'membre';
    const profil = {
      role: choix(P.role.choix, st.role),
      genre: choix(P.genre.choix, st.genre),
      taille_entreprise: choix(P.taille_entreprise.choix, st.te),
      secteur: st.secteur || null,
      taille_equipe: choix(P.taille_equipe.choix, st.teq),
    };
    const reponses = Array.from({ length: 16 }, (_, k) => Number(st.ans[k + 1]));
    const relances = relancesAEnvoyer(reponses, st.rel || {}, contenu);
    ecrire({ role, profil });

    const envoi = { version: 'v1', role, profil, reponses, relances };
    const empreinte = JSON.stringify(envoi);
    if (!dejaEnvoye(empreinte)) { envoyerReponse(envoi); retenirEnvoi(empreinte); }
    evenement('termine');
    location.href = '/' + lienResultat(role, reponses, relances);
  };
}
