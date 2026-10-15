// Captures de tous les écrans de l'état des lieux, Chromium et WebKit, aux largeurs de la boucle de critique (responsive, 15-16
// octobre 2026). Usage : node scripts/responsive/captures.mjs <dossier> [moteur] [largeurs]. Mode démo, écritures interceptées :
// aucune vraie réponse ne part.
import { chromium, webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SORTIE = process.argv[2] || 'captures/responsive-2026-10-15/avant';
const MOTEURS = (process.argv[3] || 'chromium,webkit').split(',');
const TAILLES = { '320': [320, 568], '390': [390, 844], '430': [430, 932], '768': [768, 1024], '1024': [1024, 768], '1440': [1440, 900], '1920': [1920, 1080], '844x390': [844, 390] };
const CHOIX = (process.argv[4] || Object.keys(TAILLES).join(',')).split(',');
const BASE = 'http://localhost:4522';
const HASH = { manager: 'v2-g2122222222121222', membre: 'v2-m2122222222121222', solo: 'v2-s2332222123322222-8.52' };

const preparer = async (p) => {
  await p.route(/supabase\.co\/(rest\/v1\/rpc\/edl_(repondre|evenement|contact|resultat_demande)|functions\/v1\/)/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
};
const profilJusquAuxPhrases = async (p, role) => {
  const pa = (t) => p.locator('button:visible', { hasText: t }).first();
  await pa(role === 'solo' ? /En solo/ : role === 'membre' ? /Au sein/ : 'En encadrant une équipe').click(); await p.waitForTimeout(1300);
  if (await p.evaluate(() => document.documentElement.classList.contains('edl-pas-a-pas'))) {
    await pa(/^Une femme$/).click(); await p.waitForTimeout(1300);
    if (role !== 'solo') { await pa(/^10 à 49$/).click(); await p.waitForTimeout(1300); }
    await pa(/^Industrie et production$/).click(); await p.waitForTimeout(1300);
    if (role !== 'solo') { await pa(/^6 à 12$/).click(); await p.waitForTimeout(1300); }
    await pa(/^Commencer les 16/).click(); await p.waitForTimeout(1200);
  } else {
    if (role !== 'solo') { await pa(/^6 à 12$/).click(); await pa(/^10 à 49$/).click().catch(() => {}); }
    await pa(/^Industrie et production$/).click(); await pa(/Continuer/).click(); await p.waitForTimeout(1000);
  }
};
const ECRANS = [
  ['accueil', async (p) => { await p.goto(BASE + '/?demo=1', { waitUntil: 'networkidle' }); await p.waitForTimeout(1800); }],
  ['profil', async (p) => { await p.goto(BASE + '/etat-des-lieux/questionnaire/?demo=1', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200); }],
  ['phrase', async (p) => { await p.goto(BASE + '/etat-des-lieux/questionnaire/?demo=1', { waitUntil: 'networkidle' }); await p.waitForTimeout(900); await profilJusquAuxPhrases(p, 'manager'); }],
  ['relance', async (p) => { await p.goto(BASE + '/etat-des-lieux/questionnaire/?demo=1', { waitUntil: 'networkidle' }); await p.waitForTimeout(900); await profilJusquAuxPhrases(p, 'manager');
    await p.locator('#a1 button:visible', { hasText: /^Un peu$/ }).first().click(); await p.waitForTimeout(900); await p.locator('#a1').scrollIntoViewIfNeeded().catch(() => {}); }],
  ['resultat-manager', async (p) => { await p.goto(BASE + '/resultat.html?demo=1#' + HASH.manager, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500); }],
  ['resultat-membre', async (p) => { await p.goto(BASE + '/resultat.html?demo=1#' + HASH.membre, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500); }],
  ['resultat-solo', async (p) => { await p.goto(BASE + '/resultat.html?demo=1#' + HASH.solo, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500); }],
  ['fenetre-mail', async (p) => { await p.goto(BASE + '/resultat.html?demo=1#' + HASH.solo, { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
    for (let k = 0; k < 60; k++) { await p.mouse.wheel(0, 250); await p.waitForTimeout(60); if (await p.locator('dialog.fenetre-mail[open]').count()) break; } await p.waitForTimeout(900); }],
  ['confidentialite', async (p) => { await p.goto(BASE + '/etat-des-lieux/confidentialite/?demo=1', { waitUntil: 'networkidle' }); await p.waitForTimeout(900); }],
  ['ce-n-est-pas', async (p) => { await p.goto(BASE + '/greatly-ce-n-est-pas.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(900); }],
  ['erreur-lien', async (p) => { await p.goto(BASE + '/resultat.html?demo=1', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200); }],
];
const PLEINES = ['accueil', 'resultat-solo', 'resultat-manager'];
const bilan = [];
for (const nom of MOTEURS) {
  const moteur = nom === 'webkit' ? webkit : chromium;
  const b = await moteur.launch();
  for (const t of CHOIX) {
    const [w, h] = TAILLES[t]; const dossier = join(SORTIE, nom); mkdirSync(dossier, { recursive: true });
    for (const [ecran, aller] of ECRANS) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: nom === 'chromium' && w < 900, hasTouch: w < 900 });
      const p = await ctx.newPage(); const err = []; p.on('pageerror', (e) => err.push(e.message)); await preparer(p);
      try {
        await aller(p);
        await p.screenshot({ path: join(dossier, `${t}-${ecran}.png`) });
        if (PLEINES.includes(ecran) && (t === '390' || t === '1440')) await p.screenshot({ path: join(dossier, `${t}-${ecran}-pleine.png`), fullPage: true });
        const deborde = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        bilan.push([nom, t, ecran, err.length ? 'erreurs ' + err.length : 'ok', deborde ? 'DÉBORDE' : '']);
      } catch (e) { bilan.push([nom, t, ecran, 'ÉCHEC ' + String(e.message).split('\n')[0].slice(0, 80), '']); }
      await ctx.close();
    }
  }
  await b.close();
}
console.log(bilan.map((x) => x.join(' | ')).join('\n'));
