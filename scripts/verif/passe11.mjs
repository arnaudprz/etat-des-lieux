/**
 * Vérifie la passe 11 (CORRECTIONS-11.md), critère par critère.
 *
 * Chaque critère ✅ du document devient une ligne OK ou KO, dans Chromium et
 * WebKit, à 1280, 390 et 360 de large. Le backend est toujours simulé : aucune
 * requête n'atteint l'API de production, rien ne s'écrit dans le classeur.
 *
 * Usage :
 *   node scripts/verif/passe11.mjs [URL_DE_BASE] [--points 1,2,5] [--captures avant|apres]
 *
 *   --points    ne vérifie que ces points (par défaut : tous ceux écrits ici)
 *   --captures  prend les captures de toutes les pages dans captures/passe11/<dossier>/
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
  console.error('passe11 : uniquement contre le serveur local (npm run local).');
  process.exit(2);
}

const NAVIGATEURS = [
  { nom: 'chromium', lanceur: chromium },
  { nom: 'webkit', lanceur: webkit },
];
const LARGEURS = [1280, 390, 360];

/** Réponses de référence (préréglage de la maquette), membre et manager. */
const REPONSES = [2, 2, 1, 1, 2, 2, 0, 0, 2, 3, 2, 2, 2, 2, 2, 1];
const LIEN_MEMBRE = '#v2-m2211220023222221';
const LIEN_MANAGER = '#v2-g2211220023222221';
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
// Point 1 · l'en-tête mobile
const PAGES_ETAPES = [
  ['profil', (page) => aller(page, `${BASE}/profil.html`)],
  ['questions', (page) => allerAuxQuestions(page)],
  ['resultat', (page) => allerAuResultat(page)],
];

critere(1, 'logo et « Étape n sur 3 » sur une seule ligne', [390, 360], async ({ page }) => {
  for (const [nom, ouvrir] of PAGES_ETAPES) {
    await ouvrir(page);
    const logo = await boite(page, '.entete .logo');
    const mobile = await boite(page, '.etapes__mobile');
    if (!mobile) return `${nom} : .etapes__mobile absent ou invisible`;
    if (!pres(logo.bas, mobile.bas, 23.9)) return `${nom} : écart de ${arrondi(Math.abs(logo.bas - mobile.bas))}px`;
    const lignes = await page.evaluate(() => {
      const n = document.querySelector('.etapes__mobile');
      const p = document.createRange(); p.selectNodeContents(n);
      return new Set(Array.from(p.getClientRects()).map((r) => Math.round(r.top))).size;
    });
    if (lignes !== 1) return `${nom} : ${lignes} lignes`;
    const attendu = contenu.etapes ? contenu.etapes.mobile.replace('{n}', { profil: 1, questions: 2, resultat: 3 }[nom]) : null;
    const lu = (await page.textContent('.etapes__mobile')).replace(/\u00a0/g, ' ').trim();
    if (!attendu || lu !== attendu) return `${nom} : « ${lu} » au lieu de « ${attendu} »`;
  }
  return true;
});

critere(1, 'aucun point d’étape visible', [390], async ({ page }) => {
  for (const [nom, ouvrir] of PAGES_ETAPES) {
    await ouvrir(page);
    const visibles = await page.locator('.etape__point').evaluateAll((ns) =>
      ns.filter((n) => n.getBoundingClientRect().width > 0).length);
    if (visibles) return `${nom} : ${visibles} point(s) visible(s)`;
  }
  return true;
});

critere(1, 'ordinateur : étapes nommées, version mobile cachée', [1280], async ({ page }) => {
  for (const [nom, ouvrir] of PAGES_ETAPES) {
    await ouvrir(page);
    const etat = await page.evaluate(() => {
      const m = document.querySelector('.etapes__mobile');
      return {
        mobile: m ? getComputedStyle(m).display : 'absent',
        noms: Array.from(document.querySelectorAll('.etape__nom'))
          .filter((n) => n.getBoundingClientRect().width > 0).map((n) => n.textContent.trim()),
      };
    });
    if (etat.mobile !== 'none') return `${nom} : .etapes__mobile en ${etat.mobile}`;
    if (etat.noms.length !== 3) return `${nom} : ${etat.noms.length} étapes nommées`;
    if (contenu.etapes && etat.noms.join('|') !== contenu.etapes.noms.join('|')) return `${nom} : noms ${etat.noms.join(', ')}`;
  }
  return true;
});
// Point 2 · le bandeau du haut
critere(2, 'texte du bandeau à 20px du bord', [390], async ({ page }) => {
  await aller(page, `${BASE}/index.html`);
  const x = await bordGaucheTexte(page, '.bandeau__texte');
  return pres(x, 20) || `bord gauche à ${arrondi(x)}px`;
});

