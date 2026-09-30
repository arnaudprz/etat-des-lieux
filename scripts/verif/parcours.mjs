/**
 * Parcourt le site de bout en bout dans un vrai navigateur et capture chaque
 * écran en 1280 et en 390, pour comparaison avec maquette/captures/.
 *
 * Usage : node scripts/verif/parcours.mjs [URL_DE_BASE] [DOSSIER_DE_SORTIE]
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:8127';
const SORTIE = process.argv[3] || '/tmp/edl-captures';
const LARGEURS = [
  { nom: '', largeur: 1280, hauteur: 900 },
  { nom: '-mobile', largeur: 390, hauteur: 844 },
];

mkdirSync(SORTIE, { recursive: true });

const soucis = [];
let capturesPrises = 0;

/** Vérifie qu'aucune erreur console ni aucun défilement horizontal n'apparaît. */
function surveiller(page, etiquette) {
  page.on('console', (m) => {
    if (m.type() === 'error') soucis.push(`[${etiquette}] console : ${m.text()}`);
  });
  page.on('pageerror', (e) => soucis.push(`[${etiquette}] erreur JS : ${e.message}`));
  page.on('requestfailed', (r) => {
    // Les polices Google peuvent échouer hors ligne : ce n'est pas bloquant.
    if (r.url().includes('fonts.g')) return;
    soucis.push(`[${etiquette}] requête échouée : ${r.url()}`);
  });
}

async function verifierLargeurUtile(page, etiquette) {
  const debord = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
  );
  if (debord > 1) soucis.push(`[${etiquette}] défilement horizontal de ${debord}px`);
}

async function capturer(page, nom, etiquette) {
  await page.waitForTimeout(350);
  await verifierLargeurUtile(page, etiquette);
  await page.screenshot({ path: `${SORTIE}/${nom}.png`, fullPage: true });
  capturesPrises += 1;
}

/** Aucun chiffre ne doit apparaître dans le résultat lu par le répondant. */
async function verifierAucunChiffre(page, etiquette, selecteur) {
  const texte = await page.locator(selecteur).innerText();
  const chiffres = texte.match(/\d/g);
  if (chiffres) {
    soucis.push(`[${etiquette}] des chiffres apparaissent : ${[...new Set(chiffres)].join('')}`);
  }
}

/** Aucun tiret cadratin ni demi-cadratin dans les textes affichés. */
async function verifierTirets(page, etiquette) {
  const trouve = await page.evaluate(() => {
    const t = document.body.innerText;
    const m = t.match(/[^\n]{0,40}[—–][^\n]{0,40}/g);
    return m ? m.slice(0, 3) : null;
  });
  if (trouve) soucis.push(`[${etiquette}] tiret cadratin : ${trouve.join(' | ')}`);
}

const navigateur = await chromium.launch();

