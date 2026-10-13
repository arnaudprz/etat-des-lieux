#!/usr/bin/env node
/**
 * Parcours solo de bout en bout, dans de vrais navigateurs neufs (navigation privée, sans cache) : Chrome et WebKit
 * (le moteur de Safari), sur ordinateur et sur téléphone. Vérifie que la question « Taille de votre équipe » n'apparaît
 * jamais pour un solo, qu'elle revient pour un manager, et que taille_equipe part vide. Les envois sont interceptés :
 * rien n'est écrit en base.
 *
 *   node scripts/serveur.mjs 8082 &   puis   node scripts/test-parcours-solo.mjs [http://localhost:8082]
 */
import pw from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8082';
const SOLO = 'En solo ou en profession libérale';
let echecs = 0;
const verifier = (ok, quoi) => { if (!ok) echecs++; console.log((ok ? '  ok  ' : '  ÉCHEC ') + quoi); };
for (const moteur of ['chromium', 'webkit']) for (const [nom, vue] of [['ordinateur', { width: 1440, height: 900 }], ['téléphone', { width: 390, height: 844 }]]) {
  console.log(`${moteur}, ${nom}`);
  const b = moteur === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: vue, hasTouch: nom === 'téléphone' })).newPage();
  const envois = [];
  await p.route(/rpc\/edl_(repondre|evenement|contact)/, (r) => { envois.push(r.request().url().split('/').pop() + ' ' + (r.request().postData() || '')); r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  await p.goto(BASE + '/etat-des-lieux/questionnaire/?test=1', { waitUntil: 'networkidle' });
  const pastille = (t) => p.locator('button:visible', { hasText: t }).first();
  const appui = (l) => (nom === 'téléphone' ? l.tap() : l.click());
  const tailleVisible = () => p.evaluate(() => [...document.querySelectorAll('[data-maquette] h2')].some((x) => /^Taille de votre équipe/.test(x.textContent.trim()) && x.getClientRects().length));
  await appui(pastille("Au sein d'une équipe")); await appui(pastille(/^6 à 12$/));
  verifier(await tailleVisible(), 'membre : la taille d’équipe est demandée');
  await appui(pastille(SOLO)); await p.waitForTimeout(100);
  verifier(!(await tailleVisible()), 'solo : la taille d’équipe disparaît');
  await appui(pastille('En encadrant une équipe')); await p.waitForTimeout(100);
  verifier(await tailleVisible(), 'manager : elle revient');
  verifier(await p.evaluate(() => [...document.querySelectorAll('[data-maquette] h2')].some((x) => /^Taille de votre entreprise/.test(x.textContent.trim()) && x.getClientRects().length)), 'manager : la taille d’entreprise est demandée');
  const entrepriseVisible = () => p.evaluate(() => [...document.querySelectorAll('[data-maquette] h2')].some((x) => /^Taille de votre entreprise/.test(x.textContent.trim()) && x.getClientRects().length));
  await appui(pastille(SOLO)); await p.waitForTimeout(100);
  verifier(!(await entrepriseVisible()), 'solo : pas de taille d’entreprise non plus');
  await appui(pastille(/^Industrie et production$/));
  await appui(pastille(/Continuer/)); await p.waitForTimeout(500);
  verifier(await p.locator('#a1').count() > 0, 'solo : on passe aux questions sans taille d’équipe');
  await appui(p.locator('button.e-lien:visible', { hasText: 'Retour' }).first()); await p.waitForTimeout(300);
  verifier(!(await tailleVisible()), 'retour au profil : toujours pas de taille d’équipe');
  await appui(pastille(/Continuer/)); await p.waitForTimeout(500);
  for (let n = 1; n <= 16; n++) await appui(p.locator('#a' + n).locator('button:visible', { hasText: /^En bonne partie$/ }).first());
  await appui(p.locator(':is(button,a):visible', { hasText: /Voir mon résultat|Voir le résultat|résultat/i }).last());
  await p.waitForURL(/resultat\.html/, { timeout: 8000 }).catch(() => {});
  const envoi = envois.find((x) => x.startsWith('edl_repondre'));
  const charge = envoi ? JSON.parse(envoi.slice('edl_repondre '.length)).p : null;
  verifier(charge && charge.role === 'solo' && charge.profil.taille_equipe === '' && charge.profil.taille_entreprise === '' && charge.profil.role === SOLO, 'envoi : rôle solo, libellé solo, taille d’équipe et d’entreprise vides');
  verifier(/#v2-s/.test(p.url()), 'résultat solo ouvert');
  await b.close();
}
console.log(echecs ? `${echecs} échec(s)` : 'Tout est bon.');
process.exit(echecs ? 1 : 0);
