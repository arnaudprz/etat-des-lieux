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
