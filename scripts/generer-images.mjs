/**
 * Produit les images dont le navigateur a besoin mais qu'un SVG ne peut pas
 * remplacer : l'aperçu des réseaux sociaux et l'icône d'écran d'accueil.
 *
 * LinkedIn, WhatsApp et Slack n'affichent pas les SVG : og:image doit être un
 * PNG. Les icônes d'écran d'accueil iOS non plus.
 *
 * Le rendu se fait avec Chromium, déjà présent pour les vérifications : aucune
 * dépendance supplémentaire.
 *
 * Usage : node scripts/generer-images.mjs
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const images = join(racine, 'docs', 'assets', 'img');

const contenu = JSON.parse(
  readFileSync(join(racine, 'docs', 'assets', 'data', 'contenu.json'), 'utf8')
);

const pousses = readFileSync(join(images, 'pousses.svg'), 'utf8');
const favicon = readFileSync(join(images, 'favicon.svg'), 'utf8');

const POLICES = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600'
  + '&family=Playfair+Display:wght@400&display=swap';

/** L'aperçu des réseaux : 1200 x 630, fond crème, les pousses et le titre. */
function pageApercu() {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<link rel="stylesheet" href="${POLICES}">
<style>
  * { box-sizing: border-box; margin: 0; }
  body {
    width: 1200px; height: 630px; background: #F7F4EF;
    font-family: 'DM Sans', sans-serif; color: #1A1A1A;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 56px 64px;
  }
  .haut { display: flex; justify-content: space-between; align-items: center; }
  .marque { font-family: 'Playfair Display', serif; font-size: 34px; color: #2D3626; }
  .badge {
    padding: 10px 20px; border-radius: 999px; background: rgba(138,155,122,.18);
    color: #2D3626; font-size: 19px; font-weight: 500;
  }
  .corps { display: grid; grid-template-columns: minmax(0,1.05fr) minmax(0,.95fr); gap: 48px; align-items: center; }
  h1 { font-family: 'Playfair Display', serif; font-weight: 400; font-size: 60px; line-height: 1.06; letter-spacing: -.01em; }
  .mentions { font-size: 21px; color: #6B6460; }
  svg { width: 100%; height: auto; border-radius: 20px; }
</style></head><body>
  <div class="haut">
    <span class="marque">Greatly</span>
    <span class="badge">${contenu.accueil.badge}</span>
  </div>
  <div class="corps">
    <h1>${contenu.accueil.titre}</h1>
    <div>${pousses}</div>
  </div>
  <p class="mentions">${contenu.accueil.mentions}</p>
</body></html>`;
}

/** L'icône d'écran d'accueil : le favicon, en PNG. */
function pageIcone(taille) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; }
  body { width: ${taille}px; height: ${taille}px; }
  svg { width: ${taille}px; height: ${taille}px; display: block; }
</style></head><body>${favicon}</body></html>`;
}

const navigateur = await chromium.launch();

async function rendre(html, largeur, hauteur, fichier) {
  const contexte = await navigateur.newContext({
    viewport: { width: largeur, height: hauteur },
    deviceScaleFactor: 1,
  });
  const page = await contexte.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  // Laisse les polices s'installer avant la capture.
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(images, fichier) });
  await contexte.close();
  console.log(`${fichier} : ${largeur} x ${hauteur}`);
}

await rendre(pageApercu(), 1200, 630, 'apercu-reseaux.png');
await rendre(pageIcone(180), 180, 180, 'apple-touch-icon.png');

await navigateur.close();