critere(2, 'lien du bandeau d’au moins 40px de haut', [1280, 390, 360], async ({ page }) => {
  for (const url of ['index.html', 'profil.html']) {
    await aller(page, `${BASE}/${url}`);
    const b = await boite(page, '.bandeau a');
    if (!b || b.h < 40 - 0.5) return `${url} : ${b ? arrondi(b.h) : 'absent'}px`;
  }
  return true;
});

critere(2, 'questions : le bandeau défile, la progression reste en haut', [390], async ({ page }) => {
  await allerAuxQuestions(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  const avant = { bandeau: await boite(page, '.bandeau'), prog: await boite(page, '.progression') };
  if (avant.prog.y < avant.bandeau.bas - 1) return 'à 0 de défilement, la progression chevauche le bandeau';
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(300);
  const bandeau = await boite(page, '.bandeau');
  const prog = await boite(page, '.progression');
  if (bandeau && bandeau.bas > 0.5) return `bandeau encore visible (bas à ${arrondi(bandeau.bas)}px)`;
  return pres(prog.y, 0) || `progression en haut à ${arrondi(prog.y)}px`;
});

critere(2, '« Question suivante » ne cache pas l’affirmation sous la barre', [1280, 390, 360], async ({ page }) => {
  await allerAuxQuestions(page);
  await page.locator('.affirmation').nth(0).locator('.echelle__choix').nth(0).click();
  await page.waitForSelector('.relance__suivant', { state: 'visible' });
  await page.locator('.relance__suivant').first().click();
  await page.waitForTimeout(1200);
  const prog = await boite(page, '.progression');
  const cible = await boite(page, '[data-affirmation="2"]');
  if (!cible) return 'affirmation 2 introuvable';
  return cible.y >= prog.bas - 1 || `affirmation à ${arrondi(cible.y)}px, barre jusqu’à ${arrondi(prog.bas)}px`;
});
// Point 3 · deux axes seulement sur mobile
/** Les quatre pages du parcours, ouvertes dans l'état où leurs cartes se voient. */
const PAGES_AXES = [
  ['accueil', (page) => aller(page, `${BASE}/index.html`)],
  ['profil', (page) => aller(page, `${BASE}/profil.html`)],
  ['questions', async (page) => { await allerAuxQuestions(page); await repondre(page, REPONSES_TROIS_RELANCES); }],
  ['resultat', (page) => allerAuResultat(page)],
];
/** Les cartes du point 3, plus celles trouvées en route (.vide, .bloc). */
const CARTES = '.pourquoi__carte, .apercu, .cadre-etude, .affirmation, .formulaire, .ensemble, .garder, '
  + '.partage, .etude, .greatly__texte, .dimensions .carte, .vide, .bloc';
/** L'ensemble et « Gardez votre résultat » ont leur propre critère (points 16 et 17). */
const CARTES_AVEC_POINT_DEDIE = ['ensemble', 'garder'];

critere(3, 'titres et intros hors carte à 20px', [390, 360], async ({ page }) => {
  for (const [nom, ouvrir] of PAGES_AXES) {
    await ouvrir(page);
    const ecarts = await page.evaluate(() => {
      const premier = (n) => {
        const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT, { acceptNode: (t) => (t.nodeValue.trim() ? 1 : 3) });
        while (w.nextNode()) { const r = document.createRange(); r.selectNodeContents(w.currentNode); const q = r.getClientRects()[0]; if (q && q.width) return q.left; }
        return null;
      };
      return Array.from(document.querySelectorAll('h1, h2, .intro'))
        .filter((n) => n.getBoundingClientRect().width && !n.closest('.carte, .carte-pointillee, .greatly'))
        .map((n) => ({ quoi: `${n.tagName}.${n.className.split(' ')[0]}`, x: premier(n) }))
        .filter((e) => e.x != null && Math.abs(e.x - 20) > 1);
    });
    if (ecarts.length) return `${nom} : ${ecarts.map((e) => `${e.quoi} à ${Math.round(e.x)}px`).join(', ')}`;
  }
  return true;
});

