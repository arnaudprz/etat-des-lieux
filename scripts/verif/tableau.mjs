/**
 * Vérifie le tableau de bord dans un vrai navigateur, en mode démo.
 * Usage : node scripts/verif/tableau.mjs [URL_DE_BASE] [DOSSIER_DE_SORTIE]
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:8127';
const SORTIE = process.argv[3] || '/tmp/edl-captures';
mkdirSync(SORTIE, { recursive: true });

const soucis = [];
const navigateur = await chromium.launch();
const contexte = await navigateur.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fr-FR' });
const page = await contexte.newPage();

page.on('console', (m) => { if (m.type() === 'error') soucis.push(`console : ${m.text()}`); });
page.on('pageerror', (e) => soucis.push(`erreur JS : ${e.message}`));

await page.goto(`${BASE}/admin/`, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-tableau]:not([hidden])');
await page.waitForSelector('.affirmation-admin');

// Les 10 sections attendues, dans l'ordre du cahier des charges.
const titres = await page.locator('.section-admin__titre').allInnerTexts();
if (titres.length !== 10) soucis.push(`${titres.length} sections au lieu de 10`);

const attendus = [
  'Ce que disent les réponses',
  'Les 4 conditions des Fondations',
  'Qui a répondu',
  "Du premier clic à l'état des lieux",
  'Demandes de l’étude complète',
];
attendus.forEach((t, i) => {
  if (titres[i] !== t) soucis.push(`section ${i + 1} : « ${titres[i]} » au lieu de « ${t} »`);
});

// Les indicateurs
const tuiles = await page.locator('.tuile').count();
if (tuiles !== 4) soucis.push(`${tuiles} indicateurs au lieu de 4`);

// A3 : la répartition en ligne et papier est annoncée sous Répondants.
const texteRepondants = await page.locator('.tuile').first().innerText();
if (!/en ligne et .* papier/.test(texteRepondants)) {
  soucis.push('la tuile Répondants ne dit pas la répartition en ligne et papier');
}

// A1 : les liens copiés se rapportent aux réponses en ligne, pas au total.
const texteLiens = await page.locator('.tuile', { hasText: 'Liens personnels copiés' }).innerText();
if (!texteLiens.includes('des réponses en ligne')) {
  soucis.push(`la part des liens copiés ne se rapporte pas aux réponses en ligne : ${texteLiens.replace(/\n/g, ' | ')}`);
}

// A2 : le taux de complétion dit qu'il ne concerne que l'en ligne.
const texteCompletion = await page.locator('.tuile', { hasText: 'Taux de complétion' }).innerText();
if (!texteCompletion.includes('parcours en ligne seulement')) {
  soucis.push('le taux de complétion ne précise pas qu’il ne concerne que l’en ligne');
}

// L'entonnoir compte aussi les partages de l'accueil.
const etapesEntonnoir = await page
  .locator('.section-admin', { hasText: "Du premier clic à l'état des lieux" })
  .locator('.ligne-barre__nom').allInnerTexts();
if (!etapesEntonnoir.some((t) => t.includes("Partages de l'accueil"))) {
  soucis.push(`l'entonnoir ne compte pas les partages de l'accueil : ${etapesEntonnoir.join(', ')}`);
}

// A4 : l'entonnoir dit qu'il ne suit que la période.
const sousTitreEntonnoir = await page
  .locator('.section-admin', { hasText: "Du premier clic à l'état des lieux" })
  .locator('.section-admin__soustitre').innerText();
if (!/seule la période/i.test(sousTitreEntonnoir)) {
  soucis.push('l’entonnoir ne précise pas qu’il ne suit que la période');
}

// A5 : les données fictives sont cohérentes entre elles.
const termines = Number((texteCompletion.match(/([\d\s ]+) terminés/) || [])[1]?.replace(/\D/g, '') || 0);
const enLigne = Number((texteRepondants.match(/([\d\s ]+) en ligne/) || [])[1]?.replace(/\D/g, '') || 0);
if (termines !== enLigne) {
  soucis.push(`l'entonnoir annonce ${termines} terminés pour ${enLigne} réponses en ligne`);
}

// A5 : la répartition des cartes reste dans des ordres de grandeur plausibles.
const partsCartes = (await page.locator('.carte-recue__valeur').allInnerTexts())
  .map((t) => Number(t.replace(/\D/g, '')));
if (partsCartes.some((x) => x === 0)) {
  soucis.push(`une carte d'ensemble tombe à 0 % : ${partsCartes.join(' / ')}`);
}

// A6 : 5 demandes visibles, et un bouton pour déplier.
const lignesContacts = await page.locator('.section-admin', { hasText: 'Demandes de l’étude complète' })
  .locator('tbody tr').count();
if (lignesContacts !== 5) soucis.push(`${lignesContacts} demandes affichées au lieu de 5`);

const deplier = page.locator('.deplier button');
if ((await deplier.count()) !== 1) soucis.push('pas de bouton pour déplier les demandes');
else {
  await deplier.click();
  await page.waitForTimeout(200);
  const apres = await page.locator('.section-admin', { hasText: 'Demandes de l’étude complète' })
    .locator('tbody tr').count();
  if (apres <= 5) soucis.push(`déplier n'affiche que ${apres} demandes`);
  await deplier.click();
  await page.waitForTimeout(200);
}

// A6 : le bouton d'export est réellement actif.
const exporter = page.locator('.bouton-secondaire', { hasText: 'Exporter' });
if (await exporter.getAttribute('aria-disabled')) {
  soucis.push('le bouton d’export est marqué désactivé');
}
if (!(await exporter.getAttribute('href'))) {
  soucis.push('le bouton d’export n’a pas d’adresse de téléchargement');
}

// L'essentiel : 4 constats
const constats = await page.locator('.constat').count();
if (constats !== 4) soucis.push(`${constats} constats au lieu de 4`);
const aCreuser = await page.locator('.a-creuser li').count();
if (aCreuser !== 3) soucis.push(`${aCreuser} questions à creuser au lieu de 3`);

// Chaque constat doit être une phrase : majuscule en tête, point final.
const textesConstats = await page.locator('.constat__texte').allInnerTexts();
textesConstats.forEach((t) => {
  const debut = t.trim().charAt(0);
  if (debut !== debut.toUpperCase()) {
    soucis.push(`constat qui commence par une minuscule : « ${t.slice(0, 60)}… »`);
  }
  if (!t.trim().endsWith('.')) {
    soucis.push(`constat sans point final : « …${t.trim().slice(-40)} »`);
  }
});

// Une seule ligne de filtres en 1280, comme dans la maquette.
const lignesFiltres = await page.evaluate(() => {
  const hauts = new Set(
    Array.from(document.querySelectorAll('.filtre')).map((f) => Math.round(f.getBoundingClientRect().top))
  );
  return hauts.size;
});
if (lignesFiltres !== 1) soucis.push(`les filtres tiennent sur ${lignesFiltres} lignes au lieu d'une`);

// Les 4 conditions
const conditions = await page.locator('.bloc-chiffre').count();
if (conditions !== 4) soucis.push(`${conditions} conditions au lieu de 4`);

// Les 8 dimensions en barres empilées et les 4 cartes
const cartesRecues = await page.locator('.carte-recue').count();
if (cartesRecues !== 4) soucis.push(`${cartesRecues} cartes d'ensemble au lieu de 4`);

// Chaque carte d'ensemble porte le médaillon de son niveau.
const medaillons = await page.evaluate(() =>
  Array.from(document.querySelectorAll('.carte-recue')).map((c) => ({
    niveau: c.querySelector('.carte-recue__entete span').textContent.trim(),
    source: c.querySelector('.carte-recue__pousse')?.getAttribute('src') || null,
    charge: (() => { const i = c.querySelector('.carte-recue__pousse'); return i && i.complete && i.naturalWidth > 0; })(),
  })));
const attenduCartes = {
  'Bien enraciné': '../assets/img/scene-enracine.svg',
  'En croissance': '../assets/img/scene-croissance.svg',
  'En germe': '../assets/img/scene-germe.svg',
  'À semer': '../assets/img/scene-semer.svg',
};
medaillons.forEach((m) => {
  if (m.source !== attenduCartes[m.niveau]) {
    soucis.push(`carte « ${m.niveau} » porte ${m.source}`);
  }
  if (!m.charge) soucis.push(`le médaillon de « ${m.niveau} » ne se charge pas`);
});

// Les 16 affirmations, et la bascule
const affirmations = await page.locator('.affirmation-admin').count();
if (affirmations !== 16) soucis.push(`${affirmations} affirmations au lieu de 16`);

const enonceMembre = await page.locator('.affirmation-admin__enonce').nth(3).innerText();
await page.locator('.bascule__bouton', { hasText: 'Managers' }).click();
await page.waitForTimeout(250);
const enonceManager = await page.locator('.affirmation-admin__enonce').nth(3).innerText();
if (enonceMembre === enonceManager) {
  soucis.push('la bascule Membres / Managers ne change pas le texte de l’affirmation 4');
}
await page.locator('.bascule__bouton', { hasText: 'Membres' }).click();
await page.waitForTimeout(250);

// C : les lignes de dimension sont compactes et tiennent sur une seule ligne.
const lignesDimension = await page.evaluate(() => {
  const lignes = Array.from(document.querySelectorAll('.rangee--compacte'));
  return lignes.map((l) => {
    const nom = l.querySelector('.rangee__nom');
    const style = getComputedStyle(nom);
    const hauteurLigne = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.3;
    return {
      hauteur: Math.round(l.getBoundingClientRect().height),
      lignesDeTexte: Math.round(nom.getBoundingClientRect().height / hauteurLigne),
      graisse: style.fontWeight,
      deborde: nom.scrollWidth > nom.clientWidth + 1,
    };
  });
});
if (lignesDimension.length !== 8) {
  soucis.push(`${lignesDimension.length} lignes de dimension au lieu de 8`);
}
lignesDimension.forEach((l, i) => {
  if (l.hauteur > 36) soucis.push(`ligne de dimension ${i + 1} haute de ${l.hauteur}px, visée 32`);
  if (l.lignesDeTexte > 1) soucis.push(`le nom de la dimension ${i + 1} tient sur ${l.lignesDeTexte} lignes`);
  if (Number(l.graisse) >= 600) soucis.push(`le nom de la dimension ${i + 1} est en gras`);
  if (l.deborde) soucis.push(`le nom de la dimension ${i + 1} est coupé par la colonne`);
});

// Chaque graphique doit donner son effectif au survol.
const sansTitre = await page.evaluate(() =>
  document.querySelectorAll('.barre-empilee__tranche:not([title]), .ligne-barre__jauge:not([title])').length
);
if (sansTitre > 0) soucis.push(`${sansTitre} barres sans effectif au survol`);

await page.screenshot({ path: `${SORTIE}/Dashboard.png`, fullPage: true });

// A2 et A4 : sur Source = Papier, ce qui ne concerne que l'en ligne disparaît.
await page.selectOption('#filtre-source', 'papier');
await page.waitForTimeout(300);
if (await page.locator('.section-admin', { hasText: "Du premier clic à l'état des lieux" }).isVisible()) {
  soucis.push('l’entonnoir reste affiché alors que le filtre Source est sur Papier');
}
if (await page.locator('.tuile', { hasText: 'Taux de complétion' }).count()) {
  soucis.push('le taux de complétion reste affiché sur Source = Papier');
}
if (await page.locator('.tuile', { hasText: 'Liens personnels copiés' }).count()) {
  soucis.push('les liens copiés restent affichés sur Source = Papier');
}
const tuilesPapier = await page.locator('.tuile').count();
if (tuilesPapier !== 2) soucis.push(`${tuilesPapier} indicateurs sur Source = Papier au lieu de 2`);
await page.screenshot({ path: `${SORTIE}/Dashboard-papier.png`, fullPage: true });
await page.selectOption('#filtre-source', 'toutes');
await page.waitForTimeout(300);

// ------------------------------------------- le seuil d'anonymat k >= 3
// On filtre jusqu'à isoler un groupe minuscule : aucun chiffre ne doit sortir.
await page.selectOption('#filtre-secteur', 'Immobilier');
await page.selectOption('#filtre-taille_equipe', '13 personnes et plus');
await page.selectOption('#filtre-genre', 'Non binaire');
await page.waitForTimeout(350);

const repondants = Number((await page.locator('.tuile__valeur').first().innerText()).replace(/\D/g, ''));
if (repondants >= 3) {
  soucis.push(`le filtre n'isole pas un groupe de moins de 3 personnes (${repondants})`);
} else {
  const messages = await page.locator('.trop-petit').count();
  if (messages === 0) {
    soucis.push(`groupe de ${repondants} personnes, mais aucun « Pas assez de réponses » affiché`);
  }
  const constatsRestants = await page.locator('.constat').count();
  if (constatsRestants > 0) {
    soucis.push(`groupe de ${repondants} personnes, mais ${constatsRestants} constats affichés`);
  }
  const affirmationsRestantes = await page.locator('.affirmation-admin').count();
  if (affirmationsRestantes > 0) {
    soucis.push(`groupe de ${repondants} personnes, mais ${affirmationsRestantes} affirmations chiffrées`);
  }
}
await page.screenshot({ path: `${SORTIE}/Dashboard-k3.png`, fullPage: true });

const debord = await page.evaluate(() =>
  Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
if (debord > 1) soucis.push(`défilement horizontal de ${debord}px`);

await navigateur.close();

if (soucis.length === 0) console.log('Tableau de bord : aucun souci relevé.');
else {
  console.log(`${soucis.length} souci(s) :`);
  soucis.forEach((s) => console.log(`  - ${s}`));
  process.exitCode = 1;
}
