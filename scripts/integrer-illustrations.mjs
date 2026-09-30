/**
 * Prépare les illustrations pour le site.
 *
 * Les SVG livrés par l'outil de maquettage portent un bloc <metadata> C2PA de
 * plusieurs kilo-octets, inutile à l'affichage. On le retire et on écrit les
 * fichiers allégés dans docs/assets/img/.
 *
 * Écrit aussi docs/assets/js/illustrations.js, qui contient le SVG des pousses
 * prêt à être inséré dans la page : il doit rester net et se charger sans
 * requête.
 *
 * À relancer après toute modification de maquette/illustrations/ :
 *   node scripts/integrer-illustrations.mjs
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(racine, 'maquette', 'illustrations');
const destination = join(racine, 'docs', 'assets', 'img');

mkdirSync(destination, { recursive: true });

/** Retire le bloc de métadonnées et les attributs qui n'y servent que. */
function alleger(svg) {
  return svg
    .replace(/<metadata>[\s\S]*?<\/metadata>/g, '')
    .replace(/\s+xmlns:c2pa="[^"]*"/g, '')
    .trim();
}

const fichiers = readdirSync(source).filter((f) => f.endsWith('.svg'));
let gagne = 0;

fichiers.forEach((nom) => {
  const brut = readFileSync(join(source, nom), 'utf8');
  const propre = alleger(brut);
  gagne += brut.length - propre.length;
  writeFileSync(join(destination, nom), propre, 'utf8');
});

console.log(`${fichiers.length} illustrations allégées de ${Math.round(gagne / 1024)} ko au total.`);

// ------------------------------------------- le SVG des pousses, prêt à insérer

const pousses = alleger(readFileSync(join(source, 'pousses.svg'), 'utf8'));

/**
 * Les 4 étiquettes internes sont regroupées, pour pouvoir les masquer sur
 * mobile où elles sont remplacées par des pastilles HTML lisibles.
 */
const debutEtiquettes = pousses.indexOf('<rect x="27.4');
if (debutEtiquettes < 0) throw new Error('Les étiquettes des pousses sont introuvables.');

const avant = pousses.slice(0, debutEtiquettes);
const etiquettes = pousses.slice(debutEtiquettes).replace(/<\/svg>\s*$/, '');
const groupe = `<g class="pousses__etiquettes">${etiquettes}</g></svg>`;

const sortie = `/**
 * L'illustration des quatre pousses, en SVG.
 *
 * FICHIER GÉNÉRÉ : ne pas modifier à la main.
 * Régénérer avec : node scripts/integrer-illustrations.mjs
 *
 * Inséré dans la page plutôt que chargé en image : il reste net à toutes les
 * tailles et n'ajoute aucune requête.
 *
 * Les étiquettes internes sont dans un groupe à part. Sur mobile elles sont
 * masquées et remplacées par des pastilles HTML, plus lisibles à cette taille ;
 * la hauteur du viewBox suit, sinon il resterait une bande vide.
 */

export const POUSSES = ${JSON.stringify(avant + groupe)};

/** Hauteur du viewBox avec les étiquettes, puis sans. */
export const POUSSES_HAUTEUR = { avecEtiquettes: 420, sansEtiquettes: 360 };
`;

writeFileSync(join(racine, 'docs', 'assets', 'js', 'illustrations.js'), sortie, 'utf8');
console.log('docs/assets/js/illustrations.js généré.');