critere(3, 'premier texte des cartes à 37px', [390, 360], async ({ page }) => {
  for (const [nom, ouvrir] of PAGES_AXES) {
    await ouvrir(page);
    const ecarts = await page.evaluate(({ sel, exclues }) => {
      const premier = (n) => {
        const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT, { acceptNode: (t) => (t.nodeValue.trim() ? 1 : 3) });
        while (w.nextNode()) { const r = document.createRange(); r.selectNodeContents(w.currentNode); const q = r.getClientRects()[0]; if (q && q.width) return q.left; }
        return null;
      };
      return Array.from(document.querySelectorAll(sel))
        .filter((n) => n.getBoundingClientRect().width && !exclues.some((c) => n.classList.contains(c)))
        .map((n) => {
          // Une carte sans bordure (le bloc Greatly) a son axe à 36px : 20 + 16.
          const cadre = n.classList.contains('greatly__texte') ? n.closest('.greatly') : n;
          const bord = parseFloat(getComputedStyle(cadre).borderLeftWidth) || 0;
          return { quoi: n.className.split(' ').filter((c) => c !== 'carte')[0] || 'carte', x: premier(n), attendu: 36 + bord };
        })
        .filter((e) => e.x != null && Math.abs(e.x - e.attendu) > 1);
    }, { sel: CARTES, exclues: CARTES_AVEC_POINT_DEDIE });
    if (ecarts.length) {
      return `${nom} : ${[...new Set(ecarts.map((e) => `${e.quoi} à ${Math.round(e.x)}px (attendu ${e.attendu})`))].join(', ')}`;
    }
  }
  return true;
});

/** Les marges intérieures mesurées à 1280 avant la passe : elles ne doivent pas bouger. */
const MARGES_ORDINATEUR = {
  '.pourquoi__carte': '32px 32px 32px 32px', '.apercu': '32px 32px 32px 32px',
  '.formulaire': '40px 40px 40px 40px', '.cadre-etude': '22px 26px 22px 26px',
  '.affirmation': '28px 32px 28px 32px', '.ensemble': '36px 40px 36px 40px',
  '.garder': '32px 32px 32px 32px', '.partage': '24px 32px 24px 32px',
  '.greatly__texte': '40px 44px 40px 44px', '.etude': '36px 40px 36px 40px',
};

critere(3, 'ordinateur : marges des cartes inchangées', [1280], async ({ page }) => {
  const ecarts = [];
  for (const [, ouvrir] of PAGES_AXES) {
    await ouvrir(page);
    for (const [sel, attendu] of Object.entries(MARGES_ORDINATEUR)) {
      const lu = await page.evaluate((s) => {
        const n = document.querySelector(s);
        if (!n) return null;
        const st = getComputedStyle(n);
        return `${st.paddingTop} ${st.paddingRight} ${st.paddingBottom} ${st.paddingLeft}`;
      }, sel);
      if (lu && lu !== attendu) ecarts.push(`${sel} ${lu} au lieu de ${attendu}`);
    }
  }
  return ecarts.length ? ecarts.join(', ') : true;
});
// Point 4 · le haut de l'accueil
critere(4, 'accueil : compteur et lignes de coches centrés', [390, 360], async ({ page }) => {
  await aller(page, `${BASE}/index.html`);
  await page.waitForSelector('.hero .repere');
  const m = await page.evaluate(() => {
    const centre = window.innerWidth / 2;
    const c = document.querySelector('.hero__actions .compteur').getBoundingClientRect();
    const lignes = {};
    document.querySelectorAll('.hero .repere').forEach((r) => {
      const b = r.getBoundingClientRect();
      const cle = Math.round(b.top);
      lignes[cle] = lignes[cle] || { g: Infinity, d: -Infinity };
      lignes[cle].g = Math.min(lignes[cle].g, b.left);
      lignes[cle].d = Math.max(lignes[cle].d, b.right);
    });
    return { centre, compteur: (c.left + c.right) / 2, lignes: Object.values(lignes).map((l) => (l.g + l.d) / 2) };
  });
  if (!pres(m.compteur, m.centre, 2)) return `compteur centré à ${arrondi(m.compteur)} pour ${m.centre}`;
  const decale = m.lignes.find((x) => !pres(x, m.centre, 2));
  return decale == null || `une ligne de coches centrée à ${arrondi(decale)} pour ${m.centre}`;
});
// Point 5 · les points 01 à 04 de l'accueil
critere(5, 'numéro et titre des points à 20px', [390], async ({ page }) => {
  await aller(page, `${BASE}/index.html`);
  await page.waitForSelector('.point__numero');
  const n = await bordGaucheTexte(page, '.point__numero');
  const t = await bordGaucheTexte(page, '.point__titre');
  return (pres(n, 20) && pres(t, 20)) || `numéro à ${arrondi(n)}px, titre à ${arrondi(t)}px`;
});

