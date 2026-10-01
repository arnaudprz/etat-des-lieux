/**
 * Vérifie la connexion Google du tableau de bord, hors mode démo.
 * Google et le backend sont simulés : rien ne sort vers la production.
 * Usage : node scripts/verif/connexion.mjs [URL_DE_BASE]
 */

import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://127.0.0.1:8127';
const soucis = [];

/** Un faux jeton Google : seul le contenu compte, la signature n'est pas lue ici. */
function jeton(email, signature) {
  const charge = Buffer.from(JSON.stringify({
    email, exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url');
  return `entete.${charge}.${signature}`;
}
const AUTORISE = jeton('arnaudprz@gmail.com', 'sig-ok');
const INCONNU = jeton('inconnu@gmail.com', 'sig-inconnu');

// La bibliothèque Google, remplacée par un bouton par compte.
const FAUX_GIS = `
window.google = { accounts: { id: {
  initialize(o) { window.__gis = o; },
  prompt() {},
  disableAutoSelect() { window.__sorti = true; },
  renderButton(hote) {
    for (const [nom, j] of ${JSON.stringify([['autorise', AUTORISE], ['inconnu', INCONNU]])}) {
      const b = document.createElement('button');
      b.dataset.compte = nom; b.textContent = 'Google ' + nom;
      b.onclick = () => window.__gis.callback({ credential: j });
      hote.append(b);
    }
  },
} } };`;

const navigateur = await chromium.launch();

async function nouvellePage() {
  const contexte = await navigateur.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await contexte.newPage();
  page.on('pageerror', (e) => soucis.push(`erreur JS : ${e.message}`));
  await page.route(/accounts\.google\.com\/gsi\/client/, (r) =>
    r.fulfill({ contentType: 'text/javascript', body: FAUX_GIS }));
  await page.route(/assets\/js\/config\.js/, async (r) => {
    const reponse = await r.fetch();
    const texte = (await reponse.text()).replace(
      "ID_CLIENT_GOOGLE = ''", "ID_CLIENT_GOOGLE = 'client-test'");
    r.fulfill({ response: reponse, body: texte });
  });
  const appels = [];
  await page.route(/script\.google(usercontent)?\.com/, (r) => {
    const url = new URL(r.request().url());
    const j = url.searchParams.get('jeton');
    appels.push(url.searchParams.get('action'));
    let corps;
    if (url.searchParams.get('action') === 'contacts_csv' && j === AUTORISE) {
      return r.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' },
        contentType: 'text/csv', body: 'date,prenom,nom,entreprise,email,consentement\r\n2026-10-01,Camille,Durand,Atelier,c@a.fr,oui' });
    }
    if (j === AUTORISE) corps = { ok: true, genere_le: '2026-10-01', reponses: [], entonnoir: {}, nombre_contacts: 1, compteur: 255 };
    else if (j === INCONNU) corps = { ok: false, code: 'refuse', email: 'inconnu@gmail.com' };
    else corps = { ok: false, code: 'connexion' };
    r.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' },
      contentType: 'application/json', body: JSON.stringify(corps) });
  });
  return { page, appels };
}

const verifier = (cond, msg) => { if (!cond) soucis.push(msg); };
const visible = (page, sel) => page.locator(sel).isVisible();

// 1. Arrivée : le bouton Google, pas de tableau, aucun appel aux données.
let { page, appels } = await nouvellePage();
await page.goto(`${BASE}/admin/`);
await page.waitForSelector('[data-compte="autorise"]');
verifier(await visible(page, '[data-acces]'), 'écran d’accès absent');
verifier(!(await visible(page, '[data-tableau]')), 'tableau visible sans connexion');
verifier(!(await visible(page, '[data-deconnexion]')), 'bouton de déconnexion visible sans connexion');
verifier(!appels.includes('donnees'), 'données demandées sans connexion');

// 2. Compte non autorisé : refusé, message clair, rien n'est affiché ni gardé.
await page.click('[data-compte="inconnu"]');
await page.waitForSelector('[data-message-acces]:not([hidden])');
const refus = await page.textContent('[data-message-acces]');
verifier(/inconnu@gmail\.com/.test(refus) && /n’a pas accès/.test(refus), `message de refus : « ${refus} »`);
verifier(!(await visible(page, '[data-tableau]')), 'tableau visible pour un compte refusé');
verifier(!(await page.evaluate(() => sessionStorage.getItem('greatly_edl_admin'))), 'jeton refusé gardé');

// 3. Compte autorisé : le tableau s'ouvre, l'export ne porte pas le jeton.
await page.click('[data-compte="autorise"]');
await page.waitForSelector('[data-tableau]:not([hidden])');
verifier(!(await visible(page, '[data-acces]')), 'écran d’accès resté visible');
verifier(await visible(page, '[data-deconnexion]'), 'bouton de déconnexion absent');
const href = await page.locator('a[download]').first().getAttribute('href');
verifier(href && href.startsWith('blob:'), `export : ${href}`);

// 4. Rechargement : on reste connecté, sans repasser par Google.
await page.reload();
await page.waitForSelector('[data-tableau]:not([hidden])');
verifier(!(await visible(page, '[data-acces]')), 'reconnexion demandée après rechargement');

// 5. Déconnexion : le jeton est oublié, l'écran d'accès revient.
await page.click('[data-deconnexion]');
await page.waitForSelector('[data-compte="autorise"]');
verifier(!(await page.evaluate(() => sessionStorage.getItem('greatly_edl_admin'))), 'jeton gardé après déconnexion');
verifier(!(await visible(page, '[data-tableau]')), 'tableau visible après déconnexion');

// 6. Jeton gardé mais refusé par le backend (expiré côté Google) : retour au bouton, sans message d'erreur.
({ page } = await nouvellePage());
await page.goto(`${BASE}/admin/`);
await page.evaluate((j) => sessionStorage.setItem('greatly_edl_admin', j), jeton('arnaudprz@gmail.com', 'sig-revoque'));
await page.reload();
await page.waitForSelector('[data-compte="autorise"]');
verifier(!(await visible(page, '[data-tableau]')), 'tableau ouvert avec un jeton révoqué');

await navigateur.close();
if (soucis.length) {
  console.log('Connexion :\n- ' + soucis.join('\n- '));
  process.exit(1);
}
console.log('Connexion : aucun souci relevé.');
