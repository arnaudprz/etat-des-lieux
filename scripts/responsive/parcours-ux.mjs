// Contrôle des points UX du formulaire (16 octobre 2026) : le parcours entier, trois profils, ordinateur 1280 et téléphone 375.
// Toujours ?demo=1, et toute écriture vers la base est en plus interceptée : rien n'entre dans l'étude.
import { webkit, chromium } from 'playwright';
const moteur = process.argv[2] === 'chromium' ? chromium : webkit;
const ROLES = { manager: 'En encadrant une équipe', membre: "Au sein d'une équipe", solo: 'En solo ou en profession libérale' };
const VUES = { ordinateur: { width: 1280, height: 800 }, telephone: { width: 375, height: 667 } };
const b = await moteur.launch(); let ko = 0;
const verifier = (ok, quoi) => { if (!ok) ko++; console.log((ok ? '  ok  ' : '  KO  ') + quoi); };
for (const [role, lib] of Object.entries(ROLES)) for (const [vue, taille] of Object.entries(VUES)) {
  console.log(`\n${role} · ${vue}`);
  const tel = vue === 'telephone';
  const ctx = await b.newContext({ viewport: taille, hasTouch: tel }); const p = await ctx.newPage(); const err = []; const ecrits = [];
  p.on('pageerror', (e) => err.push(e.message));
  await p.route(/supabase\.co\/(rest\/v1\/rpc\/edl_|functions\/v1\/)/, (r) => { ecrits.push(r.request().url().split('/').pop()); r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  await p.goto('http://localhost:4522/etat-des-lieux/questionnaire/?demo=1', { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
  const pa = (t) => p.locator('button:visible', { hasText: t }).first();
  const large = async () => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  const question = () => p.evaluate(() => { const g = document.querySelector('.edl-profil > div:nth-child(2) > div:not(.edl-etape-cachee) h2'); return g ? g.textContent.trim() : (document.querySelector('.edl-merci:not([hidden])') ? 'Merci' : '?'); });
  let sansDebord = true;
  // Le profil, avec un « Retour » au milieu.
  await pa(lib).click(); await p.waitForTimeout(1300);
  await pa(/^Une femme$/).click(); await p.waitForTimeout(1300);
  const avantRetour = await question();
  await p.locator('.edl-retour:visible').first().click(); await p.waitForTimeout(1000);
  const apresRetour = await question();
  const coche = await p.evaluate(() => [...document.querySelectorAll('.edl-profil button[aria-pressed="true"]')].filter((x) => x.getClientRects().length).map((x) => x.textContent.trim()).join());
  verifier(apresRetour === 'Vous êtes' && coche === 'Une femme', `Retour depuis « ${avantRetour.slice(0, 30)} » → « ${apresRetour} », « ${coche} » toujours coché`);
  await pa(/^Une femme$/).click(); await p.waitForTimeout(1300);
  if (role !== 'solo') { await pa(/^10 à 49$/).click(); await p.waitForTimeout(1300); }
  sansDebord &&= await large();
  await pa(/^Industrie et production$/).click(); await p.waitForTimeout(1300);
  if (role !== 'solo') { await pa(/^6 à 12$/).click(); await p.waitForTimeout(1300); }
  verifier(await question() === 'Merci', 'étape Merci atteinte');
  if (tel) { const r = await p.evaluate(() => { const b = document.querySelector('.edl-merci__cta').getBoundingClientRect(); return [Math.round(b.bottom), innerHeight]; }); verifier(r[0] > r[1] - 80 && r[0] <= r[1], `bouton « Commencer » en bas de l'écran (${r[0]} / ${r[1]})`); }
  await pa(/^Commencer les 16 questions/).click(); await p.waitForTimeout(1300);
  // Les 16 questions.
  const RELANCES = [1, 6, 7];
  for (let n = 1; n <= 16; n++) {
    const carte = p.locator('#a' + n); sansDebord &&= await large(); if (process.env.DBG) console.log('   carte', n, await p.evaluate(() => (document.querySelector('.edl-ph-carte') || {}).id));
    if (n === 2 && tel) verifier(await p.evaluate(() => document.activeElement === document.querySelector('.edl-ph-carte > p:first-child')), 'à chaque question, le focus va sur la phrase');
    if (n === 1 && tel) verifier(await p.evaluate(() => getComputedStyle(document.querySelector('.edl-ph-tete h2'), '::before').display === 'block'), '« Thème 1 sur 8 » affiché au-dessus du thème');
    if (!RELANCES.includes(n)) { await carte.locator('.e-opt', { hasText: /^En bonne partie$/ }).click(); await p.waitForTimeout(1300); continue; }
    const pos = () => carte.locator('.e-opt').evaluateAll((l) => l.map((x) => { const r = x.getBoundingClientRect(); return Math.round(r.left) + ',' + Math.round(r.top) + ',' + Math.round(r.width); }).join(' '));
    const avant = await pos();
    await carte.locator('.e-opt', { hasText: /^Un peu$/ }).click(); await p.waitForTimeout(900);
    // Ordinateur : les quatre réponses passent en une ligne au-dessus du bloc des idées (choix d'Arnaud, 16 octobre 2026).
    if (!tel) { const l = (await pos()).split(' ').map((x) => x.split(',')[1]); verifier(new Set(l).size === 1, `Q${n} : les quatre réponses en une ligne au-dessus des idées`); }
    if (tel && n === 1) {
      // Fermer en touchant au-dessus, rouvrir en touchant la réponse, fermer par la réponse en haut, puis par la croix.
      await p.mouse.click(187, 160); await p.waitForTimeout(500);
      const ferme = () => p.evaluate(() => !document.querySelector('.edl-ph-carte .e-open') || !document.querySelector('.edl-ph-carte .e-open').getClientRects().length);
      const unPeu = () => p.evaluate(() => (document.querySelector('.edl-ph-carte .e-opt[aria-pressed="true"]') || {}).textContent);
      verifier(await ferme() && /Un peu/.test(await unPeu()), 'toucher au-dessus ferme le panneau, « Un peu » reste choisi');
      await carte.locator('.e-opt', { hasText: /^Un peu$/ }).click(); await p.waitForTimeout(500);
      verifier(!(await ferme()), 'toucher « Un peu » rouvre le panneau');
      const tailles = await p.evaluate(() => ['.edl-feuille-choix', '.edl-feuille-x', '.edl-retour'].map((s) => { const r = [...document.querySelectorAll(s)].find((x) => x.getClientRects().length).getBoundingClientRect(); return Math.round(r.width) + '×' + Math.round(r.height); }));
      // L'étiquette de la réponse est petite à l'œil ; sa zone tactile (::after) la prolonge de 7 px en haut et en bas.
      const zone = (t, k) => t.split('×').map(Number).map((v, i) => v + (k === 0 && i === 1 ? 14 : 0));
      verifier(tailles.every((t, k) => zone(t, k).every((v) => v >= 44)), `cibles de 44 px au moins (réponse, croix, Retour : ${tailles.join(', ')})`);
      verifier(await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('edl-feuille-choix')), 'le focus entre dans le panneau à son ouverture');
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      verifier(await ferme() && await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('aria-pressed') === 'true'), 'Échap ferme le panneau et rend le focus à la réponse choisie');
      await carte.locator('.e-opt', { hasText: /^Un peu$/ }).click(); await p.waitForTimeout(500);
      await carte.locator('button[role=checkbox]:visible').first().click(); await p.waitForTimeout(200);
      await p.locator('.edl-feuille-choix:visible').click(); await p.waitForTimeout(500);
      verifier(await ferme(), 'la réponse en haut du panneau ramène aux quatre réponses');
      await carte.locator('.e-opt', { hasText: /^Un peu$/ }).click(); await p.waitForTimeout(500);
      await p.locator('.edl-feuille-x:visible').click(); await p.waitForTimeout(500);
      verifier(await ferme(), 'la croix ferme le panneau');
      // Passer à « En bonne partie » : le panneau disparaît, la question suivante arrive, et les idées cochées sont effacées.
      await carte.locator('.e-opt', { hasText: /^En bonne partie$/ }).click(); await p.waitForTimeout(1400);
      verifier(await p.evaluate(() => Boolean(document.querySelector('#a2.edl-ph-carte'))), '« En bonne partie » ferme le panneau et passe à la question 2');
      await p.locator('.edl-retour:visible').first().click(); await p.waitForTimeout(1000);
      await carte.locator('.e-opt', { hasText: /^Un peu$/ }).click(); await p.waitForTimeout(800);
      verifier(await carte.locator('button[role=checkbox][aria-checked="true"]').count() === 0, 'revenu à « Un peu » : aucune idée cochée (effacées)');
    }
    await carte.locator('button[role=checkbox]:visible').first().click(); await p.waitForTimeout(200);
    if (tel) { const b = await p.evaluate(() => { const o = document.querySelector('.edl-ph-carte .e-open').getBoundingClientRect(); const r = document.querySelector('.edl-ph-carte .e-row').getBoundingClientRect(); return [Math.round(o.left), Math.round(o.width), Math.round(r.left)]; }); verifier(b[0] === 0 && b[1] === 375 && b[2] === 16, `Q${n} : panneau pleine largeur, idées à 16 px (${b})`); }
    await carte.locator('button:visible', { hasText: /^Question suivante$/ }).click(); await p.waitForTimeout(1300);
  }
  verifier(sansDebord, 'aucun défilement horizontal');
  await p.locator('button:visible', { hasText: /^Voir mon résultat/ }).first().click();
  await p.waitForURL(/resultat/, { timeout: 8000 }).catch(() => {});
  verifier(/resultat/.test(p.url()) && /demo=1/.test(p.url()), 'arrivée au résultat, toujours en démonstration');
  verifier(err.length === 0, 'aucune erreur JavaScript' + (err.length ? ' : ' + err.join(' | ') : ''));
  console.log('  écritures interceptées :', [...new Set(ecrits)].join(', ') || 'aucune');
  await ctx.close();
}
await b.close(); console.log(ko ? `\n${ko} contrôle(s) en échec` : '\nTous les contrôles passent'); process.exit(ko ? 1 : 0);