critere(5, 'contraste du numéro d’au moins 4,5:1', [1280, 390], async ({ page }) => {
  await aller(page, `${BASE}/index.html`);
  await page.waitForSelector('.point__numero');
  const faibles = (await contrastes(page, '.point__numero')).filter((c) => c.ratio < 4.5);
  return !faibles.length || faibles.map((c) => `${c.texte} ${c.ratio.toFixed(2)}:1`).join(', ');
});
// Point 6 · les 8 tuiles « Sur quoi repose l'état des lieux »
critere(6, 'tuiles sans ombre ni coins arrondis', [1280, 390], async ({ page }) => {
  await aller(page, `${BASE}/index.html`);
  await page.waitForSelector('.dimensions > *');
  const tuiles = await page.locator('.dimensions > *').evaluateAll((ns) => ns.map((n) => {
    const st = getComputedStyle(n);
    return { ombre: st.boxShadow, rayon: parseFloat(st.borderTopLeftRadius) || 0, curseur: st.cursor };
  }));
  if (tuiles.length !== 8) return `${tuiles.length} tuiles`;
  const fautive = tuiles.find((t) => (t.ombre && t.ombre !== 'none') || t.rayon || t.curseur === 'pointer');
  return !fautive || `ombre « ${fautive.ombre} », rayon ${fautive.rayon}, curseur ${fautive.curseur}`;
});

critere(6, 'les 8 tuiles en 4 lignes, moins de 260px', [390], async ({ page }) => {
  await aller(page, `${BASE}/index.html`);
  await page.waitForSelector('.dimensions > *');
  const m = await page.locator('.dimensions > *').evaluateAll((ns) => {
    const rs = ns.map((n) => n.getBoundingClientRect());
    return { lignes: new Set(rs.map((r) => Math.round(r.top))).size, hauteur: Math.max(...rs.map((r) => r.bottom)) - Math.min(...rs.map((r) => r.top)) };
  });
  return (m.lignes === 4 && m.hauteur < 260) || `${m.lignes} lignes, ${arrondi(m.hauteur)}px`;
});
// Point 7 · les deux cartes « Pour vous » et « Pour Greatly »
critere(7, '« Pour vous » sur fond forêt', [1280, 390], async ({ page }) => {
  await aller(page, `${BASE}/index.html`);
  await page.waitForSelector('[data-pour-vous-titre]');
  const fonds = await page.evaluate(() => {
    const foret = getComputedStyle(document.documentElement).getPropertyValue('--foret').trim();
    const carte = Array.from(document.querySelectorAll('.pourquoi__carte'))
      .find((c) => c.textContent.replace(/\s+/g, ' ').includes('Un regard clair sur votre façon de travailler ensemble'));
    const hex = (c) => '#' + (c.match(/\d+/g) || []).slice(0, 3).map((v) => Number(v).toString(16).padStart(2, '0')).join('').toUpperCase();
    return { foret: foret.toUpperCase(), fond: carte ? hex(getComputedStyle(carte).backgroundColor) : null };
  });
  return fonds.fond === fonds.foret || `fond ${fonds.fond} au lieu de ${fonds.foret}`;
});