for (const { nom, largeur, hauteur } of LARGEURS) {
  const contexte = await navigateur.newContext({
    viewport: { width: largeur, height: hauteur },
    locale: 'fr-FR',
  });
  const page = await contexte.newPage();
  const suffixe = nom;

  // ------------------------------------------------------------- 1. accueil
  surveiller(page, `accueil${suffixe}`);
  await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.dimensions .carte');
  const nbDimensions = await page.locator('.dimensions .carte').count();
  if (nbDimensions !== 8) soucis.push(`[accueil${suffixe}] ${nbDimensions} dimensions au lieu de 8`);
  const compteur = await page.locator('[data-compteur]').innerText();
  if (compteur.trim() !== '255') soucis.push(`[accueil${suffixe}] compteur à « ${compteur} » au lieu de 255`);
  await verifierTirets(page, `accueil${suffixe}`);
  await capturer(page, `Main${suffixe}`, `accueil${suffixe}`);

  // -------------------------------------------------------------- 2. profil
  await page.click('.hero__actions a.btn');
  await page.waitForSelector('.pilules');
  const continuer = page.locator('[data-continuer]');
  if (!(await continuer.isDisabled())) {
    soucis.push(`[profil${suffixe}] « Continuer » est actif alors que rien n'est rempli`);
  }
  // Rôle : un membre de l'équipe, pour avoir la version membre des affirmations.
  await page.locator('input[name="role"]').nth(1).check();
  await page.locator('input[name="genre"]').nth(0).check();
  await page.locator('input[name="taille_entreprise"]').nth(2).check();
  await page.locator('input[name="taille_equipe"]').nth(1).check();

  // Le secteur passe par le champ de recherche, sans accent ni casse.
  await page.fill('#secteur', 'sante');
  await page.waitForSelector('#secteurs li');
  const propositions = await page.locator('#secteurs .recherche__option').allInnerTexts();
  if (!propositions.includes('Santé')) {
    soucis.push(`[profil${suffixe}] « sante » ne propose pas « Santé » : ${propositions.join(', ')}`);
  }
  if (!propositions.includes('Autre')) {
    soucis.push(`[profil${suffixe}] « Autre » n'est pas proposé`);
  }
  await verifierTirets(page, `profil${suffixe}`);
  await capturer(page, `Profil${suffixe}`, `profil${suffixe}`);
  await page.locator('#secteurs .recherche__option', { hasText: /^Santé$/ }).click();

  if (await continuer.isDisabled()) {
    soucis.push(`[profil${suffixe}] « Continuer » reste inactif alors que tout est rempli`);
  }
  await continuer.click();

  // -------------------------------------------------------- 3. affirmations
  await page.waitForSelector('.affirmation');
  const nbAffirmations = await page.locator('.affirmation').count();
  if (nbAffirmations !== 16) soucis.push(`[questions${suffixe}] ${nbAffirmations} affirmations au lieu de 16`);
  const nbGroupes = await page.locator('.groupe').count();
  if (nbGroupes !== 8) soucis.push(`[questions${suffixe}] ${nbGroupes} groupes au lieu de 8`);

  const voir = page.locator('[data-voir]');
  if (!(await voir.isDisabled())) {
    soucis.push(`[questions${suffixe}] « Voir mon résultat » est actif sans réponse`);
  }

  // On rejoue le préréglage « Exemple de la maquette » du simulateur.
  const REPONSES = [2, 2, 1, 1, 2, 2, 0, 0, 2, 3, 2, 2, 2, 2, 2, 1];
  const cartes = page.locator('.affirmation');
  for (let i = 0; i < REPONSES.length; i += 1) {
    await cartes.nth(i).locator('.echelle__choix').nth(REPONSES[i]).click();
  }

  // Les deux plus réservées sont Q7 et Q8 (valeur 0) : seules leurs relances s'ouvrent.
  const relancesVisibles = await page.locator('.relance:not([hidden])').count();
  if (relancesVisibles !== 2) {
    soucis.push(`[questions${suffixe}] ${relancesVisibles} relances ouvertes au lieu de 2`);
  }
  const ouvertes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.affirmation')).
      map((c, i) => (c.querySelector('.relance:not([hidden])') ? i + 1 : null)).filter(Boolean)
  );
  if (JSON.stringify(ouvertes) !== JSON.stringify([7, 8])) {
    soucis.push(`[questions${suffixe}] relances ouvertes sur ${ouvertes.join(', ')} au lieu de 7, 8`);
  }

  // Trois choix cochés : le troisième doit être refusé, et les autres désactivés.
  const relanceQ7 = cartes.nth(6).locator('.relance');
  const casesQ7 = relanceQ7.locator('input[type="checkbox"]');
  await casesQ7.nth(0).check();
  await casesQ7.nth(1).check();
  const cochees = await relanceQ7.locator('input:checked').count();
  if (cochees !== 2) soucis.push(`[questions${suffixe}] ${cochees} choix cochés au lieu de 2`);
  if (!(await casesQ7.nth(2).isDisabled())) {
    soucis.push(`[questions${suffixe}] un 3e choix de relance reste cochable`);
  }

  await verifierTirets(page, `questions${suffixe}`);
  await capturer(page, `Questions${suffixe}`, `questions${suffixe}`);

  if (await voir.isDisabled()) {
    soucis.push(`[questions${suffixe}] « Voir mon résultat » reste inactif avec 16 réponses`);
  }
  await voir.click();

  // ------------------------------------------------------------ 4. résultat
  await page.waitForSelector('[data-resultat]:not([hidden])');
  const hash = new URL(page.url()).hash;
  if (hash !== '#v1-m2211220023222221') {
    soucis.push(`[resultat${suffixe}] hash inattendu : ${hash}`);
  }
  const titreCarte = await page.locator('[data-carte-titre]').innerText();
  if (titreCarte !== 'Une équipe en germe') {
    soucis.push(`[resultat${suffixe}] carte « ${titreCarte} » au lieu de « Une équipe en germe »`);
  }
  const appui = await page.locator('[data-appui]').innerText();
  if (!appui.includes('le soutien du manager')) {
    soucis.push(`[resultat${suffixe}] phrase d'appui inattendue : ${appui}`);
  }
  const forme = await page.locator('[data-forme]').innerText();
  if (!forme.startsWith('Votre regard est contrasté')) {
    soucis.push(`[resultat${suffixe}] phrase de forme inattendue : ${forme}`);
  }
  if (!(await page.locator('[data-sans-resultat]').isHidden())) {
    soucis.push(`[resultat${suffixe}] le bloc « ce lien ne porte pas de résultat » s'affiche aussi`);
  }
  const nbColonnes = await page.locator('.colonne').count();
  if (nbColonnes !== 4) soucis.push(`[resultat${suffixe}] ${nbColonnes} colonnes au lieu de 4`);
  const nbRangees = await page.locator('.colonne__item').count();
  if (nbRangees !== 8) soucis.push(`[resultat${suffixe}] ${nbRangees} dimensions rangées au lieu de 8`);

  // Le Q16 ne doit jamais apparaître dans le résultat.
  const texteResultat = await page.locator('[data-resultat]').innerText();
  if (texteResultat.includes('obtient les résultats')) {
    soucis.push(`[resultat${suffixe}] le Q16 apparaît dans le résultat`);
  }
  await verifierAucunChiffre(page, `resultat${suffixe}`, '.ensemble');
  await verifierTirets(page, `resultat${suffixe}`);
  await capturer(page, `Resultat${suffixe}`, `resultat${suffixe}`);

  // ------------------------------------------ 5. lien illisible et confidentialité
  await page.goto(`${BASE}/resultat.html#nawak`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-sans-resultat]:not([hidden])');
  if (!(await page.locator('[data-resultat]').isHidden())) {
    soucis.push(`[resultat${suffixe}] un hash invalide affiche quand même un résultat`);
  }
  await capturer(page, `Resultat-sans-lien${suffixe}`, `resultat-vide${suffixe}`);

  await page.goto(`${BASE}/confidentialite.html`, { waitUntil: 'networkidle' });
  await verifierTirets(page, `confidentialite${suffixe}`);
  await capturer(page, `Confidentialite${suffixe}`, `confidentialite${suffixe}`);

  await contexte.close();
}

await navigateur.close();

console.log(`${capturesPrises} captures écrites dans ${SORTIE}`);
if (soucis.length === 0) {
  console.log('Aucun souci relevé.');
} else {
  console.log(`\n${soucis.length} souci(s) :`);
  soucis.forEach((s) => console.log(`  - ${s}`));
  process.exitCode = 1;
}
