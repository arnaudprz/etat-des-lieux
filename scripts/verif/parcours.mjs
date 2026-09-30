/**
 * Parcourt le site de bout en bout dans plusieurs navigateurs et plusieurs
 * formats, capture chaque écran et vérifie ce qui doit l'être.
 *
 * Arnaud teste dans Safari : WebKit fait donc partie des cibles, en ordinateur
 * et en iPhone émulé. Plusieurs écarts ne se voient que là.
 *
 * Usage : node scripts/verif/parcours.mjs [URL_DE_BASE] [DOSSIER_DE_SORTIE] [CIBLE]
 *   CIBLE filtre par nom, par exemple « webkit ».
 */

import { chromium, webkit, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:8127';
const SORTIE = process.argv[3] || '/tmp/edl-captures';
const FILTRE = process.argv[4] || '';

/** Les cibles. Le suffixe sert à nommer les captures et les messages. */
const CIBLES = [
  {
    nom: 'chromium', suffixe: '', lanceur: chromium,
    options: { viewport: { width: 1280, height: 900 }, locale: 'fr-FR' },
  },
  {
    nom: 'chromium-mobile', suffixe: '-mobile', lanceur: chromium,
    options: { viewport: { width: 390, height: 844 }, locale: 'fr-FR' },
  },
  {
    nom: 'webkit', suffixe: '', lanceur: webkit,
    options: { viewport: { width: 1280, height: 900 }, locale: 'fr-FR' },
  },
  {
    nom: 'webkit-mobile', suffixe: '-mobile', lanceur: webkit,
    options: { ...devices['iPhone 13'], locale: 'fr-FR' },
  },
].filter((c) => !FILTRE || c.nom.includes(FILTRE));

/** Le préréglage « Exemple de la maquette » du simulateur. */
const REPONSES = [2, 2, 1, 1, 2, 2, 0, 0, 2, 3, 2, 2, 2, 2, 2, 1];
const HASH_ATTENDU = '#v1-m2211220023222221';

const soucis = [];
let capturesPrises = 0;

// ------------------------------------------------------------------ outillage

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
    Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
  if (debord > 1) soucis.push(`[${etiquette}] défilement horizontal de ${debord}px`);
}

async function verifierTirets(page, etiquette) {
  const trouve = await page.evaluate(() => {
    const m = document.body.innerText.match(/[^\n]{0,40}[—–][^\n]{0,40}/g);
    return m ? m.slice(0, 3) : null;
  });
  if (trouve) soucis.push(`[${etiquette}] tiret cadratin : ${trouve.join(' | ')}`);
}

async function verifierAucunChiffre(page, etiquette, selecteur) {
  const texte = await page.locator(selecteur).innerText();
  const chiffres = texte.match(/\d/g);
  if (chiffres) {
    soucis.push(`[${etiquette}] des chiffres apparaissent : ${[...new Set(chiffres)].join('')}`);
  }
}

// ------------------------------------------------------------------ parcours

/** Remplit le profil et passe aux affirmations. Version membre. */
async function remplirProfil(page) {
  await page.waitForSelector('.pilules');
  await page.locator('input[name="role"]').nth(1).check();
  await page.locator('input[name="genre"]').nth(0).check();
  await page.locator('input[name="taille_entreprise"]').nth(2).check();
  await page.locator('input[name="taille_equipe"]').nth(1).check();
  await page.fill('#secteur', 'sante');
  await page.waitForSelector('#secteurs li');
  await page.locator('#secteurs .recherche__option', { hasText: /^Santé$/ }).click();
}