critere(7, 'textes des deux cartes à 4,5:1 au moins', [1280, 390], async ({ page }) => {
  await aller(page, `${BASE}/index.html`);
  await page.waitForSelector('[data-pour-vous-titre]');
  const faibles = (await contrastes(page, '.pourquoi__carte *:not(:has(*)), .pourquoi__source a'))
    .filter((c) => c.ratio < 4.5);
  return !faibles.length || faibles.map((c) => `« ${c.texte} » ${c.ratio.toFixed(2)}:1`).join(', ');
});
// Point 8 · l'aperçu du résultat sur l'accueil
critere(8, 'chaque ligne de l’aperçu a la couleur de son niveau, sans pastille', [1280, 390], async ({ page }) => {
  await aller(page, `${BASE}/index.html`);
  await page.waitForSelector('.apercu__ligne');
  const m = await page.evaluate((exemples) => {
    const racine = getComputedStyle(document.documentElement);
    const enRgb = (hex) => { const n = parseInt(hex.trim().slice(1), 16); return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`; };
    const lignes = Array.from(document.querySelectorAll('.apercu__ligne'));
    return {
      pastilles: document.querySelectorAll('.apercu .pastille').length,
      ecarts: lignes.map((l, i) => {
        const attendu = enRgb(racine.getPropertyValue(`--${exemples[i].niveau}`));
        const lu = getComputedStyle(l).backgroundColor;
        return lu === attendu ? null : `ligne ${i + 1} : ${lu} au lieu de ${attendu}`;
      }).filter(Boolean),
    };
  }, contenu.accueil.apercu.exemples);
  if (m.pastilles) return `${m.pastilles} pastille(s) dans l’aperçu`;
  return !m.ecarts.length || m.ecarts.join(', ');
});
// Point 9 · le profil
const INTRO_PROFIL = 'Pour lire vos réponses à côté de celles d\'équipes qui vous ressemblent, quand elles seront assez nombreuses. Rien ne permet de vous identifier.';
/** Texte affiché, ramené à des espaces et apostrophes simples. */
const brut = (t) => String(t).replace(/[\u00a0\u202f]/g, ' ').replace(/[’]/g, "'").trim();

critere(9, 'intro du profil exacte', [1280], async ({ page }) => {
  await aller(page, `${BASE}/profil.html`);
  await page.waitForSelector('.pilules');
  const lu = brut(await page.textContent('[data-intro]'));
  return lu === INTRO_PROFIL || `« ${lu} »`;
});

critere(9, 'pilules en grille : même largeur dans chaque groupe', [1280, 390, 360], async ({ page, largeur }) => {
  await aller(page, `${BASE}/profil.html`);
  await page.waitForSelector('.pilules');
  const groupes = largeur <= 599 ? ['role', 'genre', 'taille_entreprise', 'taille_equipe'] : ['role', 'taille_entreprise', 'taille_equipe'];
  for (const g of groupes) {
    const l = await page.locator(`[data-champ="${g}"] .pilule`).evaluateAll((ns) => ns.map((n) => n.getBoundingClientRect().width));
    if (Math.max(...l) - Math.min(...l) > 1) return `${g} : largeurs ${l.map(Math.round).join(', ')}`;
    const lignes = await page.locator(`[data-champ="${g}"] .pilule__libelle`).evaluateAll((ns) => ns.map((n) => {
      const r = document.createRange(); r.selectNodeContents(n);
      return new Set(Array.from(r.getClientRects()).map((q) => Math.round(q.top))).size;
    }));
    if (Math.max(...lignes) > 2) return `${g} : un libellé sur ${Math.max(...lignes)} lignes`;
  }
  return true;
});

critere(9, 'tailles d’entreprise en 2 lignes de 3', [1280], async ({ page }) => {
  await aller(page, `${BASE}/profil.html`);
  await page.waitForSelector('.pilules');
  const tops = await page.locator('[data-champ="taille_entreprise"] .pilule').evaluateAll((ns) => ns.map((n) => Math.round(n.getBoundingClientRect().top)));
  const lignes = {};
  tops.forEach((t) => { lignes[t] = (lignes[t] || 0) + 1; });
  const v = Object.values(lignes);
  return (v.length === 2 && v.every((n) => n === 3)) || `répartition ${v.join(' + ')}`;
});

critere(9, 'secteurs : aucun défilement interne', [1280, 390], async ({ page }) => {
  await aller(page, `${BASE}/profil.html`);
  await page.waitForSelector('#secteurs li');
  const m = await page.evaluate(() => {
    const l = document.querySelector('.secteurs');
    const st = getComputedStyle(l);
    return { oy: st.overflowY, max: st.maxHeight, deborde: l.scrollHeight > l.clientHeight + 1 };
  });
  const ok = (m.oy === 'visible' || (m.oy === 'auto' && m.max === 'none')) && !m.deborde;
  return ok || `overflow-y ${m.oy}, max-height ${m.max}, débordement ${m.deborde}`;
});

critere(9, 'taper « san » montre la santé sans déplier', [390], async ({ page }) => {
  await aller(page, `${BASE}/profil.html`);
  await page.waitForSelector('#secteurs li');
  await page.fill('#secteur', 'san');
  await page.waitForTimeout(200);
  const vue = await page.locator('#secteurs .secteurs__choix', { hasText: /^Santé$/ }).isVisible();
  return vue || 'Santé n’apparaît pas';
});

critere(9, 'le texte d’aide de la recherche tient en entier', [360], async ({ page }) => {
  await aller(page, `${BASE}/profil.html`);
  await page.waitForSelector('#secteur');
  const m = await page.evaluate(() => {
    const champ = document.querySelector('#secteur');
    const st = getComputedStyle(champ);
    const clone = document.createElement('span');
    clone.textContent = champ.placeholder;
    Object.assign(clone.style, { font: st.font, letterSpacing: st.letterSpacing, whiteSpace: 'nowrap', position: 'absolute', visibility: 'hidden' });
    document.body.appendChild(clone);
    const texte = clone.scrollWidth;
    clone.remove();
    const utile = champ.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight);
    return { texte, utile, placeholder: champ.placeholder };
  });
  if (m.placeholder !== contenu.profil.secteur.placeholder) return `placeholder « ${m.placeholder} » au lieu de celui de contenu.json`;
  return m.texte <= m.utile || `${m.texte}px de texte pour ${arrondi(m.utile)}px`;
});

critere(9, '« Continuer » à vide : focus sur le premier choix du rôle, visible', [1280, 390], async ({ page }) => {
  await aller(page, `${BASE}/profil.html`);
  await page.waitForSelector('.pilules');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.locator('[data-continuer]').click();
  await page.waitForTimeout(900);
  const m = await page.evaluate(() => {
    const premier = document.querySelector('input[name="role"]');
    const pilule = premier.closest('.pilule').getBoundingClientRect();
    const bandeau = document.querySelector('.bandeau').getBoundingClientRect();
    return { focus: document.activeElement === premier, haut: pilule.top, bas: pilule.bottom, limite: bandeau.bottom, ecran: window.innerHeight };
  });
  if (!m.focus) return 'le focus n’est pas sur le premier choix du rôle';
  return (m.haut >= m.limite - 0.5 && m.bas <= m.ecran) || `pilule de ${arrondi(m.haut)} à ${arrondi(m.bas)}px (zone visible ${arrondi(m.limite)} à ${m.ecran})`;
});
// Point 10 · les affirmations
const INTRO_QUESTIONS = 'Pour chaque affirmation, choisissez la réponse qui vous ressemble le plus. Il n\'y a pas de bonne réponse.';

critere(10, 'intro des affirmations exacte', [1280], async ({ page }) => {
  await allerAuxQuestions(page);
  const lu = brut(await page.textContent('[data-intro]'));
  return lu === INTRO_QUESTIONS || `« ${lu} »`;
});

critere(10, 'sous-titre de la relance sous le titre, même bord gauche', [1280, 390, 360], async ({ page }) => {
  await allerAuxQuestions(page);
  await repondre(page, REPONSES_TROIS_RELANCES);
  const ecarts = await page.evaluate(() => Array.from(document.querySelectorAll('.relance-enveloppe:not([hidden]) .relance__question'))
    .map((q) => {
      const t = q.querySelector('strong').getBoundingClientRect();
      const s = q.querySelector('.relance__sous-titre').getBoundingClientRect();
      return { dx: Math.abs(t.left - s.left), dessous: s.top >= t.bottom - 1 };
    }).filter((e) => e.dx > 1 || !e.dessous));
  return !ecarts.length || ecarts.map((e) => `décalage ${Math.round(e.dx)}px, dessous ${e.dessous}`).join(', ');
});

critere(10, 'texte des options d’au moins 270px', [390], async ({ page }) => {
  await allerAuxQuestions(page);
  await repondre(page, REPONSES_TROIS_RELANCES);
  const largeurs = await page.evaluate(() => Array.from(document.querySelectorAll('.relance-enveloppe:not([hidden]) .choix--ligne'))
    .map((l) => {
      const st = getComputedStyle(l);
      const entree = l.querySelector('input').getBoundingClientRect().width;
      return l.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight) - entree - parseFloat(st.columnGap || st.gap || 0);
    }));
  const min = Math.min(...largeurs);
  return min >= 270 - 0.5 || `${arrondi(min)}px pour le texte`;
});

critere(10, 'options sans cadre sur mobile', [390], async ({ page }) => {
  await allerAuxQuestions(page);
  await repondre(page, REPONSES_TROIS_RELANCES);
  const st = await page.locator('.relance-enveloppe:not([hidden]) .choix--ligne').first().evaluate((n) => {
    const c = getComputedStyle(n);
    return { bord: c.borderLeftWidth, fond: c.backgroundColor };
  });
  const transparent = /rgba\(0, 0, 0, 0\)|transparent/.test(st.fond);
  return (st.bord === '0px' && transparent) || `bordure ${st.bord}, fond ${st.fond}`;
});

critere(10, 'une 3e case refusée se signale 1,5s', [1280, 390], async ({ page }) => {
  await allerAuxQuestions(page);
  await page.locator('.affirmation').nth(0).locator('.echelle__choix').nth(0).click();
  const relance = page.locator('.relance-enveloppe:not([hidden])').first();
  await relance.waitFor();
  const cases = relance.locator('.choix--ligne');
  await cases.nth(0).click();
  await cases.nth(1).click();
  const sous = relance.locator('.relance__sous-titre');
  const avant = await sous.evaluate((n) => getComputedStyle(n).color);
  await cases.nth(2).click({ force: true });
  await page.waitForTimeout(200);
  const coche = await cases.nth(2).locator('input').isChecked();
  const pendant = await sous.evaluate((n) => ({ c: getComputedStyle(n).color, g: getComputedStyle(n).fontWeight }));
  await page.waitForTimeout(1600);
  const apres = await sous.evaluate((n) => getComputedStyle(n).color);
  if (coche) return 'la 3e case a été cochée';
  if (pendant.c === avant) return 'le sous-titre n’a pas changé de couleur';
  if (Number(pendant.g) < 600) return `graisse ${pendant.g} pendant l’alerte`;
  return apres === avant || 'le sous-titre n’est pas revenu à sa couleur';
});
// Point 11 · la barre d'avancement
critere(11, 'la graine de icone-semer.svg tient dans le cercle de rayon 44', [1280], async ({ page }) => {
  await aller(page, `${BASE}/assets/img/icone-semer.svg`);
  const coins = await page.evaluate(() => {
    const e = document.querySelector('ellipse');
    const svg = e.ownerSVGElement;
    const m = e.getCTM();
    const cx = +e.getAttribute('cx'); const cy = +e.getAttribute('cy');
    const rx = +e.getAttribute('rx'); const ry = +e.getAttribute('ry');
    // La matrice de l'écran ramenée au repère de la viewBox.
    const echelle = svg.viewBox.baseVal.width / svg.getBoundingClientRect().width;
    const xs = []; const ys = [];
    for (let i = 0; i < 360; i++) {
      const a = (i * Math.PI) / 180;
      const p = new DOMPoint(cx + rx * Math.cos(a), cy + ry * Math.sin(a)).matrixTransform(m);
      xs.push(p.x * echelle); ys.push(p.y * echelle);
    }
    const g = Math.min(...xs); const d = Math.max(...xs); const h = Math.min(...ys); const b = Math.max(...ys);
    return [[g, h], [d, h], [g, b], [d, b]];
  });
  const loin = coins.map(([x, y]) => Math.hypot(x - 50, y - 50)).find((r) => r > 44);
  return loin == null || `un coin de la boîte à ${arrondi(loin)} du centre`;
});

critere(11, 'les deux icônes de la barre ont un liseré', [1280, 390], async ({ page }) => {
  await allerAuxQuestions(page);
  const ombres = await page.evaluate(() => ['.progression__pousse', '.progression__but'].map((s) => getComputedStyle(document.querySelector(s)).boxShadow));
  return ombres.every((o) => o && o !== 'none') || `box-shadow : ${ombres.join(' / ')}`;
});

critere(11, 'paliers : croissance à 14 et 15, arbre plein à 16', [1280, 390], async ({ page }) => {
  await allerAuxQuestions(page);
  const etat = async () => page.evaluate(() => ({
    pousse: document.querySelector('.progression__pousse').getAttribute('src') || '',
    but: getComputedStyle(document.querySelector('.progression__but')).opacity,
  }));
  const reponses = REPONSES.slice();
  for (let i = 0; i < 13; i++) await page.locator('.affirmation').nth(i).locator('.echelle__choix').nth(reponses[i]).click();
  for (const n of [14, 15, 16]) {
    await page.locator('.affirmation').nth(n - 1).locator('.echelle__choix').nth(reponses[n - 1]).click();
    await page.waitForTimeout(700);
    const e = await etat();
    const attendu = n < 16 ? 'icone-croissance.svg' : 'icone-enracine.svg';
    if (!e.pousse.includes(attendu)) return `à ${n} réponses : ${e.pousse.split('/').pop()}`;
    if (n < 16 && e.but === '1') return `à ${n} réponses l’arbre est déjà plein`;
    if (n === 16 && e.but !== '1') return `à 16 réponses l’arbre reste à ${e.but}`;
  }
  return true;
});
// Point 12 · l'échelle de réponse
/** Mesures de la première échelle, avec « En bonne partie » choisi. */
async function mesurerEchelle(page) {
  await allerAuxQuestions(page);
  await page.locator('.affirmation').first().locator('.echelle__choix').nth(2).click();
  await page.waitForTimeout(400);
  return page.locator('.affirmation').first().locator('.echelle__choix').evaluateAll((ns) => ns.map((b) => {
    const r = b.getBoundingClientRect();
    const lib = b.querySelector('.echelle__libelle');
    const plage = document.createRange(); plage.selectNodeContents(lib);
    const rects = Array.from(plage.getClientRects());
    const coche = b.querySelector('.echelle__coche');
    const c = coche.getBoundingClientRect();
    const l = lib.getBoundingClientRect();
    const bord = parseFloat(getComputedStyle(b).borderLeftWidth) || 0;
    return {
      texte: lib.textContent,
      presse: b.getAttribute('aria-pressed') === 'true',
      deborde: b.scrollWidth > b.clientWidth,
      marge: Math.min(...rects.map((q) => Math.min(q.left - (r.left + bord), (r.right - bord) - q.right))),
      lignes: new Set(rects.map((q) => Math.round(q.top))).size,
      coche: getComputedStyle(coche).display,
      chevauche: c.width > 0 && c.left < l.right && c.right > l.left && c.top < l.bottom && c.bottom > l.top,
    };
  }));
}

critere(12, 'la coche ne chevauche jamais le libellé', [1280, 390, 360], async ({ page }) => {
  const m = await mesurerEchelle(page);
  const f = m.find((x) => x.chevauche);
  return !f || `« ${f.texte} »`;
});

critere(12, 'pas de coche sur mobile', [390], async ({ page }) => {
  const m = await mesurerEchelle(page);
  const f = m.find((x) => x.coche !== 'none');
  return !f || `coche en ${f.coche} sur « ${f.texte} »`;
});

critere(12, 'libellés dans leur bouton, 4px de marge, 2 lignes au plus', [390, 360], async ({ page }) => {
  const m = await mesurerEchelle(page);
  const f = m.find((x) => x.deborde || x.marge < 4 || x.lignes > 2);
  return !f || `« ${f.texte} » : débord ${f.deborde}, marge ${arrondi(f.marge)}px, ${f.lignes} lignes`;
});
// <<< POINTS

// --------------------------------------------------------------- captures

async function prendreLesCaptures(dossier) {
  const sortie = join(racine, 'captures/passe11', dossier);
  for (const { nom, lanceur } of NAVIGATEURS) {
    const navigateur = await lanceur.launch();
    for (const largeur of LARGEURS) {
      const contexte = await navigateur.newContext({ viewport: { width: largeur, height: 900 }, locale: 'fr-FR' });
      await simulerLeBackend(contexte);
      const page = await contexte.newPage();
      const rep = join(sortie, `${nom}-${largeur}`);
      mkdirSync(rep, { recursive: true });
      const cliche = async (fichier) => {
        await page.waitForTimeout(400);
        await page.screenshot({ path: join(rep, `${fichier}.png`), fullPage: true });
      };

      await aller(page, `${BASE}/index.html`);
      await cliche('accueil');
      await aller(page, `${BASE}/profil.html`);
      await cliche('profil');
      await allerAuxQuestions(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await cliche('questions-vide');
      await repondre(page, REPONSES_TROIS_RELANCES);
      await cliche('questions-16-reponses-3-relances');
      await allerAuResultat(page, LIEN_MEMBRE);
      await cliche('resultat-membre');
      await allerAuResultat(page, LIEN_MANAGER);
      await cliche('resultat-manager');
      await aller(page, `${BASE}/confidentialite.html`);
      await cliche('confidentialite');

      if (dossier === 'apres') {
        // Les vues supplémentaires demandées au point 19.
        await allerAuxQuestions(page);
        await page.locator('.affirmation').first().locator('.echelle__choix').nth(2).click();
        await page.waitForTimeout(300);
        await page.locator('.affirmation').first().screenshot({ path: join(rep, 'reponse-en-bonne-partie.png') });
        await repondre(page, REPONSES);
        await page.locator('.progression').screenshot({ path: join(rep, 'fin-questionnaire-progression.png') }).catch(() => {});
        await cliche('fin-questionnaire-16-reponses');
      }
      await contexte.close();
    }
    await navigateur.close();
  }
  console.log(`Captures « ${dossier} » dans captures/passe11/${dossier}/`);
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
