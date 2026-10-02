/**
 * Vérifie la passe 14 (page résultat, mise en page F), critère par critère.
 *
 * Chaque critère ✅ du document devient une ligne OK ou KO, dans Chromium et
 * WebKit, à 1440, 1024, 390 et 360 de large. Le backend est toujours simulé : aucune
 * requête n'atteint l'API de production, rien ne s'écrit dans le classeur.
 *
 * Usage :
 *   node scripts/verif/passe14.mjs [URL_DE_BASE] [--points 1,2,5] [--captures avant|apres]
 *
 *   --points    ne vérifie que ces points (par défaut : tous ceux écrits ici)
 *   --captures  prend les captures de toutes les pages dans captures/passe14/<dossier>/
 */

import { chromium, webkit } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const option = (nom) => {
  const i = args.indexOf(nom);
  return i === -1 ? null : args[i + 1];
};
const BASE = args.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:8127';
const POINTS = option('--points') ? option('--points').split(',').map(Number) : null;
const CAPTURES = option('--captures');

if (!/127\.0\.0\.1|localhost/.test(BASE)) {
  console.error('passe14 : uniquement contre le serveur local (npm run local).');
  process.exit(2);
}

const NAVIGATEURS = [
  { nom: 'chromium', lanceur: chromium },
  { nom: 'webkit', lanceur: webkit },
];
const LARGEURS = [1440, 1024, 390, 360];

/** Réponses de référence (préréglage de la maquette), membre et manager. */
const REPONSES = [2, 2, 1, 1, 2, 2, 0, 0, 2, 3, 2, 2, 2, 2, 2, 1];
const LIEN_MEMBRE = '#v2-m2211220023222221';
const LIEN_MANAGER = '#v2-g2211220023222221';
/** Les liens de test de la passe 14. */
const LIEN_AUDIT = '#v2-m1230231212302312';
const LIEN_AUDIT_MANAGER = '#v2-g1230231212302312';
const LIEN_TOUT_ENRACINE = '#v2-m3333333333333333';
const LIEN_TOUT_SEMER = '#v2-m0000000000000000';
/** Un membre avec des idées sur 3 affirmations (1, 4 et 7, toutes répondues 0 ou 1). */
const LIEN_IDEES = '#v2-m1230231212302312-1.0-4.1-7.0';
/** 16 réponses dont exactement 3 ouvrent une relance (3, 4 et 7). */
const REPONSES_TROIS_RELANCES = [2, 2, 1, 1, 2, 2, 0, 2, 2, 3, 2, 2, 2, 2, 2, 3];

const contenu = JSON.parse(readFileSync(join(racine, 'docs/assets/data/contenu.json'), 'utf8'));

// ------------------------------------------------------------------ outillage

/** Ouvre une page et attend qu'elle soit stable (même règle que parcours.mjs). */
async function aller(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
}

/** Le backend, simulé. Toute requête vers Apps Script reçoit une réponse locale. */
async function simulerLeBackend(contexte) {
  await contexte.route(/script\.google(usercontent)?\.com/, (route) => {
    const url = route.request().url();
    let corps = { ok: true };
    if (url.includes('action=compteur')) corps = { ok: true, total: 255 };
    if (url.includes('action=agregats')) corps = { ok: true, ensemble: null, segments: {} };
    return route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(corps),
    });
  });
}

async function remplirProfil(page, role = 'membre') {
  await page.waitForSelector('.pilules');
  await page.locator('input[name="role"]').nth(role === 'manager' ? 0 : 1).check();
  await page.locator('input[name="genre"]').nth(0).check();
  await page.locator('input[name="taille_entreprise"]').nth(2).check();
  await page.locator('input[name="taille_equipe"]').nth(1).check();
  // Un profil déjà saisi dans cet onglet garde son secteur, champ replié.
  if (!(await page.locator('#secteur').isVisible())) return;
  await page.fill('#secteur', 'sante');
  await page.waitForSelector('#secteurs li');
  await page.locator('#secteurs .secteurs__choix', { hasText: /^Santé$/ }).first().click();
}

/** Profil rempli, puis la page des affirmations. */
async function allerAuxQuestions(page, role = 'membre') {
  await aller(page, `${BASE}/profil.html`);
  await remplirProfil(page, role);
  await page.locator('[data-continuer]').click();
  await page.waitForSelector('.affirmation', { timeout: 20000 });
  await page.waitForTimeout(300);
}