async function passerLaCible(cible) {
  const { nom, suffixe, lanceur, options } = cible;
  const largeur = options.viewport ? options.viewport.width : 390;
  const dossier = `${SORTIE}/${nom}`;
  mkdirSync(dossier, { recursive: true });

  const capturer = async (fichier, etiquette) => {
    await page.waitForTimeout(350);
    await verifierLargeurUtile(page, etiquette);
    await page.screenshot({ path: `${dossier}/${fichier}.png`, fullPage: true });
    capturesPrises += 1;
  };

  const navigateur = await lanceur.launch();
  const contexte = await navigateur.newContext(options);
  const page = await contexte.newPage();
  surveiller(page, nom);

  // ------------------------------------------------------------- 1. accueil
  await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.dimensions .carte');

  const nbDimensions = await page.locator('.dimensions .carte').count();
  if (nbDimensions !== 8) soucis.push(`[${nom}] accueil : ${nbDimensions} dimensions au lieu de 8`);
  const compteur = (await page.locator('[data-compteur]').innerText()).trim();
  if (compteur !== '255') soucis.push(`[${nom}] accueil : compteur à « ${compteur} » au lieu de 255`);

  const ecartApercu = await page.evaluate(() => {
    const l = document.querySelectorAll('.apercu__ligne');
    return Math.round(l[1].getBoundingClientRect().top - l[0].getBoundingClientRect().bottom);
  });
  const ecartApercuAttendu = largeur >= 900 ? 20 : 16;
  if (ecartApercu !== ecartApercuAttendu) {
    soucis.push(`[${nom}] accueil : ${ecartApercu}px entre les lignes de l'aperçu au lieu de ${ecartApercuAttendu}`);
  }

  await verifierTirets(page, `${nom} accueil`);
  await capturer(`Main${suffixe}`, `${nom} accueil`);

  // -------------------------------------------------------------- 2. profil
  await page.click('.hero__actions a.btn');
  await page.waitForSelector('.pilules');

  const ecartIntitule = await page.evaluate(() => {
    const bloc = document.querySelectorAll('.champ')[2];
    const intitule = bloc.querySelector('.champ__intitule');
    const choix = bloc.querySelector('.pilules');
    return Math.round(choix.getBoundingClientRect().top - intitule.getBoundingClientRect().bottom);
  });
  if (ecartIntitule < 10 || ecartIntitule > 16) {
    soucis.push(`[${nom}] profil : ${ecartIntitule}px sous l'intitulé, attendu entre 10 et 16`);
  }

  const ecartBlocs = await page.evaluate(() => {
    const blocs = document.querySelectorAll('#profil > *');
    return Math.round(blocs[1].getBoundingClientRect().top - blocs[0].getBoundingClientRect().bottom);
  });
  if (ecartBlocs < 24 || ecartBlocs > 40) {
    soucis.push(`[${nom}] profil : ${ecartBlocs}px entre deux blocs, attendu entre 24 et 40`);
  }

  const propositions = await (async () => {
    await page.fill('#secteur', 'sante');
    await page.waitForSelector('#secteurs li');
    return page.locator('#secteurs .recherche__option').allInnerTexts();
  })();
  if (!propositions.includes('Santé')) {
    soucis.push(`[${nom}] profil : « sante » ne propose pas « Santé » : ${propositions.join(', ')}`);
  }
  if (!propositions.includes('Autre')) {
    soucis.push(`[${nom}] profil : « Autre » n'est pas proposé`);
  }

  await verifierTirets(page, `${nom} profil`);
  await capturer(`Profil${suffixe}`, `${nom} profil`);

  await page.goto(`${BASE}/profil.html`, { waitUntil: 'networkidle' });
  await remplirProfil(page);
  await page.locator('[data-continuer]').click();

  // -------------------------------------------------------- 3. affirmations
  await page.waitForSelector('.affirmation');
  const nbAffirmations = await page.locator('.affirmation').count();
  if (nbAffirmations !== 16) soucis.push(`[${nom}] questions : ${nbAffirmations} affirmations au lieu de 16`);
  const nbGroupes = await page.locator('.groupe').count();
  if (nbGroupes !== 8) soucis.push(`[${nom}] questions : ${nbGroupes} groupes au lieu de 8`);

  // « Pas du tout » sur chacune des 16 : l'état visuel et la valeur enregistrée.
  const cartes = page.locator('.affirmation');
  for (let i = 0; i < 16; i += 1) {
    await cartes.nth(i).locator('.echelle__choix').nth(0).click();
    const presse = await cartes.nth(i).locator('.echelle__choix').nth(0).getAttribute('aria-pressed');
    if (presse !== 'true') {
      soucis.push(`[${nom}] questions : « Pas du tout » sur Q${i + 1} ne s'active pas (aria-pressed ${presse})`);
    }
  }
  const toutABas = await page.evaluate(() => {
    try {
      const brut = sessionStorage.getItem('greatly_edl_parcours');
      return brut ? JSON.parse(brut).reponses : null;
    } catch (e) { return null; }
  });
  if (JSON.stringify(toutABas) !== JSON.stringify(new Array(16).fill(0))) {
    soucis.push(`[${nom}] questions : « Pas du tout » n'enregistre pas 0 partout (${JSON.stringify(toutABas)})`);
  }

  // Aucune relance ne doit apparaître pendant qu'on répond.
  if (await page.locator('.relance').count()) {
    soucis.push(`[${nom}] questions : une relance s'affiche parmi les affirmations`);
  }

  await verifierTirets(page, `${nom} questions`);
  await capturer(`Questions${suffixe}`, `${nom} questions`);

  // Avec 16 réponses « Pas du tout », l'écran de relances s'ouvre sur Q1 et Q2.
  await page.locator('[data-continuer]').click();
  await page.waitForSelector('[data-ecran="relances"]:not([hidden])');
  if (new URL(page.url()).pathname !== '/questions.html') {
    soucis.push(`[${nom}] relances : l'écran change d'URL`);
  }
  const nbRelances = await page.locator('.relance').count();
  if (nbRelances !== 2) soucis.push(`[${nom}] relances : ${nbRelances} encadrés au lieu de 2`);
  if ((await page.locator('[data-ecran="affirmations"]').isVisible())) {
    soucis.push(`[${nom}] relances : les affirmations restent visibles`);
  }
  const etapeActive = await page.locator('.etape--active .etape__nom').innerText();
  if (etapeActive !== 'Vos réponses') {
    soucis.push(`[${nom}] relances : le fil d'étapes est sur « ${etapeActive} »`);
  }

  // Les choix sont des lignes pleine largeur, pas des pilules.
  const formeChoix = await page.evaluate(() => {
    const c = document.querySelector('.relance .choix');
    const style = getComputedStyle(c);
    const largeurBloc = c.parentElement.getBoundingClientRect().width;
    return {
      rayon: parseFloat(style.borderRadius),
      pleineLargeur: Math.abs(c.getBoundingClientRect().width - largeurBloc) < 2,
    };
  });
  if (formeChoix.rayon !== 12) soucis.push(`[${nom}] relances : coins à ${formeChoix.rayon}px au lieu de 12`);
  if (!formeChoix.pleineLargeur) soucis.push(`[${nom}] relances : les choix ne prennent pas toute la largeur`);

  // 2 choix au plus.
  const casesQ1 = page.locator('.relance').first().locator('input[type="checkbox"]');
  await casesQ1.nth(0).check();
  await casesQ1.nth(1).check();
  if (!(await casesQ1.nth(2).isDisabled())) {
    soucis.push(`[${nom}] relances : un 3e choix reste cochable`);
  }

  await capturer(`Relances${suffixe}`, `${nom} relances`);

  // « Retour » ne doit rien perdre.
  await page.locator('[data-retour-affirmations]').click();
  await page.waitForSelector('[data-ecran="affirmations"]:not([hidden])');
  const encoreABas = await page.evaluate(() => {
    try {
      return JSON.parse(sessionStorage.getItem('greatly_edl_parcours')).reponses;
    } catch (e) { return null; }
  });
  if (JSON.stringify(encoreABas) !== JSON.stringify(new Array(16).fill(0))) {
    soucis.push(`[${nom}] relances : « Retour » perd les réponses`);
  }

  // Le préréglage de la maquette, pour la suite.
  for (let i = 0; i < REPONSES.length; i += 1) {
    await cartes.nth(i).locator('.echelle__choix').nth(REPONSES[i]).click();
  }
  await page.locator('[data-continuer]').click();
  await page.waitForSelector('[data-ecran="relances"]:not([hidden])');

  // Q7 et Q8 valent 0 : ce sont elles qui doivent être rappelées.
  const rappelees = await page.locator('.relance__affirmation').allInnerTexts();
  if (rappelees.length !== 2) soucis.push(`[${nom}] relances : ${rappelees.length} affirmations rappelées`);
  if (!rappelees[0].startsWith("L'info des autres métiers")) {
    soucis.push(`[${nom}] relances : première affirmation rappelée inattendue « ${rappelees[0]} »`);
  }

  await page.locator('[data-voir]').click();

  // ------------------------------------------------------------ 4. résultat
  await page.waitForSelector('[data-resultat]:not([hidden])');
  const hash = new URL(page.url()).hash;
  if (hash !== HASH_ATTENDU) soucis.push(`[${nom}] resultat : hash ${hash} au lieu de ${HASH_ATTENDU}`);

  const titreCarte = await page.locator('[data-carte-titre]').innerText();
  if (titreCarte !== 'Une équipe en germe') {
    soucis.push(`[${nom}] resultat : carte « ${titreCarte} »`);
  }
  if (!(await page.locator('[data-appui]').innerText()).includes('le soutien du manager')) {
    soucis.push(`[${nom}] resultat : phrase d'appui inattendue`);
  }
  if (!(await page.locator('[data-forme]').innerText()).startsWith('Votre regard est contrasté')) {
    soucis.push(`[${nom}] resultat : phrase de forme inattendue`);
  }
  if (!(await page.locator('[data-sans-resultat]').isHidden())) {
    soucis.push(`[${nom}] resultat : le bloc « ce lien ne porte pas de résultat » s'affiche aussi`);
  }
  const nbColonnes = await page.locator('.colonne').count();
  if (nbColonnes !== 4) soucis.push(`[${nom}] resultat : ${nbColonnes} colonnes au lieu de 4`);
  const nbRangees = await page.locator('.colonne__item').count();
  if (nbRangees !== 8) soucis.push(`[${nom}] resultat : ${nbRangees} dimensions rangées au lieu de 8`);
  if ((await page.locator('[data-resultat]').innerText()).includes('obtient les résultats')) {
    soucis.push(`[${nom}] resultat : le Q16 apparaît dans le résultat`);
  }

  const etiquette = await page.evaluate(() => {
    const e = document.querySelector('.ensemble__etiquette');
    const style = getComputedStyle(e);
    const hauteurLigne = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    const interne = e.getBoundingClientRect().height
      - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    return { lignes: Math.round(interne / hauteurLigne), rayon: parseFloat(style.borderRadius) };
  });
  if (etiquette.lignes > 1 && etiquette.rayon > 20) {
    soucis.push(`[${nom}] resultat : étiquette sur ${etiquette.lignes} lignes dans une pilule`);
  }

  const couleurIntro = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.etude > p')).color);
  if (couleurIntro !== 'rgb(107, 100, 96)') {
    soucis.push(`[${nom}] resultat : intro de l'étude en ${couleurIntro} au lieu de taupe`);
  }

  await page.locator('[data-etude] button[type="submit"]').click();
  await page.waitForTimeout(250);
  const annonces = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="alert"], [role="status"], [aria-live]'))
      .map((z) => z.textContent.trim())
      .filter((t) => t !== ''));
  const doublons = annonces.filter((t) => t.includes('manque'));
  if (doublons.length !== 1) {
    soucis.push(`[${nom}] resultat : message d'erreur annoncé ${doublons.length} fois`);
  }
  if (doublons[0] && !doublons[0].startsWith('Il nous manque encore')) {
    soucis.push(`[${nom}] resultat : message inattendu « ${doublons[0]} »`);
  }

  await verifierAucunChiffre(page, `${nom} resultat`, '.ensemble');
  await verifierTirets(page, `${nom} resultat`);
  await capturer(`Resultat${suffixe}`, `${nom} resultat`);

  // ----------------------------------------- 5. lien illisible, confidentialité
  await page.goto(`${BASE}/resultat.html#nawak`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-sans-resultat]:not([hidden])');
  if (!(await page.locator('[data-resultat]').isHidden())) {
    soucis.push(`[${nom}] resultat : un hash invalide affiche quand même un résultat`);
  }
  await capturer(`Resultat-sans-lien${suffixe}`, `${nom} resultat vide`);

  await page.goto(`${BASE}/confidentialite.html`, { waitUntil: 'networkidle' });
  await verifierTirets(page, `${nom} confidentialite`);
  await capturer(`Confidentialite${suffixe}`, `${nom} confidentialite`);

  await navigateur.close();
}

// -------------------------------------------------------------------- bilan

for (const cible of CIBLES) {
  await passerLaCible(cible);
}

console.log(`${capturesPrises} captures écrites dans ${SORTIE}`);
console.log(`Cibles : ${CIBLES.map((c) => c.nom).join(', ')}`);
if (soucis.length === 0) {
  console.log('Aucun souci relevé.');
} else {
  console.log(`\n${soucis.length} souci(s) :`);
  soucis.forEach((s) => console.log(`  - ${s}`));
  process.exitCode = 1;
}
