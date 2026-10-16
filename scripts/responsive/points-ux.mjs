// Captures des 10 points UX du formulaire (16 octobre 2026), avant ou après. Usage : node scripts/responsive/points-ux.mjs <dossier>
// Toujours en mode démo (?demo=1) : rien n'est enregistré dans l'étude.
import { webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
const D = process.argv[2]; mkdirSync(D, { recursive: true });
const URL = 'http://localhost:4522/etat-des-lieux/questionnaire/?demo=1';
const b = await webkit.launch(); const mesures = {};
const page = async (w, h) => { const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: w < 900 }); await p.goto(URL, { waitUntil: 'networkidle' }); await p.waitForTimeout(1000); return p; };
const pa = (p, t) => p.locator('button:visible', { hasText: t }).first();
const profil = async (p, jusqua) => {
  const etapes = ['En encadrant une équipe', /^Une femme$/, /^10 à 49$/, /^Industrie et production$/, /^6 à 12$/];
  for (const t of etapes.slice(0, jusqua)) { await pa(p, t).click(); await p.waitForTimeout(1300); }
};
// 1. Ordinateur : les réponses ne bougent pas quand la relance s'ouvre.
{ const p = await page(1280, 800); await profil(p, 5); await pa(p, /^Commencer les 16/).click(); await p.waitForTimeout(1300);
  const pos = () => p.evaluate(() => [...document.querySelectorAll('.edl-ph-carte .e-opt')].map((x) => { const r = x.getBoundingClientRect(); return Math.round(r.left) + ',' + Math.round(r.top); }).join(' '));
  mesures.p1_avant_clic = await pos(); await p.screenshot({ path: `${D}/1-ordi-avant-clic.png` });
  await p.locator('.edl-ph-carte .e-opt', { hasText: /^Un peu$/ }).click(); await p.waitForTimeout(900);
  mesures.p1_apres_clic = await pos(); await p.screenshot({ path: `${D}/1-ordi-apres-clic.png` }); await p.close(); }
// 2. Ordinateur : « Voir tous les secteurs ».
{ const p = await page(1280, 800); await profil(p, 3); await p.locator(':is(a,button,span):visible', { hasText: /^Voir tous les secteurs/ }).first().click(); await p.waitForTimeout(800);
  mesures.p2 = await p.evaluate(() => { const g = [...document.querySelectorAll('.edl-profil div[style*="display:grid"]')].find((x) => x.getClientRects().length && x.children.length > 8); return g ? { secteurs: g.children.length, defile: g.scrollHeight > g.clientHeight + 1, hauteur: g.clientHeight } : null; });
  await p.screenshot({ path: `${D}/2-ordi-secteurs.png`, fullPage: true }); await p.close(); }
// 3. Ordinateur : « Retour » sur le profil.
{ const p = await page(1280, 800); await profil(p, 2); const q = () => p.evaluate(() => (document.querySelector('.edl-profil > div:nth-child(2) > div:not(.edl-etape-cachee) h2') || {}).textContent + ' | ' + location.pathname);
  mesures.p3_avant = await q(); await p.locator(':is(a,button):visible', { hasText: /Retour/ }).first().click(); await p.waitForTimeout(1300); mesures.p3_apres = await q();
  mesures.p3_coche = await p.evaluate(() => [...document.querySelectorAll('.edl-profil button[aria-pressed="true"]')].filter((x) => x.getClientRects().length).map((x) => x.textContent.trim()).join(','));
  await p.screenshot({ path: `${D}/3-ordi-retour.png` }); await p.close(); }
// Téléphone (375 et 390).
for (const w of [375, 390]) {
  const p = await page(w, w === 375 ? 667 : 844);
  await p.screenshot({ path: `${D}/5-6-tel${w}-profil-q1.png` });
  mesures['p8_profil_' + w] = await p.evaluate(() => { const h = [...document.querySelectorAll('.edl-profil h2')].find((x) => x.getClientRects().length); return h ? Math.round(h.getBoundingClientRect().left) : null; });
  await profil(p, 2); await p.screenshot({ path: `${D}/9-tel${w}-tranches.png` });
  await profil(p, 0); await pa(p, /^10 à 49$/).click(); await p.waitForTimeout(1300); await p.screenshot({ path: `${D}/5-tel${w}-secteur.png` });
  await pa(p, /^Industrie et production$/).click(); await p.waitForTimeout(1300); await pa(p, /^6 à 12$/).click(); await p.waitForTimeout(1300);
  await p.screenshot({ path: `${D}/10-tel${w}-merci.png` });
  await pa(p, /^Commencer les 16/).click(); await p.waitForTimeout(1300);
  await p.screenshot({ path: `${D}/6-7-tel${w}-phrase.png` });
  mesures['p8_phrase_' + w] = await p.evaluate(() => Math.round(document.querySelector('.edl-ph-carte > p').getBoundingClientRect().left));
  await p.locator('.edl-ph-carte .e-opt', { hasText: /^Un peu$/ }).click(); await p.waitForTimeout(1000);
  await p.screenshot({ path: `${D}/4-tel${w}-relance.png` });
  mesures['p8_panneau_' + w] = await p.evaluate(() => { const r = document.querySelector('.edl-ph-carte .e-row'); return r ? Math.round(r.getBoundingClientRect().left) : null; });
  await p.mouse.click(w / 2, 150); await p.waitForTimeout(800);
  mesures['p4_apres_toucher_haut_' + w] = await p.evaluate(() => { const e = document.querySelector('.edl-ph-carte .e-open'); return e && e.getClientRects().length && getComputedStyle(e).display !== 'none' ? 'panneau encore ouvert' : 'panneau fermé'; });
  await p.screenshot({ path: `${D}/4-tel${w}-apres-toucher-haut.png` });
  mesures['largeur_' + w] = await p.evaluate(() => document.documentElement.scrollWidth);
  await p.close();
}
await b.close();
console.log(JSON.stringify(mesures, null, 1));