async function repondre(page, reponses) {
  for (let i = 0; i < reponses.length; i++) {
    await page.locator('.affirmation').nth(i).locator('.echelle__choix').nth(reponses[i]).click();
  }
  await page.waitForTimeout(400);
}

async function allerAuResultat(page, lien = LIEN_MEMBRE) {
  // D'un résultat à l'autre seul le hash change, et la page se recharge
  // d'elle-même (hashchange) : on repart d'une page vierge pour ne pas lire
  // pendant ce rechargement.
  await page.goto('about:blank');
  await aller(page, `${BASE}/resultat.html${lien}`);
  await page.waitForSelector('[data-resultat]:not([hidden])', { timeout: 15000 });
  await page.waitForTimeout(300);
}

/** Boîte d'un élément, ou null s'il n'est pas rendu. */
async function boite(page, selecteur) {
  return page.evaluate((s) => {
    const n = document.querySelector(s);
    if (!n) return null;
    const r = n.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return { x: r.left, y: r.top, l: r.width, h: r.height, bas: r.bottom, droite: r.right };
  }, selecteur);
}

/** Bord gauche du premier texte réellement rendu dans un élément. */
async function bordGaucheTexte(page, selecteur) {
  return page.evaluate((s) => {
    const n = document.querySelector(s);
    if (!n) return null;
    const marche = document.createTreeWalker(n, NodeFilter.SHOW_TEXT, {
      acceptNode: (t) => (t.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    while (marche.nextNode()) {
      const plage = document.createRange();
      plage.selectNodeContents(marche.currentNode);
      const r = plage.getClientRects()[0];
      if (r && r.width) return r.left;
    }
    return null;
  }, selecteur);
}

/**
 * Contraste WCAG entre la couleur du texte d'un élément et le fond sur lequel
 * il est posé (le premier ancêtre au fond opaque). Renvoie une liste
 * { texte, ratio } pour chaque élément du sélecteur.
 */
async function contrastes(page, selecteur) {
  return page.evaluate((s) => {
    const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number);
    const lum = ([r, g, b]) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const fond = (n) => {
      for (let x = n; x; x = x.parentElement) {
        const c = rgb(getComputedStyle(x).backgroundColor);
        if (c.length >= 3 && (c.length === 3 || c[3] > 0.5)) return c.slice(0, 3);
      }
      return [255, 255, 255];
    };
    return Array.from(document.querySelectorAll(s))
      .filter((n) => n.getBoundingClientRect().width && n.textContent.trim())
      .map((n) => {
        const a = lum(rgb(getComputedStyle(n).color).slice(0, 3));
        const b = lum(fond(n));
        return { texte: n.textContent.trim().slice(0, 30), ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
      });
  }, selecteur);
}

/** Texte affiché, ramené à des espaces et apostrophes simples. */
const brut = (t) => String(t).replace(/[\u00a0\u202f]/g, ' ').replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();

const pres = (a, b, tol = 1) => a != null && b != null && Math.abs(a - b) <= tol;
const arrondi = (v) => (v == null ? 'absent' : Math.round(v * 10) / 10);

// ------------------------------------------------------------- les critères

/**
 * Chaque critère : point, intitulé, largeurs concernées, et une fonction qui
 * reçoit { page, contexte, largeur, navigateur } et renvoie true, ou un texte
 * qui dit ce qui ne va pas.
 */
const CRITERES = [];
const critere = (point, intitule, largeurs, verifier) =>
  CRITERES.push({ point, intitule, largeurs, verifier });

// >>> POINTS
// Point 1 · les textes
critere(1, 'contenu.json valide, bloc resultat sans a_noter', [1440], async () => {
  const c = JSON.parse(readFileSync(join(racine, 'docs/assets/data/contenu.json'), 'utf8'));
  return (c.resultat && c.resultat.a_noter === undefined) || 'bloc resultat absent ou a_noter présent';
});

critere(1, 'test unitaire : 5 thèmes reliés à 5 dimensions distinctes', [1440], async ({ navigateur }) => {
  if (navigateur !== 'chromium') return true;
  const { execFileSync } = await import('node:child_process');
  try {
    execFileSync(process.execPath, ['--test', 'tests/resultat.test.js'], { cwd: racine, stdio: 'pipe' });
    return true;
  } catch (e) {
    return String(e.stdout || e.message).split('\n').filter((l) => /not ok/.test(l)).slice(0, 3).join(' | ');
  }
});

critere(1, 'aucun chiffre visible hors lien, confidentialité et « début 2027 »', [1440, 390], async ({ page }) => {
  for (const lien of [LIEN_AUDIT, LIEN_AUDIT_MANAGER, LIEN_IDEES]) {
    await allerAuResultat(page, lien);
    const trouves = await page.evaluate((exception) => {
      // « Étape 3 sur 3 » (en-tête mobile, passe 11) est de la navigation, pas le résultat.
      const exclus = (n) => n.closest('[data-lien], .lien-perso__details, footer.pied p:first-of-type, .etapes__mobile, script, style');
      const marche = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const sortie = [];
      while (marche.nextNode()) {
        const t = marche.currentNode;
        const parent = t.parentElement;
        if (!parent || exclus(parent) || !parent.getClientRects().length) continue;
        // Exceptions : « début 2027 » (prévue par le prompt), « 6 mois » et « 8 dimensions »,
        // que les textes imposés par le même prompt contiennent.
        const texte = t.nodeValue.split(exception).join('').replace(/6[\s\u00a0\u202f]mois/g, '').replace(/8[\s\u00a0\u202f]dimensions/g, '');
        if (/[0-9%]/.test(texte)) sortie.push(texte.trim().slice(0, 50));
      }
      return sortie;
    }, contenu.resultat.rester.etude.match(/début \d{4}/)[0]);
    if (trouves.length) return `${lien} : ${trouves.slice(0, 3).join(' | ')}`;
  }
  return true;
});
// Point 2 · l'ordre de la page
critere(2, 'les blocs dans l’ordre demandé', [1440, 390], async ({ page }) => {
  await allerAuResultat(page, LIEN_IDEES);
  const ordre = await page.evaluate(() => {
    const reperes = [
      ['entete', 'header.entete'], ['haut', '.resultat__haut'], ['ensemble', '#ensemble'],
      ['appuis', '#appuis'], ['envies', '#envies'], ['idees16', '[data-idees-resultats]'],
      ['lecture', '#lecture'], ['revenir', '#revenir'], ['partage', '.partage'], ['pied', 'footer.pied'],
    ];
    const noeuds = reperes.map(([n, s]) => [n, document.querySelector(s)]);
    const absents = noeuds.filter(([, x]) => !x).map(([n]) => n);
    if (absents.length) return `absents : ${absents.join(', ')}`;
    for (let i = 1; i < noeuds.length; i++) {
      const [na, a] = noeuds[i - 1]; const [nb, b] = noeuds[i];
      if (!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)) return `${nb} avant ${na}`;
    }
    const lien = document.querySelector('#lien-personnel');
    if (lien.compareDocumentPosition(document.querySelector('#lecture')) & Node.DOCUMENT_POSITION_FOLLOWING) return 'le lien est avant le bloc Greatly';
    return true;
  });
  return ordre;
});

critere(2, 'aucun « À noter »', [1440], async ({ page }) => {
  await allerAuResultat(page, LIEN_AUDIT);
  const t = await page.evaluate(() => document.body.textContent);
  return !/À noter/.test(t) || '« À noter » présent';
});

critere(2, 'aucun débordement horizontal', [390, 360], async ({ page }) => {
  for (const lien of [LIEN_AUDIT, LIEN_IDEES, LIEN_TOUT_ENRACINE]) {
    await allerAuResultat(page, lien);
    const d = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (d > 1) return `${lien} : ${d}px de débordement`;
  }
  return true;
});
// Point 3 · largeurs, titres et espacements
critere(3, 'conteneur de chaque bande à 1040px', [1440], async ({ page }) => {
  await allerAuResultat(page, LIEN_IDEES);
  const largeurs = await page.locator('[data-resultat] .bande-page__contenu').evaluateAll((ns) =>
    ns.filter((n) => n.getBoundingClientRect().height).map((n) => Math.round(n.getBoundingClientRect().width)));
  const f = largeurs.find((l) => l !== 1040);
  return f == null || `largeurs : ${largeurs.join(', ')}`;
});

critere(3, 'h2 : 48px pour les chapitres, 30px pour les blocs pratiques', [1440], async ({ page }) => {
  await allerAuResultat(page, LIEN_IDEES);
  const m = await page.evaluate(() => {
    const t = (s) => { const n = document.querySelector(s); return n ? getComputedStyle(n).fontSize : 'absent'; };
    return {
      chapitres: ['#ensemble h2', '#appuis h2', '#envies h2', '#lecture h2'].map(t),
      pratiques: ['#lien-personnel h2', '#revenir form h2'].map(t),
    };
  });
  const ok = m.chapitres.every((x) => x === '48px') && m.pratiques.every((x) => x === '30px');
  return ok || `chapitres ${m.chapitres.join('/')}, pratiques ${m.pratiques.join('/')}`;
});
// Point 4 · l'en-tête devient le sommaire
critere(4, 'en-tête : plus d’étapes, une nav de 4 liens et un bouton vers le lien', [1440], async ({ page }) => {
  await allerAuResultat(page, LIEN_IDEES);
  const m = await page.evaluate(() => {
    const e = document.querySelector('header.entete');
    const nav = e.querySelector('nav');
    return {
      texte: e.innerText,
      liens: nav ? Array.from(nav.querySelectorAll('a')).filter((a) => a.getClientRects().length).length : 0,
      bouton: Boolean(e.querySelector('a[href="#lien-personnel"]')),
    };
  });
  if (/Profil|Vos réponses/.test(m.texte)) return 'les étapes sont encore visibles';
  if (m.liens !== 4) return `${m.liens} liens dans la nav`;
  return m.bouton || 'pas de bouton vers #lien-personnel';
});

critere(4, 'la barre reste en haut après 3000px de défilement', [1440], async ({ page }) => {
  await allerAuResultat(page, LIEN_IDEES);
  await page.evaluate(() => window.scrollTo(0, 3000));
  await page.waitForTimeout(300);
  const haut = await page.evaluate(() => document.querySelector('header.entete').getBoundingClientRect().top);
  return haut === 0 || `barre à ${haut}px`;
});

critere(4, '« Vos envies » à l’écran : seul son lien est actif', [1440], async ({ page }) => {
  await allerAuResultat(page, LIEN_IDEES);
  await page.evaluate(() => {
    const e = document.querySelector('#envies');
    window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 80);
  });
  await page.waitForTimeout(700);
  const actifs = await page.evaluate(() => Array.from(document.querySelectorAll('header.entete nav a[aria-current="location"]')).map((a) => a.getAttribute('href')));
  return (actifs.length === 1 && actifs[0] === '#envies') || `actifs : ${actifs.join(', ') || 'aucun'}`;
});

critere(4, 'un clic sur « Ce qui porte » : le titre n’est pas sous la barre', [1440], async ({ page }) => {
  await allerAuResultat(page, LIEN_IDEES);
  await page.locator('header.entete nav a[href="#appuis"]').click();
  await page.waitForTimeout(1500);
  const m = await page.evaluate(() => ({
    barre: document.querySelector('header.entete').getBoundingClientRect().bottom,
    titre: document.querySelector('#appuis h2').getBoundingClientRect().top,
    focus: document.activeElement === document.querySelector('#appuis h2'),
  }));
  if (m.titre < m.barre - 1) return `titre à ${arrondi(m.titre)}px, barre jusqu’à ${arrondi(m.barre)}px`;
  return m.focus || 'le focus n’est pas sur le titre';
});

critere(4, 'mobile : en-tête inchangé, pas de sommaire', [390], async ({ page }) => {
  await allerAuResultat(page, LIEN_IDEES);
  const m = await page.evaluate(() => {
    const e = document.querySelector('header.entete');
    const nav = e.querySelector('nav');
    return { etape: e.querySelector('.etapes__mobile').getClientRects().length > 0, nav: Boolean(nav && nav.getClientRects().length) };
  });
  return (m.etape && !m.nav) || `étape visible ${m.etape}, sommaire visible ${m.nav}`;
});

critere(4, 'tout enraciné : pas de lien « Ce qui a envie de grandir »', [1440], async ({ page }) => {
  await allerAuResultat(page, LIEN_TOUT_ENRACINE);
  const n = await page.locator('header.entete nav a[href="#envies"]').evaluateAll((ns) => ns.filter((a) => a.getClientRects().length).length);
  return n === 0 || 'le lien est présent';
});
// Point 5 · « Vos appuis » en cartes
critere(5, 'appuis : une carte par dimension, pleine largeur si seule ou avec une idée', [1440], async ({ page }) => {
  for (const lien of [LIEN_AUDIT, LIEN_IDEES]) {
    await allerAuResultat(page, lien);
    const m = await page.evaluate(() => {
      const largeur = (n) => n.getBoundingClientRect().width;
      const cartes = Array.from(document.querySelectorAll('#appuis .bande__ligne'));
      const corps = (n) => largeur(n.parentElement);
      return cartes.map((c) => ({
        pleine: Math.abs(largeur(c) - corps(c)) < 2,
        attendue: c.classList.contains('bande__ligne--idee') || c.closest('.bande').classList.contains('bande--seule'),
        fond: getComputedStyle(c).backgroundColor,
      }));
    });
    if (!m.length) return `${lien} : aucune carte`;
    const f = m.findIndex((x) => x.pleine !== x.attendue || x.fond !== 'rgb(255, 255, 255)');
    if (f >= 0) return `${lien} : carte ${f + 1} pleine largeur ${m[f].pleine}, attendue ${m[f].attendue}`;
  }
  return true;
});

critere(5, 'appuis : au moins 250px plus court que les bandes d’avant', [1440], async ({ page, navigateur }) => {
  const avant = JSON.parse(readFileSync(join(racine, 'captures/passe14/avant/mesures.json'), 'utf8')).appuis_1440[navigateur];
  await allerAuResultat(page, LIEN_AUDIT);
  const h = await page.evaluate(() => document.querySelector('#appuis [data-appuis-niveaux]').getBoundingClientRect().height);
  return h <= avant - 250 || `${Math.round(h)}px contre ${Math.round(avant)}px avant`;
});

critere(5, 'mobile : les bandes d’appuis comme avant', [390], async ({ page }) => {
  await allerAuResultat(page, LIEN_AUDIT);
  const m = await page.evaluate(() => {
    const b = document.querySelector('#appuis .bande');
    const e = b.querySelector('.bande__entete');
    return { fond: getComputedStyle(e).backgroundColor, scene: getComputedStyle(b.querySelector('.bande__scene')).display, pousse: getComputedStyle(b.querySelector('.bande__pousse')).display };
  });
  return (m.fond !== 'rgba(0, 0, 0, 0)' && m.scene === 'none' && m.pousse !== 'none') || JSON.stringify(m);
});
// Point 6 · « Vos envies »
critere(6, 'envies : pas de filet au-dessus de la première dimension d’un niveau', [1440], async ({ page }) => {
  for (const lien of [LIEN_AUDIT, LIEN_TOUT_SEMER, LIEN_IDEES]) {
    await allerAuResultat(page, lien);
    const fautifs = await page.evaluate(() => Array.from(document.querySelectorAll('#envies .bande__ligne:first-child'))
      .filter((n) => parseFloat(getComputedStyle(n).borderTopWidth) > 0).length);
    if (fautifs) return `${lien} : ${fautifs} première(s) dimension(s) avec un filet`;
  }
  return true;
});

critere(6, 'envies : le chapeau, en 15px sur mobile', [1440, 390], async ({ page, largeur }) => {
  await allerAuResultat(page, LIEN_TOUT_SEMER);
  const m = await page.evaluate(() => {
    const n = document.querySelector('#envies .chapitre__intro');
    return { texte: n ? n.textContent.trim() : '', taille: n ? getComputedStyle(n).fontSize : '', vu: Boolean(n && n.getClientRects().length) };
  });
  if (!m.vu || brut(m.texte) !== brut(contenu.resultat.envies.intro)) return `chapeau « ${m.texte} »`;
  return largeur > 599 || m.taille === '15px' || `chapeau en ${m.taille}`;
});
// Point 7 · « Notre lecture »
critere(7, 'lecture : 5 cartes thèmes, un témoignage, aucune pastille de thème', [1440, 390], async ({ page }) => {
  await allerAuResultat(page, LIEN_AUDIT);
  const m = await page.evaluate(() => ({
    cartes: document.querySelectorAll('#lecture [id^="lecture-"]').length,
    temoignage: document.querySelectorAll('#lecture .lecture__temoignage').length,
    pastillesTheme: document.querySelectorAll('#lecture .greatly__themes, #lecture .theme-pastille').length,
  }));
  return (m.cartes === 5 && m.temoignage === 1 && m.pastillesTheme === 0) || JSON.stringify(m);
});

critere(7, 'lecture : icône et niveau calculés pour la personne', [1440], async ({ page }) => {
  const { calculer } = await import(join(racine, 'docs/assets/js/calcul.js'));
  const { decoder } = await import(join(racine, 'docs/assets/js/lien.js'));
  for (const lien of [LIEN_AUDIT, LIEN_TOUT_SEMER, LIEN_TOUT_ENRACINE]) {
    const lu = decoder(lien, contenu);
    const dims = calculer(lu.reponses, contenu, lu.role).dimensions;
    await allerAuResultat(page, lien);
    for (const t of contenu.resultat.greatly.themes) {
      const d = dims.find((x) => x.cle === t.dimension);
      const lu2 = await page.evaluate((cle) => {
        const c = document.getElementById(`lecture-${cle}`);
        if (!c) return null;
        return { niveau: c.querySelector('.lecture__niveau').textContent.trim(), icone: c.querySelector('.lecture__icone').getAttribute('src') };
      }, t.dimension);
      if (!lu2) return `${lien} : carte ${t.nom} absente`;
      if (brut(lu2.niveau) !== brut(d.niveau.nom) || !lu2.icone.endsWith(`icone-${d.niveau.cle}.svg`)) {
        return `${lien} : ${t.nom} montre ${lu2.niveau} (${lu2.icone}) au lieu de ${d.niveau.nom}`;
      }
    }
  }
  return true;
});

critere(7, 'lecture : noms manager quand ils existent', [1440], async ({ page }) => {
  await allerAuResultat(page, LIEN_AUDIT_MANAGER);
  const nom = await page.evaluate(() => document.querySelector('#lecture-manager .lecture__dimension').textContent.trim());
  return brut(nom) === brut(contenu.dimensions.find((d) => d.cle === 'manager').nom_manager) || `« ${nom} »`;
});

critere(7, 'lecture : aucun chiffre ni pourcentage dans les cartes', [1440], async ({ page }) => {
  await allerAuResultat(page, LIEN_AUDIT);
  const t = await page.evaluate(() => Array.from(document.querySelectorAll('#lecture [id^="lecture-"], #lecture .lecture__temoignage')).map((n) => n.innerText).join(' '));
  return !/[0-9%]/.test(t) || 'chiffre trouvé';
});
// Point 8 · « Garder et revenir »
critere(8, 'le lien puis le formulaire, dans #revenir', [1440, 390], async ({ page }) => {
  await allerAuResultat(page, LIEN_AUDIT);
  return page.evaluate(() => {
    const r = document.querySelector('#revenir');
    const lien = r && r.querySelector('#lien-personnel');
    const form = r && r.querySelector('form');
    if (!lien || !form) return 'lien ou formulaire hors de #revenir';
    return Boolean(lien.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING) || 'le formulaire est avant le lien';
  });
});

critere(8, 'plus de bloc « 6 mois », formulaire de l’étude globale sans icônes', [1440, 390], async ({ page }) => {
  // Décision d'Arnaud après la passe : le rappel à 6 mois est retiré.
  await allerAuResultat(page, LIEN_AUDIT);
  const m = await page.evaluate(() => ({
    six: /6[\s\u00a0\u202f]mois/.test(document.querySelector('#revenir').innerText),
    icones: document.querySelectorAll('#revenir form img').length,
    titre: document.querySelector('#revenir form h2').textContent,
  }));
  if (m.six) return 'il reste du texte « 6 mois »';
  if (m.icones) return `${m.icones} icône(s) dans le formulaire`;
  return brut(m.titre) === brut(contenu.resultat.rester.titre) || `titre « ${m.titre} »`;
});

critere(8, 'la case de l’étude décochée au chargement', [1440, 390], async ({ page }) => {
  await allerAuResultat(page, LIEN_AUDIT);
  const m = await page.evaluate(() => Array.from(document.querySelectorAll('#revenir form input[type="checkbox"]')).map((c) => c.checked));
  return (m.length === 1 && !m[0]) || `cases : ${JSON.stringify(m)}`;
});

critere(8, '« début 2027 » dans le label de la case étude', [1440], async ({ page }) => {
  await allerAuResultat(page, LIEN_AUDIT);
  const t = await page.evaluate(() => {
    const c = document.querySelector('#revenir form input[name="etude"]');
    return c ? brutTexte(c.closest('label').textContent) : '';
    function brutTexte(x) { return x.replace(/[\u00a0\u202f]/g, ' '); }
  });
  return /début 2027/.test(t) || `label « ${t} »`;
});

critere(8, 'le pied de page porte la phrase sur les RH', [1440, 390], async ({ page }) => {
  await allerAuResultat(page, LIEN_AUDIT);
  const t = brut(await page.locator('footer.pied').innerText());
  return t.includes('ni un cabinet RH, ni un organisme de formation') || 'phrase absente';
});
// <<< POINTS

// --------------------------------------------------------------- captures

async function prendreLesCaptures(dossier) {
  const sortie = join(racine, 'captures/passe14', dossier);
  const liens = {
    'membre-audit': LIEN_AUDIT, 'manager-audit': LIEN_AUDIT_MANAGER,
    'tout-enracine': LIEN_TOUT_ENRACINE, 'tout-semer': LIEN_TOUT_SEMER, 'membre-idees': LIEN_IDEES,
  };
  for (const { nom, lanceur } of NAVIGATEURS) {
    const navigateur = await lanceur.launch();
    for (const largeur of LARGEURS) {
      const contexte = await navigateur.newContext({ viewport: { width: largeur, height: 900 }, locale: 'fr-FR' });
      await simulerLeBackend(contexte);
      const page = await contexte.newPage();
      const rep = join(sortie, `${nom}-${largeur}`);
      mkdirSync(rep, { recursive: true });
      for (const [fichier, lien] of Object.entries(liens)) {
        await allerAuResultat(page, lien);
        await page.waitForTimeout(400);
        await page.screenshot({ path: join(rep, `${fichier}.png`), fullPage: true });
      }
      if (dossier === 'apres') {
        // Les vues demandées au point 10 : la barre en haut, puis sur « Vos envies ».
        await allerAuResultat(page, LIEN_IDEES);
        await page.screenshot({ path: join(rep, 'haut-avec-barre.png') });
        const envies = page.locator('#envies');
        if (await envies.count()) {
          await envies.scrollIntoViewIfNeeded();
          await page.evaluate(() => window.scrollBy(0, 200));
          await page.waitForTimeout(600);
          await page.screenshot({ path: join(rep, 'barre-sur-envies.png') });
        }
        for (const id of ['appuis', 'envies', 'lecture', 'revenir']) {
          const bloc = page.locator(`#${id}`);
          if (await bloc.count()) await bloc.screenshot({ path: join(rep, `bloc-${id}.png`) }).catch(() => {});
        }
        const pied = page.locator('footer.pied');
        if (await pied.count()) await pied.screenshot({ path: join(rep, 'pied.png') });
      }
      await contexte.close();
    }
    await navigateur.close();
  }
  console.log(`Captures « ${dossier} » dans captures/passe14/${dossier}/`);
}

// -------------------------------------------------------------- exécution

async function verifier() {
  const retenus = CRITERES.filter((c) => !POINTS || POINTS.includes(c.point));
  const lignes = [];
  for (const { nom, lanceur } of NAVIGATEURS) {
    const navigateur = await lanceur.launch();
    for (const largeur of LARGEURS) {
      for (const c of retenus.filter((x) => x.largeurs.includes(largeur))) {
        const contexte = await navigateur.newContext({ viewport: { width: largeur, height: 900 }, locale: 'fr-FR' });
        await simulerLeBackend(contexte);
        const page = await contexte.newPage();
        const erreurs = [];
        page.on('pageerror', (e) => erreurs.push(e.message));
        let verdict;
        try {
          verdict = await c.verifier({ page, contexte, largeur, navigateur: nom, lanceur });
        } catch (e) {
          verdict = `exception : ${e.message.split('\n')[0]}`;
        }
        if (verdict === true && erreurs.length) verdict = `erreur JS : ${erreurs[0]}`;
        lignes.push({ ...c, nom, largeur, ok: verdict === true, detail: verdict === true ? '' : String(verdict) });
        await contexte.close();
      }
    }
    await navigateur.close();
  }

  lignes.sort((a, b) => a.point - b.point || a.intitule.localeCompare(b.intitule));
  for (const l of lignes) {
    console.log(`${l.ok ? 'OK' : 'KO'}  ${String(l.point).padStart(2)} · ${l.intitule} · ${l.nom} ${l.largeur}${l.ok ? '' : ` · ${l.detail}`}`);
  }
  const ko = lignes.filter((l) => !l.ok).length;
  console.log(`\n${lignes.length - ko} OK, ${ko} KO`);
  return ko;
}

// ---------------------------------------------------------------- lancement

if (CAPTURES) {
  await prendreLesCaptures(CAPTURES);
} else {
  process.exit((await verifier()) ? 1 : 0);
}
